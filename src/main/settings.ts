import { defaultSettings, numberRanges, settingRules } from "../shared/settings";
import type { SettingKey, Settings } from "../shared/settings";
import { readJsonFile } from "./json-file";

const ranges: Partial<Record<SettingKey, { min: number; max: number }>> = numberRanges;

const isSettingKey = (key: string): key is SettingKey => Object.hasOwn(settingRules, key);

function assign<K extends SettingKey>(settings: Settings, key: K, value: unknown): boolean {
  if (!settingRules[key](value)) return false;
  settings[key] = value;
  return true;
}

/** Each saved field that is missing or no longer valid falls back to its default on its own, so one bad
 * value never resets the rest. */
export function loadSettings(path: string): Settings {
  const saved = readJsonFile(path);
  const settings = { ...defaultSettings };
  if (typeof saved !== "object" || saved === null) return settings;
  for (const [key, value] of Object.entries(saved)) {
    if (isSettingKey(key) && !assign(settings, key, value)) console.error(`Ignoring the saved ${key} setting.`);
  }
  return settings;
}

/** The settings with `change` applied. The change comes from the window, so every field is checked and an
 * unknown or invalid one rejects the whole change. */
export function changeSettings(current: Settings, change: unknown): Settings {
  if (typeof change !== "object" || change === null) throw new Error("A settings change must be an object.");
  const next = { ...current };
  for (const [key, value] of Object.entries(change)) {
    if (!isSettingKey(key)) throw new Error(`Unknown setting ${key}.`);
    if (assign(next, key, value)) continue;
    const range = ranges[key];
    throw new Error(range ? `${key} must be a whole number from ${range.min} to ${range.max}.` : `Invalid ${key}.`);
  }
  return next;
}
