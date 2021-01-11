import { testingAsserts as ta } from "../deps-test.ts";
import { fs } from "./deps-test.ts";
import { path } from "./deps.ts";
import * as mod from "./inspect-asset.ts";

function pathRelativeToTestModule(relPath: string): string {
  return path.join(
    path.relative(
      Deno.cwd(),
      path.dirname(path.fromFileUrl(import.meta.url)),
    ),
    relPath,
  );
}

export const testFilesPath = pathRelativeToTestModule("./inspect-asset_test");

Deno.test(`spaces in filename inspector only`, async () => {
  const pipe = mod.assetInspectionPipe(
    mod.inspectFileNameSpaces,
  );
  const diags = new mod.TypicalAssetInspectionDiags(
    mod.assetInspectionPipeContext(),
  );
  for (const we of fs.walkSync(testFilesPath)) {
    await pipe({ absPathAndFileName: we.path }, diags);
  }
  ta.assertEquals(3, diags.inspectionIssues.length);
});

Deno.test(`mixed case in filename inspector only`, async () => {
  const pipe = mod.assetInspectionPipe(
    mod.inspectFileNameCaseSensitivity,
  );
  const diags = new mod.TypicalAssetInspectionDiags(
    mod.assetInspectionPipeContext(),
  );
  for (const we of fs.walkSync(testFilesPath)) {
    await pipe({ absPathAndFileName: we.path }, diags);
  }
  ta.assertEquals(2, diags.inspectionIssues.length);
});

Deno.test(`spaces and mixed case files inspectors together`, async () => {
  const pipe = mod.assetInspectionPipe(
    mod.inspectFileNameSpaces,
    mod.inspectFileNameCaseSensitivity,
  );
  const diags = new mod.TypicalAssetInspectionDiags(
    mod.assetInspectionPipeContext(),
  );
  for (const we of fs.walkSync(testFilesPath)) {
    await pipe({ absPathAndFileName: we.path }, diags);
  }
  ta.assertEquals(5, diags.inspectionIssues.length);
});
