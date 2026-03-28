// modules/calculators/acrylic.js
// Acrylic & Wood Calculator Module

const ACRYLIC_A_SIZES = {
  'A6': [105, 148], 'A5': [148, 210], 'A4': [210, 297], 'A3': [297, 420], 'A2': [420, 594]
};

// --- HELPERS ---

export function getAcrylicBaseLabel(label) {
  return (label || '').split('(')[0].trim();
}

export function formatAcrylicUnitLabel(name, price, ctx) {
  const currency = ctx.getCurrentCurrency();
  return `${name} (${currency.symbol}${Number(price).toFixed(2)}/in²)`;
}

export function adjustAcrylicPrice(original, ctx) {
  const acrylicMarkupRules = ctx.getAcrylicMarkupRules();
  const acrylicState = ctx.getAcrylicState();
  const rules = acrylicMarkupRules[acrylicState.userMode] || acrylicMarkupRules.customer;
  const rule = rules.find(r => original <= r.threshold);
  if (!rule) return { price: original, note: "Original" };

  const adjusted = original * rule.multiplier;
  let note = "Original";
  if (rule.multiplier > 1) note = `+ ${((rule.multiplier - 1) * 100).toFixed(0)}% (Markup)`;
  else if (rule.multiplier < 1) note = `- ${((1 - rule.multiplier) * 100).toFixed(0)}% (Discount)`;

  return { price: Math.round(adjusted * 300) / 300, note };
}

export function convertAcrylicValue(val, from, to) {
  let inchVal;
  switch (from) {
    case 'mm': inchVal = val / 25.4; break;
    case 'cm': inchVal = val / 2.54; break;
    case 'm': inchVal = val * 39.37; break;
    case 'ft': inchVal = val * 12; break;
    default: inchVal = val;
  }
  switch (to) {
    case 'mm': return inchVal * 25.4;
    case 'cm': return inchVal * 2.54;
    case 'm': return inchVal / 39.37;
    case 'ft': return inchVal / 12;
    default: return inchVal;
  }
}

// --- UI HELPERS ---

export function fillAcrylicDropdown(selectEl, arr, defIndex = 2, noneLabel = "None", ctx) {
  selectEl.innerHTML = "";

  const wrapper = selectEl.closest('.custom-sticker-dropdown');
  const optionsContainer = wrapper ? wrapper.querySelector('.custom-sticker-dropdown-options') : null;
  const labelEl = wrapper ? wrapper.querySelector('.custom-sticker-dropdown-label') : null;

  if (optionsContainer) optionsContainer.innerHTML = "";

  let none = document.createElement('option');
  none.value = -1;
  none.textContent = noneLabel;

  if (defIndex === -1) {
    none.selected = true;
    if (labelEl) labelEl.textContent = noneLabel;
  }
  selectEl.appendChild(none);

  if (optionsContainer) {
    let noneStr = `<div class="custom-sticker-dropdown-option ${defIndex === -1 ? 'selected' : ''}" onmousedown="selectGenericStickerDropdownOption('${selectEl.id}', '${wrapper.id}', '-1', 'calculateAcrylicPrice')">${noneLabel}</div>`;
    optionsContainer.insertAdjacentHTML('beforeend', noneStr);
  }

  arr.forEach((item, i) => {
    let opt = document.createElement('option');
    opt.value = i;
    opt.textContent = item.label;
    if (i === defIndex) {
      opt.selected = true;
      if (labelEl) labelEl.textContent = item.label;
    }
    selectEl.appendChild(opt);

    if (optionsContainer) {
      let optStr = `<div class="custom-sticker-dropdown-option ${i === defIndex ? 'selected' : ''}" onmousedown="selectGenericStickerDropdownOption('${selectEl.id}', '${wrapper.id}', '${i}', 'calculateAcrylicPrice')">${item.label}</div>`;
      optionsContainer.insertAdjacentHTML('beforeend', optStr);
    }
  });

  if (wrapper) {
    ctx.syncStickerDropdownLabel(selectEl.id, wrapper.id);
  }
}

export function fillAllAcrylicDropdowns(currentIndices = {}, ctx) {
  const acrylicPriceTable = ctx.getAcrylicPriceTable();
  const acrylicState = ctx.getAcrylicState();
  const acrylicEl = document.getElementById('acrylic');
  const printingEl = document.getElementById('printing');
  const standEl = document.getElementById('stand');
  if (!acrylicEl) return;

  fillAcrylicDropdown(acrylicEl, acrylicPriceTable[acrylicState.userMode].acrylic, 2, "None", ctx);
  fillAcrylicDropdown(printingEl, acrylicPriceTable[acrylicState.userMode].print, 0, "None", ctx);
  fillAcrylicDropdown(standEl, acrylicPriceTable[acrylicState.userMode].stand, 1, "None", ctx);

  if (currentIndices.acrylic !== undefined && currentIndices.acrylic < acrylicEl.options.length) acrylicEl.selectedIndex = currentIndices.acrylic;
  if (currentIndices.printing !== undefined && currentIndices.printing < printingEl.options.length) printingEl.selectedIndex = currentIndices.printing;
  if (currentIndices.stand !== undefined && currentIndices.stand < standEl.options.length) standEl.selectedIndex = currentIndices.stand;
}

export function highlightAcrylicPreset(size) {
  document.querySelectorAll('#presetGroup .btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.size === size) btn.classList.add('active');
  });
}

export function setAcrylicASize(size, ctx) {
  const acrylicState = ctx.getAcrylicState();
  const widthEl = document.getElementById('width');
  const heightEl = document.getElementById('height');
  const unitEl = document.getElementById('unit');

  let [wMM, hMM] = ACRYLIC_A_SIZES[size];
  acrylicState.ignoreManualChange = true;
  widthEl.value = parseFloat(convertAcrylicValue(wMM, 'mm', unitEl.value).toFixed(2));
  heightEl.value = parseFloat(convertAcrylicValue(hMM, 'mm', unitEl.value).toFixed(2));
  acrylicState.presetActive = size;
  highlightAcrylicPreset(size);
  acrylicState.ignoreManualChange = false;
  calculateAcrylicPrice(ctx);
}

