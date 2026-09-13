import {
  Moon,
  Sparkles,
  Sun,
  SunMedium,
  Sunrise,
  Sunset,
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
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

import { useAppData } from "../../context/AppDataContext";

import {
  calculateTotalBilling,
  calculateTotalReceived,
  calculateOutstanding,
  calculateTripSummary,
  calculatePartySummary,
} from "../../utils/calculations";

import { formatCurrency } from "../../utils/currency";
import { formatDate, getTodayISO } from "../../utils/date";
import { getTripType } from "../../utils/trip";

import StatCard from "../../components/ui/StatCard";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import StatusBadge from "../../components/ui/StatusBadge";

import "./Dashboard.css";

/* =========================================================
   HELPERS (unchanged — same business logic)
   ========================================================= */

function getDateValue(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
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
    trip?.vehicleNumber || trip?.tractorNumber || trip?.vehicleNo || ""
  );
}

function getTripAmount(trip) {
  const directAmount = Number(trip?.amount || 0);
  if (directAmount > 0) return directAmount;

  const quantity = Number(trip?.quantity || 0);
  const rate = Number(trip?.rate || 0);

  return quantity > 0 && rate > 0 ? quantity * rate : 0;
}

function isActive(item) {
  const status = String(item?.status || "").toLowerCase();
  return status !== "inactive";
}

function getTripPartyName(trip) {
  return trip?.partyName || trip?.party || "Unassigned Party";
}

function getTripMaterialName(trip) {
  return trip?.materialName || trip?.material || "Material not specified";
}

