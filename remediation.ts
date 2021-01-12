import { safety } from "./deps.ts";

export interface Remediatable<R> {
  readonly remediation: R[];
}

// deno-lint-ignore no-empty-interface
export interface Remediation {
}

export interface HumanPoweredRemediation extends Remediation {
  readonly humanInstructions: string;
}

export const isHumanPoweredRemediation = safety.typeGuard<
  HumanPoweredRemediation
>("humanInstructions");

export interface MachinePoweredRemediation extends Remediation {
  readonly isIdempotent: boolean;
}
