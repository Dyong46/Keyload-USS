import type * as React from "react"

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-2 block text-sm font-semibold text-slate-800">
      {children}
    </span>
  )
}

export function StepHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
        <Icon className="size-5" />
      </span>
      <div>
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  )
}

export function SummaryRow({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="font-medium text-slate-400">{label}</p>
        <p className="mt-0.5 font-semibold text-slate-800">{value}</p>
        {detail && <p className="mt-0.5 leading-4 text-slate-400">{detail}</p>}
      </div>
    </div>
  )
}
