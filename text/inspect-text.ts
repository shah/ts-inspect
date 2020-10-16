import type { safety } from "../deps.ts";
import * as insp from "../inspect.ts";

export function textInspectionPipe(
  ...inspectors: insp.Inspector<TextContentSupplier, string>[]
): insp.InspectionPipe<TextContentSupplier, string> {
  return insp.inspectionPipe(...inspectors);
}

// deno-lint-ignore no-empty-interface
export interface TextInspectionResult
  extends insp.InspectionResult<TextContentSupplier> {
}

export const isTextInspectionResult = insp.isInspectionResult;

// deno-lint-ignore no-empty-interface
export interface TextInspectionOptions extends insp.InspectionOptions {
}

export interface TextContentSupplier {
  readonly text: string;
  readonly onNoIssues: (
    target: TextContentSupplier | TextInspectionResult,
  ) => TextContentSupplier | TextInspectionResult;
  readonly onNoTextAvailable?: (
    target: TextContentSupplier | TextInspectionResult,
  ) => TextContentSupplier | TextInspectionResult;
}

export const isSuccessfulTextInspection = insp.isSuccessfulInspection;

// deno-lint-ignore no-empty-interface
export interface TextInspectionIssue
  extends insp.InspectionIssue<TextContentSupplier> {
}

export const textIssue = insp.inspectionIssue;
export const isTextInspectionIssue = insp.isInspectionIssue;
export const isDiagnosableTextInspectionIssue = insp.isDiagnosable;

// deno-lint-ignore no-empty-interface
export interface TextSanitizerContext {
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
      onNoIssues: (target: TextContentSupplier | TextInspectionResult) => {
        return target;
      },
    }
    : sanitized;
}

// deno-lint-ignore no-empty-interface
export interface TextInspectionDiagnostics extends
  insp.InspectionDiagnostics<
    TextContentSupplier,
    string,
    Error
  > {
}

export class TypicalTextInspectionDiags
  extends insp.InspectionDiagnosticsRecorder<
    TextContentSupplier,
    string,
    Error
  > {
}

export class DerivedTextInspectionDiags<W>
  extends insp.WrappedInspectionDiagnostics<
    TextContentSupplier,
    string,
    Error,
    W
  > {
}

export interface TextInspector
  extends
    insp.Inspector<TextContentSupplier, TextInspectionDiagnostics, Error> {
  (
    target: TextContentSupplier | TextInspectionResult,
    diags?: TextInspectionDiagnostics,
  ): Promise<insp.InspectionResult<TextContentSupplier>>;
}
