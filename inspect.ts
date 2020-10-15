import {
  typeGuard,
} from "https://raw.githubusercontent.com/shah/ts-safety/v0.2.4/guards.ts";
import { safety } from "./deps.ts";

export interface Inspectable<T> {
  readonly inspect: (
    target?: T,
    ctx?: InspectionContext<T>,
  ) => Promise<InspectionContext<T>>;
}

export function isInspectable<T extends Inspectable<T>>(o: unknown): o is T {
  return typeGuard<T>("inspect")(o);
}

export interface InspectionContext<T> {
  readonly inspectionDiags: InspectionDiagnostics<T, InspectionContext<T>>;
}

export function isInspectionDiagnosticsSupplier<
  T extends InspectionContext<T>,
>(o: unknown): o is T {
  return typeGuard<T>("inspectionDiags")(o);
}

export interface InspectionResultSupplier<T> {
  readonly inspectionResult: T;
}

export function isInspectionResultSupplier<
  T extends InspectionResultSupplier<T>,
>(o: unknown): o is T {
  return typeGuard<T>("inspectionResult")(o);
}

export interface InspectionResult<T> {
  readonly isInspectionResult: true;
  readonly inspectionTarget: T;
}

export function isSuccessfulInspection<T>(o: InspectionResult<T>): boolean {
  return !isInspectionIssue(o) && !isInspectionException(o);
}

export interface EmptyInspectorsResult<T> extends InspectionResult<T> {
  readonly isEmptyInspectorsResult: true;
}

export function isEmptyInspectors<T extends EmptyInspectorsResult<T>>(
  o: unknown,
): o is T {
  return typeGuard<T>("isEmptyInspectorsResult")(o);
}

export interface DiagnosableInspectionResult<T> {
  readonly inspectionDiagnostic: T;
}

export function isDiagnosableInspectionResult<
  T extends DiagnosableInspectionResult<T>,
>(o: unknown): o is T {
  return typeGuard<T>("inspectionDiagnostic")(o);
}

export interface InspectionIssue<T> extends InspectionResult<T> {
  readonly isInspectionIssue: true;
}

export function isInspectionIssue<T>(
  o: InspectionResult<T>,
): o is InspectionIssue<T> {
  return safety.typeGuardCustom<InspectionResult<T>, InspectionIssue<T>>(
    "isInspectionIssue",
  )(o);
}

export function inspectionIssue<T, D>(
  o: T,
  diagnostic?: D,
):
  | InspectionIssue<T>
  | InspectionIssue<T> & DiagnosableInspectionResult<D> {
  const result: InspectionIssue<T> = {
    isInspectionResult: true,
    isInspectionIssue: true,
    inspectionTarget: o,
  };
  if (diagnostic) {
    const dr: InspectionIssue<T> & DiagnosableInspectionResult<D> = {
      ...result,
      inspectionDiagnostic: diagnostic,
    };
    return dr;
  }
  return result;
}

export interface RecoverableInspectionIssue {
  readonly isRecoverableInspectionIssue: boolean;
}

export const isInspectionIssueRecoverable = safety.typeGuard<
  RecoverableInspectionIssue
>("isRecoverableInspectionIssue");

export interface InspectionException<T> extends InspectionIssue<T> {
  readonly isInspectionException: true;
  readonly exception: Error;
}

