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
import { AiOutlineArrowDown } from "react-icons/ai";
import {
    NewLayout,
    AmountInput,
    LoadingSpinner,
    StatusIndicator,
    TxConfirmDialog,
    type TxDetail,
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
    const approvalOptions = ["25", "50", "75", "MAX"] as const;
    const [amount, setAmount] = useState("");
    const [selectedApprovalOption, setSelectedApprovalOption] =
        useState<(typeof approvalOptions)[number]>("MAX");
    const [txHash, setTxHash] = useState<`0x${string}`>("" as `0x${string}`);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState<
        "input" | "approve" | "prove" | "deposit"
    >("input");
    const [depositConfirmOpen, setDepositConfirmOpen] = useState(false);
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
            toast.error("Please create or import a wallet first");
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
                        // Request approve MAX
                        await writeContractAsync({
                            abi: erc20Abi,
                            functionName: "approve",
                            args: [CONTRACTS.EERC_CONVERTER, MAX_UINT256],
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

    if (!isConnected) return null;

    return (
        <>
        <NewLayout onNavigate={onNavigate} currentPage="deposit" isRegistered={isRegistered}>
            <div className="space-y-4 max-w-lg mx-auto md:max-w-none">

                {/* ── Page header ── */}
                <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "#F6F6F6", border: "1px solid rgba(0,0,0,0.08)" }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #00A667 0%, #00C47C 100%)", boxShadow: "0 4px 14px rgba(0,166,103,0.30)" }}>
                        <AiOutlineArrowDown className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-0.5">Public → Private</p>
                        <p className="text-lg font-semibold text-black leading-tight">Deposit</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Convert public tokens into encrypted balance</p>
                    </div>
                </div>

                {!isRegistered && (
                    <StatusIndicator
                        status="error"
                        message="Registration Required"
                        variant="card"
                        details="You need to register with the EERC system before making deposits."
                    />
                )}

                {/* ── Balance info ── */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-1">
                            Public {isConverter ? (erc20Symbol as string) || tokenSymbol : "Balance"}
                        </p>
                        <p className="text-xl text-black">{availableBalance}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{tokenSymbol}</p>
                    </div>
                    <div className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-[#00A667] mb-1">Encrypted</p>
                        <p className="text-xl text-black">{currentBalance}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">e{tokenSymbol}</p>
                    </div>
                </div>

                {/* ── Amount input ── */}
                <div className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-3">Amount</p>
                    <AmountInput
                        value={amount}
                        onChange={setAmount}
                        symbol={tokenSymbol}
                        availableBalance={
                            isConverter
                                ? availableBalance
                                : decryptedBalance
                                ? formatUnits(decryptedBalance, Number(decimals || 18))
                                : undefined
                        }
                        placeholder="0.00"
                        showQuickAmounts={isConverter}
                        onMax={isConverter ? () => setAmount(availableBalance) : undefined}
                    />
                    {parseFloat(amount) > parseFloat(availableBalance) && isConverter && (
                        <p className="text-xs text-[#FF6B6B] mt-2">Insufficient balance</p>
                    )}
                </div>

                {/* ── Converter: Allowance ── */}
                {isConverter && (
                    <div className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Allowance</p>
                            <p className="text-xs font-mono text-gray-600">
                                {approveAmount === undefined ? "—" : approveAmount === MAX_UINT256 ? "MAX" : String(approveAmount ?? 0n)}
                            </p>
                        </div>
                        <div className="mb-3 rounded-2xl border border-black/8 bg-[#F6F6F6] p-1">
                            <div className="grid grid-cols-4 gap-1">
                                {approvalOptions.map((option) => {
                                    const isSelected =
                                        selectedApprovalOption === option;
                                    const optionLabel =
                                        option === "MAX" ? option : `${option}%`;

                                    return (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() =>
                                                setSelectedApprovalOption(
                                                    option
                                                )
                                            }
                                            className={`rounded-xl px-3 py-2 text-[11px] font-mono uppercase tracking-[0.2em] transition-all ${
                                                isSelected
                                                    ? "bg-[#FF6B6B] text-white shadow-[0_8px_20px_rgba(255,107,107,0.22)]"
                                                    : "text-gray-500 hover:bg-white hover:text-[#FF6B6B]"
                                            }`}
                                        >
                                            {optionLabel}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={async () => {
                                if (!address) return;
                                try {
                                    await writeContractAsync({
                                        abi: erc20Abi,
                                        functionName: "approve",
                                        args: [CONTRACTS.EERC_CONVERTER, MAX_UINT256],
                                        address: CONTRACTS.ERC20,
                                        account: address as `0x${string}`,
                                    });
                                    if (typeof refetchApproveAmount === "function") await refetchApproveAmount();
                                    toast.success(
                                        `Approved ${selectedApprovalOption}${selectedApprovalOption === "MAX" ? "" : "%"}`
                                    );
                                } catch (err) {
                                    console.error(err);
                                    toast.error("Approve failed");
                                }
                            }}
                            className="w-full py-2.5 rounded-xl border border-black/10 text-[11px] font-mono uppercase tracking-wider text-gray-600 hover:text-[#FF6B6B] hover:border-[#FF6B6B]/30 transition-colors"
                        >
                            Approve
                        </button>
                    </div>
                )}

                {/* ── Progress (when processing) ── */}
                {isProcessing && (
                    <div className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-3">Progress</p>
                        <div className="flex items-center gap-3">
                            {isConverter && (
                                <>
                                    <div className={`flex flex-col items-center gap-1 ${currentStep === "approve" ? "opacity-100" : currentStep !== "input" ? "opacity-40" : "opacity-30"}`}>
                                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-mono ${currentStep === "approve" ? "border-[#FF6B6B] text-[#FF6B6B]" : "border-gray-200 text-gray-300"}`}>1</div>
                                        <span className="text-[9px] text-gray-400 uppercase tracking-wide">Approve</span>
                                    </div>
                                    <div className="flex-1 h-px bg-black/10" />
                                </>
                            )}
                            <div className={`flex flex-col items-center gap-1 ${currentStep === "prove" ? "opacity-100" : currentStep === "deposit" ? "opacity-40" : "opacity-30"}`}>
                                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-mono ${currentStep === "prove" ? "border-[#FF6B6B] text-[#FF6B6B]" : "border-gray-200 text-gray-300"}`}>{isConverter ? "2" : "1"}</div>
                                <span className="text-[9px] text-gray-400 uppercase tracking-wide">Prove</span>
                            </div>
                            <div className="flex-1 h-px bg-black/10" />
                            <div className={`flex flex-col items-center gap-1 ${currentStep === "deposit" ? "opacity-100" : "opacity-30"}`}>
                                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-mono ${currentStep === "deposit" ? "border-[#00A667] text-[#00A667]" : "border-gray-200 text-gray-300"}`}>{isConverter ? "3" : "2"}</div>
                                <span className="text-[9px] text-gray-400 uppercase tracking-wide">Deposit</span>
                            </div>
                        </div>
                        {currentStep === "prove" && (
                            <div className="mt-4">
                                <LoadingSpinner message="Generating zero-knowledge proof…" progress="This may take 10–30 seconds" />
                            </div>
                        )}
                    </div>
                )}

                {/* ── Submit ── */}
                <button
                    type="button"
                    onClick={() => {
                        if (!amount || parseFloat(amount) <= 0) {
                            toast.error("Please enter a valid amount");
                            return;
                        }
                        setDepositConfirmOpen(true);
                    }}
                    disabled={isProcessing || !amount || parseFloat(amount) <= 0 || !isRegistered}
                    className="w-full py-4 rounded-2xl text-sm font-mono uppercase tracking-wider text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    style={{ background: "#00A667", boxShadow: "0 8px 24px rgba(0,166,103,0.28)" }}
                >
                    {isProcessing ? "Processing…" : "Deposit Tokens"}
                </button>

            </div>
        </NewLayout>
        <TxConfirmDialog
            isOpen={depositConfirmOpen}
            onCancel={() => setDepositConfirmOpen(false)}
            onConfirm={() => {
                setDepositConfirmOpen(false);
                handleDeposit();
            }}
            type="deposit"
            title={isConverter ? "Deposit Tokens" : "Private Mint"}
            details={[
                { label: "Amount", value: `${amount} ${tokenSymbol}` },
                { label: "Action", value: isConverter ? "Public → Encrypted" : "Private Mint" },
                { label: "Network", value: "Avalanche Fuji" },
            ] satisfies TxDetail[]}
        />
        </>
    );
}
