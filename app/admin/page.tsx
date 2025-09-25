// app/admin/page.tsx
import { redirect } from "next/navigation";

export default function AdminIndex() {
  // Always send bare /admin requests to the login screen.
  // Middleware will handle redirecting unauthenticated users and preserving ?next=
  redirect("/admin/login");
}
