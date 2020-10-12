import type { safety } from "../deps.ts";
import * as insp from "../inspect.ts";

// deno-lint-ignore no-empty-interface
export interface TextInspectionResult
  extends insp.InspectionResult<TextContentSupplier> {
}

export interface TextContentSupplier {
  readonly text: string;
  readonly onNoTextAvailable?: () => insp.InspectionResult<TextContentSupplier>;
}

// deno-lint-ignore no-empty-interface
export interface SuccessfulTextInspection
  extends insp.SuccessfulInspection<TextContentSupplier> {
}

export const textInspectionSuccess = insp.successfulInspection;
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

export class TypicalTextInspectionContext implements TextInspectionContext {
  readonly inspectionTarget: TextContentSupplier;
  readonly diags = new insp.InspectionDiagnosticsRecorder<
    TextContentSupplier,
    insp.InspectionContext<TextContentSupplier>
  >();

  constructor(
    content: string | TextContentSupplier,
    sanitize?: safety.TransformerSync<
      TextSanitizerContext,
      string | TextContentSupplier
    >,
  ) {
    const sanitized = sanitize ? sanitize.transform(content) : content;
    this.inspectionTarget = typeof sanitized == "string"
      ? { text: sanitized }
      : sanitized;
  }
}

export interface TextInspector
  extends insp.Inspector<TextContentSupplier, TextInspectionContext> {
  (
    ctx: TextInspectionContext,
    active: TextInspectionResult,
  ): Promise<insp.InspectionResult<TextContentSupplier>>;
}
