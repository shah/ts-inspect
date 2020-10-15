import type { safety } from "../deps.ts";
import * as insp from "../inspect.ts";

// deno-lint-ignore no-empty-interface
export interface TextInspectionResult
  extends insp.InspectionResult<TextContentSupplier> {
}

export interface TextContentSupplier {
  readonly text: string;
  readonly onNoIssues: (
    active: TextInspectionResult,
  ) => TextInspectionResult;
  readonly onNoTextAvailable?: (
    active: TextInspectionResult,
  ) => TextInspectionResult;
}

export const isSuccessfulTextInspection = insp.isSuccessfulInspection;

export interface TextInspectionIssue
  extends
    insp.InspectionIssue<TextContentSupplier>,
    insp.DiagnosableInspectionResult<TextContentSupplier> {
}

export const textIssue = insp.inspectionIssue;
export const isTextInspectionIssue = insp.isInspectionIssue;
export const isDiagnosableTextInspectionIssue =
  insp.isDiagnosableInspectionResult;

// deno-lint-ignore no-empty-interface
export interface TextSanitizerContext {
}

// deno-lint-ignore no-empty-interface
export interface TextInspectionContext
  extends insp.InspectionContext<TextContentSupplier> {
}

export function textInspectionTarget(
  content: string,
  sanitize?: safety.TransformerSync<
    TextSanitizerContext,
    string | TextContentSupplier
  >,
): TextContentSupplier {
  const sanitized = sanitize ? sanitize.transform(content) : content;
  return typeof sanitized == "string"
    ? {
      text: sanitized,
      onNoIssues: (active: TextInspectionResult) => {
        return active;
      },
    }
    : sanitized;
}

export class TypicalTextInspectionContext implements TextInspectionContext {
  readonly inspectionDiags = new insp.InspectionDiagnosticsRecorder<
    TextContentSupplier,
    TextInspectionContext
  >();
}

export class DerivedTextInspectionContext<P> implements TextInspectionContext {
  readonly inspectionDiags: insp.InspectionDiagnostics<
    TextContentSupplier,
    TextInspectionContext
  >;

  constructor(
    parent: P,
    parentCtx: insp.InspectionContext<P>,
  ) {
    this.inspectionDiags = new insp.DerivedInspectionDiagnostics(
      parent,
      parentCtx,
    );
  }
}

export interface TextInspector
  extends insp.Inspector<TextContentSupplier, TextInspectionContext> {
  (
    ctx: TextInspectionContext,
    active: TextInspectionResult,
  ): Promise<insp.InspectionResult<TextContentSupplier>>;
}
