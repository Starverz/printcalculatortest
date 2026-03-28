export function formatCurrency(amount, currency) {
  const numericAmount = Number(amount);

  if (Number.isNaN(numericAmount)) {
    return '0';
  }

  const decimalDigits = typeof currency?.decimal_digits === 'number'
    ? currency.decimal_digits
    : 0;

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits,
  }).format(numericAmount);
}