export function checkAcrylicPresetActive(ctx) {
  const acrylicState = ctx.getAcrylicState();
  if (acrylicState.ignoreManualChange || !acrylicState.presetActive) return;
  const widthEl = document.getElementById('width');
  const heightEl = document.getElementById('height');
  const unitEl = document.getElementById('unit');

  let [wMM, hMM] = ACRYLIC_A_SIZES[acrylicState.presetActive];
  let presetW = parseFloat(convertAcrylicValue(wMM, 'mm', unitEl.value).toFixed(2));
  let presetH = parseFloat(convertAcrylicValue(hMM, 'mm', unitEl.value).toFixed(2));
  let curW = parseFloat(widthEl.value);
  let curH = parseFloat(heightEl.value);

  if (Math.abs(curW - presetW) > 0.05 || Math.abs(curH - presetH) > 0.05) {
    acrylicState.presetActive = null;
    highlightAcrylicPreset(null);
  }
}

export function checkAcrylicManualInput(ctx) {
  const acrylicState = ctx.getAcrylicState();
  if (acrylicState.presetActive) return;
  const widthEl = document.getElementById('width');
  const heightEl = document.getElementById('height');
  const unitEl = document.getElementById('unit');

  const curW = parseFloat(widthEl.value);
  const curH = parseFloat(heightEl.value);

  for (const size in ACRYLIC_A_SIZES) {
    let [wMM, hMM] = ACRYLIC_A_SIZES[size];
    let presetW = parseFloat(convertAcrylicValue(wMM, 'mm', unitEl.value).toFixed(2));
    let presetH = parseFloat(convertAcrylicValue(hMM, 'mm', unitEl.value).toFixed(2));

    const isMatch = (Math.abs(curW - presetW) < 0.05 && Math.abs(curH - presetH) < 0.05) ||
      (Math.abs(curW - presetH) < 0.05 && Math.abs(curH - presetW) < 0.05);
    if (isMatch) {
      setAcrylicASize(size, ctx);
      break;
    }
  }
}

export function handleAcrylicUserToggle(newUserMode, ctx) {
  const acrylicState = ctx.getAcrylicState();
  const acrylicEl = document.getElementById('acrylic');
  const printingEl = document.getElementById('printing');
  const standEl = document.getElementById('stand');

  const currentSelections = {
    acrylic: acrylicEl.selectedIndex,
    printing: printingEl.selectedIndex,
    stand: standEl.selectedIndex
  };

  acrylicState.userMode = newUserMode;
  const btnCustomer = document.getElementById('btnCustomer');
  const btnAgent = document.getElementById('btnAgent');

  if (newUserMode === 'customer') {
    btnCustomer.classList.add('active');
    btnCustomer.classList.remove('active-agent');
    btnAgent.classList.remove('active', 'active-agent');
  } else {
    btnAgent.classList.add('active', 'active-agent');
    btnCustomer.classList.remove('active', 'active-agent');
  }

  const calcRoot = document.querySelector('.w-full.max-w-5xl');
  if (calcRoot) {
    const optionBtns = calcRoot.querySelectorAll('.size-btn');
    optionBtns.forEach(btn => {
      if (btn.id === 'btnCustomer' || btn.id === 'btnAgent') return;
      if (newUserMode === 'agent') {
        btn.classList.add('agent-active');
      } else {
        btn.classList.remove('agent-active');
      }
    });
  }

  fillAllAcrylicDropdowns(currentSelections, ctx);
  calculateAcrylicPrice(ctx);
  updateAcrylicPriceList(ctx);
}

// --- CALCULATION & PREVIEW ---

export function calculateAcrylicPrice(ctx) {
  const acrylicPriceTable = ctx.getAcrylicPriceTable();
  const acrylicState = ctx.getAcrylicState();
  const currency = ctx.getCurrentCurrency();
  const { formatCurrency } = ctx;

  const widthEl = document.getElementById('width');
  const heightEl = document.getElementById('height');
  const unitEl = document.getElementById('unit');
  const acrylicEl = document.getElementById('acrylic');
  const printingEl = document.getElementById('printing');
  const standEl = document.getElementById('stand');
  const totalPriceEl = document.getElementById('totalPrice');
  const invoiceEl = document.getElementById('invoice');

  let w = parseFloat(widthEl.value) || 0;
  let h = parseFloat(heightEl.value) || 0;
  let wInch = convertAcrylicValue(w, unitEl.value, 'inch');
  let hInch = convertAcrylicValue(h, unitEl.value, 'inch');
  let areaBody = wInch * hInch;

  let acrylicIdx = parseInt(acrylicEl.value);
  let printIdx = parseInt(printingEl.value);
  let standIdx = parseInt(standEl.value);

  let acrylicCost = 0, printCost = 0, standCost = 0;

  if (acrylicIdx >= 0) {
    const materialPrice = acrylicPriceTable[acrylicState.userMode].acrylic[acrylicIdx].price;
    acrylicCost = areaBody * materialPrice;
    if (standIdx >= 0) {
      let standHeight = parseFloat(acrylicPriceTable[acrylicState.userMode].stand[standIdx].label.split('in')[0]);
      let standArea = wInch * standHeight;
      standCost = standArea * materialPrice;
    }
  }

  if (printIdx >= 0) {
    let basePrintCost = areaBody * acrylicPriceTable[acrylicState.userMode].print[printIdx].price;
    printCost = basePrintCost * acrylicState.printSideMultiplier;
  }

  let total = acrylicCost + printCost + standCost;
  let { price: totalAdjusted, note } = adjustAcrylicPrice(total, ctx);

  const activeColor = acrylicState.userMode === 'agent' ? 'var(--success-color)' : 'var(--primary-color)';
  totalPriceEl.textContent = `Total: ${currency.symbol}${formatCurrency(totalAdjusted)} `;
  totalPriceEl.style.color = activeColor;

  let tag = acrylicState.userMode === "agent" ? " (Agent)" : "";
  let invoiceHtml = `<div class="mb-1"> <span class="font-bold">Body Size:</span> ${wInch.toFixed(2)}in x ${hInch.toFixed(2)}in = ${(areaBody).toFixed(2)}in²</div> `;
  invoiceHtml += acrylicIdx >= 0 ? `<div> <span class="font-bold">Material Cost${tag}:</span> ${currency.symbol}${formatCurrency(acrylicCost)}</div> ` : '';

  if (printIdx >= 0) {
    const sideText = acrylicState.printSideMultiplier > 1 ? ` (${acrylicState.printSideMultiplier} Sides)` : ' (1 Side)';
    invoiceHtml += `<div> <span class="font-bold">Print Cost${sideText}${tag}:</span> ${currency.symbol}${formatCurrency(printCost)}</div> `;
  }

  if (standIdx >= 0 && acrylicIdx >= 0) {
    invoiceHtml += `<hr class="my-1" style="border-color: var(--border-color);"> <div><span class="font-bold">Stand Cost${tag}:</span> ${currency.symbol}${formatCurrency(standCost)}</div>`;
  }

  invoiceHtml += `<div class="mt-2 pt-2" style="border-top: 1px solid var(--border-color);"><span class="font-bold">Original Total:</span> <span class="line-through text-red-500 font-semibold">${currency.symbol}${formatCurrency(total)}</span></div>
          <div class="font-bold text-lg" style="color: ${activeColor};"> Final Price: ${currency.symbol}${formatCurrency(totalAdjusted)} <span class="ml-2 text-sm font-normal" style="color: var(--text-secondary);">(${note})</span></div>`;

  invoiceEl.innerHTML = invoiceHtml;

  standEl.disabled = (acrylicIdx === -1);
  if (acrylicIdx === -1) standEl.selectedIndex = 0;

  const btnSide1 = document.getElementById('btnSide1');
  const btnSide2 = document.getElementById('btnSide2');

  if (printIdx === -1) {
    btnSide1.disabled = true;
    btnSide2.disabled = true;
    if (acrylicState.printSideMultiplier !== 1) {
      acrylicState.printSideMultiplier = 1;
      btnSide1.classList.add('active');
      btnSide2.classList.remove('active');
    }
  } else {
    btnSide1.disabled = false;
    btnSide2.disabled = false;
  }

  drawAcrylicPreview(ctx);
  updateCopyableAcrylicInvoice(ctx);
  updateAcrylicPriceList(ctx);
}

