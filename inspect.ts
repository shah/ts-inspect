import {
  InspectionContext,
  InspectionDiagnostics,
  isInspectionDiagnostics,
} from "./context.ts";
import {
  InspectionIssue,
  isDiagnosable,
  isInspectionException,
  isInspectionIssue,
  isInspectionIssuesManager,
} from "./issue.ts";
import {
  EmptyInspectorsResult,
  InspectionResult,
  isInspectionResult,
} from "./result.ts";
import { safety } from "./deps.ts";

export interface Inspector<T> {
  (
    target: T | InspectionResult<T>,
    ctx?: InspectionContext,
  ): Promise<T | InspectionResult<T>>;
}

export interface InspectionPipe<T> {
  (
    initTarget: T,
    ctx?: InspectionContext,
  ): Promise<T | InspectionResult<T>>;
}

export interface InspectorProvenance<T> {
  readonly inspector: Inspector<T>;
  readonly inspectorIdentity: string;
}

export const InspectorProvenance = safety.typeGuard<
  InspectorProvenance<unknown>
>(
  "inspector",
  "inspectorIdentity",
);

export interface InspectorProvenanceSupplier<T> {
  readonly inspectorProvenance: InspectorProvenance<T>;
}

export const isInspectorProvenanceSupplier = safety.typeGuard<
  InspectorProvenanceSupplier<unknown>
>("inspectorProvenance");

export function decorateProvenance<T>(
  target: T | InspectionResult<T>,
  inspector: Inspector<T>,
): T | (InspectionResult<T> & InspectorProvenanceSupplier<T>) {
  if (isInspectionResult<T>(target)) {
    return {
      ...target,
      inspectorProvenance: {
        inspector: inspector,
        inspectorIdentity: inspector.name,
      },
    };
  }
  return target;
}

export interface Encounterable {
  readonly encounteredBy: symbol;
}

export const isEncountered = safety.typeGuard<Encounterable>("encounteredBy");

export function isEncounteredBy(o: unknown, by: symbol): o is Encounterable {
  return isEncountered(o) && o.encounteredBy === by;
}

export function inspectionPipe<T, D, E extends Error>(
  ...inspectors: Inspector<T>[]
): InspectionPipe<T> {
  return async (
    inspectionTarget: T,
    ctx?: InspectionContext | InspectionDiagnostics<T, E>,
  ): Promise<T | InspectionResult<T>> => {
    if (inspectors.length == 0) {
      const empty: EmptyInspectorsResult<T> = {
        isInspectionResult: true,
        isEmptyInspectorsResult: true,
        inspectionTarget: inspectionTarget,
      };
      return empty;
    }

    const pipeID = Symbol();
    let result: T | InspectionResult<T> = inspectionTarget;
    const diags = isInspectionDiagnostics<T, E>(ctx) ? ctx : undefined;
    for (const inspect of inspectors) {
      try {
        result = decorateProvenance(await inspect(result, ctx), inspect);
        if (isInspectionException<T, E>(result)) {
          if (diags) {
            result = await diags.onException(
              result,
              result.exception,
            );
          }
          if (!diags || !diags?.continue(result)) return result;
        } else if (isInspectionIssue<T>(result)) {
          if (diags && isInspectionIssuesManager<T>(result)) {
            // if the issues are being collected by the result, then let's
            // make sure we don't duplicate the onIssue() calls across
            // inspectors
            for (let i = 0; i < result.inspectionIssues.length; i++) {
              const issue = result.inspectionIssues[i];
              if (isEncounteredBy(issue, pipeID)) {
                continue;
              }
              const ei:
                & InspectionIssue<T>
                & Encounterable
                & InspectorProvenanceSupplier<T> = {
                  ...issue,
                  encounteredBy: pipeID,
                  inspectorProvenance: {
                    inspector: inspect,
                    inspectorIdentity: inspect.name,
                  },
                };
              result.inspectionIssues[i] = await diags.onIssue(ei);
            }
          } else if (
            diags && isInspectionIssue<T>(result) && isDiagnosable<D>(result)
          ) {
            result = await diags.onIssue(result);
          }
          if (diags && !diags.continue(result)) return result;
        }
      } catch (innerErr) {
        if (diags) {
          result = await diags.onException(result, innerErr);
        }
        if (!diags || !diags.continue(result)) return result;
      }
    }
    return result;
  };
}
