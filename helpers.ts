import { safety } from "./deps.ts";

export interface NumericRange {
  readonly minimum: number;
  readonly maximum: number;
}

export const isRangeOptions = safety.typeGuard<NumericRange>(
  "minimum",
  "maximum",
);

export function numericRange(min: number, max: number): NumericRange {
  return {
    minimum: min,
    maximum: max,
  };
}
