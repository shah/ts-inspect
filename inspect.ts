import { safety } from "./deps.ts";

export interface InspectionContext<T> {
  readonly inspectionTarget: T;
  readonly diags: InspectionDiagnostics<T, InspectionContext<T>>;
}

export interface InspectionResult<T> {
  readonly isInspectionResult: true;
  readonly inspectionTarget: T;
}

export interface DiagnosableInspectionResult<T> {
  readonly inspectionDiagnostic: T;
}

export function isDiagnosableInspectionResult<T>(
  o: unknown,
): o is DiagnosableInspectionResult<T> {
  return isDiagnosableInspectionResultUntyped(o);
}

export const isDiagnosableInspectionResultUntyped = safety.typeGuard<
  DiagnosableInspectionResult<unknown>
>("inspectionDiagnostic");

export interface SuccessfulInspection<T> extends InspectionResult<T> {
  readonly isSuccessfulInspection: true;
}

export function isSuccessfulInspection<T>(
  o: InspectionResult<unknown>,
): o is SuccessfulInspection<T> {
  return isSuccessfulInspectionUntyped(o);
}

export const isSuccessfulInspectionUntyped = safety.typeGuardCustom<
  InspectionResult<unknown>,
  SuccessfulInspection<unknown>
>("isSuccessfulInspection");

export function successfulInspection<T>(o: T): SuccessfulInspection<T> {
  return {
    isInspectionResult: true,
    isSuccessfulInspection: true,
    inspectionTarget: o,
  };
}

export interface EmptyInspectorsResult<T> extends SuccessfulInspection<T> {
  readonly isEmptyInspectors: true;
}

export interface InspectionIssue<T> extends InspectionResult<T> {
  readonly isInspectionIssue: true;
}

export const isInspectionIssue = safety.typeGuardCustom<
  InspectionResult<unknown>,
  InspectionIssue<unknown>
>("isInspectionIssue");

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

export const isInspectionException = safety.typeGuardCustom<
  InspectionResult<unknown>,
  InspectionException<unknown>
>("isInspectionException");

export interface ContentIssueDiagnostic {
  readonly message: string;
}

export interface InspectionDiagnostics<T, C extends InspectionContext<T>> {
  onIssue: (
    result: InspectionResult<T>,
    ctx: C,
  ) => Promise<InspectionResult<T>>;
  onException: (
    err: Error,
    result: InspectionResult<T>,
    ctx: C,
  ) => Promise<InspectionResult<T>>;
  continue: (ctx: C, result: InspectionResult<T>) => boolean;
}

export interface Inspector<T, C extends InspectionContext<T>> {
  (
    ctx: C,
    active: InspectionResult<T>,
  ): Promise<InspectionResult<T>>;
}

export interface InspectorInit<T, C extends InspectionContext<T>> {
  (ctx: C): Promise<InspectionResult<T>>;
}

export class InspectionDiagnosticsRecorder<T, C extends InspectionContext<T>>
  implements InspectionDiagnostics<T, C> {
  readonly issues: InspectionIssue<T>[] = [];
  readonly exceptions: InspectionException<T>[] = [];

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
    this.issues.push(issue);
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
    this.exceptions.push(exception);
    return exception;
  }
}

export interface WrappedInspectionResult<P> extends InspectionResult<P> {
  readonly wrappedInspectionResult: InspectionResult<unknown>;
}

export const isWrappedInspectionResult = safety.typeGuard<
  WrappedInspectionResult<unknown>
>("wrappedInspectionResult");

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
    return this.parentCtx.diags.continue(this.parentCtx, wrapped);
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
    await this.parentCtx.diags.onIssue(wrapped, this.parentCtx);
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
    await this.parentCtx.diags.onException(err, wrapped, this.parentCtx);
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
    if (this.verbose && isDiagnosableInspectionResult<D>(result)) {
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
      if (isDiagnosableInspectionResult<D>(result)) {
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
): InspectorInit<T, C> {
  return async (
    ctx: C,
  ): Promise<InspectionResult<T>> => {
    if (inspectors.length == 0) {
      const empty: EmptyInspectorsResult<T> = {
        isInspectionResult: true,
        isSuccessfulInspection: true,
        isEmptyInspectors: true,
        inspectionTarget: ctx.inspectionTarget,
      };
      return empty;
    }

    let result: InspectionResult<T> = {
      isInspectionResult: true,
      inspectionTarget: ctx.inspectionTarget,
    };
    for (const inspect of inspectors) {
      try {
        result = await inspect(ctx, result);
        if (isInspectionException(result)) {
          result = await ctx.diags.onException(
            result.exception,
            result,
            ctx,
          );
          if (!ctx.diags.continue(ctx, result)) return result;
        } else if (isInspectionIssue(result)) {
          result = await ctx.diags.onIssue(result, ctx);
          if (!ctx.diags.continue(ctx, result)) return result;
        }
      } catch (innerErr) {
        result = await ctx.diags.onException(innerErr, result, ctx);
        if (!ctx.diags.continue(ctx, result)) return result;
      }
    }
    return result;
  };
}
