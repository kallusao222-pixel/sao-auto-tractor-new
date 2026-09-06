import {
  readStorage,
  writeStorage,
} from "./storage";

import {
  STORAGE_KEYS,
} from "./storageKeys";

import {
  DEFAULT_DATA,
  DEFAULT_SETTINGS,
} from "./defaultData";

export function initializeStorage() {
  const defaults = {
    [STORAGE_KEYS.tractors]:
      DEFAULT_DATA.tractors,

    [STORAGE_KEYS.parties]:
      DEFAULT_DATA.parties,

    [STORAGE_KEYS.materials]:
      DEFAULT_DATA.materials,

    [STORAGE_KEYS.trips]:
      DEFAULT_DATA.trips,

    [STORAGE_KEYS.payments]:
      DEFAULT_DATA.payments,

    [STORAGE_KEYS.staff]:
      DEFAULT_DATA.staff,

    [STORAGE_KEYS.settings]:
      DEFAULT_SETTINGS,
  };

  Object.entries(defaults).forEach(
    ([key, defaultValue]) => {
      const existingValue =
        readStorage(key, null);

      if (existingValue === null) {
        writeStorage(
          key,
          defaultValue,
        );
      }
    },
  );

  return true;
}