import { describe, expect, it } from "vite-plus/test";
import { execQuoted } from "./open-at-login";

describe("autostart entry", () => {
  it("escapes a path for a quoted Exec argument", () => {
    expect(execQuoted("/opt/Battery Health/battery")).toBe("/opt/Battery Health/battery");
    expect(execQuoted('/opt/a\\b/"$`/100%')).toBe('/opt/a\\\\\\\\b/\\"\\$\\`/100%%');
  });
});
