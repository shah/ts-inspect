import { safety } from "../deps.ts";
import * as insp from "../mod.ts";
import { path } from "./deps.ts";

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

// deno-lint-ignore no-empty-interface
export interface AssetRemediation {
}

export interface HumanPoweredRemediation extends AssetRemediation {
  readonly humanInstructions: string;
}

export const isHumanPoweredRemediation = safety.typeGuard<
  HumanPoweredRemediation
>("humanInstructions");

export interface ShellCmdRemediation extends AssetRemediation {
  readonly isIdempotent: boolean;
  readonly shellCmd: (options: { os: string }) => string;
}

export const isShellCmdRemediation = safety.typeGuard<
  ShellCmdRemediation
>("shellCmd", "isIdempotent");

export interface AssetInspectionIssue
  extends insp.InspectionIssue<ProjectAsset>, insp.Diagnosable<string> {
  readonly remediation: AssetRemediation[];
}

export const isAssetInspectionIssue = safety.typeGuard<AssetInspectionIssue>(
  "isInspectionIssue",
  "inspectionTarget",
  "remediation",
);

export function assetIssue(
  o: ProjectAsset | AssetInspectionResult | AssetInspectionIssue,
  diagnostic: string,
  remediation: AssetRemediation,
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

export interface RenameFileRemediation
  extends ShellCmdRemediation, HumanPoweredRemediation {
  readonly srcAbsPathAndFileName: string;
  readonly destAbsPathAndFileName: string;
}

export function suggestFileNameRemediation(src: string): RenameFileRemediation {
  const origPath = path.dirname(src);
  const origFileName = path.basename(src);
  const suggestedName = origFileName.trim().replaceAll(/ +/g, "-")
    .toLocaleLowerCase();
  const suggestedShellCmd =
    `(cd ${origPath}; mv "${origFileName}" ${suggestedName})`;
  return {
    isIdempotent: false,
    srcAbsPathAndFileName: src,
    destAbsPathAndFileName: path.join(origPath, suggestedName),
    humanInstructions: `Run this in a Linux/bash CLI: ${suggestedShellCmd}`,
    shellCmd: () => {
      return suggestedShellCmd;
    },
  };
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
      suggestFileNameRemediation(asset.absPathAndFileName),
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
      suggestFileNameRemediation(asset.absPathAndFileName),
    );
  }
  return asset;
}
