import { safety } from "../deps.ts";
import * as insp from "../mod.ts";
import * as inspT from "./inspect-text.ts";

export const wordsInTextRegEx = /[^\s]+/g;

export interface InspectWordCountRangeSupplier {
  readonly inspectWordCountRange: insp.NumericRange;
}

export const isInspectWordCountRangeSupplier = safety.typeGuard<
  InspectWordCountRangeSupplier
>("inspectWordCountRange");

export async function inspectWordCountRange(
  target: inspT.TextValue | inspT.TextInspectionResult,
  ctx?:
    | insp.InspectionContext
    | insp.InspectionContext & InspectWordCountRangeSupplier,
): Promise<
  | inspT.TextValue
  | inspT.TextInspectionResult
  | inspT.TextInspectionIssue
> {
  const it: inspT.TextValue = inspT.isTextInspectionResult(target)
    ? target.inspectionTarget
    : target;
  const text = inspT.resolveTextValue(it);
  if (!text || text.length == 0) {
    return target;
  }

  const tw = words(text);
  if (!tw) {
    return inspT.textIssue(it, `Unable to count words`);
  }

  let range: insp.NumericRange = insp.numericRange(10, 15);
  if (isInspectWordCountRangeSupplier(ctx)) range = ctx.inspectWordCountRange;
  if (
    tw.wordCount > range.maximum ||
    tw.wordCount < range.minimum
  ) {
    return inspT.textIssue(
      it,
      `Word count should be between ${range.minimum}-${range.maximum} (not ${tw.wordCount})`,
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