export function isInspectionException<T>(
  o: InspectionResult<T>,
): o is InspectionException<T> {
  return safety.typeGuardCustom<InspectionResult<T>, InspectionException<T>>(
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

export interface InspectionExceptionsTracker<T> {
  readonly inspectionExceptions: InspectionException<T>[];
}

export function isInspectionExceptionsTracker<
  T extends InspectionExceptionsTracker<T>,
>(o: unknown): o is T {
  return typeGuard<T>("inspectionExceptions")(o);
}

export interface InspectionDiagnostics<T, C extends InspectionContext<T>> {
  readonly onIssue: (
    result: InspectionResult<T>,
    ctx: C,
  ) => Promise<InspectionResult<T>>;
  readonly onException: (
    err: Error,
    result: InspectionResult<T>,
    ctx: C,
  ) => Promise<InspectionResult<T>>;
  readonly continue: (ctx: C, result: InspectionResult<T>) => boolean;
}

export interface Inspector<T, C extends InspectionContext<T>> {
  (ctx: C, ir: InspectionResult<T>): Promise<InspectionResult<T>>;
}

export interface InspectionPipe<T, C extends InspectionContext<T>> {
  (ctx: C, inspectionTarget: T): Promise<InspectionResult<T>>;
}

export class InspectionDiagnosticsRecorder<T, C extends InspectionContext<T>>
  implements
    InspectionDiagnostics<T, C>,
    InspectionIssuesTracker<T>,
    InspectionExceptionsTracker<T> {
  readonly inspectionIssues: InspectionIssue<T>[] = [];
  readonly inspectionExceptions: InspectionException<T>[] = [];

  continue(ctx: C, result: InspectionResult<T>): boolean {
    if (isInspectionIssueRecoverable(result)) return true;

    // stop after the first unrecoverable error
    return isSuccessfulInspection(result);
  }

  async onIssue(
    result: InspectionResult<T>,
    ctx: C,
  ): Promise<InspectionResult<T>> {
    const issue: InspectionIssue<T> = {
      // if the result is diagnosable, it will be part of the spread
      ...result,
      isInspectionIssue: true,
    };
    this.inspectionIssues.push(issue);
    return issue;
  }

  async onException(
    err: Error,
    result: InspectionResult<T>,
    ctx: C,
  ): Promise<InspectionResult<T>> {
    const exception: InspectionException<T> = {
      ...result,
      isInspectionIssue: true,
      isInspectionException: true,
      exception: err,
    };
    this.inspectionExceptions.push(exception);
    return exception;
  }
}

export interface WrappedInspectionResult<P> extends InspectionResult<P> {
  readonly wrappedInspectionResult: InspectionResult<unknown>;
}

export function isWrappedInspectionResult<
  P extends WrappedInspectionResult<P>,
>(o: unknown): o is P {
  return typeGuard<P>("wrappedInspectionResult")(o);
}

export class DerivedInspectionDiagnostics<
  T,
  C extends InspectionContext<T>,
  P,
> implements InspectionDiagnostics<T, C> {
  constructor(
    readonly parent: P,
    readonly parentCtx: InspectionContext<P>,
  ) {
  }

  continue(ctx: C, result: InspectionResult<T>): boolean {
    const wrapped: WrappedInspectionResult<P> = {
      ...result,
      inspectionTarget: this.parent,
      wrappedInspectionResult: result,
    };
    return this.parentCtx.inspectionDiags.continue(this.parentCtx, wrapped);
  }

  async onIssue(
    result: InspectionResult<T>,
    ctx: C,
  ): Promise<InspectionResult<T>> {
    const wrapped: WrappedInspectionResult<P> = {
      ...result,
      inspectionTarget: this.parent,
      wrappedInspectionResult: result,
    };
    await this.parentCtx.inspectionDiags.onIssue(wrapped, this.parentCtx);
    return result;
  }

  async onException(
    err: Error,
    result: InspectionResult<T>,
    ctx: C,
  ): Promise<InspectionResult<T>> {
    const wrapped: WrappedInspectionResult<P> = {
      ...result,
      inspectionTarget: this.parent,
      wrappedInspectionResult: result,
    };
    await this.parentCtx.inspectionDiags.onException(
      err,
      wrapped,
      this.parentCtx,
    );
    return result;
  }
}

export class ConsoleInspectionDiagnostics<T, C extends InspectionContext<T>, D>
  implements InspectionDiagnostics<T, C> {
  constructor(
    readonly wrap: InspectionDiagnostics<T, C>,
    readonly verbose?: boolean,
  ) {
  }

  continue(ctx: C, result: InspectionResult<T>): boolean {
    return this.wrap.continue(ctx, result);
  }

  async onIssue(
    result: InspectionResult<T>,
    ctx: C,
  ): Promise<InspectionResult<T>> {
    if (this.verbose && isDiagnosableInspectionResult(result)) {
      console.error(result.inspectionDiagnostic);
    }
    return await this.wrap.onIssue(result, ctx);
  }

  async onException(
    err: Error,
    result: InspectionResult<T>,
    ctx: C,
  ): Promise<InspectionResult<T>> {
    if (this.verbose) {
      if (isDiagnosableInspectionResult(result)) {
        console.error(result.inspectionDiagnostic);
      } else {
        console.error(err);
      }
    }
    return await this.wrap.onException(err, result, ctx);
  }
}

export function inspectionPipe<T, C extends InspectionContext<T>>(
  ...inspectors: Inspector<T, InspectionContext<T>>[]
): InspectionPipe<T, C> {
  return async (
    ctx: C,
    inspectionTarget: T,
  ): Promise<InspectionResult<T>> => {
    if (inspectors.length == 0) {
      const empty: EmptyInspectorsResult<T> = {
        isInspectionResult: true,
        isEmptyInspectorsResult: true,
        inspectionTarget: inspectionTarget,
      };
      return empty;
    }

    let result: InspectionResult<T> = {
      isInspectionResult: true,
      inspectionTarget: inspectionTarget,
    };
    for (const inspect of inspectors) {
      try {
        result = await inspect(ctx, result);
        if (isInspectionException(result)) {
          result = await ctx.inspectionDiags.onException(
            result.exception,
            result,
            ctx,
          );
          if (!ctx.inspectionDiags.continue(ctx, result)) return result;
        } else if (isInspectionIssue(result)) {
          result = await ctx.inspectionDiags.onIssue(result, ctx);
          if (!ctx.inspectionDiags.continue(ctx, result)) return result;
        }
      } catch (innerErr) {
        result = await ctx.inspectionDiags.onException(innerErr, result, ctx);
        if (!ctx.inspectionDiags.continue(ctx, result)) return result;
      }
    }
    return result;
  };
}
