import { NewLayout } from "../newComponents";
import "../newStyles.css";

interface NewHashesProps {
    onNavigate: (page: string) => void;
}

export function NewHashes({ onNavigate }: NewHashesProps) {
    return (
        <NewLayout onNavigate={onNavigate} currentPage="hashes">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-5xl md:text-6xl font-bold text-coral-red mb-4">
                        Hash Functions
                    </h1>
                    <p className="text-lg text-gray-600">
                        ZK-friendly hash functions for privacy-preserving applications
                    </p>
                </div>

                <div className="frost-card p-8">
                    <div className="mono-kicker text-coral-red mb-4">
                        [ CRYPTOGRAPHIC HASHING ]
                    </div>
                    <h2 className="text-2xl font-bold text-black mb-4">
                        What are Hash Functions?
                    </h2>
                    <p className="text-gray-700 mb-4">
                        Hash functions are like digital fingerprints for data. They take any
                        input (text, numbers, files) and transform it into a fixed-length
                        string of characters. This transformation is designed to be:
                    </p>
                    <ul className="space-y-2 text-gray-700 ml-6">
                        <li>
                            <strong>Deterministic</strong> - The same input always produces the
                            same output
                        </li>
                        <li>
                            <strong>One-way</strong> - It's practically impossible to reverse
                            the process
                        </li>
                        <li>
                            <strong>Collision-resistant</strong> - Different inputs rarely
                            produce the same output
                        </li>
                        <li>
                            <strong>Avalanche Effect</strong> - Tiny changes create drastically
                            different outputs
                        </li>
                    </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="frost-card p-6">
                        <h3 className="text-xl font-bold text-black mb-3">
                            Poseidon Hash
                        </h3>
                        <p className="text-sm text-gray-700 mb-3">
                            A modern hash function specifically designed for zero-knowledge
                            applications. Unlike traditional hash functions like SHA-256, Poseidon
                            is optimized to work efficiently within zero-knowledge proof systems.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-emerald-green/10 text-emerald-green text-xs font-mono rounded-full">
                                ZK-Optimized
                            </span>
                            <span className="px-3 py-1 bg-coral-red/10 text-coral-red text-xs font-mono rounded-full">
                                Efficient
                            </span>
                        </div>
                    </div>

                    <div className="frost-card p-6">
                        <h3 className="text-xl font-bold text-black mb-3">
                            MiMC Sponge
                        </h3>
                        <p className="text-sm text-gray-700 mb-3">
                            Another zero-knowledge friendly hash function. While Poseidon generally
                            offers better performance, MiMC remains important in certain specialized
                            applications and is widely used in privacy-preserving blockchain
                            transactions.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-amber-yellow/10 text-amber-yellow text-xs font-mono rounded-full">
                                Specialized
                            </span>
                            <span className="px-3 py-1 bg-coral-red/10 text-coral-red text-xs font-mono rounded-full">
                                Secure
                            </span>
                        </div>
                    </div>
                </div>

                <div className="frost-card p-8">
                    <div className="mono-kicker text-coral-red mb-4">
                        [ COMING SOON ]
                    </div>
                    <h2 className="text-2xl font-bold text-black mb-4">
                        Interactive Hash Calculator
                    </h2>
                    <p className="text-gray-700 mb-4">
                        We're building an interactive tool where you can:
                    </p>
                    <ul className="space-y-2 text-gray-700">
                        <li>• Input your own data to hash</li>
                        <li>• Compare Poseidon vs MiMC outputs</li>
                        <li>• Configure hash parameters</li>
                        <li>• See real-time hash generation</li>
                        <li>• Understand ZK-proof integration</li>
                    </ul>

                    <p className="text-sm text-gray-500 mt-6 italic">
                        For now, you can try the full hash calculator in the Classic UI
                    </p>
                </div>

                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={() => onNavigate("home")}
                        className="btn-secondary"
                    >
                        ← Back to Home
                    </button>
                </div>
            </div>
        </NewLayout>
    );
}