export function drawAcrylicPreview(ctx) {
  const acrylicState = ctx.getAcrylicState();
  const canvas = document.getElementById('previewCanvas');
  if (!canvas) return;
  const canvasCtx = canvas.getContext('2d');
  const widthEl = document.getElementById('width');
  const heightEl = document.getElementById('height');
  const cornerRadiusEl = document.getElementById('cornerRadius');
  const unitEl = document.getElementById('unit');

  const w = parseFloat(widthEl.value) || 0;
  const h = parseFloat(heightEl.value) || 0;
  const radiusVal = parseFloat(cornerRadiusEl.value) || 0;
  const unitSel = unitEl.value;

  const wInch = convertAcrylicValue(w, unitSel, 'inch');
  const hInch = convertAcrylicValue(h, unitSel, 'inch');
  const radiusInch = convertAcrylicValue(radiusVal, unitSel, 'inch');

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const padding = 140;
  const drawableWidth = canvasWidth - padding;
  const drawableHeight = canvasHeight - padding;

  canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);

  if (wInch <= 0 || hInch <= 0) {
    canvasCtx.fillStyle = '#111827';
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'middle';
    canvasCtx.font = '16px sans-serif';
    canvasCtx.fillText('Enter dimensions to see preview', canvasWidth / 2, canvasHeight / 2);
    return;
  }

  const scale = Math.min(drawableWidth / wInch, drawableHeight / hInch);
  const previewWidth = wInch * scale;
  const previewHeight = hInch * scale;
  let previewRadius = radiusInch * scale;
  previewRadius = Math.max(0, Math.min(previewRadius, previewWidth / 2, previewHeight / 2));

  const startX = (canvasWidth - previewWidth) / 2;
  const startY = (canvasHeight - previewHeight) / 2;

  const grad = canvasCtx.createLinearGradient(startX, startY, startX, startY + previewHeight);
  grad.addColorStop(0, "#007BFF");
  grad.addColorStop(1, "#17a2b8");
  canvasCtx.fillStyle = grad;
  canvasCtx.strokeStyle = "#007BFF";
  canvasCtx.lineWidth = 2;

  canvasCtx.beginPath();
  canvasCtx.moveTo(startX + previewRadius, startY);
  canvasCtx.arcTo(startX + previewWidth, startY, startX + previewWidth, startY + previewHeight, previewRadius);
  canvasCtx.arcTo(startX + previewWidth, startY + previewHeight, startX, startY + previewHeight, previewRadius);
  canvasCtx.arcTo(startX, startY + previewHeight, startX, startY, previewRadius);
  canvasCtx.arcTo(startX, startY, startX + previewWidth, startY, previewRadius);
  canvasCtx.closePath();
  canvasCtx.fill();
  canvasCtx.stroke();

  canvasCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--danger-color').trim() || '#dc3545';
  canvasCtx.fillStyle = '#111827';
  canvasCtx.lineWidth = 1.5;
  canvasCtx.font = 'bold 14px sans-serif';

  const drawTick = (x, y, dir) => {
    canvasCtx.beginPath();
    if (dir === 'v') { canvasCtx.moveTo(x - 5, y); canvasCtx.lineTo(x + 5, y); }
    else { canvasCtx.moveTo(x, y - 5); canvasCtx.lineTo(x, y + 5); }
    canvasCtx.stroke();
  };

  const heightLineX = startX - 25;
  canvasCtx.beginPath(); canvasCtx.moveTo(heightLineX, startY); canvasCtx.lineTo(heightLineX, startY + previewHeight); canvasCtx.stroke();
  drawTick(heightLineX, startY, 'v'); drawTick(heightLineX, startY + previewHeight, 'v');

  canvasCtx.save();
  canvasCtx.translate(heightLineX - 10, startY + previewHeight / 2);
  canvasCtx.rotate(-Math.PI / 2);
  canvasCtx.textAlign = 'center';
  canvasCtx.textBaseline = 'bottom';
  canvasCtx.fillText(`${h.toFixed(2)} ${unitSel} `, 0, 0);
  canvasCtx.restore();

  const widthLineY = startY - 25;
  canvasCtx.beginPath(); canvasCtx.moveTo(startX, widthLineY); canvasCtx.lineTo(startX + previewWidth, widthLineY); canvasCtx.stroke();
  drawTick(startX, widthLineY, 'h'); drawTick(startX + previewWidth, widthLineY, 'h');

  canvasCtx.textAlign = 'center';
  canvasCtx.textBaseline = 'bottom';
  canvasCtx.fillText(`${w.toFixed(2)} ${unitSel} `, startX + previewWidth / 2, widthLineY - 8);

  if (acrylicState.presetActive) {
    const labelY = startY + previewHeight + 40;
    canvasCtx.font = 'bold 18px Poppins';
    canvasCtx.fillStyle = '#111827';
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'top';
    canvasCtx.fillText(acrylicState.presetActive, startX + previewWidth / 2, labelY);
  }
}

