interface AmountInputProps {
    value: string;
    onChange: (value: string) => void;
    symbol: string;
    availableBalance?: string;
    label?: string;
    placeholder?: string;
    showQuickAmounts?: boolean;
    onMax?: () => void;
}

export function AmountInput({
    value,
    onChange,
    symbol,
    availableBalance,
    label = "Amount",
    placeholder = "0.00",
    showQuickAmounts = true,
    onMax,
}: AmountInputProps) {
    const quickPercentages = [25, 50, 75];

    const handlePercentageClick = (percentage: number) => {
        if (availableBalance) {
            const amount = (parseFloat(availableBalance) * percentage) / 100;
            onChange(amount.toString());
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-[8px] border border-black/10 bg-white/80 p-4">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#313131] mb-2">
                    {label}
                </label>
                
                <div className="flex items-baseline gap-3">
                    <input
                        type="text"
                        inputMode="decimal"
                        value={value}
                        onChange={(e) => {
                            const val = e.target.value;
                            // Allow only numbers and decimal point
                            if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                onChange(val);
                            }
                        }}
                        placeholder={placeholder}
                        className="amount-input-large flex-1 bg-transparent outline-none"
                    />
                    <span className="text-lg font-semibold text-gray-600">
                        {symbol}
                    </span>
                </div>

                {availableBalance && (
                    <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-[#7A7A7A]">
                            Available: {availableBalance} {symbol}
                        </p>
                        {onMax && (
                            <button
                                type="button"
                                onClick={onMax}
                                className="text-xs font-mono uppercase tracking-[0.16em] text-coral-red hover:underline"
                            >
                                MAX
                            </button>
                        )}
                    </div>
                )}
            </div>

            {showQuickAmounts && availableBalance && (
                <div className="flex flex-wrap gap-2">
                    {quickPercentages.map((percentage) => (
                        <button
                            key={percentage}
                            type="button"
                            onClick={() => handlePercentageClick(percentage)}
                            className="percentage-btn"
                        >
                            {percentage}%
                        </button>
                    ))}
                    {onMax && (
                        <button
                            type="button"
                            onClick={onMax}
                            className="percentage-btn"
                        >
                            MAX
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
