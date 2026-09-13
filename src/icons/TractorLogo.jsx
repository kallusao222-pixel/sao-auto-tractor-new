/**
 * Custom SAO Auto Tractor logo mark.
 * Uses currentColor so it inherits parent text color.
 */
export default function TractorLogo({ size = 24, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Cab / body */}
      <path
        d="M14 30V18h4l3-5h9l3 5h6c2.2 0 4 1.8 4 4v8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cabin window */}
      <rect
        x="21"
        y="17"
        width="9"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Chimney */}
      <path
        d="M16 18v-4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Big wheel */}
      <circle cx="34" cy="34" r="6" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="34" cy="34" r="2" fill="currentColor" />
      {/* Small wheel */}
      <circle cx="14" cy="36" r="4" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="14" cy="36" r="1.5" fill="currentColor" />
      {/* Axle */}
      <path
        d="M18 36h10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}