export function generateAcrylicSvg() {
  const w = parseFloat(document.getElementById('width').value) || 0;
  const h = parseFloat(document.getElementById('height').value) || 0;
  const radiusVal = parseFloat(document.getElementById('cornerRadius').value) || 0;
  const unitSel = document.getElementById('unit').value;

  const wInch = convertAcrylicValue(w, unitSel, 'inch');
  const hInch = convertAcrylicValue(h, unitSel, 'inch');
  let radiusInch = convertAcrylicValue(radiusVal, unitSel, 'inch');
  radiusInch = Math.max(0, Math.min(radiusInch, wInch / 2, hInch / 2));

  const shapePath = `M ${radiusInch}, 0 L ${wInch - radiusInch}, 0 A ${radiusInch},${radiusInch} 0 0 1 ${wInch},${radiusInch} L ${wInch},${hInch - radiusInch} A ${radiusInch},${radiusInch} 0 0 1 ${wInch - radiusInch},${hInch} L ${radiusInch},${hInch} A ${radiusInch},${radiusInch} 0 0 1 0, ${hInch - radiusInch} L 0, ${radiusInch} A ${radiusInch},${radiusInch} 0 0 1 ${radiusInch}, 0`;

  const fillColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') + '33';
  const strokeColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');

  return `< svg width = "${w}${unitSel}" height = "${h}${unitSel}" viewBox = "0 0 ${wInch} ${hInch}" xmlns = "http://www.w3.org/2000/svg" > <path d="${shapePath}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="0.02" vector-effect="non-scaling-stroke" /></svg > `;
}

export function updateCopyableAcrylicInvoice(ctx) {
  const acrylicPriceTable = ctx.getAcrylicPriceTable();
  const acrylicState = ctx.getAcrylicState();
  const currency = ctx.getCurrentCurrency();
  const { formatCurrency } = ctx;

  const widthEl = document.getElementById('width');
  const heightEl = document.getElementById('height');
  const unitEl = document.getElementById('unit');
  const acrylicEl = document.getElementById('acrylic');
  const printingEl = document.getElementById('printing');
  const standEl = document.getElementById('stand');
  const totalPriceEl = document.getElementById('totalPrice');
  const copyableInvoice = document.getElementById('copyableInvoice');

  let w = parseFloat(widthEl.value) || 0;
  let h = parseFloat(heightEl.value) || 0;
  let unitSel = unitEl.value;
  let acrylicIdx = parseInt(acrylicEl.value);
  let printIdx = parseInt(printingEl.value);
  let standIdx = parseInt(standEl.value);
  let tempTotal = parseFloat(totalPriceEl.textContent.replace(/[^\d.-]/g, '')) || 0;

  let invoiceLines = [];
  let sizeString = `Size: `;
  if (acrylicState.presetActive) sizeString += `(${acrylicState.presetActive}) `;
  sizeString += `${w}${unitSel} (W) x ${h}${unitSel} (H)`;
  invoiceLines.push(sizeString);

  if (acrylicIdx >= 0) {
    const materialLabel = acrylicPriceTable[acrylicState.userMode].acrylic[acrylicIdx].label.split('(')[0].trim();
    invoiceLines.push(`Material: ${materialLabel} `);
  }
  if (printIdx >= 0) {
    const printLabel = acrylicPriceTable[acrylicState.userMode].print[printIdx].label.split('(')[0].trim();
    const sideLabel = acrylicState.printSideMultiplier === 1 ? 'One Side' : 'Two Side';
    invoiceLines.push(`Print: ${printLabel} ${sideLabel} `);
  }
  if (standIdx >= 0) {
    const standLabel = acrylicPriceTable[acrylicState.userMode].stand[standIdx].label;
    invoiceLines.push(`Stand: ${standLabel} `);
  }

  invoiceLines.push(`Price: ${currency.symbol}${formatCurrency(tempTotal)} `);
  copyableInvoice.value = invoiceLines.join('\n');
}

// --- PRICE LIST & SETTINGS UI ---

