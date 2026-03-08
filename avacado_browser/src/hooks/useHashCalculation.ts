import { mimcSponge } from "@darkforest_eth/hashing";
import bigInt from "big-integer";
import { useEffect, useState } from "react";
import { poseidon } from "../pkg";
import { BN128_PRIME } from "../pkg/constants";
import type { HashFunction, HashInput, MimcParams } from "../types";

export function useHashCalculation(
	inputs: HashInput[],
	selectedFunction: HashFunction,
	mimcParams: MimcParams,
) {
	const [currentHash, setCurrentHash] = useState<bigint[]>([]);

	useEffect(() => {
		const inputValues = inputs.map((input) => input.value);

		if (inputValues.every((value) => !value)) {
			setCurrentHash([]);
			return;
		}

		const hash: bigint[] = [];
		if (selectedFunction === "poseidon") {
			const result = poseidon(
				inputValues.map((value) => BigInt(value)),
				BN128_PRIME,
			);
			hash.push(...result);
		} else if (selectedFunction === "mimcSponge") {
			if (mimcParams.rounds === 0) {
				setCurrentHash([]);
				return;
			}
			const result = mimcSponge(
				inputValues.map((value) => bigInt(value)),
				mimcParams.nOutputs,
				mimcParams.rounds,
				mimcParams.key,
			);
			hash.push(...result.map((value) => BigInt(value.toString())));
		}
		setCurrentHash(hash);
	}, [inputs, selectedFunction, mimcParams]);

	return {
		currentHash,
	};
}
