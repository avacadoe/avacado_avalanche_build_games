import {
    type CompatiblePublicClient,
    type CompatibleWalletClient,
    useEERC,
} from "@avalabs/eerc-sdk";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { avalancheFuji } from "wagmi/chains";
import { motion } from "framer-motion";
import { NewLayout } from "../newComponents";
import { CIRCUIT_CONFIG, CONTRACTS, URLS } from "../config/contracts";
import "../newStyles.css";

interface NewHomeProps {
    onNavigate: (page: string) => void;
    mode?: "standalone" | "converter";
}

export function NewHome({ onNavigate, mode = "converter" }: NewHomeProps) {
    const { isConnected } = useAccount();
    const publicClient = usePublicClient({ chainId: avalancheFuji.id });
    const { data: walletClient } = useWalletClient();

    // Only initialize useEERC if wallet is connected
    const { isRegistered } = useEERC(
        publicClient as CompatiblePublicClient,
        walletClient as CompatibleWalletClient,
        mode === "converter"
            ? CONTRACTS.EERC_CONVERTER
            : CONTRACTS.EERC_STANDALONE,
        URLS,
        CIRCUIT_CONFIG
    );

    // Smart navigation: Check registration status and navigate accordingly
    const handleGetStarted = () => {
        if (!isConnected) {
            // If not connected, go to registration page where they'll be prompted to connect
            onNavigate("registration");
            return;
        }

        if (isRegistered) {
            // Already registered, go straight to dashboard
            onNavigate("dashboard");
        } else {
            // Not registered, go to registration flow
            onNavigate("registration");
        }
    };

    // Auto-redirect registered users who click "Launch App"
    const handleLaunchApp = () => {
        onNavigate("dashboard");
    };

    return (
        <NewLayout onNavigate={onNavigate} currentPage="home">
            <div className="min-h-[calc(100vh-200px)] flex flex-col">
                {/* Hero Section */}
                <motion.section
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative text-center py-20 flex-1 flex items-center justify-center"
                >
                    {/* Subtle red gradient tint */}
                    <div className="absolute inset-0 bg-gradient-to-b from-coral-red/[0.03] via-transparent to-transparent -mx-8 -my-4 pointer-events-none" />

                    {/* Radial glow behind heading */}
                    <div
                        className="pointer-events-none absolute left-1/2 top-8 h-[300px] w-[300px] -translate-x-1/2 rounded-full md:h-[400px] md:w-[400px] lg:h-[500px] lg:w-[500px]"
                        style={{
                            background:
                                "radial-gradient(circle, rgba(255,107,107,0.15) 0%, rgba(255,107,107,0) 70%)",
                        }}
                        aria-hidden="true"
                    />

                    <div className="relative max-w-5xl mx-auto">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-6xl md:text-8xl font-bold leading-[1.02] mb-8"
                            style={{
                                letterSpacing: "-0.02em",
                                color: "#FF6B6B",
                                fontFamily:
                                    "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                            }}
                        >
                            The Privacy Wallet
                            <br />
                            For Your Crypto
                        </motion.h1>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="mt-10 space-y-3 text-[14px] font-semibold uppercase tracking-[0.08em] text-coral-red"
                            style={{
                                fontFamily:
                                    "JetBrains Mono, Monaco, 'Courier New', monospace",
                            }}
                        >
                            <p>PRIVACY FIRST</p>
                            <p>100% ANONYMOUS</p>
                            <p>ZERO-KNOWLEDGE PROOFS</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.6 }}
                            className="mt-16 flex flex-col sm:flex-row gap-4 justify-center items-center"
                        >
                            <button
                                type="button"
                                onClick={handleLaunchApp}
                                className="btn-primary text-base px-8 py-4"
                            >
                                Launch App →
                            </button>
                            <button
                                type="button"
                                onClick={handleGetStarted}
                                className="btn-secondary text-base px-8 py-4"
                            >
                                {isConnected && isRegistered
                                    ? "Go to Dashboard"
                                    : "Get Started"}
                            </button>
                        </motion.div>
                    </div>
                </motion.section>

                {/* Spacer for footer */}
                <div className="h-32"></div>
            </div>
        </NewLayout>
    );
}
