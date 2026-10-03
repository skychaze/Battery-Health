import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { defaultSettings } from "../shared/settings";
import { writeJsonFile } from "./json-file";
import { changeSettings, loadSettings } from "./settings";

let directory: string;
afterEach(() => rmSync(directory, { recursive: true, force: true }));
function path() {
  directory = mkdtempSync(join(tmpdir(), "battery-settings-"));
  return join(directory, "settings.json");
}

describe("settings file", () => {
  it("starts from the defaults and survives a reload", () => {
    const file = join(path(), "..", "nested", "settings.json");
    expect(loadSettings(file)).toEqual(defaultSettings);
    writeJsonFile(file, { ...defaultSettings, intervalSeconds: 7200 });
    expect(loadSettings(file)).toEqual({ ...defaultSettings, intervalSeconds: 7200 });
  });

  it("falls back per field", () => {
    const file = path();
    writeFileSync(file, '{"intervalSeconds":0,"unknown":true}');
    expect(loadSettings(file)).toEqual(defaultSettings);
    writeFileSync(file, "not json");
    expect(loadSettings(file)).toEqual(defaultSettings);
  });
});

describe("settings changes", () => {
  it("applies every valid field", () => {
    expect(changeSettings(defaultSettings, { intervalSeconds: 7200 })).toEqual({
      ...defaultSettings,
      intervalSeconds: 7200,
    });
  });

  it("rejects the whole change for one bad field", () => {
    expect(() => changeSettings(defaultSettings, { intervalSeconds: 1.5 })).toThrow("intervalSeconds");
    expect(() => changeSettings(defaultSettings, { intervalSeconds: 0 })).toThrow("intervalSeconds");
    expect(() => changeSettings(defaultSettings, { intervalSeconds: 86401 })).toThrow("intervalSeconds");
    expect(() => changeSettings(defaultSettings, { sec: 5 })).toThrow("Unknown setting sec.");
  });
});
