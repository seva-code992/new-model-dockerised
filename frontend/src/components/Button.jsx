import React from "react";

/**
 * The one button used everywhere (Copy, Close, Save, Export ...).
 * variant: "default" (grey) | "primary" (blue)
 * size:    "medium" | "small"
 */
export default function Button({ variant = "default", size = "medium", className = "", type = "button", children, ...rest }) {
  const classes = ["button", variant !== "default" && `button--${variant}`, size !== "medium" && `button--${size}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
