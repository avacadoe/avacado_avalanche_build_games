# Avacado Wallet — Developer Documentation

> Self-custodial HD wallet built into the Avacado dApp.  
> No third-party wallet required. Works like MetaMask.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Map](#file-map)
4. [Wallet Types](#wallet-types)
5. [Security Model](#security-model)
6. [Cryptographic Details](#cryptographic-details)
7. [Cross-Device Portability](#cross-device-portability)
8. [UI Flows](#ui-flows)
9. [Chain Configuration](#chain-configuration)
10. [API Reference](#api-reference)
11. [wagmi Integration](#wagmi-integration)
12. [Switching Chains](#switching-chains)
13. [Common Patterns](#common-patterns)

---

## Overview

The Avacado wallet is a fully self-custodial, in-browser Ethereum wallet. It:

- Generates a **12-word BIP-39 recovery phrase** (like MetaMask)
- Derives accounts via **BIP-44 HD paths** — same phrase = same address on any device
- Encrypts the vault with **AES-256-GCM + PBKDF2** so the raw key never touches localStorage
- Plugs into **wagmi v2** via a custom EIP-1193 connector — the rest of the app sees it as a normal connected wallet
- Currently targets **Avalanche Fuji Testnet** (chain ID `43113`)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  WalletModal.tsx  (UI)                                           │
│  Multi-step flow: menu → create/import → password → connected    │
└────────────────────────────┬─────────────────────────────────────┘
                             │ calls
┌────────────────────────────▼─────────────────────────────────────┐
│  localWallet.ts  (Core logic)                                    │
│  • BIP-39 mnemonic generation / validation                       │
│  • BIP-44 HD derivation  (m/44'/60'/0'/0/{index})               │
│  • AES-256-GCM vault encrypt / decrypt  (Web Crypto API)        │
│  • In-memory session (_session)                                  │
│  • localStorage vault (encrypted blob only)                      │
└────────────────────────────┬─────────────────────────────────────┘
                             │ provides private key to
┌────────────────────────────▼─────────────────────────────────────┐
│  localWalletConnector.ts  (wagmi connector)                      │
│  • Custom EIP-1193 provider built on viem WalletClient           │
│  • Registered in WagmiAdapter as a connector                     │
│  • Handles eth_requestAccounts, eth_sendTransaction, signing…    │
└────────────────────────────┬─────────────────────────────────────┘
                             │ injected into
┌────────────────────────────▼─────────────────────────────────────┐
│  AppKitProvider.tsx  (wagmi + Reown setup)                       │
│  • WagmiAdapter includes localWalletConnector()                  │
│  • Reown AppKit kept for MetaMask / WalletConnect fallback       │
└──────────────────────────────────────────────────────────────────┘
```

---

## File Map

| File | Purpose |
|------|---------|
| `src/config/walletChain.ts` | **Single file to change the active chain** |
| `src/lib/localWallet.ts` | Core wallet logic — HD derivation, vault encryption, session |
| `src/lib/localWalletConnector.ts` | wagmi v2 custom EIP-1193 connector |
| `src/components/wallet/WalletModal.tsx` | Full wallet UI (multi-step, mobile-first) |
| `src/components/wallet/index.ts` | Re-exports WalletModal |
| `src/AppKitProvider.tsx` | Registers connector with wagmi + Reown |

---

## Wallet Types

### A — HD Wallet (Recovery Phrase)

Created when the user goes through the **Create Wallet** flow.

- Generates a 12-word BIP-39 mnemonic (128 bits of entropy)
- Derives the private key at path `m/44'/60'/0'/0/0`
- **Portable** — typing the same 12 words on any device gives the same address
- Balances and transaction history are on-chain, automatically visible everywhere

```
Mnemonic (12 words)
    └─ BIP-39: mnemonicToSeedSync()
         └─ BIP-44: HDKey.derive("m/44'/60'/0'/0/0")
              └─ privateKey → viem account → address
```

### B — Imported Private Key

Used when the user chooses **Import → Private Key**.

- Single standalone account
- Not derived from a mnemonic
- Must be manually re-imported on every new device
- The key is encrypted and stored in the vault identically to HD wallets

---

## Security Model

### What is stored where

| Location | What's stored | Encrypted? |
|----------|---------------|------------|
| `localStorage` (`avacado_vault_v2`) | Vault blob: ciphertext + salt + IV + address (plaintext) + type | ✅ ciphertext encrypted |
| RAM (`_session`) | Full private key + mnemonic (HD only) | — cleared on page close |
| Network | Nothing | — never leaves the browser |

### Threat model

| Threat | Mitigation |
|--------|-----------|
| Attacker reads localStorage | Ciphertext is useless without the password |
| Weak password | PBKDF2 with 310,000 iterations makes brute-force expensive |
| JS XSS | Same as MetaMask — in-page wallets share this risk; use hardware wallet for mainnet funds |
| Accidental tab close | Session is rebuilt by asking for the password on next open |

---

## Cryptographic Details

### Key Derivation

```
PBKDF2(
  password   = user's password (UTF-8),
  salt       = crypto.getRandomValues(32 bytes),
  iterations = 310,000,
  hash       = SHA-256,
  keyLength  = 256 bits
) → AES-256-GCM key
```

310,000 iterations matches the OWASP 2023 recommendation for PBKDF2-SHA256.

### Encryption

```
AES-256-GCM(
  key        = derived above,
  iv         = crypto.getRandomValues(12 bytes),
  plaintext  = JSON.stringify({ mnemonic }) or JSON.stringify({ privateKey })
) → { ciphertext, salt, iv }
```

All three values are base64-encoded and stored together in the vault JSON.

### HD Derivation

```
BIP-39: generateMnemonic(wordlist_english, 128 bits) → 12 words
BIP-39: mnemonicToSeedSync(mnemonic) → 64-byte seed
BIP-32: HDKey.fromMasterSeed(seed).derive("m/44'/60'/0'/0/{index}") → child key
viem:   privateKeyToAccount(child.privateKey) → { address, signMessage, … }
```

---

## Cross-Device Portability

```
Phone A                          Phone B
───────                          ───────
Create wallet                    Import wallet
  → 12-word phrase               → enter same 12 words
  → set password                 → set new password (independent)
  → address: 0xABC…              → same address: 0xABC…
  → AVAX balance: 5.2            → AVAX balance: 5.2  ✓ (from chain)
  → EERC private balance         → same EERC state    ✓ (from chain)
```

The password is **device-local** — it only encrypts the vault on that device.  
The mnemonic is the **universal secret** — same phrase always = same wallet state.

---

## UI Flows

### Create Wallet

```
menu
 └─ create-1  Show 12 words (blurred until "Reveal" clicked)
       └─ create-2  Quiz: enter 2 random words from phrase
             └─ create-3  Set password (min 8 chars)
                   └─ connected  Wallet unlocked + wagmi connected
```

### Import Wallet

```
menu
 └─ import-menu  Choose method
       ├─ import-srp  Paste 12-word phrase + set password
       │      └─ connected
       └─ import-pk   Paste private key (live address preview) + set password
              └─ connected
```

### Return Visit (Locked Vault)

```
[page load — vault in localStorage, no session]
 └─ unlock  Enter password → decrypts vault → wagmi connects
       └─ connected
```

### Connected (Manage Wallet)

```
connected
 ├─ View address + copy + explorer link
 ├─ Manage section (password required):
 │    ├─ Reveal recovery phrase (HD only)
 │    └─ Reveal private key
 └─ Disconnect & Lock
```

---

## Chain Configuration

**One file controls everything:** `src/config/walletChain.ts`

```typescript
// Current: Avalanche Fuji Testnet
export const ACTIVE_CHAIN_ID   = 43113;
export const ACTIVE_RPC_URL    = "https://api.avax-test.network/ext/bc/C/rpc";
export const ACTIVE_CHAIN      = avalancheFuji;  // from "viem/chains"
export const ACTIVE_EXPLORER   = "https://testnet.snowtrace.io";
export const ACTIVE_CHAIN_NAME = "Avalanche Fuji";
export const ACTIVE_CURRENCY_SYMBOL = "AVAX";
```

To switch to **Avalanche Mainnet**:

```typescript
import { avalanche } from "viem/chains";

export const ACTIVE_CHAIN_ID   = 43114;
export const ACTIVE_RPC_URL    = "https://api.avax.network/ext/bc/C/rpc";
export const ACTIVE_CHAIN      = avalanche;
export const ACTIVE_EXPLORER   = "https://snowtrace.io";
export const ACTIVE_CHAIN_NAME = "Avalanche";
export const ACTIVE_CURRENCY_SYMBOL = "AVAX";
```

To switch to **Ethereum Mainnet**:

```typescript
import { mainnet } from "viem/chains";

export const ACTIVE_CHAIN_ID   = 1;
export const ACTIVE_RPC_URL    = "https://eth.llamarpc.com";
export const ACTIVE_CHAIN      = mainnet;
export const ACTIVE_EXPLORER   = "https://etherscan.io";
export const ACTIVE_CHAIN_NAME = "Ethereum";
export const ACTIVE_CURRENCY_SYMBOL = "ETH";
```

---

## API Reference

### `src/lib/localWallet.ts`

#### Mnemonic

| Function | Signature | Description |
|----------|-----------|-------------|
| `createMnemonic` | `() → string` | Generates a fresh 12-word BIP-39 mnemonic |
| `isValidMnemonic` | `(phrase: string) → boolean` | Validates a user-supplied mnemonic |

#### HD Derivation

| Function | Signature | Description |
|----------|-----------|-------------|
| `deriveFromMnemonic` | `(mnemonic, index?) → { privateKey, address }` | Derives key+address at BIP-44 path |
| `derivePrivateKeyFromMnemonic` | `(mnemonic, index?) → 0x…` | Returns only the private key |

#### Private Key Utilities

| Function | Signature | Description |
|----------|-----------|-------------|
| `parsePrivateKey` | `(raw: string) → 0x…` | Validates + normalises a hex private key. Throws if invalid. |

#### Vault

| Function | Signature | Description |
|----------|-----------|-------------|
| `saveHDVault` | `async (mnemonic, index, address, password) → void` | Encrypts mnemonic and persists to localStorage |
| `saveImportedVault` | `async (privateKey, address, password) → void` | Encrypts private key and persists to localStorage |
| `unlockVault` | `async (password) → WalletPayload` | Decrypts vault, populates `_session`. Throws `"Incorrect password."` on wrong password |
| `getStoredVault` | `() → EncryptedVault \| null` | Reads encrypted vault (no decryption) |
| `getStoredAddress` | `() → 0x… \| null` | Address without decrypting (for display) |
| `hasStoredVault` | `() → boolean` | True if any vault exists in localStorage |
| `clearVault` | `() → void` | Removes vault from localStorage + clears session |

#### Session

| Function | Signature | Description |
|----------|-----------|-------------|
| `getSession` | `() → WalletPayload \| null` | Returns the in-memory unlocked session |
| `clearSession` | `() → void` | Clears the in-memory session (does not touch localStorage) |

#### Types

```typescript
interface WalletPayload {
  type: "hd" | "imported";
  mnemonic?: string;        // HD only
  privateKey: `0x${string}`;
  address: `0x${string}`;
  accountIndex: number;
}

interface EncryptedVault {
  type: "hd" | "imported";
  ciphertext: string;       // base64 AES-GCM output
  salt: string;             // base64 PBKDF2 salt
  iv: string;               // base64 AES-GCM IV
  address: `0x${string}`;  // plaintext, for display before unlock
  accountIndex: number;
}
```

---

## wagmi Integration

The connector (`localWalletConnector`) is a standard wagmi v2 connector built with `createConnector`. It wraps a viem `WalletClient` in an EIP-1193 interface.

### Supported EIP-1193 methods

| Method | Behaviour |
|--------|-----------|
| `eth_requestAccounts` / `eth_accounts` | Returns `[session.address]` |
| `eth_chainId` | Returns `numberToHex(ACTIVE_CHAIN_ID)` |
| `net_version` | Returns chain ID string |
| `personal_sign` | Signs via `walletClient.signMessage({ raw })` |
| `eth_sign` | Same as personal_sign, different param order |
| `eth_signTypedData_v4` | Full EIP-712 typed data signing |
| `eth_sendTransaction` | Sends via `walletClient.sendTransaction` — supports EIP-1559 and legacy |
| everything else | Delegated to `publicClient.request()` |

### Provider refresh

After saving a new vault, call:

```typescript
(globalThis as any).__avacadoResetLocalWalletProvider?.();
```

This drops the cached EIP-1193 provider so the next `connect()` call picks up the new private key.

### Registering the connector

```typescript
// AppKitProvider.tsx
import { localWalletConnector } from "./lib/localWalletConnector";

const wagmiAdapter = new WagmiAdapter({
  connectors: [localWalletConnector()],
  networks: [ACTIVE_CHAIN as AppKitNetwork],
  projectId,
});
```

---

## Common Patterns

### Check if wallet is ready

```typescript
import { hasStoredVault, getSession } from "@/lib/localWallet";

const isLocked  = hasStoredVault() && !getSession();
const isUnlocked = hasStoredVault() && !!getSession();
const isNew      = !hasStoredVault();
```

### Unlock programmatically

```typescript
import { unlockVault } from "@/lib/localWallet";

try {
  await unlockVault(password);
  // session is now populated — call wagmi connect()
} catch (err) {
  if (err.message === "Incorrect password.") { /* show error */ }
}
```

### Get current address without wagmi

```typescript
import { getSession, getStoredAddress } from "@/lib/localWallet";

// After unlock:
const address = getSession()?.address;

// Before unlock (from vault metadata):
const address = getStoredAddress();
```

### Wipe wallet

```typescript
import { clearVault } from "@/lib/localWallet";
import { useDisconnect } from "wagmi";

const { disconnect } = useDisconnect();

clearVault();
(globalThis as any).__avacadoResetLocalWalletProvider?.();
disconnect();
```

---

## Dependencies

| Package | Version | Used for |
|---------|---------|----------|
| `@scure/bip39` | `^1.x` | Mnemonic generation + validation |
| `@scure/bip32` | `^1.x` | BIP-44 HD key derivation |
| `viem` | `^2.26` | `privateKeyToAccount`, WalletClient, PublicClient |
| `wagmi` | `^2.14` | `createConnector`, React hooks |
| `framer-motion` | `^11.x` | Bottom sheet animations |
| Web Crypto API | built-in | AES-GCM + PBKDF2 (requires `https://` or `localhost`) |

> **Note:** Web Crypto API requires a secure context (`https://` or `localhost`). It will not work on plain `http://` in production.

---

*Last updated: February 2026*
