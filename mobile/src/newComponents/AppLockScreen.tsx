/**
 * AppLockScreen.tsx
 *
 * Shown on startup (and after manual "Lock") when an encrypted vault exists
 * but no in-memory session is active.  Lets the user enter their password to
 * unlock, or choose to use a different wallet (which clears the vault).
 */

import { useState, useCallback, useEffect } from "react";
import { useConnect, useDisconnect } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import {
    getStoredVault,
    unlockVault,
    clearVault,
} from "../lib/localWallet";
import { LOCAL_WALLET_CONNECTOR_ID } from "../lib/localWalletConnector";
import {
    isBiometricAvailable,
    hasBiometricCredential,
    authenticateWithBiometric,
} from "../lib/biometricAuth";
import "../newStyles.css";

interface AppLockScreenProps {
    onUnlocked: () => void;
}

export function AppLockScreen({ onUnlocked }: AppLockScreenProps) {
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isUnlocking, setIsUnlocking] = useState(false);

    // Biometric state
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricLoading, setBiometricLoading] = useState(false);
    const [biometricError, setBiometricError] = useState("");

    const { connect, connectors } = useConnect();
    const { disconnect } = useDisconnect();

    const vault = getStoredVault();
    const address = vault?.address ?? "";

    const handleUnlock = useCallback(async () => {
        if (!password) return;
        setIsUnlocking(true);
        setError("");
        try {
            await unlockVault(password);
            // biome-ignore lint/suspicious/noExplicitAny: global bridge
            (globalThis as any).__avacadoResetLocalWalletProvider?.();
            const localConnector = connectors.find(
                (c) => c.id === LOCAL_WALLET_CONNECTOR_ID
            );
            if (localConnector) {
                connect({ connector: localConnector });
            }
            onUnlocked();
        } catch {
            setError("Incorrect password. Please try again.");
        } finally {
            setIsUnlocking(false);
        }
    }, [password, connectors, connect, onUnlocked]);

    const handleForget = useCallback(() => {
        clearVault();
        // biome-ignore lint/suspicious/noExplicitAny: global bridge
        (globalThis as any).__avacadoResetLocalWalletProvider?.();
        disconnect();
        onUnlocked();
    }, [disconnect, onUnlocked]);

    const handleBiometricUnlock = useCallback(async (silent = false) => {
        setBiometricLoading(true);
        setBiometricError("");
        try {
            const pw = await authenticateWithBiometric();
            await unlockVault(pw);
            // biome-ignore lint/suspicious/noExplicitAny: global bridge
            (globalThis as any).__avacadoResetLocalWalletProvider?.();
            const localConnector = connectors.find(
                (c) => c.id === LOCAL_WALLET_CONNECTOR_ID
            );
            if (localConnector) connect({ connector: localConnector });
            onUnlocked();
        } catch (err) {
            // NotAllowedError = user cancelled or no user-gesture (iOS auto-trigger)
            const isNotAllowed = err instanceof DOMException && err.name === "NotAllowedError";
            if (silent && isNotAllowed) {
                // Silent auto-trigger on iOS — just do nothing, button is visible
            } else if (isNotAllowed) {
                setBiometricError("Cancelled. Tap the button to try again.");
            } else {
                setBiometricError("Biometric failed — use your password below.");
            }
        } finally {
            setBiometricLoading(false);
        }
    }, [connectors, connect, onUnlocked]);

    // On mount: if biometric credential exists, auto-trigger the OS prompt.
    // On iOS the browser requires a user gesture so this may be silently denied —
    // that's fine: the button is shown and the user can tap it.
    useEffect(() => {
        let cancelled = false;
        isBiometricAvailable().then((avail) => {
            const hasKey = hasBiometricCredential();
            if (!cancelled) setBiometricAvailable(avail && hasKey);
            if (avail && hasKey) {
                const t = setTimeout(() => {
                    if (!cancelled) handleBiometricUnlock(true); // silent = true
                }, 400);
                return () => clearTimeout(t);
            }
        });
        return () => { cancelled = true; };
    }, [handleBiometricUnlock]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[999] flex flex-col overflow-hidden"
            style={{
                background: "#F0EDED",
                backgroundImage:
                    "radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)",
                backgroundSize: "12px 12px",
            }}
        >
            {/* ── TOP: logo + compact unlock card ── */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 min-h-0">
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.08 }}
                    className="flex flex-col items-center mb-5"
                >
                    <img
                        src="/avocado-logo.png"
                        alt="Avacado"
                        className="w-11 h-11 mb-2.5 drop-shadow-sm"
                    />
                    <span
                        className="text-[20px] font-semibold tracking-[-0.04em] text-coral-red"
                        style={{
                            fontFamily:
                                "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                        }}
                    >
                        avacado
                    </span>
                    <p
                        className="text-[9px] font-mono text-gray-400 mt-0.5 uppercase tracking-[0.22em]"
                        style={{ fontFamily: "JetBrains Mono, Monaco, 'Courier New', monospace" }}
                    >
                        Wallet Locked
                    </p>
                </motion.div>

                {/* Unlock card — minimal, no redundant lock icon */}
                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.14 }}
                    className="w-full max-w-[340px] bg-white/88 backdrop-blur-md rounded-3xl shadow-xl border border-black/[0.07] px-5 py-5 space-y-3.5"
                >
                    {/* Address */}
                    <div className="text-center">
                        <p className="text-[13px] font-semibold text-black leading-snug">
                            Welcome back
                        </p>
                        {address && (
                            <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                                {address.slice(0, 10)}…{address.slice(-8)}
                            </p>
                        )}
                    </div>

                    {/* ── Biometric unlock ── */}
                    <AnimatePresence>
                        {biometricAvailable && (
                            <motion.div
                                key="bio"
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="space-y-2.5"
                            >
                                <button
                                    type="button"
                                    onClick={() => handleBiometricUnlock()}
                                    disabled={biometricLoading}
                                    className="w-full py-3.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2.5"
                                    style={{
                                        background: "linear-gradient(135deg, #FF6B6B 0%, #ff5252 100%)",
                                        boxShadow: "0 6px 20px rgba(255,107,107,0.32)",
                                        fontFamily: "JetBrains Mono, Monaco, 'Courier New', monospace",
                                        letterSpacing: "0.05em",
                                    }}
                                >
                                    {biometricLoading ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
                                                <path d="M12 2a10 10 0 0 1 10 10" />
                                            </svg>
                                            Authenticating…
                                        </>
                                    ) : (
                                        <>
                                            {/* Fingerprint icon */}
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                                            </svg>
                                            Unlock with Biometrics
                                        </>
                                    )}
                                </button>

                                {biometricError && (
                                    <motion.p
                                        key="bio-err"
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-xs text-red-500 font-mono bg-red-50 border border-red-100 rounded-lg px-3 py-2"
                                    >
                                        {biometricError}
                                    </motion.p>
                                )}

                                {/* Divider */}
                                <div className="relative flex items-center gap-2 py-0.5">
                                    <div className="h-px flex-1 bg-black/8" />
                                    <span
                                        className="text-[10px] font-mono text-gray-400 uppercase tracking-widest px-1"
                                    >
                                        or password
                                    </span>
                                    <div className="h-px flex-1 bg-black/8" />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Password input */}
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                            placeholder="Enter password to unlock"
                            autoFocus
                            // biome-ignore lint/a11y/noAutofocus: unlock prompt
                            className="w-full font-mono text-sm py-3 px-4 pr-14 rounded-xl border border-black/10 bg-white focus:outline-none focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/20 placeholder:text-gray-400 transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-mono text-gray-400 hover:text-[#FF6B6B] uppercase tracking-wide transition-colors"
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                        {error && (
                            <motion.p
                                key="err"
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="text-xs text-red-500 font-mono bg-red-50 border border-red-100 rounded-lg px-3 py-2"
                            >
                                {error}
                            </motion.p>
                        )}
                    </AnimatePresence>

                    {/* Unlock button */}
                    <button
                        type="button"
                        onClick={handleUnlock}
                        disabled={!password || isUnlocking}
                        className="w-full py-3.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
                        style={{
                            background: "linear-gradient(135deg, #FF6B6B 0%, #ff5252 100%)",
                            boxShadow: "0 6px 20px rgba(255,107,107,0.32)",
                            fontFamily: "JetBrains Mono, Monaco, 'Courier New', monospace",
                            letterSpacing: "0.05em",
                        }}
                    >
                        {isUnlocking ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
                                    <path d="M12 2a10 10 0 0 1 10 10" />
                                </svg>
                                Unlocking…
                            </>
                        ) : (
                            "Unlock Wallet"
                        )}
                    </button>

                    {/* Use different wallet */}
                    <div className="text-center">
                        <button
                            type="button"
                            onClick={handleForget}
                            className="text-[11px] font-mono text-gray-400 hover:text-red-400 transition-colors"
                        >
                            Use a different wallet
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* ── BOTTOM: full artwork section (52% of screen) ── */}
            <div className="relative flex-shrink-0" style={{ height: "52%" }}>
                {/* Coral radial glow behind the tree */}
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        background:
                            "radial-gradient(ellipse 80% 70% at 50% 80%, rgba(255,107,107,0.16) 0%, rgba(255,107,107,0) 65%)",
                    }}
                    aria-hidden="true"
                />

                {/* Full artwork — object-contain so the whole illustration is always visible */}
                <motion.img
                    src="/wait.png"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none select-none w-full h-full"
                    style={{ objectFit: "contain", objectPosition: "bottom center" }}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.22, ease: "easeOut" }}
                />

                {/* Fade: top edge of image melts into the dotted background */}
                <div
                    className="pointer-events-none absolute inset-x-0 top-0"
                    style={{
                        height: "30%",
                        background: "linear-gradient(to bottom, #F0EDED 0%, transparent 100%)",
                    }}
                    aria-hidden="true"
                />

                {/* Footer tag sits at the very bottom */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.55 }}
                    className="absolute bottom-6 inset-x-0 text-center pointer-events-none"
                    style={{
                        fontFamily: "JetBrains Mono, Monaco, 'Courier New', monospace",
                        fontSize: "9px",
                        letterSpacing: "0.28em",
                        textTransform: "uppercase",
                        color: "#BBBBBB",
                    }}
                >
                    Encrypted · Zero-Knowledge · Self-Custodial
                </motion.p>
            </div>
        </motion.div>
    );
}
