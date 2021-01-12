import { safety } from "../deps.ts";
import * as rem from "../remediation.ts";

// deno-lint-ignore no-empty-interface
export interface DataStoreRemediation extends rem.MachinePoweredRemediation {
}

export interface RelationalDataStoreRemediation extends DataStoreRemediation {
  readonly sql: (options: { rdbms: string }) => string;
}

export const isRelationalDataStoreRemediation = safety.typeGuard<
  RelationalDataStoreRemediation
>("sql", "isIdempotent");
