import { testingAsserts as ta } from "../deps-test.ts";
import * as insp from "../inspect.ts";
import * as mod from "./mod.ts";

const longText =
  `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do 
eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut 
aliquip ex ea commodo consequat. Duis aute irure dolor in 
reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla 
pariatur. Excepteur sint occaecat cupidatat non proident, sunt in 
culpa qui officia deserunt mollit anim id est laborum.`;

const shortText = `Lorem ipsum dolor sit amet, consectetur adipiscing`;

const goodText =
  `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do 
eiusmod tempor.`;

Deno.test(`word count matches expectations`, async () => {
  const ctx = new mod.TypicalTextInspectionContext(goodText);
  const ip = insp.inspectionPipe(ctx, mod.inspectWordCountRange);
  const result = await ip(ctx);

  ta.assert(mod.isSuccessfulTextInspection(result));
  ta.assertEquals(ctx.diags.issues.length, 0);
  ta.assertEquals(ctx.diags.exceptions.length, 0);
});

Deno.test(`word count exceeds expectations`, async () => {
  const ctx = new mod.TypicalTextInspectionContext(longText);
  const ip = insp.inspectionPipe(ctx, mod.inspectWordCountRange);
  const result = await ip(ctx);

  ta.assert(mod.isTextInspectionIssue(result));
  ta.assertEquals(ctx.diags.issues.length, 1);
  ta.assertEquals(ctx.diags.exceptions.length, 0);

  const issue = ctx.diags.issues[0];
  ta.assert(mod.isDiagnosableTextInspectionIssue(issue));
  ta.assertEquals(
    issue.inspectionDiagnostic,
    "Word count should be between 10-15 (not 69)",
  );
});

Deno.test(`word count lower than expectations`, async () => {
  const ctx = new mod.TypicalTextInspectionContext(shortText);
  const ip = insp.inspectionPipe(ctx, mod.inspectWordCountRange);
  const result = await ip(ctx);

  ta.assert(mod.isTextInspectionIssue(result));
  ta.assertEquals(ctx.diags.issues.length, 1);
  ta.assertEquals(ctx.diags.exceptions.length, 0);

  const issue = ctx.diags.issues[0];
  ta.assert(mod.isDiagnosableTextInspectionIssue(issue));
  ta.assertEquals(
    issue.inspectionDiagnostic,
    "Word count should be between 10-15 (not 7)",
  );
});

Deno.test(`invalid website`, async () => {
  const ctx = new mod.TypicalTextInspectionContext("htps://bad.com/url");
  const ip = insp.inspectionPipe(ctx, mod.inspectWebsiteURL);
  const result = await ip(ctx);

  ta.assert(mod.isTextInspectionIssue(result));
  ta.assertEquals(ctx.diags.issues.length, 1);
  ta.assertEquals(ctx.diags.exceptions.length, 0);

  const issue = ctx.diags.issues[0];
  ta.assert(mod.isDiagnosableTextInspectionIssue(issue));
  ta.assertEquals(
    issue.inspectionDiagnostic,
    "Exception while trying to fetch htps://bad.com/url: TypeError: scheme 'htps' not supported",
  );
});
