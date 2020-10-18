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

  async inspect(): Promise<
    insp.InspectionDiagnosticsRecorder<TestPrime, string>
  > {
    const diags = new insp.InspectionDiagnosticsRecorder<TestPrime, string>(
      insp.inspectionPipeContext(),
    );
    const ip = mod.textInspectionPipe(mod.inspectWordCountRange);

    // derived allows "sub-inspections" that store results in the parent diags
    const longTextResult = await ip(
      this.longText,
      new mod.DerivedTextInspectionDiags<TestPrime>(this, diags),
    );
    ta.assert(mod.isTextInspectionIssue(longTextResult));

    const shortTextResult = await ip(
      this.shortText,
      new mod.DerivedTextInspectionDiags<TestPrime>(this, diags),
    );
    ta.assert(mod.isTextInspectionIssue(shortTextResult));

    return diags;
  }
}

Deno.test(`word count matches expectations (pipe with diagnostics)`, async () => {
  const diags = new mod.TypicalTextInspectionDiags(
    insp.inspectionPipeContext(),
  );
  const ip = mod.textInspectionPipe(mod.inspectWordCountRange);
  const result = await ip(goodText, diags);

  ta.assert(mod.isSuccessfulTextInspection(result));
  ta.assertEquals(diags.inspectionIssues.length, 0);
});

Deno.test(`word count matches expectations (without pipe, no diagnostics)`, async () => {
  const result = await mod.inspectWordCountRange(goodText);
  ta.assertEquals(
    result,
    goodText,
    "Since there were no errors, the result should be the same as the input",
  );
});

Deno.test(`word count does not match expectations (without pipe, no diagnostics, with options)`, async () => {
  const result = await mod.inspectWordCountRange(
    goodText,
    { options: mod.inspectWordCountRangeOptions(3, 5) },
  );
  ta.assert(mod.isTextInspectionIssue(result), "Should be an issue");
  ta.assert(insp.isDiagnosable(result), "Should have a diagnostic message");
  ta.assertEquals(
    result.diagnostic,
    "Word count should be between 3-5 (not 12)",
  );
});

Deno.test(`word count does not match expectations (pipe with diagnostics)`, async () => {
  const prime = new TestPrime();
  const diags = await prime.inspect();

  ta.assert(insp.isInspectionIssuesTracker(diags));
  ta.assertEquals(diags.inspectionIssues.length, 2);

  const longTextIssue = diags.inspectionIssues[0];
  ta.assert(insp.isWrappedInspectionResult(longTextIssue));
  ta.assert(mod.isDiagnosableTextInspectionIssue(longTextIssue));
  ta.assertEquals(
    longTextIssue.diagnostic,
    "Word count should be between 10-15 (not 69)",
  );

  const shortTextIssue = diags.inspectionIssues[1];
  ta.assert(insp.isWrappedInspectionResult(shortTextIssue));
  ta.assert(mod.isDiagnosableTextInspectionIssue(shortTextIssue));
  ta.assertEquals(
    shortTextIssue.diagnostic,
    "Word count should be between 10-15 (not 7)",
  );
});

Deno.test(`invalid website (pipe with diagnostics)`, async () => {
  const ip = mod.textInspectionPipe(mod.inspectWebsiteURL);
  const diags = new mod.TypicalTextInspectionDiags(
    insp.inspectionPipeContext(),
  );
  const result = await ip("htps://bad.com/url", diags);

  ta.assert(mod.isTextInspectionIssue(result));
  ta.assertEquals(diags.inspectionIssues.length, 1);

  const issue = diags.inspectionIssues[0];
  ta.assert(mod.isDiagnosableTextInspectionIssue(issue));
  ta.assertEquals(
    issue.diagnostic,
    "Exception while trying to fetch htps://bad.com/url: TypeError: scheme 'htps' not supported",
  );
});
