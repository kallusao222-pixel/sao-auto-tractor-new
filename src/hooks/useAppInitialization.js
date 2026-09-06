import {
  useEffect,
  useState,
} from "react";

import {
  initializeStorage,
} from "../data/initializeStorage";

export function useAppInitialization() {
  const [isInitialized, setIsInitialized] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    try {
      initializeStorage();

      if (mounted) {
        setIsInitialized(true);
      }
    } catch (error) {
      console.error(
        "Failed to initialize SAO AUTO TRACTOR:",
        error,
      );

      if (mounted) {
        setIsInitialized(true);
      }
    }

    return () => {
      mounted = false;
    };
  }, []);

  return {
    isInitialized,
  };
}

export default useAppInitialization;