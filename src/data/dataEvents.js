const DATA_CHANGE_EVENT =
  "saoAutoTractorDataChanged";

export function emitDataChange(
  detail = {},
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    window.dispatchEvent(
      new CustomEvent(
        DATA_CHANGE_EVENT,
        {
          detail,
        },
      ),
    );
  } catch (error) {
    console.error(
      "Failed to emit data change event:",
      error,
    );
  }
}

export function subscribeToDataChanges(
  callback,
) {
  if (
    typeof window === "undefined" ||
    typeof callback !== "function"
  ) {
    return () => {};
  }

  const handleChange = (event) => {
    callback(event?.detail);
  };

  window.addEventListener(
    DATA_CHANGE_EVENT,
    handleChange,
  );

  return () => {
    window.removeEventListener(
      DATA_CHANGE_EVENT,
      handleChange,
    );
  };
}

export function getDataChangeEventName() {
  return DATA_CHANGE_EVENT;
}