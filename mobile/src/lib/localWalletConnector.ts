/**
 * localWalletConnector.ts
 *
 * A custom wagmi v2 connector that lets a user connect with a private key
 * stored in localStorage, without any third-party wallet SDK.
 *
 * Architecture
 * ────────────
 *  1. We build a minimal EIP-1193 provider backed by a viem WalletClient.
 *  2. wagmi wraps that provider in its own viem WalletClient, which gives the
 *     rest of the app (including the EERC SDK) a fully-compatible client.
 *  3. The connector lazily reads the private key from localStorage on every
 *     call, so the key can be stored/replaced at runtime.
 */

import { createConnector } from "wagmi";
import {
  createWalletClient,
  createPublicClient,
  http,
  numberToHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getStoredPrivateKey } from "./localWallet";
import {
  ACTIVE_CHAIN,
  ACTIVE_CHAIN_ID,
  ACTIVE_RPC_URL,
} from "../config/walletChain";

// ─── Constants ────────────────────────────────────────────────────────────────

export const LOCAL_WALLET_CONNECTOR_ID = "avacado-local-wallet";

// ─── EIP-1193 provider builder ────────────────────────────────────────────────

type EIP1193Provider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, listener: (...args: unknown[]) => void): void;
  removeListener(event: string, listener: (...args: unknown[]) => void): void;
};

function buildProvider(privateKey: `0x${string}`): EIP1193Provider {
  const account = privateKeyToAccount(privateKey);
  const transport = http(ACTIVE_RPC_URL);

  const walletClient = createWalletClient({
    account,
    chain: ACTIVE_CHAIN,
    transport,
  });

  const publicClient = createPublicClient({
    chain: ACTIVE_CHAIN,
    transport,
  });

  const listenerMap = new Map<string, Set<(...args: unknown[]) => void>>();

  return {
    async request({ method, params = [] }) {
      const p = params as unknown[];

      switch (method) {
        case "eth_requestAccounts":
        case "eth_accounts":
          return [account.address];

        case "eth_chainId":
          return numberToHex(ACTIVE_CHAIN_ID);

        case "net_version":
          return String(ACTIVE_CHAIN_ID);

        /* ── Signing ── */
        case "personal_sign": {
          // personal_sign: params = [message, address]
          const message = p[0] as `0x${string}`;
          return walletClient.signMessage({ message: { raw: message } });
        }

        case "eth_sign": {
          // eth_sign: params = [address, message]
          const message = p[1] as `0x${string}`;
          return walletClient.signMessage({ message: { raw: message } });
        }

        case "eth_signTypedData_v4": {
          // params = [address, typedDataJson]
          const typedDataJson = p[1] as string;
          const { domain, types, primaryType, message } =
            JSON.parse(typedDataJson);
          // Strip EIP712Domain from types (viem handles it internally)
          const { EIP712Domain: _removed, ...filteredTypes } = types ?? {};
          return walletClient.signTypedData({
            domain,
            types: filteredTypes,
            primaryType,
            message,
          });
        }

        /* ── Transactions ── */
        case "eth_sendTransaction": {
          const tx = p[0] as Record<string, string>;
          // gasPrice (legacy) and maxFeePerGas (EIP-1559) are mutually
          // exclusive in viem's types; cast to avoid the compile error.
          // biome-ignore lint/suspicious/noExplicitAny: EIP-1193 bridge
          return walletClient.sendTransaction({
            to: tx.to as `0x${string}`,
            value: tx.value ? BigInt(tx.value) : undefined,
            data: (tx.data as `0x${string}`) ?? undefined,
            gas: tx.gas ? BigInt(tx.gas) : undefined,
            ...(tx.maxFeePerGas
              ? {
                  maxFeePerGas: BigInt(tx.maxFeePerGas),
                  maxPriorityFeePerGas: tx.maxPriorityFeePerGas
                    ? BigInt(tx.maxPriorityFeePerGas)
                    : undefined,
                }
              : { gasPrice: tx.gasPrice ? BigInt(tx.gasPrice) : undefined }),
            nonce: tx.nonce ? Number(tx.nonce) : undefined,
            // biome-ignore lint/suspicious/noExplicitAny: EIP-1193 bridge
          } as any);
        }

        /* ── Delegate everything else to the public client ── */
        default:
          // biome-ignore lint/suspicious/noExplicitAny: wagmi/viem internal
          return (publicClient as any).request({ method, params: p });
      }
    },

    on(event, listener) {
      if (!listenerMap.has(event)) listenerMap.set(event, new Set());
      listenerMap.get(event)!.add(listener);
    },

    removeListener(event, listener) {
      listenerMap.get(event)?.delete(listener);
    },
  };
}

// ─── Connector ────────────────────────────────────────────────────────────────

/**
 * Call this once and pass the result to WagmiAdapter `connectors` array.
 *
 * ```ts
 * new WagmiAdapter({
 *   connectors: [localWalletConnector()],
 *   ...
 * })
 * ```
 */
export function localWalletConnector() {
  let cachedProvider: EIP1193Provider | null = null;

  function getProvider(): EIP1193Provider {
    const key = getStoredPrivateKey();
    if (!key) throw new Error("No local wallet stored.");
    // Rebuild provider if key changed or not yet created
    if (!cachedProvider) {
      cachedProvider = buildProvider(key);
    }
    return cachedProvider;
  }

  /**
   * Call this after saving a new key so the old provider is discarded.
   */
  // exported so WalletModal can call it after saving
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__avacadoResetLocalWalletProvider = () => {
    cachedProvider = null;
  };

  return createConnector((config) => ({
    id: LOCAL_WALLET_CONNECTOR_ID,
    name: "Avacado Wallet",
    type: LOCAL_WALLET_CONNECTOR_ID,
    icon: undefined,

    async connect() {
      cachedProvider = null; // force rebuild with latest stored key
      const provider = getProvider();
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as `0x${string}`[];
      return { accounts, chainId: ACTIVE_CHAIN_ID };
    },

    async disconnect() {
      cachedProvider = null;
    },

    async getAccounts() {
      try {
        const provider = getProvider();
        return (await provider.request({
          method: "eth_accounts",
        })) as `0x${string}`[];
      } catch {
        return [];
      }
    },

    async getChainId() {
      return ACTIVE_CHAIN_ID;
    },

    async getProvider() {
      return getProvider();
    },

    async isAuthorized() {
      // Only report authorized if there's an active in-memory session.
      // The vault existing on disk alone isn't enough — user must unlock first.
      return getStoredPrivateKey() !== null;
    },

    onAccountsChanged(accounts) {
      if (accounts.length === 0) config.emitter.emit("disconnect");
      else
        config.emitter.emit("change", {
          accounts: accounts as `0x${string}`[],
        });
    },

    onChainChanged(chain) {
      config.emitter.emit("change", { chainId: parseInt(chain, 16) });
    },

    onDisconnect() {
      config.emitter.emit("disconnect");
    },
  }));
}
