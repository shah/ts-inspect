import { safety } from "../deps.ts";
import { path } from "./deps.ts";
import * as rem from "../remediation.ts";

export type ShellFlavorID = string;
export type OperatingSystemID = string;
export type AbsPathOnly = string;
export type RelPathOnly = string;
export type AbsFilePathAndName = string;
export type FilenameOnly = string;

export type ShellCmd = string;
export interface ShellCmds {
  readonly machineOptimized: ShellCmd;
  readonly humanFriendly: ShellCmd;
}

export interface HumanFriendlyPathOptions {
  relativeTo?: AbsFilePathAndName;
}

export interface ShellFlavor {
  readonly systemID: ShellFlavorID;
  readonly friendlyName: string;
  readonly dirname: (
    afpan: AbsFilePathAndName,
    options?: HumanFriendlyPathOptions & { forcePath?: AbsPathOnly },
  ) => AbsPathOnly | RelPathOnly;
  readonly moveFile: (
    src: AbsFilePathAndName,
    dest: AbsFilePathAndName,
    options?: HumanFriendlyPathOptions,
  ) => ShellCmds;
}

export class TypicalLinuxShell implements ShellFlavor {
  constructor(readonly systemID: ShellFlavorID, readonly friendlyName: string) {
  }

  dirname(
    afpan: AbsFilePathAndName,
    options?: HumanFriendlyPathOptions & { forcePath?: AbsPathOnly },
  ): AbsPathOnly | RelPathOnly {
    if (options?.forcePath) return options?.forcePath;
    const dirname = path.dirname(afpan);
    return options?.relativeTo
      ? path.relative(options?.relativeTo, dirname)
      : dirname;
  }

  basename(afpan: AbsFilePathAndName): FilenameOnly {
    return path.basename(afpan);
  }

  moveFile(
    src: AbsFilePathAndName,
    dest: AbsFilePathAndName,
    options: HumanFriendlyPathOptions = {},
  ): ShellCmds {
    const machineCmd = `mv "${src}" "${dest}"`;
    const cd = this.dirname(src, options);
    return {
      humanFriendly: cd.length > 0 && cd !== "."
        ? `(cd "${cd}"; mv "${this.basename(src)}" "${
          this.dirname(dest, options) === cd ? this.basename(dest) : dest
        }")`
        : machineCmd,
      machineOptimized: machineCmd,
    };
  }
}

export const defaultLinuxShell = new TypicalLinuxShell("/bin/sh", "/bin/sh");

export interface ShellCmdRemediationOptions {
  shell: ShellFlavor;
  os?: OperatingSystemID;
  humanFriendlyOptions?: HumanFriendlyPathOptions;
}

export function defaultShellCmdRemediationOptions(
  override?: Partial<ShellCmdRemediationOptions>,
): ShellCmdRemediationOptions {
  return {
    shell: defaultLinuxShell,
    ...override,
  };
}

export interface ShellCmdRemediation extends rem.MachinePoweredRemediation {
  readonly shellCmd: (options: ShellCmdRemediationOptions) => ShellCmds;
}

export const isShellCmdRemediation = safety.typeGuard<
  ShellCmdRemediation
>("shellCmd", "isIdempotent");