export function renderAcrylicPriceListHTML(userMode, showCompareBtn = true, showHeader = true, ctx) {
  const acrylicPriceTable = ctx.getAcrylicPriceTable();
  const { formatCurrency } = ctx;
  const title = userMode === 'customer' ? 'ACRYLIC PRICE LIST (CUSTOMER)' : 'ACRYLIC PRICE LIST (AGENT)';

  const ASIZE_STANDS = {
    'A6': { mm: [105, 148], standHeightIn: 1.8 },
    'A5': { mm: [148, 210], standHeightIn: 1.8 },
    'A4': { mm: [210, 297], standHeightIn: 2.5 },
    'A3': { mm: [297, 420], standHeightIn: 2.5 },
    'A2': { mm: [420, 594], standHeightIn: 0 }
  };
  const aSizes = Object.keys(ASIZE_STANDS);
  let tableBodyHTML = '';
  const uvPrintPricePerSqIn = acrylicPriceTable[userMode].print[0]?.price || 0;

  acrylicPriceTable[userMode].acrylic.forEach(material => {
    const materialName = material.label.split('(')[0].trim();
    const materialPricePerSqIn = material.price;
    tableBodyHTML += `<tr class="border-b border-gray-200 dark:border-gray-700">`;
    tableBodyHTML += `<td class="p-3 text-left text-gray-800 dark:text-gray-200 font-semibold"> ${materialName}</td>`;

    aSizes.forEach(sizeKey => {
      const sizeData = ASIZE_STANDS[sizeKey];
      const wInch = convertAcrylicValue(sizeData.mm[0], 'mm', 'inch');
      const hInch = convertAcrylicValue(sizeData.mm[1], 'mm', 'inch');
      const areaBody = wInch * hInch;

      const acrylicCost = areaBody * materialPricePerSqIn;
      const standHeightIn = sizeData.standHeightIn;
      const standArea = wInch * standHeightIn;
      const standCost = standArea * materialPricePerSqIn;

      const printCost1Side = areaBody * uvPrintPricePerSqIn;
      const printCost2Side = printCost1Side * 2;

      const total1Side_Original = acrylicCost + standCost + printCost1Side;
      const total2Side_Original = acrylicCost + standCost + printCost2Side;

      const { price: finalPrice1Side } = adjustAcrylicPrice(total1Side_Original, ctx);
      const { price: finalPrice2Side } = adjustAcrylicPrice(total2Side_Original, ctx);

      tableBodyHTML += `<td class="p-3 text-gray-600 dark:text-gray-400"> ${formatCurrency(finalPrice1Side)}</td>`;
      tableBodyHTML += `<td class="p-3 text-gray-600 dark:text-gray-400"> ${formatCurrency(finalPrice2Side)}</td>`;
    });
    tableBodyHTML += `</tr>`;
  });

  return `
            ${showHeader ? `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
              <h2 class="font-extrabold text-3xl tracking-wide acrylic-title" style="margin: 0; flex: 1;">${title}</h2>
              ${showCompareBtn ? `<button onclick="openAcrylicCompareModal()" style="
                background-color: #e53e3e;
                border: none;
                color: white;
                width: 48px;
                height: 48px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                flex-shrink: 0;
                transition: all 0.3s ease;
                font-size: 20px;
              " class="hover:opacity-80" title="Compare Customer vs Agent Prices"><i class="fas fa-columns"></i></button>` : ''}
            </div>` : ''}
            <div class="overflow-x-auto">
                <table class="w-full border-collapse text-sm text-center">
                    <thead class="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th class="p-3 text-left font-semibold border-b-2 border-blue-600 dark:border-blue-500 text-gray-800 dark:text-white">MATERIAL</th>
                            ${aSizes.map(size => `<th colspan="2" class="p-3 font-semibold border-b-2 border-blue-600 dark:border-blue-500 text-gray-800 dark:text-white">${size}</th>`).join('')}
                        </tr>
                        <tr>
                            <th class="p-2 text-left font-medium text-gray-600 dark:text-gray-200"></th>
                            ${aSizes.map(() => `<th class="p-2 font-medium text-gray-600 dark:text-gray-200">1 Side</th><th class="p-2 font-medium text-gray-600 dark:text-gray-200">2 Side</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody class="bg-white dark:bg-gray-800">${tableBodyHTML}</tbody>
                </table>
            </div>
            <p class="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">*Prices include UV Print and default stand (A6/A5: 1.8in, A4/A3: 2.5in). A2 has no stand.</p>
  `;
}

export function updateAcrylicPriceList(ctx) {
  const acrylicState = ctx.getAcrylicState();
  const { downloadElementAsJPG } = ctx;
  const container = document.getElementById('acrylicPriceListContainer');
  if (container) {
    const content = renderAcrylicPriceListHTML(acrylicState.userMode, true, true, ctx);
    container.innerHTML = `
        <div id="acrylic-price-list-content" class="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-lg border border-gray-200 dark:border-gray-700 mt-8">
            ${content}
        </div>
        <div class="mt-4 text-center">
            <button id="downloadAcrylicPriceListBtn" class="btn btn-primary" style="width: auto;">
              <i class="fas fa-download mr-2"></i> Download Price List (JPG)
            </button>
        </div>
    `;
    document.getElementById('downloadAcrylicPriceListBtn').addEventListener('click', (e) => {
      const filename = `acrylic-price-list-${acrylicState.userMode}.jpg`;
      downloadElementAsJPG(e, 'acrylic-price-list-content', filename);
    });
  }
}

export function openAcrylicCompareModal(ctx) {
  const { showToast } = ctx;
  const modal = document.getElementById('acrylicCompareModal');
  if (!modal) {
    showToast('Compare modal not found. Please refresh the page.', 'error');
    return;
  }
  const custPanel = document.getElementById('acrylicCompareCustPanel');
  const agentPanel = document.getElementById('acrylicCompareAgentPanel');
  const custScroll = document.getElementById('acrylicCompareCustScroll');
  const agentScroll = document.getElementById('acrylicCompareAgentScroll');
  custPanel.innerHTML = `<div class="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-lg">${renderAcrylicPriceListHTML('customer', false, false, ctx)}</div>`;
  agentPanel.innerHTML = `<div class="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-lg">${renderAcrylicPriceListHTML('agent', false, false, ctx)}</div>`;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (custScroll && agentScroll) {
    custScroll.onscroll = () => { agentScroll.scrollTop = custScroll.scrollTop; };
    agentScroll.onscroll = () => { custScroll.scrollTop = agentScroll.scrollTop; };
  }
}

export function closeAcrylicCompareModal() {
  const modal = document.getElementById('acrylicCompareModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

export function renderAcrylicMarkupRules(tableBodyId, ctx) {
  const markupTableBody = document.getElementById(tableBodyId || 'acrylicMarkupTableBody');
  if (!markupTableBody) return;
  markupTableBody.innerHTML = '';
  const acrylicMarkupRules = ctx.getAcrylicMarkupRules();
  const acrylicState = ctx.getAcrylicState();
  const { formatCurrency } = ctx;
  const currency = ctx.getCurrentCurrency();

  const customerRules = acrylicMarkupRules.customer || [];
  const agentRules = acrylicMarkupRules.agent || [];
  const ruleCount = customerRules.length;

  const originalMode = acrylicState.userMode;

  for (let i = 0; i < ruleCount; i++) {
    const customerRule = customerRules[i];
    const agentRule = agentRules[i];
    const isLastRule = i === ruleCount - 1;
    const prevThreshold = i > 0 ? customerRules[i - 1].threshold : 0;
    let rangeText = isLastRule ?
      `Above ${currency.symbol}${formatCurrency(prevThreshold)} ` :
      `${currency.symbol}${formatCurrency(prevThreshold)} - ${currency.symbol}${formatCurrency(customerRule.threshold)} `;

    acrylicState.userMode = 'customer';
    const { note: customerNote } = adjustAcrylicPrice(customerRule.threshold, ctx);
    acrylicState.userMode = 'agent';
    const { note: agentNote } = adjustAcrylicPrice(agentRule.threshold, ctx);

    const tr = document.createElement('tr');
    tr.innerHTML = `<td> ${rangeText}</td><td><strong>${customerNote}</strong></td><td><strong>${agentNote}</strong></td>`;
    markupTableBody.appendChild(tr);
  }
  acrylicState.userMode = originalMode;
}

export function populateAcrylicPriceTable(tableBodyId, type, ctx) {
  const tableBody = document.getElementById(tableBodyId);
  if (!tableBody) return;

  const acrylicPriceTable = ctx.getAcrylicPriceTable();
  const currency = ctx.getCurrentCurrency();
  tableBody.innerHTML = '';
  const customerItems = acrylicPriceTable.customer[type] || [];
  const agentItems = acrylicPriceTable.agent[type] || [];

  customerItems.forEach((customerItem, index) => {
    const agentItem = agentItems[index];
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><strong>${customerItem.label.split('(')[0].trim()}</strong></td><td>${currency.symbol}${customerItem.price.toFixed(2)}</td><td class="agent-price-col">${currency.symbol}${(agentItem?.price || 0).toFixed(2)}</td>`;
    tableBody.appendChild(tr);
  });
}

