/**
 * modules/utils/helpers.js
 * Generic utility functions: unit conversions, numeric validation, DOM helpers, date formatting.
 */

// ─── Unit conversions ────────────────────────────────────────────────────────

export function convertToFeetCalc(value, unit) {
  switch (unit) {
    case 'mm': return value * 0.00328084;
    case 'cm': return value * 0.0328084;
    case 'in': return value / 12.0;
    case 'm':  return value * 3.28084;
    default:   return value;
  }
}

export function convertFromMm(valueMm, unit) {
  switch (unit) {
    case 'mm': return valueMm;
    case 'cm': return valueMm / 10;
    case 'in': return valueMm / 25.4;
    case 'm':  return valueMm / 1000;
    case 'ft': return valueMm * 0.00328084;
    default:   return valueMm;
  }
}

export function convertToMm(val, unit) {
  switch (unit) {
    case 'mm': return val;
    case 'cm': return val * 10;
    case 'in': return val * 25.4;
    case 'm':  return val * 1000;
    case 'ft': return val / 0.00328084;
    default:   return val;
  }
}

// ─── Numeric input validation ─────────────────────────────────────────────────

export function validateNumericInput(input, min = 0, max = Infinity) {
  let value = parseFloat(input.value);
  if (isNaN(value) || value < min) {
    input.value = min;
    value = min;
  } else if (value > max) {
    input.value = max;
    value = max;
  }
  return value;
}

// ─── Date formatting ──────────────────────────────────────────────────────────

export function formatSavedDate(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (e) {
    return isoString;
  }
}

// ─── DOM row highlight helpers ────────────────────────────────────────────────

export function highlightMoveRow(dataAttrName, dataAttrValue) {
  setTimeout(() => {
    const rows = document.querySelectorAll(`tr[${dataAttrName}="${dataAttrValue}"]`);
    rows.forEach(row => {
      row.classList.remove('row-highlight');
      void row.offsetWidth;
      row.classList.add('row-highlight');
      setTimeout(() => row.classList.remove('row-highlight'), 2000);
    });
  }, 50);
}

export function blinkRow(element) {
  if (!element) return;
  element.classList.remove('row-highlight');
  void element.offsetWidth;
  element.classList.add('row-highlight');
  setTimeout(() => element.classList.remove('row-highlight'), 2000);
}
