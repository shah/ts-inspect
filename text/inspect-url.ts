import * as itxt from "./inspect-text.ts";

export async function inspectWebsiteURL(
  target: itxt.TextContentSupplier | itxt.TextInspectionResult,
): Promise<
  | itxt.TextContentSupplier
  | itxt.TextInspectionResult
  | itxt.TextInspectionIssue
> {
  const it: itxt.TextContentSupplier = itxt.isTextInspectionResult(target)
    ? target.inspectionTarget
    : target;
  const url = it.text;
  if (!url || url.length == 0) {
    return it.onNoTextAvailable
      ? it.onNoTextAvailable(target)
      : it.onNoIssues(target);
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

  return it.onNoIssues(target);
}
