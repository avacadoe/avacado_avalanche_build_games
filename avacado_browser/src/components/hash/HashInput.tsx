import { FaPlus, FaTrash } from "react-icons/fa";
import type {
	DisplayMode,
	HashFunction,
	HashInput as HashInputType,
	MimcParams,
} from "../../types";
import { HashInputField } from "./HashInputField";
import { MimcConfiguration } from "./MimcConfiguration";

interface HashInputProps {
	inputs: HashInputType[];
	selectedFunction: HashFunction;
	displayMode: DisplayMode;
	onInputChange: (id: string, value: string) => void;
	onAddInput: () => void;
	onRemoveInput: (id: string) => void;
	onFunctionChange: (value: HashFunction) => void;
	onClearInputs: () => void;
	onMimcParamsChange: (n: Partial<MimcParams>) => void;
	mimcParams: MimcParams;
}

export function HashInput({
	inputs,
	displayMode,
	onInputChange,
	onAddInput,
	onRemoveInput,
	onClearInputs,
	selectedFunction,
	onFunctionChange,
	onMimcParamsChange,
	mimcParams,
}: HashInputProps) {
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				{inputs.map((input) => (
					<HashInputField
						key={input.id}
						value={input.value}
						onChange={(value) => onInputChange(input.id, value)}
						onRemove={() => onRemoveInput(input.id)}
						canRemove={inputs.length > 1}
						displayMode={displayMode}
					/>
				))}
			</div>

			<div className="flex space-x-4 justify-between">
				<div className="flex space-x-4">
					<button
						onClick={onAddInput}
						className="px-4 bg-cyber-dark text-cyber-gray hover:text-cyber-green border border-cyber-green/20 rounded-lg font-mono transition-colors duration-200 flex items-center space-x-2"
						type="button"
					>
						<FaPlus size={12} />
						<span>Add Input</span>
					</button>

					<select
						value={selectedFunction}
						onChange={(e) => onFunctionChange(e.target.value as HashFunction)}
						className="bg-cyber-dark text-cyber-gray px-4 py-2 rounded-lg border border-cyber-green/20 focus:outline-none font-mono"
					>
						<option value="poseidon">Poseidon</option>
						<option value="mimcSponge">MiMC Sponge</option>
					</select>
				</div>

				{inputs.length > 1 && (
					<button
						onClick={onClearInputs}
						className="px-4 bg-cyber-dark text-cyber-gray hover:text-cyber-red border border-cyber-red/20 rounded-lg font-mono transition-colors duration-200 flex items-center mr-auto space-x-2"
						type="button"
					>
						<FaTrash size={12} />
						<span>Clear Inputs</span>
					</button>
				)}
			</div>

			{selectedFunction === "mimcSponge" && (
				<MimcConfiguration
					mimcParams={mimcParams}
					onMimcParamsChange={onMimcParamsChange}
				/>
			)}
		</div>
	);
}
