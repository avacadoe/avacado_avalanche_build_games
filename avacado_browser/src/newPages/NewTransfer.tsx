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
import { parseUnits, formatUnits, isAddress } from "viem";
import { toast } from "react-toastify";
import { AiOutlineCheckCircle, AiOutlineCloseCircle } from "react-icons/ai";
import {
    NewLayout,
    AmountInput,
    LoadingSpinner,
    StatusIndicator,
} from "../newComponents";
import {
    CIRCUIT_CONFIG,
    CONTRACTS,
    URLS,
    EXPLORER_BASE_URL_TX,
} from "../config/contracts";
import "../newStyles.css";

interface NewTransferProps {
    onNavigate: (page: string) => void;
    mode: "standalone" | "converter";
}

export function NewTransfer({ onNavigate, mode }: NewTransferProps) {
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [txHash, setTxHash] = useState<`0x${string}`>("" as `0x${string}`);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRecipientRegistered, setIsRecipientRegistered] = useState<
        boolean | null
    >(null);
    const [isValidating, setIsValidating] = useState(false);
    const [currentStep, setCurrentStep] = useState<
        "input" | "prove" | "transfer"
    >("input");
    const hasRedirectedRef = useRef(false);

    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient({ chainId: avalancheFuji.id });
    const { data: walletClient } = useWalletClient();

    // Determine effective mode from URL param (keeps parity with classic UI)
    const urlParams = new URLSearchParams(window.location.search);
    const effectiveMode =
        urlParams.get("mode") === "converter" ? "converter" : mode;

    // persist decryption key per-address (read-only here, generated from Dashboard)
    const [storedDecryptionKey, setStoredDecryptionKey] = useState<
        string | undefined
    >(undefined);

    useEffect(() => {
        if (!address) {
            setStoredDecryptionKey(undefined);
            return;
        }

        try {
            const k =
                localStorage.getItem(`decryptionKey_${address}`) || undefined;
            setStoredDecryptionKey(k);
        } catch (err) {
            console.error(
                "Failed to read decryption key from localStorage:",
                err
            );
            setStoredDecryptionKey(undefined);
        }
    }, [address]);

    const { data: transactionReceipt, isSuccess } =
        useWaitForTransactionReceipt({
            hash: txHash,
            query: { enabled: Boolean(txHash) },
            confirmations: 1,
        });

    const { isRegistered, symbol, isAddressRegistered, useEncryptedBalance } =
        useEERC(
            publicClient as CompatiblePublicClient,
            walletClient as CompatibleWalletClient,
            effectiveMode === "converter"
                ? CONTRACTS.EERC_CONVERTER
                : CONTRACTS.EERC_STANDALONE,
            URLS,
            CIRCUIT_CONFIG,
            storedDecryptionKey
        );

    const { privateTransfer, decimals, decryptedBalance, refetchBalance } =
        useEncryptedBalance(
            effectiveMode === "converter" ? CONTRACTS.ERC20 : undefined
        );

    // If a stored decryption key becomes available, trigger a refetch so decryptedBalance updates
    useEffect(() => {
        if (storedDecryptionKey && typeof refetchBalance === "function") {
            try {
                refetchBalance();
            } catch (err) {
                // non-fatal
                console.warn(
                    "refetchBalance failed after decryption key set",
                    err
                );
            }
        }
    }, [storedDecryptionKey, refetchBalance]);

    useEffect(() => {
        if (txHash && isSuccess && transactionReceipt) {
            toast.success(
                <div>
                    <p>Transfer successful!</p>
                    <a
                        href={`${EXPLORER_BASE_URL_TX}${transactionReceipt?.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-green underline"
                    >
                        View on Explorer →
                    </a>
                </div>
            );
            setTxHash("" as `0x${string}`);
            setIsProcessing(false);
            setCurrentStep("input");
            setRecipient("");
            setAmount("");
            refetchBalance();
        }
    }, [txHash, isSuccess, transactionReceipt, refetchBalance]);

    // Redirect to registration if not registered (only once)
    useEffect(() => {
        if (!isRegistered && isConnected && !hasRedirectedRef.current) {
            hasRedirectedRef.current = true;
            const timer = setTimeout(() => {
                toast.info("Please complete registration first", {
                    autoClose: 2000,
                    toastId: "not-registered-transfer",
                });
                onNavigate("registration");
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isRegistered, isConnected, onNavigate]);

    // Validate recipient address
    useEffect(() => {
        const validateRecipient = async () => {
            if (!recipient || !isAddress(recipient)) {
                setIsRecipientRegistered(null);
                return;
            }

            setIsValidating(true);
            try {
                const { isRegistered: registered } = await isAddressRegistered(
                    recipient as `0x${string}`
                );
                setIsRecipientRegistered(registered);
            } catch (error) {
                console.error(error);
                setIsRecipientRegistered(null);
            }
            setIsValidating(false);
        };

        const timeoutId = setTimeout(validateRecipient, 500);
        return () => clearTimeout(timeoutId);
    }, [recipient, isAddressRegistered]);

    const handleTransfer = async () => {
        if (!isConnected || !address) {
            toast.error("Please connect your wallet");
            return;
        }

        if (!recipient || !isAddress(recipient)) {
            toast.error("Please enter a valid recipient address");
            return;
        }

        if (!isRecipientRegistered) {
            toast.error("Recipient is not registered");
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        const parsedAmount = parseUnits(amount, Number(decimals || 18));

        if (decryptedBalance && parsedAmount > decryptedBalance) {
            toast.error("Insufficient balance");
            return;
        }

        setIsProcessing(true);

        try {
            setCurrentStep("prove");

            const { transactionHash } = await privateTransfer(
                recipient,
                parsedAmount
            );

            setCurrentStep("transfer");
            setTxHash(transactionHash as `0x${string}`);
        } catch (error) {
            console.error(error);
            toast.error("Transfer failed");
            setIsProcessing(false);
            setCurrentStep("input");
        }
    };

    const currentBalance = decryptedBalance
        ? formatUnits(decryptedBalance, Number(decimals || 18))
        : "0.00";

    const tokenSymbol = symbol || "eERC";

    if (!isConnected) {
        return (
            <NewLayout onNavigate={onNavigate} currentPage="transfer">
                <div className="max-w-2xl mx-auto text-center py-20">
                    <h1 className="text-5xl font-bold text-coral-red mb-6">
                        Connect Your Wallet
                    </h1>
                    <p className="text-lg text-gray-600">
                        Please connect your wallet to make transfers
                    </p>
                </div>
            </NewLayout>
        );
    }

    return (
        <NewLayout onNavigate={onNavigate} currentPage="transfer">
            {/* Light red tint background */}
            <div className="absolute inset-0 bg-coral-red/[0.02] -mx-8 -my-8 pointer-events-none" />

            <div className="max-w-6xl mx-auto space-y-6 relative">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between relative">
                    {/* Radial glow behind heading */}
                    <div
                        className="pointer-events-none absolute left-0 top-0 h-[160px] w-[160px] -translate-y-6 rounded-full md:h-[200px] md:w-[200px]"
                        style={{
                            background:
                                "radial-gradient(circle, rgba(255,107,107,0.12) 0%, rgba(255,107,107,0) 70%)",
                        }}
                        aria-hidden="true"
                    />

                    <div className="relative">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gray-500 mb-2">
                            <span>Transfer</span>
                            <span aria-hidden>•</span>
                            <span className="rounded-[2px] border border-black/10 bg-white/70 px-1.5 py-0.5">
                                private → private
                            </span>
                        </div>
                        <h1
                            className="text-5xl font-bold text-coral-red"
                            style={{
                                fontFamily:
                                    "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Transfer Tokens
                        </h1>
                    </div>
                    <button
                        type="button"
                        onClick={() => onNavigate("dashboard")}
                        className="btn-secondary"
                    >
                        ← Back
                    </button>
                </div>

                {!isRegistered && (
                    <StatusIndicator
                        status="error"
                        message="Registration Required"
                        variant="card"
                        details="You need to register with the EERC system before making transfers."
                    />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                        {/* Recipient Input */}
                        <div className="frost-card p-6">
                            <p className="mono-kicker text-coral-red mb-4">
                                [ RECIPIENT ]
                            </p>
                            <div className="rounded-[8px] border border-black/10 bg-white/80 p-4">
                                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#313131] mb-2">
                                    Recipient Address
                                </label>
                                <input
                                    type="text"
                                    value={recipient}
                                    onChange={(e) =>
                                        setRecipient(e.target.value)
                                    }
                                    placeholder="0x..."
                                    className="input-field"
                                />
                                {recipient && isAddress(recipient) && (
                                    <div className="mt-3 flex items-center gap-2">
                                        {isValidating ? (
                                            <span className="text-xs text-gray-500">
                                                Validating...
                                            </span>
                                        ) : isRecipientRegistered === true ? (
                                            <>
                                                <AiOutlineCheckCircle className="h-4 w-4 text-emerald-green" />
                                                <span className="text-xs text-emerald-green font-medium">
                                                    Recipient is registered
                                                </span>
                                            </>
                                        ) : isRecipientRegistered === false ? (
                                            <>
                                                <AiOutlineCloseCircle className="h-4 w-4 text-coral-red" />
                                                <span className="text-xs text-coral-red font-medium">
                                                    Recipient not registered
                                                </span>
                                            </>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Amount Input */}
                        <div className="frost-card p-6">
                            <p className="mono-kicker text-coral-red mb-4">
                                [ AMOUNT ]
                            </p>
                            <AmountInput
                                value={amount}
                                onChange={setAmount}
                                symbol={tokenSymbol}
                                availableBalance={currentBalance}
                                placeholder="0.00"
                                showQuickAmounts={true}
                                onMax={() => setAmount(currentBalance)}
                            />
                        </div>

                        {/* Step Indicator */}
                        {isProcessing && (
                            <div className="frost-card p-6">
                                <p className="mono-kicker text-emerald-green mb-6">
                                    [ TRANSACTION PROGRESS ]
                                </p>
                                <div className="step-indicator">
                                    <div
                                        className={`step ${
                                            currentStep === "prove"
                                                ? "active"
                                                : currentStep === "transfer"
                                                ? "completed"
                                                : ""
                                        }`}
                                    >
                                        <div className="step-circle">1</div>
                                        <span className="text-sm">
                                            Generate Proof
                                        </span>
                                    </div>
                                    <div className="step-connector" />
                                    <div
                                        className={`step ${
                                            currentStep === "transfer"
                                                ? "active"
                                                : ""
                                        }`}
                                    >
                                        <div className="step-circle">2</div>
                                        <span className="text-sm">
                                            Transfer
                                        </span>
                                    </div>
                                </div>

                                {currentStep === "prove" && (
                                    <div className="mt-6">
                                        <LoadingSpinner
                                            message="Generating zero-knowledge proof..."
                                            progress="This may take 10-30 seconds"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column - Summary */}
                    <aside className="frost-card p-6 h-max">
                        <p className="mono-kicker text-coral-red mb-4">
                            [ TRANSFER SUMMARY ]
                        </p>

                        <div className="space-y-3">
                            <SummaryRow
                                label="From"
                                value={
                                    address
                                        ? `${address.slice(
                                              0,
                                              8
                                          )}...${address.slice(-6)}`
                                        : ""
                                }
                                muted
                            />
                            <SummaryRow
                                label="To"
                                value={
                                    recipient
                                        ? `${recipient.slice(
                                              0,
                                              8
                                          )}...${recipient.slice(-6)}`
                                        : "Not set"
                                }
                                muted
                            />
                            <SummaryRow
                                label="Amount"
                                value={amount || "0.00"}
                            />
                            <SummaryRow
                                label="Your Balance"
                                value={currentBalance}
                            />
                            <SummaryRow label="Est. Gas" value="~$0.50" muted />
                        </div>

                        <button
                            type="button"
                            onClick={handleTransfer}
                            disabled={
                                isProcessing ||
                                !amount ||
                                parseFloat(amount) <= 0 ||
                                !isRegistered ||
                                !recipient ||
                                !isAddress(recipient) ||
                                !isRecipientRegistered ||
                                (decryptedBalance
                                    ? parseUnits(
                                          amount || "0",
                                          Number(decimals || 18)
                                      ) > decryptedBalance
                                    : false)
                            }
                            className="btn-success w-full mt-6"
                        >
                            {isProcessing
                                ? "Processing..."
                                : "Confirm Transfer"}
                        </button>
                    </aside>
                </div>
            </div>
        </NewLayout>
    );
}

function SummaryRow({
    label,
    value,
    muted = false,
}: {
    label: string;
    value: string;
    muted?: boolean;
}) {
    return (
        <div className="flex items-center justify-between rounded-[8px] border border-black/10 bg-white/80 px-3 py-2">
            <span className="text-xs text-gray-600">{label}</span>
            <span
                className={
                    muted
                        ? "text-xs text-gray-600"
                        : "text-sm font-semibold text-black"
                }
            >
                {value}
            </span>
        </div>
    );
}
