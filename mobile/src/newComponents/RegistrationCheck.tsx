import { ReactNode } from "react";
import {
    type CompatiblePublicClient,
    type CompatibleWalletClient,
    useEERC,
} from "@avalabs/eerc-sdk";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { avalancheFuji } from "wagmi/chains";
import { NewLayout } from "./NewLayout";
import { LoadingSpinner } from "./LoadingSpinner";
import { CIRCUIT_CONFIG, CONTRACTS, URLS } from "../config/contracts";

interface RegistrationCheckProps {
    children: ReactNode;
    onNavigate: (page: string) => void;
    currentPage?: string;
    mode: "standalone" | "converter";
}

export function RegistrationCheck({ 
    children, 
    onNavigate, 
    currentPage = "home",
    mode 
}: RegistrationCheckProps) {
    const { isConnected } = useAccount();
    const publicClient = usePublicClient({ chainId: avalancheFuji.id });
    const { data: walletClient } = useWalletClient();

    const { isRegistered } = useEERC(
        publicClient as CompatiblePublicClient,
        walletClient as CompatibleWalletClient,
        mode === "converter"
            ? CONTRACTS.EERC_CONVERTER
            : CONTRACTS.EERC_STANDALONE,
        URLS,
        CIRCUIT_CONFIG
    );

    // Show loading state while checking registration status
    if (isConnected && isRegistered === undefined) {
        return (
            <NewLayout onNavigate={onNavigate} currentPage={currentPage}>
                <div className="max-w-2xl mx-auto text-center py-20">
                    <div className="flex flex-col items-center gap-6">
                        <LoadingSpinner size="lg" />
                        <div>
                            <h2 className="text-2xl font-semibold text-coral-red mb-2"
                                style={{
                                    fontFamily: "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                                    letterSpacing: "-0.01em",
                                }}
                            >
                                Checking Registration Status
                            </h2>
                            <p className="text-gray-600">
                                Please wait while we verify your account...
                            </p>
                        </div>
                    </div>
                </div>
            </NewLayout>
        );
    }

    // Render children once registration status is determined
    return <>{children}</>;
}
