import { toNumber } from "./currency";
import { getTripCount } from "./trip";

export function calculateTripAmount(
  trip,
) {
  if (!trip) {
    return 0;
  }

  if (
    trip.amount !== undefined &&
    trip.amount !== null &&
    trip.amount !== ""
  ) {
    return toNumber(trip.amount);
  }

  const quantity = toNumber(
    trip.quantity,
  );

  const rate = toNumber(
    trip.rate,
  );

  return quantity * rate;
}

export function calculateTotalBilling(
  trips = [],
) {
  if (!Array.isArray(trips)) {
    return 0;
  }

  return trips.reduce(
    (total, trip) =>
      total +
      calculateTripAmount(trip),
    0,
  );
}

export function calculateTotalReceived(
  payments = [],
) {
  if (!Array.isArray(payments)) {
    return 0;
  }

  return payments.reduce(
    (total, payment) =>
      total +
      toNumber(payment?.amount),
    0,
  );
}

export function calculateOutstanding(
  billing = 0,
  received = 0,
) {
  return Math.max(
    0,
    toNumber(billing) -
      toNumber(received),
  );
}

export function calculatePartySummary(
  partyName,
  trips = [],
  payments = [],
) {
  const normalizedName = String(
    partyName || "",
  )
    .trim()
    .toLowerCase();

  const partyTrips =
    Array.isArray(trips)
      ? trips.filter(
          (trip) =>
            String(
              trip?.partyName || "",
            )
              .trim()
              .toLowerCase() ===
            normalizedName,
        )
      : [];

  const partyPayments =
    Array.isArray(payments)
      ? payments.filter(
          (payment) =>
            String(
              payment?.partyName ||
                "",
            )
              .trim()
              .toLowerCase() ===
            normalizedName,
        )
      : [];

  const billing =
    calculateTotalBilling(
      partyTrips,
    );

  const received =
    calculateTotalReceived(
      partyPayments,
    );

  const outstanding =
    calculateOutstanding(
      billing,
      received,
    );

  return {
    partyName:
      String(partyName || "").trim(),
    tripCount: partyTrips.reduce(
      (total, trip) =>
        total + getTripCount(trip),
      0,
    ),
    billing,
    received,
    outstanding,
  };
}

export function calculateTripSummary(
  trips = [],
) {
  const safeTrips =
    Array.isArray(trips)
      ? trips
      : [];

  return {
    total: safeTrips.reduce(
      (total, trip) =>
        total + getTripCount(trip),
      0,
    ),

    loading: safeTrips.filter(
      (trip) =>
        trip?.tripType ===
        "Loading",
    ).length,

    unloading: safeTrips.filter(
      (trip) =>
        trip?.tripType ===
        "Unloading",
    ).length,

    siteToSite: safeTrips.filter(
      (trip) =>
        trip?.tripType ===
        "Site to Site",
    ).length,

    billing:
      calculateTotalBilling(
        safeTrips,
      ),
  };
}