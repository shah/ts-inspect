import { safety } from "./deps.ts";

export interface InspectionResult<T> {
  readonly isInspectionResult: true;
  readonly inspectionTarget: T;
}

export function isInspectionResult<T>(
  o: unknown,
): o is InspectionResult<T> {
  return safety.typeGuard<InspectionResult<T>>(
    "isInspectionResult",
    "inspectionTarget",
  )(o);
}

export function inspectionResult<T>(target: T): InspectionResult<T> {
  return {
    isInspectionResult: true,
    inspectionTarget: target,
  };
}

export function inspectionResultCustom<T, R>(
  target: T,
  merge: R,
): InspectionResult<T> & R {
  return { ...inspectionResult<T>(target), ...merge };
}

export function inspectionTarget<T>(target: T | InspectionResult<T>): T {
  return isInspectionResult<T>(target) ? target.inspectionTarget : target;
}

export interface InspectionResultSupplier<T> {
  (...args: unknown[]): InspectionResult<T>;
}

export function isInspectionResultSupplier<T>(
  o: InspectionResult<T> | InspectionResultSupplier<T>,
): o is InspectionResultSupplier<T> {
  return o && typeof o === "function";
}

export interface EmptyInspectorsResult<T> extends InspectionResult<T> {
  readonly isEmptyInspectorsResult: true;
}

export function isEmptyInspectors<T>(
  o: unknown,
): o is EmptyInspectorsResult<T> {
  return safety.typeGuard<EmptyInspectorsResult<T>>("isEmptyInspectorsResult")(
    o,
  );
}

export interface TransformerProvenance<T> {
  readonly from: T;
  readonly position: number;
  readonly remarks?: string;
}

export function transformationSource<T>(
  source: T,
  remarks?: string,
): TransformerProvenance<T> {
  return {
    from: source,
    position: nextTransformerProvenancePosition(source),
    remarks,
  };
}

export interface TransformerProvenanceSupplier<T> {
  readonly isTransformed: TransformerProvenance<T>;
}

export function nextTransformerProvenancePosition<T>(
  o: T | TransformerProvenance<T> | TransformerProvenanceSupplier<T>,
): number {
  if (!o || typeof o !== "object") return 0;
  if ("position" in o) {
    return o.position + 1;
  }
  if ("isTransformed" in o) {
    return o.isTransformed.position + 1;
  }
  return 0;
}
