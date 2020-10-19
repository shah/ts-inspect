import * as insp from "../mod.ts";

export interface TextValueSupplier {
  (...args: unknown[]): string;
}

export type TextValue = string | TextValueSupplier;

export function resolveTextValue(value: TextValue, ...args: unknown[]): string {
  return typeof value === "string" ? value : value(...args);
}

export function textInspectionPipe(
  ...inspectors: insp.Inspector<
    TextValue,
    Error
  >[]
): insp.InspectionPipe<TextValue, Error> {
  return insp.inspectionPipe(...inspectors);
}

// deno-lint-ignore no-empty-interface
export interface TextInspectionResult extends insp.InspectionResult<TextValue> {
}

export const isTextInspectionResult = insp.isInspectionResult;
export const isSuccessfulTextInspection = insp.isSuccessfulInspection;

// deno-lint-ignore no-empty-interface
export interface TextInspectionIssue extends insp.InspectionIssue<TextValue> {
}

export const textIssue = insp.inspectionIssue;
export const isTextInspectionIssue = insp.isInspectionIssue;
export const isDiagnosableTextInspectionIssue = insp.isDiagnosable;

// deno-lint-ignore no-empty-interface
export interface TextInspectionDiagnostics extends
  insp.InspectionDiagnostics<
    TextValue,
    Error
  > {
}

export class TypicalTextInspectionDiags
  extends insp.InspectionDiagnosticsRecorder<TextValue> {
}

export class DerivedTextInspectionDiags<W>
  extends insp.WrappedInspectionDiagnostics<
    TextValue,
    Error,
    W
  > {
}

export interface TextInspector extends
  insp.Inspector<
    TextValue,
    Error
  > {
  (
    target: TextValue | TextInspectionResult,
    ctx?: insp.InspectionContext | TextInspectionDiagnostics,
  ): Promise<TextValue | insp.InspectionResult<TextValue>>;
}
