import { formatCurrency } from './currency.js';

export function generateUniversalInvoice({
  title,
  customLines = [],
  unitPrice,
  quantity,
  options = {},
  currency,
  isTaxEnabled = false,
  taxPercent = 0,
}) {
  const showQty = Object.prototype.hasOwnProperty.call(options, 'showQty') ? options.showQty : true;
  const showTotal = Object.prototype.hasOwnProperty.call(options, 'showTotal') ? options.showTotal : true;
  const showPrice = Object.prototype.hasOwnProperty.call(options, 'showPrice') ? options.showPrice : true;
  const unitLabel = Object.prototype.hasOwnProperty.call(options, 'unitLabel') ? options.unitLabel : '/pc';
  const currencySymbol = currency?.symbol || '';

  let text = `${title}\n`;

  customLines.forEach((line) => {
    if (line && line.trim() !== '') {
      text += `${line}\n`;
    }
  });

  if (showPrice) {
    text += `Price : ${currencySymbol}${formatCurrency(unitPrice, currency)}${unitLabel}\n`;
  }

  if (showQty) {
    text += `Qty : ${quantity} pcs\n`;
  }

  const subTotal = unitPrice * quantity;
  let finalTotal = subTotal;

  if (isTaxEnabled) {
    const taxAmount = subTotal * (taxPercent / 100);
    finalTotal += taxAmount;

    if (showTotal) {
      text += `Tax (${taxPercent}%): ${currencySymbol}${formatCurrency(taxAmount, currency)}\n`;
    }
  }

  if (showTotal) {
    text += `Total : ${currencySymbol}${formatCurrency(finalTotal, currency)}`;
  }

  return text;
}
