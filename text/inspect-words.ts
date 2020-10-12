import { safety } from "../deps.ts";
import * as itxt from "./inspect-text.ts";

export const wordsInTextRegEx = /[^\s]+/g;

export interface InspectWordCountRangeContext
  extends itxt.TextInspectionContext {
  readonly minWords: number;
  readonly maxWords: number;
}

export const isInspectWordCountRangeContext = safety.typeGuardCustom<
  itxt.TextInspectionContext,
  InspectWordCountRangeContext
>("minWords", "maxWords");

export async function inspectWordCountRange(
  ctx: itxt.TextInspectionContext,
  active: itxt.TextInspectionResult,
): Promise<
  | itxt.TextInspectionResult
  | itxt.SuccessfulTextInspection
  | itxt.TextInspectionIssue
> {
  const it = active.inspectionTarget;
  const text = it.text;
  if (!text || text.length == 0) {
    return it.onNoTextAvailable
      ? it.onNoTextAvailable()
      : itxt.textInspectionSuccess(it);
  }
  const tw = words(it);
  if (!tw) {
    return itxt.textIssue(it, "Unable to count words");
  }
  let [min, max] = [10, 15];
  if (isInspectWordCountRangeContext(ctx)) {
    min = ctx.minWords;
    max = ctx.maxWords;
  }
  if (tw.wordCount > max || tw.wordCount < min) {
    return itxt.textIssue(
      it,
      `Word count should be between ${min}-${max} (not ${tw.wordCount})`,
    );
  }
  return itxt.textInspectionSuccess(it);
}

export interface TextWords {
  readonly words: string[];
  readonly wordCount: number;
}

export interface TextWordDistribution extends TextWords {
  readonly wordDistribution: { [word: string]: number };
}

export function words(
  supplier: itxt.TextContentSupplier,
  regEx: RegExp = wordsInTextRegEx,
): TextWords | undefined {
  const words = supplier.text.toLowerCase().match(regEx);
  if (!words || words.length === 0) {
    return undefined;
  }
  return {
    words: words,
    wordCount: words.length,
  };
}

export function wordsDistribution(
  supplier: itxt.TextContentSupplier,
  regEx: RegExp = wordsInTextRegEx,
): TextWordDistribution | undefined {
  const tw = words(supplier, regEx);
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