function getTripDateValue(trip) {
  return trip?.createdAt || trip?.updatedAt || trip?.date || "";
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getTimeGreeting(hour) {
  if (hour >= 5 && hour < 7) return { text: "Good Morning", icon: Sunrise };
  if (hour >= 7 && hour < 11) return { text: "Good Morning", icon: Sun };
  if (hour >= 11 && hour < 17) return { text: "Good Afternoon", icon: SunMedium };
  if (hour >= 17 && hour < 19) return { text: "Good Evening", icon: Sunset };
  if (hour >= 19 && hour < 22) return { text: "Good Evening", icon: Moon };
  return { text: "Good Night", icon: Sparkles };
}

/* =========================================================
   SMALL UI COMPONENTS
   ========================================================= */

function SectionHeader({ eyebrow, title, description, actionText, onAction, id }) {
  return (
    <div className="dash-sec-head">
      <div className="dash-sec-head__main">
        {eyebrow && <span className="dash-eyebrow">{eyebrow}</span>}
        <h2 id={id} className="dash-sec-head__title">
          {title}
        </h2>
        {description && <p className="dash-sec-head__desc">{description}</p>}
      </div>

      {actionText && onAction && (
        <button
          type="button"
          className="dash-link-btn"
          onClick={onAction}
        >
          <span>{actionText}</span>
          <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function EmptyState({ icon, title, text, buttonText, onAction }) {
  return (
    <div className="dash-empty">
      <div className="dash-empty__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="dash-empty__body">
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
      {buttonText && onAction && (
        <Button variant="secondary" size="small" onClick={onAction}>
          {buttonText}
        </Button>
      )}
    </div>
  );
}

function TrendChart({ days, mode, max, onFormatValue }) {
  const modeLabel = mode === "trips" ? "trip count" : "billing amount";
  const todayIndex = days.length - 1;

  return (
    <div
      className="dash-trend__chart"
      role="img"
      aria-label={`7-day trend chart showing ${modeLabel} for each day`}
    >
      {days.map((day, i) => {
        const value = mode === "trips" ? day.trips : day.billing;
        const height = value > 0 ? Math.max((value / max) * 100, 6) : 3;
        const display = mode === "billing" ? onFormatValue(value) : value;
        const isToday = i === todayIndex;

        return (
          <div
            key={day.date}
            className={`dash-trend__col ${isToday ? "is-today" : ""}`}
          >
            <div className="dash-trend__value" aria-hidden="true">
              {display}
            </div>

            <div className="dash-trend__bar-wrap">
              <div
                className="dash-trend__bar"
                style={{ height: `${height}%` }}
              >
                <span className="dash-trend__bar-glow" />
              </div>
            </div>

            <span className="dash-trend__day" aria-hidden="true">
              {day.label}
            </span>
            <small className="dash-trend__date" aria-hidden="true">
              {day.shortDate}
            </small>
          </div>
        );
      })}
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

  const safeTrips = Array.isArray(trips) ? trips : [];
  const safePayments = Array.isArray(payments) ? payments : [];
  const safeParties = Array.isArray(parties) ? parties : [];
  const safeTractors = Array.isArray(tractors) ? tractors : [];
  const safeMaterials = Array.isArray(materials) ? materials : [];
  const safeStaff = Array.isArray(staff) ? staff : [];
  const safeAttendance = Array.isArray(staffAttendance) ? staffAttendance : [];
  const safeSalaryPayments = Array.isArray(staffSalaryPayments) ? staffSalaryPayments : [];

  /* ---- Live header ---- */
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState({
    city: "Ranchi",
    state: "Jharkhand",
    country: "India",
    loading: false,
  });
  const [trendMode, setTrendMode] = useState("trips");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    setLocation((p) => ({ ...p, loading: true }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
            { headers: { Accept: "application/json" } },
          );
          if (!response.ok) throw new Error();
          const data = await response.json();
          const address = data?.address || {};
          setLocation({
            city:
              address?.city ||
              address?.town ||
              address?.village ||
              address?.municipality ||
              "Ranchi",
            state: address?.state || "Jharkhand",
            country: address?.country || "India",
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
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }, []);

  const currentHour = currentTime.getHours();
  const timeGreeting = getTimeGreeting(currentHour);
  const greeting = timeGreeting.text;
  const GreetingIcon = timeGreeting.icon;

  const formattedTime = currentTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const formattedHeaderDate = currentTime.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const locationText = location.loading
    ? "Detecting location…"
    : `${location.city}, ${location.state}`;

  const today = getTodayISO();

  /* ---- Business calculations ---- */
  const activeTractors = useMemo(() => safeTractors.filter(isActive), [safeTractors]);
  const activeParties = useMemo(() => safeParties.filter(isActive), [safeParties]);
  const activeStaff = useMemo(() => safeStaff.filter(isActive), [safeStaff]);

  const todayTrips = useMemo(
    () => safeTrips.filter((trip) => trip?.date === today),
    [safeTrips, today],
  );
  const todayPayments = useMemo(
    () => safePayments.filter((payment) => payment?.date === today),
    [safePayments, today],
  );

  const totalBilling = calculateTotalBilling(safeTrips);
  const totalReceived = calculateTotalReceived(safePayments);
  const outstanding = calculateOutstanding(totalBilling, totalReceived);
  const todayBilling = calculateTotalBilling(todayTrips);
  const todayReceived = calculateTotalReceived(todayPayments);

  const todayTripSummary = calculateTripSummary(todayTrips);
  const todayLoading = todayTripSummary?.loading ?? 0;
  const todayUnloading = todayTripSummary?.unloading ?? 0;
  const todaySiteToSite =
    todayTripSummary?.siteToSite ?? todayTripSummary?.site_to_site ?? 0;

  const todayUniqueVehicles = useMemo(() => {
    const s = new Set(
      todayTrips.map(getTripVehicleNumber).map(normalizeName).filter(Boolean),
    );
    return s.size;
  }, [todayTrips]);

  const todayUniqueParties = useMemo(() => {
    const s = new Set(
      todayTrips.map(getTripPartyName).map(normalizeName).filter(Boolean),
    );
    return s.size;
  }, [todayTrips]);

  const todayUniqueMaterials = useMemo(() => {
    const s = new Set(
      todayTrips.map(getTripMaterialName).map(normalizeName).filter(Boolean),
    );
    return s.size;
  }, [todayTrips]);

  const todayPartySummary = useMemo(() => {
    const grouped = new Map();
    todayTrips.forEach((trip) => {
      const partyName = getTripPartyName(trip);
      const key = normalizeName(partyName);
      if (!key) return;
      if (!grouped.has(key)) grouped.set(key, { partyName, trips: 0, billing: 0 });
      const current = grouped.get(key);
      current.trips += 1;
      current.billing += getTripAmount(trip);
    });
    return Array.from(grouped.values()).sort((a, b) => {
      if (b.trips !== a.trips) return b.trips - a.trips;
      return b.billing - a.billing;
    });
  }, [todayTrips]);

  const todayTractorSummary = useMemo(() => {
    const grouped = new Map();
    todayTrips.forEach((trip) => {
      const vehicle = getTripVehicleNumber(trip);
      const displayVehicle = vehicle || "Vehicle not specified";
      const key = normalizeName(displayVehicle);
      if (!key) return;
      if (!grouped.has(key)) grouped.set(key, { vehicle: displayVehicle, trips: 0, billing: 0 });
      const current = grouped.get(key);
      current.trips += 1;
      current.billing += getTripAmount(trip);
    });
    return Array.from(grouped.values()).sort((a, b) => {
      if (b.trips !== a.trips) return b.trips - a.trips;
      return b.billing - a.billing;
    });
  }, [todayTrips]);

  const outstandingParties = useMemo(() => {
    return safeParties
      .map((party) =>
        calculatePartySummary(party?.partyName || party?.name || "", safeTrips, safePayments),
      )
      .filter((party) => Number(party?.outstanding || 0) > 0)
      .sort((a, b) => Number(b?.outstanding || 0) - Number(a?.outstanding || 0));
  }, [safeParties, safeTrips, safePayments]);

  const idleTractors = useMemo(() => {
    const todayVehicleNames = new Set(
      todayTrips.map(getTripVehicleNumber).map(normalizeName).filter(Boolean),
    );
    return activeTractors.filter((tractor) => {
      const vehicle = normalizeName(getVehicleNumber(tractor));
      return vehicle && !todayVehicleNames.has(vehicle);
    });
  }, [activeTractors, todayTrips]);

  const smartReminders = useMemo(() => {
    const reminders = [];
    outstandingParties
      .filter((p) => p.outstanding > 50000)
      .slice(0, 3)
      .forEach((party) => {
        reminders.push({
          id: `due-${party.partyName}`,
          message: `${party.partyName} has ${formatCurrency(party.outstanding, "INR", 0)} due`,
          severity: "high",
          action: "billing",
          label: "Payment due",
        });
      });

    idleTractors.slice(0, 2).forEach((tractor) => {
      const vehicle = tractor.vehicleNumber || tractor.name || "Tractor";
      reminders.push({
        id: `idle-${vehicle}`,
        message: `${vehicle} has no trip today`,
        severity: "medium",
        action: "tractors",
        label: "Idle fleet",
      });
    });

    return reminders;
  }, [outstandingParties, idleTractors]);

  const recentTrips = useMemo(
    () =>
      [...safeTrips]
        .sort(
          (a, b) =>
            getDateValue(getTripDateValue(b)) - getDateValue(getTripDateValue(a)),
        )
        .slice(0, 6),
    [safeTrips],
  );

  const recentPayments = useMemo(
    () =>
      [...safePayments]
        .sort(
          (a, b) =>
            getDateValue(b?.createdAt || b?.date) -
            getDateValue(a?.createdAt || a?.date),
        )
        .slice(0, 6),
    [safePayments],
  );

  const tractorSummary = useMemo(() => {
    return activeTractors
      .map((tractor) => {
        const vehicle = getVehicleNumber(tractor);
        const tractorTrips = safeTrips.filter(
          (trip) =>
            normalizeName(getTripVehicleNumber(trip)) === normalizeName(vehicle),
        );

        let loading = 0;
        let unloading = 0;
        let siteToSite = 0;

        tractorTrips.forEach((trip) => {
          const type = getTripType(trip);
          if (type === "Loading") loading += 1;
          else if (type === "Unloading") unloading += 1;
          else if (type === "Site to Site") siteToSite += 1;
        });

        const billing = tractorTrips.reduce(
          (sum, trip) => sum + getTripAmount(trip),
          0,
        );

        return {
          vehicle,
          driver: tractor?.driverName || "Driver not assigned",
          totalTrips: tractorTrips.length,
          loading,
          unloading,
          siteToSite,
          billing,
        };
      })
      .filter((t) => t.totalTrips > 0)
      .sort((a, b) => (b.billing !== a.billing ? b.billing - a.billing : b.totalTrips - a.totalTrips))
      .slice(0, 5);
  }, [activeTractors, safeTrips]);

  const staffSalarySummary = useMemo(() => {
    if (!safeStaff.length) return { gross: 0, advance: 0, paid: 0, balance: 0 };

    let gross = 0;
    let advance = 0;
    let paid = 0;

    safeStaff.forEach((member) => {
      const salary = Number(
        member?.salary || member?.monthlySalary || member?.dailySalary || 0,
      );
      const memberPayments = safeSalaryPayments.filter(
        (payment) =>
          normalizeName(payment?.staffName) ===
          normalizeName(member?.name || member?.staffName),
      );
      const memberPaid = memberPayments.reduce(
        (sum, payment) => sum + Number(payment?.amount || 0),
        0,
      );
      gross += salary;
      paid += memberPaid;
      advance += Number(member?.advance || 0);
    });

    return {
      gross,
      advance,
      paid,
      balance: Math.max(gross + advance - paid, 0),
    };
  }, [safeStaff, safeSalaryPayments]);

  const collectionPercentage =
    totalBilling > 0
      ? Math.min(Math.max((totalReceived / totalBilling) * 100, 0), 100)
      : 0;

  const lastSevenDays = useMemo(() => {
    const days = [];
    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - index);
      const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const dayTrips = safeTrips.filter((trip) => trip?.date === isoDate);
      const billing = calculateTotalBilling(dayTrips);
      days.push({
        date: isoDate,
        label: date.toLocaleDateString("en-IN", { weekday: "short" }),
        shortDate: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        trips: dayTrips.length,
        billing,
      });
    }
    return days;
  }, [safeTrips]);

  const trendMax = useMemo(() => {
    const values = lastSevenDays.map((day) =>
      trendMode === "trips" ? day.trips : day.billing,
    );
    return Math.max(...values, 1);
  }, [lastSevenDays, trendMode]);

  /* ---- Handlers (unchanged) ---- */
  const handleExportReport = () => {
    const headers = ["Date", "Trips", "Billing (INR)"];
    const rows = lastSevenDays.map((day) => [
      day.shortDate,
      day.trips,
      day.billing.toFixed(2),
    ]);
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `business-report-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleWhatsAppShare = (trip) => {
    const message =
      `🚜 *Trip Details*%0A%0A` +
      `📋 Trip Type: ${getTripType(trip) || "Trip"}%0A` +
      `👤 Party: ${getTripPartyName(trip)}%0A` +
      `📦 Material: ${getTripMaterialName(trip)}%0A` +
      `🚜 Vehicle: ${getTripVehicleNumber(trip) || "N/A"}%0A` +
      `💰 Amount: ${formatCurrency(getTripAmount(trip), "INR", 0)}%0A` +
      `📅 Date: ${formatDate(trip?.date) || "Today"}%0A%0A` +
      `---%0A` +
      `SAO AUTO TRACTOR`;

    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const recentActivity = useMemo(() => {
    const tripActivities = safeTrips.map((trip) => ({
      id: `trip-${trip?.id || getTripDateValue(trip)}`,
      type: "trip",
      date: getTripDateValue(trip),
      title: "Trip added",
      name: getTripPartyName(trip),
      detail: `${getTripMaterialName(trip)} • ${getTripVehicleNumber(trip) || "Vehicle not specified"}`,
      amount: getTripAmount(trip),
    }));

    const paymentActivities = safePayments.map((payment) => ({
      id: `payment-${payment?.id || payment?.createdAt || payment?.date}`,
      type: "payment",
      date: payment?.createdAt || payment?.date,
      title: "Payment received",
      name: payment?.partyName || "Unknown Party",
      detail: payment?.paymentMode || "Payment",
      amount: Number(payment?.amount || 0),
    }));

    return [...tripActivities, ...paymentActivities]
      .sort((a, b) => getDateValue(b.date) - getDateValue(a.date))
      .slice(0, 6);
  }, [safeTrips, safePayments]);

  const handleNavigate = (page) => onNavigate?.(page);

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="dash">
      {/* ============ SKIP for a11y ============ */}
      {/* Already handled globally in App.jsx */}

      {/* =============================================
          HERO — Executive command center
          ============================================= */}
      <section className="dash-hero" aria-label="Welcome overview">
        <div className="dash-hero__bg" aria-hidden="true">
          <span className="dash-hero__orb dash-hero__orb--1" />
          <span className="dash-hero__orb dash-hero__orb--2" />
          <span className="dash-hero__grid" />
        </div>

        <div className="dash-hero__inner">
          {/* Left: greeting */}
          <div className="dash-hero__left">
            <span className="dash-hero__eyebrow">
              <span className="dash-hero__dot" aria-hidden="true" />
              BUSINESS OVERVIEW
            </span>

            <h1 className="dash-hero__title">
              <span className="dash-hero__greet">
                <GreetingIcon
                  className="dash-hero__greet-icon"
                  size={32}
                  strokeWidth={1.6}
                  aria-hidden="true"
                />
                <span>{greeting}</span>
              </span>
              <span className="dash-hero__sub">
                Welcome back to <em>SAO AUTO TRACTOR</em>
              </span>
            </h1>

            <p className="dash-hero__lede">
              Here's a live snapshot of your transport business — trips,
              fleet, parties and collections at a glance.
            </p>

            <div className="dash-hero__meta">
              <span className="dash-hero__chip">
                <CalendarDays size={14} strokeWidth={1.9} aria-hidden="true" />
                {formattedHeaderDate}
              </span>
              <span className="dash-hero__chip" aria-live="polite">
                <Activity size={14} strokeWidth={1.9} aria-hidden="true" />
                {formattedTime}
              </span>
              <span className="dash-hero__chip">
                <MapPin size={14} strokeWidth={1.9} aria-hidden="true" />
                {locationText}
              </span>
            </div>
          </div>

          {/* Right: CTA */}
          <div className="dash-hero__right">
            <Button
              variant="primary"
              icon={<Plus size={16} strokeWidth={2.2} aria-hidden="true" />}
              onClick={() => handleNavigate("add-trip")}
            >
              Add New Trip
            </Button>
          </div>
        </div>
      </section>

      {/* =============================================
          KPI RAIL — featured metric cards
          ============================================= */}
      <section
        className="dash-kpis"
        aria-label="Today's primary business metrics"
        aria-live="polite"
      >
        <StatCard
          label="Today's Trips"
          value={todayTrips.length}
          icon={<Activity size={18} strokeWidth={1.9} aria-hidden="true" />}
          accent="primary"
        />
        <StatCard
          label="Today's Billing"
          value={todayBilling}
          icon={<IndianRupee size={18} strokeWidth={1.9} aria-hidden="true" />}
          format="currency"
          accent="brass"
        />
        <StatCard
          label="Received Today"
          value={todayReceived}
          icon={<ArrowDownToLine size={18} strokeWidth={1.9} aria-hidden="true" />}
          format="currency"
          accent="success"
        />
        <StatCard
          label="Outstanding"
          value={outstanding}
          icon={<ArrowUpFromLine size={18} strokeWidth={1.9} aria-hidden="true" />}
          format="currency"
          accent="danger"
        />
      </section>

      {/* =============================================
          TODAY SNAPSHOT
          ============================================= */}
      <section aria-labelledby="today-overview-title">
        <SectionHeader
          id="today-overview-title"
          eyebrow="TODAY'S OVERVIEW"
          title="Today's Business"
          description="A complete snapshot of today's transport activity."
        />

        <Card className="dash-today">
          <div className="dash-today__grid">
            {[
              { icon: <Activity size={16} strokeWidth={2} aria-hidden="true" />, label: "Trips", value: todayTrips.length, primary: true },
              { icon: <Tractor size={16} strokeWidth={2} aria-hidden="true" />, label: "Tractors", value: todayUniqueVehicles },
              { icon: <Users size={16} strokeWidth={2} aria-hidden="true" />, label: "Parties", value: todayUniqueParties },
              { icon: <Package size={16} strokeWidth={2} aria-hidden="true" />, label: "Materials", value: todayUniqueMaterials },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`dash-today__stat ${stat.primary ? "is-primary" : ""}`}
              >
                <div className="dash-today__icon" aria-hidden="true">
                  {stat.icon}
                </div>
                <div className="dash-today__body">
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="dash-today__financial">
            <div className="dash-today__fin-item">
              <span className="dash-today__fin-label">Billing</span>
              <strong className="dash-today__fin-value">
                {formatCurrency(todayBilling, "INR", 0)}
              </strong>
            </div>
            <div className="dash-today__fin-divider" aria-hidden="true" />
            <div className="dash-today__fin-item">
              <span className="dash-today__fin-label">Received</span>
              <strong className="dash-today__fin-value dash-today__fin-value--ok">
                {formatCurrency(todayReceived, "INR", 0)}
              </strong>
            </div>
          </div>

          <div className="dash-today__breakdown">
            {[
              { label: "Loading", value: todayLoading, tone: "loading" },
              { label: "Unloading", value: todayUnloading, tone: "unloading" },
              { label: "Site to Site", value: todaySiteToSite, tone: "site" },
            ].map((b) => (
              <div key={b.label} className="dash-today__chip">
                <span className="dash-today__chip-label">{b.label}</span>
                <strong className="dash-today__chip-value">{b.value}</strong>
              </div>
            ))}
          </div>

          <footer className="dash-today__footer">
            <button
              type="button"
              className="dash-today__cta"
              onClick={() => handleNavigate("datewise")}
            >
              <span>Open today's work report</span>
              <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </footer>
        </Card>
      </section>

      {/* =============================================
          TODAY'S OPERATIONS
          ============================================= */}
      <section aria-labelledby="today-ops-title">
        <SectionHeader
          id="today-ops-title"
          eyebrow="TODAY'S OPERATIONS"
          title="What Happened Today"
          description="Today's work by trip type, party and tractor."
          actionText="View report"
          onAction={() => handleNavigate("datewise")}
        />

        <Card className="dash-ops">
          {/* Trip type ribbon */}
          <div className="dash-ops__types">
            <div className="dash-ops__types-head">
              <div className="dash-ops__types-icon" aria-hidden="true">
                <BarChart3 size={16} strokeWidth={2} />
              </div>
              <div>
                <span className="dash-eyebrow">TRIP TYPE</span>
                <h3 className="dash-ops__types-title">
                  Today's Work Breakdown
                </h3>
              </div>
            </div>

            <div className="dash-ops__types-grid">
              {[
                { icon: <ArrowDownToLine size={18} strokeWidth={2} aria-hidden="true" />, label: "Loading", value: todayLoading, tone: "loading" },
                { icon: <ArrowUpFromLine size={18} strokeWidth={2} aria-hidden="true" />, label: "Unloading", value: todayUnloading, tone: "unloading" },
                { icon: <Truck size={18} strokeWidth={2} aria-hidden="true" />, label: "Site to Site", value: todaySiteToSite, tone: "site" },
              ].map((t) => (
                <div key={t.label} className={`dash-ops__type is-${t.tone}`}>
                  <div className="dash-ops__type-icon" aria-hidden="true">
                    {t.icon}
                  </div>
                  <div className="dash-ops__type-body">
                    <span className="dash-ops__type-label">{t.label}</span>
                    <strong className="dash-ops__type-value">{t.value}</strong>
                    <small className="dash-ops__type-hint">trips today</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dash-ops__divider" aria-hidden="true" />

          <div className="dash-ops__columns">
            {[
              {
                eyebrow: "PARTY ACTIVITY",
                title: "Today's Party Trips",
                icon: <Users size={17} strokeWidth={1.9} aria-hidden="true" />,
                items: todayPartySummary.slice(0, 5),
                emptyIcon: <Users size={19} strokeWidth={1.9} aria-hidden="true" />,
                emptyText: "No party activity today",
                key: "partyName",
                avatarIcon: <Users size={14} strokeWidth={2} aria-hidden="true" />,
                moreLabel: "parties",
                total: todayPartySummary.length,
              },
              {
                eyebrow: "TRACTOR ACTIVITY",
                title: "Today's Tractor Trips",
                icon: <Tractor size={17} strokeWidth={1.9} aria-hidden="true" />,
                items: todayTractorSummary.slice(0, 5),
                emptyIcon: <Tractor size={19} strokeWidth={1.9} aria-hidden="true" />,
                emptyText: "No tractor activity today",
                key: "vehicle",
                avatarIcon: <Tractor size={14} strokeWidth={2} aria-hidden="true" />,
                moreLabel: "tractors",
                total: todayTractorSummary.length,
              },
            ].map((col) => (
              <div key={col.title} className="dash-ops__col">
                <div className="dash-ops__col-head">
                  <div>
                    <span className="dash-eyebrow">{col.eyebrow}</span>
                    <h3 className="dash-ops__col-title">{col.title}</h3>
                  </div>
                  {col.icon}
                </div>

                {col.items.length === 0 ? (
                  <div className="dash-ops__empty">
                    {col.emptyIcon}
                    <span>{col.emptyText}</span>
                  </div>
                ) : (
                  <ul className="dash-ops__list" role="list">
                    {col.items.map((item) => (
                      <li key={normalizeName(item[col.key])} className="dash-ops__row">
                        <div className="dash-ops__row-main">
                          <span className="dash-ops__avatar" aria-hidden="true">
                            {col.avatarIcon}
                          </span>
                          <div className="dash-ops__row-text">
                            <strong title={item[col.key]}>{item[col.key]}</strong>
                            <span>
                              {formatCurrency(item.billing, "INR", 0)} billing
                            </span>
                          </div>
                        </div>

                        <div className="dash-ops__row-value">
                          <strong>{item.trips}</strong>
                          <span>{item.trips === 1 ? "Trip" : "Trips"}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {col.total > 5 && (
                  <button
                    type="button"
                    className="dash-ops__more"
                    onClick={() => handleNavigate("datewise")}
                  >
                    <span>View all {col.total} {col.moreLabel}</span>
                    <ArrowRight size={13} strokeWidth={2.2} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <footer className="dash-ops__footer">
            <button
              type="button"
              className="dash-ops__footer-btn"
              onClick={() => handleNavigate("datewise")}
            >
              <span>Open complete today's work report</span>
              <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </footer>
        </Card>
      </section>

      {/* =============================================
          QUICK ACTIONS + ATTENTION
          ============================================= */}
      <section className="dash-split">
        {/* QUICK ACTIONS */}
        <Card className="dash-actions">
          <header className="dash-card-head">
            <div>
              <span className="dash-eyebrow">QUICK ACTIONS</span>
              <h3 className="dash-card-title">Common Tasks</h3>
            </div>
            <span className="dash-card-icon" aria-hidden="true">
              <Plus size={16} strokeWidth={2} />
            </span>
          </header>

          <div className="dash-actions__grid">
            {[
              { icon: <Plus size={16} strokeWidth={2.2} aria-hidden="true" />, title: "Add Trip", desc: "Record transport work", action: "add-trip", primary: true },
              { icon: <IndianRupee size={16} strokeWidth={2} aria-hidden="true" />, title: "Record Payment", desc: "Update collection", action: "payments" },
              { icon: <Users size={16} strokeWidth={2} aria-hidden="true" />, title: "Add Party", desc: "Create customer account", action: "parties" },
              { icon: <Tractor size={16} strokeWidth={2} aria-hidden="true" />, title: "Add Tractor", desc: "Manage fleet", action: "tractors" },
            ].map((action) => (
              <button
                key={action.title}
                type="button"
                className={`dash-action ${action.primary ? "is-primary" : ""}`}
                onClick={() => handleNavigate(action.action)}
              >
                <span className="dash-action__icon" aria-hidden="true">
                  {action.icon}
                </span>
                <span className="dash-action__text">
                  <strong>{action.title}</strong>
                  <small>{action.desc}</small>
                </span>
                <ArrowRight size={15} strokeWidth={2.2} aria-hidden="true" />
              </button>
            ))}
          </div>
        </Card>

        {/* ATTENTION */}
        <Card className="dash-attn">
          <header className="dash-card-head">
            <div>
              <span className="dash-eyebrow">ATTENTION REQUIRED</span>
              <h3 className="dash-card-title">Things to Check</h3>
            </div>
            <span className="dash-card-icon is-warn" aria-hidden="true">
              <AlertTriangle size={16} strokeWidth={2} />
            </span>
          </header>

          {outstandingParties.length === 0 && idleTractors.length === 0 ? (
            <div className="dash-attn__ok">
              <span className="dash-attn__ok-icon" aria-hidden="true">
                <CheckCircle2 size={20} strokeWidth={2} />
              </span>
              <div>
                <strong>Everything looks good</strong>
                <span>No immediate action required.</span>
              </div>
            </div>
          ) : (
            <ul className="dash-attn__list" role="list">
              {outstandingParties.length > 0 && (
                <li>
                  <button
                    type="button"
                    className="dash-attn__item"
                    onClick={() => handleNavigate("billing")}
                  >
                    <span className="dash-attn__icon is-danger" aria-hidden="true">
                      <WalletCards size={16} strokeWidth={2} />
                    </span>
                    <span className="dash-attn__body">
                      <strong>
                        {outstandingParties.length}{" "}
                        {outstandingParties.length === 1 ? "party has" : "parties have"}{" "}
                        outstanding dues
                      </strong>
                      <small>
                        {formatCurrency(outstanding, "INR", 0)} total outstanding
                      </small>
                    </span>
                    <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
                  </button>
                </li>
              )}

              {idleTractors.length > 0 && (
                <li>
                  <button
                    type="button"
                    className="dash-attn__item"
                    onClick={() => handleNavigate("tractors")}
                  >
                    <span className="dash-attn__icon is-warning" aria-hidden="true">
                      <Tractor size={16} strokeWidth={2} />
                    </span>
                    <span className="dash-attn__body">
                      <strong>
                        {idleTractors.length}{" "}
                        {idleTractors.length === 1 ? "tractor has" : "tractors have"}{" "}
                        no trip today
                      </strong>
                      <small>Check fleet availability</small>
                    </span>
                    <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
                  </button>
                </li>
              )}

              {outstandingParties.length > 0 && (
                <li>
                  <button
                    type="button"
                    className="dash-attn__item"
                    onClick={() => handleNavigate("billing")}
                  >
                    <span className="dash-attn__icon is-info" aria-hidden="true">
                      <CreditCard size={16} strokeWidth={2} />
                    </span>
                    <span className="dash-attn__body">
                      <strong>Payment follow-up required</strong>
                      <small>Review pending party collections</small>
                    </span>
                    <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
                  </button>
                </li>
              )}
            </ul>
          )}

          {smartReminders.length > 0 && (
            <div className="dash-rem">
              <div className="dash-rem__head">
                <Clock3 size={13} strokeWidth={2} aria-hidden="true" />
                <span>Smart Reminders</span>
              </div>
              <ul className="dash-rem__list" role="list">
                {smartReminders.map((reminder) => (
                  <li key={reminder.id}>
                    <button
                      type="button"
                      className="dash-rem__item"
                      onClick={() => handleNavigate(reminder.action)}
                    >
                      <span
                        className={`dash-rem__dot is-${reminder.severity}`}
                        aria-hidden="true"
                      />
                      <span className="sr-only">{reminder.label}: </span>
                      <span className="dash-rem__msg">{reminder.message}</span>
                      <ArrowRight
                        size={12}
                        strokeWidth={2.2}
                        className="dash-rem__arrow"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </section>

      {/* =============================================
          TREND
          ============================================= */}
      <section aria-labelledby="trend-title">
        <Card className="dash-trend">
          <header className="dash-card-head">
            <div>
              <span className="dash-eyebrow">BUSINESS TREND</span>
              <h3 id="trend-title" className="dash-card-title">
                Last 7 Days
              </h3>
              <p className="dash-card-desc">
                Track recent business activity at a glance.
              </p>
            </div>

            <div className="dash-trend__actions">
              <button
                type="button"
                className="dash-btn-ghost"
                onClick={handleExportReport}
                title="Export as CSV"
                aria-label="Export 7-day report as CSV"
              >
                <FileBarChart size={14} strokeWidth={2} aria-hidden="true" />
                <span>Export CSV</span>
              </button>

              <div
                className="dash-trend__toggle"
                role="group"
                aria-label="Trend metric"
              >
                <button
                  type="button"
                  className={trendMode === "trips" ? "is-active" : ""}
                  onClick={() => setTrendMode("trips")}
                  aria-pressed={trendMode === "trips"}
                >
                  Trips
                </button>
                <button
                  type="button"
                  className={trendMode === "billing" ? "is-active" : ""}
                  onClick={() => setTrendMode("billing")}
                  aria-pressed={trendMode === "billing"}
                >
                  Billing
                </button>
              </div>
            </div>
          </header>

          <TrendChart
            days={lastSevenDays}
            mode={trendMode}
            max={trendMax}
            onFormatValue={(v) => formatCurrency(v, "INR", 0)}
          />
        </Card>
      </section>

      {/* =============================================
          ACTIVITY
          ============================================= */}
      <section aria-labelledby="activity-title">
        <Card className="dash-activity">
          <header className="dash-card-head">
            <div>
              <span className="dash-eyebrow">ACTIVITY</span>
              <h3 id="activity-title" className="dash-card-title">
                Recent Activity
              </h3>
            </div>
            <span className="dash-card-icon" aria-hidden="true">
              <Clock3 size={16} strokeWidth={2} />
            </span>
          </header>

          {recentActivity.length === 0 ? (
            <EmptyState
              icon={<Activity size={20} strokeWidth={1.9} aria-hidden="true" />}
              title="No recent activity"
              text="New trips and payments will appear here."
            />
          ) : (
            <ul className="dash-activity__list" role="list">
              {recentActivity.map((item) => (
                <li key={item.id} className="dash-activity__item">
                  <span
                    className={`dash-activity__icon ${
                      item.type === "payment" ? "is-payment" : "is-trip"
                    }`}
                    aria-hidden="true"
                  >
                    {item.type === "payment" ? (
                      <IndianRupee size={15} strokeWidth={2} />
                    ) : (
                      <Truck size={15} strokeWidth={2} />
                    )}
                  </span>

                  <div className="dash-activity__body">
                    <strong>{item.title}</strong>
                    <span>
                      {item.name} • {item.detail}
                    </span>
                  </div>

                  <div className="dash-activity__meta">
                    {item.amount > 0 && (
                      <strong>{formatCurrency(item.amount, "INR", 0)}</strong>
                    )}
                    <span>
                      {formatDate(item.date)}
                      {formatTime(item.date) && ` • ${formatTime(item.date)}`}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* =============================================
          RECENT TRIPS + PAYMENTS
          ============================================= */}
      <section className="dash-main">
        <Card className="dash-panel">
          <header className="dash-card-head">
            <div>
              <span className="dash-eyebrow">RECENT WORK</span>
              <h3 className="dash-card-title">Recent Trips</h3>
            </div>
            <button
              type="button"
              className="dash-link-btn"
              onClick={() => handleNavigate("records")}
            >
              <span>View all</span>
              <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </header>

          {recentTrips.length === 0 ? (
            <EmptyState
              icon={<Truck size={20} strokeWidth={1.9} aria-hidden="true" />}
              title="No trips recorded yet"
              text="Your latest transport work will appear here."
              buttonText="Add Trip"
              onAction={() => handleNavigate("add-trip")}
            />
          ) : (
            <ul className="dash-list" role="list">
              {recentTrips.map((trip, index) => {
                const tripType = getTripType(trip);
                return (
                  <li key={trip?.id || `${trip?.date}-${index}`} className="dash-list__item">
                    <span className="dash-list__icon is-trip" aria-hidden="true">
                      <Truck size={16} strokeWidth={2} />
                    </span>

                    <div className="dash-list__body">
                      <strong title={getTripPartyName(trip)}>
                        {getTripPartyName(trip)}
                      </strong>
                      <span title={getTripMaterialName(trip)}>
                        {getTripMaterialName(trip)}
                      </span>
                    </div>

                    <div className="dash-list__details">
                      <span>{getTripVehicleNumber(trip) || "Vehicle"}</span>
                      <span>
                        {trip?.quantity ? `${trip.quantity} ${trip.unit || ""}` : "Trip"}
                      </span>
                    </div>

                    <div className="dash-list__meta">
                      <div className="dash-list__actions">
                        <StatusBadge
                          status={tripType}
                          label={tripType || "Unknown"}
                          size="small"
                        />
                        <button
                          type="button"
                          className="dash-wa"
                          onClick={() => handleWhatsAppShare(trip)}
                          aria-label={`Share trip details for ${getTripPartyName(trip)} on WhatsApp`}
                          title="Share on WhatsApp"
                        >
                          <MessageCircle size={14} strokeWidth={2} aria-hidden="true" />
                        </button>
                      </div>
                      <span>{formatDate(trip?.date)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="dash-panel">
          <header className="dash-card-head">
            <div>
              <span className="dash-eyebrow">COLLECTIONS</span>
              <h3 className="dash-card-title">Recent Payments</h3>
            </div>
            <button
              type="button"
              className="dash-link-btn"
              onClick={() => handleNavigate("payments")}
            >
              <span>View all</span>
              <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </header>

          {recentPayments.length === 0 ? (
            <EmptyState
              icon={<ReceiptText size={20} strokeWidth={1.9} aria-hidden="true" />}
              title="No payments recorded yet"
              text="Recent collections will appear here."
              buttonText="Record Payment"
              onAction={() => handleNavigate("payments")}
            />
          ) : (
            <ul className="dash-list" role="list">
              {recentPayments.map((payment, index) => (
                <li
                  key={payment?.id || `${payment?.date}-${index}`}
                  className="dash-list__item"
                >
                  <span className="dash-list__icon is-payment" aria-hidden="true">
                    <IndianRupee size={16} strokeWidth={2} />
                  </span>

                  <div className="dash-list__body">
                    <strong title={payment?.partyName || "Unknown Party"}>
                      {payment?.partyName || "Unknown Party"}
                    </strong>
                    <span>
                      {payment?.paymentMode || "Payment"}
                      {payment?.referenceNo ? ` • ${payment.referenceNo}` : ""}
                    </span>
                  </div>

                  <div className="dash-list__meta">
                    <strong className="dash-list__amount">
                      {formatCurrency(payment?.amount, "INR", 0)}
                    </strong>
                    <span>{formatDate(payment?.date)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* =============================================
          FLEET + FINANCIAL
          ============================================= */}
      <section className="dash-split dash-split--fleet">
        <Card className="dash-fleet">
          <header className="dash-card-head">
            <div>
              <span className="dash-eyebrow">FLEET PERFORMANCE</span>
              <h3 className="dash-card-title">Top Performing Fleet</h3>
            </div>
            <button
              type="button"
              className="dash-link-btn"
              onClick={() => handleNavigate("tractors")}
            >
              <span>View all</span>
              <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </header>

          {tractorSummary.length === 0 ? (
            <EmptyState
              icon={<Tractor size={20} strokeWidth={1.9} aria-hidden="true" />}
              title="No tractor activity"
              text="Trip activity by tractor will appear here."
            />
          ) : (
            <ul className="dash-fleet__list" role="list">
              {tractorSummary.map((tractor) => (
                <li key={tractor.vehicle} className="dash-fleet__row">
                  <div className="dash-fleet__main">
                    <span className="dash-list__icon is-trip" aria-hidden="true">
                      <Tractor size={15} strokeWidth={2} />
                    </span>
                    <div className="dash-fleet__main-text">
                      <strong title={tractor.vehicle}>{tractor.vehicle}</strong>
                      <span>{tractor.driver}</span>
                    </div>
                  </div>

                  <div className="dash-fleet__stat">
                    <strong>{tractor.totalTrips}</strong>
                    <span>Trips</span>
                  </div>

                  <div className="dash-fleet__breakdown">
                    <span title="Loading trips">L {tractor.loading}</span>
                    <span title="Unloading trips">U {tractor.unloading}</span>
                    <span title="Site to Site trips">S {tractor.siteToSite}</span>
                  </div>

                  <div className="dash-fleet__billing">
                    <strong>{formatCurrency(tractor.billing, "INR", 0)}</strong>
                    <span>Billing</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="dash-fin">
          <header className="dash-card-head">
            <div>
              <span className="dash-eyebrow">FINANCIAL OVERVIEW</span>
              <h3 className="dash-card-title">Business Collections</h3>
            </div>
            <span className="dash-card-icon" aria-hidden="true">
              <TrendingUp size={16} strokeWidth={2} />
            </span>
          </header>

          <div className="dash-fin__list">
            <div className="dash-fin__row">
              <span>Total Billing</span>
              <strong>{formatCurrency(totalBilling, "INR", 0)}</strong>
            </div>
            <div className="dash-fin__row">
              <span>Total Received</span>
              <strong className="is-ok">{formatCurrency(totalReceived, "INR", 0)}</strong>
            </div>
            <div className="dash-fin__row">
              <span>Outstanding</span>
              <strong className="is-due">{formatCurrency(outstanding, "INR", 0)}</strong>
            </div>
          </div>

          <div className="dash-fin__progress">
            <div className="dash-fin__progress-head">
              <span>Collection Progress</span>
              <strong>{collectionPercentage.toFixed(1)}%</strong>
            </div>
            <div
              className="dash-fin__track"
              role="progressbar"
              aria-valuenow={Math.round(collectionPercentage)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Collection progress: ${collectionPercentage.toFixed(1)}% of total billing received`}
            >
              <div
                className="dash-fin__fill"
                style={{ width: `${collectionPercentage}%` }}
              />
            </div>
            <span className="dash-fin__note">Received ÷ Total Billing</span>
          </div>
        </Card>
      </section>

      {/* =============================================
          OUTSTANDING
          ============================================= */}
      <section aria-labelledby="outstanding-title">
        <Card className="dash-out">
          <header className="dash-card-head">
            <div>
              <span className="dash-eyebrow">RECEIVABLES</span>
              <h3 id="outstanding-title" className="dash-card-title">
                Outstanding Parties
              </h3>
            </div>
            <button
              type="button"
              className="dash-link-btn"
              onClick={() => handleNavigate("billing")}
            >
              <span>View all</span>
              <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </header>

          {outstandingParties.length === 0 ? (
            <EmptyState
              icon={<WalletCards size={20} strokeWidth={1.9} aria-hidden="true" />}
              title="No outstanding dues"
              text="All party balances are currently clear."
            />
          ) : (
            <ul className="dash-out__list" role="list">
              {outstandingParties.slice(0, 5).map((party) => (
                <li key={party.partyName} className="dash-out__item">
                  <div className="dash-out__left">
                    <strong title={party.partyName}>{party.partyName}</strong>
                    <span>
                      {party.tripCount} {party.tripCount === 1 ? "trip" : "trips"}
                    </span>
                  </div>
                  <div className="dash-out__right">
                    <strong className="dash-out__amount">
                      {formatCurrency(party.outstanding, "INR", 0)}
                    </strong>
                    <span>Due</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* =============================================
          STAFF
          ============================================= */}
      <section aria-labelledby="staff-title">
        <Card className="dash-staff">
          <header className="dash-card-head">
            <div>
              <span className="dash-eyebrow">STAFF</span>
              <h3 id="staff-title" className="dash-card-title">
                Staff Summary
              </h3>
            </div>
            <button
              type="button"
              className="dash-link-btn"
              onClick={() => handleNavigate("staff")}
            >
              <span>Manage staff</span>
              <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </header>

          {safeStaff.length === 0 ? (
            <EmptyState
              icon={<Users size={20} strokeWidth={1.9} aria-hidden="true" />}
              title="No staff records"
              text="Add staff members to track salary and attendance."
              buttonText="Staff"
              onAction={() => handleNavigate("staff")}
            />
          ) : (
            <div className="dash-staff__grid">
              {[
                { label: "Total Staff", value: safeStaff.length },
                { label: "Active Staff", value: activeStaff.length },
                { label: "Attendance Records", value: safeAttendance.length },
                { label: "Salary Paid", value: formatCurrency(staffSalarySummary.paid, "INR", 0) },
                { label: "Advance", value: formatCurrency(staffSalarySummary.advance, "INR", 0) },
                { label: "Salary Balance", value: formatCurrency(staffSalarySummary.balance, "INR", 0) },
              ].map((stat) => (
                <div key={stat.label} className="dash-staff__cell">
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* =============================================
          FINAL SUMMARY
          ============================================= */}
      <section className="dash-final" aria-label="Quick totals">
        {[
          { icon: <Package size={16} strokeWidth={2} aria-hidden="true" />, label: "Materials", value: safeMaterials.length },
          { icon: <Truck size={16} strokeWidth={2} aria-hidden="true" />, label: "Active Fleet", value: activeTractors.length },
          { icon: <Users size={16} strokeWidth={2} aria-hidden="true" />, label: "Active Parties", value: activeParties.length },
          { icon: <IndianRupee size={16} strokeWidth={2} aria-hidden="true" />, label: "Total Received", value: formatCurrency(totalReceived, "INR", 0) },
        ].map((item) => (
          <div key={item.label} className="dash-final__cell">
            <span className="dash-final__icon" aria-hidden="true">{item.icon}</span>
            <span className="dash-final__label">{item.label}</span>
            <strong className="dash-final__value">{item.value}</strong>
          </div>
        ))}
      </section>
    </div>
  );
}

export default Dashboard;