import type { Point } from "circomlibjs";

export type HashFunction = "poseidon" | "mimcSponge";
export type DisplayMode = "decimal" | "hex";

export interface HashInput {
	id: string;
	value: string;
}

export interface MimcParams {
	rounds: number;
	key: number;
	nOutputs: number;
}

export interface IJub {
	inCurve: (point: Point) => boolean;
	addPoint(a: Point, b: Point): Point;
	F: {
		e: (a: bigint, b?: bigint) => Uint8Array;
	};
}

export interface IJubPoint {
	x: bigint;
	y: bigint;
}
