import { path } from "./deps.ts";
import * as sr from "./shell-remediation.ts";

export interface LinuxFileNameRemediation extends sr.ShellCmdRemediation {
  readonly srcAbsPathAndFileName: string;
  readonly destAbsPathAndFileName: string;
}

export function defaultFileNameFormatter(origFN: sr.FilenameOnly): string {
  return origFN.trim().replaceAll(/ +/g, "-")
    .toLocaleLowerCase();
}

/**
 * Given a filename, provide a remediation that will rename the file to a 
 * "nice" format which removes all spaces (replacing with hyphen) and 
 * converts the text to lowercase.
 * @param src a fileName with either no path or an absolute or relative path
 * @param options force the new path to be in a different location or give
 *                an alternate filename formatter
 */
export function linuxFileNameRemediation(
  src: string,
  options: sr.ShellCmdRemediationOptions & {
    forcePath?: string;
    fileNameFormatter?: (fn: string) => string;
  } = sr
    .defaultShellCmdRemediationOptions(),
): LinuxFileNameRemediation {
  const origPath = path.dirname(src);
  const origFileName = path.basename(src);
  const suggestedName = options.fileNameFormatter
    ? options.fileNameFormatter(origFileName)
    : defaultFileNameFormatter(origFileName);
  const newPath = options?.forcePath || origPath;
  const newPathAndFileName = path.join(newPath, suggestedName);
  return {
    isIdempotent: false,
    srcAbsPathAndFileName: src,
    destAbsPathAndFileName: newPathAndFileName,
    shellCmd: (
      options: sr.ShellCmdRemediationOptions = sr
        .defaultShellCmdRemediationOptions(),
    ) => {
      return options.shell.moveFile(
        src,
        newPathAndFileName,
        options.humanFriendlyOptions,
      );
    },
  };
}
