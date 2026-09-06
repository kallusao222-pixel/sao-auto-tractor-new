import Badge from "./Badge";

function StatusBadge({
  status = "",
  label,
  size = "medium",
}) {
  const normalizedStatus = String(
    status || "",
  )
    .trim()
    .toLowerCase();

  let variant = "neutral";

  if (
    normalizedStatus === "active" ||
    normalizedStatus === "paid" ||
    normalizedStatus === "completed" ||
    normalizedStatus === "loading"
  ) {
    variant = "success";
  } else if (
    normalizedStatus === "pending" ||
    normalizedStatus === "unloading"
  ) {
    variant = "warning";
  } else if (
    normalizedStatus === "inactive" ||
    normalizedStatus === "due" ||
    normalizedStatus === "cancelled"
  ) {
    variant = "danger";
  } else if (
    normalizedStatus === "site to site"
  ) {
    variant = "info";
  }

  return (
    <Badge
      variant={variant}
      size={size}
    >
      {label || status || "Unknown"}
    </Badge>
  );
}

export default StatusBadge;