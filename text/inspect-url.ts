import * as itxt from "./inspect-text.ts";

export async function inspectWebsiteURL(
  target: itxt.TextValue | itxt.TextInspectionResult,
): Promise<
  | itxt.TextValue
  | itxt.TextInspectionResult
  | itxt.TextInspectionIssue
> {
  const it: itxt.TextValue = itxt.isTextInspectionResult(target)
    ? target.inspectionTarget
    : target;
  const url = itxt.resolveTextValue(it);
  if (!url || url.length == 0) {
    return it;
  }

  try {
    const urlFetch = await fetch(url);
    if (urlFetch.status != 200) {
      return itxt.textIssue(
        it,
        `${url} did not return valid status: ${urlFetch.statusText}`,
      );
    }
  } catch (err) {
    return itxt.textIssue(
      it,
      `Exception while trying to fetch ${url}: ${err}`,
    );
  }

  // no errors found, return untouched
  return target;
}
