import { testingAsserts as ta } from "../deps-test.ts";
import * as insp from "../mod.ts";
import * as inspT from "./mod.ts";

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
    insp.InspectionDiagnosticsRecorder<TestPrime>
  > {
    const diags = new insp.InspectionDiagnosticsRecorder<TestPrime>(
      insp.inspectionPipeContext(),
    );
    const ip = inspT.textInspectionPipe(inspT.inspectWordCountRange);

    // derived allows "sub-inspections" that store results in the parent diags
    const longTextResult = await ip(
      this.longText,
      new inspT.DerivedTextInspectionDiags<TestPrime>(this, diags),
    );
    ta.assert(inspT.isTextInspectionIssue(longTextResult));

    const shortTextResult = await ip(
      this.shortText,
      new inspT.DerivedTextInspectionDiags<TestPrime>(this, diags),
    );
    ta.assert(inspT.isTextInspectionIssue(shortTextResult));

    return diags;
  }
}

Deno.test(`word count matches expectations (pipe with diagnostics)`, async () => {
  const diags = new inspT.TypicalTextInspectionDiags(
    insp.inspectionPipeContext(),
  );
  const ip = inspT.textInspectionPipe(inspT.inspectWordCountRange);
  const result = await ip(goodText, diags);

  ta.assert(inspT.isSuccessfulTextInspection(result));
  ta.assertEquals(diags.inspectionIssues.length, 0);
});

Deno.test(`word count matches expectations (without pipe, no diagnostics)`, async () => {
  const result = await inspT.inspectWordCountRange(goodText);
  ta.assertEquals(
    result,
    goodText,
    "Since there were no errors, the result should be the same as the input",
  );
});

Deno.test(`word count does not match expectations (without pipe, no diagnostics, with options)`, async () => {
  const result = await inspT.inspectWordCountRange(
    goodText,
    insp.inspectionContext<inspT.InspectWordCountRangeSupplier>({
      isInInspectionPipe: true,
      inspectWordCountRange: insp.numericRange(3, 5),
    }),
  );
  ta.assert(inspT.isTextInspectionIssue(result), "Should be an issue");
  ta.assert(insp.isDiagnosable(result), "Should have a diagnostic message");
  ta.assertEquals(
    result.mostRecentDiagnostic(),
    "Word count should be between 3-5 (not 12)",
  );
});

Deno.test(`word count does not match expectations (pipe with diagnostics)`, async () => {
  const prime = new TestPrime();
  const diags = await prime.inspect();

  ta.assert(insp.isInspectionIssuesManager(diags));
  ta.assertEquals(diags.inspectionIssues.length, 2);

  const longTextIssue = diags.inspectionIssues[0];
  ta.assert(insp.isWrappedInspectionResult(longTextIssue));
  ta.assert(inspT.isDiagnosableTextInspectionIssue(longTextIssue));
  ta.assertEquals(
    longTextIssue.mostRecentDiagnostic(),
    "Word count should be between 10-15 (not 69)",
  );

  const shortTextIssue = diags.inspectionIssues[1];
  ta.assert(insp.isWrappedInspectionResult(shortTextIssue));
  ta.assert(inspT.isDiagnosableTextInspectionIssue(shortTextIssue));
  ta.assertEquals(
    shortTextIssue.mostRecentDiagnostic(),
    "Word count should be between 10-15 (not 7)",
  );
});

Deno.test(`valid website URL domain and site result`, async () => {
  const ip = inspT.textInspectionPipe(
    inspT.websiteUrlInspector({
      urlPattern: inspT.urlFormatInspector({ domainPattern: /facebook.com/ }),
    }),
  );
  const diags = new inspT.TypicalTextInspectionDiags(
    insp.inspectionPipeContext(),
  );
  const result = await ip("https://www.facebook.com", diags);

  ta.assert(typeof result === "string");
  ta.assert(!inspT.isTextInspectionIssue(result));
});

Deno.test(`invalid website URL format`, async () => {
  const ip = inspT.textInspectionPipe(
    inspT.urlFormatInspector({ domainPattern: /good.com/ }),
  );
  const diags = new inspT.TypicalTextInspectionDiags(
    insp.inspectionPipeContext(),
  );
  const result = await ip("htps://bad.com/url", diags);

  ta.assert(inspT.isTextInspectionIssue(result));
  ta.assertEquals(diags.inspectionIssues.length, 1);

  const issue = diags.inspectionIssues[0];
  ta.assert(inspT.isDiagnosableTextInspectionIssue(issue));
  ta.assertEquals(
    issue.mostRecentDiagnostic(),
    "htps://bad.com/url is not validly formatted",
  );
});

Deno.test(`invalid website URL domain`, async () => {
  const ip = inspT.textInspectionPipe(
    inspT.urlFormatInspector({ domainPattern: "facebook.com" }),
  );
  const diags = new inspT.TypicalTextInspectionDiags(
    insp.inspectionPipeContext(),
  );
  const result = await ip("https://www.google.com", diags);

  ta.assert(inspT.isTextInspectionIssue(result));
  ta.assertEquals(diags.inspectionIssues.length, 1);

  const issue = diags.inspectionIssues[0];
  ta.assert(inspT.isDiagnosableTextInspectionIssue(issue));
  ta.assertEquals(
    issue.mostRecentDiagnostic(),
    "domain should end with 'facebook.com': https://www.google.com",
  );
});

Deno.test(`invalid website (pipe with diagnostics)`, async () => {
  const ip = inspT.textInspectionPipe(inspT.websiteUrlInspector());
  const diags = new inspT.TypicalTextInspectionDiags(
    insp.inspectionPipeContext(),
  );
  const result = await ip("htps://bad.com/url", diags);

  ta.assert(inspT.isTextInspectionIssue(result));
  ta.assertEquals(diags.inspectionIssues.length, 1);

  const issue = diags.inspectionIssues[0];
  ta.assert(inspT.isDiagnosableTextInspectionIssue(issue));
  ta.assertEquals(
    issue.mostRecentDiagnostic(),
    "Exception while trying to fetch htps://bad.com/url: TypeError: scheme 'htps' not supported",
  );
});
