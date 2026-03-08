import { useState, useEffect, useRef } from "react";
import {
    type CompatiblePublicClient,
    type CompatibleWalletClient,
    useEERC,
} from "@avalabs/eerc-sdk";
import {
    useAccount,
    usePublicClient,
    useWalletClient,
    useWaitForTransactionReceipt,
} from "wagmi";
import { avalancheFuji } from "wagmi/chains";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { NewLayout, LoadingSpinner, StatusIndicator } from "../newComponents";
import { WalletModal } from "../components/wallet";
import { CIRCUIT_CONFIG, CONTRACTS, URLS } from "../config/contracts";
import "../newStyles.css";

interface NewRegistrationProps {
    onNavigate: (page: string) => void;
    mode: "standalone" | "converter";
}

export function NewRegistration({ onNavigate, mode }: NewRegistrationProps) {
    const [txHash, setTxHash] = useState<`0x${string}`>("" as `0x${string}`);
    const [isRegistering, setIsRegistering] = useState(false);
    const [step, setStep] = useState<"generate" | "register">("generate");

    // Use ref to prevent infinite loops - only redirect once
    const hasRedirectedRef = useRef(false);
    // Track if we've already shown the toast
    const hasShownToastRef = useRef(false);

    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient({ chainId: avalancheFuji.id });
    const { data: walletClient } = useWalletClient();

    const { data: transactionReceipt, isSuccess } =
        useWaitForTransactionReceipt({
            hash: txHash,
            query: { enabled: Boolean(txHash) },
            confirmations: 1,
        });

    const {
        isRegistered,
        shouldGenerateDecryptionKey,
        generateDecryptionKey,
        register,
    } = useEERC(
        publicClient as CompatiblePublicClient,
        walletClient as CompatibleWalletClient,
        mode === "converter"
            ? CONTRACTS.EERC_CONVERTER
            : CONTRACTS.EERC_STANDALONE,
        URLS,
        CIRCUIT_CONFIG
    );

    const isDecryptionKeySet = !shouldGenerateDecryptionKey;

    // Effect to handle successful transaction
    useEffect(() => {
        if (txHash && isSuccess && transactionReceipt) {
            toast.success("Registration successful!");
            setTxHash("" as `0x${string}`);
            setIsRegistering(false);
            setTimeout(() => onNavigate("dashboard"), 2000);
        }
    }, [txHash, isSuccess, transactionReceipt, onNavigate]);

    // Only redirect once if already registered - use ref to prevent infinite loops
    useEffect(() => {
        // Only check if we haven't redirected AND we're not in the middle of registration
        if (
            isRegistered &&
            isConnected &&
            !hasRedirectedRef.current &&
            !isRegistering
        ) {
            hasRedirectedRef.current = true;

            // Only show toast once
            if (!hasShownToastRef.current) {
                hasShownToastRef.current = true;
                toast.info("You are already registered!", {
                    autoClose: 2000,
                    toastId: "already-registered", // Prevent duplicate toasts
                });
            }

            // Small delay to prevent flickering
            const timer = setTimeout(() => {
                onNavigate("dashboard");
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isRegistered, isConnected, isRegistering, onNavigate]);

    // Auto-advance to backup step when keys are generated
    useEffect(() => {
        if (isDecryptionKeySet && step === "generate") {
            console.log(
                "[Registration] Keys detected, advancing to register step"
            );
            setStep("register");
            toast.success("✓ Keys generated! Ready to register.", {
                autoClose: 3000,
                toastId: "keys-generated",
            });
        }
    }, [isDecryptionKeySet, step]);

    const handleGenerateKey = async () => {
        if (!isConnected || !address) {
            toast.error("Please create or import a wallet first");
            return;
        }

        try {
            toast.info("Generating encryption keys...", { autoClose: 2000 });
            await generateDecryptionKey();
            // Step will auto-advance via useEffect when isDecryptionKeySet becomes true
            toast.success("Encryption keys generated successfully!", {
                autoClose: 3000,
            });
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate keys. Please try again.");
        }
    };

    const handleRegister = async () => {
        if (!isConnected || !address) {
            toast.error("Please create or import a wallet first");
            return;
        }

        if (!isDecryptionKeySet) {
            toast.error("Please generate your encryption keys first");
            return;
        }

        setIsRegistering(true);
        setStep("register");

        try {
            const { transactionHash } = await register();
            setTxHash(transactionHash as `0x${string}`);
        } catch (error) {
            console.error(error);
            const msg = ((error as Error)?.message ?? "").toLowerCase();
            if (
                msg.includes("insufficient funds") ||
                msg.includes("total cost") ||
                msg.includes("exceeds the balance") ||
                msg.includes("not enough funds")
            ) {
                toast.error("Not enough AVAX to pay gas. Top up your wallet on Avalanche Fuji testnet.", { autoClose: 7000 });
            } else {
                toast.error("Registration failed. Please try again.");
            }
            setIsRegistering(false);
        }
    };

    if (!isConnected) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [walletModalOpen, setWalletModalOpen] = useState(false);
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [walletModalView, setWalletModalView] = useState<"create-1" | "import-menu">("create-1");

        const openModal = (view: "create-1" | "import-menu") => {
            setWalletModalView(view);
            setWalletModalOpen(true);
        };

        return (
            <>
            <NewLayout onNavigate={onNavigate} currentPage="registration">
                <div className="max-w-sm mx-auto text-center py-20 px-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#FF6B6B]/10 flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-[#FF6B6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-coral-red mb-3" style={{ letterSpacing: "-0.02em" }}>
                        Connect a Wallet
                    </h1>
                    <p className="text-sm text-gray-500 mb-10 leading-relaxed">
                        Create a new wallet or import an existing one to continue.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={() => openModal("create-1")}
                            className="btn-primary text-base py-4 w-full flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create Wallet
                        </button>
                        <button
                            type="button"
                            onClick={() => openModal("import-menu")}
                            className="btn-secondary text-base py-4 w-full flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Import Wallet
                        </button>
                    </div>
                </div>
            </NewLayout>
            <WalletModal
                isOpen={walletModalOpen}
                defaultView={walletModalView}
                onClose={() => setWalletModalOpen(false)}
                onConnected={() => {
                    window.dispatchEvent(new CustomEvent("avacado:splash"));
                    setWalletModalOpen(false);
                }}
            />
            </>
        );
    }

    // Show loading state while checking registration status
    if (isRegistered === undefined) {
        return (
            <NewLayout onNavigate={onNavigate} currentPage="registration">
                <div className="max-w-2xl mx-auto text-center py-20">
                    <div className="flex flex-col items-center gap-6">
                        <LoadingSpinner size="lg" />
                        <div>
                            <h2 className="text-2xl font-semibold text-coral-red mb-2">
                                Checking Registration Status
                            </h2>
                            <p className="text-gray-600">
                                Please wait while we verify your account...
                            </p>
                        </div>
                    </div>
                </div>
            </NewLayout>
        );
    }

    return (
        <NewLayout onNavigate={onNavigate} currentPage="registration">
            <div className="space-y-4 max-w-lg mx-auto md:max-w-none">

                {/* ── Page header ── */}
                <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "#F6F6F6", border: "1px solid rgba(0,0,0,0.08)" }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #FF6B6B 0%, #ff5252 100%)", boxShadow: "0 4px 14px rgba(255,107,107,0.30)" }}>
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-0.5">One-time setup</p>
                        <p className="text-lg font-semibold text-black leading-tight">Register Account</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Generate keys &amp; register on-chain to enable private transactions</p>
                    </div>
                </div>

                {/* ── Step progress ── */}
                <div className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-3">Progress</p>
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center gap-1">
                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-mono transition-colors ${isDecryptionKeySet ? "border-[#00A667] bg-[#00A667] text-white" : step === "generate" ? "border-[#FF6B6B] text-[#FF6B6B]" : "border-gray-200 text-gray-300"}`}>
                                {isDecryptionKeySet ? "✓" : "1"}
                            </div>
                            <span className="text-[9px] text-gray-400 uppercase tracking-wide">Keys</span>
                        </div>
                        <div className="flex-1 h-px bg-black/10" />
                        <div className="flex flex-col items-center gap-1">
                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-mono transition-colors ${step === "register" && isDecryptionKeySet ? "border-[#FF6B6B] text-[#FF6B6B]" : "border-gray-200 text-gray-300"}`}>
                                2
                            </div>
                            <span className="text-[9px] text-gray-400 uppercase tracking-wide">Register</span>
                        </div>
                    </div>
                </div>

                {/* ── Step content ── */}
                <AnimatePresence mode="wait">
                    {!isDecryptionKeySet ? (
                        <motion.div
                            key="generate"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm space-y-4"
                        >
                            <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Step 1 — Generate Keys</p>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Your encryption keys are generated locally and never leave your device. They are used to encrypt and decrypt your private balances.
                            </p>
                            <StatusIndicator
                                status="info"
                                message="Keys are stored securely in your browser"
                                variant="card"
                            />
                            <button
                                type="button"
                                onClick={handleGenerateKey}
                                className="w-full py-4 rounded-2xl text-sm font-mono uppercase tracking-wider text-white transition-all active:scale-[0.98]"
                                style={{ background: "#FF6B6B", boxShadow: "0 8px 24px rgba(255,107,107,0.28)" }}
                            >
                                Generate Keys
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="register"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm space-y-4"
                        >
                            <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Step 2 — Register On-Chain</p>

                            {isRegistering ? (
                                <div className="py-4">
                                    <LoadingSpinner message="Registering your account…" progress="Waiting for transaction confirmation" />
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        Submit a transaction to register your public key on-chain. This allows others to send you encrypted tokens.
                                    </p>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between py-2.5 px-3 bg-[#F6F6F6] rounded-xl border border-black/8">
                                            <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wide">Network</span>
                                            <span className="text-[11px] font-mono text-black font-medium">Avalanche Fuji</span>
                                        </div>
                                        <div className="flex items-center justify-between py-2.5 px-3 bg-[#F6F6F6] rounded-xl border border-black/8">
                                            <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wide">Est. Gas</span>
                                            <span className="text-[11px] font-mono text-black font-medium">~$0.50</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRegister}
                                        disabled={isRegistering}
                                        className="w-full py-4 rounded-2xl text-sm font-mono uppercase tracking-wider text-white transition-all active:scale-[0.98] disabled:opacity-50"
                                        style={{ background: "#00A667", boxShadow: "0 8px 24px rgba(0,166,103,0.28)" }}
                                    >
                                        Register Now
                                    </button>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </NewLayout>
    );
}