// --- HTML GENERATORS ---

export function getAcrylicCalculatorHTML() {
  return `
          <div class="w-full max-w-5xl mx-auto flex flex-col gap-8">
            <div class="settings-panel relative">
              <div class="absolute top-4 right-4">
                <button id="acrylicSettingsBtn" class="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </button>
              </div>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="flex flex-col">
                  <h2 class="text-3xl font-bold mb-6 text-center acrylic-title">Acrylic & Wood Calculator</h2>

                  <div class="global-toggle-container" style="width: 100%; margin-bottom: 24px;">
                    <div class="size-btn-group">
                      <button id="btnCustomer" class="btn size-btn active"><i class="fas fa-user mr-2"></i> Customer Price</button>
                      <button id="btnAgent" class="btn size-btn"><i class="fas fa-user-shield mr-2"></i> Agent Price</button>
                    </div>
                  </div>

                  <div class="mb-5">
                    <h3 class="font-bold text-lg border-b pb-2 mb-3" style="color: var(--text-primary); border-color: var(--border-color);">Dimensions</h3>
                    <div id="presetGroup" class="mb-4 flex gap-2 flex-wrap justify-center">
                      <button type="button" class="btn size-btn" data-size="A6">A6</button>
                      <button type="button" class="btn size-btn" data-size="A5">A5</button>
                      <button type="button" class="btn size-btn" data-size="A4">A4</button>
                      <button type="button" class="btn size-btn" data-size="A3">A3</button>
                      <button type="button" class="btn size-btn" data-size="A2">A2</button>
                    </div>
                    <div class="grid grid-cols-[1fr_auto_1fr] gap-2 items-end mb-3">
                      <div><label class="font-semibold text-sm">Width</label><input type="number" id="width" value="5.83" step="any" min="0"></div>
                      <button id="swapDimensionsBtn" type="button" class="btn size-btn" style="padding: 10px; margin-bottom: 4px; height: 44px; width: 44px; flex-grow: 0;"><i class="fas fa-exchange-alt fa-fw"></i></button>
                      <div><label class="font-semibold text-sm">Height</label><input type="number" id="height" value="8.27" step="any" min="0"></div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                      <div><label class="font-semibold text-sm">Corner</label><input type="number" id="cornerRadius" value="0" step="any" min="0" class="w-full p-2 border rounded-lg h-11"></div>
                      <div>
                        <label class="font-semibold text-sm">Unit Measurement</label>
                        <div class="custom-sticker-dropdown" id="acrylicUnitWrapper" onclick="toggleGenericStickerDropdown(event, 'acrylicUnitWrapper')">
                          <div class="custom-sticker-dropdown-trigger">
                            <span class="custom-sticker-dropdown-label" id="acrylicUnitLabel">Inci</span>
                            <svg class="custom-sticker-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                          </div>
                          <div class="custom-sticker-dropdown-options">
                            <div class="custom-sticker-dropdown-option selected" data-value="inch" onmousedown="selectGenericStickerDropdownOption('unit', 'acrylicUnitWrapper', 'inch', 'handleAcrylicUnitChange')">Inci</div>
                            <div class="custom-sticker-dropdown-option" data-value="mm" onmousedown="selectGenericStickerDropdownOption('unit', 'acrylicUnitWrapper', 'mm', 'handleAcrylicUnitChange')">mm</div>
                            <div class="custom-sticker-dropdown-option" data-value="cm" onmousedown="selectGenericStickerDropdownOption('unit', 'acrylicUnitWrapper', 'cm', 'handleAcrylicUnitChange')">cm</div>
                            <div class="custom-sticker-dropdown-option" data-value="m" onmousedown="selectGenericStickerDropdownOption('unit', 'acrylicUnitWrapper', 'm', 'handleAcrylicUnitChange')">m</div>
                            <div class="custom-sticker-dropdown-option" data-value="ft" onmousedown="selectGenericStickerDropdownOption('unit', 'acrylicUnitWrapper', 'ft', 'handleAcrylicUnitChange')">ft</div>
                          </div>
                          <select id="unit" class="hidden-native-select" style="display:none;">
                            <option value="inch" selected>Inci</option>
                            <option value="mm">mm</option>
                            <option value="cm">cm</option>
                            <option value="m">m</option>
                            <option value="ft">ft</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 class="font-bold text-lg border-b pb-2 mb-3" style="color: var(--text-primary); border-color: var(--border-color);">Materials & Add-ons</h3>
                    <div class="mb-3"><label class="font-semibold text-sm">Material (Acrylic/Wood)</label>
                      <div class="custom-sticker-dropdown" id="acrylicWrapper" onclick="toggleGenericStickerDropdown(event, 'acrylicWrapper')">
                        <div class="custom-sticker-dropdown-trigger">
                          <span class="custom-sticker-dropdown-label" id="acrylicLabel">None</span>
                          <svg class="custom-sticker-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </div>
                        <div class="custom-sticker-dropdown-options" id="acrylicOptions"></div>
                        <select id="acrylic" class="hidden-native-select" style="display:none;"></select>
                      </div>
                    </div>
                    <div class="mb-3"><label class="font-semibold text-sm">Printing</label>
                      <div class="custom-sticker-dropdown" id="printingWrapper" onclick="toggleGenericStickerDropdown(event, 'printingWrapper')">
                        <div class="custom-sticker-dropdown-trigger">
                          <span class="custom-sticker-dropdown-label" id="printingLabel">None</span>
                          <svg class="custom-sticker-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </div>
                        <div class="custom-sticker-dropdown-options" id="printingOptions"></div>
                        <select id="printing" class="hidden-native-select" style="display:none;"></select>
                      </div>
                    </div>
                    <div class="mb-3">
                      <label class="font-semibold text-sm">Print Side</label>
                      <div class="flex gap-2 mt-1 size-btn-group">
                        <button id="btnSide1" class="btn size-btn active">1 Side</button>
                        <button id="btnSide2" class="btn size-btn">2 Side</button>
                      </div>
                    </div>
                    <div><label class="font-semibold text-sm">Add Stand</label>
                      <div class="custom-sticker-dropdown" id="standWrapper" onclick="toggleGenericStickerDropdown(event, 'standWrapper')">
                        <div class="custom-sticker-dropdown-trigger">
                          <span class="custom-sticker-dropdown-label" id="standLabel">None</span>
                          <svg class="custom-sticker-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </div>
                        <div class="custom-sticker-dropdown-options" id="standOptions"></div>
                        <select id="stand" class="hidden-native-select" style="display:none;"></select>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="settings-panel flex flex-col justify-between">
                  <div><canvas id="previewCanvas" width="400" height="400" class="w-full"></canvas></div>
                  <div class="mt-4">
                    <div class="total text-center text-3xl font-bold" id="totalPrice" style="color: var(--primary-color);">Total: RM0.00</div>
                    <div id="invoice" class="result mt-4"></div>
                    <div class="mt-4 flex justify-center"><button id="downloadSvgBtn" class="btn btn-secondary w-full" style="margin-top: 0;">Download SVG</button></div>
                  </div>
                </div>
              </div>

              <div style="margin-top: 12px;">
                <div class="acrylic-invoice-buttons-container">
                  <button id="addAcrylicToPadBtn" class="btn btn-primary">+ Add to Pad</button>
                  <button id="copyInvoiceBtn" class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600" style="width: auto; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">Copy</button>
                </div>
                <div class="relative w-full"><textarea id="copyableInvoice" readonly rows="7" class="w-full font-mono text-sm border rounded-lg focus:ring"></textarea></div>
              </div>
              <div id="acrylicPriceListContainer" class="mt-8"></div>
            </div>
    </div>`;
}

