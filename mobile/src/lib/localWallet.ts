/**
 * localWallet.ts
 *
 * Self-custodial HD wallet (BIP-39 / BIP-44) with AES-GCM encrypted vault.
 *
 * ─── Two wallet types ────────────────────────────────────────────────────────
 *
 *  A) HD wallet  (mnemonic / recovery phrase)
 *     - 12-word BIP-39 mnemonic
 *     - Derives accounts at m/44'/60'/0'/0/{index}
 *     - Portable: enter same 12 words on ANY device → same addresses
 *     - Balances are on-chain, automatically accessible everywhere
 *
 *  B) Imported private key
 *     - Single standalone account
 *     - Must be manually re-imported on every device
 *     - Not linked to any mnemonic
 *
 * ─── Security ────────────────────────────────────────────────────────────────
 *
 *  The vault is encrypted with AES-256-GCM using a key derived via PBKDF2
 *  (310 000 iterations, SHA-256) from the user's password.  Only the encrypted
 *  blob + salt + IV are stored in localStorage.  The password never leaves
 *  memory.
 *
 * ─── Cross-device portability ────────────────────────────────────────────────
 *
 *  HD wallet: write down your 12 words → type them on another device → done.
 *  Private-key import: export your key (reveal it in the UI) → paste on new
 *  device.
 */

import { privateKeyToAccount } from "viem/accounts";
import { generateMnemonic as scureGenerateMnemonic, validateMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { HDKey } from "@scure/bip32";
import { isHex, isAddress } from "viem";
import { clearBiometricCredential } from "./biometricAuth";

// ─── Storage key ──────────────────────────────────────────────────────────────

const VAULT_KEY = "avacado_vault_v2";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Unencrypted payload — lives only in memory while the app is open. */
export interface WalletPayload {
  type: "hd" | "imported";
  mnemonic?: string;
  privateKey: `0x${string}`;
  address: `0x${string}`;
  accountIndex: number;
}

/** Persisted to localStorage (encrypted). */
export interface EncryptedVault {
  type: "hd" | "imported";
  ciphertext: string; // base64 AES-GCM ciphertext
  salt: string;       // base64 PBKDF2 salt
  iv: string;         // base64 AES-GCM IV
  address: `0x${string}`; // unencrypted — for display before unlock
  accountIndex: number;
}

// ─── In-memory session ────────────────────────────────────────────────────────

let _session: WalletPayload | null = null;

export function getSession(): WalletPayload | null { return _session; }
export function clearSession(): void { _session = null; }

// ─── Web Crypto helpers ───────────────────────────────────────────────────────

function b64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

function bufferToB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310_000, hash: "SHA-256" },
    raw,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptText(plain: string, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(password, salt.buffer);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)
  );
  return {
    ciphertext: bufferToB64(cipher),
    salt: bufferToB64(salt.buffer),
    iv: bufferToB64(iv.buffer),
  };
}

async function decryptText(ciphertext: string, salt: string, iv: string, password: string): Promise<string> {
  const key = await deriveKey(password, b64ToBuffer(salt));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBuffer(iv) }, key, b64ToBuffer(ciphertext)
  );
  return new TextDecoder().decode(plain);
}

// ─── HD derivation ────────────────────────────────────────────────────────────

/**
 * Generate a fresh 12-word BIP-39 mnemonic.
 */
export function createMnemonic(): string {
  return scureGenerateMnemonic(wordlist, 128); // 128 bits = 12 words
}

/**
 * Validate user-supplied mnemonic.
 */
export function isValidMnemonic(phrase: string): boolean {
  try { return validateMnemonic(phrase.trim().toLowerCase(), wordlist); }
  catch { return false; }
}

/**
 * Derive private key + address from a mnemonic at a given account index.
 * Path: m/44'/60'/0'/0/{accountIndex}
 */
export function derivePrivateKeyFromMnemonic(
  mnemonic: string,
  accountIndex = 0
): `0x${string}` {
  const seed = mnemonicToSeedSync(mnemonic.trim());
  const master = HDKey.fromMasterSeed(seed);
  const child  = master.derive(`m/44'/60'/0'/0/${accountIndex}`);
  if (!child.privateKey) throw new Error("HD derivation failed.");
  return `0x${Buffer.from(child.privateKey).toString("hex")}` as `0x${string}`;
}

