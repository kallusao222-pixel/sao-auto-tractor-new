/* =========================================================
   SAO AUTO TRACTOR — GLOBAL SEARCH
   Pure search logic. Read-only. No UI, no side effects.
   ========================================================= */

/* ---------------------------------------------------------
   CONFIG
   --------------------------------------------------------- */

const MAX_RESULTS_PER_GROUP = 6;
const MAX_TRIPS_TO_SEARCH = 500; // performance cap

/* ---------------------------------------------------------
   HELPERS
   --------------------------------------------------------- */

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

/* ---------------------------------------------------------
   TRIP HELPERS (match existing pages)
   --------------------------------------------------------- */

function getTripVehicleNumber(trip) {
  return (
    trip?.vehicleNumber ||
    trip?.tractorNumber ||
    trip?.vehicleNo ||
    trip?.vehicle ||
    ""
  );
}

function getTripPartyName(trip) {
  return trip?.partyName || trip?.party || trip?.customerName || "";
}

function getTripMaterialName(trip) {
  return trip?.materialName || trip?.material || trip?.product || "";
}

function getTripDriverName(trip) {
  return trip?.driverName || trip?.driver || "";
}

function getTripDate(trip) {
  return (
    trip?.date ||
    trip?.createdAt?.split("T")[0] ||
    trip?.createdAt ||
    ""
  );
}

function getTripAmount(trip) {
  const direct = Number(trip?.amount);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const qty = Number(trip?.quantity || 0);
  const rate = Number(trip?.rate || 0);
  return qty > 0 && rate > 0 ? qty * rate : 0;
}

function getTractorVehicleNumber(tractor) {
  return (
    tractor?.vehicleNumber ||
    tractor?.tractorNumber ||
    tractor?.vehicleNo ||
    tractor?.number ||
    ""
  );
}

/* ---------------------------------------------------------
   FORMATTERS
   --------------------------------------------------------- */

function formatMoney(value) {
  const n = Number(value) || 0;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatDateShort(value) {
  if (!value) return "";
  const text = String(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${d} ${months[Number(m) - 1]} ${y}`;
  }
  return text;
}

/* ---------------------------------------------------------
   STATIC NAVIGATION COMMANDS
   --------------------------------------------------------- */

const NAV_COMMANDS = [
  { id: "nav-dashboard", page: "dashboard", label: "Dashboard", hint: "Business overview" },
  { id: "nav-add-trip", page: "add-trip", label: "Add Trip", hint: "Record new transport work" },
  { id: "nav-records", page: "records", label: "All Records", hint: "View all trips" },
  { id: "nav-tractors", page: "tractors", label: "Tractors", hint: "Fleet management" },
  { id: "nav-parties", page: "parties", label: "Parties", hint: "Customer management" },
  { id: "nav-payments", page: "payments", label: "Payments", hint: "Collection records" },
  { id: "nav-outstanding", page: "outstanding", label: "Outstanding", hint: "Pending dues" },
  { id: "nav-reports", page: "reports", label: "Reports", hint: "Business analytics" },
  { id: "nav-expenses", page: "expenses", label: "Expenses", hint: "Expense tracking" },
  { id: "nav-staff", page: "staff", label: "Staff", hint: "Staff & salary" },
  { id: "nav-settings", page: "settings", label: "Settings", hint: "App configuration" },
];

/* ---------------------------------------------------------
   MAIN SEARCH FUNCTION
   --------------------------------------------------------- */

export function searchEverything({
  query = "",
  parties = [],
  tractors = [],
  trips = [],
} = {}) {
  const q = normalize(query);

  if (!q || q.length < 1) {
    return {
      navigation: NAV_COMMANDS.slice(0, 5),
      parties: [],
      tractors: [],
      trips: [],
      total: NAV_COMMANDS.slice(0, 5).length,
    };
  }

  const safeParties = safeArray(parties);
  const safeTractors = safeArray(tractors);
  const safeTrips = safeArray(trips);

  /* ----- Navigation matches ----- */
  const navigation = NAV_COMMANDS.filter((item) => {
    return (
      normalize(item.label).includes(q) ||
      normalize(item.hint).includes(q)
    );
  }).slice(0, MAX_RESULTS_PER_GROUP);

  /* ----- Party matches ----- */
  const partyMatches = safeParties
    .filter((party) => {
      return (
        normalize(party?.partyName).includes(q) ||
        normalize(party?.partyCode).includes(q) ||
        normalize(party?.contact).includes(q) ||
        normalize(party?.siteInfo).includes(q)
      );
    })
    .slice(0, MAX_RESULTS_PER_GROUP)
    .map((party) => ({
      id: `party-${party?.id || party?.partyName}`,
      type: "party",
      page: "parties",
      label: party?.partyName || "Unnamed Party",
      hint: [party?.partyCode, party?.contact]
        .filter(Boolean)
        .join(" · "),
      raw: party,
    }));

  /* ----- Tractor matches ----- */
  const tractorMatches = safeTractors
    .filter((tractor) => {
      return (
        normalize(getTractorVehicleNumber(tractor)).includes(q) ||
        normalize(tractor?.tractorName).includes(q) ||
        normalize(tractor?.model).includes(q) ||
        normalize(tractor?.driverName).includes(q) ||
        normalize(tractor?.driverMobile).includes(q)
      );
    })
    .slice(0, MAX_RESULTS_PER_GROUP)
    .map((tractor) => ({
      id: `tractor-${tractor?.id || getTractorVehicleNumber(tractor)}`,
      type: "tractor",
      page: "tractors",
      label: getTractorVehicleNumber(tractor) || "Unnamed Tractor",
      hint: [tractor?.tractorName, tractor?.driverName]
        .filter(Boolean)
        .join(" · "),
      raw: tractor,
    }));

  /* ----- Trip matches (limited by recency) ----- */
  const recentTrips = safeTrips.slice(0, MAX_TRIPS_TO_SEARCH);

  const tripMatches = recentTrips
    .filter((trip) => {
      return (
        normalize(getTripVehicleNumber(trip)).includes(q) ||
        normalize(getTripPartyName(trip)).includes(q) ||
        normalize(getTripMaterialName(trip)).includes(q) ||
        normalize(getTripDriverName(trip)).includes(q) ||
        normalize(trip?.tripType).includes(q) ||
        normalize(trip?.site).includes(q) ||
        normalize(trip?.location).includes(q)
      );
    })
    .slice(0, MAX_RESULTS_PER_GROUP)
    .map((trip, idx) => ({
      id: `trip-${trip?.id || `${getTripDate(trip)}-${idx}`}`,
      type: "trip",
      page: "records",
      label: getTripPartyName(trip) || "Unnamed Trip",
      hint: [
        formatDateShort(getTripDate(trip)),
        getTripVehicleNumber(trip),
        getTripMaterialName(trip),
        getTripAmount(trip) > 0 ? formatMoney(getTripAmount(trip)) : "",
      ]
        .filter(Boolean)
        .join(" · "),
      raw: trip,
    }));

  const total =
    navigation.length +
    partyMatches.length +
    tractorMatches.length +
    tripMatches.length;

  return {
    navigation,
    parties: partyMatches,
    tractors: tractorMatches,
    trips: tripMatches,
    total,
  };
}