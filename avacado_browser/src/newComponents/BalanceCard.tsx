import { useState } from "react";
import { motion } from "framer-motion";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { HiOutlineRefresh } from "react-icons/hi";

interface BalanceCardProps {
    balance: string;
    symbol: string;
    label?: string;
    onRefresh?: () => void;
    isRefreshing?: boolean;
    showPrivacyToggle?: boolean;
}

export function BalanceCard({
    balance,
    symbol,
    label = "Balance",
    onRefresh,
    isRefreshing = false,
    showPrivacyToggle = true,
}: BalanceCardProps) {
    const [isHidden, setIsHidden] = useState(false);

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="frost-card p-6 relative overflow-hidden"
        >
            {/* Subtle radial glow in top-right */}
            <div
                className="pointer-events-none absolute -right-12 -top-12 h-[140px] w-[140px] rounded-full opacity-60"
                style={{
                    background:
                        "radial-gradient(circle, rgba(255,107,107,0.08) 0%, rgba(255,107,107,0) 70%)",
                }}
                aria-hidden="true"
            />
            
            <div className="flex items-center justify-between mb-4">
                <span className="mono-kicker text-coral-red">[{label}]</span>
                <div className="flex items-center gap-2">
                    {showPrivacyToggle && (
                        <button
                            type="button"
                            onClick={() => setIsHidden(!isHidden)}
                            className="p-2 rounded-[2px] hover:bg-black/5 transition-colors"
                            aria-label={isHidden ? "Show balance" : "Hide balance"}
                        >
                            {isHidden ? (
                                <AiOutlineEyeInvisible className="h-4 w-4 text-gray-500" />
                            ) : (
                                <AiOutlineEye className="h-4 w-4 text-gray-500" />
                            )}
                        </button>
                    )}
                    {onRefresh && (
                        <button
                            type="button"
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className="p-2 rounded-[2px] hover:bg-black/5 transition-colors disabled:opacity-50"
                            aria-label="Refresh balance"
                        >
                            <HiOutlineRefresh
                                className={`h-4 w-4 text-gray-500 ${
                                    isRefreshing ? "animate-spin" : ""
                                }`}
                            />
                        </button>
                    )}
                </div>
            </div>

            <div className={isHidden ? "privacy-blur select-none" : ""}>
                <div className="text-5xl font-bold text-black mb-2">
                    {balance}
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className="inline-block h-3 w-3 rounded-full bg-coral-red"
                        aria-hidden="true"
                    />
                    <span className="text-sm font-semibold text-gray-600">
                        {symbol}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
