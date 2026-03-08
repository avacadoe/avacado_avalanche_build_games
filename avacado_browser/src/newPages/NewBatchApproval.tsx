import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NewLayout } from "../newComponents/NewLayout";
import { StatusIndicator } from "../newComponents/StatusIndicator";

interface NewBatchApprovalProps {
    onNavigate: (page: string) => void;
}

interface WithdrawIntent {
    id: number;
    address: string;
    amount: string;
    hash: string;
}

interface Batch {
    id: number;
    intents: WithdrawIntent[];
    maxCount: number;
}

// Random hash generator (77-digit number)
const generateRandomHash = () => {
    let hash = '';
    for (let i = 0; i < 77; i++) {
        hash += Math.floor(Math.random() * 10);
    }
    return hash;
};

// Random address generator
const generateRandomAddress = () => {
    const chars = '0123456789abcdef';
    const prefix = '0x';
    const address = Array.from({ length: 40 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${prefix}${address}`;
};

// Random amount generator (1.0 to 25.0)
const generateRandomAmount = () => {
    return (Math.random() * 24 + 1).toFixed(2);
};

// Persistent state across page navigations
let persistentState = {
    batches: [
        {
            id: 1,
            intents: Array.from({ length: 5 }, (_, i) => ({
                id: i + 1,
                address: generateRandomAddress(),
                amount: generateRandomAmount(),
                hash: generateRandomHash()
            })),
            maxCount: 50
        },
        {
            id: 2,
            intents: Array.from({ length: 8 }, (_, i) => ({
                id: i + 1,
                address: generateRandomAddress(),
                amount: generateRandomAmount(),
                hash: generateRandomHash()
            })),
            maxCount: 50
        },
        {
            id: 3,
            intents: Array.from({ length: 12 }, (_, i) => ({
                id: i + 1,
                address: generateRandomAddress(),
                amount: generateRandomAmount(),
                hash: generateRandomHash()
            })),
            maxCount: 50
        },
        {
            id: 4,
            intents: Array.from({ length: 3 }, (_, i) => ({
                id: i + 1,
                address: generateRandomAddress(),
                amount: generateRandomAmount(),
                hash: generateRandomHash()
            })),
            maxCount: 50
        }
    ] as Batch[],
    nextBatchId: 5
};

export function NewBatchApproval({ onNavigate }: NewBatchApprovalProps) {
    const [batches, setBatches] = useState<Batch[]>(persistentState.batches);
    const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
    const [buttonState, setButtonState] = useState<"default" | "approving" | "approved">("default");
    const nextBatchIdRef = useRef(persistentState.nextBatchId);

    // Sync state to persistent storage
    useEffect(() => {
        persistentState.batches = batches;
        persistentState.nextBatchId = nextBatchIdRef.current;
    }, [batches]);

    // Auto-add intents to random batches every 1-3 seconds
    useEffect(() => {
        const randomDelay = Math.random() * 2000 + 1000; // 1-3 seconds
        const timer = setTimeout(() => {
            setBatches(prevBatches => {
                const batchesUnderMax = prevBatches.filter(b => b.intents.length < b.maxCount);
                
                // If no batches have space, add a new batch
                if (batchesUnderMax.length === 0) {
                    const newBatch: Batch = {
                        id: nextBatchIdRef.current,
                        intents: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, i) => ({
                            id: i + 1,
                            address: generateRandomAddress(),
                            amount: generateRandomAmount(),
                            hash: generateRandomHash()
                        })),
                        maxCount: 50
                    };
                    nextBatchIdRef.current += 1;
                    return [...prevBatches, newBatch];
                }

                const randomBatch = batchesUnderMax[Math.floor(Math.random() * batchesUnderMax.length)];
                
                return prevBatches.map(batch => {
                    if (batch.id === randomBatch.id && batch.intents.length < batch.maxCount) {
                        const updatedBatch = {
                            ...batch,
                            intents: [
                                ...batch.intents,
                                {
                                    id: batch.intents.length + 1,
                                    address: generateRandomAddress(),
                                    amount: generateRandomAmount(),
                                    hash: generateRandomHash()
                                }
                            ]
                        };
                        
                        // If this batch just filled up (reached maxCount), add a new batch
                        if (updatedBatch.intents.length === batch.maxCount) {
                            setTimeout(() => {
                                const newBatch: Batch = {
                                    id: nextBatchIdRef.current,
                                    intents: Array.from({ length: Math.floor(Math.random() * 5) + 2 }, (_, i) => ({
                                        id: i + 1,
                                        address: generateRandomAddress(),
                                        amount: generateRandomAmount(),
                                        hash: generateRandomHash()
                                    })),
                                    maxCount: 50
                                };
                                nextBatchIdRef.current += 1;
                                setBatches(prev => [...prev, newBatch]);
                            }, 1000); // Add new batch 1 second after one fills
                        }
                        
                        return updatedBatch;
                    }
                    return batch;
                });
            });
        }, randomDelay);

        return () => clearTimeout(timer);
    }, [batches]);

    const handleApprove = async (batchId: number) => {
        setButtonState("approving");
        await new Promise(resolve => setTimeout(resolve, 2000));
        setButtonState("approved");
        
        setTimeout(() => {
            // Remove approved batch
            setBatches(prevBatches => prevBatches.filter(b => b.id !== batchId));
            setSelectedBatch(null);
            setButtonState("default");
            
            // Add a new batch to replace the approved one
            const newBatch: Batch = {
                id: nextBatchIdRef.current,
                intents: Array.from({ length: Math.floor(Math.random() * 5) + 3 }, (_, i) => ({
                    id: i + 1,
                    address: generateRandomAddress(),
                    amount: generateRandomAmount(),
                    hash: generateRandomHash()
                })),
                maxCount: 50
            };
            nextBatchIdRef.current += 1;
            setBatches(prevBatches => [...prevBatches, newBatch]);
        }, 1000);
    };

    const currentBatch = selectedBatch ? batches.find(b => b.id === selectedBatch) : null;

    // Gallery View
    if (!selectedBatch) {
        return (
            <NewLayout onNavigate={onNavigate} currentPage="batchApproval">
                <div className="absolute inset-0 bg-coral-red/[0.02] -mx-8 -my-8 pointer-events-none" />
                
                <div className="max-w-7xl mx-auto space-y-6 relative">
                    {/* Header */}
                    <div className="mb-8">
                        <div
                            className="pointer-events-none absolute left-0 top-0 h-[160px] w-[160px] -translate-y-6 rounded-full md:h-[200px] md:w-[200px]"
                            style={{
                                background: "radial-gradient(circle, rgba(255,107,107,0.12) 0%, rgba(255,107,107,0) 70%)",
                            }}
                            aria-hidden="true"
                        />
                        
                        <h1 
                            className="text-5xl font-bold text-coral-red mb-2"
                            style={{
                                fontFamily: "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Batch Approval Gallery
                        </h1>
                        <p className="text-gray-600 text-lg">
                            View all active batches and approve when ready
                        </p>
                    </div>

                    {/* Batch Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {batches.map((batch) => {
                                const progress = (batch.intents.length / batch.maxCount) * 100;
                                const isReady = batch.intents.length >= batch.maxCount;
                                
                                return (
                                    <motion.button
                                        key={batch.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        onClick={() => setSelectedBatch(batch.id)}
                                        className="frost-card p-6 text-left hover:border-coral-red/40 transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <p className="mono-kicker text-coral-red">
                                                [ BATCH #{batch.id} ]
                                            </p>
                                            <span className={`text-xl font-bold ${isReady ? 'text-emerald-600' : 'text-coral-red'}`}>
                                                {batch.intents.length}/{batch.maxCount}
                                            </span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-4">
                                            <div 
                                                className={`h-full transition-all duration-500 ${isReady ? 'bg-emerald-600' : 'bg-coral-red'}`}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Status</span>
                                                <span className={`font-semibold ${isReady ? 'text-emerald-600' : 'text-gray-900'}`}>
                                                    {isReady ? 'Ready' : 'Collecting'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Remaining</span>
                                                <span className="font-semibold text-gray-900">
                                                    {batch.maxCount - batch.intents.length} intents
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-black/10">
                                            <span className="text-coral-red font-mono text-sm">
                                                View Details →
                                            </span>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            </NewLayout>
        );
    }

    // Detail View
    const batch = currentBatch!;
    const progress = (batch.intents.length / batch.maxCount) * 100;
    const isReadyForApproval = batch.intents.length >= batch.maxCount;

    return (
        <NewLayout onNavigate={onNavigate} currentPage="batchApproval">
            <div className="absolute inset-0 bg-coral-red/[0.02] -mx-8 -my-8 pointer-events-none" />
            
            <div className="max-w-6xl mx-auto space-y-6 relative">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between relative">
                    <div
                        className="pointer-events-none absolute left-0 top-0 h-[160px] w-[160px] -translate-y-6 rounded-full md:h-[200px] md:w-[200px]"
                        style={{
                            background: "radial-gradient(circle, rgba(255,107,107,0.12) 0%, rgba(255,107,107,0) 70%)",
                        }}
                        aria-hidden="true"
                    />
                    
                    <div className="relative">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gray-500 mb-2">
                            <span>Batch #{batch.id}</span>
                            <span aria-hidden>•</span>
                            <span className="rounded-[2px] border border-black/10 bg-white/70 px-1.5 py-0.5">
                                {isReadyForApproval ? 'ready' : 'collecting'}
                            </span>
                        </div>
                        <h1 
                            className="text-5xl font-bold text-coral-red"
                            style={{
                                fontFamily: "'Scto Grotesk A', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Batch Details
                        </h1>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelectedBatch(null)}
                        className="btn-secondary"
                    >
                        ← Back to Gallery
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
                    {/* Left Column - Batch Details */}
                    <div className="space-y-6">
                        {/* Batch Progress */}
                        <div className="frost-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <p className="mono-kicker text-coral-red">
                                    [ BATCH #{batch.id} ]
                                </p>
                                <span className="text-2xl font-bold text-coral-red">
                                    {batch.intents.length}/{batch.maxCount}
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-3 rounded-full bg-gray-200 overflow-hidden mb-2">
                                <div 
                                    className="h-full bg-coral-red transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-600 text-right">
                                {batch.maxCount - batch.intents.length} more intents needed for approval
                            </p>
                        </div>

                        {/* Status Notice */}
                        {!isReadyForApproval && (
                            <StatusIndicator
                                status="info"
                                message="Batch Not Ready"
                                variant="card"
                                details={`This batch needs ${batch.maxCount - batch.intents.length} more withdrawal intents before it can be approved.`}
                            />
                        )}

                        {isReadyForApproval && (
                            <StatusIndicator
                                status="success"
                                message="Ready for Approval"
                                variant="card"
                                details="This batch has reached 50 intents and can now be approved by any registered user."
                            />
                        )}

                        {/* Withdraw Intents List */}
                        <div className="frost-card p-6">
                            <p className="mono-kicker text-gray-600 mb-4">
                                [ WITHDRAW INTENTS ({batch.intents.length}) ]
                            </p>
                            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                                <AnimatePresence>
                                    {batch.intents.map((intent) => (
                                        <motion.div
                                            key={intent.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="group relative"
                                        >
                                            <div className="rounded-[8px] border border-black/10 bg-white/70 p-3 hover:p-4 hover:border-coral-red/40 hover:bg-coral-red/5 transition-all cursor-pointer">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        Intent #{intent.id}
                                                    </p>
                                                </div>
                                                
                                                {/* Hash shown on hover */}
                                                <div className="max-h-0 group-hover:max-h-20 overflow-hidden transition-all duration-300">
                                                    <p className="text-xs text-gray-600 mt-2 font-mono break-all">
                                                        {intent.hash}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Approval Summary */}
                    <aside className="frost-card p-6 h-max">
                        <p className="mono-kicker text-coral-red mb-4">
                            [ APPROVAL SUMMARY ]
                        </p>

                        <div className="space-y-3 mb-6">
                            <SummaryRow
                                label="Batch ID"
                                value={`#${batch.id}`}
                            />
                            <SummaryRow
                                label="Intents Collected"
                                value={`${batch.intents.length} / ${batch.maxCount}`}
                            />
                            <SummaryRow
                                label="Total Amount"
                                value={`${batch.intents.reduce((sum, i) => sum + parseFloat(i.amount), 0).toFixed(2)} eAVAX`}
                            />
                            <SummaryRow
                                label="Status"
                                value={isReadyForApproval ? "Ready" : "Pending"}
                                muted={!isReadyForApproval}
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => handleApprove(batch.id)}
                            disabled={!isReadyForApproval || buttonState !== "default"}
                            className="btn-success w-full"
                        >
                            {buttonState === "approving"
                                ? "Approving Batch..." 
                                : buttonState === "approved"
                                    ? "Batch Approved ✓"
                                    : isReadyForApproval 
                                        ? `Approve Batch (${batch.intents.length}/${batch.maxCount})` 
                                        : `Waiting for Intents (${batch.intents.length}/${batch.maxCount})`
                            }
                        </button>
                    </aside>
                </div>
            </div>
        </NewLayout>
    );
}

function SummaryRow({
    label,
    value,
    muted = false,
}: {
    label: string;
    value: string;
    muted?: boolean;
}) {
    return (
        <div className="flex items-center justify-between rounded-[8px] border border-black/10 bg-white/80 px-3 py-2">
            <span className="text-xs text-gray-600">{label}</span>
            <span className={muted ? "text-xs text-gray-600" : "text-sm font-semibold text-black"}>
                {value}
            </span>
        </div>
    );
}
