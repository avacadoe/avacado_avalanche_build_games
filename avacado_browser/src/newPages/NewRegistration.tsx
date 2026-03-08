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
            toast.error("Please connect your wallet first");
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
            toast.error("Please connect your wallet first");
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
            toast.error("Registration failed");
            setIsRegistering(false);
        }
    };

    if (!isConnected) {
        return (
            <NewLayout onNavigate={onNavigate} currentPage="registration">
                <div className="max-w-2xl mx-auto text-center py-20">
                    <h1 className="text-5xl font-bold text-coral-red mb-6">
                        Connect Your Wallet
                    </h1>
                    <p className="text-lg text-gray-600 mb-8">
                        Please connect your wallet to continue with registration
                    </p>
                </div>
            </NewLayout>
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
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center relative">
                    {/* Radial glow behind heading */}
                    <div
                        className="pointer-events-none absolute left-1/2 top-0 h-[200px] w-[200px] -translate-x-1/2 -translate-y-4 rounded-full md:h-[260px] md:w-[260px]"
                        style={{
                            background:
                                "radial-gradient(circle, rgba(255,107,107,0.14) 0%, rgba(255,107,107,0) 70%)",
                        }}
                        aria-hidden="true"
                    />

                    <h1
                        className="relative text-5xl font-bold text-coral-red mb-4"
                        style={{
                            fontFamily:
                                "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                            letterSpacing: "-0.02em",
                        }}
                    >
                        Register Your Account
                    </h1>
                    <p className="text-lg text-gray-600">
                        Generate your encryption keys and register on-chain to
                        start using encrypted transactions
                    </p>
                </div>

                {/* Step Progress */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="step-indicator justify-center"
                >
                    <div
                        className={`step ${
                            step === "generate"
                                ? "active"
                                : isDecryptionKeySet
                                ? "completed"
                                : ""
                        }`}
                    >
                        <div className="step-circle">1</div>
                        <span className="text-sm font-medium">
                            Generate Keys
                        </span>
                    </div>
                    <div className="step-connector" />
                    <div
                        className={`step ${
                            step === "register" ? "active" : ""
                        }`}
                    >
                        <div className="step-circle">2</div>
                        <span className="text-sm font-medium">Register</span>
                    </div>
                </motion.div>

                {/* Step 1: Generate Keys */}
                <AnimatePresence mode="wait">
                    {!isDecryptionKeySet && (
                        <motion.div
                            key="generate"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="frost-card p-8"
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <span className="mono-kicker text-coral-red">
                                    [ STEP 1: GENERATE ENCRYPTION KEYS ]
                                </span>
                            </div>

                            <h2 className="text-2xl font-semibold mb-4">
                                Generate Your Encryption Keys
                            </h2>

                            <p className="text-gray-600 mb-6">
                                Your encryption keys are generated locally in
                                your browser and never leave your device. These
                                keys are used to encrypt and decrypt your
                                private balances.
                            </p>

                            <StatusIndicator
                                status="info"
                                message="Your keys will be stored securely in your browser"
                                variant="card"
                                details="Make sure to backup your keys in the next step!"
                            />

                            <button
                                type="button"
                                onClick={handleGenerateKey}
                                className="btn-primary mt-6 w-full md:w-auto"
                            >
                                Generate Keys
                            </button>
                        </motion.div>
                    )}

                    {/* Step 2: Register */}
                    {isDecryptionKeySet && step === "register" && (
                        <motion.div
                            key="register"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="frost-card p-8"
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <span className="mono-kicker text-emerald-green">
                                    [ STEP 2: REGISTER ON-CHAIN ]
                                </span>
                            </div>

                            <h2 className="text-2xl font-semibold mb-4">
                                Register Your Public Key
                            </h2>

                            <p className="text-gray-600 mb-6">
                                Submit a transaction to register your public key
                                on-chain. This allows others to send you
                                encrypted tokens.
                            </p>

                            {isRegistering ? (
                                <LoadingSpinner
                                    message="Registering your account..."
                                    progress="Waiting for transaction confirmation"
                                />
                            ) : (
                                <div className="space-y-4">
                                    <div className="rounded-[8px] border border-black/10 bg-white/80 p-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600">
                                                Network
                                            </span>
                                            <span className="font-semibold">
                                                Avalanche Fuji
                                            </span>
                                        </div>
                                    </div>

                                    <div className="rounded-[8px] border border-black/10 bg-white/80 p-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600">
                                                Estimated Gas
                                            </span>
                                            <span className="font-semibold">
                                                ~$0.50
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleRegister}
                                        disabled={isRegistering}
                                        className="btn-success w-full"
                                    >
                                        Register Now
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Back button */}
                {step !== "generate" && !isRegistering && (
                    <button
                        type="button"
                        onClick={() => {
                            if (step === "register") setStep("generate");
                        }}
                        className="btn-secondary"
                    >
                        ← Back
                    </button>
                )}
            </div>
        </NewLayout>
    );
}
