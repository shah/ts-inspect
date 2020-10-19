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
