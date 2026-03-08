import { useState, useEffect, useRef, useCallback } from "react";
import {
    type CompatiblePublicClient,
    type CompatibleWalletClient,
    useEERC,
} from "@avalabs/eerc-sdk";
import {
    useAccount,
    usePublicClient,
    useWalletClient,
    useReadContract,
    useWriteContract,
} from "wagmi";
import { avalancheFuji } from "wagmi/chains";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import {
    AiOutlineArrowDown,
    AiOutlineArrowUp,
    AiOutlineSwap,
} from "react-icons/ai";
import { NewLayout, TxConfirmDialog, type TxDetail } from "../newComponents";
import { CIRCUIT_CONFIG, CONTRACTS, URLS } from "../config/contracts";
import { formatDisplayAmount } from "../pkg/helpers";
import { DEMO_TOKEN_ABI as erc20Abi } from "../pkg/constants";
import { formatUnits } from "viem";
import "../newStyles.css";

interface NewDashboardProps {
    onNavigate: (page: string) => void;
    mode: "standalone" | "converter";
}

export function NewDashboard({
    onNavigate,
    mode: initialMode,
}: NewDashboardProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [mode, setMode] = useState<"standalone" | "converter">(initialMode);
    const hasRedirectedRef = useRef(false);
    const [mintConfirmOpen, setMintConfirmOpen] = useState(false);

    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient({ chainId: avalancheFuji.id });
    const { data: walletClient } = useWalletClient();

    // persist decryption key per-address — read synchronously to avoid generate-key flash
    const [storedDecryptionKey, setStoredDecryptionKey] = useState<
        string | undefined
    >(() => {
        if (!address) return undefined;
        try {
            return localStorage.getItem(`decryptionKey_${address}`) || undefined;
        } catch {
            return undefined;
        }
    });

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

    // Add URL parameter handling like EERC page
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const modeParam = params.get("mode");
        if (modeParam === "standalone" || modeParam === "converter")
            setMode(modeParam as "standalone" | "converter");
    }, []);

    // Update URL when mode changes
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        params.set("mode", mode);
        window.history.replaceState(
            {},
            "",
            `${window.location.pathname}?${params.toString()}`
        );
    }, [mode]);

    const {
        symbol,
        isRegistered,
        shouldGenerateDecryptionKey,
        generateDecryptionKey,
        useEncryptedBalance,
    } = useEERC(
        publicClient as CompatiblePublicClient,
        walletClient as CompatibleWalletClient,
        mode === "converter"
            ? CONTRACTS.EERC_CONVERTER
            : CONTRACTS.EERC_STANDALONE,
        URLS,
        CIRCUIT_CONFIG,
        storedDecryptionKey
    );

    const {
        encryptedBalance: _encryptedBalance,
        decryptedBalance,
        refetchBalance,
    } = useEncryptedBalance(mode === "converter" ? CONTRACTS.ERC20 : undefined);

    // Read ERC20 token decimals and user's public balance
    const { data: erc20Decimals } = useReadContract({
        abi: erc20Abi,
        functionName: "decimals",
        args: [],
        address: CONTRACTS.ERC20,
        query: { enabled: !!address },
    }) as { data: number };

    const { data: erc20BalanceRaw, refetch: refetchErc20Balance } =
        useReadContract({
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address as `0x${string}`],
            query: { enabled: !!address },
            address: CONTRACTS.ERC20,
        }) as { data: bigint; refetch: () => void };

    const formattedErc20Balance =
        erc20BalanceRaw && erc20Decimals
            ? formatUnits(erc20BalanceRaw as bigint, erc20Decimals)
            : "0";

    // Debounce shouldGenerateDecryptionKey — only show the generate-key UI
    // after it has been true for 500ms, preventing a one-frame flash on load
    const [stableNeedsKey, setStableNeedsKey] = useState(false);
    useEffect(() => {
        if (!shouldGenerateDecryptionKey) {
            setStableNeedsKey(false);
            return;
        }
        const t = setTimeout(() => setStableNeedsKey(true), 4900);
        return () => clearTimeout(t);
    }, [shouldGenerateDecryptionKey]);

    const isDecryptionKeySet = !stableNeedsKey;

    // Contract write hook for minting tokens
    const { writeContract, isPending: isMinting } = useWriteContract();

    // Redirect to registration if not registered (only once)
    useEffect(() => {
        if (isRegistered === false && isConnected && !hasRedirectedRef.current) {
            hasRedirectedRef.current = true;
            const timer = setTimeout(() => {
                toast.info("Please complete registration first", {
                    autoClose: 2000,
                    toastId: "not-registered",
                });
                onNavigate("registration");
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isRegistered, isConnected, onNavigate]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        const balance = await refetchBalance();
        console.log("Refreshed balance:", balance);
        setTimeout(() => setIsRefreshing(false), 500);
    };

    // Actual mint logic — called after confirmation
    const executeMint = useCallback(async () => {
        if (!address) {
            toast.error("Please create or import a wallet first");
            return;
        }
        try {
            const amount = 100n * 10n ** BigInt(erc20Decimals || 18);
            writeContract(
                {
                    abi: erc20Abi,
                    functionName: "mint",
                    address: CONTRACTS.ERC20,
                    args: [address, amount],
                },
                {
                    onSuccess: () => {
                        toast.success("Successfully minted 100 tokens!", {
                            autoClose: 3000,
                        });
                        setTimeout(() => { refetchErc20Balance(); }, 2000);
                    },
                    onError: (error: Error) => {
                        console.error("Mint error:", error);
                        toast.error("Failed to mint tokens. Please try again.");
                    },
                }
            );
        } catch (error) {
            console.error("Mint error:", error);
            toast.error("Failed to mint tokens. Please try again.");
        }
    }, [address, erc20Decimals, writeContract, refetchErc20Balance]);

    // Show confirm dialog before minting
    const handleMintTokens = () => {
        if (!address) {
            toast.error("Please create or import a wallet first");
            return;
        }
        setMintConfirmOpen(true);
    };

    if (!isConnected) return null;

    // Still checking registration status — render nothing to avoid flash
    if (isRegistered === undefined) return null;

    if (isRegistered === false) {
        return (
            <NewLayout onNavigate={onNavigate} currentPage="dashboard" isRegistered={false}>
                <div className="max-w-2xl mx-auto text-center py-20">
                    <h1 className="text-5xl font-bold text-coral-red mb-6">
                        Registration Required
                    </h1>
                    <p className="text-lg text-gray-600 mb-8">
                        You need to register before using encrypted transactions
                    </p>
                    <button
                        type="button"
                        onClick={() => onNavigate("registration")}
                        className="btn-primary text-base px-8 py-4"
                    >
                        Register Now
                    </button>
                </div>
            </NewLayout>
        );
    }

    return (
        <NewLayout onNavigate={onNavigate} currentPage="dashboard">
            <div className="space-y-4 max-w-lg mx-auto md:max-w-none">

                {/* ── Wallet card (address + status) ── */}
                <div className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <motion.div
                            animate={{ scale: [1, 1.35, 1] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            className="w-2 h-2 rounded-full bg-green-500 shrink-0"
                        />
                        <p className="text-[11px] font-semibold text-green-600 uppercase tracking-widest">Connected</p>
                        <span className="ml-auto text-[10px] font-mono bg-[#FF6B6B]/10 text-[#FF6B6B] px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                            Avalanche Fuji
                        </span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono mb-1.5">Wallet Address</p>
                    <p className="text-xs font-mono text-gray-800 break-all leading-relaxed mb-3">{address}</p>
                    <button
                        type="button"
                        onClick={() => {
                            navigator.clipboard.writeText(address ?? "");
                            toast.success("Address copied!", { autoClose: 1500 });
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-500 hover:text-[#FF6B6B] transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Address
                    </button>
                </div>

                {/* ── Balance cards ── */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Encrypted balance */}
                    <div className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-[#FF6B6B] mb-2">Encrypted</p>
                        <p className="text-2xl text-black leading-tight">
                            {formatDisplayAmount(decryptedBalance)}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">{symbol || "eERC"}</p>
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="mt-3 w-full text-[10px] font-mono uppercase tracking-wider py-1.5 rounded-lg border border-black/10 bg-black/[0.03] text-gray-500 hover:text-[#FF6B6B] hover:border-[#FF6B6B]/30 transition-colors disabled:opacity-50"
                        >
                            {isRefreshing ? "···" : "Refresh"}
                        </button>
                    </div>

                    {/* ERC-20 balance */}
                    <div className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-2">Public ERC-20</p>
                        <p className="text-2xl text-black leading-tight">
                            {formattedErc20Balance}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">Tokens</p>
                        <button
                            type="button"
                            onClick={handleMintTokens}
                            disabled={isMinting}
                            className="mt-3 w-full text-[10px] font-mono uppercase tracking-wider py-1.5 rounded-lg bg-[#FF6B6B] text-white hover:bg-[#FF6B6B]/90 transition-colors disabled:opacity-50"
                        >
                            {isMinting ? "···" : "Mint 100"}
                        </button>
                    </div>
                </div>

                {/* ── Keys & Auditor info ── */}
                <div className="bg-white border border-black/8 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-4 pt-4 pb-2">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-3">Account Info</p>
                    </div>

                    {/* Decryption key row */}
                    <div className="px-4 pb-3">
                        {isDecryptionKeySet ? (
                            <div className="flex items-center gap-3 py-2.5 border border-black/8 rounded-xl px-3 bg-[#FAFAFA]">
                                <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                                    <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Decryption Key</p>
                                    <p className="text-xs text-green-700 font-mono mt-0.5">✓ Active</p>
                                </div>
                            </div>
                        ) : (
                            <div className="border border-amber-200 rounded-xl overflow-hidden">
                                <div className="flex items-center gap-3 px-3 py-2.5 bg-amber-50">
                                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                        <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-mono uppercase tracking-wider text-amber-700">Decryption Key</p>
                                        <p className="text-xs text-amber-600 mt-0.5">Required to view encrypted balance</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!isConnected) return;
                                        try {
                                            const key = await generateDecryptionKey();
                                            toast.success("🔑 Decryption key generated!", { autoClose: 4000 });
                                            if (address && key) {
                                                try {
                                                    localStorage.setItem(`decryptionKey_${address}`, key);
                                                    setStoredDecryptionKey(key);
                                                } catch (err) {
                                                    console.error("Error saving decryption key:", err);
                                                }
                                            }
                                        } catch (err) {
                                            toast.error("Error generating decryption key");
                                            console.error(err);
                                        }
                                    }}
                                    className="w-full py-2.5 bg-amber-500 text-white text-[11px] font-mono uppercase tracking-wider hover:bg-amber-600 transition-colors"
                                >
                                    Generate Decryption Key
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Auditor address row */}
                    <div className="border-t border-black/6 mx-4 pt-3 pb-4">
                        <div className="flex items-center gap-3 py-2.5 border border-black/8 rounded-xl px-3 bg-[#FAFAFA]">
                            <div className="w-7 h-7 rounded-lg bg-[#FF6B6B]/10 flex items-center justify-center shrink-0">
                                <svg className="w-3.5 h-3.5 text-[#FF6B6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">Auditor Address</p>
                                <p className="text-xs font-mono text-gray-600 mt-0.5 truncate">0x742d35Cc…f0bEb</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Quick Actions ── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm"
                >
                    <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-3">Quick Actions</p>
                    <div className="grid grid-cols-3 gap-3">
                        <ActionCard
                            icon={<AiOutlineArrowDown className="h-6 w-6" />}
                            title="Deposit"
                            onClick={() => onNavigate("deposit")}
                            color="#00A667"
                        />
                        <ActionCard
                            icon={<AiOutlineSwap className="h-6 w-6" />}
                            title="Transfer"
                            onClick={() => onNavigate("transfer")}
                            color="#FF6B6B"
                        />
                        <ActionCard
                            icon={<AiOutlineArrowUp className="h-6 w-6" />}
                            title="Withdraw"
                            onClick={() => onNavigate("withdraw")}
                            color="#C4A600"
                        />
                    </div>
                </motion.div>

            </div>

            {/* Mint confirmation dialog */}
            <TxConfirmDialog
                isOpen={mintConfirmOpen}
                onCancel={() => setMintConfirmOpen(false)}
                onConfirm={() => {
                    setMintConfirmOpen(false);
                    executeMint();
                }}
                type="mint"
                title="Mint 100 Tokens"
                details={[
                    { label: "Amount", value: "100 tokens" },
                    { label: "To", value: address ? `${address.slice(0, 10)}…${address.slice(-6)}` : "" },
                    { label: "Contract", value: `${CONTRACTS.ERC20.slice(0, 10)}…${CONTRACTS.ERC20.slice(-6)}` },
                ] satisfies TxDetail[]}
            />
        </NewLayout>
    );
}

interface ActionCardProps {
    icon: React.ReactNode;
    title: string;
    description?: string;
    onClick: () => void;
    color: string;
}

function ActionCard({
    icon,
    title,
    description,
    onClick,
    color,
}: ActionCardProps) {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            whileTap={{ scale: 0.96 }}
            className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-black/8 bg-[#FAFAFA] hover:border-black/15 active:opacity-80 transition-all text-center"
        >
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${color}18`, color }}
            >
                {icon}
            </div>
            <p className="text-[11px] font-mono uppercase tracking-wide text-black">{title}</p>
            {description && <p className="text-[10px] text-gray-400 leading-tight">{description}</p>}
        </motion.button>
    );
}
