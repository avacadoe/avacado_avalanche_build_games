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
    TxConfirmDialog,
    type TxDetail,
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
    const [transferConfirmOpen, setTransferConfirmOpen] = useState(false);
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
            toast.error("Please create or import a wallet first");
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

    if (!isConnected) return null;

    return (
        <>
        <NewLayout onNavigate={onNavigate} currentPage="transfer" isRegistered={isRegistered}>
            <div className="space-y-3 sm:space-y-4 max-w-lg mx-auto md:max-w-none">

                {/* ── Page header ── */}
                <div className="rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4" style={{ background: "#F6F6F6", border: "1px solid rgba(0,0,0,0.08)" }}>
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)", boxShadow: "0 4px 14px rgba(245,158,11,0.30)" }}>
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-0.5">Private → Private</p>
                        <p className="text-base sm:text-lg font-semibold text-black leading-tight">Transfer</p>
                    </div>
                </div>

                {!isRegistered && (
                    <StatusIndicator
                        status="error"
                        message="Registration Required"
                        variant="card"
                        details="You need to register with the EERC system before making transfers."
                    />
                )}

                {/* ── Recipient card ── */}
                <div className="bg-white border border-black/8 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-3">Recipient</p>

                        {/* From → To preview row */}
                        <div className="flex items-center gap-2 mb-3">
                            <div className="flex-1 min-w-0 rounded-xl bg-[#F6F6F6] px-3 py-2">
                                <p className="text-[9px] font-mono text-gray-400 uppercase tracking-wider mb-0.5">From</p>
                                <p className="text-[11px] font-mono text-black truncate">{address ? `${address.slice(0,6)}…${address.slice(-4)}` : "—"}</p>
                            </div>
                            <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                            <div className="flex-1 min-w-0 rounded-xl bg-[#F6F6F6] px-3 py-2">
                                <p className="text-[9px] font-mono text-gray-400 uppercase tracking-wider mb-0.5">To</p>
                                <p
                                    className="text-[11px] font-mono truncate"
                                    style={{ color: isRecipientRegistered === true ? "#00A667" : isRecipientRegistered === false ? "#FF6B6B" : "#000" }}
                                >
                                    {recipient && isAddress(recipient) ? `${recipient.slice(0,6)}…${recipient.slice(-4)}` : "—"}
                                </p>
                            </div>
                        </div>

                        {/* Address input with live-state border */}
                        <input
                            type="text"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="0x..."
                            className="w-full rounded-xl px-3 py-3 text-sm font-mono text-black placeholder:text-gray-300 focus:outline-none transition-all"
                            style={{
                                border: `1px solid ${
                                    recipient && !isAddress(recipient) ? "rgba(255,107,107,0.55)"
                                    : isRecipientRegistered === true ? "rgba(0,166,103,0.45)"
                                    : "rgba(0,0,0,0.10)"
                                }`,
                                background:
                                    recipient && !isAddress(recipient) ? "rgba(255,107,107,0.04)"
                                    : isRecipientRegistered === true ? "rgba(0,166,103,0.04)"
                                    : "#FAFAFA",
                            }}
                        />

                        {/* Validation feedback */}
                        {recipient && !isAddress(recipient) && (
                            <div className="mt-2 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 text-[#FF6B6B] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                                <span className="text-[11px] text-[#FF6B6B]">Invalid Ethereum address</span>
                            </div>
                        )}
                        {recipient && isAddress(recipient) && (
                            <div className="mt-2 flex items-center gap-1.5">
                                {isValidating ? (
                                    <span className="text-[11px] text-gray-400">Checking registration…</span>
                                ) : isRecipientRegistered === true ? (
                                    <>
                                        <AiOutlineCheckCircle className="h-3.5 w-3.5 text-[#00A667] flex-shrink-0" />
                                        <span className="text-[11px] text-[#00A667]">Recipient is registered</span>
                                    </>
                                ) : isRecipientRegistered === false ? (
                                    <>
                                        <AiOutlineCloseCircle className="h-3.5 w-3.5 text-[#FF6B6B] flex-shrink-0" />
                                        <span className="text-[11px] text-[#FF6B6B]">Recipient is not registered with EERC</span>
                                    </>
                                ) : null}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Amount card ── */}
                <div className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Amount</p>
                        <p className="text-[11px] font-mono text-gray-500">
                            Available: <span className="text-black font-medium">{currentBalance}</span> <span className="text-gray-400">e{tokenSymbol}</span>
                        </p>
                    </div>
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
                        <p className="text-xs text-[#FF6B6B] mt-2">Insufficient balance</p>
                    )}
                </div>

                {/* ── Progress (when processing) ── */}
                {isProcessing && (
                    <div className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-3">Progress</p>
                        <div className="flex items-center gap-3">
                            <div className={`flex flex-col items-center gap-1 ${currentStep === "prove" ? "opacity-100" : currentStep === "transfer" ? "opacity-40" : "opacity-30"}`}>
                                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-mono ${currentStep === "prove" ? "border-[#F59E0B] text-[#F59E0B]" : "border-gray-200 text-gray-300"}`}>1</div>
                                <span className="text-[9px] text-gray-400 uppercase tracking-wide">Prove</span>
                            </div>
                            <div className="flex-1 h-px bg-black/10" />
                            <div className={`flex flex-col items-center gap-1 ${currentStep === "transfer" ? "opacity-100" : "opacity-30"}`}>
                                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-mono ${currentStep === "transfer" ? "border-[#00A667] text-[#00A667]" : "border-gray-200 text-gray-300"}`}>2</div>
                                <span className="text-[9px] text-gray-400 uppercase tracking-wide">Transfer</span>
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
                        if (!recipient || !isAddress(recipient)) {
                            toast.error("Please enter a valid recipient address");
                            return;
                        }
                        setTransferConfirmOpen(true);
                    }}
                    disabled={
                        isProcessing ||
                        !amount ||
                        parseFloat(amount) <= 0 ||
                        !isRegistered ||
                        !recipient ||
                        !isAddress(recipient) ||
                        !isRecipientRegistered ||
                        (decryptedBalance ? parseUnits(amount || "0", Number(decimals || 18)) > decryptedBalance : false)
                    }
                    className="w-full py-4 rounded-2xl text-sm font-mono uppercase tracking-wider text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    style={{ background: "#F59E0B", boxShadow: "0 8px 24px rgba(245,158,11,0.28)" }}
                >
                    {isProcessing ? "Processing…" : "Transfer Tokens"}
                </button>

            </div>
        </NewLayout>
        <TxConfirmDialog
            isOpen={transferConfirmOpen}
            onCancel={() => setTransferConfirmOpen(false)}
            onConfirm={() => {
                setTransferConfirmOpen(false);
                handleTransfer();
            }}
            type="transfer"
            title="Private Transfer"
            details={[
                { label: "Amount", value: `${amount} ${tokenSymbol}` },
                { label: "To", value: recipient ? `${recipient.slice(0,10)}…${recipient.slice(-6)}` : "" },
                { label: "From", value: address ? `${address.slice(0,10)}…${address.slice(-6)}` : "" },
                { label: "Network", value: "Avalanche Fuji" },
            ] satisfies TxDetail[]}
        />
        </>
    );
}
