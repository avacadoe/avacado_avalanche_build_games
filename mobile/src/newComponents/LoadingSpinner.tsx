interface LoadingSpinnerProps {
    message?: string;
    progress?: string;
    size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({
    message = "Processing...",
    progress,
    size = "md",
}: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: "h-4 w-4",
        md: "h-8 w-8",
        lg: "h-12 w-12",
    };

    return (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="relative">
                <div
                    className={`${sizeClasses[size]} border-4 border-gray-200 border-t-coral-red rounded-full animate-spin`}
                />
            </div>

            {message && (
                <div className="text-center space-y-2">
                    <p className="text-sm font-medium text-gray-700">{message}</p>
                    {progress && (
                        <p className="text-xs text-gray-500 font-mono">{progress}</p>
                    )}
                </div>
            )}

            {/* Animated dots */}
            <div className="flex gap-2">
                <span
                    className="pulse-dot inline-block h-2 w-2 rounded-full bg-coral-red"
                    style={{ animationDelay: "0s" }}
                />
                <span
                    className="pulse-dot inline-block h-2 w-2 rounded-full bg-coral-red"
                    style={{ animationDelay: "0.2s" }}
                />
                <span
                    className="pulse-dot inline-block h-2 w-2 rounded-full bg-coral-red"
                    style={{ animationDelay: "0.4s" }}
                />
            </div>
        </div>
    );
}

export function SkeletonLoader({ className = "" }: { className?: string }) {
    return <div className={`skeleton ${className}`} />;
}
