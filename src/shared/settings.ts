export type Settings = { intervalSeconds: number };
export type SettingKey = keyof Settings;
export const defaultSettings: Settings = { intervalSeconds: 3600 };
export const numberRanges = { intervalSeconds: { min: 60, max: 86_400 } };
export const settingRules = {
  intervalSeconds: (value: unknown): value is number =>
    typeof value === "number" && Number.isInteger(value) && value >= 60 && value <= 86_400,
};
