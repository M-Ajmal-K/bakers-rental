// app/admin/page.tsx

import { redirect } from "next/navigation";

// Server-side redirect so there's no flicker and no reliance on localStorage.
// Your middleware will send unauthenticated users to /admin/login.
// If they're authenticated, we send them straight to the dashboard.
export default function AdminPage() {
  redirect("/admin/dashboard");
}
