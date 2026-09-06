import {
  DEFAULT_SETTINGS,
} from "./defaultData";

import {
  STORAGE_KEYS,
} from "./storageKeys";

import {
  readStorage,
  writeStorage,
} from "./storage";

import {
  emitDataChange,
} from "./dataEvents";

export function getSettings() {
  const savedSettings = readStorage(
    STORAGE_KEYS.settings,
    null,
  );

  if (
    !savedSettings ||
    typeof savedSettings !== "object" ||
    Array.isArray(savedSettings)
  ) {
    return {
      ...DEFAULT_SETTINGS,
    };
  }

  return {
    ...DEFAULT_SETTINGS,
    ...savedSettings,
  };
}

export function saveSettings(
  settings = {},
) {
  const currentSettings =
    getSettings();

  const nextSettings = {
    ...currentSettings,
    ...(settings &&
    typeof settings === "object"
      ? settings
      : {}),
  };

  const saved = writeStorage(
    STORAGE_KEYS.settings,
    nextSettings,
  );

  if (saved) {
    emitDataChange({
      type: "settings",
      action: "update",
    });
  }

  return saved
    ? nextSettings
    : currentSettings;
}

export function updateSettings(
  updates = {},
) {
  return saveSettings(updates);
}

export function resetSettings() {
  const nextSettings = {
    ...DEFAULT_SETTINGS,
  };

  const saved = writeStorage(
    STORAGE_KEYS.settings,
    nextSettings,
  );

  if (saved) {
    emitDataChange({
      type: "settings",
      action: "reset",
    });
  }

  return saved
    ? nextSettings
    : getSettings();
}