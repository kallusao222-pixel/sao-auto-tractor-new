import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  STORAGE_KEYS,
} from "../data/storageKeys";

import {
  readStorage,
} from "../data/storage";

import {
  getSettings,
} from "../data/settings";

import {
  subscribeToDataChanges,
} from "../data/dataEvents";

const AppDataContext =
  createContext(null);

function readArray(key) {
  const value = readStorage(
    key,
    [],
  );

  return Array.isArray(value)
    ? value
    : [];
}

function loadAppData() {
  return {
    tractors: readArray(
      STORAGE_KEYS.tractors,
    ),

    parties: readArray(
      STORAGE_KEYS.parties,
    ),

    materials: readArray(
      STORAGE_KEYS.materials,
    ),

    trips: readArray(
      STORAGE_KEYS.trips,
    ),

    payments: readArray(
      STORAGE_KEYS.payments,
    ),

    staff: readArray(
      STORAGE_KEYS.staff,
    ),

    settings: getSettings(),
  };
}

export function AppDataProvider({
  children,
}) {
  const [
    data,
    setData,
  ] = useState(
    loadAppData,
  );

  const refreshData = () => {
    setData(
      loadAppData(),
    );
  };

  useEffect(() => {
    const unsubscribe =
      subscribeToDataChanges(
        refreshData,
      );

    const handleStorage = (
      event,
    ) => {
      if (
        !event.key ||
        Object.values(
          STORAGE_KEYS,
        ).includes(
          event.key,
        )
      ) {
        refreshData();
      }
    };

    window.addEventListener(
      "storage",
      handleStorage,
    );

    return () => {
      unsubscribe?.();

      window.removeEventListener(
        "storage",
        handleStorage,
      );
    };
  }, []);

  const value = useMemo(
    () => ({
      ...data,
      refreshData,
    }),
    [data],
  );

  return (
    <AppDataContext.Provider
      value={value}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context =
    useContext(
      AppDataContext,
    );

  if (!context) {
    throw new Error(
      "useAppData must be used inside AppDataProvider.",
    );
  }

  return context;
}

export default AppDataProvider;