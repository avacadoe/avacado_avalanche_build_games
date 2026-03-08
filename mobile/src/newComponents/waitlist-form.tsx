"use client"

import { useState, useEffect, useRef } from "react"

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 min-w-[160px] items-center justify-center rounded-[12px] border border-[#FF6B6B] bg-[#FF6B6B] px-7 text-[12px] font-semibold uppercase tracking-[0.28em] text-white shadow-[0_20px_48px_rgba(255,107,107,0.32)] transition-colors duration-200 hover:bg-[#ff7c7c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B6B] disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        fontFamily: "JetBrains Mono, Monaco, 'Courier New', monospace",
      }}
    >
      {pending ? "Joining..." : "Join waitlist"}
    </button>
  )
}

type WaitlistFormState = {
  status: "idle" | "success" | "error";
  message: string;
}

const initialWaitlistState: WaitlistFormState = {
  status: "idle",
  message: "",
}

export function WaitlistForm() {
  const [state, setState] = useState<WaitlistFormState>(initialWaitlistState)
  const [pending, setPending] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset()
    }
  }, [state.status])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPending(true)
    // Simulate form submission
    setTimeout(() => {
      setState({ status: "success", message: "Successfully joined the waitlist!" })
      setPending(false)
    }, 1000)
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-4"
      aria-describedby="waitlist-feedback"
      style={{
        fontFamily: "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#1A1A1A",
        letterSpacing: "-0.01em",
      }}
    >
      <div className="space-y-2">
        <label
          htmlFor="name"
          className="block text-[13px] font-semibold text-[#313131]"
          style={{
            fontFamily: "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            letterSpacing: "-0.015em",
            textTransform: "uppercase",
          }}
        >
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Satoshi Nakamoto"
          className="w-full rounded-[12px] border border-[#E2DDDA] bg-[#FEFBFA] px-4 py-3 text-sm shadow-[0_16px_40px_rgba(0,0,0,0.05)] outline-none transition-all placeholder:text-[#B8B1AF] focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/30"
          style={{
            fontFamily: "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            color: "#1F1F1F",
            letterSpacing: "-0.01em",
          }}
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-[13px] font-semibold text-[#313131]"
          style={{
            fontFamily: "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            letterSpacing: "-0.015em",
            textTransform: "uppercase",
          }}
        >
          Email
          <span
            className="inline-block pl-1 text-[#FF6B6B]"
            style={{
              fontFamily: "JetBrains Mono, Monaco, 'Courier New', monospace",
              letterSpacing: "0.24em",
            }}
          >
            *
          </span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-[12px] border border-[#E2DDDA] bg-[#FEFBFA] px-4 py-3 text-sm shadow-[0_16px_40px_rgba(0,0,0,0.05)] outline-none transition-all placeholder:text-[#B8B1AF] focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/30"
          style={{
            fontFamily: "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            color: "#1F1F1F",
            letterSpacing: "-0.01em",
          }}
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="useCase"
          className="block text-sm font-semibold text-[#303030]"
          style={{
            fontFamily: "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            letterSpacing: "-0.012em",
            lineHeight: 1.4,
          }}
        >
          What are you hoping to use Avacado for?
        </label>
        <textarea
          id="useCase"
          name="useCase"
          rows={3}
          placeholder="Share a sentence about your trading needs..."
          className="w-full rounded-[12px] border border-[#E2DDDA] bg-[#FEFBFA] px-4 py-3 text-sm shadow-[0_16px_40px_rgba(0,0,0,0.05)] outline-none transition-all placeholder:text-[#B8B1AF] focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/30"
          style={{
            fontFamily: "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            color: "#1F1F1F",
            letterSpacing: "-0.01em",
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <p
          className="text-[10px] uppercase tracking-[0.32em] text-[#7C7C7C]"
          style={{
            fontFamily: "JetBrains Mono, Monaco, 'Courier New', monospace",
            letterSpacing: "0.32em",
          }}
        >
          We'll only email you about the product launch.
        </p>
        <SubmitButton pending={pending} />
      </div>

      {state.status !== "idle" && (
        <div
          id="waitlist-feedback"
          role={state.status === "error" ? "alert" : "status"}
          className={`rounded-[12px] border px-4 py-3 text-sm font-medium ${
            state.status === "error"
              ? "border-[#FFB6B6] bg-[#FFF2F2] text-[#E04F4F]"
              : "border-[#A8E8CC] bg-[#F1FFF6] text-[#1C7F57]"
          }`}
          style={{
            fontFamily: "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            letterSpacing: "-0.01em",
          }}
        >
          {state.message}
        </div>
      )}
    </form>
  )
}
