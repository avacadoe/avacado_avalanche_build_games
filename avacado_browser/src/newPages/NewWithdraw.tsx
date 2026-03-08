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
    useReadContract,
} from "wagmi";
import { avalancheFuji } from "wagmi/chains";
import { parseUnits, formatUnits } from "viem";
import { toast } from "react-toastify";
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
import { DEMO_TOKEN_ABI as erc20Abi } from "../pkg/constants";
import "../newStyles.css";

interface NewWithdrawProps {
    onNavigate: (page: string) => void;
    mode: "standalone" | "converter";
}

export function NewWithdraw({ onNavigate, mode }: NewWithdrawProps) {
    const [amount, setAmount] = useState("");
    const [withdrawAddress, setWithdrawAddress] = useState("");
    const [nonce, setNonce] = useState("");
    const [txHash, setTxHash] = useState<`0x${string}`>("" as `0x${string}`);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState<
        "input" | "prove" | "withdraw"
    >("input");
    const [activeTab, setActiveTab] = useState<"withdraw" | "intent">(
        "withdraw"
    );
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

    const { data: erc20TokenId } = useReadContract({
        abi: [
            {
                inputs: [
                    { internalType: "address", name: "", type: "address" },
                ],
                name: "tokenIds",
                outputs: [
                    { internalType: "uint256", name: "", type: "uint256" },
                ],
                stateMutability: "view",
                type: "function",
            },
        ] as const,
        functionName: "tokenIds",
        args: [CONTRACTS.ERC20],
        address: effectiveMode === "converter" ? CONTRACTS.EERC_CONVERTER : CONTRACTS.EERC_STANDALONE,
        query: { enabled: effectiveMode === "converter" },
    }) as { data: bigint };

    const { data: erc20Balance, refetch: refetchErc20Balance } =
        useReadContract({
            abi: erc20Abi,
            functionName: "balanceOf",
            args: address ? [address] : undefined,
            query: {
                enabled: Boolean(address) && effectiveMode === "converter",
            },
            address: CONTRACTS.ERC20,
        }) as { data: bigint; refetch: () => void };

    const { data: erc20Decimals } = useReadContract({
        abi: erc20Abi,
        functionName: "decimals",
        args: [],
        query: { enabled: effectiveMode === "converter" },
        address: CONTRACTS.ERC20,
    }) as { data: number };

    const { data: erc20Symbol } = useReadContract({
        abi: erc20Abi,
        functionName: "symbol",
        args: [],
        query: { enabled: effectiveMode === "converter" },
        address: CONTRACTS.ERC20,
    });
    const { data: transactionReceipt, isSuccess } =
        useWaitForTransactionReceipt({
            hash: txHash,
            query: { enabled: Boolean(txHash) },
            confirmations: 1,
        });

    const { isRegistered, symbol, useEncryptedBalance, submitWithdrawIntent } =
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

    const {
        withdraw,
        privateBurn,
        decimals,
        decryptedBalance,
        encryptedBalance,
        refetchBalance,
    } = useEncryptedBalance(
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
                    <p>Withdrawal successful!</p>
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
                    toastId: "not-registered-withdraw",
                });
                onNavigate("registration");
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isRegistered, isConnected, onNavigate]);

    const handleWithdraw = async () => {
        if (!isConnected || !address) {
            toast.error("Please connect your wallet");
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        if (activeTab === "intent" && (!withdrawAddress || !nonce)) {
            toast.error(
                "Please enter destination address and nonce for intent"
            );
            return;
        }

        const parsedAmount = parseUnits(amount, Number(decimals || 18));

        if (decryptedBalance && parsedAmount > decryptedBalance) {
            toast.error("Insufficient encrypted balance");
            return;
        }

        setIsProcessing(true);

        try {
            setCurrentStep("prove");

            if (activeTab === "withdraw") {
                if (effectiveMode === "converter") {
                    const { transactionHash } = await withdraw(parsedAmount);
                    setCurrentStep("withdraw");
                    setTxHash(transactionHash as `0x${string}`);
                } else {
                    const { transactionHash } = await privateBurn(parsedAmount);
                    setCurrentStep("withdraw");
                    setTxHash(transactionHash as `0x${string}`);
                }
            } else if (activeTab === "intent") {
                const parsedNonce = BigInt(nonce);
                console.log("Submitting withdraw intent with:", {
                    amount: parsedAmount,
                    destination: withdrawAddress,
                    tokenId: effectiveMode === "converter" ? erc20TokenId || 0n : 0n,
                    nonce: parsedNonce,
                    encryptedBalance,
                    decryptedBalance,
                });
                const { transactionHash, intentHash } =
                    await submitWithdrawIntent(
                        parsedAmount,
                        withdrawAddress,
                        effectiveMode === "converter" ? erc20TokenId || 0n : 0n,
                        parsedNonce,
                        encryptedBalance,
                        decryptedBalance
                    );
                console.log("Intent submitted with hash:", intentHash);
                setCurrentStep("withdraw");
                setTxHash(transactionHash as `0x${string}`);
            }
        } catch (error) {
            console.error(error);
            toast.error(
                `${
                    activeTab === "withdraw"
                        ? "Withdrawal"
                        : "Intent submission"
                } failed`
            );
            setIsProcessing(false);
            setCurrentStep("input");
        }
    };

    const currentBalance = decryptedBalance
        ? formatUnits(decryptedBalance, Number(decimals || 18))
        : "0.00";

    const formattedErc20Balance =
        erc20Balance && erc20Decimals
            ? formatUnits(erc20Balance, erc20Decimals)
            : "0.00";

    const tokenSymbol = symbol || "eERC";

    if (!isConnected) {
        return (
            <NewLayout onNavigate={onNavigate} currentPage="withdraw">
                <div className="max-w-2xl mx-auto text-center py-20">
                    <h1 className="text-5xl font-bold text-coral-red mb-6">
                        Connect Your Wallet
                    </h1>
                    <p className="text-lg text-gray-600">
                        Please connect your wallet to make withdrawals
                    </p>
                </div>
            </NewLayout>
        );
    }

    return (
        <NewLayout onNavigate={onNavigate} currentPage="withdraw">
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
                            <span>
                                {activeTab === "withdraw"
                                    ? "Withdraw"
                                    : "Withdraw Intent"}
                            </span>
                            <span aria-hidden>•</span>
                            <span className="rounded-[2px] border border-black/10 bg-white/70 px-1.5 py-0.5">
                                {activeTab === "withdraw"
                                    ? "immediate"
                                    : "batched withdrawal"}
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
                            {activeTab === "withdraw"
                                ? "Withdraw Tokens"
                                : "Withdraw Intent"}
                        </h1>
                        <p className="text-gray-600 mt-2 text-sm">
                            {activeTab === "withdraw"
                                ? "Convert encrypted tokens back to public tokens immediately."
                                : "Create a withdrawal intent. Your profile will be locked until the batch is approved by the community."}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => onNavigate("dashboard")}
                        className="btn-secondary"
                    >
                        ← Back
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                    <button
                        type="button"
                        onClick={() => setActiveTab("withdraw")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === "withdraw"
                                ? "bg-white text-coral-red shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        Immediate Withdraw
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("intent")}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === "intent"
                                ? "bg-white text-coral-red shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        Withdraw Intent
                    </button>
                </div>

                {!isRegistered && (
                    <StatusIndicator
                        status="error"
                        message="Registration Required"
                        variant="card"
                        details="You need to register with the EERC system before making withdrawals."
                    />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
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

                        {/* Withdraw Address Input - only for intent */}
                        {activeTab === "intent" && (
                            <div className="frost-card p-6">
                                <p className="mono-kicker text-coral-red mb-4">
                                    [ WITHDRAW TO ADDRESS ]
                                </p>
                                <input
                                    type="text"
                                    value={withdrawAddress}
                                    onChange={(e) =>
                                        setWithdrawAddress(e.target.value)
                                    }
                                    placeholder="0x..."
                                    className="w-full px-4 py-3 rounded-[8px] border border-black/10 bg-white/70 font-mono text-sm focus:outline-none focus:border-coral-red/40 transition-colors"
                                />
                                <p className="text-xs text-gray-600 mt-2">
                                    Enter the destination address (unregistered
                                    addresses allowed)
                                </p>
                            </div>
                        )}

                        {/* Nonce Input - only for intent */}
                        {activeTab === "intent" && (
                            <div className="frost-card p-6">
                                <p className="mono-kicker text-coral-red mb-4">
                                    [ NONCE ]
                                </p>
                                <input
                                    type="text"
                                    value={nonce}
                                    onChange={(e) => setNonce(e.target.value)}
                                    placeholder="123"
                                    className="w-full px-4 py-3 rounded-[8px] border border-black/10 bg-white/70 font-mono text-sm focus:outline-none focus:border-coral-red/40 transition-colors"
                                />
                                <p className="text-xs text-gray-600 mt-2">
                                    Enter a unique nonce for this intent
                                </p>
                            </div>
                        )}

                        {/* Balance Preview */}
                        <div className="frost-card p-6">
                            <p className="mono-kicker text-gray-600 mb-4">
                                [ BALANCE PREVIEW ]
                            </p>
                            <div className={`grid ${effectiveMode === "converter" ? "grid-cols-2" : "grid-cols-1"} gap-4`}>
                                <div className="rounded-[8px] border border-black/10 bg-white/70 p-4">
                                    <p className="text-xs text-gray-600 mb-2">
                                        Encrypted Balance
                                    </p>
                                    <p className="text-xl font-bold text-black">
                                        {currentBalance} {tokenSymbol}
                                    </p>
                                </div>
                                {effectiveMode === "converter" && (
                                    <div className="rounded-[8px] border border-black/10 bg-white/70 p-4">
                                        <p className="text-xs text-gray-600 mb-2">
                                            Public ERC20 Balance
                                        </p>
                                        <p className="text-xl font-bold text-emerald-green">
                                            {formattedErc20Balance} {erc20Symbol as string || "ERC20"}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Insufficient Balance Warning */}
                        {decryptedBalance &&
                        amount &&
                        parseUnits(amount, Number(decimals || 18)) >
                            decryptedBalance ? (
                            <StatusIndicator
                                status="error"
                                message="Insufficient Balance"
                                variant="card"
                                details={`You only have ${currentBalance} ${tokenSymbol} available`}
                            />
                        ) : null}

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
                                                : currentStep === "withdraw"
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
                                            currentStep === "withdraw"
                                                ? "active"
                                                : ""
                                        }`}
                                    >
                                        <div className="step-circle">2</div>
                                        <span className="text-sm">
                                            Withdraw
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
                            [ INTENT SUMMARY ]
                        </p>

                        <div className="space-y-3">
                            <SummaryRow
                                label="Action"
                                value={
                                    activeTab === "withdraw"
                                        ? "Withdraw Tokens"
                                        : "Create Withdraw Intent"
                                }
                            />
                            <SummaryRow
                                label="Amount"
                                value={amount || "0.00"}
                            />
                            {activeTab === "intent" && (
                                <>
                                    <SummaryRow
                                        label="To Address"
                                        value={
                                            withdrawAddress
                                                ? `${withdrawAddress.slice(
                                                      0,
                                                      6
                                                  )}...${withdrawAddress.slice(
                                                      -4
                                                  )}`
                                                : "Not set"
                                        }
                                    />
                                    <SummaryRow
                                        label="Nonce"
                                        value={nonce || "Not set"}
                                    />
                                </>
                            )}
                            <SummaryRow
                                label="Batch System"
                                value={
                                    activeTab === "withdraw"
                                        ? "Immediate"
                                        : "50 intents per batch"
                                }
                            />
                            <SummaryRow
                                label="Status"
                                value={
                                    activeTab === "withdraw"
                                        ? "Immediate"
                                        : "Balance will lock"
                                }
                                muted
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleWithdraw}
                            disabled={
                                isProcessing ||
                                !amount ||
                                parseFloat(amount) <= 0 ||
                                !isRegistered ||
                                (activeTab === "intent" &&
                                    (!withdrawAddress || !nonce)) ||
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
                                : activeTab === "withdraw"
                                ? "Withdraw Tokens"
                                : "Make Withdraw Intent"}
                        </button>

                        {/* Timeline - only for intent */}
                        {activeTab === "intent" && (
                            <div className="frost-card p-6 mt-6">
                                <p className="mono-kicker text-coral-red mb-3">
                                    [ INTENT TIMELINE ]
                                </p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-coral-red">
                                            →
                                        </span>
                                        <span className="font-medium text-gray-900">
                                            Create intent
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-coral-red">
                                            →
                                        </span>
                                        <span className="font-semibold text-yellow-800">
                                            Balance locked
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-coral-red">
                                            →
                                        </span>
                                        <span className="font-medium text-gray-900">
                                            Batch collection
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-coral-red">
                                            →
                                        </span>
                                        <span className="font-medium text-gray-900">
                                            Community approval
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-emerald-600">
                                            ✓
                                        </span>
                                        <span className="font-medium text-emerald-700">
                                            Execution complete
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
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
