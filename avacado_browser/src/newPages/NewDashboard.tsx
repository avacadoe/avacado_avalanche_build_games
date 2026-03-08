import { useState, useEffect, useRef } from "react";
import {
    type CompatiblePublicClient,
    type CompatibleWalletClient,
    useEERC,
} from "@avalabs/eerc-sdk";
import { packPoint } from "@zk-kit/baby-jubjub";
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
import { NewLayout } from "../newComponents";
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

    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient({ chainId: avalancheFuji.id });
    const { data: walletClient } = useWalletClient();

    // persist decryption key per-address
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
        owner,
        symbol,
        isAuditorKeySet,
        auditorPublicKey,
        isRegistered,
        shouldGenerateDecryptionKey,
        generateDecryptionKey,
        register,
        useEncryptedBalance,
        isAddressRegistered,
        publicKey,
        submitWithdrawIntent,
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

    const isDecryptionKeySet = !shouldGenerateDecryptionKey;

    // Contract write hook for minting tokens
    const { writeContract, isPending: isMinting } = useWriteContract();

    // Redirect to registration if not registered (only once)
    useEffect(() => {
        if (!isRegistered && isConnected && !hasRedirectedRef.current) {
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

    const handleMintTokens = async () => {
        if (!address) {
            toast.error("Please connect your wallet first");
            return;
        }

        try {
            // Try mint function first (if available), fallback to requestTokens
            const amount = 100n * 10n ** BigInt(erc20Decimals || 18); // 100 tokens with proper decimals

            writeContract(
                {
                    abi: erc20Abi,
                    functionName: "mint",
                    address: CONTRACTS.ERC20,
                    args: [address, amount],
                },
                {
                    onSuccess: () => {
                        toast.success("Successfully minted tokens!", {
                            position: "top-right",
                            autoClose: 3000,
                        });
                        // Refresh balance after minting
                        setTimeout(() => {
                            refetchErc20Balance();
                        }, 2000);
                    },
                    onError: (error: any) => {
                        console.error("Mint error:", error);
                        toast.error(
                            "Failed to mint tokens. Please try again."
                        );
                    },
                }
            );
        } catch (error) {
            console.error("Mint error:", error);
            toast.error("Failed to mint tokens. Please try again.");
        }
    };

    if (!isConnected) {
        return (
            <NewLayout onNavigate={onNavigate} currentPage="dashboard">
                <div className="max-w-2xl mx-auto text-center py-20">
                    <h1 className="text-5xl font-bold text-coral-red mb-6">
                        Connect Your Wallet
                    </h1>
                    <p className="text-lg text-gray-600">
                        Please connect your wallet to view your dashboard
                    </p>
                </div>
            </NewLayout>
        );
    }

    if (!isRegistered) {
        return (
            <NewLayout onNavigate={onNavigate} currentPage="dashboard">
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
            <div className="space-y-8">
                {/* Header */}
                <div className="relative">
                    {/* Radial glow behind heading */}
                    <div
                        className="pointer-events-none absolute left-0 top-0 h-[180px] w-[180px] -translate-y-8 rounded-full md:h-[220px] md:w-[220px]"
                        style={{
                            background:
                                "radial-gradient(circle, rgba(255,107,107,0.14) 0%, rgba(255,107,107,0) 70%)",
                        }}
                        aria-hidden="true"
                    />

                    <h1
                        className="relative text-5xl font-bold text-coral-red mb-2"
                        style={{
                            fontFamily:
                                "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                            letterSpacing: "-0.02em",
                        }}
                    >
                        Dashboard
                    </h1>
                    <p className="text-lg text-gray-600">
                        Your encrypted balance and recent activity
                    </p>
                </div>

                {/* Balance Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="frost-card p-6">
                        <span className="mono-kicker text-coral-red mb-4 block">
                            [ ENCRYPTED BALANCE ]
                        </span>

                        <div className="mb-4">
                            <p className="text-4xl font-bold text-black mb-2">
                                {formatDisplayAmount(decryptedBalance)}
                            </p>
                            <p className="text-sm text-gray-600">
                                {symbol || "eERC"}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="btn-secondary text-sm w-full mb-3"
                        >
                            {isRefreshing ? "Refreshing..." : "Refresh Balance"}
                        </button>

                        <div className="mt-2 text-sm text-gray-600">
                            <div className="text-xs text-gray-600 mb-1">
                                ERC-20 Balance
                            </div>
                            <div className="text-lg font-mono font-semibold">
                                {formattedErc20Balance}{" "}
                                {/* show symbol if available */}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleMintTokens}
                            disabled={isMinting}
                            className="btn-primary text-sm w-full mt-3"
                        >
                            {isMinting ? "Minting..." : "Mint 100 Tokens"}
                        </button>
                    </div>{" "}
                    <div className="frost-card p-6">
                        <span className="mono-kicker text-coral-red mb-4 block">
                            [ ACCOUNT INFO ]
                        </span>
                        <div className="space-y-3">
                            <div className="rounded-[8px] border border-black/10 bg-white/80 p-3">
                                <p className="text-xs text-gray-600 mb-1">
                                    Wallet Address
                                </p>
                                <p className="text-sm font-mono font-semibold break-all">
                                    {address}
                                </p>
                            </div>
                            {isDecryptionKeySet ? (
                                publicKey && (
                                    <div className="rounded-[8px] border border-black/10 bg-white/80 p-3">
                                        <p className="text-xs text-gray-600 mb-1">
                                            Decryption Key
                                        </p>
                                        <p
                                            className="text-xs font-mono break-all text-gray-700"
                                            style={{
                                                fontFamily:
                                                    "JetBrains Mono, Monaco, monospace",
                                            }}
                                        >
                                            {!!publicKey.length &&
                                            publicKey[0] !== 0n &&
                                            publicKey[1] !== 0n
                                                ? `0x${packPoint(
                                                      publicKey as [
                                                          bigint,
                                                          bigint
                                                      ]
                                                  ).toString(16)}`
                                                : "N/A"}
                                        </p>
                                    </div>
                                )
                            ) : (
                                <div className="rounded-[8px] border border-black/10 bg-white/80 p-3">
                                    <p className="text-xs text-gray-600 mb-2">
                                        Decryption Key
                                    </p>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!isConnected) {
                                                console.log("Not connected");
                                                return;
                                            }

                                            try {
                                                const key =
                                                    await generateDecryptionKey();
                                                toast.success(
                                                    "🔑 Decryption key generated!",
                                                    {
                                                        position: "top-right",
                                                        autoClose: 5000,
                                                        hideProgressBar: true,
                                                        closeOnClick: true,
                                                        pauseOnHover: false,
                                                        draggable: true,
                                                        progress: undefined,
                                                    }
                                                );
                                                // Save decryption key to localStorage (raw key string)
                                                if (address && key) {
                                                    try {
                                                        localStorage.setItem(
                                                            `decryptionKey_${address}`,
                                                            key
                                                        );
                                                        setStoredDecryptionKey(
                                                            key
                                                        );
                                                    } catch (error) {
                                                        console.error(
                                                            "Error saving decryption key to localStorage:",
                                                            error
                                                        );
                                                    }
                                                }
                                            } catch (error) {
                                                toast.error(
                                                    "Error generating decryption key"
                                                );
                                                console.error(error);
                                            }
                                        }}
                                        className="btn-primary text-sm w-full"
                                    >
                                        Generate Decryption Key
                                    </button>
                                </div>
                            )}
                            <div className="rounded-[8px] border border-black/10 bg-white/80 p-3">
                                <p className="text-xs text-gray-600 mb-1">
                                    Auditor Address
                                </p>
                                <p className="text-sm font-mono font-semibold break-all">
                                    0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="frost-card p-8"
                >
                    <span className="mono-kicker text-coral-red mb-6 block">
                        [ QUICK ACTIONS ]
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <ActionCard
                            icon={<AiOutlineArrowDown className="h-8 w-8" />}
                            title="Deposit"
                            description="Convert public tokens to encrypted"
                            onClick={() => onNavigate("deposit")}
                            color="#00A667"
                        />
                        <ActionCard
                            icon={<AiOutlineSwap className="h-8 w-8" />}
                            title="Transfer"
                            description="Send encrypted tokens privately"
                            onClick={() => onNavigate("transfer")}
                            color="#FF6B6B"
                        />
                        <ActionCard
                            icon={<AiOutlineArrowUp className="h-8 w-8" />}
                            title="Withdraw"
                            description="Convert encrypted back to public"
                            onClick={() => onNavigate("withdraw")}
                            color="#C4A600"
                        />
                    </div>
                </motion.div>
            </div>
        </NewLayout>
    );
}

interface ActionCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
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
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
            className="frost-card p-6 interactive-card text-left hover:shadow-lg transition-all"
            style={{
                borderColor: `${color}20`,
            }}
        >
            <div
                className="mb-4 inline-flex items-center justify-center rounded-[2px] p-3"
                style={{ backgroundColor: `${color}15`, color }}
            >
                {icon}
            </div>
            <h3 className="text-lg font-semibold mb-2 text-black">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
        </motion.button>
    );
}
