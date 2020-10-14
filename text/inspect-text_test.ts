import { testingAsserts as ta } from "../deps-test.ts";
import * as insp from "../inspect.ts";
import * as mod from "./mod.ts";

const goodText =
  `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do 
eiusmod tempor.`;

class TestPrime {
  readonly longText =
    `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do 
eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut 
aliquip ex ea commodo consequat. Duis aute irure dolor in 
reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla 
pariatur. Excepteur sint occaecat cupidatat non proident, sunt in 
culpa qui officia deserunt mollit anim id est laborum.`;

  readonly shortText = `Lorem ipsum dolor sit amet, consectetur adipiscing`;
}

Deno.test(`word count matches expectations (direct)`, async () => {
  const ctx = new mod.TypicalTextInspectionContext();
  const ip = insp.inspectionPipe(mod.inspectWordCountRange);
  const result = await ip(ctx, mod.textInspectionTarget(goodText));

  ta.assert(mod.isSuccessfulTextInspection(result));
  ta.assertEquals(ctx.diags.issues.length, 0);
  ta.assertEquals(ctx.diags.exceptions.length, 0);
});

Deno.test(`word count does not match expectations (direct)`, async () => {
  const diags = new insp.InspectionDiagnosticsRecorder<
    TestPrime,
    insp.InspectionContext<TestPrime>
  >();
  const ctx: insp.InspectionContext<TestPrime> = {
    diags: diags,
  };

  const prime = new TestPrime();
  const ip = insp.inspectionPipe(mod.inspectWordCountRange);

  // derived allows "sub-inspections" that store results in the parent diags
  const longTextResult = await ip(
    new mod.DerivedTextInspectionContext(prime, ctx),
    mod.textInspectionTarget(prime.longText),
  );
  const shortTextResult = await ip(
    new mod.DerivedTextInspectionContext(prime, ctx),
    mod.textInspectionTarget(prime.shortText),
  );

  ta.assertEquals(diags.issues.length, 2);
  ta.assertEquals(diags.exceptions.length, 0);

  const longTextIssue = diags.issues[0];
  ta.assert(mod.isTextInspectionIssue(longTextResult));
  ta.assert(insp.isWrappedInspectionResult(longTextIssue));
  ta.assert(mod.isDiagnosableTextInspectionIssue(longTextIssue));
  ta.assertEquals(
    longTextIssue.inspectionDiagnostic,
    "Word count should be between 10-15 (not 69)",
  );

  const shortTextIssue = diags.issues[1];
  ta.assert(mod.isTextInspectionIssue(shortTextResult));
  ta.assert(insp.isWrappedInspectionResult(shortTextIssue));
  ta.assert(mod.isDiagnosableTextInspectionIssue(shortTextIssue));
  ta.assertEquals(
    shortTextIssue.inspectionDiagnostic,
    "Word count should be between 10-15 (not 7)",
  );
});

Deno.test(`invalid website`, async () => {
  const ip = insp.inspectionPipe(mod.inspectWebsiteURL);
  const ctx = new mod.TypicalTextInspectionContext();
  const result = await ip(ctx, mod.textInspectionTarget("htps://bad.com/url"));

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
