"use client"

export function SectionHeader() {
  return (
    <header className="mb-6 md:mb-8 lg:mb-10 flex items-start justify-between gap-6">
      <div>
        <div
          className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.18em] mb-2"
          style={{ color: "var(--color-chart-2)" }}
        >
          {"SHIP FASTER"}
        </div>
        <h2 className="text-[34px] md:text-[40px] lg:text-[44px] leading-[1.05] font-semibold">
          Privacy Meets Compliance. Finally, Together.
        </h2>
        <p className="mt-2 font-mono text-[11px] md:text-[12px] text-muted-foreground max-w-[72ch]">
          Transact privately, verify securely, stay fully compliant.
        </p>
      </div>
    </header>
  )
}
