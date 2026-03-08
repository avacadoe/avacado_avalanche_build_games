import { Suspense, lazy, useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Logo } from "./components/layout/Logo";
import {
    NewHome,
    NewRegistration,
    NewDashboard,
    NewDeposit,
    NewWithdraw,
    NewTransfer,
    NewECC,
    NewHashes,
    NewPoseidon,
} from "./newPages";
import { RegistrationCheck, SplashScreen, AppLockScreen } from "./newComponents";
import { hasStoredVault, getSession } from "./lib/localWallet";

// Lazy load page components
const ECC = lazy(() =>
    import("./pages/ECC").then((module) => ({ default: module.ECC }))
);
const EERC = lazy(() =>
    import("./pages/EERC").then((module) => ({ default: module.EERC }))
);
const Hashes = lazy(() =>
    import("./pages/Hashes").then((module) => ({ default: module.Hashes }))
);
const PoseidonEncrypt = lazy(() =>
    import("./pages/PoseidonEncrypt").then((module) => ({
        default: module.PoseidonEncrypt,
    }))
);

// Loading component
const LoadingFallback = () => (
    <div className="flex items-center justify-center h-full">
        <div className="text-cyber-green font-mono">Loading...</div>
    </div>
);

export function App() {
    const [selectedPage, setSelectedPage] = useState<
        "hashes" | "ecc" | "EERC" | "poseidon"
    >("EERC");

    // Splash screen — shown once per session, and again after unlock
    const [splashDone, setSplashDone] = useState<boolean>(
        () => sessionStorage.getItem("splashDone") === "true"
    );
    const [showUnlockSplash, setShowUnlockSplash] = useState(false);

    // Visible on first load OR after unlock
    const splashVisible = !splashDone || showUnlockSplash;

    const handleSplashDone = () => {
        setSplashDone(true);
        sessionStorage.setItem("splashDone", "true");
        setShowUnlockSplash(false);
    };

    type NewPageType =
        | "home"
        | "registration"
        | "dashboard"
        | "deposit"
        | "withdraw"
        | "transfer"
        | "ecc"
        | "hashes"
        | "poseidon";

    // Load UI version and page from localStorage on mount
    const [uiVersion, setUiVersion] = useState<"classic" | "new">(() => {
        return (
            (localStorage.getItem("uiVersion") as "classic" | "new") || "new"
        );
    });

    const [newPage, setNewPage] = useState<NewPageType>(() => {
        const saved = localStorage.getItem("currentPage") as NewPageType | null;
        return saved || "home";
    });

    const [mode] = useState<"standalone" | "converter">("converter");

    // Wallet connection state — used to guard protected pages
    const { isConnected, status: connectionStatus } = useAccount();
    const PROTECTED_PAGES: NewPageType[] = ["dashboard", "deposit", "transfer", "withdraw"];

    // ── Lock screen ──────────────────────────────────────────────────────────
    // Locked = vault exists on disk but no in-memory session (e.g. page reload,
    // or user explicitly tapped "Lock").
    const [isLocked, setIsLocked] = useState<boolean>(
        () => hasStoredVault() && !getSession()
    );

    // Listen for lock events dispatched by the hamburger / WalletModal
    useEffect(() => {
        const handleLockEvent = () => setIsLocked(true);
        window.addEventListener("avacado:lock", handleLockEvent);
        return () => window.removeEventListener("avacado:lock", handleLockEvent);
    }, []);

    // Listen for splash trigger (fired after wallet creation/import completes)
    useEffect(() => {
        const handleSplashEvent = () => setShowUnlockSplash(true);
        window.addEventListener("avacado:splash", handleSplashEvent);
        return () => window.removeEventListener("avacado:splash", handleSplashEvent);
    }, []);

    // Redirect to home when the user disconnects while on a protected page.
    // Skip during "reconnecting" (wagmi auto-connect) or while locked (lock screen
    // is showing, so redirect doesn't matter and would reset currentPage).
    useEffect(() => {
        if (
            !isLocked &&
            !isConnected &&
            connectionStatus !== "reconnecting" &&
            PROTECTED_PAGES.includes(newPage)
        ) {
            setNewPage("home");
            localStorage.setItem("currentPage", "home");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected, connectionStatus, isLocked]);

    // Redirect connected users away from the home/landing page → dashboard
    useEffect(() => {
        if (!isLocked && isConnected && connectionStatus === "connected" && newPage === "home") {
            setNewPage("dashboard");
            localStorage.setItem("currentPage", "dashboard");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected, connectionStatus, isLocked]);

    // Save UI version to localStorage when it changes
    const handleSetUiVersion = (version: "classic" | "new") => {
        setUiVersion(version);
        localStorage.setItem("uiVersion", version);
        // Reset to home when switching UI versions
        if (version === "new") {
            setNewPage("home");
            localStorage.setItem("currentPage", "home");
        }
    };

    const handleNewPageNavigate = (page: string) => {
        const validPage = page as NewPageType;
        // Guard: silently redirect to home if not connected and trying to access a protected page
        if (!isConnected && connectionStatus !== "reconnecting" && PROTECTED_PAGES.includes(validPage)) {
            setNewPage("home");
            localStorage.setItem("currentPage", "home");
            return;
        }
        setNewPage(validPage);
        localStorage.setItem("currentPage", validPage);
    };

    // If new UI is selected, render new pages
    if (uiVersion === "new") {
        let PageComponent;

        switch (newPage) {
            case "home":
                PageComponent = (
                    <RegistrationCheck
                        onNavigate={handleNewPageNavigate}
                        currentPage="home"
                        mode={mode}
                    >
                        <NewHome
                            onNavigate={handleNewPageNavigate}
                            mode={mode}
                        />
                    </RegistrationCheck>
                );
                break;
            case "registration":
                PageComponent = (
                    <RegistrationCheck
                        onNavigate={handleNewPageNavigate}
                        currentPage="registration"
                        mode={mode}
                    >
                        <NewRegistration
                            onNavigate={handleNewPageNavigate}
                            mode={mode}
                        />
                    </RegistrationCheck>
                );
                break;
            case "dashboard":
                PageComponent = (
                    <RegistrationCheck
                        onNavigate={handleNewPageNavigate}
                        currentPage="dashboard"
                        mode={mode}
                    >
                        <NewDashboard
                            onNavigate={handleNewPageNavigate}
                            mode={mode}
                        />
                    </RegistrationCheck>
                );
                break;
            case "deposit":
                PageComponent = (
                    <RegistrationCheck
                        onNavigate={handleNewPageNavigate}
                        currentPage="deposit"
                        mode={mode}
                    >
                        <NewDeposit
                            onNavigate={handleNewPageNavigate}
                            mode={mode}
                        />
                    </RegistrationCheck>
                );
                break;
            case "withdraw":
                PageComponent = (
                    <RegistrationCheck
                        onNavigate={handleNewPageNavigate}
                        currentPage="withdraw"
                        mode={mode}
                    >
                        <NewWithdraw
                            onNavigate={handleNewPageNavigate}
                            mode={mode}
                        />
                    </RegistrationCheck>
                );
                break;
            case "transfer":
                PageComponent = (
                    <RegistrationCheck
                        onNavigate={handleNewPageNavigate}
                        currentPage="transfer"
                        mode={mode}
                    >
                        <NewTransfer
                            onNavigate={handleNewPageNavigate}
                            mode={mode}
                        />
                    </RegistrationCheck>
                );
                break;
            case "ecc":
                PageComponent = (
                    <RegistrationCheck
                        onNavigate={handleNewPageNavigate}
                        currentPage="ecc"
                        mode={mode}
                    >
                        <NewECC onNavigate={handleNewPageNavigate} />
                    </RegistrationCheck>
                );
                break;
            case "hashes":
                PageComponent = (
                    <RegistrationCheck
                        onNavigate={handleNewPageNavigate}
                        currentPage="hashes"
                        mode={mode}
                    >
                        <NewHashes onNavigate={handleNewPageNavigate} />
                    </RegistrationCheck>
                );
                break;
            case "poseidon":
                PageComponent = (
                    <RegistrationCheck
                        onNavigate={handleNewPageNavigate}
                        currentPage="poseidon"
                        mode={mode}
                    >
                        <NewPoseidon onNavigate={handleNewPageNavigate} />
                    </RegistrationCheck>
                );
                break;
            default:
                PageComponent = (
                    <RegistrationCheck
                        onNavigate={handleNewPageNavigate}
                        currentPage="home"
                        mode={mode}
                    >
                        <NewHome
                            onNavigate={handleNewPageNavigate}
                            mode={mode}
                        />
                    </RegistrationCheck>
                );
        }

        return (
            <>
                {/* Splash: first load OR after unlock (dashboard renders behind it) */}
                <SplashScreen
                    isVisible={splashVisible}
                    onDone={handleSplashDone}
                    duration={showUnlockSplash ? 4000 : 3200}
                />
                {/* Lock screen: vault exists but no active session */}
                {isLocked ? (
                    <AppLockScreen
                        onUnlocked={() => {
                            setIsLocked(false);       // dashboard starts rendering behind splash
                            setShowUnlockSplash(true); // splash overlays while it loads
                        }}
                    />
                ) : (
                    PageComponent
                )}
            </>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-100">
            <nav className="sticky top-0 w-64 bg-cyber-dark text-white flex flex-col p-2 h-screen">
                <div className="p-4 font-bold text-lg flex justify-center items-center">
                    <Logo />
                </div>
                <ul className="flex-grow space-y-2 p-4">
                    <li>
                        {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                        <p
                            onClick={() => setSelectedPage("EERC")}
                            className="block px-4 py-2 rounded text-center text-cyber-green cursor-pointer font-mono"
                        >
                            eERC
                        </p>
                    </li>
                    <div className="border-b border-cyber-green/30 my-2" />
                    <li>
                        {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                        <p
                            onClick={() => setSelectedPage("ecc")}
                            className="block px-4 py-2 rounded text-center text-cyber-green cursor-pointer font-mono"
                        >
                            ECC (BabyJubjub)
                        </p>
                    </li>
                    <div className="border-b border-cyber-green/30 my-2" />
                    <li>
                        {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                        <p
                            onClick={() => setSelectedPage("hashes")}
                            className="block px-4 py-2 rounded text-center text-cyber-green cursor-pointer font-mono"
                        >
                            Hash Functions
                        </p>
                    </li>
                    <div className="border-b border-cyber-green/30 my-2" />
                    <li>
                        {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                        <p
                            onClick={() => setSelectedPage("poseidon")}
                            className="block px-4 py-2 rounded text-center text-cyber-green cursor-pointer font-mono"
                        >
                            Poseidon Encryption
                        </p>
                    </li>
                </ul>

                {/* New UI Toggle Button */}
                <div className="p-4 border-t border-cyber-green/30">
                    <button
                        type="button"
                        onClick={() => handleSetUiVersion("new")}
                        className="w-full px-4 py-3 bg-cyber-green text-cyber-dark font-mono font-bold rounded hover:bg-cyber-green/80 transition-colors"
                    >
                        Try New UI →
                    </button>
                </div>
            </nav>

            {/* Page Content */}
            <main className="flex-grow p-6 bg-cyber-black">
                <Suspense fallback={<LoadingFallback />}>
                    {selectedPage === "hashes" ? (
                        <Hashes />
                    ) : selectedPage === "ecc" ? (
                        <ECC />
                    ) : selectedPage === "EERC" ? (
                        <EERC />
                    ) : (
                        <PoseidonEncrypt />
                    )}
                </Suspense>
            </main>
        </div>
    );
}

export default App;

// import { Suspense, lazy, useState } from "react";
// import { Logo } from "./components/layout/Logo";

// // Lazy load page components
// const ECC = lazy(() =>
// 	import("./pages/ECC").then((module) => ({ default: module.ECC })),
// );
// const EERC = lazy(() =>
// 	import("./pages/EERC").then((module) => ({ default: module.EERC })),
// );
// const Hashes = lazy(() =>
// 	import("./pages/Hashes").then((module) => ({ default: module.Hashes })),
// );
// const PoseidonEncrypt = lazy(() =>
// 	import("./pages/PoseidonEncrypt").then((module) => ({
// 		default: module.PoseidonEncrypt,
// 	})),
// );

// // Loading component
// const LoadingFallback = () => (
// 	<div className="flex items-center justify-center h-full">
// 		<div className="text-cyber-green font-mono">Loading...</div>
// 	</div>
// );

// export function App() {
// 	const [selectedPage, setSelectedPage] = useState<
// 		"hashes" | "ecc" | "EERC" | "poseidon"
// 	>("EERC");

// 	return (
// 		<div className="flex min-h-screen bg-gray-100">
// 			<nav className="sticky top-0 w-64 bg-cyber-dark text-white flex flex-col p-2 h-screen">
// 				<div className="p-4 font-bold text-lg flex justify-center items-center">
// 					<Logo />
// 				</div>
// 				<ul className="flex-grow space-y-2 p-4">
// 					<li>
// 						{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
// 						<p
// 							onClick={() => setSelectedPage("EERC")}
// 							className="block px-4 py-2 rounded text-center text-cyber-green cursor-pointer font-mono"
// 						>
// 							eERC
// 						</p>
// 					</li>
// 					<div className="border-b border-cyber-green/30 my-2" />
// 					<li>
// 						{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
// 						<p
// 							onClick={() => setSelectedPage("ecc")}
// 							className="block px-4 py-2 rounded text-center text-cyber-green cursor-pointer font-mono"
// 						>
// 							ECC (BabyJubjub)
// 						</p>
// 					</li>
// 					<div className="border-b border-cyber-green/30 my-2" />
// 					<li>
// 						{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
// 						<p
// 							onClick={() => setSelectedPage("hashes")}
// 							className="block px-4 py-2 rounded text-center text-cyber-green cursor-pointer font-mono"
// 						>
// 							Hash Functions
// 						</p>
// 					</li>
// 					<div className="border-b border-cyber-green/30 my-2" />
// 					<li>
// 						{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
// 						<p
// 							onClick={() => setSelectedPage("poseidon")}
// 							className="block px-4 py-2 rounded text-center text-cyber-green cursor-pointer font-mono"
// 						>
// 							Poseidon Encryption
// 						</p>
// 					</li>
// 				</ul>
// 			</nav>

// 			{/* Page Content */}
// 			<main className="flex-grow p-6 bg-cyber-black">
// 				<Suspense fallback={<LoadingFallback />}>
// 					{selectedPage === "hashes" ? (
// 						<Hashes />
// 					) : selectedPage === "ecc" ? (
// 						<ECC />
// 					) : selectedPage === "EERC" ? (
// 						<EERC />
// 					) : (
// 						<PoseidonEncrypt />
// 					)}
// 				</Suspense>
// 			</main>
// 		</div>
// 	);
// }

// export default App;
