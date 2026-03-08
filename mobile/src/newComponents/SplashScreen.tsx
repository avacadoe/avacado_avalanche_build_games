import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
    isVisible: boolean;
    onDone: () => void;
    duration?: number;
}

export function SplashScreen({ isVisible, onDone, duration = 3200 }: SplashScreenProps) {
    useEffect(() => {
        if (!isVisible) return;
        const timer = setTimeout(() => onDone(), duration);
        return () => clearTimeout(timer);
    }, [isVisible, onDone, duration]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.55, ease: "easeInOut" }}
                    className="fixed inset-0 z-[99999] flex flex-col items-center justify-center select-none"
                    style={{
                        backgroundColor: "#ECECEC",
                        backgroundImage:
                            "radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)",
                        backgroundSize: "12px 12px",
                    }}
                >
                    {/* Radial coral glow */}
                    <div
                        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full"
                        style={{
                            background:
                                "radial-gradient(circle, rgba(255,107,107,0.18) 0%, rgba(255,107,107,0) 68%)",
                        }}
                        aria-hidden="true"
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.12 }}
                        className="relative flex flex-col items-center gap-6"
                    >
                        {/* Logo */}
                        <motion.img
                            src="/avocado-logo.png"
                            alt="Avacado"
                            className="w-[88px] h-[88px] drop-shadow-lg"
                            initial={{ scale: 0.75, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                                duration: 0.55,
                                delay: 0.22,
                                type: "spring",
                                stiffness: 220,
                                damping: 18,
                            }}
                        />

                        {/* Wordmark */}
                        <div className="text-center">
                            <p
                                style={{
                                    fontFamily:
                                        "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                                    fontSize: "52px",
                                    fontWeight: 100,
                                    letterSpacing: "-0.04em",
                                    lineHeight: 1,
                                    color: "#FF6B6B",
                                }}
                            >
                                avacado
                            </p>
                            <p
                                className="mt-2 text-gray-400"
                                style={{
                                    fontFamily:
                                        "JetBrains Mono, Monaco, 'Courier New', monospace",
                                    fontSize: "11px",
                                    letterSpacing: "0.32em",
                                    textTransform: "uppercase",
                                }}
                            >
                                / Privacy Wallet
                            </p>
                        </div>

                        {/* Loading dots */}
                        <div className="flex items-center gap-2.5 mt-1">
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    className="w-[7px] h-[7px] rounded-full"
                                    style={{ backgroundColor: "#FF6B6B" }}
                                    animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.1, 0.8] }}
                                    transition={{
                                        duration: 1.1,
                                        repeat: Infinity,
                                        delay: i * 0.22,
                                        ease: "easeInOut",
                                    }}
                                />
                            ))}
                        </div>
                    </motion.div>

                    {/* Bottom build tag */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
                        className="absolute bottom-10 text-center"
                        style={{
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: "9px",
                            letterSpacing: "0.28em",
                            textTransform: "uppercase",
                            color: "#AAAAAA",
                        }}
                    >
                        Encrypted · Zero-Knowledge · Self-Custodial
                    </motion.p>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
