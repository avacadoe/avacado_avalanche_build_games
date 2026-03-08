import { Suspense, lazy, useState } from "react";
import { Logo } from "./components/layout/Logo";
import {
    NewHome,
    NewRegistration,
    NewDashboard,
    NewDeposit,
    NewWithdraw,
    NewTransfer,
    NewBatchApproval,
    NewECC,
    NewHashes,
    NewPoseidon,
} from "./newPages";
import { RegistrationCheck } from "./newComponents";

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

    type NewPageType =
        | "home"
        | "registration"
        | "dashboard"
        | "deposit"
        | "withdraw"
        | "transfer"
        | "batchApproval"
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
            case "batchApproval":
                PageComponent = (
                    <NewBatchApproval onNavigate={handleNewPageNavigate} />
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
                {PageComponent}
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
