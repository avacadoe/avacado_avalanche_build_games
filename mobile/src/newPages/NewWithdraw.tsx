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
    TxConfirmDialog,
    type TxDetail,
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
    const [txHash, setTxHash] = useState<`0x${string}`>("" as `0x${string}`);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState<
        "input" | "prove" | "withdraw"
    >("input");
    const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);
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

    const { data: _erc20TokenId } = useReadContract({
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

    const { data: erc20Balance, refetch: _refetchErc20Balance } =
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

    const { isRegistered, symbol, useEncryptedBalance } =
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
        encryptedBalance: _encryptedBalance,
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
            toast.error("Please create or import a wallet first");
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Please enter a valid amount");
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

            if (effectiveMode === "converter") {
                const { transactionHash } = await withdraw(parsedAmount);
                setCurrentStep("withdraw");
                setTxHash(transactionHash as `0x${string}`);
            } else {
                const { transactionHash } = await privateBurn(parsedAmount);
                setCurrentStep("withdraw");
                setTxHash(transactionHash as `0x${string}`);
            }
        } catch (error) {
            console.error(error);
            toast.error("Withdrawal failed");
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

    if (!isConnected) return null;

    return (
        <>
        <NewLayout onNavigate={onNavigate} currentPage="withdraw" isRegistered={isRegistered}>
            <div className="space-y-4 max-w-lg mx-auto md:max-w-none">

                {/* ── Page header ── */}
                <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "#F6F6F6", border: "1px solid rgba(0,0,0,0.08)" }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #FF6B6B 0%, #FF9090 100%)", boxShadow: "0 4px 14px rgba(255,107,107,0.30)" }}>
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20V4m0 0l-4 4m4-4l4 4" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-0.5">Private → Public</p>
                        <p className="text-lg font-semibold text-black leading-tight">Withdraw</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Convert encrypted tokens back to public balance</p>
                    </div>
                </div>

                {!isRegistered && (
                    <StatusIndicator
                        status="error"
                        message="Registration Required"
                        variant="card"
                        details="You need to register with the EERC system before making withdrawals."
                    />
                )}

                {/* ── Balance cards ── */}
                <div className={`grid gap-3 ${effectiveMode === "converter" ? "grid-cols-2" : "grid-cols-1"}`}>
                    <div className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-[#FF6B6B] mb-1">Encrypted</p>
                        <p className="text-xl text-black">{currentBalance}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">e{tokenSymbol}</p>
                    </div>
                    {effectiveMode === "converter" && (
                        <div className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-[#00A667] mb-1">Public</p>
                            <p className="text-xl text-black">{formattedErc20Balance}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{(erc20Symbol as string) || "ERC20"}</p>
                        </div>
                    )}
                </div>

                {/* ── Amount input ── */}
                <div className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-3">Amount</p>
                    <AmountInput
                        value={amount}
                        onChange={setAmount}
                        symbol={tokenSymbol}
                        availableBalance={currentBalance}
                        placeholder="0.00"
                        showQuickAmounts={true}
                        onMax={() => setAmount(currentBalance)}
                    />
                    {!!(decryptedBalance && amount && parseUnits(amount, Number(decimals || 18)) > decryptedBalance) && (
                        <p className="text-xs text-[#FF6B6B] mt-2">Insufficient balance — you have {currentBalance} {tokenSymbol}</p>
                    )}
                </div>

                {/* ── Progress (when processing) ── */}
                {isProcessing && (
                    <div className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-3">Progress</p>
                        <div className="flex items-center gap-3">
                            <div className={`flex flex-col items-center gap-1 ${currentStep === "prove" ? "opacity-100" : currentStep === "withdraw" ? "opacity-40" : "opacity-30"}`}>
                                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-mono ${currentStep === "prove" ? "border-[#FF6B6B] text-[#FF6B6B]" : "border-gray-200 text-gray-300"}`}>1</div>
                                <span className="text-[9px] text-gray-400 uppercase tracking-wide">Prove</span>
                            </div>
                            <div className="flex-1 h-px bg-black/10" />
                            <div className={`flex flex-col items-center gap-1 ${currentStep === "withdraw" ? "opacity-100" : "opacity-30"}`}>
                                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-mono ${currentStep === "withdraw" ? "border-[#00A667] text-[#00A667]" : "border-gray-200 text-gray-300"}`}>2</div>
                                <span className="text-[9px] text-gray-400 uppercase tracking-wide">Withdraw</span>
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
                        setWithdrawConfirmOpen(true);
                    }}
                    disabled={
                        isProcessing ||
                        !amount ||
                        parseFloat(amount) <= 0 ||
                        !isRegistered ||
                        (decryptedBalance ? parseUnits(amount || "0", Number(decimals || 18)) > decryptedBalance : false)
                    }
                    className="w-full py-4 rounded-2xl text-sm font-mono uppercase tracking-wider text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    style={{ background: "#FF6B6B", boxShadow: "0 8px 24px rgba(255,107,107,0.28)" }}
                >
                    {isProcessing ? "Processing…" : "Withdraw Tokens"}
                </button>

            </div>
        </NewLayout>
        <TxConfirmDialog
            isOpen={withdrawConfirmOpen}
            onCancel={() => setWithdrawConfirmOpen(false)}
            onConfirm={() => {
                setWithdrawConfirmOpen(false);
                handleWithdraw();
            }}
            type="withdraw"
            title={effectiveMode === "converter" ? "Withdraw Tokens" : "Private Burn"}
            details={[
                { label: "Amount", value: `${amount} ${tokenSymbol}` },
                { label: "Action", value: effectiveMode === "converter" ? "Encrypted → Public" : "Private Burn" },
                { label: "Balance", value: `${currentBalance} ${tokenSymbol}` },
                { label: "Network", value: "Avalanche Fuji" },
            ] satisfies TxDetail[]}
        />
        </>
    );
}
