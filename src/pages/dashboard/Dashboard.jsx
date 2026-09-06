import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  CalendarDays,
  CheckCircle2,
  IndianRupee,
  MapPin,
  Package,
  Plus,
  ReceiptText,
  Tractor,
  Truck,
  Users,
  WalletCards,
  AlertTriangle,
  Clock3,
  TrendingUp,
  CreditCard,
  BarChart3,
  MessageCircle,
  FileBarChart,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAppData } from "../../context/AppDataContext";

import {
  calculateTotalBilling,
  calculateTotalReceived,
  calculateOutstanding,
  calculateTripSummary,
  calculatePartySummary,
} from "../../utils/calculations";

import { formatCurrency } from "../../utils/currency";

import {
  formatDate,
  getTodayISO,
} from "../../utils/date";

import { getTripType } from "../../utils/trip";

import StatCard from "../../components/ui/StatCard";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import StatusBadge from "../../components/ui/StatusBadge";

import "./Dashboard.css";


/* =========================================================
   HELPERS
   ========================================================= */

function getDateValue(value) {
  if (!value) return 0;

  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}


function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}


function getVehicleNumber(tractor) {
  return (
    tractor?.vehicleNumber ||
    tractor?.tractorNumber ||
    tractor?.vehicleNo ||
    tractor?.number ||
    "Unknown"
  );
}


function getTripVehicleNumber(trip) {
  return (
    trip?.vehicleNumber ||
    trip?.tractorNumber ||
    trip?.vehicleNo ||
    ""
  );
}


function getTripAmount(trip) {
  const directAmount = Number(
    trip?.amount || 0,
  );

  if (directAmount > 0) {
    return directAmount;
  }

  const quantity = Number(
    trip?.quantity || 0,
  );

  const rate = Number(
    trip?.rate || 0,
  );

  return quantity > 0 && rate > 0
    ? quantity * rate
    : 0;
}


function isActive(item) {
  const status = String(
    item?.status || "",
  ).toLowerCase();

  return status !== "inactive";
}


function getTripPartyName(trip) {
  return (
    trip?.partyName ||
    trip?.party ||
    "Unassigned Party"
  );
}


function getTripMaterialName(trip) {
  return (
    trip?.materialName ||
    trip?.material ||
    "Material not specified"
  );
}


function getTripDateValue(trip) {
  return (
    trip?.createdAt ||
    trip?.updatedAt ||
    trip?.date ||
    ""
  );
}


function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    },
  );
}


/* =========================================================
   SMALL UI COMPONENTS
   ========================================================= */

function SectionHeader({
  eyebrow,
  title,
  description,
  actionText,
  onAction,
}) {
  return (
    <div className="dashboard-section-header">

      <div className="dashboard-section-heading">

        {eyebrow && (
          <span className="dashboard-section-eyebrow">
            {eyebrow}
          </span>
        )}

        <h2>{title}</h2>

        {description && (
          <p>{description}</p>
        )}

      </div>


      {actionText && onAction && (
        <button
          type="button"
          className="dashboard-view-all"
          onClick={onAction}
        >
          {actionText}
          <ArrowRight size={15} />
        </button>
      )}

    </div>
  );
}


