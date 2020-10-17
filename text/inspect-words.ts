import { safety } from "../deps.ts";
import * as itxt from "./inspect-text.ts";

export const wordsInTextRegEx = /[^\s]+/g;

export interface InspectWordCountRangeOptions
  extends itxt.TextInspectionOptions {
  readonly minWords: number;
  readonly maxWords: number;
}

export const isInspectWordCountRangeOptions = safety.typeGuard<
  InspectWordCountRangeOptions
>("minWords", "maxWords");

export async function inspectWordCountRange(
  target: itxt.TextValue | itxt.TextInspectionResult,
  diags?: itxt.TextInspectionDiagnostics,
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
  let [min, max] = [10, 15];
  if (diags && isInspectWordCountRangeOptions(diags)) {
    min = diags.minWords;
    max = diags.maxWords;
  }
  if (tw.wordCount > max || tw.wordCount < min) {
    return itxt.textIssue(
      it,
      `Word count should be between ${min}-${max} (not ${tw.wordCount})`,
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
