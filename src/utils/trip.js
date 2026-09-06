export const TRIP_TYPES = {
  LOADING: "Loading",
  UNLOADING: "Unloading",
  SITE_TO_SITE: "Site to Site",
};

export const TRIP_TYPE_OPTIONS = [
  {
    value: TRIP_TYPES.LOADING,
    label: "Loading",
  },
  {
    value: TRIP_TYPES.UNLOADING,
    label: "Unloading",
  },
  {
    value: TRIP_TYPES.SITE_TO_SITE,
    label: "Site to Site",
  },
];

export function isValidTripType(
  tripType,
) {
  return Object.values(
    TRIP_TYPES,
  ).includes(tripType);
}

export function getTripType(
  trip,
) {
  const type = String(
    trip?.tripType || "",
  ).trim();

  return isValidTripType(type)
    ? type
    : "";
}

export function getTripCount(
  trip,
) {
  return getTripType(trip) ? 1 : 0;
}

export function getLoadingCount(
  trip,
) {
  return getTripType(trip) ===
    TRIP_TYPES.LOADING
    ? 1
    : 0;
}

export function getUnloadingCount(
  trip,
) {
  return getTripType(trip) ===
    TRIP_TYPES.UNLOADING
    ? 1
    : 0;
}

export function getSiteToSiteCount(
  trip,
) {
  return getTripType(trip) ===
    TRIP_TYPES.SITE_TO_SITE
    ? 1
    : 0;
}