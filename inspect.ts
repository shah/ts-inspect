import {
  InspectionContext,
  InspectionDiagnostics,
  isInspectionDiagnostics,
} from "./context.ts";
import {
  isDiagnosable,
  isInspectionException,
  isInspectionIssue,
  isInspectionIssuesManager,
  mergeIssuesIntoResult,
} from "./issue.ts";
import { EmptyInspectorsResult, InspectionResult } from "./result.ts";

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

    let result: T | InspectionResult<T> = inspectionTarget;
    const diags = isInspectionDiagnostics<T, E>(ctx) ? ctx : undefined;
    for (const inspect of inspectors) {
      try {
        result = await inspect(result, ctx);
        if (isInspectionException<T, E>(result)) {
          if (diags) {
            result = await diags.onException(
              result,
              result.exception,
            );
          }
          if (!diags || !diags?.continue(result)) return result;
        } else if (isInspectionIssue<T>(result)) {
          if (isInspectionIssuesManager<T>(result)) {
            if (diags) {
              for (const issue of result.inspectionIssues) {
                diags.onIssue(issue);
              }
            }
            result = mergeIssuesIntoResult<T>(result, result);
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