function EmptyState({
  icon,
  title,
  text,
  buttonText,
  onAction,
}) {
  return (
    <div className="dashboard-empty-state">

      <div className="dashboard-empty-icon">
        {icon}
      </div>

      <div className="dashboard-empty-content">
        <strong>{title}</strong>
        <span>{text}</span>
      </div>

      {buttonText && onAction && (
        <Button
          variant="secondary"
          size="small"
          onClick={onAction}
        >
          {buttonText}
        </Button>
      )}

    </div>
  );
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function Dashboard({ onNavigate }) {
  const {
    trips = [],
    payments = [],
    parties = [],
    tractors = [],
    materials = [],
    staff = [],
    staffAttendance = [],
    staffSalaryPayments = [],
  } = useAppData();


  const safeTrips = Array.isArray(trips)
    ? trips
    : [];

  const safePayments = Array.isArray(
    payments,
  )
    ? payments
    : [];

  const safeParties = Array.isArray(
    parties,
  )
    ? parties
    : [];

  const safeTractors = Array.isArray(
    tractors,
  )
    ? tractors
    : [];

  const safeMaterials = Array.isArray(
    materials,
  )
    ? materials
    : [];

  const safeStaff = Array.isArray(staff)
    ? staff
    : [];

  const safeAttendance = Array.isArray(
    staffAttendance,
  )
    ? staffAttendance
    : [];

  const safeSalaryPayments = Array.isArray(
    staffSalaryPayments,
  )
    ? staffSalaryPayments
    : [];


  /* =======================================================
     LIVE HEADER
     ======================================================= */

  const [currentTime, setCurrentTime] =
    useState(new Date());

  const [location, setLocation] =
    useState({
      city: "Ranchi",
      state: "Jharkhand",
      country: "India",
      loading: false,
    });

  const [trendMode, setTrendMode] =
    useState("trips");


  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);


  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    setLocation((previous) => ({
      ...previous,
      loading: true,
    }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const {
          latitude,
          longitude,
        } = position.coords;

        try {
          const response =
            await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
              {
                headers: {
                  Accept:
                    "application/json",
                },
              },
            );

          if (!response.ok) {
            throw new Error(
              "Location lookup failed",
            );
          }

          const data =
            await response.json();

          const address =
            data?.address || {};

          setLocation({
            city:
              address?.city ||
              address?.town ||
              address?.village ||
              address?.municipality ||
              "Ranchi",

            state:
              address?.state ||
              "Jharkhand",

            country:
              address?.country ||
              "India",

            loading: false,
          });
        } catch {
          setLocation({
            city: "Ranchi",
            state: "Jharkhand",
            country: "India",
            loading: false,
          });
        }
      },
      () => {
        setLocation({
          city: "Ranchi",
          state: "Jharkhand",
          country: "India",
          loading: false,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000,
      },
    );
  }, []);


  const currentHour =
    currentTime.getHours();

  const greeting =
    currentHour < 12
      ? "Good Morning"
      : currentHour < 17
        ? "Good Afternoon"
        : currentHour < 21
          ? "Good Evening"
          : "Good Night";


  const formattedTime =
    currentTime.toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      },
    );


  const formattedHeaderDate =
    currentTime.toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      },
    );


  const locationText = location.loading
    ? "Detecting location..."
    : `${location.city}, ${location.state}, ${location.country}`;


  /* =======================================================
     DATE
     ======================================================= */

  const today = getTodayISO();


  /* =======================================================
     BASIC BUSINESS CALCULATIONS
     ======================================================= */

  const activeTractors = useMemo(
    () =>
      safeTractors.filter(isActive),
    [safeTractors],
  );


  const activeParties = useMemo(
    () =>
      safeParties.filter(isActive),
    [safeParties],
  );


  const activeStaff = useMemo(
    () =>
      safeStaff.filter(isActive),
    [safeStaff],
  );


  const todayTrips = useMemo(
    () =>
      safeTrips.filter(
        (trip) =>
          trip?.date === today,
      ),
    [safeTrips, today],
  );


  const todayPayments = useMemo(
    () =>
      safePayments.filter(
        (payment) =>
          payment?.date === today,
      ),
    [safePayments, today],
  );


  const totalBilling =
    calculateTotalBilling(
      safeTrips,
    );


  const totalReceived =
    calculateTotalReceived(
      safePayments,
    );


  const outstanding =
    calculateOutstanding(
      totalBilling,
      totalReceived,
    );


  const todayBilling =
    calculateTotalBilling(
      todayTrips,
    );


  const todayReceived =
    calculateTotalReceived(
      todayPayments,
    );


  const tripSummary =
    calculateTripSummary(
      safeTrips,
    );


  const todayTripSummary =
    calculateTripSummary(
      todayTrips,
    );


  /* =======================================================
     TODAY'S TRIP BREAKDOWN
     ======================================================= */

  const todayLoading =
    todayTripSummary?.loading ?? 0;


  const todayUnloading =
    todayTripSummary?.unloading ?? 0;


  const todaySiteToSite =
    todayTripSummary?.siteToSite ??
    todayTripSummary?.site_to_site ??
    0;


  /* =======================================================
     TODAY'S UNIQUE OPERATIONAL DATA
     ======================================================= */

  const todayUniqueVehicles =
    useMemo(() => {
      const values =
        todayTrips
          .map(getTripVehicleNumber)
          .map(normalizeName)
          .filter(Boolean);

      return new Set(values).size;
    }, [todayTrips]);


  const todayUniqueParties =
    useMemo(() => {
      const values =
        todayTrips
          .map(getTripPartyName)
          .map(normalizeName)
          .filter(Boolean);

      return new Set(values).size;
    }, [todayTrips]);


  const todayUniqueMaterials =
    useMemo(() => {
      const values =
        todayTrips
          .map(getTripMaterialName)
          .map(normalizeName)
          .filter(Boolean);

      return new Set(values).size;
    }, [todayTrips]);


  /* =======================================================
     TODAY'S PARTY-WISE OPERATIONS
     ======================================================= */

  const todayPartySummary =
    useMemo(() => {
      const grouped = new Map();

      todayTrips.forEach((trip) => {
        const partyName =
          getTripPartyName(trip);

        const key =
          normalizeName(partyName);

        if (!key) return;

        if (!grouped.has(key)) {
          grouped.set(key, {
            partyName,
            trips: 0,
            billing: 0,
          });
        }

        const current =
          grouped.get(key);

        current.trips += 1;
        current.billing +=
          getTripAmount(trip);
      });

      return Array.from(
        grouped.values(),
      )
        .sort((a, b) => {
          if (b.trips !== a.trips) {
            return b.trips - a.trips;
          }

          return b.billing - a.billing;
        });
    }, [todayTrips]);


  /* =======================================================
     TODAY'S TRACTOR-WISE OPERATIONS
     ======================================================= */

  const todayTractorSummary =
    useMemo(() => {
      const grouped = new Map();

      todayTrips.forEach((trip) => {
        const vehicle =
          getTripVehicleNumber(trip);

        const displayVehicle =
          vehicle || "Vehicle not specified";

        const key =
          normalizeName(displayVehicle);

        if (!key) return;

        if (!grouped.has(key)) {
          grouped.set(key, {
            vehicle: displayVehicle,
            trips: 0,
            billing: 0,
          });
        }

        const current =
          grouped.get(key);

        current.trips += 1;
        current.billing +=
          getTripAmount(trip);
      });

      return Array.from(
        grouped.values(),
      )
        .sort((a, b) => {
          if (b.trips !== a.trips) {
            return b.trips - a.trips;
          }

          return b.billing - a.billing;
        });
    }, [todayTrips]);


  /* =======================================================
     OUTSTANDING PARTIES
     ======================================================= */

  const outstandingParties =
    useMemo(() => {
      return safeParties
        .map((party) =>
          calculatePartySummary(
            party?.partyName ||
              party?.name ||
              "",
            safeTrips,
            safePayments,
          ),
        )
        .filter(
          (party) =>
            Number(
              party?.outstanding || 0,
            ) > 0,
        )
        .sort(
          (a, b) =>
            Number(
              b?.outstanding || 0,
            ) -
            Number(
              a?.outstanding || 0,
            ),
        );
    }, [
      safeParties,
      safeTrips,
      safePayments,
    ]);


  /* =======================================================
     IDLE TRACTORS
     ======================================================= */

  const idleTractors =
    useMemo(() => {
      const todayVehicleNames =
        new Set(
          todayTrips
            .map(getTripVehicleNumber)
            .map(normalizeName)
            .filter(Boolean),
        );

      return activeTractors.filter(
        (tractor) => {
          const vehicle =
            normalizeName(
              getVehicleNumber(
                tractor,
              ),
            );

          return (
            vehicle &&
            !todayVehicleNames.has(
              vehicle,
            )
          );
        },
      );
    }, [
      activeTractors,
      todayTrips,
    ]);


  /* =======================================================
     SMART REMINDERS
     ======================================================= */

  const [smartReminders, setSmartReminders] =
    useState([]);

  useEffect(() => {
    const reminders = [];

    // Payment due reminders (outstanding > 50000)
    const dueParties = outstandingParties
      .filter(party => party.outstanding > 50000)
      .slice(0, 3);

    dueParties.forEach(party => {
      reminders.push({
        id: `due-${party.partyName}`,
        type: 'payment',
        message: `${party.partyName} has ₹${formatCurrency(party.outstanding, 'INR', 0)} due`,
        severity: 'high',
        action: 'billing',
        icon: <WalletCards size={15} />,
      });
    });

    // Idle tractor reminders
    const idleList = idleTractors.slice(0, 2);
    idleList.forEach(tractor => {
      reminders.push({
        id: `idle-${tractor.vehicleNumber || tractor.name || 'tractor'}`,
        type: 'idle',
        message: `${tractor.vehicleNumber || tractor.name || 'Tractor'} has no trip today`,
        severity: 'medium',
        action: 'tractors',
        icon: <Tractor size={15} />,
      });
    });

    setSmartReminders(reminders);
  }, [outstandingParties, idleTractors]);


  /* =======================================================
     RECENT DATA
     ======================================================= */

  const recentTrips = useMemo(
    () =>
      [...safeTrips]
        .sort(
          (a, b) =>
            getDateValue(
              getTripDateValue(b),
            ) -
            getDateValue(
              getTripDateValue(a),
            ),
        )
        .slice(0, 6),
    [safeTrips],
  );


  const recentPayments =
    useMemo(
      () =>
        [...safePayments]
          .sort(
            (a, b) =>
              getDateValue(
                b?.createdAt ||
                  b?.date,
              ) -
              getDateValue(
                a?.createdAt ||
                  a?.date,
              ),
          )
          .slice(0, 6),
      [safePayments],
    );


  /* =======================================================
     TOP PERFORMING FLEET
     ======================================================= */

  const tractorSummary =
    useMemo(() => {
      return activeTractors
        .map((tractor) => {
          const vehicle =
            getVehicleNumber(
              tractor,
            );

          const tractorTrips =
            safeTrips.filter(
              (trip) =>
                normalizeName(
                  getTripVehicleNumber(
                    trip,
                  ),
                ) ===
                normalizeName(
                  vehicle,
                ),
            );


          let loading = 0;
          let unloading = 0;
          let siteToSite = 0;


          tractorTrips.forEach(
            (trip) => {
              const type =
                getTripType(trip);

              if (
                type === "Loading"
              ) {
                loading += 1;
              } else if (
                type === "Unloading"
              ) {
                unloading += 1;
              } else if (
                type === "Site to Site"
              ) {
                siteToSite += 1;
              }
            },
          );


          const billing =
            tractorTrips.reduce(
              (
                sum,
                trip,
              ) =>
                sum +
                getTripAmount(
                  trip,
                ),
              0,
            );


          return {
            vehicle,
            driver:
              tractor?.driverName ||
              "Driver not assigned",
            totalTrips:
              tractorTrips.length,
            loading,
            unloading,
            siteToSite,
            billing,
          };
        })
        .filter(
          (tractor) =>
            tractor.totalTrips > 0,
        )
        .sort(
          (a, b) => {
            if (
              b.billing !==
              a.billing
            ) {
              return (
                b.billing -
                a.billing
              );
            }

            return (
              b.totalTrips -
              a.totalTrips
            );
          },
        )
        .slice(0, 5);
    }, [
      activeTractors,
      safeTrips,
    ]);


  /* =======================================================
     STAFF SUMMARY
     ======================================================= */

  const staffSalarySummary =
    useMemo(() => {
      if (!safeStaff.length) {
        return {
          gross: 0,
          advance: 0,
          paid: 0,
          balance: 0,
        };
      }


      let gross = 0;
      let advance = 0;
      let paid = 0;


      safeStaff.forEach(
        (member) => {
          const salary =
            Number(
              member?.salary ||
                member?.monthlySalary ||
                member?.dailySalary ||
                0,
            );


          const memberPayments =
            safeSalaryPayments.filter(
              (payment) =>
                normalizeName(
                  payment?.staffName,
                ) ===
                normalizeName(
                  member?.name ||
                    member?.staffName,
                ),
            );


          const memberPaid =
            memberPayments.reduce(
              (
                sum,
                payment,
              ) =>
                sum +
                Number(
                  payment?.amount ||
                    0,
                ),
              0,
            );


          gross += salary;
          paid += memberPaid;

          advance += Number(
            member?.advance || 0,
          );
        },
      );


      return {
        gross,
        advance,
        paid,
        balance: Math.max(
          gross +
            advance -
            paid,
          0,
        ),
      };
    }, [
      safeStaff,
      safeSalaryPayments,
    ]);


  /* =======================================================
     COLLECTION %
     ======================================================= */

  const collectionPercentage =
    totalBilling > 0
      ? Math.min(
          Math.max(
            (totalReceived /
              totalBilling) *
              100,
            0,
          ),
          100,
        )
      : 0;


  /* =======================================================
     7 DAY TREND
     ======================================================= */

  const lastSevenDays =
    useMemo(() => {
      const days = [];

      for (
        let index = 6;
        index >= 0;
        index -= 1
      ) {
        const date =
          new Date();

        date.setDate(
          date.getDate() -
            index,
        );

        const isoDate =
          `${date.getFullYear()}-${String(
            date.getMonth() + 1,
          ).padStart(2, "0")}-${String(
            date.getDate(),
          ).padStart(2, "0")}`;


        const dayTrips =
          safeTrips.filter(
            (trip) =>
              trip?.date ===
              isoDate,
          );


        const billing =
          calculateTotalBilling(
            dayTrips,
          );


        days.push({
          date: isoDate,
          label:
            date.toLocaleDateString(
              "en-IN",
              {
                weekday:
                  "short",
              },
            ),
          shortDate:
            date.toLocaleDateString(
              "en-IN",
              {
                day: "2-digit",
                month: "short",
              },
            ),
          trips:
            dayTrips.length,
          billing,
        });
      }

      return days;
    }, [safeTrips]);


  const trendMax = useMemo(() => {
    const values =
      lastSevenDays.map(
        (day) =>
          trendMode ===
          "trips"
            ? day.trips
            : day.billing,
      );

    return Math.max(
      ...values,
      1,
    );
  }, [
    lastSevenDays,
    trendMode,
  ]);


  /* =======================================================
     EXPORT REPORT
     ======================================================= */

  const handleExportReport = () => {
    const headers = ['Date', 'Trips', 'Billing (INR)'];
    const rows = lastSevenDays.map(day => [
      day.shortDate,
      day.trips,
      day.billing.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `business-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };


  /* =======================================================
     WHATSAPP SHARE
     ======================================================= */

  const handleWhatsAppShare = (trip) => {
    const partyName = getTripPartyName(trip);
    const material = getTripMaterialName(trip);
    const vehicle = getTripVehicleNumber(trip) || 'N/A';
    const amount = formatCurrency(getTripAmount(trip), 'INR', 0);
    const date = formatDate(trip?.date) || 'Today';
    const tripType = getTripType(trip) || 'Trip';

    const message =
      `🚜 *Trip Details*%0A%0A` +
      `📋 Trip Type: ${tripType}%0A` +
      `👤 Party: ${partyName}%0A` +
      `📦 Material: ${material}%0A` +
      `🚜 Vehicle: ${vehicle}%0A` +
      `💰 Amount: ${amount}%0A` +
      `📅 Date: ${date}%0A%0A` +
      `---%0A` +
      `SAO AUTO TRACTOR`;

    window.open(`https://wa.me/?text=${message}`, '_blank');
  };


  /* =======================================================
     RECENT ACTIVITY
     ======================================================= */

  const recentActivity =
    useMemo(() => {
      const tripActivities =
        safeTrips.map(
          (trip) => ({
            id:
              `trip-${trip?.id || getTripDateValue(trip)}`,
            type: "trip",
            date:
              getTripDateValue(
                trip,
              ),
            title:
              "Trip added",
            name:
              getTripPartyName(
                trip,
              ),
            detail:
              `${getTripMaterialName(trip)} • ${getTripVehicleNumber(trip) || "Vehicle not specified"}`,
            amount:
              getTripAmount(
                trip,
              ),
          }),
        );


      const paymentActivities =
        safePayments.map(
          (payment) => ({
            id:
              `payment-${payment?.id || payment?.createdAt || payment?.date}`,
            type: "payment",
            date:
              payment?.createdAt ||
              payment?.date,
            title:
              "Payment received",
            name:
              payment?.partyName ||
              "Unknown Party",
            detail:
              payment?.paymentMode ||
              "Payment",
            amount:
              Number(
                payment?.amount ||
                  0,
              ),
          }),
        );


      return [
        ...tripActivities,
        ...paymentActivities,
      ]
        .sort(
          (a, b) =>
            getDateValue(
              b.date,
            ) -
            getDateValue(
              a.date,
            ),
        )
        .slice(0, 6);
    }, [
      safeTrips,
      safePayments,
    ]);


  /* =======================================================
     NAVIGATION
     ======================================================= */

  const handleNavigate = (
    page,
  ) => {
    onNavigate?.(page);
  };


  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="dashboard-page">


      {/* =================================================
          SMART WELCOME
          ================================================= */}

      <section className="dashboard-welcome">

        <div className="dashboard-welcome-content">

          <span className="dashboard-welcome-eyebrow">
            BUSINESS OVERVIEW
          </span>


          <h1>
            {greeting} 👋

            <span>
              Welcome back to SAO AUTO TRACTOR
            </span>
          </h1>


          <p>
            Here's what is happening
            with your transport
            business today.
          </p>


          <div className="dashboard-welcome-meta">

            <span>
              <CalendarDays
                size={15}
              />

              {formattedHeaderDate}
            </span>


            <span>
              <Activity
                size={15}
              />

              {formattedTime}
            </span>


            <span>
              <MapPin
                size={15}
              />

              {locationText}
            </span>

          </div>

        </div>


        <div className="dashboard-welcome-action">

          <Button
            variant="primary"
            icon={
              <Plus size={17} />
            }
            onClick={() =>
              handleNavigate(
                "add-trip",
              )
            }
          >
            Add New Trip
          </Button>

        </div>

      </section>


      {/* =================================================
          PRIMARY KPI
          ================================================= */}

      <section
        className="dashboard-summary dashboard-primary-kpis"
        aria-label="Today's primary business metrics"
      >

        <StatCard
          label="Today's Trips"
          value={
            todayTrips.length
          }
          icon={
            <Activity size={18} />
          }
        />


        <StatCard
          label="Today's Billing"
          value={todayBilling}
          icon={
            <IndianRupee
              size={18}
            />
          }
          format="currency"
        />


        <StatCard
          label="Received Today"
          value={todayReceived}
          icon={
            <ArrowDownToLine
              size={18}
            />
          }
          format="currency"
        />


        <StatCard
          label="Outstanding"
          value={outstanding}
          icon={
            <ArrowUpFromLine
              size={18}
            />
          }
          format="currency"
        />

      </section>


      {/* =================================================
          TODAY'S OVERVIEW
          ================================================= */}

      <section className="dashboard-today-overview">

        <SectionHeader
          eyebrow="TODAY'S OVERVIEW"
          title="Today's Business"
          description="A complete snapshot of today's transport activity."
        />


        <Card className="dashboard-card dashboard-today-overview-card">

          <div className="dashboard-today-grid">

            <div className="dashboard-today-stat dashboard-today-stat-primary">

              <div className="dashboard-today-stat-icon">
                <Activity size={17} />
              </div>

              <div>
                <span>Trips</span>

                <strong>
                  {todayTrips.length}
                </strong>
              </div>

            </div>


            <div className="dashboard-today-stat">

              <div className="dashboard-today-stat-icon">
                <Tractor size={17} />
              </div>

              <div>
                <span>Tractors</span>

                <strong>
                  {todayUniqueVehicles}
                </strong>
              </div>

            </div>


            <div className="dashboard-today-stat">

              <div className="dashboard-today-stat-icon">
                <Users size={17} />
              </div>

              <div>
                <span>Parties</span>

                <strong>
                  {todayUniqueParties}
                </strong>
              </div>

            </div>


            <div className="dashboard-today-stat">

              <div className="dashboard-today-stat-icon">
                <Package size={17} />
              </div>

              <div>
                <span>Materials</span>

                <strong>
                  {todayUniqueMaterials}
                </strong>
              </div>

            </div>

          </div>


          <div className="dashboard-today-financial">

            <div className="dashboard-today-financial-item">

              <span>
                Billing
              </span>

              <strong>
                {formatCurrency(
                  todayBilling,
                  "INR",
                  0,
                )}
              </strong>

            </div>


            <div className="dashboard-today-financial-divider" />


            <div className="dashboard-today-financial-item">

              <span>
                Received
              </span>

              <strong>
                {formatCurrency(
                  todayReceived,
                  "INR",
                  0,
                )}
              </strong>

            </div>

          </div>


          <div className="dashboard-today-breakdown">

            <div className="dashboard-today-breakdown-item">

              <span>
                Loading
              </span>

              <strong>
                {todayLoading}
              </strong>

            </div>


            <div className="dashboard-today-breakdown-item">

              <span>
                Unloading
              </span>

              <strong>
                {todayUnloading}
              </strong>

            </div>


            <div className="dashboard-today-breakdown-item">

              <span>
                Site to Site
              </span>

              <strong>
                {todaySiteToSite}
              </strong>

            </div>

          </div>


          <div className="dashboard-today-footer">

            <button
              type="button"
              className="dashboard-today-work-link"
              onClick={() =>
                handleNavigate(
                  "datewise",
                )
              }
            >
              <span>
                View Today's Work
              </span>

              <ArrowRight
                size={14}
              />
            </button>

          </div>

        </Card>

      </section>


      {/* =================================================
          TODAY'S OPERATIONS
          ================================================= */}

      <section className="dashboard-today-operations">

        <SectionHeader
          eyebrow="TODAY'S OPERATIONS"
          title="What Happened Today"
          description="See today's work by trip type, party and tractor."
          actionText="View Today's Work"
          onAction={() =>
            handleNavigate(
              "datewise",
            )
          }
        />


        <div className="dashboard-operations-card dashboard-card">

          {/* TRIP TYPE */}

          <div className="dashboard-operation-type-section">

            <div className="dashboard-operation-section-heading">

              <div className="dashboard-operation-heading-icon">
                <BarChart3 size={17} />
              </div>

              <div>
                <span>
                  TRIP TYPE
                </span>

                <h3>
                  Today's Work Breakdown
                </h3>
              </div>

            </div>


            <div className="dashboard-operation-type-grid">

              <div className="dashboard-operation-type-card">

                <div className="dashboard-operation-type-icon">
                  <ArrowDownToLine size={18} />
                </div>

                <div>
                  <span>
                    Loading
                  </span>

                  <strong>
                    {todayLoading}
                  </strong>

                  <small>
                    trips today
                  </small>
                </div>

              </div>


              <div className="dashboard-operation-type-card">

                <div className="dashboard-operation-type-icon">
                  <ArrowUpFromLine size={18} />
                </div>

                <div>
                  <span>
                    Unloading
                  </span>

                  <strong>
                    {todayUnloading}
                  </strong>

                  <small>
                    trips today
                  </small>
                </div>

              </div>


              <div className="dashboard-operation-type-card">

                <div className="dashboard-operation-type-icon">
                  <Truck size={18} />
                </div>

                <div>
                  <span>
                    Site to Site
                  </span>

                  <strong>
                    {todaySiteToSite}
                  </strong>

                  <small>
                    trips today
                  </small>
                </div>

              </div>

            </div>

          </div>


          <div className="dashboard-operations-divider" />


          {/* PARTY + TRACTOR */}

          <div className="dashboard-operations-columns">


            {/* PARTY ACTIVITY */}

            <div className="dashboard-operation-column">

              <div className="dashboard-operation-column-header">

                <div>

                  <span className="dashboard-card-eyebrow">
                    PARTY ACTIVITY
                  </span>

                  <h3>
                    Today's Party Trips
                  </h3>

                </div>

                <Users size={18} />

              </div>


              {todayPartySummary.length ===
              0 ? (

                <div className="dashboard-operation-empty">

                  <Users size={19} />

                  <span>
                    No party activity today
                  </span>

                </div>

              ) : (

                <div className="dashboard-operation-list">

                  {todayPartySummary
                    .slice(0, 5)
                    .map((party) => (

                      <div
                        key={
                          normalizeName(
                            party.partyName,
                          )
                        }
                        className="dashboard-operation-row"
                      >

                        <div className="dashboard-operation-row-main">

                          <div className="dashboard-operation-avatar">
                            <Users size={15} />
                          </div>

                          <div>

                            <strong>
                              {
                                party.partyName
                              }
                            </strong>

                            <span>
                              {formatCurrency(
                                party.billing,
                                "INR",
                                0,
                              )}{" "}
                              billing
                            </span>

                          </div>

                        </div>


                        <div className="dashboard-operation-row-value">

                          <strong>
                            {
                              party.trips
                            }
                          </strong>

                          <span>
                            {party.trips ===
                            1
                              ? "Trip"
                              : "Trips"}
                          </span>

                        </div>

                      </div>

                    ))}

                </div>

              )}


              {todayPartySummary.length >
                5 && (
                <button
                  type="button"
                  className="dashboard-operation-more"
                  onClick={() =>
                    handleNavigate(
                      "datewise",
                    )
                  }
                >
                  <span>
                    View all{" "}
                    {
                      todayPartySummary.length
                    }{" "}
                    parties
                  </span>

                  <ArrowRight
                    size={14}
                  />

                </button>
              )}

            </div>


            {/* TRACTOR ACTIVITY */}

            <div className="dashboard-operation-column">

              <div className="dashboard-operation-column-header">

                <div>

                  <span className="dashboard-card-eyebrow">
                    TRACTOR ACTIVITY
                  </span>

                  <h3>
                    Today's Tractor Trips
                  </h3>

                </div>

                <Tractor size={18} />

              </div>


              {todayTractorSummary.length ===
              0 ? (

                <div className="dashboard-operation-empty">

                  <Tractor size={19} />

                  <span>
                    No tractor activity today
                  </span>

                </div>

              ) : (

                <div className="dashboard-operation-list">

                  {todayTractorSummary
                    .slice(0, 5)
                    .map((tractor) => (

                      <div
                        key={
                          normalizeName(
                            tractor.vehicle,
                          )
                        }
                        className="dashboard-operation-row"
                      >

                        <div className="dashboard-operation-row-main">

                          <div className="dashboard-operation-avatar dashboard-tractor-operation-avatar">
                            <Tractor size={15} />
                          </div>

                          <div>

                            <strong>
                              {
                                tractor.vehicle
                              }
                            </strong>

                            <span>
                              {formatCurrency(
                                tractor.billing,
                                "INR",
                                0,
                              )}{" "}
                              billing
                            </span>

                          </div>

                        </div>


                        <div className="dashboard-operation-row-value">

                          <strong>
                            {
                              tractor.trips
                            }
                          </strong>

                          <span>
                            {tractor.trips ===
                            1
                              ? "Trip"
                              : "Trips"}
                          </span>

                        </div>

                      </div>

                    ))}

                </div>

              )}


              {todayTractorSummary.length >
                5 && (
                <button
                  type="button"
                  className="dashboard-operation-more"
                  onClick={() =>
                    handleNavigate(
                      "datewise",
                    )
                  }
                >
                  <span>
                    View all{" "}
                    {
                      todayTractorSummary.length
                    }{" "}
                    tractors
                  </span>

                  <ArrowRight
                    size={14}
                  />

                </button>
              )}

            </div>

          </div>


          <div className="dashboard-operations-footer">

            <button
              type="button"
              className="dashboard-operations-view-link"
              onClick={() =>
                handleNavigate(
                  "datewise",
                )
              }
            >

              <span>
                Open complete today's work report
              </span>

              <ArrowRight
                size={15}
              />

            </button>

          </div>

        </div>

      </section>


      {/* =================================================
          QUICK ACTIONS + ATTENTION
          ================================================= */}

      <section className="dashboard-action-attention-grid">


        {/* QUICK ACTIONS */}

        <Card className="dashboard-card dashboard-quick-actions">

          <div className="dashboard-card-header">

            <div>
              <span className="dashboard-card-eyebrow">
                QUICK ACTIONS
              </span>

              <h3>
                Common Tasks
              </h3>
            </div>

            <div className="dashboard-card-icon">
              <Plus size={17} />
            </div>

          </div>


          <div className="dashboard-action-grid">

            <button
              type="button"
              className="dashboard-action-button dashboard-action-primary"
              onClick={() =>
                handleNavigate(
                  "add-trip",
                )
              }
            >
              <span className="dashboard-action-icon">
                <Plus size={17} />
              </span>

              <span>
                <strong>
                  Add Trip
                </strong>

                <small>
                  Record transport work
                </small>
              </span>

              <ArrowRight size={15} />
            </button>


            <button
              type="button"
              className="dashboard-action-button"
              onClick={() =>
                handleNavigate(
                  "payments",
                )
              }
            >
              <span className="dashboard-action-icon">
                <IndianRupee
                  size={17}
                />
              </span>

              <span>
                <strong>
                  Record Payment
                </strong>

                <small>
                  Update collection
                </small>
              </span>

              <ArrowRight size={15} />
            </button>


            <button
              type="button"
              className="dashboard-action-button"
              onClick={() =>
                handleNavigate(
                  "parties",
                )
              }
            >
              <span className="dashboard-action-icon">
                <Users size={17} />
              </span>

              <span>
                <strong>
                  Add Party
                </strong>

                <small>
                  Create customer account
                </small>
              </span>

              <ArrowRight size={15} />
            </button>


            <button
              type="button"
              className="dashboard-action-button"
              onClick={() =>
                handleNavigate(
                  "tractors",
                )
              }
            >
              <span className="dashboard-action-icon">
                <Tractor size={17} />
              </span>

              <span>
                <strong>
                  Add Tractor
                </strong>

                <small>
                  Manage fleet
                </small>
              </span>

              <ArrowRight size={15} />
            </button>

          </div>

        </Card>


        {/* ATTENTION REQUIRED + SMART REMINDERS */}

        <Card className="dashboard-card dashboard-attention-card">

          <div className="dashboard-card-header">

            <div>
              <span className="dashboard-card-eyebrow">
                ATTENTION REQUIRED
              </span>

              <h3>
                Things to Check
              </h3>
            </div>

            <div className="dashboard-card-icon dashboard-attention-icon">
              <AlertTriangle
                size={17}
              />
            </div>

          </div>


          {outstandingParties.length ===
            0 &&
          idleTractors.length ===
            0 ? (

            <div className="dashboard-all-good">

              <div className="dashboard-all-good-icon">
                <CheckCircle2
                  size={21}
                />
              </div>

              <div>
                <strong>
                  Everything looks good
                </strong>

                <span>
                  No immediate action
                  required.
                </span>
              </div>

            </div>

          ) : (

            <div className="dashboard-attention-list">


              {outstandingParties.length >
                0 && (
                <button
                  type="button"
                  className="dashboard-attention-item"
                  onClick={() =>
                    handleNavigate(
                      "billing",
                    )
                  }
                >

                  <span className="dashboard-attention-item-icon dashboard-attention-danger">
                    <WalletCards
                      size={17}
                    />
                  </span>

                  <span className="dashboard-attention-content">

                    <strong>
                      {
                        outstandingParties.length
                      }{" "}
                      {outstandingParties.length ===
                      1
                        ? "party has"
                        : "parties have"}{" "}
                      outstanding dues
                    </strong>

                    <small>
                      {formatCurrency(
                        outstanding,
                        "INR",
                        0,
                      )}{" "}
                      total outstanding
                    </small>

                  </span>

                  <ArrowRight
                    size={15}
                  />

                </button>
              )}


              {idleTractors.length >
                0 && (
                <button
                  type="button"
                  className="dashboard-attention-item"
                  onClick={() =>
                    handleNavigate(
                      "tractors",
                    )
                  }
                >

                  <span className="dashboard-attention-item-icon dashboard-attention-warning">
                    <Tractor
                      size={17}
                    />
                  </span>

                  <span className="dashboard-attention-content">

                    <strong>
                      {
                        idleTractors.length
                      }{" "}
                      {idleTractors.length ===
                      1
                        ? "tractor has"
                        : "tractors have"}{" "}
                      no trip today
                    </strong>

                    <small>
                      Check fleet
                      availability
                    </small>

                  </span>

                  <ArrowRight
                    size={15}
                  />

                </button>
              )}


              {outstandingParties.length >
                0 && (
                <button
                  type="button"
                  className="dashboard-attention-item"
                  onClick={() =>
                    handleNavigate(
                      "billing",
                    )
                  }
                >

                  <span className="dashboard-attention-item-icon dashboard-attention-neutral">
                    <CreditCard
                      size={17}
                    />
                  </span>

                  <span className="dashboard-attention-content">

                    <strong>
                      Payment follow-up
                      required
                    </strong>

                    <small>
                      Review pending
                      party collections
                    </small>

                  </span>

                  <ArrowRight
                    size={15}
                  />

                </button>
              )}

            </div>

          )}


          {/* ===============================================
              SMART REMINDERS
              =============================================== */}

          {smartReminders.length > 0 && (
            <div className="dashboard-smart-reminders">
              <div className="dashboard-smart-reminders-header">
                <span className="dashboard-smart-reminders-label">
                  <Clock3 size={14} />
                  Smart Reminders
                </span>
              </div>

              <div className="dashboard-smart-reminders-list">
                {smartReminders.map((reminder) => (
                  <button
                    key={reminder.id}
                    type="button"
                    className="dashboard-smart-reminder-item"
                    onClick={() => handleNavigate(reminder.action)}
                  >
                    <span className={`dashboard-smart-reminder-dot dashboard-smart-reminder-${reminder.severity}`} />
                    <span className="dashboard-smart-reminder-message">{reminder.message}</span>
                    <ArrowRight size={13} className="dashboard-smart-reminder-arrow" />
                  </button>
                ))}
              </div>
            </div>
          )}

        </Card>

      </section>


      {/* =================================================
          7 DAY BUSINESS TREND + EXPORT
          ================================================= */}

      <section className="dashboard-trend-section">

        <Card className="dashboard-card dashboard-trend-card">

          <div className="dashboard-card-header">

            <div>
              <span className="dashboard-card-eyebrow">
                BUSINESS TREND
              </span>

              <h3>
                Last 7 Days
              </h3>

              <p className="dashboard-card-header-description">
                Track recent business
                activity at a glance.
              </p>
            </div>


            <div className="dashboard-trend-actions">

              <button
                type="button"
                className="dashboard-export-btn"
                onClick={handleExportReport}
                title="Export as CSV"
                aria-label="Export report as CSV"
              >
                <FileBarChart size={15} />
                Export CSV
              </button>

              <div className="dashboard-trend-toggle">

                <button
                  type="button"
                  className={
                    trendMode ===
                    "trips"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setTrendMode(
                      "trips",
                    )
                  }
                >
                  Trips
                </button>

                <button
                  type="button"
                  className={
                    trendMode ===
                    "billing"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setTrendMode(
                      "billing",
                    )
                  }
                >
                  Billing
                </button>

              </div>

            </div>

          </div>


          <div className="dashboard-trend-chart">

            {lastSevenDays.map(
              (day) => {
                const value =
                  trendMode ===
                  "trips"
                    ? day.trips
                    : day.billing;

                const height =
                  value > 0
                    ? Math.max(
                        (value /
                          trendMax) *
                          100,
                        8,
                      )
                    : 4;

                return (
                  <div
                    key={
                      day.date
                    }
                    className="dashboard-trend-column"
                  >

                    <div className="dashboard-trend-value">

                      {trendMode ===
                      "billing"
                        ? formatCurrency(
                            value,
                            "INR",
                            0,
                          )
                        : value}

                    </div>


                    <div className="dashboard-trend-bar-area">

                      <div
                        className="dashboard-trend-bar"
                        style={{
                          height: `${height}%`,
                        }}
                        title={
                          trendMode ===
                          "billing"
                            ? `${day.shortDate}: ${formatCurrency(value, "INR", 0)}`
                            : `${day.shortDate}: ${value} trips`
                        }
                      />

                    </div>


                    <span className="dashboard-trend-day">
                      {day.label}
                    </span>

                    <small>
                      {day.shortDate}
                    </small>

                  </div>
                );
              },
            )}

          </div>

        </Card>

      </section>


      {/* =================================================
          RECENT ACTIVITY
          ================================================= */}

      <section className="dashboard-activity-section">

        <Card className="dashboard-card dashboard-activity-card">

          <div className="dashboard-card-header">

            <div>
              <span className="dashboard-card-eyebrow">
                ACTIVITY
              </span>

              <h3>
                Recent Activity
              </h3>
            </div>

            <div className="dashboard-card-icon">
              <Clock3 size={17} />
            </div>

          </div>


          {recentActivity.length ===
          0 ? (

            <EmptyState
              icon={
                <Activity
                  size={21}
                />
              }
              title="No recent activity"
              text="New trips and payments will appear here."
            />

          ) : (

            <div className="dashboard-activity-list">

              {recentActivity.map(
                (item) => (
                  <div
                    key={
                      item.id
                    }
                    className="dashboard-activity-item"
                  >

                    <div
                      className={
                        item.type ===
                        "payment"
                          ? "dashboard-activity-icon dashboard-payment-icon"
                          : "dashboard-activity-icon"
                      }
                    >
                      {item.type ===
                      "payment" ? (
                        <IndianRupee
                          size={16}
                        />
                      ) : (
                        <Truck
                          size={16}
                        />
                      )}
                    </div>


                    <div className="dashboard-activity-content">

                      <strong>
                        {
                          item.title
                        }
                      </strong>

                      <span>
                        {item.name}
                        {" • "}
                        {
                          item.detail
                        }
                      </span>

                    </div>


                    <div className="dashboard-activity-meta">

                      {item.amount >
                        0 && (
                        <strong>
                          {formatCurrency(
                            item.amount,
                            "INR",
                            0,
                          )}
                        </strong>
                      )}

                      <span>
                        {formatDate(
                          item.date,
                        )}

                        {formatTime(
                          item.date,
                        ) &&
                          ` • ${formatTime(item.date)}`}
                      </span>

                    </div>

                  </div>
                ),
              )}

            </div>

          )}

        </Card>

      </section>


      {/* =================================================
          RECENT TRIPS + RECENT PAYMENTS
          ================================================= */}

      <section className="dashboard-main-grid">


        {/* RECENT TRIPS */}

        <Card className="dashboard-card dashboard-recent-card">

          <div className="dashboard-card-header">

            <div>
              <span className="dashboard-card-eyebrow">
                RECENT WORK
              </span>

              <h3>
                Recent Trips
              </h3>
            </div>

            <button
              type="button"
              className="dashboard-view-all"
              onClick={() =>
                handleNavigate(
                  "records",
                )
              }
            >
              View all
              <ArrowRight
                size={15}
              />
            </button>

          </div>


          {recentTrips.length ===
          0 ? (

            <EmptyState
              icon={
                <Truck
                  size={21}
                />
              }
              title="No trips recorded yet"
              text="Your latest transport work will appear here."
              buttonText="Add Trip"
              onAction={() =>
                handleNavigate(
                  "add-trip",
                )
              }
            />

          ) : (

            <div className="dashboard-list">

              {recentTrips.map(
                (
                  trip,
                  index,
                ) => {
                  const tripType =
                    getTripType(
                      trip,
                    );

                  return (
                    <div
                      key={
                        trip?.id ||
                        `${trip?.date}-${index}`
                      }
                      className="dashboard-list-item"
                    >

                      <div className="dashboard-list-icon">
                        <Truck
                          size={17}
                        />
                      </div>


                      <div className="dashboard-list-content">

                        <strong>
                          {getTripPartyName(
                            trip,
                          )}
                        </strong>

                        <span>
                          {getTripMaterialName(
                            trip,
                          )}
                        </span>

                      </div>


                      <div className="dashboard-list-details">

                        <span>
                          {getTripVehicleNumber(
                            trip,
                          ) ||
                            "Vehicle"}
                        </span>

                        <span>
                          {trip?.quantity
                            ? `${trip.quantity} ${trip.unit || ""}`
                            : "Trip"}
                        </span>

                      </div>


                      <div className="dashboard-list-meta">

                        <div className="dashboard-list-actions">
                          <StatusBadge
                            status={
                              tripType
                            }
                            label={
                              tripType ||
                              "Unknown"
                            }
                            size="small"
                          />

                          {/* WHATSAPP SHARE BUTTON */}
                          <button
                            type="button"
                            className="dashboard-whatsapp-btn"
                            onClick={() => handleWhatsAppShare(trip)}
                            aria-label="Share trip details on WhatsApp"
                            title="Share on WhatsApp"
                          >
                            <MessageCircle size={15} />
                          </button>
                        </div>

                        <span>
                          {formatDate(
                            trip?.date,
                          )}
                        </span>

                      </div>

                    </div>
                  );
                },
              )}

            </div>

          )}

        </Card>


        {/* RECENT PAYMENTS */}

        <Card className="dashboard-card dashboard-recent-card">

          <div className="dashboard-card-header">

            <div>
              <span className="dashboard-card-eyebrow">
                COLLECTIONS
              </span>

              <h3>
                Recent Payments
              </h3>
            </div>

            <button
              type="button"
              className="dashboard-view-all"
              onClick={() =>
                handleNavigate(
                  "payments",
                )
              }
            >
              View all
              <ArrowRight
                size={15}
              />
            </button>

          </div>


          {recentPayments.length ===
          0 ? (

            <EmptyState
              icon={
                <ReceiptText
                  size={21}
                />
              }
              title="No payments recorded yet"
              text="Recent collections will appear here."
              buttonText="Record Payment"
              onAction={() =>
                handleNavigate(
                  "payments",
                )
              }
            />

          ) : (

            <div className="dashboard-list">

              {recentPayments.map(
                (
                  payment,
                  index,
                ) => (
                  <div
                    key={
                      payment?.id ||
                      `${payment?.date}-${index}`
                    }
                    className="dashboard-list-item"
                  >

                    <div className="dashboard-list-icon dashboard-payment-icon">
                      <IndianRupee
                        size={17}
                      />
                    </div>


                    <div className="dashboard-list-content">

                      <strong>
                        {payment?.partyName ||
                          "Unknown Party"}
                      </strong>

                      <span>
                        {payment?.paymentMode ||
                          "Payment"}

                        {payment?.referenceNo
                          ? ` • ${payment.referenceNo}`
                          : ""}
                      </span>

                    </div>


                    <div className="dashboard-list-meta">

                      <strong className="dashboard-payment-amount">
                        {formatCurrency(
                          payment?.amount,
                          "INR",
                          0,
                        )}
                      </strong>

                      <span>
                        {formatDate(
                          payment?.date,
                        )}
                      </span>

                    </div>

                  </div>
                ),
              )}

            </div>

          )}

        </Card>

      </section>


      {/* =================================================
          FLEET + FINANCIAL
          ================================================= */}

      <section className="dashboard-lower-grid">


        {/* TOP FLEET */}

        <Card className="dashboard-card">

          <div className="dashboard-card-header">

            <div>
              <span className="dashboard-card-eyebrow">
                FLEET PERFORMANCE
              </span>

              <h3>
                Top Performing Fleet
              </h3>
            </div>

            <button
              type="button"
              className="dashboard-view-all"
              onClick={() =>
                handleNavigate(
                  "tractors",
                )
              }
            >
              View all
              <ArrowRight
                size={15}
              />
            </button>

          </div>


          {tractorSummary.length ===
          0 ? (

            <EmptyState
              icon={
                <Tractor
                  size={21}
                />
              }
              title="No tractor activity"
              text="Trip activity by tractor will appear here."
            />

          ) : (

            <div className="dashboard-tractor-list">

              {tractorSummary.map(
                (tractor) => (
                  <div
                    key={
                      tractor.vehicle
                    }
                    className="dashboard-tractor-row"
                  >

                    <div className="dashboard-tractor-main">

                      <div className="dashboard-list-icon">
                        <Tractor
                          size={16}
                        />
                      </div>

                      <div>
                        <strong>
                          {
                            tractor.vehicle
                          }
                        </strong>

                        <span>
                          {
                            tractor.driver
                          }
                        </span>
                      </div>

                    </div>


                    <div className="dashboard-tractor-stat">
                      <strong>
                        {
                          tractor.totalTrips
                        }
                      </strong>

                      <span>
                        Trips
                      </span>
                    </div>


                    <div className="dashboard-tractor-breakdown">

                      <span>
                        L{" "}
                        {
                          tractor.loading
                        }
                      </span>

                      <span>
                        U{" "}
                        {
                          tractor.unloading
                        }
                      </span>

                      <span>
                        S{" "}
                        {
                          tractor.siteToSite
                        }
                      </span>

                    </div>


                    <div className="dashboard-tractor-billing">

                      <strong>
                        {formatCurrency(
                          tractor.billing,
                          "INR",
                          0,
                        )}
                      </strong>

                      <span>
                        Billing
                      </span>

                    </div>

                  </div>
                ),
              )}

            </div>

          )}

        </Card>


        {/* FINANCIAL OVERVIEW */}

        <Card className="dashboard-card dashboard-financial-overview">

          <div className="dashboard-card-header">

            <div>
              <span className="dashboard-card-eyebrow">
                FINANCIAL OVERVIEW
              </span>

              <h3>
                Business Collections
              </h3>
            </div>

            <div className="dashboard-card-icon">
              <TrendingUp
                size={17}
              />
            </div>

          </div>


          <div className="dashboard-financial-list">

            <div>
              <span>
                Total Billing
              </span>

              <strong>
                {formatCurrency(
                  totalBilling,
                  "INR",
                  0,
                )}
              </strong>
            </div>


            <div>
              <span>
                Total Received
              </span>

              <strong>
                {formatCurrency(
                  totalReceived,
                  "INR",
                  0,
                )}
              </strong>
            </div>


            <div>
              <span>
                Outstanding
              </span>

              <strong className="dashboard-financial-due">
                {formatCurrency(
                  outstanding,
                  "INR",
                  0,
                )}
              </strong>
            </div>

          </div>


          <div className="dashboard-collection-progress">

            <div className="dashboard-collection-progress-header">

              <span>
                Collection Progress
              </span>

              <strong>
                {collectionPercentage.toFixed(
                  1,
                )}
                %
              </strong>

            </div>


            <div className="dashboard-progress-track">

              <div
                className="dashboard-progress-fill"
                style={{
                  width: `${collectionPercentage}%`,
                }}
              />

            </div>


            <span className="dashboard-collection-note">
              Received ÷ Total Billing
            </span>

          </div>

        </Card>

      </section>


      {/* =================================================
          OUTSTANDING PARTIES
          ================================================= */}

      <section className="dashboard-outstanding-section">

        <Card className="dashboard-card dashboard-outstanding-card">

          <div className="dashboard-card-header">

            <div>
              <span className="dashboard-card-eyebrow">
                RECEIVABLES
              </span>

              <h3>
                Outstanding Parties
              </h3>
            </div>

            <button
              type="button"
              className="dashboard-view-all"
              onClick={() =>
                handleNavigate(
                  "billing",
                )
              }
            >
              View all
              <ArrowRight
                size={15}
              />
            </button>

          </div>


          {outstandingParties.length ===
          0 ? (

            <EmptyState
              icon={
                <WalletCards
                  size={21}
                />
              }
              title="No outstanding dues"
              text="All party balances are currently clear."
            />

          ) : (

            <div className="dashboard-outstanding-list">

              {outstandingParties
                .slice(0, 5)
                .map((party) => (
                  <div
                    key={
                      party.partyName
                    }
                    className="dashboard-outstanding-item"
                  >

                    <div>
                      <strong>
                        {
                          party.partyName
                        }
                      </strong>

                      <span>
                        {
                          party.tripCount
                        }{" "}
                        {party.tripCount ===
                        1
                          ? "trip"
                          : "trips"}
                      </span>
                    </div>


                    <div className="dashboard-outstanding-right">

                      <strong className="dashboard-due-amount">
                        {formatCurrency(
                          party.outstanding,
                          "INR",
                          0,
                        )}
                      </strong>

                      <span>
                        Due
                      </span>

                    </div>

                  </div>
                ))}

            </div>

          )}

        </Card>

      </section>


      {/* =================================================
          STAFF SUMMARY
          ================================================= */}

      <section className="dashboard-staff-section">

        <Card className="dashboard-card">

          <div className="dashboard-card-header">

            <div>
              <span className="dashboard-card-eyebrow">
                STAFF
              </span>

              <h3>
                Staff Summary
              </h3>
            </div>

            <button
              type="button"
              className="dashboard-view-all"
              onClick={() =>
                handleNavigate(
                  "staff",
                )
              }
            >
              Manage staff
              <ArrowRight
                size={15}
              />
            </button>

          </div>


          {safeStaff.length ===
          0 ? (

            <EmptyState
              icon={
                <Users size={21} />
              }
              title="No staff records"
              text="Add staff members to track salary and attendance."
              buttonText="Staff"
              onAction={() =>
                handleNavigate(
                  "staff",
                )
              }
            />

          ) : (

            <div className="dashboard-staff-grid">

              <div>
                <span>
                  Total Staff
                </span>

                <strong>
                  {safeStaff.length}
                </strong>
              </div>


              <div>
                <span>
                  Active Staff
                </span>

                <strong>
                  {activeStaff.length}
                </strong>
              </div>


              <div>
                <span>
                  Attendance Records
                </span>

                <strong>
                  {safeAttendance.length}
                </strong>
              </div>


              <div>
                <span>
                  Salary Paid
                </span>

                <strong>
                  {formatCurrency(
                    staffSalarySummary.paid,
                    "INR",
                    0,
                  )}
                </strong>
              </div>


              <div>
                <span>
                  Advance
                </span>

                <strong>
                  {formatCurrency(
                    staffSalarySummary.advance,
                    "INR",
                    0,
                  )}
                </strong>
              </div>


              <div>
                <span>
                  Salary Balance
                </span>

                <strong>
                  {formatCurrency(
                    staffSalarySummary.balance,
                    "INR",
                    0,
                  )}
                </strong>
              </div>

            </div>

          )}

        </Card>

      </section>


      {/* =================================================
          FINAL SUMMARY
          ================================================= */}

      <section className="dashboard-final-summary">

        <div>
          <Package size={17} />

          <span>
            Materials
          </span>

          <strong>
            {safeMaterials.length}
          </strong>
        </div>


        <div>
          <Truck size={17} />

          <span>
            Active Fleet
          </span>

          <strong>
            {activeTractors.length}
          </strong>
        </div>


        <div>
          <Users size={17} />

          <span>
            Active Parties
          </span>

          <strong>
            {activeParties.length}
          </strong>
        </div>


        <div>
          <IndianRupee size={17} />

          <span>
            Total Received
          </span>

          <strong>
            {formatCurrency(
              totalReceived,
              "INR",
              0,
            )}
          </strong>
        </div>

      </section>

    </div>
  );
}


export default Dashboard;