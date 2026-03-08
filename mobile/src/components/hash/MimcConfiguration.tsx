import type { MimcParams } from "../../types";

interface MimcConfigurationProps {
	mimcParams: MimcParams;
	onMimcParamsChange: (params: Partial<MimcParams>) => void;
}

export const MimcConfiguration = ({
	mimcParams,
	onMimcParamsChange,
}: MimcConfigurationProps) => {
	return (
		<div className="flex flex-col space-y-2">
			<p className="text-cyber-green font-mono text-lg text-center my-1">
				MiMC Configuration
			</p>
			<div className="flex space-x-4 justify-center">
				{/* Rounds */}
				<div className="flex flex-col">
					<label
						htmlFor="rounds"
						className="text-cyber-green font-mono text-sm"
					>
						Rounds
					</label>
					<input
						id="rounds"
						type="text"
						disabled
						value={mimcParams.rounds.toString()}
						placeholder={"..."}
						className="flex-1 bg-cyber-dark text-cyber-gray p-2.5 rounded-lg border border-cyber-green/20 focus:border-cyber-green focus:ring-1 focus:ring-cyber-green outline-none font-mono"
					/>
				</div>

				{/* Nb outputs */}
				<div className="flex flex-col">
					<label
						htmlFor="nbOutputs"
						className="text-cyber-green font-mono text-sm"
					>
						Number of outputs
					</label>
					<input
						id="nbOutputs"
						type="text"
						value={mimcParams.nOutputs.toString()}
						onChange={(e) => {
							const value = e.target.value.trim();
							if (/^\d*$/.test(value)) {
								onMimcParamsChange({
									nOutputs: value === "" ? 0 : Number.parseInt(value, 10),
								});
							}
						}}
						placeholder={"..."}
						className="flex-1 bg-cyber-dark text-cyber-gray p-2.5 rounded-lg border border-cyber-green/20 focus:border-cyber-green focus:ring-1 focus:ring-cyber-green outline-none font-mono"
					/>
				</div>

				{/* Key */}
				<div className="flex flex-col">
					<label htmlFor="key" className="text-cyber-green font-mono text-sm">
						Key
					</label>
					<input
						id="key"
						type="text"
						value={mimcParams.key.toString()}
						onChange={(e) => {
							const value = e.target.value.trim();
							if (/^\d*$/.test(value)) {
								onMimcParamsChange({
									key: value === "" ? 0 : Number.parseInt(value, 10),
								});
							}
						}}
						placeholder={"..."}
						className="flex-1 bg-cyber-dark text-cyber-gray p-2.5 rounded-lg border border-cyber-green/20 focus:border-cyber-green focus:ring-1 focus:ring-cyber-green outline-none font-mono"
					/>
				</div>
			</div>
		</div>
	);
};
