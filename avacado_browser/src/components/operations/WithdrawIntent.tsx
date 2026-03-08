import { useState, useEffect } from "react";
import { Bounce, toast } from "react-toastify";

interface WithdrawIntentProps {
    handleSubmitWithdrawIntent: (
        amount: string,
        destination: string,
        nonce: string
    ) => Promise<void>;
    handleExecuteWithdrawIntent?: (
        intentHash: string,
        tokenId: string,
        destination: string,
        amount: string,
        nonce: string,
        proof: any,
        balancePCT: string[],
        intentMetadata?: string
    ) => Promise<void>;
    isDecryptionKeySet: boolean;
    erc20TokenId?: bigint;
}

export function WithdrawIntent({
    handleSubmitWithdrawIntent,
    handleExecuteWithdrawIntent,
    isDecryptionKeySet,
    erc20TokenId,
}: WithdrawIntentProps) {
    const [withdrawAmount, setWithdrawAmount] = useState<string>("");
    const [destination, setDestination] = useState<string>("");
    const [nonce, setNonce] = useState<string>("1");
    const [loading, setLoading] = useState<boolean>(false);

    // Execution parameters (populated from console logs)
    const [executionParams, setExecutionParams] = useState<{
        intentHash: string;
        tokenId: string;
        amount: string;
        destination: string;
        nonce: string;
        proof: any;
        balancePCT: string[];
        intentMetadata: string;
    }>({
        intentHash:
            "20817643024094067626677362653580685511614187503716979423076217687523981668234",
        tokenId: erc20TokenId?.toString() || "0", // Use the correct tokenId
        amount: "100",
        destination: "0xe87758C6CCcf3806C9f1f0C8F99f6Dcae36E5449",
        nonce: "1",
        proof: {
            proofPoints: {
                a: ["0x...", "0x..."],
                b: [
                    ["0x...", "0x..."],
                    ["0x...", "0x..."],
                ],
                c: ["0x...", "0x..."],
            },
            publicSignals: ["0x...", "0x...", "0x..."],
        },
        balancePCT: [
            "17352110474724567082361631892925420909322146885620482922156939108759948382252",
            "3512150847074577377027456211152587417595631771146930264176196131848718382368",
            "10772574538802446951063213353134820816568682609001825210862972561334538414584",
            "11318130424932288151026291345954722069787832684012342918655115122067483965256",
            "1596191388890136692565135072296584069635999791698211771422035297945440501838",
            "3876552429372531642216703127478082748907237726622260974590532729947539017539",
            "133705180971420892029465340865676915084",
        ],
        intentMetadata: "0x",
    });

    // Update executionParams when erc20TokenId changes
    useEffect(() => {
        if (erc20TokenId !== undefined) {
            setExecutionParams((prev) => ({
                ...prev,
                tokenId: erc20TokenId.toString(),
            }));
        }
    }, [erc20TokenId]);

    return (
        <>
            <div className="flex-1">
                <h3 className="text-cyber-green font-bold mb-2">
                    Withdraw Intent
                </h3>
                <p className="text-sm text-cyber-gray font-mono leading-relaxed mb-4">
                    Submit a withdraw intent with hidden amount and destination.
                    The intent is submitted as a hash, preserving privacy until
                    execution. The intent can be executed by anyone after a
                    waiting period, enabling batching and better privacy through
                    anonymity sets.
                </p>
            </div>

            <div className="space-y-3">
                <input
                    type="text"
                    value={withdrawAmount}
                    onChange={(e) => {
                        const value = e.target.value.trim();
                        if (/^\d*\.?\d{0,2}$/.test(value)) {
                            setWithdrawAmount(value);
                        }
                    }}
                    placeholder={"Amount in ether (eg. 1.5, 0.01)"}
                    className="flex-1 bg-cyber-dark text-cyber-gray px-4 py-0.5 rounded-lg border border-cyber-green/20 focus:border-cyber-green focus:ring-1 focus:ring-cyber-green outline-none font-mono w-full"
                />

                <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value.trim())}
                    placeholder={"Destination address (0x...)"}
                    className="flex-1 bg-cyber-dark text-cyber-gray px-4 py-0.5 rounded-lg border border-cyber-green/20 focus:border-cyber-green focus:ring-1 focus:ring-cyber-green outline-none font-mono w-full"
                />

                <input
                    type="text"
                    value={nonce}
                    onChange={(e) => {
                        const value = e.target.value.trim();
                        if (/^\d+$/.test(value) || value === "") {
                            setNonce(value);
                        }
                    }}
                    placeholder={"Nonce (default: 1)"}
                    className="flex-1 bg-cyber-dark text-cyber-gray px-4 py-0.5 rounded-lg border border-cyber-green/20 focus:border-cyber-green focus:ring-1 focus:ring-cyber-green outline-none font-mono w-full"
                />

                <button
                    type="button"
                    className="bg-cyber-dark w-full text-cyber-green px-2 py-1 rounded-md text-sm border border-cyber-green/60 disabled:opacity-50 disabled:cursor-not-allowed mb-2 hover:bg-cyber-green/60 transition-all duration-200 font-mono mt-2"
                    onClick={async () => {
                        setLoading(true);
                        handleSubmitWithdrawIntent(
                            withdrawAmount,
                            destination,
                            nonce
                        )
                            .then(() => {
                                setLoading(false);
                                setWithdrawAmount("");
                                setDestination("");
                                setNonce("1");
                            })
                            .catch((error) => {
                                const isUserRejected =
                                    error?.message.includes("User rejected");

                                toast.error(
                                    <div>
                                        <p>
                                            {isUserRejected
                                                ? "Transaction rejected"
                                                : "An error occurred while submitting withdraw intent. Please try again."}
                                        </p>
                                    </div>,
                                    {
                                        position: "top-right",
                                        autoClose: 5000,
                                        hideProgressBar: true,
                                        closeOnClick: true,
                                        pauseOnHover: false,
                                        draggable: true,
                                        progress: undefined,
                                        transition: Bounce,
                                    }
                                );

                                setLoading(false);
                            });
                    }}
                    disabled={
                        !withdrawAmount ||
                        !destination ||
                        !nonce ||
                        loading ||
                        !isDecryptionKeySet
                    }
                >
                    {loading ? "Submitting..." : "Submit Withdraw Intent"}
                </button>

                {/* Execution Section */}
                <div className="mt-6 p-4 bg-cyber-dark/50 rounded-lg border border-cyber-green/30">
                    <h4 className="text-cyber-green font-bold mb-2">
                        Execute Withdraw Intent
                    </h4>
                    <p className="text-sm text-cyber-gray font-mono mb-3">
                        Execute a previously submitted withdraw intent. Fill in
                        the parameters from your console logs.
                    </p>

                    <div className="space-y-2 mb-4">
                        <input
                            type="text"
                            value={executionParams.intentHash}
                            onChange={(e) =>
                                setExecutionParams((prev) => ({
                                    ...prev,
                                    intentHash: e.target.value,
                                }))
                            }
                            placeholder="Intent Hash (from console logs)"
                            className="flex-1 bg-cyber-dark text-cyber-gray px-3 py-1 rounded border border-cyber-green/20 focus:border-cyber-green focus:ring-1 focus:ring-cyber-green outline-none font-mono text-sm w-full"
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="text"
                                value={executionParams.tokenId}
                                onChange={(e) =>
                                    setExecutionParams((prev) => ({
                                        ...prev,
                                        tokenId: e.target.value,
                                    }))
                                }
                                placeholder="Token ID"
                                className="flex-1 bg-cyber-dark text-cyber-gray px-3 py-1 rounded border border-cyber-green/20 focus:border-cyber-green focus:ring-1 focus:ring-cyber-green outline-none font-mono text-sm"
                            />

                            <input
                                type="text"
                                value={executionParams.amount}
                                onChange={(e) =>
                                    setExecutionParams((prev) => ({
                                        ...prev,
                                        amount: e.target.value,
                                    }))
                                }
                                placeholder="Amount"
                                className="flex-1 bg-cyber-dark text-cyber-gray px-3 py-1 rounded border border-cyber-green/20 focus:border-cyber-green focus:ring-1 focus:ring-cyber-green outline-none font-mono text-sm"
                            />
                        </div>

                        <input
                            type="text"
                            value={executionParams.destination}
                            onChange={(e) =>
                                setExecutionParams((prev) => ({
                                    ...prev,
                                    destination: e.target.value,
                                }))
                            }
                            placeholder="Destination Address"
                            className="flex-1 bg-cyber-dark text-cyber-gray px-3 py-1 rounded border border-cyber-green/20 focus:border-cyber-green focus:ring-1 focus:ring-cyber-green outline-none font-mono text-sm w-full"
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="text"
                                value={executionParams.nonce}
                                onChange={(e) =>
                                    setExecutionParams((prev) => ({
                                        ...prev,
                                        nonce: e.target.value,
                                    }))
                                }
                                placeholder="Nonce"
                                className="flex-1 bg-cyber-dark text-cyber-gray px-3 py-1 rounded border border-cyber-green/20 focus:border-cyber-green focus:ring-1 focus:ring-cyber-green outline-none font-mono text-sm"
                            />

                            <input
                                type="text"
                                value={executionParams.intentMetadata}
                                onChange={(e) =>
                                    setExecutionParams((prev) => ({
                                        ...prev,
                                        intentMetadata: e.target.value,
                                    }))
                                }
                                placeholder="Intent Metadata (0x)"
                                className="flex-1 bg-cyber-dark text-cyber-gray px-3 py-1 rounded border border-cyber-green/20 focus:border-cyber-green focus:ring-1 focus:ring-cyber-green outline-none font-mono text-sm"
                            />
                        </div>

                        <textarea
                            value={executionParams.balancePCT.join(", ")}
                            onChange={(e) =>
                                setExecutionParams((prev) => ({
                                    ...prev,
                                    balancePCT: e.target.value
                                        .split(",")
                                        .map((s) => s.trim())
                                        .filter((s) => s.length > 0),
                                }))
                            }
                            placeholder="Balance PCT (comma-separated array)"
                            rows={2}
                            className="flex-1 bg-cyber-dark text-cyber-gray px-3 py-1 rounded border border-cyber-green/20 focus:border-cyber-green focus:ring-1 focus:ring-cyber-green outline-none font-mono text-sm w-full"
                        />

                        <textarea
                            value={
                                executionParams.proof
                                    ? JSON.stringify(
                                          executionParams.proof,
                                          null,
                                          2
                                      )
                                    : ""
                            }
                            onChange={(e) => {
                                try {
                                    const proof = e.target.value
                                        ? JSON.parse(e.target.value)
                                        : null;
                                    setExecutionParams((prev) => ({
                                        ...prev,
                                        proof,
                                    }));
                                } catch (err) {
                                    // Invalid JSON, keep current value
                                }
                            }}
                            placeholder="Proof object (paste from console logs after submitting intent)"
                            rows={8}
                            className="flex-1 bg-cyber-dark text-cyber-gray px-3 py-1 rounded border border-cyber-green/20 focus:border-cyber-green focus:ring-1 focus:ring-cyber-green outline-none font-mono text-xs w-full"
                        />
                        <p className="text-xs text-cyber-gray/70 mt-1">
                            Replace with the actual proof object from your
                            browser console after submitting the withdraw intent
                        </p>
                    </div>

                    <button
                        type="button"
                        className="bg-cyber-green text-cyber-dark px-3 py-1 rounded-md text-sm font-mono hover:bg-cyber-green/80 transition-all duration-200"
                        onClick={async () => {
                            if (!handleExecuteWithdrawIntent) return;
                            if (
                                !executionParams.intentHash ||
                                !executionParams.amount ||
                                !executionParams.destination
                            ) {
                                toast.error(
                                    "Please fill in all required fields"
                                );
                                return;
                            }
                            setLoading(true);
                            try {
                                await handleExecuteWithdrawIntent(
                                    executionParams.intentHash,
                                    executionParams.tokenId,
                                    executionParams.destination,
                                    executionParams.amount,
                                    executionParams.nonce,
                                    executionParams.proof,
                                    executionParams.balancePCT,
                                    executionParams.intentMetadata
                                );
                                toast.success(
                                    "Withdraw intent executed successfully!"
                                );
                            } catch (error) {
                                toast.error(
                                    "Failed to execute withdraw intent"
                                );
                            }
                            setLoading(false);
                        }}
                        disabled={
                            loading ||
                            !executionParams.intentHash ||
                            !executionParams.amount ||
                            !executionParams.destination ||
                            !executionParams.proof ||
                            !executionParams.balancePCT.length
                        }
                    >
                        {loading ? "Executing..." : "Execute Intent"}
                    </button>
                </div>
            </div>
        </>
    );
}
