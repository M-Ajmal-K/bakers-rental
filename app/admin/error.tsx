"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Helps when inspecting Vercel logs / browser console
    // eslint-disable-next-line no-console
    console.error("Admin error boundary:", error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong in Admin</h1>
      <p className="text-muted-foreground max-w-md">
        {error?.message || "An unexpected error occurred."}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/admin/login")}>
          Go to Admin Login
        </Button>
      </div>
    </div>
  )
}
