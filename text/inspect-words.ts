import { safety } from "../deps.ts";
import * as insp from "../inspect.ts";
import * as itxt from "./inspect-text.ts";

export const wordsInTextRegEx = /[^\s]+/g;

export interface InspectWordCountRangeOptions
  extends itxt.TextInspectionOptions {
  // the names of these properties are long and descriptive because
  // they can be merged with other validation pipe options
  readonly inspectWordCountMinWords: number;
  readonly inspectWordCountMaxWords: number;
}

export interface InspectWordCountRangeOptionsSupplier {
  readonly inspectWordCountRange: InspectWordCountRangeOptions;
}

export const isInspectWordCountRangeOptions = safety.typeGuard<
  InspectWordCountRangeOptions
>("inspectWordCountMinWords", "inspectWordCountMaxWords");

export const isInspectWordCountRangeOptionsSupplier = safety.typeGuard<
  InspectWordCountRangeOptionsSupplier
>("inspectWordCountRange");

export const defaultInspectWordCountRangeOptions: InspectWordCountRangeOptions =
  {
    inspectWordCountMinWords: 10,
    inspectWordCountMaxWords: 15,
  };

export function detectInspectWordCountRangeOptions(
  typical: InspectWordCountRangeOptions = defaultInspectWordCountRangeOptions,
  ...detectIn: unknown[]
): InspectWordCountRangeOptions {
  for (const check in detectIn) {
    if (isInspectWordCountRangeOptionsSupplier(check)) {
      return check.inspectWordCountRange;
    }
  }
  for (const target in detectIn) {
    if (isInspectWordCountRangeOptions(target)) {
      return target;
    }
  }
  return typical;
}

export async function inspectWordCountRange(
  target: itxt.TextValue | itxt.TextInspectionResult,
  // diags is really a itxt.TextInspectionDiagnostics though we only care about
  // options so we've created a special instance that only requires that
  // property. But it will still work if a full itxt.TextInspectionDiagnostics
  // is passed in as well.
  diags?: { options?: insp.InspectionOptions },
): Promise<
  | itxt.TextValue
  | itxt.TextInspectionResult
  | itxt.TextInspectionIssue
> {
  const it: itxt.TextValue = itxt.isTextInspectionResult(target)
    ? target.inspectionTarget
    : target;
  const text = itxt.resolveTextValue(it);
  if (!text || text.length == 0) {
    return target;
  }

  const tw = words(text);
  if (!tw) {
    return itxt.textIssue(it, `Unable to count words`);
  }

  const options = detectInspectWordCountRangeOptions(
    defaultInspectWordCountRangeOptions,
    target,
    diags,
  );
  if (
    tw.wordCount > options.inspectWordCountMaxWords ||
    tw.wordCount < options.inspectWordCountMinWords
  ) {
    return itxt.textIssue(
      it,
      `Word count should be between ${options.inspectWordCountMinWords}-${options.inspectWordCountMaxWords} (not ${tw.wordCount})`,
    );
  }

  // no errors found, return untouched
  return target;
}

export interface TextWords {
  readonly words: string[];
  readonly wordCount: number;
}

export interface TextWordDistribution extends TextWords {
  readonly wordDistribution: { [word: string]: number };
}

export function words(
  text: string,
  regEx: RegExp = wordsInTextRegEx,
): TextWords | undefined {
  const words = text.toLowerCase().match(regEx);
  if (!words || words.length === 0) {
    return undefined;
  }
  return {
    words: words,
    wordCount: words.length,
  };
}

export function wordsDistribution(
  text: string,
  regEx: RegExp = wordsInTextRegEx,
): TextWordDistribution | undefined {
  const tw = words(text, regEx);
  if (!tw) return undefined;
  const distr: { [word: string]: number } = {};
  tw.words.forEach((word) => {
    const count = distr[word];
    distr[word] = count ? count + 1 : 1;
  });
  return {
    ...tw,
    wordDistribution: distr,
  };
}
