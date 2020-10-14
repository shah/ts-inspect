import { testingAsserts as ta } from "../deps-test.ts";
import * as insp from "../inspect.ts";
import * as mod from "./mod.ts";

const goodText =
  `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do 
eiusmod tempor.`;

class TestPrime implements insp.Inspectable<TestPrime> {
  readonly longText =
    `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do 
eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut 
aliquip ex ea commodo consequat. Duis aute irure dolor in 
reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla 
pariatur. Excepteur sint occaecat cupidatat non proident, sunt in 
culpa qui officia deserunt mollit anim id est laborum.`;

  readonly shortText = `Lorem ipsum dolor sit amet, consectetur adipiscing`;

  async inspect(
    target: TestPrime = this,
    ctx: insp.InspectionContext<TestPrime> = {
      diags: new insp.InspectionDiagnosticsRecorder<
        TestPrime,
        insp.InspectionContext<TestPrime>
      >(),
    },
  ): Promise<insp.InspectionContext<TestPrime>> {
    const ip = insp.inspectionPipe(mod.inspectWordCountRange);

    // derived allows "sub-inspections" that store results in the parent diags
    const longTextResult = await ip(
      new mod.DerivedTextInspectionContext(target || this, ctx),
      mod.textInspectionTarget(target.longText),
    );
    ta.assert(mod.isTextInspectionIssue(longTextResult));

    const shortTextResult = await ip(
      new mod.DerivedTextInspectionContext(target || this, ctx),
      mod.textInspectionTarget(target.shortText),
    );
    ta.assert(mod.isTextInspectionIssue(shortTextResult));

    // we don't have any result to return so just return the context
    return ctx;
  }
}

Deno.test(`word count matches expectations (direct)`, async () => {
  const ctx = new mod.TypicalTextInspectionContext();
  const ip = insp.inspectionPipe(mod.inspectWordCountRange);
  const result = await ip(ctx, mod.textInspectionTarget(goodText));

  ta.assert(mod.isSuccessfulTextInspection(result));
  ta.assertEquals(ctx.diags.inspectionIssues.length, 0);
  ta.assertEquals(ctx.diags.inspectionExceptions.length, 0);
});

Deno.test(`word count does not match expectations (direct)`, async () => {
  const prime = new TestPrime();
  const ctx = await prime.inspect();
  const diags = ctx.diags;

  ta.assert(insp.isInspectionIssuesTracker(diags));
  ta.assert(insp.isInspectionExceptionsTracker(diags));

  ta.assertEquals(diags.inspectionIssues.length, 2);
  ta.assertEquals(diags.inspectionExceptions.length, 0);

  const longTextIssue = diags.inspectionIssues[0];
  ta.assert(insp.isWrappedInspectionResult(longTextIssue));
  ta.assert(mod.isDiagnosableTextInspectionIssue(longTextIssue));
  ta.assertEquals(
    longTextIssue.inspectionDiagnostic,
    "Word count should be between 10-15 (not 69)",
  );

  const shortTextIssue = diags.inspectionIssues[1];
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
  ta.assertEquals(ctx.diags.inspectionIssues.length, 1);
  ta.assertEquals(ctx.diags.inspectionExceptions.length, 0);

  const issue = ctx.diags.inspectionIssues[0];
  ta.assert(mod.isDiagnosableTextInspectionIssue(issue));
  ta.assertEquals(
    issue.inspectionDiagnostic,
    "Exception while trying to fetch htps://bad.com/url: TypeError: scheme 'htps' not supported",
  );
});
