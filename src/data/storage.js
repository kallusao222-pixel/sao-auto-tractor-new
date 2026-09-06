export function readStorage(key, fallback = null) {
  try {
    const rawValue = localStorage.getItem(key);

    if (rawValue === null) {
      return fallback;
    }

    return JSON.parse(rawValue);
  } catch (error) {
    console.error(
      `Failed to read storage key: ${key}`,
      error,
    );

    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value),
    );

    return true;
  } catch (error) {
    console.error(
      `Failed to write storage key: ${key}`,
      error,
    );

    return false;
  }
}

export function removeStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(
      `Failed to remove storage key: ${key}`,
      error,
    );

    return false;
  }
}

export function clearStorage() {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error(
      "Failed to clear local storage",
      error,
    );

    return false;
  }
}