/**
 * walletChain.ts
 *
 * ─── SINGLE PLACE TO CHANGE THE NETWORK ─────────────────────────────────────
 *
 * To switch to a different chain:
 *  1. Change ACTIVE_CHAIN_ID  (e.g. 43114 for Avalanche mainnet)
 *  2. Change ACTIVE_RPC_URL   to a public or private RPC for that chain
 *  3. Update ACTIVE_CHAIN     to the matching viem chain object
 *     (import from "viem/chains")
 *  4. Update ACTIVE_EXPLORER  to the block explorer base URL
 *
 * Current: Avalanche Fuji Testnet (43113)
 */

import { avalancheFuji } from "viem/chains";
import type { Chain } from "viem";

// ─── Active chain ─────────────────────────────────────────────────────────────

/** Chain ID — change this and everything else follows. */
export const ACTIVE_CHAIN_ID = 43113 as const;

/** Public RPC endpoint for the active chain. */
export const ACTIVE_RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc";

/** viem Chain object — must match ACTIVE_CHAIN_ID. */
export const ACTIVE_CHAIN: Chain = avalancheFuji;

/** Block explorer URL (no trailing slash). */
export const ACTIVE_EXPLORER = "https://testnet.snowtrace.io";

/** Human-readable name shown in the UI. */
export const ACTIVE_CHAIN_NAME = "Avalanche Fuji";

/** Chain currency symbol. */
export const ACTIVE_CURRENCY_SYMBOL = "AVAX";
