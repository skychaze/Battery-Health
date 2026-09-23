import { describe, expect, it } from "vite-plus/test";
import { releasePolicy } from "./release-policy";

const release = (version: number) => ({ tag_name: `v1.0.${version}`, draft: false, prerelease: false });

describe("release policy", () => {
  it("limits direct installs and retains notices that still affect eligible versions", () => {
    const releases = Array.from({ length: 17 }, (_, index) => release(index + 1));
    const notices = [
      { id: "old", message: "Old notice", fromVersion: "1.0.1", throughVersion: "1.0.2" },
      { id: "eligible", message: "Read this", fromVersion: "1.0.3", throughVersion: "1.0.4" },
    ];
    expect(releasePolicy("1.0.18", releases, notices)).toEqual({
      minimumVersion: "1.0.3",
      notices: [notices[1]],
    });
  });

  it("rejects duplicate notice identifiers", () => {
    const notice = { id: "same", message: "Read this", fromVersion: "1.0.1", throughVersion: "1.0.1" };
    expect(() => releasePolicy("1.0.2", [release(1)], [notice, notice])).toThrow("Duplicate release notice");
  });
});
