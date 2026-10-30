import { LoaderCircle, RefreshCw, ServerCrash } from "lucide-react"

import { Button } from "@/components/ui/button"

export function BookingReferenceState({
  hasError,
  onRetry,
}: {
  hasError: boolean
  onRetry: () => void
}) {
  return (
    <div className="mx-auto grid min-h-[520px] max-w-3xl place-items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      {hasError ? (
        <div>
          <ServerCrash className="mx-auto size-9 text-red-500" />
          <h1 className="mt-4 text-lg font-bold text-slate-900">
            Could not load booking data
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Check that the backend is running, then try again.
          </p>
          <Button className="mt-5" onClick={onRetry}>
            <RefreshCw data-icon="inline-start" /> Retry
          </Button>
        </div>
      ) : (
        <div>
          <LoaderCircle className="mx-auto size-9 animate-spin text-blue-600" />
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Loading booking data…
          </p>
        </div>
      )}
    </div>
  )
}
