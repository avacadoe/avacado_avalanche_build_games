import {
    type CompatiblePublicClient,
    type CompatibleWalletClient,
    useEERC,
} from "@avalabs/eerc-sdk";
import { useAccount, useDisconnect, usePublicClient, useWalletClient } from "wagmi";
import { avalancheFuji } from "wagmi/chains";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NewLayout } from "../newComponents";
import { WalletModal } from "../components/wallet";
import { CIRCUIT_CONFIG, CONTRACTS, URLS } from "../config/contracts";
import { clearStoredWallet } from "../lib/localWallet";
import { LOCAL_WALLET_CONNECTOR_ID } from "../lib/localWalletConnector";
import "../newStyles.css";

interface NewHomeProps {
    onNavigate: (page: string) => void;
    mode?: "standalone" | "converter";
}

export function NewHome({ onNavigate, mode = "converter" }: NewHomeProps) {
    const { isConnected, connector } = useAccount();
    const { disconnect } = useDisconnect();
    const publicClient = usePublicClient({ chainId: avalancheFuji.id });
    const { data: walletClient } = useWalletClient();
    const [showDisconnectPrompt, setShowDisconnectPrompt] = useState(false);

    const isLocalWallet = connector?.id === LOCAL_WALLET_CONNECTOR_ID;
    const [walletModalOpen, setWalletModalOpen] = useState(false);
    const [walletModalView, setWalletModalView] = useState<"menu" | "create-1" | "import-menu" | "connected">("menu");

    const openWalletModal = (view: "menu" | "create-1" | "import-menu" | "connected") => {
        setWalletModalView(view);
        setWalletModalOpen(true);
    };

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

    const handleDisconnectAndImport = () => {
        if (isLocalWallet) {
            clearStoredWallet();
            // biome-ignore lint/suspicious/noExplicitAny: global bridge
            (globalThis as any).__avacadoResetLocalWalletProvider?.();
        }
        disconnect();
        setShowDisconnectPrompt(false);
        onNavigate("registration");
    };

    // When connected: primary = "Go to Dashboard", secondary = "Create Another Wallet"
    // When not connected: primary = "Create Wallet", secondary = "Import Wallet"
    const handlePrimary = () => {
        if (isConnected) {
            onNavigate(isRegistered ? "dashboard" : "registration");
        } else {
            openWalletModal("create-1");
        }
    };

    const handleSecondary = () => {
        if (isConnected) {
            // Need to disconnect first before creating/importing another wallet
            setShowDisconnectPrompt(true);
        } else {
            openWalletModal("import-menu");
        }
    };

    return (
        <>
        <NewLayout onNavigate={onNavigate} currentPage="home">
            <div className="min-h-[calc(100vh-200px)] flex flex-col">
                {/* Hero Section */}
                <motion.section
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative text-center py-12 sm:py-16 md:py-20 flex-1 flex items-center justify-center"
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
                            className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] sm:leading-[1.02] mb-6 sm:mb-8"
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
                            className="mt-10 sm:mt-16 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center w-full sm:w-auto"
                        >
                            <button
                                type="button"
                                onClick={handlePrimary}
                                className="btn-primary text-base px-8 py-4 w-full sm:w-auto"
                            >
                                {isConnected ? (isRegistered ? "Go to Dashboard →" : "Continue Setup →") : "Create Wallet →"}
                            </button>
                            <button
                                type="button"
                                onClick={handleSecondary}
                                className="btn-secondary text-base px-8 py-4 w-full sm:w-auto"
                            >
                                {isConnected ? "Create Another Wallet" : "Import Wallet"}
                            </button>
                        </motion.div>
                    </div>
                </motion.section>
            </div>

            {/* ── Disconnect prompt bottom sheet ── */}
            <AnimatePresence>
                {showDisconnectPrompt && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
                            onClick={() => setShowDisconnectPrompt(false)}
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", stiffness: 350, damping: 35 }}
                            className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-3xl shadow-2xl"
                            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
                        >
                            {/* drag handle */}
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 rounded-full bg-black/10" />
                            </div>
                            <div className="px-5 pb-8 pt-3">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold text-black text-center mb-1.5">Disconnect current wallet?</h3>
                                <p className="text-xs text-gray-500 text-center mb-6 leading-relaxed">
                                    You need to disconnect before creating or importing a new wallet. Make sure you've backed up your seed phrase.
                                </p>
                                <div className="flex flex-col gap-3">
                                    <button
                                        type="button"
                                        onClick={handleDisconnectAndImport}
                                        className="w-full py-4 rounded-2xl text-white text-sm font-mono uppercase tracking-wider active:scale-[0.98] transition-transform"
                                        style={{ background: "#FF6B6B", boxShadow: "0 8px 24px rgba(255,107,107,0.28)" }}
                                    >
                                        Disconnect &amp; Continue
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowDisconnectPrompt(false)}
                                        className="w-full py-3.5 rounded-2xl border border-black/10 text-sm text-gray-600 font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </NewLayout>

        {/* Wallet creation/import modal for unauthenticated users */}
        <WalletModal
            isOpen={walletModalOpen}
            defaultView={walletModalView}
            onClose={() => setWalletModalOpen(false)}
            onConnected={() => {
                window.dispatchEvent(new CustomEvent("avacado:splash"));
                setWalletModalOpen(false);
                onNavigate("registration");
            }}
        />
    </>
    );
}
