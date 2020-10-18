import {
  typeGuard,
} from "https://raw.githubusercontent.com/shah/ts-safety/v0.2.4/guards.ts";
import { safety } from "./deps.ts";

export interface InspectionResult<T> {
  readonly isInspectionResult: true;
  readonly inspectionTarget: T;
}

export function isInspectionResult<T>(
  o: unknown,
): o is InspectionResult<T> {
  return typeGuard<InspectionResult<T>>(
    "isInspectionResult",
    "inspectionTarget",
  )(o);
}

export function isSuccessfulInspection(o: unknown): boolean {
  return !isInspectionIssue(o) && !isInspectionException(o);
}

export function inspectionResult<T>(target: T): InspectionResult<T> {
  return {
    isInspectionResult: true,
    inspectionTarget: target,
  };
}

export interface InspectionResultSupplier<T> {
  (...args: unknown[]): InspectionResult<T>;
}

export function isInspectionResultSupplier<T>(
  o: InspectionResult<T> | InspectionResultSupplier<T>,
): o is InspectionResultSupplier<T> {
  return o && typeof o === "function";
}

export interface EmptyInspectorsResult<T> extends InspectionResult<T> {
  readonly isEmptyInspectorsResult: true;
}

export function isEmptyInspectors<T>(
  o: unknown,
): o is EmptyInspectorsResult<T> {
  return typeGuard<EmptyInspectorsResult<T>>("isEmptyInspectorsResult")(o);
}

export interface Diagnosable<D> {
  readonly diagnostic: D;
}

export function isDiagnosable<D>(o: unknown): o is Diagnosable<D> {
  return typeGuard<Diagnosable<D>>("diagnostic")(o);
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
  o: T,
  diagnostic: D,
): InspectionIssue<T> & Diagnosable<D> {
  return {
    isInspectionResult: true,
    isInspectionIssue: true,
    inspectionTarget: o,
    diagnostic: diagnostic,
  };
}

export interface RecoverableInspectionIssue {
  readonly isRecoverableInspectionIssue: boolean;
}

export const isInspectionIssueRecoverable = safety.typeGuard<
  RecoverableInspectionIssue
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

export interface InspectionIssuesTracker<T> {
  readonly inspectionIssues: InspectionIssue<T>[];
}

export function isInspectionIssuesTracker<T>(
  o: unknown,
): o is InspectionIssuesTracker<T> {
  return typeGuard<InspectionIssuesTracker<T>>("inspectionIssues")(o);
}

