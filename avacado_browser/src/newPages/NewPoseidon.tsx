import { NewLayout } from "../newComponents";
import "../newStyles.css";

interface NewPoseidonProps {
    onNavigate: (page: string) => void;
}

export function NewPoseidon({ onNavigate }: NewPoseidonProps) {
    return (
        <NewLayout onNavigate={onNavigate} currentPage="poseidon">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-5xl md:text-6xl font-bold text-coral-red mb-4">
                        Poseidon Encryption
                    </h1>
                    <p className="text-lg text-gray-600">
                        Privacy-preserving encryption for zero-knowledge applications
                    </p>
                </div>

                <div className="frost-card p-8">
                    <div className="mono-kicker text-coral-red mb-4">
                        [ ZK-FRIENDLY ENCRYPTION ]
                    </div>
                    <h2 className="text-2xl font-bold text-black mb-4">
                        What is Poseidon Encryption?
                    </h2>
                    <p className="text-gray-700 mb-4">
                        Poseidon encryption is a specialized encryption method designed to work
                        efficiently within zero-knowledge proof systems. Unlike traditional
                        encryption methods, it's optimized for privacy-preserving applications
                        where computational efficiency is crucial.
                    </p>

                    <div className="bg-black/5 p-6 rounded-lg border border-black/10">
                        <h3 className="font-semibold text-black mb-3">
                            Perfect For
                        </h3>
                        <ul className="space-y-2 text-gray-700">
                            <li>• Encrypting sensitive data while maintaining verification ability</li>
                            <li>• Allowing users to decrypt their own data without revealing it</li>
                            <li>• Performing operations on encrypted data without decryption</li>
                        </ul>
                    </div>
                </div>

                <div className="frost-card p-8 bg-gradient-to-br from-coral-red/5 to-transparent">
                    <div className="mono-kicker text-coral-red mb-4">
                        [ HOW IT WORKS IN eERC ]
                    </div>
                    <h2 className="text-2xl font-bold text-black mb-4">
                        Dual Encryption System
                    </h2>
                    <p className="text-gray-700 mb-4">
                        In eERC, user balances are encrypted using two complementary methods:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <div className="bg-white p-5 rounded-lg border border-black/10">
                            <h4 className="font-bold text-black mb-2">ElGamal Encryption</h4>
                            <p className="text-sm text-gray-600">
                                Used for validity proofs in zero-knowledge circuits. Verifiers check
                                the validity of encrypted balances without decrypting them.
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-lg border border-black/10">
                            <h4 className="font-bold text-black mb-2">Poseidon Encryption</h4>
                            <p className="text-sm text-gray-600">
                                Used for efficient decryption in the browser. Since ElGamal decryption
                                is costly, Poseidon ciphertext allows fast balance retrieval.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="frost-card p-8">
                    <div className="mono-kicker text-coral-red mb-4">
                        [ ENCRYPTION COMPONENTS ]
                    </div>
                    <h2 className="text-2xl font-bold text-black mb-4">
                        Key Components
                    </h2>

                    <div className="space-y-4">
                        <div className="border-l-4 border-coral-red pl-4">
                            <h4 className="font-semibold text-black">Encryption Key</h4>
                            <p className="text-sm text-gray-600">
                                A shared secret created using your private key and the recipient's
                                public key
                            </p>
                        </div>

                        <div className="border-l-4 border-emerald-green pl-4">
                            <h4 className="font-semibold text-black">Nonce</h4>
                            <p className="text-sm text-gray-600">
                                A random value that makes each encryption unique
                            </p>
                        </div>

                        <div className="border-l-4 border-amber-yellow pl-4">
                            <h4 className="font-semibold text-black">Authentication Key</h4>
                            <p className="text-sm text-gray-600">
                                Verifies the encrypted data hasn't been tampered with
                            </p>
                        </div>

                        <div className="border-l-4 border-coral-red pl-4">
                            <h4 className="font-semibold text-black">Ciphertext</h4>
                            <p className="text-sm text-gray-600">
                                The final encrypted result that can be safely stored or transmitted
                            </p>
                        </div>
                    </div>
                </div>

                <div className="frost-card p-8">
                    <div className="mono-kicker text-coral-red mb-4">
                        [ COMING SOON ]
                    </div>
                    <h2 className="text-2xl font-bold text-black mb-4">
                        Interactive Encryption Tool
                    </h2>
                    <p className="text-gray-700 mb-4">
                        We're building an interactive playground where you can:
                    </p>
                    <ul className="space-y-2 text-gray-700">
                        <li>• Generate encryption key pairs</li>
                        <li>• Encrypt your own data</li>
                        <li>• Decrypt ciphertext with private keys</li>
                        <li>• Visualize the encryption process</li>
                        <li>• Understand how it works in eERC</li>
                    </ul>

                    <p className="text-sm text-gray-500 mt-6 italic">
                        For now, you can try the full Poseidon encryption tool in the Classic UI
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
