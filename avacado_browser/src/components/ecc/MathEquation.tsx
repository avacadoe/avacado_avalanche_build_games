import type { ReactNode } from "react";

interface MathEquationProps {
	children: ReactNode;
}

export function MathEquation({ children }: MathEquationProps) {
	return (
		<div className="font-mono text-cyber-green/70 bg-cyber-black py-2 px-3 rounded">
			{children}
		</div>
	);
}
