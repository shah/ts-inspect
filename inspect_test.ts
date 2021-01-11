import { testingAsserts as ta } from "./deps-test.ts";
import { safety } from "./deps.ts";
import * as mod from "./mod.ts";

interface TestContext extends mod.InspectionContext {
  isTestContext: true;
  count: number;
}

const isTestContext = safety.typeGuard<TestContext>("isTestContext", "count");

interface TestTarget {
  isTestObject: true;
}

interface ChainedTarget
  extends
    mod.InspectionResult<TestTarget>,
    mod.TransformerProvenanceSupplier<TestTarget> {
  isChainedTarget: true;
  previous: TestTarget;
}

const isChainedTarget = safety.typeGuard<ChainedTarget>(
  "isChainedTarget",
  "previous",
);

// deno-lint-ignore require-await
async function inspectTestTarget(
  target: TestTarget | mod.InspectionResult<TestTarget>,
  ctx?: mod.InspectionContext,
): Promise<TestTarget | mod.InspectionResult<TestTarget>> {
  if (isTestContext(ctx)) {
    ctx.count++;
  }
  ta.assert(!mod.isInspectionResult(target));
  return {
    isInspectionResult: true,
    inspectionTarget: target,
    isTestObject: true,
  };
}

// deno-lint-ignore require-await
async function inspectChainedTarget(
  target: TestTarget | mod.InspectionResult<TestTarget>,
  ctx?: mod.InspectionContext,
): Promise<TestTarget | mod.InspectionResult<TestTarget> | ChainedTarget> {
  if (isTestContext(ctx)) {
    ctx.count++;
  }
  if (mod.isInspectionResult(target)) {
    const result: ChainedTarget = {
      ...target,
      isChainedTarget: true,
      previous: target.inspectionTarget,
      isTransformed: mod.transformationSource<TestTarget>(
        target.inspectionTarget,
      ),
    };
    return result;
  }

  return mod.inspectionIssue(target, "mod.isInspectionResult(target) expected");
}

Deno.test("async inspection pipe", async () => {
  const pipe = mod.inspectionPipe<TestTarget, string, Error>(
    inspectTestTarget,
    inspectChainedTarget,
  );
  const ctx: TestContext = { isTestContext: true, count: 0 };
  const result = await pipe({ isTestObject: true }, ctx);
  ta.assertEquals(ctx.count, 2);
  ta.assert(mod.isInspectionResult(result));
  ta.assert(isChainedTarget(result));
});
