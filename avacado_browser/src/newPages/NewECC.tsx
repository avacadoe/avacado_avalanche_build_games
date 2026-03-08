import { NewLayout } from "../newComponents";
import "../newStyles.css";

interface NewECCProps {
    onNavigate: (page: string) => void;
}

export function NewECC({ onNavigate }: NewECCProps) {
    return (
        <NewLayout onNavigate={onNavigate} currentPage="ecc">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-5xl md:text-6xl font-bold text-coral-red mb-4">
                        Elliptic Curve Cryptography
                    </h1>
                    <p className="text-lg text-gray-600">
                        Explore Baby JubJub curve operations and ElGamal encryption
                    </p>
                </div>

                <div className="frost-card p-8">
                    <div className="mono-kicker text-coral-red mb-4">
                        [ BABY JUBJUB CURVE ]
                    </div>
                    <h2 className="text-2xl font-bold text-black mb-4">
                        About the Curve
                    </h2>
                    <p className="text-gray-700 mb-4">
                        The BabyJubjub curve is a zk-friendly elliptic curve specifically
                        optimized for use in zero-knowledge proof systems like zk-SNARKs and
                        zk-STARKs. It is defined over a finite field with a large prime
                        modulus and designed to ensure computational efficiency, making it a
                        preferred choice for privacy-preserving applications.
                    </p>

                    <div className="bg-black/5 p-6 rounded-lg border border-black/10">
                        <h3 className="font-semibold text-black mb-3">
                            Curve Equation
                        </h3>
                        <div className="font-mono text-sm bg-white p-4 rounded border border-black/10">
                            <p>y² = x³ + 168700x² + x mod (2²⁵⁴ - 127)</p>
                        </div>
                    </div>
                </div>

                <div className="frost-card p-8">
                    <div className="mono-kicker text-coral-red mb-4">
                        [ COMING SOON ]
                    </div>
                    <h2 className="text-2xl font-bold text-black mb-4">
                        Interactive Tools
                    </h2>
                    <p className="text-gray-700 mb-4">
                        We're working on bringing you interactive tools to:
                    </p>
                    <ul className="space-y-2 text-gray-700">
                        <li>• Visualize point operations on the curve</li>
                        <li>• Experiment with ElGamal encryption/decryption</li>
                        <li>• Understand point compression</li>
                        <li>• Play with cryptographic primitives</li>
                    </ul>

                    <p className="text-sm text-gray-500 mt-6 italic">
                        For now, you can explore the full ECC playground in the Classic UI
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
