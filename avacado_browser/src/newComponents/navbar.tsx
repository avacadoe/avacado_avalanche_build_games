"use client"

import { useEffect, useState } from "react"

const navItems = [
  {
    href: "#blog",
    label: "Blog",
  },
  {
    href: "#docs",
    label: "Docs",
  },
]

export function Navbar() {
  const [toastOpen, setToastOpen] = useState(false)

  // Auto-hide toast after 2.5s
  useEffect(() => {
    if (!toastOpen) return
    const id = setTimeout(() => setToastOpen(false), 2500)
    return () => clearTimeout(id)
  }, [toastOpen])

  return (
    <header
      className="sticky top-0 z-50 border-b border-black/10 bg-[#ECECEC]/90 backdrop-blur transition-colors relative"
      style={{
        backgroundColor: "#ECECEC",
        backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)",
        backgroundSize: "12px 12px",
      }}
    >
      {/* Toast */}
      {toastOpen && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto absolute right-4 top-4 z-[60] w-[300px] rounded-[2px] border border-[color:var(--color-border)] bg-white/90 backdrop-blur px-4 py-3 shadow-[inset_0_0_0_1px_var(--color-border),0_14px_36px_rgba(0,0,0,0.14)]"
          style={{ color: "#1F1F1F" }}
        >
          <div className="mb-1 flex items-center justify-between">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{ color: "#FF6B6B" }}
            >
              [ NOTICE ]
            </span>
            <span
              aria-hidden
              className="inline-flex h-4 w-4 items-center justify-center rounded-[2px]"
              style={{ backgroundColor: "#FF6B6B" }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 2h6v6" stroke="white" strokeWidth="1" />
                <path d="M8 2L2 8" stroke="white" strokeWidth="1" />
              </svg>
            </span>
          </div>
          <p className="text-[12px] leading-[1.45]">slow down there buckaroo, we launch soon</p>
          <div className="mt-2 h-[3px] w-full overflow-hidden rounded-[1px] bg-black/10">
            <div className="h-full w-full origin-right bg-[#FF6B6B]" style={{ animation: "toast-progress 2.5s linear forwards" }} />
          </div>
          <style>{`
            @keyframes toast-progress {
              from { transform: scaleX(1); }
              to { transform: scaleX(0); }
            }
          `}</style>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-black/10" />
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-black/5" />
        <div className="absolute inset-y-0 left-0 right-0 mx-auto hidden max-w-[1200px] lg:block">
          <span className="absolute left-6 top-0 bottom-0 w-px bg-black/10 lg:left-16" />
          <span className="absolute right-6 top-0 bottom-0 w-px bg-black/10 lg:right-16" />
        </div>
      </div>

      <div className="relative z-[1] mx-auto flex h-[68px] w-full max-w-[1200px] items-center justify-between px-6 lg:h-[88px] lg:px-16">
        <a href="#home" className="group relative flex items-center gap-3">
          <span className="flex flex-col leading-none">
            <span
              className="text-[24px] font-semibold tracking-[-0.04em] text-[#FF6B6B]"
              style={{
                fontFamily: "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
              }}
            >
              avacado
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-7 lg:flex">
          {navItems.map(({ href, label }) => (
            <a
              key={label}
              href={href}
              className="group relative flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#3F3F3F] transition-colors duration-200 hover:text-[#FF6B6B]"
            >
              <span>{label}</span>
              <span className="pointer-events-none absolute bottom-[-12px] left-0 right-0 mx-auto h-[1px] w-0 bg-[#FF6B6B] transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[2px] border border-black/10 bg-white/70 text-[#FF6B6B] transition-all duration-200 hover:border-[#FF6B6B] hover:text-[#FF6B6B] lg:hidden"
        >
          <span className="sr-only">Open navigation</span>
        </button>
      </div>
    </header>
  )
}