export function getAcrylicSettingsModalHTML() {
  return `
          <div id="acrylicSettingsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 hidden">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
              <div class="p-4 border-b flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-800">Acrylic Calculator Settings</h2>
                <button id="acrylicCloseSettingsBtn" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 14 14"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" /></svg>
                </button>
              </div>
              <div class="flex border-b">
                <button data-tab="prices" class="acrylic-settings-tab flex-1 p-3 font-semibold border-b-2 border-indigo-500 text-indigo-600">Base Prices</button>
                <button data-tab="markup" class="acrylic-settings-tab flex-1 p-3 font-semibold text-gray-500">Markup Rules</button>
              </div>
              <div class="p-6 overflow-y-auto">
                <div id="acrylicPriceSettings">
                  <p class="text-sm text-gray-500 mb-4">Displaying current prices used by the Acrylic Calculator. The same pricing tables are also available in <strong class="text-gray-600">Settings > Material Pricing > Acrylic Calculator</strong>.</p>
                  <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Acrylic/Wood Prices (per in²)</h3>
                  <table class="w-full settings-table"><thead><tr><th>Material</th><th>Customer Price</th><th class="agent-price-col">Agent Price</th></tr></thead><tbody id="acrylicPriceTableBody"></tbody></table>
                  <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mt-6 mb-3">Printing Prices (per in²)</h3>
                  <table class="w-full settings-table"><thead><tr><th>Service</th><th>Customer Price</th><th class="agent-price-col">Agent Price</th></tr></thead><tbody id="printingPriceTableBody"></tbody></table>
                </div>
                <div id="acrylicMarkupSettings" class="hidden">
                  <p class="text-sm text-gray-500 mb-4">This is how final prices are adjusted. Rules are applied in order, and the same markup table is available in <strong class="text-gray-600">Settings > Material Pricing > Acrylic Calculator</strong>.</p>
                  <table class="w-full settings-table"><thead><tr><th>Price Range</th><th>Customer Markup</th><th class="agent-price-col">Agent Markup</th></tr></thead><tbody id="acrylicMarkupTableBody"></tbody></table>
                </div>
              </div>
            </div>
    </div>`;
}

// --- EVENT LISTENERS ---

export function handleAcrylicUnitChange(newUnit, ctx) {
  const acrylicState = ctx.getAcrylicState();
  const widthEl = document.getElementById('width');
  const heightEl = document.getElementById('height');
  const cornerRadiusEl = document.getElementById('cornerRadius');
  if (!widthEl || !heightEl || !cornerRadiusEl) return;
  const prevUnit = acrylicState.currentUnit;
  const newWidth = convertAcrylicValue(parseFloat(widthEl.value), prevUnit, newUnit);
  const newHeight = convertAcrylicValue(parseFloat(heightEl.value), prevUnit, newUnit);
  const newCornerRadius = convertAcrylicValue(parseFloat(cornerRadiusEl.value), prevUnit, newUnit);
  acrylicState.ignoreManualChange = true;
  widthEl.value = parseFloat(newWidth.toFixed(2));
  heightEl.value = parseFloat(newHeight.toFixed(2));
  cornerRadiusEl.value = parseFloat(newCornerRadius.toFixed(2));
  acrylicState.currentUnit = newUnit;
  acrylicState.ignoreManualChange = false;
  if (acrylicState.presetActive) {
    setAcrylicASize(acrylicState.presetActive, ctx);
    highlightAcrylicPreset(acrylicState.presetActive);
  }
  calculateAcrylicPrice(ctx);
}

