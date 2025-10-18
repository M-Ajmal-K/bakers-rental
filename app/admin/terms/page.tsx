// app/admin/terms/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import {
  Check,
  Loader2,
  Eye,
  Save,
  UploadCloud,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Link as LinkIcon,
  Code as CodeIcon,
  Minus,
  Undo2,
  Redo2,
  Sparkles,
  Shield,
  LayoutDashboard,
} from "lucide-react";

/** local preview renderer */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

type TermsRow = {
  id: string;
  title: string;
  content_md: string;
  version: number;
  is_published: boolean;
  updated_at: string;
};

export default function AdminTermsPage() {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<TermsRow | null>(null);
  const [title, setTitle] = useState("Bakers Rental Cars - Terms & Conditions");
  const [content, setContent] = useState<string>("");
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  // undo/redo stacks
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("terms")
          .select("*")
          .eq("slug", "terms")
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!cancelled) {
          setRow(data);
          setTitle(data?.title || "Bakers Rental Cars - Terms & Conditions");
          setContent(
            data?.content_md ||
              `## Introduction & Contact

Baker's Rental Cars, P.O. Box 1949, Kulukulu, Sigatoka — Phone: **942 7497**, **748 8252** • Email: bakersrental@yahoo.com.

## Renter Responsibilities

- Use **##** headings to create sections
- Add bullet points like this
- Keep it short

## Collision Damage Waiver (CDW)

- Your points here…
`
          );
          setPublished(!!data?.is_published);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // save handlers
  const save = async (asPublish?: boolean) => {
    setSaving(true);
    try {
      const nextVersion = (row?.version || 0) + 1;
      const { data, error } = await supabase
        .from("terms")
        .upsert(
          {
            slug: "terms",
            title,
            content_md: content,
            is_published: asPublish ?? published,
            version: nextVersion,
          },
          { onConflict: "slug" }
        )
        .select("*")
        .maybeSingle();

      if (error) throw error;
      setRow(data);
      setPublished(!!(asPublish ?? published));
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1200);
    } catch (e) {
      alert("Save failed. Check console.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // ----------- keyboard shortcuts -----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        save(false);
      } else if (k === "b") {
        e.preventDefault();
        applyWrap("**", "**");
      } else if (k === "i") {
        e.preventDefault();
        applyWrap("_", "_");
      } else if (k === "u") {
        e.preventDefault();
        applyWrap("<u>", "</u>");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, title, published]);

  // ----------- editing helpers -----------
  const snapshot = () => {
    undoStack.current.push(content);
    redoStack.current = [];
  };

  const setContentWithUndo = (val: string) => {
    setContent(val);
  };

  const getSel = () => {
    const ta = taRef.current;
    if (!ta) return { start: 0, end: 0, value: content };
    return { start: ta.selectionStart, end: ta.selectionEnd, value: content };
  };

  const setSel = (start: number, end: number) => {
    const ta = taRef.current;
    if (!ta) return;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start, end);
    });
  };

  const applyWrap = (prefix: string, suffix: string) => {
    snapshot();
    const { start, end, value } = getSel();
    const before = value.slice(0, start);
    const sel = value.slice(start, end) || "text"; // ← fixed (removed stray 'the')
    const after = value.slice(end);
    const next = `${before}${prefix}${sel}${suffix}${after}`;
    setContentWithUndo(next);
    setSel(start + prefix.length, start + prefix.length + sel.length);
  };

  const applyHeading = (level: 2 | 3) => {
    snapshot();
    const { start, end, value } = getSel();
    const marker = level === 2 ? "## " : "### ";
    const replaced = value
      .slice(start, end)
      .replace(/^(#{1,6}\s*)?/gm, "")
      .split("\n")
      .map((ln) => marker + ln)
      .join("\n");
    const next = value.slice(0, start) + replaced + value.slice(end);
    setContentWithUndo(next);
    setSel(start, start + replaced.length);
  };

  const applyLinePrefix = (prefix: string, isOrdered = false) => {
    snapshot();
    const { start, end, value } = getSel();
    const selected = value.slice(start, end);
    const lines = selected.split("\n");
    const out = lines
      .map((ln, idx) =>
        isOrdered
          ? `${idx + 1}. ${ln.replace(/^(\s*([-*+]|\d+\.)\s+)/, "")}`
          : `${prefix}${ln.replace(/^(\s*([-*+]|\d+\.)\s+)/, "")}`
      )
      .join("\n");
    const next = value.slice(0, start) + out + value.slice(end);
    setContentWithUndo(next);
    setSel(start, start + out.length);
  };

  const insertLink = () => {
    snapshot();
    const { start, end, value } = getSel();
    const sel = value.slice(start, end) || "link text";
    const url = window.prompt("Enter URL", "https://");
    if (!url) return;
    const md = `[${sel}](${url})`;
    const next = value.slice(0, start) + md + value.slice(end);
    setContentWithUndo(next);
    setSel(start + 1, start + 1 + sel.length);
  };

  const insertCodeBlock = () => {
    snapshot();
    const { start, end, value } = getSel();
    const sel = value.slice(start, end) || "code";
    const md = `\n\`\`\`\n${sel}\n\`\`\`\n`;
    const next = value.slice(0, start) + md + value.slice(end);
    setContentWithUndo(next);
    setSel(start + 4, start + 4 + sel.length);
  };

  const insertHr = () => {
    snapshot();
    const { start, end, value } = getSel();
    const md = `\n\n---\n\n`;
    const next = value.slice(0, start) + md + value.slice(end);
    setContentWithUndo(next);
    setSel(start + 2, start + 2);
  };

  const doUndo = () => {
    if (!undoStack.current.length) return;
    const prev = undoStack.current.pop()!;
    redoStack.current.push(content);
    setContentWithUndo(prev);
  };
  const doRedo = () => {
    if (!redoStack.current.length) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push(content);
    setContentWithUndo(next);
  };

  const insertSkeleton = () => {
    snapshot();
    const skel = `## Introduction & Contact

Baker's Rental Cars, P.O. Box 1949, Kulukulu, Sigatoka — Phone: **942 7497**, **748 8252** • Email: bakersrental@yahoo.com.

## Renter Responsibilities

- Add bullets like this
- Keep it simple

## Collision Damage Waiver (CDW)

- Excess details…

## Damage to the Vehicle

- What counts as damage, etc.

## Windscreen Damage

- Windscreen costs borne by renter.

## Mechanical Repairs & Accidents

- Call us; don't fix without approval.

## Baker's Rental Cars Liability

- Our liability notes.

## Payment of Charges & Damages

- Fines, fees, excess, etc.

## Renter Warranties

- Valid licence; info is correct.
`;
    const next = content?.trim() ? content.trimEnd() + "\n\n" + skel : skel;
    setContentWithUndo(next);
  };

  const sections = useMemo(() => {
    const normalized = content.replace(/\r\n/g, "\n").trim();
    if (!/^##\s+/m.test(normalized)) return [{ title: "Content", body: normalized }];
    return normalized.split(/\n(?=##\s+)/g).map((part) => {
      const [h2, ...rest] = part.split("\n");
      return { title: h2.replace(/^##\s+/, "").trim(), body: rest.join("\n") };
    });
  }, [content]);

  if (loading) {
    return (
      <AdminAuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
          <TopNav />
          <div className="container mx-auto max-w-6xl p-6 text-white/80">Loading…</div>
        </div>
      </AdminAuthGuard>
    );
  }

  return (
    <AdminAuthGuard>
      <div className="relative min-h-screen overflow-hidden">
        {/* Background accents to match admin theme */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute inset-0 -z-20 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" />

        <TopNav />

        <div className="container mx-auto max-w-6xl p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow">Edit Terms & Conditions</h1>
            <Button asChild variant="outline" className="bg-white/5 hover:bg-white/10 border-white/20 text-white">
              <Link href="/admin/dashboard">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Return to Dashboard
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editor */}
            <Card className="border-0 bg-white/[0.04] ring-1 ring-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white">Editor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="block text-sm text-white/70">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg bg-slate-900/60 border border-white/10 text-white px-3 py-2"
                />

                {/* Toolbar */}
                <div className="sticky top-[72px] z-30 rounded-lg bg-slate-900/50 border border-white/10 backdrop-blur p-2 flex flex-wrap gap-1">
                  <ToolbarButton label="Undo" onClick={doUndo} icon={<Undo2 className="h-4 w-4" />} />
                  <ToolbarButton label="Redo" onClick={doRedo} icon={<Redo2 className="h-4 w-4" />} />
                  <span className="mx-1 h-5 w-px bg-white/10" />
                  <ToolbarButton label="H2" onClick={() => applyHeading(2)} icon={<Heading2 className="h-4 w-4" />} />
                  <ToolbarButton label="H3" onClick={() => applyHeading(3)} icon={<Heading3 className="h-4 w-4" />} />
                  <ToolbarButton label="Bold (Ctrl/Cmd+B)" onClick={() => applyWrap("**", "**")} icon={<Bold className="h-4 w-4" />} />
                  <ToolbarButton label="Italic (Ctrl/Cmd+I)" onClick={() => applyWrap("_", "_")} icon={<Italic className="h-4 w-4" />} />
                  <ToolbarButton
                    label="Underline (HTML; may not show on public)"
                    onClick={() => applyWrap("<u>", "</u>")}
                    icon={<Underline className="h-4 w-4" />}
                  />
                  <span className="mx-1 h-5 w-px bg-white/10" />
                  <ToolbarButton label="Bulleted list" onClick={() => applyLinePrefix("- ")} icon={<List className="h-4 w-4" />} />
                  <ToolbarButton
                    label="Numbered list"
                    onClick={() => applyLinePrefix("", true)}
                    icon={<ListOrdered className="h-4 w-4" />}
                  />
                  <ToolbarButton label="Quote" onClick={() => applyLinePrefix("> ")} icon={<Quote className="h-4 w-4" />} />
                  <ToolbarButton label="Link" onClick={insertLink} icon={<LinkIcon className="h-4 w-4" />} />
                  <ToolbarButton label="Code block" onClick={insertCodeBlock} icon={<CodeIcon className="h-4 w-4" />} />
                  <ToolbarButton label="Divider" onClick={insertHr} icon={<Minus className="h-4 w-4" />} />
                  <span className="mx-1 h-5 w-px bg-white/10" />
                  <ToolbarButton label="Insert skeleton" onClick={insertSkeleton} icon={<Sparkles className="h-4 w-4" />} />
                  <div className="ml-auto text-xs text-white/60 px-2 self-center">
                    {content.trim().split(/\s+/).filter(Boolean).length} words
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="block text-sm text-white/70">Content (Markdown)</label>
                  <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                    <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
                    Published
                  </label>
                </div>

                {/* TEXTAREA — white background + black text for high contrast */}
                <textarea
                  ref={taRef}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                  }}
                  rows={22}
                  className="w-full rounded-lg bg-white text-slate-900 caret-slate-900 placeholder-slate-500 border border-slate-300 px-3 py-2 font-mono shadow-inner focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder={`## Introduction & Contact\n\n...`}
                />

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => save(false)}
                    disabled={saving}
                    className="bg-white/10 hover:bg-white/15 border border-white/20 text-white"
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Draft
                  </Button>
                  <Button onClick={() => save(true)} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500">
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                    Save & Publish
                  </Button>
                  {savedTick && (
                    <span className="inline-flex items-center gap-1 text-emerald-300">
                      <Check className="h-4 w-4" /> Saved
                    </span>
                  )}
                </div>

                <div className="text-xs text-white/60">
                  Tips: use <code>##</code> to start a new section (each section becomes a card + TOC item on the customer page).
                  Use <b>**bold**</b>, <i>_italic_</i>, lists, quotes, links, code blocks. (Underline inserts HTML and may not render
                  on the public page.)
                </div>
              </CardContent>
            </Card>

            {/* Live Preview (same markdown styling as public) */}
            <Card className="border-0 bg-white/[0.04] ring-1 ring-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Eye className="h-5 w-5" /> Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sections.map((s, i) => (
                  <div key={i} className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-4 md:p-5 mb-4">
                    <h3 className="text-white text-lg font-semibold mb-2">{s.title}</h3>
                    <div className="prose prose-invert prose-slate max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeSlug, [rehypeAutolinkHeadings, { behavior: "wrap" }]]}
                      >
                        {s.body}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminAuthGuard>
  );
}

/* ---------------- Admin top nav to match dashboard theme ---------------- */
function TopNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-slate-950/70 via-slate-900/40 to-slate-950/70 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-fuchsia-500 shadow-lg shadow-cyan-500/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-white drop-shadow" />
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-fuchsia-100 bg-clip-text text-transparent">
                Bakers Rentals
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-cyan-100/80 font-medium">Admin · Terms</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button asChild variant="outline" className="bg-white/5 hover:bg-white/10 border-white/10 text-white backdrop-blur">
              <Link href="/admin/dashboard">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ---------------- small toolbar button ---------------- */
function ToolbarButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    >
      {icon}
    </button>
  );
}
