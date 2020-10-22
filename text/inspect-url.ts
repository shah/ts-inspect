import { safety } from "../deps.ts";
import * as insp from "../mod.ts";
import * as inspT from "./inspect-text.ts";

export interface UrlOptions {
  readonly required?: (
    target: inspT.TextValue | inspT.TextInspectionResult,
  ) => inspT.TextInspectionIssue;
}

export interface UrlFormatOptions extends UrlOptions {
  readonly domainPattern?: string | RegExp;
}

export function urlFormatInspector(
  options?: UrlFormatOptions,
): inspT.TextInspector {
  return async (
    target: inspT.TextValue | inspT.TextInspectionResult,
    ctx?: insp.InspectionContext,
  ): Promise<
    | inspT.TextValue
    | inspT.TextInspectionResult
    | inspT.TextInspectionIssue
  > => {
    const it: inspT.TextValue = inspT.isTextInspectionResult(target)
      ? target.inspectionTarget
      : target;
    const url = inspT.resolveTextValue(it);
    if (!url || url.length == 0) {
      if (options && options.required) {
        return options.required(target);
      }
      return it;
    }

    const urlPattern =
      /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/gm;
    if (!urlPattern.test(url)) {
      return inspT.textIssue(it, `${url} is not validly formatted`);
    }
    if (options && options.domainPattern) {
      const domainValue = url.replace("http://", "").replace("https://", "")
        .split(/[/?#]/)[0].toLocaleLowerCase();
      if (typeof options.domainPattern === "string") {
        if (!domainValue.endsWith(options.domainPattern.toLocaleLowerCase())) {
          return inspT.textIssue(
            it,
            `domain should end with '${options.domainPattern}': ${url}`,
          );
        }
      } else if (!options.domainPattern.test(domainValue)) {
        return inspT.textIssue(
          it,
          `domain should match RegExp '${options.domainPattern}': ${url}`,
        );
      }
    }

    // no errors found, return untouched
    return target;
  };
}

// no URL pattern checking is done, just fetch any URL passed in
export const inspectWebsiteURL = websiteUrlInspector();

export interface WebsiteUrlInspectorOptions extends UrlOptions {
  readonly urlPattern?: RegExp | inspT.TextInspector;
}

export function websiteUrlInspector(
  options?: WebsiteUrlInspectorOptions,
): inspT.TextInspector {
  return async (
    target: inspT.TextValue | inspT.TextInspectionResult,
    ctx?: insp.InspectionContext,
  ): Promise<
    | inspT.TextValue
    | inspT.TextInspectionResult
    | inspT.TextInspectionIssue
  > => {
    const it: inspT.TextValue = inspT.isTextInspectionResult(target)
      ? target.inspectionTarget
      : target;
    const url = inspT.resolveTextValue(it);
    if (!url || url.length == 0) {
      if (options && options.required) {
        return options.required(target);
      }
      return it;
    }

    try {
      if (options && options.urlPattern) {
        if (typeof options.urlPattern === "function") {
          const issue = await options.urlPattern(url, ctx);
          if (issue) return issue;
        } else if (options.urlPattern instanceof RegExp) {
          if (!url.match(options.urlPattern)) {
            return inspT.textIssue(
              it,
              `${url} did not match: ${options.urlPattern}`,
            );
          }
        }
      }

      const urlFetch = await fetch(url);
      if (urlFetch.status != 200) {
        return inspT.textIssue(
          it,
          `${url} did not return valid status: ${urlFetch.statusText}`,
        );
      }
    } catch (err) {
      return insp.inspectionException(
        it,
        err,
        `Exception while trying to fetch ${url}: ${err}`,
      );
    }

    // no errors found, return untouched
    return target;
  };
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
