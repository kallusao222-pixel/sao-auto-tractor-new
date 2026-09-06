export const DEFAULT_DATA = {
  tractors: [],
  parties: [],
  materials: [],
  trips: [],
  payments: [],
  staff: [],
};

export const DEFAULT_SETTINGS = {
  companyName: "SAO AUTO TRACTOR",
  footerText: "",
  currency: "INR",
  decimalPlaces: 2,
  dateFormat: "DD/MM/YYYY",

  // Only these 3 trip types are allowed
  defaultTripType: "Loading",

  defaultUnit: "Trip",
  billPrefix: "BILL",
  paymentMode: "Cash",

  allowAdvance: true,
  autoPartyCode: true,

  financialYear: "",

  showBilling: true,
  showDue: true,

  theme: "light",
  layout: "comfortable",

  appLock: false,
  autoLock: false,
};