import * as itxt from "./inspect-text.ts";

export async function inspectWebsiteURL(
  ctx: itxt.TextInspectionContext,
  active: itxt.TextInspectionResult,
): Promise<
  | itxt.TextInspectionResult
  | itxt.SuccessfulTextInspection
  | itxt.TextInspectionIssue
> {
  const it = active.inspectionTarget;
  const url = it.text;
  if (!url || url.length == 0) {
    return it.onNoTextAvailable
      ? it.onNoTextAvailable()
      : itxt.textInspectionSuccess(it);
  }

  try {
    const urlFetch = await fetch(url);
    console.dir(urlFetch);
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

  return itxt.textInspectionSuccess(it);
}
