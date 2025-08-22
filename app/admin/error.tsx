"use client"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold mb-2">Something went wrong in Admin</h1>
      <p className="text-sm text-muted-foreground max-w-md">{error?.message || "Unknown error"}</p>
      <button
        onClick={() => reset()}
        className="mt-4 px-4 py-2 rounded bg-black text-white hover:bg-black/80"
      >
        Try again
      </button>
    </div>
  )
}
