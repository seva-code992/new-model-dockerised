import React from "react";

/**
 * A name field for groups and categories. A name that still has its default value is cleared on the
 * first click, so the user can just type, and the default comes back if it is left empty.
 * A name the user chose is edited in place.
 */
export default function NameInput({ value, defaultName, onChange, className, label }) {
  const isDefault = defaultName !== undefined && value === defaultName;
  return (
    <input
      className={className}
      value={value}
      placeholder={defaultName}
      aria-label={label}
      onFocus={() => { if (isDefault) onChange(""); }}
      onBlur={() => { if (!value.trim() && defaultName !== undefined) onChange(defaultName); }}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
