import { safety } from "./deps.ts";
import {
  InspectionException,
  InspectionIssue,
  InspectionIssuesManager,
  isDiagnosable,
  isInspectionIssue,
  isInspectionIssueRecoverable,
  isInspectionIssuesManager,
  isSuccessfulInspection,
  mergeIssuesIntoResult,
} from "./issue.ts";
import { InspectionResult, isInspectionResult } from "./result.ts";

export function mergeDiagsIntoResult<T, E extends Error>(
  target: T | InspectionResult<T>,
  diags: InspectionDiagnostics<T, E>,
): T | InspectionResult<T> {
  if (isInspectionIssuesManager<T>(diags)) {
    return mergeIssuesIntoResult(target, diags);
  }

  return target;
}

export function mergeDiagsIntoIssue<T, E extends Error>(
  target: T | InspectionResult<T>,
  diags: InspectionDiagnostics<T, E>,
): T | InspectionIssue<T> {
  const result = mergeDiagsIntoResult(target, diags);
  if (isInspectionIssue<T>(result)) return result;
  if (isInspectionResult<T>(result)) {
    return {
      ...result,
      isInspectionIssue: true,
    };
  }
  if (isInspectionResult<T>(target)) {
    // this should never happen, but is here for type-safety;
    // isInspectionResult<T>(result) above should have been caught as true
    return {
      ...target,
      isInspectionIssue: true,
    };
  }
  return target;
}

export interface InspectionContext {
  readonly isInInspectionPipe?: boolean;
}

export function inspectionContext<T>(
  o: InspectionContext & T,
): InspectionContext & T {
  return { ...o };
}

export function defaultInspectionContext(): InspectionContext {
  return {};
}

export function inspectionPipeContext(): InspectionContext {
  return { isInInspectionPipe: true };
}

export interface InspectionDiagnostics<
  T,
  E extends Error,
> extends InspectionContext {
  readonly continue: (target: T | InspectionResult<T>) => boolean;
  readonly onIssue: (issue: InspectionIssue<T>) => Promise<InspectionIssue<T>>;
  readonly onException: (
    target: T | InspectionResult<T>,
    error: E,
  ) => Promise<T | InspectionResult<T>>;
}

export function isInspectionDiagnostics<
  T,
  E extends Error,
>(o: unknown): o is InspectionDiagnostics<T, E> {
  return safety.typeGuard<InspectionDiagnostics<T, E>>(
    "continue",
    "onIssue",
    "onException",
  )(o);
}

export class InspectionDiagnosticsRecorder<
  T,
  E extends Error = Error,
> implements
  InspectionContext,
  InspectionDiagnostics<T, E>,
  InspectionIssuesManager<T> {
  readonly isInInspectionPipe: boolean;
  readonly inspectionIssues: InspectionIssue<T>[] = [];

  constructor(context: InspectionContext) {
    this.isInInspectionPipe = context.isInInspectionPipe || false;
  }

  continue(target: T | InspectionResult<T>): boolean {
    if (isInspectionIssueRecoverable(target)) return true;

    // stop after the first unrecoverable error
    return isSuccessfulInspection(target);
  }

  async onIssue(
    issue: InspectionIssue<T>,
  ): Promise<InspectionIssue<T>> {
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
  return safety.typeGuard<W>("wrappedInspectionTarget")(o);
}

export function WrappedInspectionIssue<
  T,
  W extends WrappedInspectionIssue<T, W>,
>(o: unknown): o is W {
  return isWrappedInspectionResult<T, W>(o) &&
    safety.typeGuard<W>("wrappedInspectionIssue")(o);
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
  E extends Error,
  W,
> implements InspectionContext, InspectionDiagnostics<T, E> {
  constructor(
    readonly parent: W,
    readonly parentDiags: InspectionDiagnostics<W, E>,
    readonly wrap: (
      target: T | InspectionResult<T>,
      parent: W,
    ) => WrappedInspectionResult<T, W> = wrapInspectionResult,
  ) {
  }

  get isInInspectionPipe(): boolean | undefined {
    return this.parentDiags.isInInspectionPipe;
  }

  continue(target: T | InspectionResult<T>): boolean {
    const wrapped = this.wrap(target, this.parent);
    return this.parentDiags.continue(wrapped);
  }

  async onIssue(
    issue: InspectionIssue<T>,
  ): Promise<InspectionIssue<T>> {
    const wrapped = wrapInspectionIssue(issue, this.parent);
    await this.parentDiags.onIssue(wrapped);
    return issue;
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
  implements InspectionContext, InspectionDiagnostics<T, E> {
  constructor(
    readonly wrap: InspectionDiagnostics<T, E>,
    readonly verbose?: boolean,
  ) {
  }

  get isInInspectionPipe(): boolean | undefined {
    return this.wrap.isInInspectionPipe;
  }

  continue(target: T | InspectionResult<T>): boolean {
    return this.wrap.continue(target);
  }

  async onIssue(
    issue: InspectionIssue<T>,
  ): Promise<InspectionIssue<T>> {
    if (this.verbose && isDiagnosable<D>(issue)) {
      console.error(issue.mostRecentDiagnostic());
    }
    return await this.wrap.onIssue(issue);
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
