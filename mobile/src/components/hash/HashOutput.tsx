import { motion } from "framer-motion";
import { FaClipboard } from "react-icons/fa";
import type { DisplayMode } from "../../types";
import { toHex } from "../../utils/conversion";
import { DisplayToggle } from "./DisplayToggle";

interface HashOutputProps {
	hash: bigint[];
	displayMode: DisplayMode;
	onToggleDisplay: () => void;
	onCopy: () => void;
}

export function HashOutput({
	hash,
	displayMode,
	onToggleDisplay,
	onCopy,
}: HashOutputProps) {
	const displayValues = hash.map((value) =>
		displayMode === "hex" ? toHex(value.toString()) : value.toString(),
	);

	const renderHashOutput = () => {
		if (displayValues.length === 0) return <span className="font-mono">-</span>;
		if (displayValues.length === 1)
			return <span className="font-mono">{displayValues[0]}</span>;

		return (
			<div className="space-y-2">
				{displayValues.map((value, index) => (
					<div key={value} className="font-mono">
						{`h${index + 1}: ${value}`}
					</div>
				))}
			</div>
		);
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="bg-cyber-dark p-4 rounded-lg border border-cyber-green/20"
		>
			<div className="flex justify-between items-center mb-2">
				<span className="text-cyber-gray font-mono">Result</span>
				<div className="flex space-x-2">
					<DisplayToggle mode={displayMode} onToggle={onToggleDisplay} />
					<button
						onClick={onCopy}
						className="p-2 text-cyber-gray hover:text-cyber-green transition-colors"
						title="Copy to clipboard"
						type="button"
					>
						<FaClipboard />
					</button>
				</div>
			</div>
			<div className="font-mono text-cyber-green break-all">
				{renderHashOutput()}
			</div>
		</motion.div>
	);
}
