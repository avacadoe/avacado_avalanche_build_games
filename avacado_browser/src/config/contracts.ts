// Contract addresses
export const CONTRACTS = {
    EERC_STANDALONE: "0x5e4D13fC112d5C679d36565C219Aa4A12AEb053D",
    EERC_CONVERTER: "0x5894792d827D56057718Ca15B266D1A7C4eb3682",
    ERC20: "0x2d13f85a3b201637Ad02F339b461749881f7d49d",
} as const;

// Circuit configuration
export const CIRCUIT_CONFIG = {
    register: {
        wasm: "/RegistrationCircuit.wasm",
        zkey: "/RegistrationCircuit.groth16.zkey",
    },
    mint: {
        wasm: "/MintCircuit.wasm",
        zkey: "/MintCircuit.groth16.zkey",
    },
    transfer: {
        wasm: "/TransferCircuit.wasm",
        zkey: "/TransferCircuit.groth16.zkey",
    },
    withdraw: {
        wasm: "/WithdrawCircuit.wasm",
        zkey: "/WithdrawCircuit.groth16.zkey",
    },
    withdrawIntent: {
        wasm: "/WithdrawIntentCircuit.wasm",
        zkey: "/WithdrawIntentCircuit.groth16.zkey",
    },
    burn: {
        wasm: "/BurnCircuit.wasm",
        zkey: "/BurnCircuit.groth16.zkey",
    },
} as const;

// Additional URLs for the new SDK
export const URLS = {
    transferURL: "/TransferCircuit.wasm", // Local transfer circuit WASM
    multiWasmURL: "/RegistrationCircuit.wasm", // Local multi-purpose circuit WASM
} as const;

// Explorer URL
export const EXPLORER_BASE_URL = "https://testnet.snowtrace.io/address/";
export const EXPLORER_BASE_URL_TX = "https://testnet.snowtrace.io/tx/";

// Mode types
export type EERCMode = "standalone" | "converter";
