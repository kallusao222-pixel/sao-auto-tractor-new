import "./Card.css";

export default function Card({
  children,
  padding = "md",
  interactive = false,
  className = "",
  ...rest
}) {
  const classes = [
    "card",
    `card--pad-${padding}`,
    interactive && "card--interactive",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}