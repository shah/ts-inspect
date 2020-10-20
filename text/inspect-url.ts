import { safety } from "../deps.ts";
import * as insp from "../mod.ts";
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

export const defaultUrlTrackingCodesPattern = /(?<=&|\?)utm_.*?(&|$)/igm;

export interface UrlTrackingCodesPatternSupplier {
  readonly urlTrackingCodesPattern: RegExp;
}

export const isUrlTrackingCodesPatternSupplier = safety.typeGuard<
  UrlTrackingCodesPatternSupplier
>("urlTrackingCodesPattern");

export function urlTrackingCodesPattern(
  ctx?:
    | insp.InspectionContext
    | insp.InspectionContext & UrlTrackingCodesPatternSupplier,
  defaultPattern = defaultUrlTrackingCodesPattern,
): RegExp {
  if (ctx && isUrlTrackingCodesPatternSupplier(ctx)) {
    return ctx.urlTrackingCodesPattern;
  }
  return defaultPattern;
}

export async function removeUrlRequestTrackingCodes(
  target: RequestInfo | insp.InspectionResult<RequestInfo>,
  ctx?:
    | insp.InspectionContext
    | insp.InspectionContext & UrlTrackingCodesPatternSupplier,
): Promise<RequestInfo | insp.InspectionResult<RequestInfo>> {
  const ri = insp.inspectionTarget<RequestInfo>(target);
  if (typeof ri === "string") {
    const pattern = urlTrackingCodesPattern(ctx);
    return ri.replace(pattern, "");
  }
  return target;
}

export async function removeUrlTextTrackingCodes(
  target: string | insp.InspectionResult<string>,
  ctx?:
    | insp.InspectionContext
    | insp.InspectionContext & UrlTrackingCodesPatternSupplier,
): Promise<string | insp.InspectionResult<string>> {
  const url = insp.inspectionTarget<string>(target);
  if (url && url.length > 0) {
    const pattern = urlTrackingCodesPattern(ctx);
    let result = url.replace(pattern, "")
      .trim();
    if (result.endsWith("?")) result = result.substr(0, result.length - 1);
    return result;
  }
  return target;
}
