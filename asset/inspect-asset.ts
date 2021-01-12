import { safety } from "../deps.ts";
import * as insp from "../mod.ts";
import { path } from "./deps.ts";
import * as lf from "../remediation/linux-filename.ts";

export interface ProjectAsset {
  readonly absPathAndFileName: string;
}

// deno-lint-ignore no-empty-interface
export interface ProjectAssetInspectionContext extends insp.InspectionContext {
}

export function assetInspectionPipe(
  ...inspectors: insp.Inspector<ProjectAsset>[]
): insp.InspectionPipe<ProjectAsset> {
  return insp.inspectionPipe(...inspectors);
}

// deno-lint-ignore no-empty-interface
export interface AssetInspectionResult
  extends insp.InspectionResult<ProjectAsset> {
}

export const assetInspectionPipeContext = insp.inspectionPipeContext;
export const isAssetInspectionResult = insp.isInspectionResult;
export const isSuccessfulAssetInspection = insp.isSuccessfulInspection;

export interface AssetInspectionIssue
  extends
    insp.InspectionIssue<ProjectAsset>,
    insp.Diagnosable<string>,
    insp.Remediatable<insp.Remediation> {
}

export const isAssetInspectionIssue = safety.typeGuard<AssetInspectionIssue>(
  "isInspectionIssue",
  "inspectionTarget",
  "remediation",
);

export function assetIssue(
  o: ProjectAsset | AssetInspectionResult | AssetInspectionIssue,
  diagnostic: string,
  remediation: insp.Remediation,
): AssetInspectionIssue {
  if (isAssetInspectionIssue(o)) {
    o.diagnostics.push(diagnostic);
    o.remediation.push(remediation);
    return o;
  }
  const issue = insp.inspectionIssue<ProjectAsset, string>(o, diagnostic);
  const result: AssetInspectionIssue = {
    ...issue,
    remediation: [remediation],
  };
  return result;
}

export const isDiagnosableAssetInspectionIssue = insp.isDiagnosable;

// deno-lint-ignore no-empty-interface
export interface AssetInspectionDiagnostics extends
  insp.InspectionDiagnostics<
    ProjectAsset,
    Error
  > {
}

export function isAssetInspectionDiagnostics(
  o: unknown,
): o is AssetInspectionDiagnostics {
  return safety.typeGuard<AssetInspectionDiagnostics>(
    "continue",
    "onIssue",
    "onException",
  )(o);
}

export class TypicalAssetInspectionDiags
  extends insp.InspectionDiagnosticsRecorder<ProjectAsset> {
}

export class DerivedAssetInspectionDiags<W>
  extends insp.WrappedInspectionDiagnostics<
    ProjectAsset,
    Error,
    W
  > {
}

export interface AssetInspector extends insp.Inspector<ProjectAsset> {
  (
    target: ProjectAsset | AssetInspectionResult,
    ctx?: insp.InspectionContext,
  ): Promise<ProjectAsset | AssetInspectionResult>;
}

// deno-lint-ignore require-await
export async function inspectFileNameSpaces(
  target: ProjectAsset | AssetInspectionResult,
  ctx?: insp.InspectionContext,
): Promise<ProjectAsset | AssetInspectionResult | AssetInspectionIssue> {
  const asset = insp.inspectionTarget(target);
  const fileName = path.basename(asset.absPathAndFileName);
  if (fileName.includes(" ")) {
    return assetIssue(
      target,
      `should be renamed because it has spaces (replace all spaces with hyphens '-')`,
      lf.linuxFileNameRemediation(asset.absPathAndFileName),
    );
  }
  return asset;
}

// deno-lint-ignore require-await
export async function inspectFileNameCaseSensitivity(
  target: ProjectAsset | AssetInspectionResult,
  ctx?: insp.InspectionContext,
): Promise<ProjectAsset | AssetInspectionResult | AssetInspectionIssue> {
  const asset = insp.inspectionTarget(target);
  const fileName = path.basename(asset.absPathAndFileName);
  if (fileName !== fileName.toLocaleLowerCase()) {
    return assetIssue(
      target,
      `should be renamed because it has mixed case letters (all text should be lowercase only)`,
      lf.linuxFileNameRemediation(asset.absPathAndFileName),
    );
  }
  return asset;
}
