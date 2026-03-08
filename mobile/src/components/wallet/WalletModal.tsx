/**
 * WalletModal.tsx — MetaMask-style self-custodial wallet
 * Mobile-first, smooth animations, password-gated manage section.
 *
 * Views:
 *   menu        – choose how to connect
 *   unlock      – vault exists, enter password to unlock
 *   create-1    – show newly generated 12-word phrase
 *   create-2    – quiz: confirm 2 random words
 *   create-3    – set password, save & connect
 *   import-menu – choose import method
 *   import-srp  – enter 12-word phrase + password
 *   import-pk   – enter private key + password
 *   connected   – wallet dashboard
 *   manage      – password-gated: reveal phrase/key, danger zone
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConnect, useDisconnect } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import {
  createMnemonic,
  isValidMnemonic,
  deriveFromMnemonic,
  parsePrivateKey,
  saveHDVault,
  saveImportedVault,
  clearVault,
  clearSession,
  getStoredVault,
  getSession,
} from "../../lib/localWallet";
import {
  isBiometricAvailable,
  hasBiometricCredential,
  registerBiometric,
  clearBiometricCredential,
} from "../../lib/biometricAuth";
import { LOCAL_WALLET_CONNECTOR_ID } from "../../lib/localWalletConnector";
import {
  ACTIVE_CHAIN_NAME,
  ACTIVE_CHAIN_ID,
  ACTIVE_CURRENCY_SYMBOL,
  ACTIVE_EXPLORER,
} from "../../config/walletChain";
import { privateKeyToAccount } from "viem/accounts";

// ─── Types ────────────────────────────────────────────────────────────────────

type View =
  | "menu"
  | "unlock"
  | "create-1"
  | "create-2"
  | "create-3"
  | "import-menu"
  | "import-srp"
  | "import-pk"
  | "connected"
  | "manage";

export interface WalletModalProps {
  isOpen: boolean;
  defaultView?: View;
  connectedAddress?: `0x${string}`;
  onClose: () => void;
  onConnected?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(s: string, h = 8, t = 6) {
  return s.length <= h + t + 3 ? s : `${s.slice(0, h)}...${s.slice(-t)}`;
}

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { return false; }
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir * 40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -40, opacity: 0 }),
};

const slideTransition = { type: "tween", duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] as number[] };

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size = 18, color = "#FF6B6B" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2.5} strokeLinecap="round" className="animate-spin">
      <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

// ─── Loader overlay ───────────────────────────────────────────────────────────

function LoaderOverlay({ label }: { label: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#F5F5F5]/90 backdrop-blur-sm rounded-t-[28px] md:rounded-[20px]">
      <div className="w-14 h-14 rounded-full bg-[#FF6B6B]/10 flex items-center justify-center">
        <Spinner size={28} />
      </div>
      <p className="text-sm font-medium text-black">{label}</p>
    </motion.div>
  );
}

// ─── Shared mini-components ───────────────────────────────────────────────────

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button"
      onClick={async () => { if (await copyText(text)) { setCopied(true); setTimeout(() => setCopied(false), 2000); } }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 bg-white text-xs font-mono uppercase tracking-wide text-gray-600 hover:border-[#FF6B6B] hover:text-[#FF6B6B] active:scale-95 transition-all shrink-0 shadow-sm">
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span key="ok" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-1">
            <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Copied
          </motion.span>
        ) : (
          <motion.span key="copy" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>{label}</motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

function PasswordInput({ value, onChange, placeholder = "Password", id, autoFocus, onEnter }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  id?: string; autoFocus?: boolean; onEnter?: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? "text" : "password"} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        autoComplete="new-password" autoFocus={autoFocus}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        className="w-full font-mono text-sm py-3.5 px-4 pr-16 rounded-xl border border-black/10 bg-white/90 focus:outline-none focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/20 placeholder:text-gray-400 transition-all shadow-sm" />
      <button type="button" onClick={() => setShow((s) => !s)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-400 hover:text-[#FF6B6B] uppercase tracking-wide transition-colors">
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function BackButton({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide text-gray-400 hover:text-[#FF6B6B] transition-colors active:scale-95">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </button>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      className="text-xs text-red-500 font-mono bg-red-50 border border-red-200 rounded-lg px-3 py-2 leading-relaxed">
      {msg}
    </motion.p>
  );
}

function PrimaryButton({ children, onClick, disabled, loading, danger }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; danger?: boolean;
}) {
  return (
    <button type="button" disabled={disabled || loading} onClick={onClick}
      className={["w-full py-4 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm",
        danger ? "bg-red-500 text-white hover:bg-red-600 disabled:opacity-40" : "bg-[#FF6B6B] text-white hover:bg-[#ff5252] disabled:opacity-40"].join(" ")}>
      {loading && <Spinner size={16} color="white" />}
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, disabled }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className="w-full py-3.5 rounded-xl border border-black/10 bg-white/70 text-sm font-medium text-gray-700 hover:border-[#FF6B6B] hover:text-[#FF6B6B] transition-all active:scale-[0.98] shadow-sm disabled:opacity-40">
      {children}
    </button>
  );
}

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center">
      {Array.from({ length: total }, (_, i) => (
        <motion.div key={i}
          animate={{ width: i === current ? 20 : 6, backgroundColor: i === current ? "#FF6B6B" : "#d1d5db" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="h-1.5 rounded-full" />
      ))}
    </div>
  );
}

// ─── Unlock view ──────────────────────────────────────────────────────────────

function UnlockView({ onUnlocked, onForgot }: { onUnlocked: () => void; onForgot: () => void }) {
  const vault = getStoredVault();
  const { connectors, connect, isPending } = useConnect();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUnlock = useCallback(async () => {
    if (!password) return;
    setError(null); setLoading(true);
    try {
      const { unlockVault } = await import("../../lib/localWallet");
      await unlockVault(password);
      // biome-ignore lint/suspicious/noExplicitAny: global bridge
      (globalThis as any).__avacadoResetLocalWalletProvider?.();
      const connector = connectors.find((c) => c.id === LOCAL_WALLET_CONNECTOR_ID);
      if (connector) connect({ connector }, { onSuccess: onUnlocked, onError: (err) => { setError(err.message); setLoading(false); } });
    } catch (err) { setError((err as Error).message); setLoading(false); }
  }, [password, connectors, connect, onUnlocked]);

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-[#FF6B6B]/8 to-[#FF6B6B]/4 border border-[#FF6B6B]/20 p-4 rounded-2xl flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-[#FF6B6B]/15 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-[#FF6B6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-black">{vault?.type === "hd" ? "HD Wallet" : "Imported Wallet"}</p>
            <span className="text-[10px] font-mono bg-[#FF6B6B]/10 text-[#FF6B6B] px-1.5 py-0.5 rounded-md uppercase tracking-wide">
              {vault?.type === "hd" ? "12-word" : "key"}
            </span>
          </div>
          <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{truncate(vault?.address ?? "", 10, 8)}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="unlock-pw" className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-1">Password</label>
        <PasswordInput id="unlock-pw" value={password} onChange={setPassword} placeholder="Enter your wallet password" autoFocus onEnter={handleUnlock} />
      </div>
      {error && <ErrorMsg msg={error} />}
      <PrimaryButton onClick={handleUnlock} loading={loading || isPending} disabled={!password}>
        {loading || isPending ? "Unlocking…" : "Unlock Wallet"}
      </PrimaryButton>
      <button type="button" onClick={onForgot}
        className="w-full text-center text-xs font-mono text-gray-400 hover:text-red-500 transition-colors py-1">
        Forgot password? Reset wallet
      </button>
    </div>
  );
}

// ─── Create step 1 – show mnemonic ────────────────────────────────────────────

function Create1View({ mnemonic, onNext, onBack }: { mnemonic: string; onNext: () => void; onBack: () => void }) {
  const words = mnemonic.split(" ");
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-5">
      <BackButton onClick={onBack} />
      <StepDots total={3} current={0} />
      <div>
        <p className="text-base font-semibold text-black">Your Recovery Phrase</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          Write these 12 words down in order and store them safely. They restore your wallet on any device.
        </p>
      </div>
      <div className="relative">
        <div className={`grid grid-cols-3 gap-2 ${!revealed ? "select-none" : ""}`}>
          {words.map((word, i) => (
            <motion.div key={`w${i}`}
              initial={revealed ? { scale: 0.9, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: revealed ? i * 0.03 : 0 }}
              className={`bg-white border border-black/8 px-2 py-2.5 rounded-xl text-center shadow-sm transition-all ${!revealed ? "blur-sm" : ""}`}>
              <span className="text-[9px] text-gray-400 font-mono block">{i + 1}</span>
              <p className="text-xs font-mono font-semibold text-black mt-0.5 break-all leading-tight">{word}</p>
            </motion.div>
          ))}
        </div>
        {!revealed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} type="button"
              onClick={() => setRevealed(true)}
              className="px-6 py-3 rounded-2xl bg-[#FF6B6B] text-white font-semibold text-sm shadow-xl shadow-[#FF6B6B]/30 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Reveal Phrase
            </motion.button>
          </div>
        )}
      </div>
      <AnimatePresence>
        {revealed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
            <button type="button"
              onClick={async () => { if (await copyText(mnemonic)) { setCopied(true); setTimeout(() => setCopied(false), 2000); } }}
              className="inline-flex items-center gap-2 text-xs font-mono text-gray-500 hover:text-[#FF6B6B] transition-colors py-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? "✓ Copied all words" : "Copy all 12 words"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex gap-2.5">
        <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-gray-600 leading-relaxed"><strong>Never share this.</strong> Avacado will never ask for it.</p>
      </div>
      <PrimaryButton onClick={onNext} disabled={!revealed}>I've Written It Down →</PrimaryButton>
    </div>
  );
}

// ─── Create step 2 – confirm 2 random words ───────────────────────────────────

function Create2View({ mnemonic, onNext, onBack }: { mnemonic: string; onNext: () => void; onBack: () => void }) {
  const words = useMemo(() => mnemonic.split(" "), [mnemonic]);
  const [indices] = useState<[number, number]>(() => {
    let a = Math.floor(Math.random() * 12);
    let b = Math.floor(Math.random() * 12);
    while (b === a) b = Math.floor(Math.random() * 12);
    return [a, b].sort((x, y) => x - y) as [number, number];
  });
  const ref0 = useRef<HTMLInputElement>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const [ans1, setAns1] = useState("");
  const [ans2, setAns2] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleVerify = () => {
    const ok1 = ans1.trim().toLowerCase() === words[indices[0]];
    const ok2 = ans2.trim().toLowerCase() === words[indices[1]];
    if (!ok1 || !ok2) {
      setError("Incorrect words. Check your backup and try again.");
      if (!ok1) ref0.current?.focus(); else ref1.current?.focus();
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-5">
      <BackButton onClick={onBack} />
      <StepDots total={3} current={1} />
      <div>
        <p className="text-base font-semibold text-black">Confirm Your Backup</p>
        <p className="text-xs text-gray-500 mt-1">Enter the words at the positions below to confirm you saved your phrase.</p>
      </div>
      <div className="space-y-3">
        {indices.map((idx, i) => (
          <div key={idx} className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-1">Word #{idx + 1}</label>
            <input ref={i === 0 ? ref0 : ref1} type="text" value={i === 0 ? ans1 : ans2}
              onChange={(e) => (i === 0 ? setAns1(e.target.value) : setAns2(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              placeholder={`Enter word #${idx + 1}`} autoComplete="off" spellCheck={false} autoCapitalize="none"
              className="w-full font-mono text-sm py-3.5 px-4 rounded-xl border border-black/10 bg-white/90 focus:outline-none focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/20 placeholder:text-gray-400 shadow-sm transition-all" />
          </div>
        ))}
      </div>
      {error && <ErrorMsg msg={error} />}
      <PrimaryButton onClick={handleVerify} disabled={!ans1.trim() || !ans2.trim()}>Verify & Continue →</PrimaryButton>
    </div>
  );
}

// ─── Create step 3 – set password ─────────────────────────────────────────────

function Create3View({ mnemonic, onDone, onBack }: { mnemonic: string; onDone: () => void; onBack: () => void }) {
  const { connectors, connect, isPending } = useConnect();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = Math.min(4, Math.floor(password.length / 3));
  const strengthColors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-green-500"];
  const strengthLabels = ["Too short", "Weak", "Fair", "Good", "Strong"];

  const handleCreate = useCallback(async () => {
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    try {
      const { address } = deriveFromMnemonic(mnemonic, 0);
      await saveHDVault(mnemonic, 0, address, password);
      // biome-ignore lint/suspicious/noExplicitAny: global bridge
      (globalThis as any).__avacadoResetLocalWalletProvider?.();
      const { unlockVault } = await import("../../lib/localWallet");
      await unlockVault(password);
      const connector = connectors.find((c) => c.id === LOCAL_WALLET_CONNECTOR_ID);
      if (connector) connect({ connector }, { onSuccess: onDone, onError: (err) => { setError(err.message); setLoading(false); } });
    } catch (err) { setError((err as Error).message); setLoading(false); }
  }, [mnemonic, password, confirm, connectors, connect, onDone]);

  return (
    <div className="space-y-5">
      <BackButton onClick={onBack} />
      <StepDots total={3} current={2} />
      <div>
        <p className="text-base font-semibold text-black">Protect Your Wallet</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">This password encrypts your wallet on this device. Your 12-word phrase is the only way to restore it elsewhere.</p>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="create-pw" className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-1">
            New Password <span className="text-gray-300">(min 8 chars)</span>
          </label>
          <PasswordInput id="create-pw" value={password} onChange={setPassword} placeholder="Enter password" autoFocus />
          {password.length > 0 && (
            <div className="px-1 space-y-1">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength - 1 ? strengthColors[strength] : "bg-gray-200"}`} />
                ))}
              </div>
              <p className={`text-[10px] font-mono ${strength >= 3 ? "text-green-600" : "text-gray-400"}`}>{strengthLabels[strength]}</p>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="create-pw2" className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-1">Confirm Password</label>
          <PasswordInput id="create-pw2" value={confirm} onChange={setConfirm} placeholder="Repeat password" onEnter={handleCreate} />
          {confirm.length > 0 && password.length > 0 && (
            <p className={`text-[10px] font-mono px-1 ${confirm === password ? "text-green-600" : "text-red-400"}`}>
              {confirm === password ? "✓ Passwords match" : "Passwords don't match"}
            </p>
          )}
        </div>
      </div>
      {error && <ErrorMsg msg={error} />}
      <PrimaryButton onClick={handleCreate} loading={loading || isPending} disabled={!password || !confirm}>
        {loading || isPending ? "Creating Wallet…" : "Create Wallet"}
      </PrimaryButton>
    </div>
  );
}

// ─── Import menu ──────────────────────────────────────────────────────────────

function ImportMenuView({ onSelect, onBack }: { onSelect: (m: "srp" | "pk") => void; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <BackButton onClick={onBack} />
      <p className="text-base font-semibold text-black">How do you want to import?</p>
      <button type="button" onClick={() => onSelect("srp")}
        className="group bg-white border border-black/8 hover:border-[#FF6B6B] w-full p-4 rounded-2xl flex items-start gap-3 text-left transition-all active:scale-[0.98] shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-[#FF6B6B]/10 group-hover:bg-[#FF6B6B]/15 flex items-center justify-center shrink-0 transition-colors">
          <svg className="w-5 h-5 text-[#FF6B6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-black">Recovery Phrase</p>
          <p className="text-xs text-gray-500 mt-0.5">12 words — restores full HD wallet on any device</p>
        </div>
        <svg className="w-4 h-4 text-gray-300 group-hover:text-[#FF6B6B] ml-auto self-center transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <button type="button" onClick={() => onSelect("pk")}
        className="group bg-white border border-black/8 hover:border-[#FF6B6B] w-full p-4 rounded-2xl flex items-start gap-3 text-left transition-all active:scale-[0.98] shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center shrink-0 transition-colors">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-black">Private Key</p>
          <p className="text-xs text-gray-500 mt-0.5">Single account — must re-import on each device</p>
        </div>
        <svg className="w-4 h-4 text-gray-300 group-hover:text-[#FF6B6B] ml-auto self-center transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

// ─── Import SRP ───────────────────────────────────────────────────────────────

function ImportSRPView({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const { connectors, connect, isPending } = useConnect();
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const trimmedPhrase = phrase.trim().replace(/\s+/g, " ").toLowerCase();
  const wordCount = trimmedPhrase ? trimmedPhrase.split(" ").length : 0;

  const handleImport = useCallback(async () => {
    setError(null);
    if (!isValidMnemonic(trimmedPhrase)) { setError("Invalid recovery phrase. Please check all 12 words."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    try {
      const { address } = deriveFromMnemonic(trimmedPhrase, 0);
      await saveHDVault(trimmedPhrase, 0, address, password);
      // biome-ignore lint/suspicious/noExplicitAny: global bridge
      (globalThis as any).__avacadoResetLocalWalletProvider?.();
      const { unlockVault } = await import("../../lib/localWallet");
      await unlockVault(password);
      const connector = connectors.find((c) => c.id === LOCAL_WALLET_CONNECTOR_ID);
      if (connector) connect({ connector }, { onSuccess: onDone, onError: (err) => { setError(err.message); setLoading(false); } });
    } catch (err) { setError((err as Error).message); setLoading(false); }
  }, [trimmedPhrase, password, confirm, connectors, connect, onDone]);

  return (
    <div className="space-y-5">
      <BackButton onClick={onBack} />
      <div>
        <p className="text-base font-semibold text-black">Enter Recovery Phrase</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">Enter your 12-word BIP-39 phrase. Same phrase = same wallet on any device.</p>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <label htmlFor="srp-input" className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Recovery phrase</label>
          <span className={`text-[11px] font-mono ${wordCount === 12 ? "text-green-600" : "text-gray-400"}`}>{wordCount}/12 words</span>
        </div>
        <textarea id="srp-input" rows={3} value={phrase} onChange={(e) => setPhrase(e.target.value)}
          placeholder="word1 word2 word3 … word12" autoComplete="off" autoCorrect="off" spellCheck={false} autoCapitalize="none"
          className="w-full font-mono text-sm py-3.5 px-4 rounded-xl border border-black/10 bg-white/90 focus:outline-none focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/20 resize-none placeholder:text-gray-400 shadow-sm transition-all" />
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="srp-pw" className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-1">New Password <span className="text-gray-300">(min 8 chars)</span></label>
          <PasswordInput id="srp-pw" value={password} onChange={setPassword} placeholder="Protect this device" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="srp-pw2" className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-1">Confirm Password</label>
          <PasswordInput id="srp-pw2" value={confirm} onChange={setConfirm} placeholder="Repeat password" onEnter={handleImport} />
        </div>
      </div>
      {error && <ErrorMsg msg={error} />}
      <PrimaryButton onClick={handleImport} loading={loading || isPending} disabled={wordCount !== 12 || !password || !confirm}>
        {loading || isPending ? "Importing…" : "Import Wallet"}
      </PrimaryButton>
    </div>
  );
}

// ─── Import Private Key ───────────────────────────────────────────────────────

function ImportPKView({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const { connectors, connect, isPending } = useConnect();
  const [rawKey, setRawKey] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const preview = useMemo(() => {
    try { return privateKeyToAccount(parsePrivateKey(rawKey)).address; } catch { return null; }
  }, [rawKey]);

  const handleImport = useCallback(async () => {
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    try {
      const pk = parsePrivateKey(rawKey);
      const address = privateKeyToAccount(pk).address;
      await saveImportedVault(pk, address, password);
      // biome-ignore lint/suspicious/noExplicitAny: global bridge
      (globalThis as any).__avacadoResetLocalWalletProvider?.();
      const { unlockVault } = await import("../../lib/localWallet");
      await unlockVault(password);
      const connector = connectors.find((c) => c.id === LOCAL_WALLET_CONNECTOR_ID);
      if (connector) connect({ connector }, { onSuccess: onDone, onError: (err) => { setError(err.message); setLoading(false); } });
    } catch (err) { setError((err as Error).message); setLoading(false); }
  }, [rawKey, password, confirm, connectors, connect, onDone]);

  return (
    <div className="space-y-5">
      <BackButton onClick={onBack} />
      <div>
        <p className="text-base font-semibold text-black">Import Private Key</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">Imports a single account. Not linked to a recovery phrase.</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="pk-input" className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-1">Private key (hex)</label>
        <textarea id="pk-input" rows={2} value={rawKey} onChange={(e) => setRawKey(e.target.value)}
          placeholder="0x… or 64 hex characters" autoComplete="off" autoCorrect="off" spellCheck={false}
          className="w-full font-mono text-sm py-3.5 px-4 rounded-xl border border-black/10 bg-white/90 focus:outline-none focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/20 resize-none placeholder:text-gray-400 shadow-sm transition-all" />
        <AnimatePresence>
          {preview && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-xs font-mono text-green-600 flex items-center gap-1.5 px-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {truncate(preview, 14, 10)}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="pk-pw" className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-1">New Password <span className="text-gray-300">(min 8 chars)</span></label>
          <PasswordInput id="pk-pw" value={password} onChange={setPassword} placeholder="Protect this device" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="pk-pw2" className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-1">Confirm Password</label>
          <PasswordInput id="pk-pw2" value={confirm} onChange={setConfirm} placeholder="Repeat password" onEnter={handleImport} />
        </div>
      </div>
      <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex gap-2.5">
        <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-gray-600 leading-relaxed">Only use testnet keys. Never paste a mainnet private key into any web app.</p>
      </div>
      {error && <ErrorMsg msg={error} />}
      <PrimaryButton onClick={handleImport} loading={loading || isPending} disabled={!preview || !password || !confirm}>
        {loading || isPending ? "Importing…" : "Import Account"}
      </PrimaryButton>
    </div>
  );
}

// ─── Wallet home view (address always visible · secrets password-gated inline) ─

function ManageView({ onDisconnect, onSwitchToCreate, onSwitchToImport }: { onDisconnect: () => void; onSwitchToCreate?: () => void; onSwitchToImport?: () => void }) {
  const vault = getStoredVault();
  const address = (vault?.address ?? "") as `0x${string}`;

  const [secretsUnlocked, setSecretsUnlocked] = useState(false);
  const [currentSession, setCurrentSession] = useState<ReturnType<typeof getSession>>(null);
  const [password, setPassword] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [keyRevealed, setKeyRevealed] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<"create" | "import" | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  // Biometric state
  const [bioDeviceSupport, setBioDeviceSupport] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioMsg, setBioMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    isBiometricAvailable().then((avail) => {
      setBioDeviceSupport(avail);
      setBioEnabled(hasBiometricCredential());
    });
  }, []);

  const handleUnlock = useCallback(async () => {
    if (!password) return;
    setUnlockError(null); setUnlocking(true);
    try {
      const { unlockVault } = await import("../../lib/localWallet");
      const s = await unlockVault(password);
      setCurrentSession(s); setSecretsUnlocked(true);
    } catch (err) { setUnlockError((err as Error).message); }
    finally { setUnlocking(false); }
  }, [password]);

  return (
    <div className="space-y-4">

      {/* ── Address card (always visible) ── */}
      <div className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2.5">
          <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          <p className="text-[11px] font-semibold text-green-600 uppercase tracking-widest">Connected</p>
          <span className="ml-auto text-[10px] font-mono bg-[#FF6B6B]/10 text-[#FF6B6B] px-1.5 py-0.5 rounded-md uppercase tracking-wide shrink-0">
            {vault?.type === "hd" ? "HD Wallet" : "Imported"}
          </span>
        </div>
        <p className="text-[10px] text-gray-400 font-mono mb-2">{ACTIVE_CHAIN_NAME} · {ACTIVE_CURRENCY_SYMBOL} · Chain {ACTIVE_CHAIN_ID}</p>
        <p className="text-xs font-mono text-gray-800 break-all leading-relaxed mb-3">{address}</p>
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton text={address} label="Copy Address" />
          <a href={`${ACTIVE_EXPLORER}/address/${address}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-mono text-[#FF6B6B] hover:underline transition-opacity hover:opacity-80">
            Explorer
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* ── Secrets section ── */}
      {!secretsUnlocked ? (
        /* Inline password gate */
        <div className="bg-[#FF6B6B]/5 border border-[#FF6B6B]/20 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FF6B6B]/10 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-[#FF6B6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-black">Private Keys</p>
              <p className="text-xs text-gray-500">Password required to reveal</p>
            </div>
          </div>
          <PasswordInput value={password} onChange={setPassword}
            placeholder="Enter wallet password to reveal keys"
            onEnter={handleUnlock} />
          {unlockError && <ErrorMsg msg={unlockError} />}
          <PrimaryButton onClick={handleUnlock} loading={unlocking} disabled={!password}>
            {unlocking ? "Unlocking…" : "Unlock to Reveal Keys"}
          </PrimaryButton>
        </div>
      ) : (
        <>
          {/* Private key */}
          {currentSession?.privateKey && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
              <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Private Key</p>
                  <p className="text-xs text-amber-600/70 mt-0.5">64-char hex</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {keyRevealed && <CopyButton text={currentSession.privateKey} />}
                  <button type="button" onClick={() => setKeyRevealed((r) => !r)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-100 text-xs font-mono uppercase tracking-wide text-amber-700 hover:border-amber-400 active:scale-95 transition-all">
                    {keyRevealed ? "Hide" : "Reveal"}
                  </button>
                </div>
              </div>
              <div className={`px-4 pb-4 transition-all duration-200 ${keyRevealed ? "" : "blur-sm select-none pointer-events-none"}`}>
                <p className="font-mono text-xs text-black break-all bg-amber-100/60 border border-amber-200 px-3 py-2.5 rounded-xl leading-relaxed">
                  {currentSession.privateKey}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Biometric unlock settings ── */}
      {bioDeviceSupport && (
        <div className="bg-white border border-black/8 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FF6B6B]/10 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-[#FF6B6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-black">Biometric Unlock</p>
              <p className="text-xs text-gray-500">
                {bioEnabled ? "Face ID / Touch ID / Fingerprint enabled" : "Unlock with Face ID, Touch ID or fingerprint"}
              </p>
            </div>
            {bioEnabled && (
              <span className="ml-auto text-[10px] font-mono bg-green-100 text-green-600 px-1.5 py-0.5 rounded-md uppercase tracking-wide shrink-0">
                On
              </span>
            )}
          </div>

          <AnimatePresence>
            {bioMsg && (
              <motion.p
                key={bioMsg.text}
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`text-xs font-mono px-3 py-2 rounded-lg border ${
                  bioMsg.type === "ok"
                    ? "text-green-700 bg-green-50 border-green-200"
                    : "text-red-600 bg-red-50 border-red-100"
                }`}
              >
                {bioMsg.text}
              </motion.p>
            )}
          </AnimatePresence>

          {bioEnabled ? (
            <SecondaryButton
              onClick={() => {
                clearBiometricCredential();
                setBioEnabled(false);
                setBioMsg({ type: "ok", text: "Biometric unlock disabled." });
              }}
            >
              <span className="text-red-500">Disable Biometric</span>
            </SecondaryButton>
          ) : secretsUnlocked ? (
            <PrimaryButton
              loading={bioLoading}
              onClick={async () => {
                setBioLoading(true);
                setBioMsg(null);
                try {
                  await registerBiometric(password, address);
                  setBioEnabled(true);
                  setBioMsg({ type: "ok", text: "Biometric unlock enabled ✔" });
                } catch {
                  setBioMsg({ type: "err", text: "Setup failed — tap cancel or try again." });
                } finally {
                  setBioLoading(false);
                }
              }}
            >
              {bioLoading ? "Setting up…" : "Enable Biometric Unlock"}
            </PrimaryButton>
          ) : (
            <p className="text-[11px] font-mono text-gray-400">
              Unlock your keys above first to enable biometric.
            </p>
          )}
        </div>
      )}

      {/* ── Switch wallet ── */}
      {(onSwitchToCreate || onSwitchToImport) && (
        <div className="space-y-2">
          <p className="px-1 text-[10px] font-mono uppercase tracking-widest text-gray-400">Switch Wallet</p>
          <AnimatePresence mode="wait">
            {pendingSwitch ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-amber-700">Back up your phrase first!</p>
                    <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                      Your current wallet will be removed from this device. Make sure you've saved your recovery phrase.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPendingSwitch(null)}
                    className="flex-1 py-2.5 rounded-xl border border-black/10 text-xs text-gray-500 bg-white hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = pendingSwitch;
                      setPendingSwitch(null);
                      if (target === "create") onSwitchToCreate?.();
                      else onSwitchToImport?.();
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="buttons"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-2 gap-2"
              >
                {onSwitchToCreate && (
                  <button type="button" onClick={() => setPendingSwitch("create")}
                    className="py-3.5 rounded-2xl border border-black/8 bg-white text-xs font-medium text-gray-600 hover:border-[#FF6B6B] hover:text-[#FF6B6B] transition-all active:scale-[0.98] flex flex-col items-center gap-1.5 shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New
                  </button>
                )}
                {onSwitchToImport && (
                  <button type="button" onClick={() => setPendingSwitch("import")}
                    className="py-3.5 rounded-2xl border border-black/8 bg-white text-xs font-medium text-gray-600 hover:border-[#FF6B6B] hover:text-[#FF6B6B] transition-all active:scale-[0.98] flex flex-col items-center gap-1.5 shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Disconnect ── */}
      <AnimatePresence mode="wait">
        {confirmDisconnect ? (
          <motion.div
            key="confirm-disconnect"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-red-700">Disconnect wallet?</p>
                <p className="text-xs text-red-600/80 mt-0.5 leading-relaxed">Your wallet data stays on this device. You can reconnect anytime.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmDisconnect(false)}
                className="flex-1 py-2.5 rounded-xl border border-black/10 text-xs text-gray-500 bg-white hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={onDisconnect}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors">
                Yes, disconnect
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="disconnect-btn" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }}>
            <SecondaryButton onClick={() => setConfirmDisconnect(true)}>
              <span className="flex items-center justify-center gap-2 text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Disconnect
              </span>
            </SecondaryButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Learn more ── */}
      <a href="https://www.avacado.app/" target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 text-xs font-mono text-gray-400 hover:text-[#FF6B6B] transition-colors py-1">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Learn more about Avacado
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  );
}

// ─── Menu view ────────────────────────────────────────────────────────────────

function MenuView({ onSelectView, onConnectReown }: { onSelectView: (v: View) => void; onConnectReown: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 text-center">Self-custodial · Your keys, your crypto</p>
      <div className="grid grid-cols-2 gap-3">
        <motion.button type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
          onClick={() => onSelectView("create-1")}
          className="bg-gradient-to-br from-[#FF6B6B] to-[#ff5252] p-5 rounded-2xl flex flex-col items-center gap-3 text-center shadow-lg shadow-[#FF6B6B]/20">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Create Wallet</p>
            <p className="text-[10px] text-white/70 mt-0.5">New HD wallet</p>
          </div>
        </motion.button>
        <motion.button type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
          onClick={() => onSelectView("import-menu")}
          className="bg-white border border-black/8 p-5 rounded-2xl flex flex-col items-center gap-3 text-center shadow-sm hover:border-[#FF6B6B] transition-colors">
          <div className="w-10 h-10 rounded-full bg-[#FF6B6B]/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#FF6B6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-black">Import</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Phrase or key</p>
          </div>
        </motion.button>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-black/8" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">or</span>
        <div className="flex-1 h-px bg-black/8" />
      </div>
      <button type="button" onClick={onConnectReown}
        className="w-full py-3.5 rounded-2xl border border-black/8 bg-white text-sm font-medium text-gray-600 hover:border-[#FF6B6B] hover:text-[#FF6B6B] transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 300 185">
          <path d="M61.4 36.3c48.9-47.9 128.3-47.9 177.2 0l5.9 5.8a6.1 6.1 0 010 8.7l-20.2 19.8a3.2 3.2 0 01-4.5 0l-8.1-7.9c-34.1-33.4-89.4-33.4-123.5 0l-8.7 8.5a3.2 3.2 0 01-4.5 0L54.8 51.4a6.1 6.1 0 010-8.7l6.6-6.4zm218.9 40.8l18 17.6a6.1 6.1 0 010 8.7L183.5 196.5a6.3 6.3 0 01-9 0l-71.1-69.6a1.6 1.6 0 00-2.2 0L30 196.5a6.3 6.3 0 01-9 0L.2 178.9a6.1 6.1 0 010-8.7l114.8-112.4a6.3 6.3 0 019 0l71.1 69.6c.6.6 1.6.6 2.2 0l71.1-69.6a6.3 6.3 0 019 0l2.9 19.3z" />
        </svg>
        Connect with MetaMask / WalletConnect
      </button>
    </div>
  );
}

// ─── Root modal ───────────────────────────────────────────────────────────────

const VIEW_DEPTH: Record<View, number> = {
  menu: 0, unlock: 0,
  "create-1": 1, "create-2": 2, "create-3": 3,
  "import-menu": 1, "import-srp": 2, "import-pk": 2,
  connected: 0, manage: 0,
};

export function WalletModal({ isOpen, defaultView = "menu", connectedAddress, onClose, onConnected }: WalletModalProps) {
  const startView: View = connectedAddress || (getStoredVault() && getSession()) ? "manage" : getStoredVault() && !getSession() ? "unlock" : defaultView;
  const [view, setView] = useState<View>(startView);
  const [prevView, setPrevView] = useState<View>(startView);
  const [mnemonic, setMnemonic] = useState<string>(() => createMnemonic());
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalLoadingLabel, setGlobalLoadingLabel] = useState("Loading…");

  const { open: openReown } = useAppKit();
  const { disconnect } = useDisconnect();
  const slideDir = VIEW_DEPTH[view] >= VIEW_DEPTH[prevView] ? 1 : -1;

  const navigateTo = useCallback((next: View) => { setPrevView(view); setView(next); }, [view]);

  useEffect(() => {
    if (isOpen) {
      setMnemonic(createMnemonic());
      const next = connectedAddress || (getStoredVault() && getSession())
        ? "manage"
        : getStoredVault() && !getSession()
          ? "unlock"
          : defaultView;
      setPrevView(next); setView(next);
    }
  }, [isOpen, defaultView, connectedAddress]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleConnected = useCallback(() => {
    setGlobalLoading(true); setGlobalLoadingLabel("Setting up wallet…");
    setTimeout(() => {
      setGlobalLoading(false);
      window.dispatchEvent(new CustomEvent("avacado:splash")); // show splash before page change
      onConnected?.();
      navigateTo("manage");
    }, 600);
  }, [onConnected, navigateTo]);

  const handleDisconnect = useCallback(() => {
    setGlobalLoading(true); setGlobalLoadingLabel("Locking wallet…");
    clearSession();
    // biome-ignore lint/suspicious/noExplicitAny: global bridge
    (globalThis as any).__avacadoResetLocalWalletProvider?.();
    disconnect();
    window.dispatchEvent(new CustomEvent("avacado:lock"));
    setTimeout(() => { setGlobalLoading(false); onClose(); }, 600);
  }, [disconnect, onClose]);

  const handleConnectReown = useCallback(() => { onClose(); openReown({ view: "Connect" }); }, [onClose, openReown]);
  const handleForgotPassword = useCallback(() => { clearVault(); navigateTo("menu"); }, [navigateTo]);

  const handleSwitchToCreate = useCallback(() => {
    clearVault();
    // biome-ignore lint/suspicious/noExplicitAny: global bridge
    (globalThis as any).__avacadoResetLocalWalletProvider?.();
    disconnect();
    navigateTo("create-1");
  }, [disconnect, navigateTo]);

  const handleSwitchToImport = useCallback(() => {
    clearVault();
    // biome-ignore lint/suspicious/noExplicitAny: global bridge
    (globalThis as any).__avacadoResetLocalWalletProvider?.();
    disconnect();
    navigateTo("import-menu");
  }, [disconnect, navigateTo]);

  const titles: Record<View, string> = {
    menu: "Avacado Wallet", unlock: "Unlock Wallet",
    "create-1": "Recovery Phrase", "create-2": "Confirm Backup", "create-3": "Set Password",
    "import-menu": "Import Wallet", "import-srp": "Recovery Phrase", "import-pk": "Private Key",
    connected: "My Wallet", manage: "My Wallet",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px]"
            onClick={onClose} />
          <motion.div key="sheet"
            initial={{ y: "100%", opacity: 0.5 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 32, stiffness: 320, mass: 0.8 }}
            className={["fixed z-[101] bg-[#F5F5F5]",
              "bottom-0 left-0 right-0 rounded-t-[28px]",
              "md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
              "md:rounded-[20px] md:w-[440px]",
              "shadow-2xl shadow-black/20"].join(" ")}
            style={{ maxHeight: "92dvh", overflowY: "auto" }}>
            <div className="md:hidden flex justify-center pt-3 pb-1 sticky top-0 z-10">
              <div className="w-10 h-1 rounded-full bg-black/15" />
            </div>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/8 sticky top-5 md:top-0 bg-[#F5F5F5]/95 backdrop-blur-sm z-10">
              <p className="text-[15px] font-semibold text-black tracking-tight">{titles[view]}</p>
              <button type="button" onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/8 hover:bg-black/12 text-gray-500 transition-all active:scale-90">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="relative overflow-x-hidden">
              <AnimatePresence custom={slideDir} mode="wait" initial={false}>
                <motion.div key={view} custom={slideDir} variants={slideVariants}
                  initial="enter" animate="center" exit="exit" transition={slideTransition}
                  className="px-5 py-5 pb-[max(28px,env(safe-area-inset-bottom))]">
                  {view === "menu" && <MenuView onSelectView={navigateTo} onConnectReown={handleConnectReown} />}
                  {view === "unlock" && <UnlockView onUnlocked={handleConnected} onForgot={handleForgotPassword} />}
                  {view === "create-1" && <Create1View mnemonic={mnemonic} onNext={() => navigateTo("create-2")} onBack={() => navigateTo("menu")} />}
                  {view === "create-2" && <Create2View mnemonic={mnemonic} onNext={() => navigateTo("create-3")} onBack={() => navigateTo("create-1")} />}
                  {view === "create-3" && <Create3View mnemonic={mnemonic} onDone={handleConnected} onBack={() => navigateTo("create-2")} />}
                  {view === "import-menu" && <ImportMenuView onSelect={(m) => navigateTo(m === "srp" ? "import-srp" : "import-pk")} onBack={() => navigateTo("menu")} />}
                  {view === "import-srp" && <ImportSRPView onDone={handleConnected} onBack={() => navigateTo("import-menu")} />}
                  {view === "import-pk" && <ImportPKView onDone={handleConnected} onBack={() => navigateTo("import-menu")} />}
                  {view === "connected" && connectedAddress && <ManageView onDisconnect={handleDisconnect} onSwitchToCreate={handleSwitchToCreate} onSwitchToImport={handleSwitchToImport} />}
                  {view === "manage" && <ManageView onDisconnect={handleDisconnect} onSwitchToCreate={handleSwitchToCreate} onSwitchToImport={handleSwitchToImport} />}
                </motion.div>
              </AnimatePresence>
              <AnimatePresence>
                {globalLoading && <LoaderOverlay label={globalLoadingLabel} />}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