export function mergeIssuesIntoResult<T>(
  target: T | InspectionResult<T>,
  iit: InspectionIssuesTracker<T>,
): T | InspectionResult<T> {
  if (iit.inspectionIssues.length > 0) {
    let mergeIssuesDest:
      & InspectionResult<T>
      & InspectionIssuesTracker<T>;
    if (
      isInspectionResult<T>(target) &&
      isInspectionIssuesTracker<T>(target)
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

export function mergeDiagsIntoResult<T, D, E extends Error>(
  target: T | InspectionResult<T>,
  diags: InspectionDiagnostics<T, D, E>,
): T | InspectionResult<T> {
  if (isInspectionIssuesTracker<T>(diags)) {
    return mergeIssuesIntoResult(target, diags);
  }

  return target;
}

export interface InspectionContext {
  readonly isInInspectionPipe?: boolean;
}

export function defaultInspectionContext(): InspectionContext {
  return {};
}

export function inspectionPipeContext(): InspectionContext {
  return { isInInspectionPipe: true };
}

// deno-lint-ignore no-empty-interface
export interface InspectionOptions {
}

export interface InspectionDiagnostics<T, D, E extends Error = Error> {
  readonly context: InspectionContext;
  readonly options?: InspectionOptions;
  readonly onIssue: (
    target: T | InspectionResult<T>,
    diagnostic: D,
  ) => Promise<T | InspectionResult<T>>;
  readonly onPreparedIssue: (
    issue: InspectionIssue<T>,
  ) => Promise<InspectionIssue<T>>;
  readonly onException: (
    target: T | InspectionResult<T>,
    error: E,
  ) => Promise<T | InspectionResult<T>>;
  readonly continue: (target: T | InspectionResult<T>) => boolean;
}

export interface Inspector<
  T,
  D,
  E extends Error,
  ID extends InspectionDiagnostics<T, D, E>,
> {
  (
    target: T | InspectionResult<T>,
    diags?: ID,
  ): Promise<T | InspectionResult<T>>;
}

export interface InspectionPipe<
  T,
  D,
  E extends Error,
  ID extends InspectionDiagnostics<T, D, E>,
> {
  (
    inspectionTarget: T,
    diags?: ID,
  ): Promise<T | InspectionResult<T>>;
}

export class InspectionDiagnosticsRecorder<T, D, E extends Error = Error>
  implements InspectionDiagnostics<T, D, E>, InspectionIssuesTracker<T> {
  readonly inspectionIssues: InspectionIssue<T>[] = [];

  constructor(
    readonly context: InspectionContext,
    readonly options?: InspectionOptions,
  ) {
  }

  continue(target: T | InspectionResult<T>): boolean {
    if (isInspectionIssueRecoverable(target)) return true;

    // stop after the first unrecoverable error
    return isSuccessfulInspection(target);
  }

  async onPreparedIssue(
    issue: InspectionIssue<T>,
  ): Promise<InspectionIssue<T>> {
    this.inspectionIssues.push(issue);
    return issue;
  }

  async onIssue(
    target: T | InspectionResult<T>,
    diagnostic: D,
  ): Promise<T | InspectionResult<T>> {
    if (isInspectionIssue<T>(target)) {
      return this.onPreparedIssue(target);
    }

    let issue: InspectionIssue<T> & Diagnosable<D>;
    if (isInspectionResult(target)) {
      issue = {
        ...target,
        isInspectionIssue: true,
        diagnostic: diagnostic,
      };
    } else {
      issue = {
        isInspectionResult: true,
        isInspectionIssue: true,
        inspectionTarget: target,
        diagnostic: diagnostic,
      };
    }
    this.inspectionIssues.push(issue);
    return issue;
  }

  async onException(
    target: T | InspectionResult<T>,
    error: E,
  ): Promise<T | InspectionResult<T>> {
    let exception: InspectionException<T, E>;
    if (isInspectionResult(target)) {
      exception = {
        ...target,
        isInspectionIssue: true,
        isInspectionException: true,
        exception: error,
      };
    } else {
      exception = {
        isInspectionResult: true,
        inspectionTarget: target,
        isInspectionIssue: true,
        isInspectionException: true,
        exception: error,
      };
    }
    this.inspectionIssues.push(exception);
    return exception;
  }
}

export interface WrappedInspectionResult<T, W> extends InspectionResult<W> {
  readonly wrappedInspectionTarget: T | InspectionResult<T>;
}

export interface WrappedInspectionIssue<T, W>
  extends InspectionIssue<W>, WrappedInspectionResult<T, W> {
  readonly wrappedInspectionIssue: InspectionIssue<T>;
}

export function isWrappedInspectionResult<
  T,
  W extends WrappedInspectionResult<T, W>,
>(o: unknown): o is W {
  return typeGuard<W>("wrappedInspectionTarget")(o);
}

export function WrappedInspectionIssue<
  T,
  W extends WrappedInspectionIssue<T, W>,
>(o: unknown): o is W {
  return isWrappedInspectionResult<T, W>(o) &&
    typeGuard<W>("wrappedInspectionIssue")(o);
}

export function wrapInspectionResult<T, W>(
  target: T | InspectionResult<T>,
  wrapInto: W,
): WrappedInspectionResult<T, W> {
  if (isInspectionResult(target)) {
    return {
      ...target,
      inspectionTarget: wrapInto,
      wrappedInspectionTarget: target,
    };
  } else {
    return {
      isInspectionResult: true,
      inspectionTarget: wrapInto,
      wrappedInspectionTarget: target,
    };
  }
}

export function wrapInspectionIssue<T, W>(
  issue: InspectionIssue<T>,
  wrapInto: W,
): WrappedInspectionIssue<T, W> {
  return {
    ...issue,
    inspectionTarget: wrapInto,
    wrappedInspectionTarget: issue,
    wrappedInspectionIssue: issue,
  };
}

export class WrappedInspectionDiagnostics<
  T,
  D,
  E extends Error,
  W,
> implements InspectionDiagnostics<T, D, E> {
  constructor(
    readonly parent: W,
    readonly parentDiags: InspectionDiagnostics<W, D, E>,
    readonly wrap: (
      target: T | InspectionResult<T>,
      parent: W,
    ) => WrappedInspectionResult<T, W> = wrapInspectionResult,
  ) {
  }

  get context(): InspectionContext {
    return this.parentDiags.context;
  }

  get options(): InspectionOptions | undefined {
    return this.parentDiags.options;
  }

  continue(target: T | InspectionResult<T>): boolean {
    const wrapped = this.wrap(target, this.parent);
    return this.parentDiags.continue(wrapped);
  }

  async onPreparedIssue(
    issue: InspectionIssue<T>,
  ): Promise<InspectionIssue<T>> {
    const wrapped = wrapInspectionIssue(issue, this.parent);
    await this.parentDiags.onPreparedIssue(wrapped);
    return issue;
  }

  async onIssue(
    target: T | InspectionResult<T>,
    diagnostic: D,
  ): Promise<T | InspectionResult<T>> {
    const wrapped = this.wrap(target, this.parent);
    await this.parentDiags.onIssue(wrapped, diagnostic);
    return target;
  }

  async onException(
    target: T | InspectionResult<T>,
    error: E,
  ): Promise<T | InspectionResult<T>> {
    const wrapped = this.wrap(target, this.parent);
    await this.parentDiags.onException(wrapped, error);
    return target;
  }
}

export class ConsoleInspectionDiagnostics<T, D, E extends Error = Error>
  implements InspectionDiagnostics<T, D, E> {
  constructor(
    readonly wrap: InspectionDiagnostics<T, D, E>,
    readonly verbose?: boolean,
  ) {
  }

  get context(): InspectionContext {
    return this.wrap.context;
  }

  get options(): InspectionOptions | undefined {
    return this.wrap.options;
  }

  continue(target: T | InspectionResult<T>): boolean {
    return this.wrap.continue(target);
  }

  async onPreparedIssue(
    issue: InspectionIssue<T>,
  ): Promise<InspectionIssue<T>> {
    if (this.verbose && isDiagnosable<T>(issue)) {
      console.error(issue.diagnostic);
    }
    return await this.wrap.onPreparedIssue(issue);
  }

  async onIssue(
    target: T | InspectionResult<T>,
    diagnostic: D,
  ): Promise<T | InspectionResult<T>> {
    if (this.verbose) {
      console.error(diagnostic);
    }
    return await this.wrap.onIssue(target, diagnostic);
  }

  async onException(
    target: T | InspectionResult<T>,
    error: E,
  ): Promise<T | InspectionResult<T>> {
    if (this.verbose) {
      console.error(error);
    }
    return await this.wrap.onException(target, error);
  }
}

export function inspectionPipe<
  T,
  D,
  E extends Error,
  ID extends InspectionDiagnostics<T, D, E>,
>(
  ...inspectors: Inspector<T, D, E, ID>[]
): InspectionPipe<T, D, E, ID> {
  return async (
    inspectionTarget: T,
    diags?: ID,
  ): Promise<T | InspectionResult<T>> => {
    if (inspectors.length == 0) {
      const empty: EmptyInspectorsResult<T> = {
        isInspectionResult: true,
        isEmptyInspectorsResult: true,
        inspectionTarget: inspectionTarget,
      };
      return empty;
    }

    if (diags) {
      if (!diags.options) {
        diags.options;
      }
    }
    let result: T | InspectionResult<T> = inspectionTarget;
    for (const inspect of inspectors) {
      try {
        result = await inspect(result, diags);
        if (isInspectionException<T, E>(result)) {
          if (diags) {
            result = await diags.onException(
              result,
              result.exception,
            );
          }
          if (!diags || !diags?.continue(result)) return result;
        } else if (isInspectionIssue<T>(result)) {
          if (isInspectionIssuesTracker<T>(result)) {
            if (diags) {
              for (const issue of result.inspectionIssues) {
                diags.onPreparedIssue(issue);
              }
            }
            result = mergeIssuesIntoResult<T>(result, result);
          } else if (diags && isDiagnosable<D>(result)) {
            result = await diags.onIssue(result, result.diagnostic);
          }
          if (!diags || !diags.continue(result)) return result;
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
