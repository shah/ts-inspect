import { testingAsserts as ta } from "../deps-test.ts";
import * as mod from "./linux-filename.ts";
import * as sr from "./shell-remediation.ts";

Deno.test(`linuxFileNameRemediation uppercase filename with spaces and no path`, () => {
  const remediator = mod.linuxFileNameRemediation("Uppercase Filename.md");
  const remediated = remediator.shellCmd(
    sr.defaultShellCmdRemediationOptions(),
  );
  ta.assertEquals(
    remediated.humanFriendly,
    `mv "Uppercase Filename.md" "uppercase-filename.md"`,
  );
  ta.assertEquals(
    remediated.machineOptimized,
    `mv "Uppercase Filename.md" "uppercase-filename.md"`,
  );
});

Deno.test(`linuxFileNameRemediation uppercase filename with spaces and path`, () => {
  const remediator = mod.linuxFileNameRemediation(
    "/bin/path/Uppercase Filename.md",
  );
  const remediated = remediator.shellCmd(
    sr.defaultShellCmdRemediationOptions(),
  );
  ta.assertEquals(
    remediated.humanFriendly,
    `(cd "/bin/path"; mv "Uppercase Filename.md" "uppercase-filename.md")`,
  );
  ta.assertEquals(
    remediated.machineOptimized,
    `mv "/bin/path/Uppercase Filename.md" "/bin/path/uppercase-filename.md"`,
  );
});
