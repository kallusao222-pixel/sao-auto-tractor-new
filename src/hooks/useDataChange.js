import {
  useEffect,
} from "react";

import {
  subscribeToDataChanges,
} from "../data/dataEvents";

function useDataChange(callback) {
  useEffect(() => {
    if (typeof callback !== "function") {
      return undefined;
    }

    const unsubscribe =
      subscribeToDataChanges(callback);

    return unsubscribe;
  }, [callback]);
}

export default useDataChange;