export function deriveFromMnemonic(
  mnemonic: string,
  accountIndex = 0
): { privateKey: `0x${string}`; address: `0x${string}` } {
  const privateKey = derivePrivateKeyFromMnemonic(mnemonic, accountIndex);
  const account    = privateKeyToAccount(privateKey);
  return { privateKey, address: account.address };
}

// ─── Private key helpers ──────────────────────────────────────────────────────

export function parsePrivateKey(raw: string): `0x${string}` {
  const trimmed = raw.trim();
  const key = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  if (!isHex(key) || key.length !== 66) {
    throw new Error("Invalid private key — expected 64 hex characters (optionally prefixed with 0x).");
  }
  return key as `0x${string}`;
}

// ─── Vault persistence ────────────────────────────────────────────────────────

export async function saveHDVault(
  mnemonic: string,
  accountIndex: number,
  address: `0x${string}`,
  password: string
): Promise<void> {
  const { ciphertext, salt, iv } = await encryptText(JSON.stringify({ mnemonic }), password);
  const vault: EncryptedVault = { type: "hd", ciphertext, salt, iv, address, accountIndex };
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
}

export async function saveImportedVault(
  privateKey: `0x${string}`,
  address: `0x${string}`,
  password: string
): Promise<void> {
  const { ciphertext, salt, iv } = await encryptText(JSON.stringify({ privateKey }), password);
  const vault: EncryptedVault = { type: "imported", ciphertext, salt, iv, address, accountIndex: 0 };
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
}

export function getStoredVault(): EncryptedVault | null {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as EncryptedVault;
    if (!v.ciphertext || !v.salt || !v.iv || !v.address) return null;
    if (!isAddress(v.address)) return null;
    return v;
  } catch { return null; }
}

export function getStoredAddress(): `0x${string}` | null {
  return getStoredVault()?.address ?? null;
}

export function hasStoredVault(): boolean {
  return getStoredVault() !== null;
}

/**
 * Decrypt the vault and populate the in-memory session.
 * Throws "Incorrect password." if the password is wrong.
 */
export async function unlockVault(password: string): Promise<WalletPayload> {
  const vault = getStoredVault();
  if (!vault) throw new Error("No wallet found. Create or import one first.");

  let plaintext: string;
  try {
    plaintext = await decryptText(vault.ciphertext, vault.salt, vault.iv, password);
  } catch {
    throw new Error("Incorrect password.");
  }

  const data = JSON.parse(plaintext) as { mnemonic?: string; privateKey?: `0x${string}` };

  let payload: WalletPayload;

  if (vault.type === "hd" && data.mnemonic) {
    const { privateKey, address } = deriveFromMnemonic(data.mnemonic, vault.accountIndex);
    payload = { type: "hd", mnemonic: data.mnemonic, privateKey, address, accountIndex: vault.accountIndex };
  } else if (vault.type === "imported" && data.privateKey) {
    const account = privateKeyToAccount(data.privateKey);
    payload = { type: "imported", privateKey: data.privateKey, address: account.address, accountIndex: 0 };
  } else {
    throw new Error("Corrupted vault data.");
  }

  _session = payload;
  return payload;
}

export function clearVault(): void {
  try { localStorage.removeItem(VAULT_KEY); } catch { /* ignore */ }
  try { clearBiometricCredential(); } catch { /* ignore */ }
  _session = null;
}

// ─── Backward-compat shims ────────────────────────────────────────────────────

export interface LocalWallet {
  privateKey: `0x${string}`;
  address: `0x${string}`;
}

/** Returns in-memory session as a LocalWallet (used by connector + NewLayout). */
export function getStoredWallet(): LocalWallet | null {
  const s = _session;
  if (!s) return null;
  return { privateKey: s.privateKey, address: s.address };
}

/** Private key for the connector — reads from in-memory session only. */
export function getStoredPrivateKey(): `0x${string}` | null {
  return _session?.privateKey ?? null;
}

/** Alias kept so existing call-sites compile. */
export function clearStoredWallet(): void { clearVault(); }

/** No-op shim: vault saving now happens via saveHDVault / saveImportedVault. */
// biome-ignore lint/suspicious/noExplicitAny: backward compat shim
export function saveWallet(_wallet: any): void { /* no-op */ }
