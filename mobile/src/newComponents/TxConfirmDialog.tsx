import { AnimatePresence, motion } from "framer-motion";

export type TxType = "deposit" | "transfer" | "withdraw" | "mint" | "approve";

export interface TxDetail {
    label: string;
    value: string;
}

interface TxConfirmDialogProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    type: TxType;
    title: string;
    details: TxDetail[];
}

const TX_META: Record<TxType, { emoji: string; color: string; bg: string; label: string }> = {
    deposit: {
        emoji: "⬇",
        color: "#00A667",
        bg: "rgba(0,166,103,0.1)",
        label: "Deposit",
    },
    transfer: {
        emoji: "↔",
        color: "#FF6B6B",
        bg: "rgba(255,107,107,0.1)",
        label: "Transfer",
    },
    withdraw: {
        emoji: "⬆",
        color: "#C4A600",
        bg: "rgba(196,166,0,0.1)",
        label: "Withdraw",
    },
    mint: {
        emoji: "✦",
        color: "#7C3AED",
        bg: "rgba(124,58,237,0.1)",
        label: "Mint",
    },
    approve: {
        emoji: "✓",
        color: "#0EA5E9",
        bg: "rgba(14,165,233,0.1)",
        label: "Approve",
    },
};

export function TxConfirmDialog({
    isOpen,
    onConfirm,
    onCancel,
    type,
    title,
    details,
}: TxConfirmDialogProps) {
    const meta = TX_META[type] ?? TX_META.deposit;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onCancel}
                        className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
                        aria-hidden="true"
                    />

                    {/* Bottom sheet */}
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="txdialog-title"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 32, stiffness: 380 }}
                        className="fixed bottom-0 inset-x-0 z-[201] rounded-t-[28px] overflow-hidden"
                        style={{
                            backgroundColor: "#ECECEC",
                            backgroundImage:
                                "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
                            backgroundSize: "12px 12px",
                            paddingBottom: "max(24px, env(safe-area-inset-bottom))",
                        }}
                    >
                        {/* Drag handle */}
                        <div className="flex justify-center pt-4 pb-2">
                            <div className="w-10 h-1 rounded-full bg-black/15" />
                        </div>

                        <div className="px-5 pb-2">
                            {/* Icon + heading */}
                            <div className="flex items-center gap-3 mb-5">
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 font-semibold"
                                    style={{ background: meta.bg, color: meta.color }}
                                >
                                    {meta.emoji}
                                </div>
                                <div>
                                    <p
                                        className="text-[9px] uppercase tracking-[0.3em] text-gray-400"
                                        style={{
                                            fontFamily:
                                                "JetBrains Mono, Monaco, monospace",
                                        }}
                                    >
                                        Confirm Transaction
                                    </p>
                                    <p
                                        id="txdialog-title"
                                        className="text-[18px] text-black mt-0.5"
                                        style={{
                                            fontFamily:
                                                "'Scto Grotesk A', Inter, -apple-system, sans-serif",
                                            fontWeight: 400,
                                            letterSpacing: "-0.01em",
                                        }}
                                    >
                                        {title}
                                    </p>
                                </div>
                            </div>

                            {/* Details card */}
                            {details.length > 0 && (
                                <div className="bg-white rounded-2xl overflow-hidden divide-y divide-black/[0.06] mb-4 shadow-sm">
                                    {details.map(({ label, value }) => (
                                        <div
                                            key={label}
                                            className="flex items-start justify-between gap-4 px-4 py-3"
                                        >
                                            <p
                                                className="text-[11px] text-gray-400 uppercase tracking-wider shrink-0"
                                                style={{
                                                    fontFamily:
                                                        "JetBrains Mono, Monaco, monospace",
                                                    letterSpacing: "0.1em",
                                                }}
                                            >
                                                {label}
                                            </p>
                                            <p className="text-[13px] font-mono text-black text-right break-all">
                                                {value}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Warning */}
                            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-3 mb-5">
                                <svg
                                    className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                                <p className="text-xs text-amber-700 leading-relaxed">
                                    This transaction will be submitted on-chain and{" "}
                                    <strong>cannot be reversed</strong>. Review the
                                    details above carefully.
                                </p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="flex-1 py-4 rounded-2xl border border-black/10 bg-white text-sm text-gray-700 active:scale-[0.97] transition-all"
                                    style={{ fontWeight: 400 }}
                                >
                                    Cancel
                                </button>
                                <motion.button
                                    type="button"
                                    onClick={onConfirm}
                                    whileTap={{ scale: 0.97 }}
                                    className="flex-1 py-4 rounded-2xl text-sm text-white active:scale-[0.97] transition-all shadow-lg"
                                    style={{
                                        background: "#FF6B6B",
                                        boxShadow: "0 8px 24px rgba(255,107,107,0.35)",
                                        fontWeight: 400,
                                    }}
                                >
                                    Confirm &amp; Submit
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
