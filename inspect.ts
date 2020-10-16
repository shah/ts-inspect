import {
  typeGuard,
} from "https://raw.githubusercontent.com/shah/ts-safety/v0.2.4/guards.ts";
import { safety } from "./deps.ts";

export interface InspectionResult<T> {
  readonly isInspectionResult: true;
  readonly inspectionTarget: T;
}

export function isInspectionResult<T extends InspectionResult<T>>(
  o: unknown,
): o is T {
  return typeGuard<T>("isInspectionResult", "inspectionTarget")(o);
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

export interface EmptyInspectorsResult<T> extends InspectionResult<T> {
  readonly isEmptyInspectorsResult: true;
}

export function isEmptyInspectors<T extends EmptyInspectorsResult<T>>(
  o: unknown,
): o is T {
  return typeGuard<T>("isEmptyInspectorsResult")(o);
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

export function isInspectionIssuesTracker<
  T extends InspectionIssuesTracker<T>,
>(o: unknown): o is T {
  return typeGuard<T>("inspectionIssues")(o);
}

// deno-lint-ignore no-empty-interface
export interface InspectionOptions {
}

export interface InspectionDiagnostics<T, D, E extends Error = Error> {
  readonly options?: InspectionOptions;
  readonly onIssue: (
    target: T | InspectionResult<T>,
    diagnostic: D,
  ) => Promise<T | InspectionResult<T>>;
  readonly onException: (
    target: T | InspectionResult<T>,
    error: E,
  ) => Promise<T | InspectionResult<T>>;
  readonly continue: (target: T | InspectionResult<T>) => boolean;
}

export interface Inspector<
  T,
  D,
  E extends Error = Error,
> {
  (
    target: T | InspectionResult<T>,
    diags?: InspectionDiagnostics<T, D, E>,
  ): Promise<T | InspectionResult<T>>;
}

export interface InspectionPipe<
  T,
  D,
  E extends Error = Error,
> {
  (
    inspectionTarget: T,
    diags?: InspectionDiagnostics<T, D, E>,
  ): Promise<T | InspectionResult<T>>;
}

export class InspectionDiagnosticsRecorder<T, D, E extends Error = Error>
  implements InspectionDiagnostics<T, D, E>, InspectionIssuesTracker<T> {
  readonly inspectionIssues: InspectionIssue<T>[] = [];

  constructor(readonly options?: InspectionOptions) {
  }

  continue(target: T | InspectionResult<T>): boolean {
    if (isInspectionIssueRecoverable(target)) return true;

    // stop after the first unrecoverable error
    return isSuccessfulInspection(target);
  }

  async onIssue(
    target: T | InspectionResult<T>,
    diagnostic: D,
  ): Promise<T | InspectionResult<T>> {
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

export function isWrappedInspectionResult<
  T,
  W extends WrappedInspectionResult<T, W>,
>(o: unknown): o is W {
  return typeGuard<W>("wrappedInspectionTarget")(o);
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

  get options(): InspectionOptions | undefined {
    return this.parentDiags.options;
  }

  continue(target: T | InspectionResult<T>): boolean {
    const wrapped = this.wrap(target, this.parent);
    return this.parentDiags.continue(wrapped);
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

  get options(): InspectionOptions | undefined {
    return this.wrap.options;
  }

  continue(target: T | InspectionResult<T>): boolean {
    return this.wrap.continue(target);
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
  E extends Error = Error,
>(
  ...inspectors: Inspector<T, D, E>[]
): InspectionPipe<T, D, E> {
  return async (
    inspectionTarget: T,
    diags?: InspectionDiagnostics<T, D, E>,
  ): Promise<T | InspectionResult<T>> => {
    if (inspectors.length == 0) {
      const empty: EmptyInspectorsResult<T> = {
        isInspectionResult: true,
        isEmptyInspectorsResult: true,
        inspectionTarget: inspectionTarget,
      };
      return empty;
    }

    let result: T | InspectionResult<T> = {
      isInspectionResult: true,
      inspectionTarget: inspectionTarget,
    };
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
          if (diags && isDiagnosable<D>(result)) {
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