export function attachAcrylicListeners(ctx) {
  const widthEl = document.getElementById('width');
  const heightEl = document.getElementById('height');
  const cornerRadiusEl = document.getElementById('cornerRadius');
  const unitEl = document.getElementById('unit');
  const acrylicEl = document.getElementById('acrylic');
  const printingEl = document.getElementById('printing');
  const standEl = document.getElementById('stand');
  const swapDimensionsBtn = document.getElementById('swapDimensionsBtn');
  const btnCustomer = document.getElementById('btnCustomer');
  const btnAgent = document.getElementById('btnAgent');
  const btnSide1 = document.getElementById('btnSide1');
  const btnSide2 = document.getElementById('btnSide2');
  const copyInvoiceBtn = document.getElementById('copyInvoiceBtn');
  const downloadSvgBtn = document.getElementById('downloadSvgBtn');
  const addAcrylicToPadBtn = document.getElementById('addAcrylicToPadBtn');

  const settingsBtn = document.getElementById('acrylicSettingsBtn');
  const settingsModal = document.getElementById('acrylicSettingsModal');
  const closeBtn = document.getElementById('acrylicCloseSettingsBtn');
  const mainSettingsTabs = document.querySelectorAll('.acrylic-settings-tab');

  if (settingsBtn) settingsBtn.addEventListener('click', () => {
    populateAcrylicPriceTable('acrylicPriceTableBody', 'acrylic', ctx);
    populateAcrylicPriceTable('printingPriceTableBody', 'print', ctx);
    renderAcrylicMarkupRules(undefined, ctx);
    settingsModal.classList.remove('hidden');
  });

  if (closeBtn) closeBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

  mainSettingsTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      mainSettingsTabs.forEach(t => t.classList.remove('border-indigo-500', 'text-indigo-600'));
      tab.classList.add('border-indigo-500', 'text-indigo-600');
      const priceSettings = document.getElementById('acrylicPriceSettings');
      const markupSettings = document.getElementById('acrylicMarkupSettings');
      if (tab.dataset.tab === 'prices') {
        priceSettings.classList.remove('hidden');
        markupSettings.classList.add('hidden');
      } else {
        priceSettings.classList.add('hidden');
        markupSettings.classList.remove('hidden');
      }
    });
  });

  if (unitEl) unitEl.addEventListener('change', () => handleAcrylicUnitChange(unitEl.value, ctx));

  document.querySelectorAll('#presetGroup .btn').forEach(btn => {
    btn.addEventListener('click', () => setAcrylicASize(btn.dataset.size, ctx));
  });

  [widthEl, heightEl, cornerRadiusEl, acrylicEl, printingEl, standEl, unitEl].forEach(el => {
    if (el) {
      el.addEventListener('input', () => {
        if (el === widthEl || el === heightEl) {
          checkAcrylicPresetActive(ctx);
          checkAcrylicManualInput(ctx);
        }
        calculateAcrylicPrice(ctx);
      });
      el.addEventListener('change', () => calculateAcrylicPrice(ctx));
    }
  });

  if (swapDimensionsBtn) swapDimensionsBtn.addEventListener('click', () => {
    const currentWidth = widthEl.value;
    widthEl.value = heightEl.value;
    heightEl.value = currentWidth;
    calculateAcrylicPrice(ctx);
  });

  if (btnCustomer) btnCustomer.addEventListener('click', () => handleAcrylicUserToggle('customer', ctx));
  if (btnAgent) btnAgent.addEventListener('click', () => handleAcrylicUserToggle('agent', ctx));

  if (btnSide1) btnSide1.addEventListener('click', () => {
    const acrylicState = ctx.getAcrylicState();
    acrylicState.printSideMultiplier = 1;
    btnSide1.classList.add('active');
    btnSide2.classList.remove('active');
    calculateAcrylicPrice(ctx);
  });

  if (btnSide2) btnSide2.addEventListener('click', () => {
    const acrylicState = ctx.getAcrylicState();
    acrylicState.printSideMultiplier = 2;
    btnSide2.classList.add('active');
    btnSide1.classList.remove('active');
    calculateAcrylicPrice(ctx);
  });

  if (copyInvoiceBtn) copyInvoiceBtn.addEventListener('click', () => {
    const { showToast } = ctx;
    const copyableInvoice = document.getElementById('copyableInvoice');
    copyableInvoice.select();
    navigator.clipboard.writeText(copyableInvoice.value).then(() => {
      showToast('✓ Invoice copied!');
    });
  });

  if (downloadSvgBtn) downloadSvgBtn.addEventListener('click', () => {
    const svgString = generateAcrylicSvg();
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `artwork_${widthEl.value}x${heightEl.value}${unitEl.value}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  if (addAcrylicToPadBtn) addAcrylicToPadBtn.addEventListener('click', () => addAcrylicToPad(ctx));
}

export function renderAcrylicCalculator(container, ctx) {
  let html = getAcrylicCalculatorHTML();
  html += getAcrylicSettingsModalHTML();
  container.innerHTML = html;

  const acrylicState = ctx.getAcrylicState();

  document.getElementById('unit').value = "inch";
  acrylicState.currentUnit = "inch";
  acrylicState.userMode = ctx.getGlobalAgentMode() ? 'agent' : 'customer';

  if (ctx.getGlobalAgentMode()) {
    document.getElementById('btnAgent').classList.add('active', 'active-agent');
    document.getElementById('btnCustomer').classList.remove('active');
  } else {
    document.getElementById('btnCustomer').classList.add('active');
    document.getElementById('btnAgent').classList.remove('active', 'active-agent');
  }

  fillAllAcrylicDropdowns({}, ctx);
  setAcrylicASize('A5', ctx);
  updateAcrylicPriceList(ctx);

  if (ctx.getGlobalAgentMode()) {
    const calcRoot = document.querySelector('.w-full.max-w-5xl');
    if (calcRoot) {
      calcRoot.querySelectorAll('.size-btn').forEach(btn => {
        if (btn.id === 'btnCustomer' || btn.id === 'btnAgent') return;
        btn.classList.add('agent-active');
      });
    }
  }

  attachAcrylicListeners(ctx);
}

export function addAcrylicToPad(ctx) {
  const acrylicState = ctx.getAcrylicState();
  const acrylicPriceTable = ctx.getAcrylicPriceTable();
  const { addItemToQuotePad } = ctx;

  const widthEl = document.getElementById('width');
  const heightEl = document.getElementById('height');
  const unitEl = document.getElementById('unit');
  const acrylicEl = document.getElementById('acrylic');
  const totalPriceEl = document.getElementById('totalPrice');

  if (!widthEl || !totalPriceEl) return;

  const w = parseFloat(widthEl.value) || 0;
  const h = parseFloat(heightEl.value) || 0;
  const unit = unitEl?.value || 'inch';
  const acrylicIdx = parseInt(acrylicEl?.value);

  const unitPrice = parseFloat(totalPriceEl.textContent.replace(/[^\d.-]/g, '')) || 0;
  const materialLabel = acrylicIdx >= 0
    ? acrylicPriceTable[acrylicState.userMode].acrylic[acrylicIdx].label.split('(')[0].trim()
    : 'No Material';
  const sizeLabel = acrylicState.presetActive
    ? `${acrylicState.presetActive} (${w}${unit} x ${h}${unit})`
    : `${w}${unit} x ${h}${unit}`;

  addItemToQuotePad({
    type: 'calculator',
    title: `Acrylic & Wood: ${sizeLabel}`,
    name: `Acrylic: ${materialLabel}`,
    unitPrice,
    quantity: 1,
    details: {
      size: `Size: ${sizeLabel}`,
      material: `Material: ${materialLabel}`,
    }
  });
}
