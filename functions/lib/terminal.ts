import type { Profile } from "../../shared/config";
import { terminalResume, whoami } from "../../shared/terminal";

export { terminalResume, whoami };
export type { Profile };

/* Allowlist, never a browser blocklist: an unknown or spoofed agent, and every
   crawler, must still receive the HTML page. */
const shells = /^(curl|wget|httpie|HTTPie|lwp-request|libwww-perl|python-requests)/i;

export function wantsTerminal(request: Request) {
  const agent = request.headers.get("user-agent") ?? "";
  if (!shells.test(agent)) return false;
  // `curl -H 'accept: text/html'` opts back into the page.
  return !(request.headers.get("accept") ?? "").includes("text/html");
}
