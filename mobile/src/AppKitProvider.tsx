import { createAppKit } from "@reown/appkit/react";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { localWalletConnector } from "./lib/localWalletConnector";
import { ACTIVE_CHAIN } from "./config/walletChain";
// Convert viem chain to appkit network type (same object shape)
import type { AppKitNetwork } from "@reown/appkit-common";

const fujiNetwork = ACTIVE_CHAIN as unknown as AppKitNetwork;

// 0. Setup queryClient
const queryClient = new QueryClient();

if (!import.meta.env.VITE_REOWN_PROJECT_ID) {
  throw new Error("VITE_REOWN_PROJECT_ID is not set");
}

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;

// 2. Create a metadata object - optional
const metadata = {
  name: "AppKit",
  description: "AppKit Example",
  url: window.location.origin, // This will automatically match the current domain
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// 4. Create Wagmi Adapter — include our self-custody local wallet connector
const wagmiAdapter = new WagmiAdapter({
  networks: [fujiNetwork],
  projectId,
  ssr: true,
  connectors: [localWalletConnector()],
});

// 5. Create modal
createAppKit({
  adapters: [wagmiAdapter],
  networks: [fujiNetwork],
  projectId,
  metadata,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
  },
});

export function AppKitProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
