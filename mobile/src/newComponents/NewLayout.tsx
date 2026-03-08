import { ReactNode, useState, useEffect, useRef, useCallback } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { motion, AnimatePresence } from "framer-motion";
import { WalletModal } from "../components/wallet";
import { clearSession } from "../lib/localWallet";
import { LOCAL_WALLET_CONNECTOR_ID } from "../lib/localWalletConnector";

interface NewLayoutProps {
    children: ReactNode;
    onNavigate?: (page: string) => void;
    currentPage?: string;
    isRegistered?: boolean;
}

export function NewLayout({ children, onNavigate, currentPage = "home", isRegistered }: NewLayoutProps) {
    const { address, isConnected, connector } = useAccount();
    const { open } = useAppKit();
    const { disconnect } = useDisconnect();
    const [showLearnDropdown, setShowLearnDropdown] = useState(false);
    const [showLockPopup, setShowLockPopup] = useState(false);
    const [walletModalOpen, setWalletModalOpen] = useState(false);
    const [walletModalView, setWalletModalView] = useState<"menu" | "create-1" | "import-menu" | "connected">("menu");
    const dropdownRef = useRef<HTMLDivElement>(null);

    const showNav =
        currentPage !== "home" &&
        currentPage !== "registration" &&
        isConnected &&
        isRegistered !== false;

    // Detect if connected via our local wallet connector
    const isLocalWallet = connector?.id === LOCAL_WALLET_CONNECTOR_ID;
    // Address of the locally-stored wallet (may differ from wagmi address briefly)
    const localAddress = (isLocalWallet ? address : undefined) as `0x${string}` | undefined;

    const openWalletModal = useCallback((view: "menu" | "create-1" | "import-menu" | "connected" = "menu") => {
        setWalletModalView(view);
        setWalletModalOpen(true);
    }, []);

    const handleOpenWallet = useCallback(() => {
        if (isLocalWallet) {
            openWalletModal("connected");
        } else {
            open({ view: "Account" });
        }
    }, [isLocalWallet, open, openWalletModal]);

    const handleLock = useCallback(() => {
        clearSession(); // clear in-memory key (keep vault)
        disconnect();   // wagmi disconnect
        window.dispatchEvent(new CustomEvent("avacado:lock"));
    }, [disconnect]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowLearnDropdown(false);
            }
        }
        if (showLearnDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [showLearnDropdown]);

    return (
        <div
            className="min-h-screen dotted-bg"
            style={{
                minHeight: "100dvh",
                paddingLeft: "env(safe-area-inset-left)",
                paddingRight: "env(safe-area-inset-right)",
            }}
        >
            {/* Header/Navbar */}
            <header
                className="sticky top-0 z-50 border-b border-black/10 bg-[#ECECEC]/90 backdrop-blur transition-colors"
                style={{
                    backgroundImage:
                        "radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)",
                    backgroundSize: "12px 12px",
                    paddingTop: "env(safe-area-inset-top)",
                }}
            >
                <div className="mx-auto flex h-[60px] sm:h-[68px] w-full max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:h-[88px] lg:px-16">
                    {/* Logo */}
                    <div className="flex items-center gap-4 sm:gap-6">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <img 
                                src="/avocado-logo.png" 
                                alt="Avacado Logo" 
                                className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10"
                            />
                            <span
                                className="text-[20px] sm:text-[24px] font-semibold tracking-[-0.04em] text-coral-red"
                                style={{
                                    fontFamily:
                                        "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                                }}
                            >
                                avacado
                            </span>
                            <span className="hidden sm:inline text-[12px] font-mono text-gray-500">
                                / Mobile Wallet
                            </span>
                        </div>
                        
                        {/* Navigation Links - Only show when not on home */}
                        {showNav && onNavigate && (
                            <nav className="hidden md:flex items-center gap-1 ml-4">
                                <motion.button
                                    type="button"
                                    onClick={() => onNavigate("dashboard")}
                                    whileHover="hover"
                                    initial="initial"
                                    className={`px-3 py-1.5 text-sm font-medium transition-colors relative ${
                                        currentPage === "dashboard"
                                            ? "text-coral-red"
                                            : "text-gray-600 hover:text-coral-red"
                                    }`}
                                >
                                    Dashboard
                                    <motion.span
                                        className="absolute bottom-0.5 left-3 right-3 h-[2px] bg-coral-red"
                                        variants={{
                                            initial: { scaleX: 0 },
                                            hover: { scaleX: 1 }
                                        }}
                                        transition={{ duration: 0.2 }}
                                        style={{ originX: 0 }}
                                    />
                                </motion.button>
                                <motion.button
                                    type="button"
                                    onClick={() => onNavigate("deposit")}
                                    whileHover="hover"
                                    initial="initial"
                                    className={`px-3 py-1.5 text-sm font-medium transition-colors relative ${
                                        currentPage === "deposit"
                                            ? "text-coral-red"
                                            : "text-gray-600 hover:text-coral-red"
                                    }`}
                                >
                                    Deposit
                                    <motion.span
                                        className="absolute bottom-0.5 left-3 right-3 h-[2px] bg-coral-red"
                                        variants={{
                                            initial: { scaleX: 0 },
                                            hover: { scaleX: 1 }
                                        }}
                                        transition={{ duration: 0.2 }}
                                        style={{ originX: 0 }}
                                    />
                                </motion.button>
                                <motion.button
                                    type="button"
                                    onClick={() => onNavigate("transfer")}
                                    whileHover="hover"
                                    initial="initial"
                                    className={`px-3 py-1.5 text-sm font-medium transition-colors relative ${
                                        currentPage === "transfer"
                                            ? "text-coral-red"
                                            : "text-gray-600 hover:text-coral-red"
                                    }`}
                                >
                                    Transfer
                                    <motion.span
                                        className="absolute bottom-0.5 left-3 right-3 h-[2px] bg-coral-red"
                                        variants={{
                                            initial: { scaleX: 0 },
                                            hover: { scaleX: 1 }
                                        }}
                                        transition={{ duration: 0.2 }}
                                        style={{ originX: 0 }}
                                    />
                                </motion.button>
                                <motion.button
                                    type="button"
                                    onClick={() => onNavigate("withdraw")}
                                    whileHover="hover"
                                    initial="initial"
                                    className={`px-3 py-1.5 text-sm font-medium transition-colors relative ${
                                        currentPage === "withdraw"
                                            ? "text-coral-red"
                                            : "text-gray-600 hover:text-coral-red"
                                    }`}
                                >
                                    Withdraw
                                    <motion.span
                                        className="absolute bottom-0.5 left-3 right-3 h-[2px] bg-coral-red"
                                        variants={{
                                            initial: { scaleX: 0 },
                                            hover: { scaleX: 1 }
                                        }}
                                        transition={{ duration: 0.2 }}
                                        style={{ originX: 0 }}
                                    />
                                </motion.button>
                                
                                {/* Learn Dropdown */}
                                <div className="relative" ref={dropdownRef}>
                                    <motion.button
                                        type="button"
                                        onClick={() => setShowLearnDropdown(!showLearnDropdown)}
                                        whileHover="hover"
                                        initial="initial"
                                        className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1 relative ${
                                            currentPage === "ecc" || currentPage === "hashes" || currentPage === "poseidon"
                                                ? "text-coral-red"
                                                : "text-gray-600 hover:text-coral-red"
                                        }`}
                                    >
                                        Learn
                                        <svg 
                                            className={`w-4 h-4 transition-transform ${showLearnDropdown ? 'rotate-180' : ''}`}
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        <motion.span
                                            className="absolute bottom-0.5 left-3 right-3 h-[2px] bg-coral-red"
                                            variants={{
                                                initial: { scaleX: 0 },
                                                hover: { scaleX: 1 }
                                            }}
                                            transition={{ duration: 0.2 }}
                                            style={{ originX: 0 }}
                                        />
                                    </motion.button>
                                    
                                    {/* Dropdown Menu */}
                                    <AnimatePresence>
                                        {showLearnDropdown && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.2 }}
                                                className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-black/10 py-1 z-50"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onNavigate("ecc");
                                                        setShowLearnDropdown(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                                        currentPage === "ecc"
                                                            ? "bg-coral-red/10 text-coral-red font-medium"
                                                            : "text-gray-700 hover:bg-black/5"
                                                    }`}
                                                >
                                                    Elliptic Curves
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onNavigate("hashes");
                                                        setShowLearnDropdown(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                                        currentPage === "hashes"
                                                            ? "bg-coral-red/10 text-coral-red font-medium"
                                                            : "text-gray-700 hover:bg-black/5"
                                                    }`}
                                                >
                                                    Hash Functions
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onNavigate("poseidon");
                                                        setShowLearnDropdown(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                                        currentPage === "poseidon"
                                                            ? "bg-coral-red/10 text-coral-red font-medium"
                                                            : "text-gray-700 hover:bg-black/5"
                                                    }`}
                                                >
                                                    Poseidon Encryption
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </nav>
                        )}
                    </div>

                    {/* Right side - Wallet & Mobile Menu */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Desktop / tablet wallet actions */}
                        <div className="hidden md:flex items-center gap-3">
                            {isConnected && address ? (
                                <div className="flex items-center gap-3">
                                    <div className="hidden sm:block">
                                        <p className="mono-kicker text-gray-500">
                                            {isLocalWallet ? "Local Wallet" : "Wallet"}
                                        </p>
                                        <p className="text-sm font-medium text-black">
                                            {address.slice(0, 6)}...
                                            {address.slice(-4)}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleOpenWallet}
                                        className="bg-coral-red text-white border border-coral-red hover:bg-coral-red/90 transition-colors px-4 py-2 rounded-[2px] text-sm font-medium"
                                    >
                                        Open Wallet
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => openWalletModal("create-1")}
                                        className="btn-primary"
                                    >
                                        Create Wallet
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openWalletModal("import-menu")}
                                        className="btn-secondary hidden lg:inline-flex"
                                    >
                                        Import Wallet
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Mobile compact wallet chip (visible on mobile only when connected) */}
                        {isConnected && address && (
                            <button
                                type="button"
                                onClick={handleOpenWallet}
                                className="flex md:hidden items-center gap-1.5 rounded-full border border-black/10 bg-white/80 px-2.5 py-1.5 active:opacity-70 transition-opacity"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                                <span className="text-[11px] font-mono text-black">{address.slice(0,6)}…{address.slice(-4)}</span>
                            </button>
                        )}

                        {/* Mobile lock icon — local wallet, non-home pages only */}
                        {isLocalWallet && isConnected && showNav && (
                            <div className="relative md:hidden">
                                <button
                                    type="button"
                                    onClick={() => setShowLockPopup((s) => !s)}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-[2px] border border-black/10 bg-white/70 text-gray-500 transition-all hover:border-[#FF6B6B] hover:text-[#FF6B6B] active:scale-95"
                                >
                                    <span className="sr-only">Lock wallet</span>
                                    {/* Open padlock */}
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                            d="M8 11V7a4 4 0 118 0m0 0v4M6 11h12a2 2 0 012 2v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7a2 2 0 012-2z" />
                                    </svg>
                                </button>

                                {/* Lock confirm popup */}
                                <AnimatePresence>
                                    {showLockPopup && (
                                        <>
                                            {/* Backdrop to close */}
                                            <motion.div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setShowLockPopup(false)}
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.92, y: -6 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.92, y: -6 }}
                                                transition={{ duration: 0.14 }}
                                                className="absolute right-0 top-12 z-50 w-44 rounded-2xl border border-black/8 bg-white p-3 shadow-xl space-y-2"
                                            >
                                                <p className="px-1 text-[10px] font-mono uppercase tracking-widest text-gray-400">Lock wallet?</p>
                                                <button
                                                    type="button"
                                                    onClick={() => { setShowLockPopup(false); handleLock(); }}
                                                    className="w-full rounded-xl bg-[#FF6B6B] py-2.5 text-[11px] font-mono uppercase tracking-wider text-white transition-opacity hover:opacity-90"
                                                >
                                                    Yes, lock
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowLockPopup(false)}
                                                    className="w-full rounded-xl border border-black/10 py-2 text-[11px] text-gray-500"
                                                >
                                                    Cancel
                                                </button>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main content */}
            <motion.main 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-16 ${showNav ? "pt-4 sm:pt-6 md:pt-10 pb-28 md:pb-14" : "py-8 sm:py-10 lg:py-14"}`}
            >
                {children}
            </motion.main>

            {/* ── Mobile bottom nav (non-home pages only) ── */}
            {showNav && onNavigate && (
                <nav
                    className="fixed bottom-0 inset-x-0 z-40 md:hidden"
                    style={{
                        backgroundColor: "rgba(236,236,236,0.96)",
                        backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)",
                        backgroundSize: "12px 12px",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        borderTop: "1px solid rgba(0,0,0,0.08)",
                        paddingBottom: "env(safe-area-inset-bottom)",
                    }}
                >
                        <div className="flex items-stretch">
                            {([
                                {
                                    id: "dashboard",
                                    label: "Home",
                                    icon: (
                                        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={currentPage === "dashboard" ? 2.2 : 1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                        </svg>
                                    ),
                                },
                                {
                                    id: "deposit",
                                    label: "Deposit",
                                    icon: (
                                        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={currentPage === "deposit" ? 2.2 : 1.5} d="M12 4v16m0 0l-4-4m4 4l4-4" />
                                        </svg>
                                    ),
                                },
                                {
                                    id: "transfer",
                                    label: "Transfer",
                                    icon: (
                                        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={currentPage === "transfer" ? 2.2 : 1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                        </svg>
                                    ),
                                },
                                {
                                    id: "withdraw",
                                    label: "Withdraw",
                                    icon: (
                                        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={currentPage === "withdraw" ? 2.2 : 1.5} d="M12 20V4m0 0l-4 4m4-4l4 4" />
                                        </svg>
                                    ),
                                },
                            ] as const).map(({ id, label, icon }) => {
                                const active = currentPage === id;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => onNavigate(id)}
                                        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 relative transition-opacity active:opacity-60"
                                        style={{ color: active ? "#FF6B6B" : "#AAAAAA" }}
                                    >
                                        {active && (
                                            <motion.div
                                                layoutId="bottom-tab-indicator"
                                                className="absolute top-0 left-2 right-2 h-0.5 rounded-full"
                                                style={{ backgroundColor: "#FF6B6B" }}
                                                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                                            />
                                        )}
                                        {icon}
                                        <span
                                            style={{
                                                fontFamily: "JetBrains Mono, Monaco, monospace",
                                                fontSize: "9px",
                                                letterSpacing: "0.18em",
                                                textTransform: "uppercase",
                                                fontWeight: active ? 500 : 400,
                                            }}
                                        >
                                            {label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                </nav>
            )}

            {/* Self-custody wallet modal */}
            <WalletModal
                isOpen={walletModalOpen}
                defaultView={walletModalView}
                connectedAddress={localAddress}
                onClose={() => setWalletModalOpen(false)}
            />
        </div>
    );
}
