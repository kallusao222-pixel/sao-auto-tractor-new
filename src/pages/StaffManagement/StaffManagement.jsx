import { useEffect, useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit3,
  Trash2,
  Eye,
  Phone,
  BriefcaseBusiness,
  CalendarDays,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Clock3,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Download,
  Printer,
  WalletCards,
  CircleDollarSign,
  UserCheck,
  UserX,
  X,
  Save,
  ReceiptText,
  FileText,
  CreditCard,
  UserRound,
} from "lucide-react";

import "./StaffManagement.css";

const STAFF_KEY = "saoAutoTractorStaff";
const ATTENDANCE_KEY = "saoAutoTractorStaffAttendance";
const SALARY_KEY = "saoAutoTractorStaffSalaryPayments";

const PAYMENT_MODES = ["Cash", "UPI", "Bank", "Other"];

function safeParse(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonday(date = new Date()) {
  const current = new Date(date);
  const day = current.getDay();
  const difference = day === 0 ? -6 : 1 - day;

  current.setDate(current.getDate() + difference);
  current.setHours(0, 0, 0, 0);

  return current;
}

function formatDisplayDate(value) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function StaffManagement() {
  const getDefaultStaff = () => ({
    name: "",
    mobile: "",
    role: "",
    fullDayRate: "",
    halfDayRate: "",
    joiningDate: getToday(),
  });

  const [activeTab, setActiveTab] = useState("staff");

  const [staffList, setStaffList] = useState(() =>
    safeParse(STAFF_KEY, [])
  );

  const [attendance, setAttendance] = useState(() =>
    safeParse(ATTENDANCE_KEY, {})
  );

  const [salaryPayments, setSalaryPayments] = useState(() =>
    safeParse(SALARY_KEY, {})
  );

  const [staffForm, setStaffForm] = useState(getDefaultStaff());
  const [editingStaffId, setEditingStaffId] = useState(null);

  const [weekStart, setWeekStart] = useState(() =>
    formatDateInput(getMonday())
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showStaffModal, setShowStaffModal] = useState(false);

  const [previewStaff, setPreviewStaff] = useState(null);
  const [previewType, setPreviewType] = useState("staff");
  const [showPreview, setShowPreview] = useState(false);
  const [printAfterPreview, setPrintAfterPreview] = useState(false);

  const [payStaff, setPayStaff] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("Cash");
  const [payNotes, setPayNotes] = useState("");

  const [toast, setToast] = useState("");

  const showToast = (message) => {
    setToast(message);

    window.clearTimeout(showToast.timer);

    showToast.timer = window.setTimeout(() => {
      setToast("");
    }, 2500);
  };

  useEffect(() => {
    const syncData = () => {
      setStaffList(safeParse(STAFF_KEY, []));
      setAttendance(safeParse(ATTENDANCE_KEY, {}));
      setSalaryPayments(safeParse(SALARY_KEY, {}));
    };

    window.addEventListener("storage", syncData);
    window.addEventListener("saoAutoTractorDataChanged", syncData);

    const interval = window.setInterval(syncData, 1500);

    return () => {
      window.removeEventListener("storage", syncData);
      window.removeEventListener(
        "saoAutoTractorDataChanged",
        syncData
      );
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!showPreview || !printAfterPreview) return;

    const timer = window.setTimeout(() => {
      window.print();
      setPrintAfterPreview(false);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [showPreview, printAfterPreview]);

  const notifyDataChanged = () => {
    window.dispatchEvent(
      new Event("saoAutoTractorDataChanged")
    );
  };

  const saveStaff = (updatedStaff) => {
    setStaffList(updatedStaff);

    localStorage.setItem(
      STAFF_KEY,
      JSON.stringify(updatedStaff)
    );

    notifyDataChanged();
  };

  const saveAttendance = (updatedAttendance) => {
    setAttendance(updatedAttendance);

    localStorage.setItem(
      ATTENDANCE_KEY,
      JSON.stringify(updatedAttendance)
    );

    notifyDataChanged();
  };

  const saveSalaryPayments = (updatedPayments) => {
    setSalaryPayments(updatedPayments);

    localStorage.setItem(
      SALARY_KEY,
      JSON.stringify(updatedPayments)
    );

    notifyDataChanged();
  };

  const handleStaffChange = (event) => {
    const { name, value } = event.target;

    setStaffForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const submitStaff = (event) => {
    event.preventDefault();

    const name = staffForm.name.trim();

    if (!name) {
      showToast("Please enter Staff Name.");
      return;
    }

    if (
      !staffForm.fullDayRate ||
      Number(staffForm.fullDayRate) <= 0
    ) {
      showToast("Please enter Full Day Amount.");
      return;
    }

    if (
      staffForm.halfDayRate === "" ||
      Number(staffForm.halfDayRate) < 0
    ) {
      showToast("Please enter Half Day Amount.");
      return;
    }

    if (editingStaffId !== null) {
      const updated = staffList.map((staff) =>
        staff.id === editingStaffId
          ? {
              ...staff,
              name,
              mobile: staffForm.mobile.trim(),
              role: staffForm.role.trim(),
              fullDayRate: Number(staffForm.fullDayRate),
              halfDayRate: Number(staffForm.halfDayRate),
              joiningDate: staffForm.joiningDate,
            }
          : staff
      );

      saveStaff(updated);
      setEditingStaffId(null);
      setStaffForm(getDefaultStaff());

      showToast("Staff updated successfully.");
      return;
    }

    const duplicate = staffList.find(
      (staff) =>
        String(staff.name || "")
          .trim()
          .toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      showToast("This Staff already exists.");
      return;
    }

    const newStaff = {
      id: Date.now(),
      name,
      mobile: staffForm.mobile.trim(),
      role: staffForm.role.trim(),
      fullDayRate: Number(staffForm.fullDayRate),
      halfDayRate: Number(staffForm.halfDayRate),
      joiningDate: staffForm.joiningDate,
      status: "Active",
      createdAt: new Date().toISOString(),
    };

    saveStaff([...staffList, newStaff]);

    setStaffForm(getDefaultStaff());

    showToast("Staff added successfully.");
  };

  const editStaff = (staff) => {
    setEditingStaffId(staff.id);

    setStaffForm({
      name: staff.name || "",
      mobile: staff.mobile || "",
      role: staff.role || "",
      fullDayRate: staff.fullDayRate ?? "",
      halfDayRate: staff.halfDayRate ?? "",
      joiningDate: staff.joiningDate || getToday(),
    });

    setActiveTab("staff");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const cancelStaffEdit = () => {
    setEditingStaffId(null);
    setStaffForm(getDefaultStaff());
  };

  const deleteStaff = (id) => {
    const staff = staffList.find(
      (item) => item.id === id
    );

    if (!staff) return;

    const confirmed = window.confirm(
      `Delete ${staff.name}? This will remove the staff profile but existing attendance/salary records will remain.`
    );

    if (!confirmed) return;

    saveStaff(
      staffList.filter((item) => item.id !== id)
    );

    if (selectedStaff?.id === id) {
      setSelectedStaff(null);
      setShowStaffModal(false);
    }

    if (previewStaff?.id === id) {
      setPreviewStaff(null);
      setShowPreview(false);
    }

    showToast("Staff deleted successfully.");
  };

  const toggleStaffStatus = (id) => {
    const updated = staffList.map((staff) =>
      staff.id === id
        ? {
            ...staff,
            status:
              staff.status === "Inactive"
                ? "Active"
                : "Inactive",
          }
        : staff
    );

    saveStaff(updated);

    showToast("Staff status updated.");
  };

  const activeStaff = useMemo(
    () =>
      staffList.filter(
        (staff) =>
          !staff.status ||
          staff.status === "Active"
      ),
    [staffList]
  );

  const inactiveStaff = useMemo(
    () =>
      staffList.filter(
        (staff) => staff.status === "Inactive"
      ),
    [staffList]
  );

  const roles = useMemo(() => {
    const values = staffList
      .map((staff) => String(staff.role || "").trim())
      .filter(Boolean);

    return [...new Set(values)].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [staffList]);

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();

    return staffList.filter((staff) => {
      const matchesSearch =
        !query ||
        String(staff.name || "")
          .toLowerCase()
          .includes(query) ||
        String(staff.mobile || "")
          .toLowerCase()
          .includes(query) ||
        String(staff.role || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        (staff.status || "Active") === statusFilter;

      const matchesRole =
        roleFilter === "All" ||
        String(staff.role || "") === roleFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRole
      );
    });
  }, [
    staffList,
    search,
    statusFilter,
    roleFilter,
  ]);

  const weekDates = useMemo(() => {
    const monday = new Date(`${weekStart}T00:00:00`);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
  }, [weekStart]);

  const weekLabel = useMemo(() => {
    if (!weekDates.length) return "";

    return `${weekDates[0].toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    )} → ${weekDates[6].toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    )}`;
  }, [weekDates]);

  const getDateKey = (date) =>
    formatDateInput(date);

  const changeWeek = (amount) => {
    const currentMonday = new Date(
      `${weekStart}T00:00:00`
    );

    currentMonday.setDate(
      currentMonday.getDate() + amount * 7
    );

    setWeekStart(
      formatDateInput(currentMonday)
    );
  };

  const goCurrentWeek = () => {
    setWeekStart(
      formatDateInput(getMonday())
    );
  };

  /*
   * IMPORTANT:
   * New attendance is BLANK by default.
   * Blank attendance is not counted in salary.
   */
  const getAttendanceStatus = (
    staffId,
    dateKey
  ) =>
    attendance?.[weekStart]?.[staffId]?.[
      dateKey
    ] || "";

  const setAttendanceStatus = (
    staffId,
    dateKey,
    status
  ) => {
    const updated = {
      ...attendance,
      [weekStart]: {
        ...(attendance[weekStart] || {}),
        [staffId]: {
          ...(attendance[weekStart]?.[staffId] || {}),
          [dateKey]: status,
        },
      },
    };

    /*
     * If blank is selected, remove the saved
     * date entry instead of storing a fake status.
     */
    if (!status) {
      const staffWeek = {
        ...(updated[weekStart]?.[staffId] || {}),
      };

      delete staffWeek[dateKey];

      updated[weekStart][staffId] = staffWeek;
    }

    saveAttendance(updated);
  };

  const getAttendanceSummary = (staffId) => {
    let present = 0;
    let halfDay = 0;
    let absent = 0;
    let notMarked = 0;

    weekDates.forEach((date) => {
      const status = getAttendanceStatus(
        staffId,
        getDateKey(date)
      );

      if (status === "P") present++;
      else if (status === "HD") halfDay++;
      else if (status === "A") absent++;
      else notMarked++;
    });

    return {
      present,
      halfDay,
      absent,
      notMarked,
    };
  };

  const calculateSalary = (staff) => {
    const summary =
      getAttendanceSummary(staff.id);

    const fullDayRate =
      Number(staff.fullDayRate) || 0;

    const halfDayRate =
      Number(staff.halfDayRate) || 0;

    const grossSalary =
      summary.present * fullDayRate +
      summary.halfDay * halfDayRate;

    return {
      ...summary,
      grossSalary,
    };
  };

  const getPaymentData = (staffId) =>
    salaryPayments?.[weekStart]?.[staffId] || {
      advance: 0,
      paid: 0,
      paymentMode: "Cash",
      payments: [],
    };

  const updatePaymentData = (
    staffId,
    field,
    value
  ) => {
    const current =
      getPaymentData(staffId);

    const updated = {
      ...salaryPayments,
      [weekStart]: {
        ...(salaryPayments[weekStart] || {}),
        [staffId]: {
          ...current,
          [field]: value,
        },
      },
    };

    saveSalaryPayments(updated);
  };

  const weeklySalaryTotal = useMemo(
    () =>
      activeStaff.reduce(
        (total, staff) =>
          total +
          calculateSalary(staff).grossSalary,
        0
      ),
    [activeStaff, attendance, weekStart]
  );

  const totalAdvance = useMemo(
    () =>
      activeStaff.reduce(
        (total, staff) =>
          total +
          Number(
            getPaymentData(staff.id)
              .advance || 0
          ),
        0
      ),
    [
      activeStaff,
      salaryPayments,
      weekStart,
    ]
  );

  const totalPaid = useMemo(
    () =>
      activeStaff.reduce(
        (total, staff) =>
          total +
          Number(
            getPaymentData(staff.id)
              .paid || 0
          ),
        0
      ),
    [
      activeStaff,
      salaryPayments,
      weekStart,
    ]
  );

  const remainingSalary = Math.max(
    weeklySalaryTotal -
      totalAdvance -
      totalPaid,
    0
  );

  const weeklyPresent = useMemo(
    () =>
      activeStaff.reduce(
        (total, staff) =>
          total +
          getAttendanceSummary(
            staff.id
          ).present,
        0
      ),
    [activeStaff, attendance, weekStart]
  );

  const weeklyHalfDay = useMemo(
    () =>
      activeStaff.reduce(
        (total, staff) =>
          total +
          getAttendanceSummary(
            staff.id
          ).halfDay,
        0
      ),
    [activeStaff, attendance, weekStart]
  );

  const weeklyAbsent = useMemo(
    () =>
      activeStaff.reduce(
        (total, staff) =>
          total +
          getAttendanceSummary(
            staff.id
          ).absent,
        0
      ),
    [activeStaff, attendance, weekStart]
  );

  const weeklyNotMarked = useMemo(
    () =>
      activeStaff.reduce(
        (total, staff) =>
          total +
          getAttendanceSummary(
            staff.id
          ).notMarked,
        0
      ),
    [activeStaff, attendance, weekStart]
  );

  const getStaffMonthlySnapshot = (staff) => {
    const date = new Date(
      `${weekStart}T00:00:00`
    );

    const year = date.getFullYear();
    const month = date.getMonth();

    let present = 0;
    let halfDay = 0;
    let absent = 0;

    const monthKeyPrefix = `${year}-${String(
      month + 1
    ).padStart(2, "0")}`;

    Object.entries(attendance || {}).forEach(
      ([, staffData]) => {
        if (!staffData?.[staff.id]) return;

        Object.entries(
          staffData[staff.id]
        ).forEach(([dateKey, status]) => {
          if (
            !dateKey.startsWith(
              monthKeyPrefix
            )
          ) {
            return;
          }

          if (status === "P") present++;
          if (status === "HD") halfDay++;
          if (status === "A") absent++;
        });
      }
    );

    const gross =
      present * Number(staff.fullDayRate || 0) +
      halfDay *
        Number(staff.halfDayRate || 0);

    return {
      present,
      halfDay,
      absent,
      gross,
    };
  };

  const openStaffDetails = (staff) => {
    setSelectedStaff(staff);
    setShowStaffModal(true);
  };

  /*
   * Staff profile preview.
   */
  const openStaffPreview = (staff, shouldPrint = false) => {
    setPreviewStaff(staff);
    setPreviewType("staff");
    setShowPreview(true);
    setPrintAfterPreview(shouldPrint);
  };

  /*
   * Salary statement preview.
   */
  const openSalaryPreview = (
    staff,
    shouldPrint = false
  ) => {
    setPreviewStaff(staff);
    setPreviewType("salary");
    setShowPreview(true);
    setPrintAfterPreview(shouldPrint);
  };

  const closePreview = () => {
    setShowPreview(false);
    setPrintAfterPreview(false);
    setPreviewStaff(null);
  };

  const printPreview = () => {
    if (!previewStaff) return;

    setPrintAfterPreview(true);
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setRoleFilter("All");
  };

  const exportStaffCSV = () => {
    if (!filteredStaff.length) {
      showToast("No staff records to export.");
      return;
    }

    const headers = [
      "Name",
      "Mobile",
      "Role",
      "Joining Date",
      "Full Day Rate",
      "Half Day Rate",
      "Status",
    ];

    const rows = filteredStaff.map((staff) => [
      staff.name,
      staff.mobile || "",
      staff.role || "",
      staff.joiningDate || "",
      staff.fullDayRate || 0,
      staff.halfDayRate || 0,
      staff.status || "Active",
    ]);

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(
              /"/g,
              '""'
            )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download = `staff-${getToday()}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showToast("Staff CSV exported.");
  };

  /*
   * Salary payment modal.
   *
   * Payment is added to the existing weekly
   * payment structure without changing the
   * existing localStorage key.
   */
  const openPayModal = (staff) => {
    setPayStaff(staff);
    setPayAmount("");
    setPayMode("Cash");
    setPayNotes("");
    setShowPayModal(true);
  };

  const saveSalaryPayment = () => {
    if (!payStaff) return;

    const amount = Number(payAmount);

    if (!amount || amount <= 0) {
      showToast("Please enter a valid payment amount.");
      return;
    }

    const current =
      getPaymentData(payStaff.id);

    const existingPayments =
      Array.isArray(current.payments)
        ? current.payments
        : [];

    const newPayment = {
      id: Date.now(),
      amount,
      paymentMode: payMode,
      date: getToday(),
      notes: payNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    const newPaid =
      Number(current.paid || 0) + amount;

    const updated = {
      ...salaryPayments,
      [weekStart]: {
        ...(salaryPayments[weekStart] || {}),
        [payStaff.id]: {
          ...current,
          paid: newPaid,
          paymentMode: payMode,
          payments: [
            ...existingPayments,
            newPayment,
          ],
        },
      },
    };

    saveSalaryPayments(updated);

    setShowPayModal(false);
    setPayStaff(null);
    setPayAmount("");
    setPayNotes("");

    showToast("Salary payment recorded.");
  };

  const renderAttendancePreview = (staff) => {
    const salary =
      calculateSalary(staff);

    return (
      <div className="preview-attendance-section">
        <div className="preview-section-title">
          Weekly Attendance
        </div>

        <div className="preview-week-line">
          <CalendarDays size={15} />
          <strong>{weekLabel}</strong>
        </div>

        <table className="preview-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {weekDates.map((date) => {
              const dateKey = getDateKey(date);

              const status =
                getAttendanceStatus(
                  staff.id,
                  dateKey
                );

              return (
                <tr key={dateKey}>
                  <td>
                    {date.toLocaleDateString(
                      "en-IN",
                      {
                        weekday: "long",
                      }
                    )}
                  </td>

                  <td>
                    {formatDisplayDate(
                      dateKey
                    )}
                  </td>

                  <td>
                    <span
                      className={`preview-status ${
                        status
                          ? status.toLowerCase()
                          : "blank"
                      }`}
                    >
                      {status || "Not Marked"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="preview-summary-grid">
          <div>
            <span>Present</span>
            <strong>
              {salary.present}
            </strong>
          </div>

          <div>
            <span>Half Day</span>
            <strong>
              {salary.halfDay}
            </strong>
          </div>

          <div>
            <span>Absent</span>
            <strong>
              {salary.absent}
            </strong>
          </div>

          <div>
            <span>Not Marked</span>
            <strong>
              {salary.notMarked}
            </strong>
          </div>
        </div>
      </div>
    );
  };

  const renderSalaryPreview = (staff) => {
    const salary =
      calculateSalary(staff);

    const payment =
      getPaymentData(staff.id);

    const advance =
      Number(payment.advance || 0);

    const paid =
      Number(payment.paid || 0);

    const balance = Math.max(
      salary.grossSalary -
        advance -
        paid,
      0
    );

    return (
      <>
        {renderAttendancePreview(staff)}

        <div className="preview-section-title salary-preview-title">
          Salary Calculation
        </div>

        <div className="preview-salary-grid">
          <div>
            <span>Full Day Rate</span>
            <strong>
              {formatCurrency(
                staff.fullDayRate
              )}
            </strong>
          </div>

          <div>
            <span>Half Day Rate</span>
            <strong>
              {formatCurrency(
                staff.halfDayRate
              )}
            </strong>
          </div>

          <div>
            <span>Gross Salary</span>
            <strong>
              {formatCurrency(
                salary.grossSalary
              )}
            </strong>
          </div>

          <div>
            <span>Advance</span>
            <strong>
              {formatCurrency(
                advance
              )}
            </strong>
          </div>

          <div>
            <span>Paid</span>
            <strong>
              {formatCurrency(
                paid
              )}
            </strong>
          </div>

          <div className="preview-balance">
            <span>Balance</span>
            <strong>
              {formatCurrency(
                balance
              )}
            </strong>
          </div>
        </div>

        <div className="preview-equation">
          <span>Calculation</span>

          <strong>
            {salary.present} ×{" "}
            {formatCurrency(
              staff.fullDayRate
            )}
            {" + "}
            {salary.halfDay} ×{" "}
            {formatCurrency(
              staff.halfDayRate
            )}
            {" = "}
            {formatCurrency(
              salary.grossSalary
            )}
          </strong>
        </div>

        {Array.isArray(
          payment.payments
        ) &&
          payment.payments.length > 0 && (
            <div className="preview-payment-history">
              <div className="preview-section-title">
                Payment History
              </div>

              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Mode</th>
                    <th>Notes</th>
                    <th>Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {payment.payments
                    .slice()
                    .reverse()
                    .map((item) => (
                      <tr key={item.id}>
                        <td>
                          {formatDisplayDate(
                            item.date
                          )}
                        </td>

                        <td>
                          {item.paymentMode ||
                            "Cash"}
                        </td>

                        <td>
                          {item.notes ||
                            "—"}
                        </td>

                        <td>
                          {formatCurrency(
                            item.amount
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
      </>
    );
  };

  return (
    <div className="page-container staff-page">

      {/* PAGE HEADER */}
      <div className="staff-page-header">
        <div>
          <div className="staff-eyebrow">
            PEOPLE & PAYROLL
          </div>

          <h1>Staff Management</h1>

          <p>
            Manage staff, attendance and
            attendance-based salary in one place.
          </p>
        </div>

        <button
          type="button"
          className="staff-primary-btn"
          onClick={() => {
            setActiveTab("staff");
            setEditingStaffId(null);
            setStaffForm(getDefaultStaff());

            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }}
        >
          <UserPlus size={17} />
          Add Staff
        </button>
      </div>

      {/* STATS */}
      <section className="staff-stats">

        <div className="staff-stat-card">
          <div className="staff-stat-icon">
            <Users size={19} />
          </div>

          <div>
            <span>Total Staff</span>
            <strong>
              {staffList.length}
            </strong>
          </div>
        </div>

        <div className="staff-stat-card">
          <div className="staff-stat-icon">
            <UserCheck size={19} />
          </div>

          <div>
            <span>Active Staff</span>
            <strong>
              {activeStaff.length}
            </strong>
          </div>
        </div>

        <div className="staff-stat-card">
          <div className="staff-stat-icon">
            <UserX size={19} />
          </div>

          <div>
            <span>Inactive</span>
            <strong>
              {inactiveStaff.length}
            </strong>
          </div>
        </div>

        <div className="staff-stat-card">
          <div className="staff-stat-icon">
            <IndianRupee size={19} />
          </div>

          <div>
            <span>Weekly Salary</span>
            <strong>
              {formatCurrency(
                weeklySalaryTotal
              )}
            </strong>
          </div>
        </div>

        <div className="staff-stat-card">
          <div className="staff-stat-icon">
            <WalletCards size={19} />
          </div>

          <div>
            <span>Remaining</span>
            <strong>
              {formatCurrency(
                remainingSalary
              )}
            </strong>
          </div>
        </div>

      </section>

      {/* TABS */}
      <div className="staff-tabs">

        <button
          type="button"
          className={
            activeTab === "staff"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("staff")
          }
        >
          <Users size={16} />
          Staff
        </button>

        <button
          type="button"
          className={
            activeTab === "attendance"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("attendance")
          }
        >
          <Clock3 size={16} />
          Attendance
        </button>

        <button
          type="button"
          className={
            activeTab === "salary"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("salary")
          }
        >
          <CircleDollarSign size={16} />
          Salary
        </button>

      </div>

      {/* STAFF TAB */}
      {activeTab === "staff" && (
        <>
          <section className="staff-form-card">

            <div className="section-heading">
              <div>
                <span className="section-kicker">
                  STAFF PROFILE
                </span>

                <h2>
                  {editingStaffId !== null
                    ? "Edit Staff"
                    : "Add New Staff"}
                </h2>

                <p>
                  Keep staff information and
                  daily wage details organized.
                </p>
              </div>

              {editingStaffId !== null && (
                <button
                  type="button"
                  className="staff-secondary-btn"
                  onClick={cancelStaffEdit}
                >
                  <X size={16} />
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={submitStaff}>

              <div className="staff-form-grid">

                <div className="staff-field">
                  <label>
                    Staff Name *
                  </label>

                  <input
                    type="text"
                    name="name"
                    placeholder="Enter staff name"
                    value={staffForm.name}
                    onChange={handleStaffChange}
                  />
                </div>

                <div className="staff-field">
                  <label>
                    Mobile Number
                  </label>

                  <input
                    type="tel"
                    name="mobile"
                    placeholder="Enter mobile number"
                    value={staffForm.mobile}
                    onChange={handleStaffChange}
                  />
                </div>

                <div className="staff-field">
                  <label>
                    Role / Work
                  </label>

                  <input
                    type="text"
                    name="role"
                    placeholder="Example: Helper"
                    value={staffForm.role}
                    onChange={handleStaffChange}
                  />
                </div>

                <div className="staff-field">
                  <label>
                    Joining Date
                  </label>

                  <input
                    type="date"
                    name="joiningDate"
                    value={
                      staffForm.joiningDate
                    }
                    onChange={
                      handleStaffChange
                    }
                  />
                </div>

                <div className="staff-field">
                  <label>
                    Full Day Amount *
                  </label>

                  <div className="input-with-prefix">
                    <span>₹</span>

                    <input
                      type="number"
                      min="0"
                      step="any"
                      name="fullDayRate"
                      placeholder="500"
                      value={
                        staffForm.fullDayRate
                      }
                      onChange={
                        handleStaffChange
                      }
                    />
                  </div>
                </div>

                <div className="staff-field">
                  <label>
                    Half Day Amount *
                  </label>

                  <div className="input-with-prefix">
                    <span>₹</span>

                    <input
                      type="number"
                      min="0"
                      step="any"
                      name="halfDayRate"
                      placeholder="250"
                      value={
                        staffForm.halfDayRate
                      }
                      onChange={
                        handleStaffChange
                      }
                    />
                  </div>
                </div>

              </div>

              <div className="staff-form-footer">

                <p>
                  Blank attendance will not be
                  included in salary calculation.
                </p>

                <button
                  type="submit"
                  className="staff-primary-btn"
                >
                  <Save size={17} />

                  {editingStaffId !== null
                    ? "Update Staff"
                    : "Save Staff"}
                </button>

              </div>

            </form>
          </section>

          <section className="staff-panel">

            <div className="panel-top">

              <div>
                <span className="section-kicker">
                  DIRECTORY
                </span>

                <h2>Staff List</h2>

                <p>
                  {filteredStaff.length} of{" "}
                  {staffList.length} staff members
                </p>
              </div>

              <button
                type="button"
                className="staff-secondary-btn"
                onClick={exportStaffCSV}
              >
                <Download size={16} />
                Export CSV
              </button>

            </div>

            <div className="staff-filter-bar">

              <div className="staff-search">
                <Search size={17} />

                <input
                  type="search"
                  placeholder="Search name, mobile or role..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                />
              </div>

              <div className="staff-filter">
                <Filter size={15} />

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value
                    )
                  }
                >
                  <option value="All">
                    All Status
                  </option>

                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </div>

              <div className="staff-filter">
                <BriefcaseBusiness size={15} />

                <select
                  value={roleFilter}
                  onChange={(e) =>
                    setRoleFilter(
                      e.target.value
                    )
                  }
                >
                  <option value="All">
                    All Roles
                  </option>

                  {roles.map((role) => (
                    <option
                      key={role}
                      value={role}
                    >
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              {(search ||
                statusFilter !== "All" ||
                roleFilter !== "All") && (
                <button
                  type="button"
                  className="filter-reset"
                  onClick={resetFilters}
                  title="Reset filters"
                >
                  <RotateCcw size={15} />
                </button>
              )}

            </div>

            {filteredStaff.length === 0 ? (
              <div className="staff-empty">

                <div className="staff-empty-icon">
                  <Users size={25} />
                </div>

                <h3>
                  {staffList.length === 0
                    ? "No staff added yet"
                    : "No matching staff"}
                </h3>

                <p>
                  {staffList.length === 0
                    ? "Add your first staff member to start managing attendance and salary."
                    : "Try changing your search or filters."}
                </p>

                {staffList.length === 0 && (
                  <button
                    type="button"
                    className="staff-primary-btn"
                    onClick={() =>
                      window.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      })
                    }
                  >
                    <UserPlus size={16} />
                    Add First Staff
                  </button>
                )}

              </div>
            ) : (
              <div className="staff-table-wrap">

                <table className="staff-table">

                  <thead>
                    <tr>
                      <th>Staff</th>
                      <th>Contact</th>
                      <th>Role</th>
                      <th>Rates</th>
                      <th>Weekly</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>

                    {filteredStaff.map(
                      (staff) => {
                        const salary =
                          calculateSalary(
                            staff
                          );

                        return (
                          <tr
                            key={staff.id}
                          >
                            <td>
                              <div className="staff-person">
                                <div className="staff-avatar">
                                  {String(
                                    staff.name ||
                                      "S"
                                  )
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>

                                <div>
                                  <strong>
                                    {
                                      staff.name
                                    }
                                  </strong>

                                  <small>
                                    Joined{" "}
                                    {formatDisplayDate(
                                      staff.joiningDate
                                    )}
                                  </small>
                                </div>
                              </div>
                            </td>

                            <td>
                              {staff.mobile ? (
                                <span className="contact-value">
                                  <Phone
                                    size={13}
                                  />
                                  {
                                    staff.mobile
                                  }
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>

                            <td>
                              {staff.role ||
                                "—"}
                            </td>

                            <td>
                              <div className="rate-stack">
                                <span>
                                  <b>
                                    {formatCurrency(
                                      staff.fullDayRate
                                    )}
                                  </b>{" "}
                                  / Full
                                </span>

                                <span>
                                  <b>
                                    {formatCurrency(
                                      staff.halfDayRate
                                    )}
                                  </b>{" "}
                                  / Half
                                </span>
                              </div>
                            </td>

                            <td>
                              <div className="weekly-mini">
                                <strong>
                                  {formatCurrency(
                                    salary.grossSalary
                                  )}
                                </strong>

                                <small>
                                  {salary.present}P
                                  {" · "}
                                  {salary.halfDay}HD
                                  {" · "}
                                  {salary.notMarked}—
                                </small>
                              </div>
                            </td>

                            <td>
                              <button
                                type="button"
                                className={`staff-status ${
                                  staff.status ===
                                  "Inactive"
                                    ? "inactive"
                                    : "active"
                                }`}
                                onClick={() =>
                                  toggleStaffStatus(
                                    staff.id
                                  )
                                }
                              >
                                {staff.status ===
                                "Inactive" ? (
                                  <>
                                    <XCircle
                                      size={13}
                                    />
                                    Inactive
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2
                                      size={13}
                                    />
                                    Active
                                  </>
                                )}
                              </button>
                            </td>

                            <td>
                              <div className="staff-actions">

                                <button
                                  type="button"
                                  className="icon-action"
                                  title="View Details"
                                  onClick={() =>
                                    openStaffDetails(
                                      staff
                                    )
                                  }
                                >
                                  <Eye
                                    size={15}
                                  />
                                </button>

                                <button
                                  type="button"
                                  className="icon-action"
                                  title="Preview Staff"
                                  onClick={() =>
                                    openStaffPreview(
                                      staff
                                    )
                                  }
                                >
                                  <FileText
                                    size={15}
                                  />
                                </button>

                                <button
                                  type="button"
                                  className="icon-action"
                                  title="Print Staff Statement"
                                  onClick={() =>
                                    openStaffPreview(
                                      staff,
                                      true
                                    )
                                  }
                                >
                                  <Printer
                                    size={15}
                                  />
                                </button>

                                <button
                                  type="button"
                                  className="icon-action"
                                  title="Edit"
                                  onClick={() =>
                                    editStaff(
                                      staff
                                    )
                                  }
                                >
                                  <Edit3
                                    size={15}
                                  />
                                </button>

                                <button
                                  type="button"
                                  className="icon-action danger"
                                  title="Delete"
                                  onClick={() =>
                                    deleteStaff(
                                      staff.id
                                    )
                                  }
                                >
                                  <Trash2
                                    size={15}
                                  />
                                </button>

                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}

                  </tbody>
                </table>
              </div>
            )}

          </section>
        </>
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === "attendance" && (
        <section className="staff-panel">

          <div className="panel-top staff-week-header">

            <div>
              <span className="section-kicker">
                ATTENDANCE
              </span>

              <h2>Weekly Attendance</h2>

              <p>
                Monday → Sunday · Active staff
              </p>
            </div>

            <div className="week-controls">

              <button
                type="button"
                onClick={() =>
                  changeWeek(-1)
                }
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <button
                type="button"
                className="current-week-btn"
                onClick={goCurrentWeek}
              >
                <CalendarDays size={15} />
                Current Week
              </button>

              <button
                type="button"
                onClick={() =>
                  changeWeek(1)
                }
              >
                Next
                <ChevronRight size={16} />
              </button>

            </div>
          </div>

          <div className="selected-week">
            <CalendarDays size={16} />
            <strong>{weekLabel}</strong>
          </div>

          <div className="attendance-summary">

            <div>
              <span>Present</span>
              <strong>
                {weeklyPresent}
              </strong>
            </div>

            <div>
              <span>Half Day</span>
              <strong>
                {weeklyHalfDay}
              </strong>
            </div>

            <div>
              <span>Absent</span>
              <strong>
                {weeklyAbsent}
              </strong>
            </div>

            <div>
              <span>Not Marked</span>
              <strong>
                {weeklyNotMarked}
              </strong>
            </div>

            <div>
              <span>Gross Salary</span>
              <strong>
                {formatCurrency(
                  weeklySalaryTotal
                )}
              </strong>
            </div>

          </div>

          {activeStaff.length === 0 ? (
            <div className="staff-empty">
              <div className="staff-empty-icon">
                <UserX size={24} />
              </div>

              <h3>
                No active staff available
              </h3>

              <p>
                Add a staff member or activate
                an existing staff member first.
              </p>
            </div>
          ) : (
            <div className="staff-table-wrap attendance-wrap">

              <table className="attendance-table">

                <thead>
                  <tr>

                    <th className="sticky-staff">
                      Staff
                    </th>

                    {weekDates.map(
                      (date) => (
                        <th
                          key={getDateKey(
                            date
                          )}
                        >
                          <span>
                            {date.toLocaleDateString(
                              "en-IN",
                              {
                                weekday:
                                  "short",
                              }
                            )}
                          </span>

                          <small>
                            {date.getDate()}
                            /
                            {date.getMonth() +
                              1}
                          </small>
                        </th>
                      )
                    )}

                    <th>P</th>
                    <th>HD</th>
                    <th>A</th>
                    <th>—</th>

                  </tr>
                </thead>

                <tbody>

                  {activeStaff.map(
                    (staff) => {
                      const summary =
                        getAttendanceSummary(
                          staff.id
                        );

                      return (
                        <tr
                          key={staff.id}
                        >

                          <td className="sticky-staff">
                            <div className="staff-person compact">
                              <div className="staff-avatar">
                                {String(
                                  staff.name ||
                                    "S"
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <strong>
                                  {
                                    staff.name
                                  }
                                </strong>

                                {staff.role && (
                                  <small>
                                    {
                                      staff.role
                                    }
                                  </small>
                                )}
                              </div>
                            </div>
                          </td>

                          {weekDates.map(
                            (date) => {
                              const dateKey =
                                getDateKey(
                                  date
                                );

                              const status =
                                getAttendanceStatus(
                                  staff.id,
                                  dateKey
                                );

                              return (
                                <td
                                  key={
                                    dateKey
                                  }
                                  className="attendance-cell"
                                >
                                  <select
                                    value={
                                      status
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      setAttendanceStatus(
                                        staff.id,
                                        dateKey,
                                        event
                                          .target
                                          .value
                                      )
                                    }
                                    className={`attendance-select ${
                                      status
                                        ? status.toLowerCase()
                                        : "blank"
                                    }`}
                                  >
                                    <option value="">
                                      —
                                    </option>

                                    <option value="P">
                                      P
                                    </option>

                                    <option value="HD">
                                      HD
                                    </option>

                                    <option value="A">
                                      A
                                    </option>
                                  </select>
                                </td>
                              );
                            }
                          )}

                          <td className="summary-number present">
                            {summary.present}
                          </td>

                          <td className="summary-number halfday">
                            {summary.halfDay}
                          </td>

                          <td className="summary-number absent">
                            {summary.absent}
                          </td>

                          <td className="summary-number notmarked">
                            {summary.notMarked}
                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>
              </table>
            </div>
          )}

          <div className="attendance-help">

            <span>
              <b>—</b>
              Not Marked
            </span>

            <span>
              <b>P</b>
              Present
            </span>

            <span>
              <b>HD</b>
              Half Day
            </span>

            <span>
              <b>A</b>
              Absent
            </span>

          </div>

        </section>
      )}

      {/* SALARY TAB */}
      {activeTab === "salary" && (
        <section className="staff-panel">

          <div className="panel-top staff-week-header">

            <div>
              <span className="section-kicker">
                PAYROLL
              </span>

              <h2>Weekly Salary</h2>

              <p>
                Attendance-based salary
                calculation
              </p>
            </div>

            <div className="week-controls">

              <button
                type="button"
                onClick={() =>
                  changeWeek(-1)
                }
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <button
                type="button"
                className="current-week-btn"
                onClick={goCurrentWeek}
              >
                <CalendarDays size={15} />
                Current Week
              </button>

              <button
                type="button"
                onClick={() =>
                  changeWeek(1)
                }
              >
                Next
                <ChevronRight size={16} />
              </button>

            </div>

          </div>

          <div className="selected-week">
            <CalendarDays size={16} />
            <strong>{weekLabel}</strong>
          </div>

          <div className="salary-summary">

            <div>
              <span>Gross Salary</span>
              <strong>
                {formatCurrency(
                  weeklySalaryTotal
                )}
              </strong>
            </div>

            <div>
              <span>Advance</span>
              <strong>
                {formatCurrency(
                  totalAdvance
                )}
              </strong>
            </div>

            <div>
              <span>Paid</span>
              <strong>
                {formatCurrency(totalPaid)}
              </strong>
            </div>

            <div className="remaining">
              <span>Remaining</span>
              <strong>
                {formatCurrency(
                  remainingSalary
                )}
              </strong>
            </div>

          </div>

          {activeStaff.length === 0 ? (
            <div className="staff-empty">
              <div className="staff-empty-icon">
                <WalletCards size={24} />
              </div>

              <h3>
                No active staff available
              </h3>

              <p>
                Add or activate staff to
                calculate salary.
              </p>
            </div>
          ) : (
            <div className="staff-table-wrap">

              <table className="salary-table">

                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>P</th>
                    <th>HD</th>
                    <th>A</th>
                    <th>—</th>
                    <th>Full Rate</th>
                    <th>Half Rate</th>
                    <th>Gross</th>
                    <th>Advance</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Mode</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>

                  {activeStaff.map(
                    (staff) => {
                      const salary =
                        calculateSalary(
                          staff
                        );

                      const payment =
                        getPaymentData(
                          staff.id
                        );

                      const advance =
                        Number(
                          payment.advance ||
                            0
                        );

                      const paid =
                        Number(
                          payment.paid || 0
                        );

                      const balance =
                        Math.max(
                          salary.grossSalary -
                            advance -
                            paid,
                          0
                        );

                      return (
                        <tr
                          key={staff.id}
                        >

                          <td>
                            <div className="staff-person compact">
                              <div className="staff-avatar">
                                {String(
                                  staff.name ||
                                    "S"
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <strong>
                                  {
                                    staff.name
                                  }
                                </strong>

                                {staff.role && (
                                  <small>
                                    {
                                      staff.role
                                    }
                                  </small>
                                )}
                              </div>
                            </div>
                          </td>

                          <td>
                            {salary.present}
                          </td>

                          <td>
                            {salary.halfDay}
                          </td>

                          <td>
                            {salary.absent}
                          </td>

                          <td>
                            {salary.notMarked}
                          </td>

                          <td className="money-cell">
                            {formatCurrency(
                              staff.fullDayRate
                            )}
                          </td>

                          <td className="money-cell">
                            {formatCurrency(
                              staff.halfDayRate
                            )}
                          </td>

                          <td className="money-cell strong-money">
                            {formatCurrency(
                              salary.grossSalary
                            )}
                          </td>

                          <td>
                            <input
                              className="salary-input"
                              type="number"
                              min="0"
                              step="any"
                              value={
                                payment.advance
                              }
                              onChange={(
                                event
                              ) =>
                                updatePaymentData(
                                  staff.id,
                                  "advance",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              className="salary-input"
                              type="number"
                              min="0"
                              step="any"
                              value={
                                payment.paid
                              }
                              onChange={(
                                event
                              ) =>
                                updatePaymentData(
                                  staff.id,
                                  "paid",
                                  event
                                    .target
                                    .value
                                )
                              }
                            />
                          </td>

                          <td>
                            <strong
                              className={
                                balance > 0
                                  ? "salary-due"
                                  : "salary-clear"
                              }
                            >
                              {formatCurrency(
                                balance
                              )}
                            </strong>
                          </td>

                          <td>
                            <select
                              className="salary-mode"
                              value={
                                payment.paymentMode ||
                                "Cash"
                              }
                              onChange={(
                                event
                              ) =>
                                updatePaymentData(
                                  staff.id,
                                  "paymentMode",
                                  event
                                    .target
                                    .value
                                )
                              }
                            >
                              {PAYMENT_MODES.map(
                                (mode) => (
                                  <option
                                    key={
                                      mode
                                    }
                                    value={
                                      mode
                                    }
                                  >
                                    {mode}
                                  </option>
                                )
                              )}
                            </select>
                          </td>

                          <td>
                            <div className="staff-actions">

                              <button
                                type="button"
                                className="icon-action"
                                title="View Salary"
                                onClick={() =>
                                  openSalaryPreview(
                                    staff
                                  )
                                }
                              >
                                <Eye
                                  size={15}
                                />
                              </button>

                              <button
                                type="button"
                                className="icon-action"
                                title="Preview Salary Statement"
                                onClick={() =>
                                  openSalaryPreview(
                                    staff
                                  )
                                }
                              >
                                <FileText
                                  size={15}
                                />
                              </button>

                              <button
                                type="button"
                                className="icon-action"
                                title="Print Salary Statement"
                                onClick={() =>
                                  openSalaryPreview(
                                    staff,
                                    true
                                  )
                                }
                              >
                                <Printer
                                  size={15}
                                />
                              </button>

                              <button
                                type="button"
                                className="icon-action pay-action"
                                title="Pay Salary"
                                onClick={() =>
                                  openPayModal(
                                    staff
                                  )
                                }
                              >
                                <WalletCards
                                  size={15}
                                />
                              </button>

                            </div>
                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>
            </div>
          )}

          <div className="salary-equation">
            <span>
              Salary Calculation
            </span>

            <strong>
              Present × Full Day Amount
              {" + "}
              Half Day × Half Day Amount
              {" = "}
              Gross Salary
            </strong>
          </div>

        </section>
      )}

      {/* STAFF DETAILS MODAL */}
      {showStaffModal &&
        selectedStaff && (
          <div
            className="staff-modal-backdrop"
            onMouseDown={() =>
              setShowStaffModal(false)
            }
          >
            <div
              className="staff-modal"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >

              <div className="staff-modal-header">

                <div>
                  <span className="section-kicker">
                    STAFF PROFILE
                  </span>

                  <h2>
                    {selectedStaff.name}
                  </h2>

                  <p>
                    {selectedStaff.role ||
                      "Staff Member"}
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  onClick={() =>
                    setShowStaffModal(false)
                  }
                >
                  <X size={18} />
                </button>

              </div>

              <div className="profile-summary">

                <div className="profile-avatar">
                  {String(
                    selectedStaff.name ||
                      "S"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <strong>
                    {selectedStaff.name}
                  </strong>

                  <span>
                    {selectedStaff.status ===
                    "Inactive"
                      ? "Inactive Staff"
                      : "Active Staff"}
                  </span>
                </div>

              </div>

              <div className="detail-grid">

                <div>
                  <span>Mobile</span>
                  <strong>
                    {selectedStaff.mobile ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>Role</span>
                  <strong>
                    {selectedStaff.role ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <span>Joining Date</span>
                  <strong>
                    {formatDisplayDate(
                      selectedStaff.joiningDate
                    )}
                  </strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>
                    {selectedStaff.status ||
                      "Active"}
                  </strong>
                </div>

                <div>
                  <span>Full Day Rate</span>
                  <strong>
                    {formatCurrency(
                      selectedStaff.fullDayRate
                    )}
                  </strong>
                </div>

                <div>
                  <span>Half Day Rate</span>
                  <strong>
                    {formatCurrency(
                      selectedStaff.halfDayRate
                    )}
                  </strong>
                </div>

              </div>

              <div className="profile-monthly">

                <div className="profile-section-title">
                  Current Month Snapshot
                </div>

                {(() => {
                  const snapshot =
                    getStaffMonthlySnapshot(
                      selectedStaff
                    );

                  return (
                    <div className="monthly-grid">

                      <div>
                        <span>Present</span>
                        <strong>
                          {
                            snapshot.present
                          }
                        </strong>
                      </div>

                      <div>
                        <span>Half Day</span>
                        <strong>
                          {
                            snapshot.halfDay
                          }
                        </strong>
                      </div>

                      <div>
                        <span>Absent</span>
                        <strong>
                          {
                            snapshot.absent
                          }
                        </strong>
                      </div>

                      <div>
                        <span>Gross</span>
                        <strong>
                          {formatCurrency(
                            snapshot.gross
                          )}
                        </strong>
                      </div>

                    </div>
                  );
                })()}

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="staff-secondary-btn"
                  onClick={() => {
                    setShowStaffModal(false);
                    editStaff(
                      selectedStaff
                    );
                  }}
                >
                  <Edit3 size={15} />
                  Edit Staff
                </button>

                <button
                  type="button"
                  className="staff-secondary-btn"
                  onClick={() =>
                    openStaffPreview(
                      selectedStaff
                    )
                  }
                >
                  <FileText size={15} />
                  Preview
                </button>

                <button
                  type="button"
                  className="staff-primary-btn"
                  onClick={() => {
                    setShowStaffModal(false);
                    openStaffPreview(
                      selectedStaff,
                      true
                    );
                  }}
                >
                  <Printer size={15} />
                  Print
                </button>

              </div>

            </div>
          </div>
        )}

      {/* PREVIEW MODAL */}
      {showPreview &&
        previewStaff && (
          <div
            className="staff-modal-backdrop preview-backdrop"
            onMouseDown={closePreview}
          >
            <div
              className="staff-preview-modal"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >

              <div className="preview-toolbar">

                <div>
                  <span className="section-kicker">
                    DOCUMENT PREVIEW
                  </span>

                  <h2>
                    {previewType === "salary"
                      ? "Salary Statement"
                      : "Staff Profile"}
                  </h2>

                  <p>
                    Review the document before
                    printing.
                  </p>
                </div>

                <div className="preview-toolbar-actions">

                  <button
                    type="button"
                    className="staff-secondary-btn"
                    onClick={closePreview}
                  >
                    <X size={16} />
                    Close
                  </button>

                  <button
                    type="button"
                    className="staff-primary-btn"
                    onClick={printPreview}
                  >
                    <Printer size={16} />
                    Print
                  </button>

                </div>

              </div>

              <div className="print-document">

                <div className="print-document-header">

                  <div>
                    <div className="print-business-name">
                      SAO AUTO TRACTOR
                    </div>

                    <div className="print-document-title">
                      {previewType ===
                      "salary"
                        ? "STAFF SALARY STATEMENT"
                        : "STAFF PROFILE"}
                    </div>

                    <div className="print-document-period">
                      {previewType ===
                      "salary"
                        ? `Week: ${weekLabel}`
                        : `Generated: ${formatDisplayDate(
                            getToday()
                          )}`}
                    </div>
                  </div>

                  <div className="print-document-icon">
                    {previewType ===
                    "salary" ? (
                      <ReceiptText
                        size={28}
                      />
                    ) : (
                      <UserRound
                        size={28}
                      />
                    )}
                  </div>

                </div>

                <div className="print-profile-header">

                  <div className="print-profile-avatar">
                    {String(
                      previewStaff.name ||
                        "S"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <h3>
                      {previewStaff.name}
                    </h3>

                    <p>
                      {previewStaff.role ||
                        "Staff Member"}
                    </p>
                  </div>

                </div>

                <div className="preview-info-grid">

                  <div>
                    <span>Mobile</span>
                    <strong>
                      {previewStaff.mobile ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Role</span>
                    <strong>
                      {previewStaff.role ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Joining Date</span>
                    <strong>
                      {formatDisplayDate(
                        previewStaff.joiningDate
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <strong>
                      {previewStaff.status ||
                        "Active"}
                    </strong>
                  </div>

                </div>

                {previewType === "staff" ? (
                  <>
                    <div className="preview-section-title">
                      Rate Information
                    </div>

                    <div className="preview-salary-grid">

                      <div>
                        <span>
                          Full Day Rate
                        </span>

                        <strong>
                          {formatCurrency(
                            previewStaff.fullDayRate
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Half Day Rate
                        </span>

                        <strong>
                          {formatCurrency(
                            previewStaff.halfDayRate
                          )}
                        </strong>
                      </div>

                    </div>

                    {renderAttendancePreview(
                      previewStaff
                    )}

                    <div className="preview-section-title salary-preview-title">
                      Monthly Snapshot
                    </div>

                    {(() => {
                      const snapshot =
                        getStaffMonthlySnapshot(
                          previewStaff
                        );

                      return (
                        <div className="preview-summary-grid">

                          <div>
                            <span>
                              Present
                            </span>

                            <strong>
                              {
                                snapshot.present
                              }
                            </strong>
                          </div>

                          <div>
                            <span>
                              Half Day
                            </span>

                            <strong>
                              {
                                snapshot.halfDay
                              }
                            </strong>
                          </div>

                          <div>
                            <span>
                              Absent
                            </span>

                            <strong>
                              {
                                snapshot.absent
                              }
                            </strong>
                          </div>

                          <div>
                            <span>
                              Gross
                            </span>

                            <strong>
                              {formatCurrency(
                                snapshot.gross
                              )}
                            </strong>
                          </div>

                        </div>
                      );
                    })()}
                  </>
                ) : (
                  renderSalaryPreview(
                    previewStaff
                  )
                )}

                <div className="print-document-footer">
                  <span>
                    SAO AUTO TRACTOR · Staff
                    Management
                  </span>

                  <span>
                    Generated{" "}
                    {formatDisplayDate(
                      getToday()
                    )}
                  </span>
                </div>

              </div>

            </div>
          </div>
        )}

      {/* PAY SALARY MODAL */}
      {showPayModal &&
        payStaff && (
          <div
            className="staff-modal-backdrop"
            onMouseDown={() =>
              setShowPayModal(false)
            }
          >
            <div
              className="staff-modal pay-modal"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >

              <div className="staff-modal-header">

                <div>
                  <span className="section-kicker">
                    SALARY PAYMENT
                  </span>

                  <h2>
                    Pay Salary
                  </h2>

                  <p>
                    {payStaff.name} ·{" "}
                    {weekLabel}
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  onClick={() =>
                    setShowPayModal(false)
                  }
                >
                  <X size={18} />
                </button>

              </div>

              {(() => {
                const salary =
                  calculateSalary(
                    payStaff
                  );

                const payment =
                  getPaymentData(
                    payStaff.id
                  );

                const currentBalance =
                  Math.max(
                    salary.grossSalary -
                      Number(
                        payment.advance ||
                          0
                      ) -
                      Number(
                        payment.paid ||
                          0
                      ),
                    0
                  );

                return (
                  <>
                    <div className="pay-summary-card">

                      <div>
                        <span>
                          Gross Salary
                        </span>

                        <strong>
                          {formatCurrency(
                            salary.grossSalary
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Current Balance
                        </span>

                        <strong>
                          {formatCurrency(
                            currentBalance
                          )}
                        </strong>
                      </div>

                    </div>

                    <div className="pay-form">

                      <div className="staff-field">
                        <label>
                          Payment Amount *
                        </label>

                        <div className="input-with-prefix">
                          <span>₹</span>

                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={
                              payAmount
                            }
                            onChange={(e) =>
                              setPayAmount(
                                e.target
                                  .value
                              )
                            }
                            placeholder="Enter amount"
                          />
                        </div>
                      </div>

                      <div className="staff-field">
                        <label>
                          Payment Mode
                        </label>

                        <select
                          value={payMode}
                          onChange={(e) =>
                            setPayMode(
                              e.target
                                .value
                            )
                          }
                        >
                          {PAYMENT_MODES.map(
                            (mode) => (
                              <option
                                key={mode}
                                value={mode}
                              >
                                {mode}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div className="staff-field full-width">
                        <label>
                          Notes
                        </label>

                        <textarea
                          rows="3"
                          value={payNotes}
                          onChange={(e) =>
                            setPayNotes(
                              e.target
                                .value
                            )
                          }
                          placeholder="Optional payment note..."
                        />
                      </div>

                    </div>

                    <div className="modal-actions">

                      <button
                        type="button"
                        className="staff-secondary-btn"
                        onClick={() =>
                          setShowPayModal(
                            false
                          )
                        }
                      >
                        <X size={15} />
                        Cancel
                      </button>

                      <button
                        type="button"
                        className="staff-primary-btn"
                        onClick={
                          saveSalaryPayment
                        }
                      >
                        <CreditCard
                          size={15}
                        />
                        Save Payment
                      </button>

                    </div>
                  </>
                );
              })()}

            </div>
          </div>
        )}

      {/* TOAST */}
      {toast && (
        <div className="staff-toast">
          <CheckCircle2 size={16} />
          {toast}
        </div>
      )}

    </div>
  );
}

export default StaffManagement;