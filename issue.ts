import { safety } from "./deps.ts";
import {
  InspectionResult,
  inspectionResult,
  isInspectionResult,
} from "./result.ts";

export function isSuccessfulInspection(o: unknown): boolean {
  return !isInspectionIssue(o) && !isInspectionException(o);
}

export interface Diagnosable<D> {
  readonly diagnostics: D[];
  readonly mostRecentDiagnostic: () => D | undefined;
}

export function isDiagnosable<D>(o: unknown): o is Diagnosable<D> {
  return safety.typeGuard<Diagnosable<D>>("diagnostics")(o);
}

export interface InspectionIssue<T> extends InspectionResult<T> {
  readonly isInspectionIssue: true;
}

export function isInspectionIssue<T>(
  o: unknown,
): o is InspectionIssue<T> {
  return safety.typeGuard<InspectionIssue<T>>(
    "isInspectionIssue",
  )(o);
}

export function inspectionIssue<T, D>(
  o: T | InspectionResult<T>,
  diagnostic: D | D[],
): InspectionIssue<T> & Diagnosable<D> {
  const diagnostics: D[] = Array.isArray(diagnostic)
    ? [...diagnostic]
    : [diagnostic];
  if (isInspectionIssue<T>(o) && isDiagnosable<D>(o)) {
    o.diagnostics.push(...diagnostics);
    return o;
  }
  const mostRecentDiagnostic = () => {
    return diagnostics[diagnostics.length - 1];
  };
  if (isInspectionResult<T>(o)) {
    return {
      ...o,
      isInspectionIssue: true,
      diagnostics: diagnostics,
      mostRecentDiagnostic: mostRecentDiagnostic,
    };
  }
  return {
    isInspectionResult: true,
    isInspectionIssue: true,
    inspectionTarget: o,
    diagnostics: diagnostics,
    mostRecentDiagnostic: mostRecentDiagnostic,
  };
}

export interface IrrecoverableInspectionIssue {
  readonly isRecoverableInspectionIssue: boolean;
}

export const isInspectionIssueIrrecoverable = safety.typeGuard<
  IrrecoverableInspectionIssue
>("isRecoverableInspectionIssue");

export interface InspectionException<T, E extends Error = Error>
  extends InspectionIssue<T> {
  readonly isInspectionException: true;
  readonly exception: E;
}

export function isInspectionException<T, E extends Error = Error>(
  o: unknown,
): o is InspectionException<T, E> {
  return safety.typeGuard<InspectionException<T, E>>(
    "isInspectionException",
  )(o);
}

export interface InspectionIssuesManager<T> {
  readonly inspectionIssues: InspectionIssue<T>[];
}

export function isInspectionIssuesManager<T>(
  o: unknown,
): o is InspectionIssuesManager<T> {
  return safety.typeGuard<InspectionIssuesManager<T>>("inspectionIssues")(o);
}

export function mergeIssuesIntoResult<T>(
  target: T | InspectionResult<T>,
  iit: InspectionIssuesManager<T>,
): T | InspectionResult<T> {
  if (iit.inspectionIssues.length > 0) {
    let mergeIssuesDest:
      & InspectionResult<T>
      & InspectionIssuesManager<T>;
    if (
      isInspectionResult<T>(target) &&
      isInspectionIssuesManager<T>(target)
    ) {
      target.inspectionIssues.push(...iit.inspectionIssues);
      mergeIssuesDest = target;
    } else if (isInspectionResult<T>(target)) {
      mergeIssuesDest = {
        ...target,
        ...iit,
      };
    } else {
      mergeIssuesDest = {
        ...inspectionResult(target),
        ...iit,
      };
    }

    return mergeIssuesDest;
  }

  return target;
}
