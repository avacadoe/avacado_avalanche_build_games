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
    useWriteContract,
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
import { DEMO_TOKEN_ABI as erc20Abi, MAX_UINT256 } from "../pkg/constants";
import "../newStyles.css";

interface NewDepositProps {
    onNavigate: (page: string) => void;
    mode: "standalone" | "converter";
}

export function NewDeposit({ onNavigate, mode }: NewDepositProps) {
    const [amount, setAmount] = useState("");
    const [txHash, setTxHash] = useState<`0x${string}`>("" as `0x${string}`);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState<
        "input" | "approve" | "prove" | "deposit"
    >("input");
    const hasRedirectedRef = useRef(false);

    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient({ chainId: avalancheFuji.id });
    const { data: walletClient } = useWalletClient();
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

    // Determine effective mode from URL param (keeps parity with classic UI)
    const urlParams = new URLSearchParams(window.location.search);
    const effectiveMode =
        urlParams.get("mode") === "converter" ? "converter" : mode;
    const isConverter = effectiveMode === "converter";

    const { isRegistered, symbol, useEncryptedBalance } = useEERC(
        publicClient as CompatiblePublicClient,
        walletClient as CompatibleWalletClient,
        isConverter ? CONTRACTS.EERC_CONVERTER : CONTRACTS.EERC_STANDALONE,
        URLS,
        CIRCUIT_CONFIG,
        storedDecryptionKey
    );

    const { deposit, privateMint, decimals, decryptedBalance, refetchBalance } =
        useEncryptedBalance(isConverter ? CONTRACTS.ERC20 : undefined);

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

    // ERC20 balance for converter mode
    const { data: erc20Balance, refetch: refetchErc20Balance } =
        useReadContract({
            address: CONTRACTS.ERC20 as `0x${string}`,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: address ? [address] : undefined,
            query: { enabled: Boolean(address) && isConverter },
        });

    const { data: approveAmount, refetch: refetchApproveAmount } =
        useReadContract({
            address: CONTRACTS.ERC20 as `0x${string}`,
            abi: erc20Abi,
            functionName: "allowance",
            args: address ? [address, CONTRACTS.EERC_CONVERTER] : undefined,
            query: { enabled: Boolean(address) && isConverter },
        }) as { data: bigint; refetch: () => void };

    const { writeContractAsync } = useWriteContract({});

    const { data: erc20Decimals } = useReadContract({
        address: CONTRACTS.ERC20 as `0x${string}`,
        abi: erc20Abi,
        functionName: "decimals",
        query: { enabled: isConverter },
    }) as { data: number | undefined };

    const { data: erc20Symbol } = useReadContract({
        address: CONTRACTS.ERC20 as `0x${string}`,
        abi: erc20Abi,
        functionName: "symbol",
        query: { enabled: isConverter },
    });

    useEffect(() => {
        if (txHash && isSuccess && transactionReceipt) {
            toast.success(
                <div>
                    <p>Deposit successful!</p>
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
            if (isConverter && typeof refetchErc20Balance === "function")
                refetchErc20Balance();
        }
    }, [
        txHash,
        isSuccess,
        transactionReceipt,
        mode,
        refetchBalance,
        refetchErc20Balance,
    ]);

    // Redirect to registration if not registered (only once)
    useEffect(() => {
        if (!isRegistered && isConnected && !hasRedirectedRef.current) {
            hasRedirectedRef.current = true;
            const timer = setTimeout(() => {
                toast.info("Please complete registration first", {
                    autoClose: 2000,
                    toastId: "not-registered-deposit",
                });
                onNavigate("registration");
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isRegistered, isConnected, onNavigate]);

    const handleDeposit = async () => {
        if (!isConnected || !address) {
            toast.error("Please connect your wallet");
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        setIsProcessing(true);

        try {
            if (isConverter) {
                // Converter mode: deposit ERC20
                setCurrentStep("approve");

                if (!erc20Decimals) {
                    throw new Error("No decimals");
                }

                const parsedAmount = parseUnits(amount, erc20Decimals);
                // ensure sufficient allowance; if not, request approve transaction first
                const currentApprove = approveAmount ?? 0n;
                if (currentApprove < parsedAmount) {
                    try {
                        // Request approve for the entered amount (avoid MAX for demo)
                        await writeContractAsync({
                            abi: erc20Abi,
                            functionName: "approve",
                            args: [
                                CONTRACTS.EERC_CONVERTER,
                                parsedAmount,
                            ],
                            address: CONTRACTS.ERC20,
                            account: address as `0x${string}`,
                        });
                        if (typeof refetchApproveAmount === "function")
                            await refetchApproveAmount();
                    } catch (err) {
                        console.error(err);
                        toast.error("Approval failed");
                        setIsProcessing(false);
                        setCurrentStep("input");
                        return;
                    }
                }

                setCurrentStep("prove");
                const { transactionHash } = await deposit(parsedAmount);

                setCurrentStep("deposit");
                setTxHash(transactionHash as `0x${string}`);
            } else {
                // Standalone mode: private mint
                setCurrentStep("prove");

                const parsedAmount = parseUnits(amount, Number(decimals || 18));

                const { transactionHash } = await privateMint(
                    address,
                    parsedAmount
                );

                setCurrentStep("deposit");
                setTxHash(transactionHash as `0x${string}`);
            }
        } catch (error) {
            console.error(error);
            toast.error("Deposit failed");
            setIsProcessing(false);
            setCurrentStep("input");
        }
    };

    const availableBalance =
        isConverter && erc20Balance && erc20Decimals
            ? formatUnits(erc20Balance as bigint, erc20Decimals)
            : "0.00";

    const tokenSymbol = isConverter
        ? (erc20Symbol as string) || "ERC20"
        : symbol || "eERC";
    const currentBalance = decryptedBalance
        ? formatUnits(decryptedBalance, Number(decimals || 18))
        : "0.00";

    if (!isConnected) {
        return (
            <NewLayout onNavigate={onNavigate} currentPage="deposit">
                <div className="max-w-2xl mx-auto text-center py-20">
                    <h1 className="text-5xl font-bold text-coral-red mb-6">
                        Connect Your Wallet
                    </h1>
                    <p className="text-lg text-gray-600">
                        Please connect your wallet to make deposits
                    </p>
                </div>
            </NewLayout>
        );
    }

    return (
        <NewLayout onNavigate={onNavigate} currentPage="deposit">
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
                            <span>Deposit</span>
                            <span aria-hidden>•</span>
                            <span className="rounded-[2px] border border-black/10 bg-white/70 px-1.5 py-0.5">
                                public → private
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
                            Deposit Tokens
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
                        details="You need to register with the EERC system before making deposits."
                    />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
                    {/* Left Column - Input */}
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
                                // For converter mode show public ERC20 available balance
                                // For standalone mode show private decrypted balance as available (useful for burn flows)
                                availableBalance={
                                    isConverter
                                        ? availableBalance
                                        : decryptedBalance
                                        ? formatUnits(
                                              decryptedBalance,
                                              Number(decimals || 18)
                                          )
                                        : undefined
                                }
                                placeholder="0.00"
                                showQuickAmounts={isConverter}
                                onMax={
                                    isConverter
                                        ? () => setAmount(availableBalance)
                                        : undefined
                                }
                            />
                        </div>

                        {/* Current Balance */}
                        <div className="frost-card p-6">
                            <p className="mono-kicker text-gray-600 mb-4">
                                [ CURRENT BALANCES ]
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-[8px] border border-black/10 bg-white/70 p-4">
                                    <p className="text-xs text-gray-600 mb-2">
                                        Public{" "}
                                        {isConverter
                                            ? (erc20Symbol as string) ||
                                              tokenSymbol
                                            : (erc20Symbol as string) ||
                                              "ERC20"}
                                    </p>
                                    <p className="text-xl font-bold text-black">
                                        {availableBalance}
                                    </p>
                                </div>

                                <div className="rounded-[8px] border border-black/10 bg-white/70 p-4">
                                    <p className="text-xs text-gray-600 mb-2">
                                        Private e{tokenSymbol}
                                    </p>
                                    <p className="text-xl font-bold text-black">
                                        {currentBalance}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Step Indicator */}
                        {isProcessing && (
                            <div className="frost-card p-6">
                                <p className="mono-kicker text-emerald-green mb-6">
                                    [ TRANSACTION PROGRESS ]
                                </p>
                                <div className="step-indicator">
                                    {isConverter && (
                                        <>
                                            <div
                                                className={`step ${
                                                    currentStep === "approve"
                                                        ? "active"
                                                        : currentStep !==
                                                          "input"
                                                        ? "completed"
                                                        : ""
                                                }`}
                                            >
                                                <div className="step-circle">
                                                    1
                                                </div>
                                                <span className="text-sm">
                                                    Approve
                                                </span>
                                            </div>
                                            <div className="step-connector" />
                                        </>
                                    )}
                                    <div
                                        className={`step ${
                                            currentStep === "prove"
                                                ? "active"
                                                : currentStep === "deposit"
                                                ? "completed"
                                                : ""
                                        }`}
                                    >
                                        <div className="step-circle">
                                            {isConverter ? "2" : "1"}
                                        </div>
                                        <span className="text-sm">
                                            Generate Proof
                                        </span>
                                    </div>
                                    <div className="step-connector" />
                                    <div
                                        className={`step ${
                                            currentStep === "deposit"
                                                ? "active"
                                                : ""
                                        }`}
                                    >
                                        <div className="step-circle">
                                            {isConverter ? "3" : "2"}
                                        </div>
                                        <span className="text-sm">Deposit</span>
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
                            [ TRANSACTION SUMMARY ]
                        </p>

                        <div className="space-y-3">
                            <SummaryRow
                                label="Action"
                                value={`Deposit ${tokenSymbol} → Receive e${tokenSymbol}`}
                            />
                            <SummaryRow
                                label="Amount"
                                value={amount || "0.00"}
                            />
                            <SummaryRow
                                label="Network"
                                value="Avalanche Fuji"
                            />
                            <SummaryRow label="Est. Gas" value="~$0.50" muted />

                            {isConverter && (
                                <div className="rounded-[8px] border border-black/10 bg-white/70 p-3 text-xs text-gray-600">
                                    Step 1: Approve {tokenSymbol} • Step 2:
                                    Generate ZK Proof • Step 3: Deposit
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleDeposit}
                            disabled={
                                isProcessing ||
                                !amount ||
                                parseFloat(amount) <= 0 ||
                                !isRegistered
                            }
                            className="btn-success w-full mt-6"
                        >
                            {isProcessing ? "Processing..." : "Confirm Deposit"}
                        </button>

                        {isConverter && (
                            <div className="mt-3 text-center text-xs">
                                <div className="mb-2">
                                    Allowance:{" "}
                                    {approveAmount === undefined
                                        ? "-"
                                        : approveAmount === MAX_UINT256
                                        ? "MAX"
                                        : String(approveAmount ?? 0n)}
                                </div>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!address) return;
                                        if (!amount || !erc20Decimals) {
                                            toast.error(
                                                "Enter an amount to approve"
                                            );
                                            return;
                                        }
                                        try {
                                            const parsedApprove = parseUnits(
                                                amount,
                                                erc20Decimals
                                            );
                                            await writeContractAsync({
                                                abi: erc20Abi,
                                                functionName: "approve",
                                                args: [
                                                    CONTRACTS.EERC_CONVERTER,
                                                    parsedApprove,
                                                ],
                                                address: CONTRACTS.ERC20,
                                                account:
                                                    address as `0x${string}`,
                                            });
                                            if (
                                                typeof refetchApproveAmount ===
                                                "function"
                                            )
                                                await refetchApproveAmount();
                                            toast.success(
                                                `Approved ${amount} ${tokenSymbol}`
                                            );
                                        } catch (err) {
                                            console.error(err);
                                            toast.error("Approve failed");
                                        }
                                    }}
                                    className="btn-secondary w-full text-sm"
                                >
                                    Approve Amount
                                </button>
                            </div>
                        )}

                        {parseFloat(amount) > parseFloat(availableBalance) &&
                            isConverter && (
                                <p className="text-xs text-coral-red mt-3 text-center">
                                    Insufficient balance
                                </p>
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
