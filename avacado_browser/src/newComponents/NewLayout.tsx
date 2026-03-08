import { ReactNode, useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { motion, AnimatePresence } from "framer-motion";

interface NewLayoutProps {
    children: ReactNode;
    onNavigate?: (page: string) => void;
    currentPage?: string;
}

export function NewLayout({ children, onNavigate, currentPage = "home" }: NewLayoutProps) {
    const { address, isConnected } = useAccount();
    const { open } = useAppKit();
    const [showLearnDropdown, setShowLearnDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const showNav = currentPage !== "home";

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowLearnDropdown(false);
            }
        }

        if (showLearnDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }
    }, [showLearnDropdown]);

    return (
        <div className="min-h-screen dotted-bg">
            {/* Header/Navbar */}
            <header
                className="sticky top-0 z-50 border-b border-black/10 bg-[#ECECEC]/90 backdrop-blur transition-colors"
                style={{
                    backgroundImage:
                        "radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)",
                    backgroundSize: "12px 12px",
                }}
            >
                <div className="mx-auto flex h-[68px] w-full max-w-[1200px] items-center justify-between px-6 lg:h-[88px] lg:px-16">
                    {/* Logo */}
                    <div className="flex items-center gap-6">
                        <button
                            type="button"
                            onClick={() => onNavigate?.("home")}
                            className="flex items-center gap-3 hover:opacity-70 transition-opacity"
                        >
                            <img 
                                src="/avocado-logo.png" 
                                alt="Avacado Logo" 
                                className="w-8 h-8 md:w-10 md:h-10"
                            />
                            <span
                                className="text-[24px] font-semibold tracking-[-0.04em] text-coral-red"
                                style={{
                                    fontFamily:
                                        "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                                }}
                            >
                                avacado
                            </span>
                            <span className="text-[12px] font-mono text-gray-500">
                                / demo
                            </span>
                        </button>
                        
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
                                <motion.button
                                    type="button"
                                    onClick={() => onNavigate("batchApproval")}
                                    whileHover="hover"
                                    initial="initial"
                                    className={`px-3 py-1.5 text-sm font-medium transition-colors relative ${
                                        currentPage === "batchApproval"
                                            ? "text-coral-red"
                                            : "text-gray-600 hover:text-coral-red"
                                    }`}
                                >
                                    Batch Approval
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

                    {/* Right side - Connect wallet */}
                    <div className="flex items-center gap-4">
                        {isConnected && address ? (
                            <div className="flex items-center gap-3">
                                <div className="hidden sm:block">
                                    <p className="mono-kicker text-gray-500">
                                        Connected
                                    </p>
                                    <p className="text-sm font-medium text-black">
                                        {address.slice(0, 6)}...
                                        {address.slice(-4)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => open()}
                                    className="bg-coral-red text-white border border-coral-red hover:bg-coral-red/90 transition-colors px-4 py-2 rounded-[2px] text-sm font-medium"
                                >
                                    Wallet
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => open()}
                                className="btn-primary"
                            >
                                Connect Wallet
                            </button>
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
                className="mx-auto w-full max-w-[1200px] px-6 py-10 lg:px-16 lg:py-14"
            >
                {children}
            </motion.main>

            {/* Footer */}
            <footer
                className="relative mt-32 overflow-hidden border-t border-black/10"
                aria-labelledby="footer-title"
                style={{
                    backgroundColor: "#ECECEC",
                    backgroundImage:
                        "radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)",
                    backgroundSize: "12px 12px",
                }}
            >
                <div
                    className="pointer-events-none absolute inset-0"
                    aria-hidden="true"
                >
                    <div
                        className="absolute left-1/2 top-12 h-[260px] w-[260px] -translate-x-1/2 rounded-full md:h-[360px] md:w-[360px] lg:h-[420px] lg:w-[420px]"
                        style={{
                            background:
                                "radial-gradient(circle, rgba(255,107,107,0.18) 0%, rgba(255,107,107,0) 65%)",
                        }}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-[1px] bg-black/10" />
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-black/10" />
                    
                    {/* Overlay Image - Only visible on desktop */}
                    <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-[50%] flex items-center justify-end pr-16 z-[2]">
                        <img 
                            src="/wait.png" 
                            alt="Samurai under tree" 
                            className="w-full h-auto max-h-full object-contain opacity-90"
                        />
                    </div>
                </div>

                <div className="relative z-[3] mx-auto max-w-[1200px] px-6 py-12 md:py-16 lg:px-0 lg:py-24">
                    {/* Mobile/Tablet: Traditional grid layout */}
                    <div className="lg:hidden grid gap-10 md:gap-14 md:grid-cols-2 items-center">
                        <div>
                            <p
                                className="mb-6 text-[10px] uppercase md:text-xs"
                                style={{
                                    color: "#FF6B6B",
                                    fontFamily:
                                        "JetBrains Mono, Monaco, 'Courier New', monospace",
                                    letterSpacing: "0.4em",
                                }}
                            >
                                Privacy-first wallet
                            </p>
                            <h2
                                id="footer-title"
                                style={{
                                    fontFamily:
                                        "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                                    fontSize: "clamp(64px, 18vw, 200px)",
                                    fontWeight: 100,
                                    lineHeight: 0.88,
                                    letterSpacing: "-0.08em",
                                    textTransform: "uppercase",
                                    color: "#FF6B6B",
                                    textShadow: "0 24px 60px rgba(255, 107, 107, 0.35)",
                                }}
                            >
                                Avacado
                            </h2>
                            <p
                                className="mt-6 max-w-[560px] text-xs leading-relaxed md:text-sm"
                                style={{
                                    color: "#555555",
                                    fontFamily:
                                        "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                                }}
                            >
                                Built for teams that expect complete privacy, zero-knowledge
                                compliance, and lightning-fast execution across chains.
                            </p>
                        </div>
                        
                        {/* Mobile/Tablet Image */}
                        <div className="flex items-center justify-center md:justify-end">
                            <img 
                                src="/wait.png" 
                                alt="Samurai under tree" 
                                className="w-64 h-auto md:w-80"
                            />
                        </div>
                    </div>
                    
                    {/* Desktop: Extreme left layout with overlay */}
                    <div className="hidden lg:block max-w-[500px]">
                        <div>
                            <p
                                className="mb-6 text-[10px] uppercase md:text-xs"
                                style={{
                                    color: "#FF6B6B",
                                    fontFamily:
                                        "JetBrains Mono, Monaco, 'Courier New', monospace",
                                    letterSpacing: "0.4em",
                                }}
                            >
                                Privacy-first wallet
                            </p>
                            <h2
                                id="footer-title"
                                style={{
                                    fontFamily:
                                        "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                                    fontSize: "clamp(64px, 18vw, 200px)",
                                    fontWeight: 100,
                                    lineHeight: 0.88,
                                    letterSpacing: "-0.08em",
                                    textTransform: "uppercase",
                                    color: "#FF6B6B",
                                    textShadow: "0 24px 60px rgba(255, 107, 107, 0.35)",
                                }}
                            >
                                Avacado
                            </h2>
                            <p
                                className="mt-6 max-w-[450px] text-xs leading-relaxed md:text-sm"
                                style={{
                                    color: "#555555",
                                    fontFamily:
                                        "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                                }}
                            >
                                Built for teams that expect complete privacy, zero-knowledge
                                compliance, and lightning-fast execution across chains.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Copyright section - Below everything */}
                <div className="relative z-[4] mx-auto max-w-[1200px] px-6 pb-6 lg:px-16 lg:pb-12 mt-16">
                    <div className="flex flex-col gap-4 border-t border-black/10 pt-6 text-[10px] md:flex-row md:items-center md:justify-between md:text-xs">
                        <p
                            className="uppercase"
                            style={{
                                fontFamily:
                                    "JetBrains Mono, Monaco, 'Courier New', monospace",
                                color: "#7A7A7A",
                                letterSpacing: "0.32em",
                            }}
                        >
                            © {new Date().getFullYear()} avacado.app. All rights reserved.
                        </p>
                        <div
                            className="flex flex-wrap items-center gap-3 uppercase md:gap-6"
                            style={{
                                fontFamily:
                                    "JetBrains Mono, Monaco, 'Courier New', monospace",
                                color: "#0b0b0bff",
                                letterSpacing: "0.28em",
                            }}
                        >
                            <a
                                href="mailto:arkoroy302@gmail.com"
                                className="transition-opacity hover:opacity-70 text-black"
                            >
                                Contact
                            </a>
                            <span
                                className="hidden h-[1px] w-12 bg-black md:block"
                                aria-hidden="true"
                            />
                            <a
                                href="#waitlist"
                                className="transition-opacity hover:opacity-70"
                            >
                                Join Waitlist
                            </a>
                            <span
                                className="hidden h-[1px] w-12 bg-black md:block"
                                aria-hidden="true"
                            />
                            <a href="/" className="transition-opacity hover:opacity-70">
                                Privacy
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
