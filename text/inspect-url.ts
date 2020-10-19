import * as inspT from "./inspect-text.ts";

export async function inspectWebsiteURL(
  target: inspT.TextValue | inspT.TextInspectionResult,
): Promise<
  | inspT.TextValue
  | inspT.TextInspectionResult
  | inspT.TextInspectionIssue
> {
  const it: inspT.TextValue = inspT.isTextInspectionResult(target)
    ? target.inspectionTarget
    : target;
  const url = inspT.resolveTextValue(it);
  if (!url || url.length == 0) {
    return it;
  }

  try {
    const urlFetch = await fetch(url);
    if (urlFetch.status != 200) {
      return inspT.textIssue(
        it,
        `${url} did not return valid status: ${urlFetch.statusText}`,
      );
    }
  } catch (err) {
    return inspT.textIssue(
      it,
      `Exception while trying to fetch ${url}: ${err}`,
    );
  }

  // no errors found, return untouched
  return target;
}
