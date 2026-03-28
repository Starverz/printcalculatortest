const EYELET_DROP_DURATION = 500;
const EYELET_DROP_HEIGHT = 50;
const PIPE_SLIDE_DURATION = 400;
const CANVAS_ANIMATION_DURATION = 250;

const runtimeState = {
  finishingAnimationId: null,
  previousFinishingMode: null,
  eyeletAnimationProgress: 1,
  pipeAnimationProgress: 1,
  canvasAnimationId: null,
  animatedDims: { w: 0, h: 0 },
  targetDims: { w: 0, h: 0 },
  animationStartTime: null,
};

export function calculateLargeFormat(context) {
  calculatePrintingLogic(context, context.getMaterials(), 'Large Format');
}

export function calculateSignboard(context) {
  calculatePrintingLogic(context, context.getSignboardMaterials(), 'Signboard');
}

export function kiraHarga(context) {
  const currentCategory = context.getCurrentCategory();

  if (currentCategory === 'largeFormat') {
    calculateLargeFormat(context);
  } else if (currentCategory === 'signboard') {
    calculateSignboard(context);
  }
}

export function calculatePrintingLogic(context, materialList, categoryLabel) {
  const widthEl = document.getElementById('width');
  if (!widthEl) return;

  const selectedMaterialIndex = context.getSelectedMaterialIndex();
  if (selectedMaterialIndex === null || !materialList[selectedMaterialIndex]) return;

  const material = materialList[selectedMaterialIndex];
  context.setPricePerSqFt(material.agent ? material.agentPrice : material.customerPrice);
  context.setIsStickerOrPolysilk(material.simple);

  const totalColor = material.agent ? 'var(--success-color)' : 'var(--primary-color)';
  const widthRaw = parseFloat(widthEl.value);
  const heightRaw = parseFloat(document.getElementById('height').value);
  const unit = document.getElementById('measurementUnit').value;

  context.setLastUsedDimensions({
    width: widthRaw,
    height: heightRaw,
    unit,
  });

  const widthInFeet = context.convertToFeetCalc(widthRaw, unit);
  const heightInFeet = context.convertToFeetCalc(heightRaw, unit);
  const resultDiv = document.getElementById('result');
  const invoiceTextArea = document.getElementById('invoiceText');

  if (!resultDiv) return;

  if (Number.isNaN(widthInFeet) || Number.isNaN(heightInFeet) || widthInFeet <= 0 || heightInFeet <= 0) {
    resultDiv.innerText = 'Invalid dimensions.';
    if (invoiceTextArea) {
      invoiceTextArea.value = '';
    }
    return;
  }

  const optEl = document.getElementById('eyeletOption');
  const opt = optEl ? optEl.value : 'none';
  const government = document.getElementById('governmentChk').checked;
  const whiteBorder = document.getElementById('whiteBorderOption').value;
  const customBtn = document.getElementById('customBorderToggle');
  const isCustomBorderActive = customBtn && customBtn.classList.contains('btn-primary');

  let totalWidth = widthInFeet;
  let totalHeight = heightInFeet;
  let details = `Size (ft): ${widthInFeet.toFixed(2)} x ${heightInFeet.toFixed(2)}<br>Area: ${(widthInFeet * heightInFeet).toFixed(2)} sq ft<br>`;

  if (isCustomBorderActive) {
    const borderTop = parseFloat(document.getElementById('customBorderTop').value) || 0;
    const borderBottom = parseFloat(document.getElementById('customBorderBottom').value) || 0;
    const borderLeft = parseFloat(document.getElementById('customBorderLeft').value) || 0;
    const borderRight = parseFloat(document.getElementById('customBorderRight').value) || 0;
    totalWidth += context.convertToFeetCalc(borderLeft, unit) + context.convertToFeetCalc(borderRight, unit);
    totalHeight += context.convertToFeetCalc(borderTop, unit) + context.convertToFeetCalc(borderBottom, unit);
    details += `With Custom Border: ${totalWidth.toFixed(2)}ft x ${totalHeight.toFixed(2)}ft<br>`;
  } else if (whiteBorder !== 'none') {
    const borderInches = parseInt(whiteBorder, 10);
    totalWidth += 2 * (borderInches / 12);
    totalHeight += 2 * (borderInches / 12);
    details += `With ${borderInches}" Border: ${totalWidth.toFixed(2)}ft x ${totalHeight.toFixed(2)}ft<br>`;
  }

  const area = totalWidth * totalHeight;
  const basePrice = area * context.getPricePerSqFt();
  let subTotal = basePrice;
  details += `Base Price: ${context.getCurrentCurrency().symbol} ${context.formatCurrency(basePrice)}<br>`;

  let eyelet = 0;
  let eyeletCost = 0;
  let glueCost = 0;
  let gam = 0;

  if (opt === 'pipe') {
    const pipeCost = widthInFeet * context.getGlobalPipePrice();
    subTotal += pipeCost;
    details += `Pipe Cost: ${widthInFeet.toFixed(2)} ft (${context.getCurrentCurrency().symbol} ${context.formatCurrency(pipeCost)})<br>`;
  } else if (opt !== 'none' && !context.getIsStickerOrPolysilk() && !isCustomBorderActive) {
    if (opt === 'manual') {
      eyelet = (parseInt(document.getElementById('manualTop').value, 10) || 0)
        + (parseInt(document.getElementById('manualBottom').value, 10) || 0)
        + (parseInt(document.getElementById('manualLeft').value, 10) || 0)
        + (parseInt(document.getElementById('manualRight').value, 10) || 0);
    } else if (opt === 'auto') {
      eyelet = context.autoEyelet(widthInFeet, heightInFeet);
    }

    if (!context.isExceptionSize(widthInFeet, heightInFeet) && !context.isGamExemptedSize(widthInFeet, heightInFeet)) {
      gam = Math.round(widthInFeet + heightInFeet);
    }

    eyeletCost = eyelet * context.getGlobalEyeletPrice();
    glueCost = gam * context.getGlobalGluePrice();
    subTotal += eyeletCost + glueCost;

    if (eyelet > 0) {
      details += `Eyelets: ${eyelet} pcs (${context.getCurrentCurrency().symbol} ${context.formatCurrency(eyeletCost)})<br>`;
    }
    if (gam > 0) {
      details += `Glue: ${gam} ft (${context.getCurrentCurrency().symbol} ${context.formatCurrency(glueCost)})<br>`;
    }
  }

  if (government) {
    const govSurcharge = basePrice * (context.getGlobalGovSurchargePercent() / 100);
    subTotal += govSurcharge;
    details += `Govt Surcharge (${context.getGlobalGovSurchargePercent()}%): ${context.getCurrentCurrency().symbol} ${context.formatCurrency(govSurcharge)}<br>`;
  }

  let finalTotal = subTotal;
  if (context.getIsTaxEnabled()) {
    const taxAmount = subTotal * (context.getGlobalTaxPercent() / 100);
    finalTotal += taxAmount;
    details += `Total Not Include Tax: ${context.getCurrentCurrency().symbol} ${context.formatCurrency(subTotal)}<br>`;
    details += `Tax (${context.getGlobalTaxPercent()}%): ${context.getCurrentCurrency().symbol} ${context.formatCurrency(taxAmount)}<br>`;
  }

  const _lfDetailsCollapsed = resultDiv.querySelector('[data-lf-details][data-open="false"]') !== null;
  resultDiv.innerHTML = `
    <div data-lf-invoice style="display:flex; align-items:stretch; justify-content:space-between; gap:17px; flex-wrap:wrap;">
      <div style="flex:1; min-width:260px;">
        <button onclick="(function(btn){var d=btn.closest('[data-lf-invoice]').querySelector('[data-lf-details]');var open=d.dataset.open!=='false';if(open){d.style.maxHeight='0';d.dataset.open='false';btn.querySelector('i').style.transform='rotate(-90deg)';}else{d.style.maxHeight=d.scrollHeight+'px';d.dataset.open='true';btn.querySelector('i').style.transform='rotate(0deg)';};})(this)" style="background:none;border:none;padding:0;cursor:pointer;display:flex;align-items:center;gap:5px;color:var(--text-secondary);font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:4px;" title="Toggle details">
          <i class="fas fa-chevron-down" style="font-size:10px;transition:transform 0.2s;"></i> Details
        </button>
        <div data-lf-details data-open="true" style="font-size:14px; line-height:1.45; color:var(--text-secondary); overflow:hidden; max-height:600px; transition:max-height 0.35s ease;">
          ${details}
        </div>
      </div>
      <div style="padding-left:14px; border-left:1px solid var(--border-color); text-align:right; flex-shrink:0; display:flex; flex-direction:column; justify-content:flex-end;">
        <div style="font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-secondary); margin-bottom:3px;">Total Price</div>
        <div style="font-size:28px; font-weight:800; color:${totalColor}; line-height:1; white-space:nowrap;">
          ${context.getCurrentCurrency().symbol} <span id="priceTicker">${context.formatCurrency(context.getPreviousTotalPrice())}</span>
        </div>
      </div>
    </div>
    <span id="lastSubTotal" data-subtotal="${subTotal}" style="display:none;"></span>`;
  if (_lfDetailsCollapsed) {
    const d = resultDiv.querySelector('[data-lf-details]');
    const i = resultDiv.querySelector('[data-lf-invoice] button i');
    if (d) { d.style.maxHeight = '0'; d.dataset.open = 'false'; }
    if (i) { i.style.transform = 'rotate(-90deg)'; }
  }

  context.animatePriceTicker('priceTicker', context.getPreviousTotalPrice(), finalTotal, 500);
  context.setPreviousTotalPrice(finalTotal);

  updatePreview(context);

  if (invoiceTextArea) {
    const titleInput = document.getElementById('itemTitle');
    const customTitle = titleInput ? titleInput.value.trim() : '';
    const invoiceTitle = customTitle !== '' ? customTitle : categoryLabel;
    const customDetails = [];
    const presetLabel = context.getLastClickedASize() ? `(${context.getLastClickedASize()}) ` : '';

    customDetails.push(`Size : ${presetLabel}${parseFloat(widthRaw.toFixed(2))}${unit} (W) x ${parseFloat(heightRaw.toFixed(2))}${unit} (H)`);
    customDetails.push(`Material : ${material.name}`);

    if (isCustomBorderActive) {
      const borderTop = parseFloat(document.getElementById('customBorderTop').value) || 0;
      const borderBottom = parseFloat(document.getElementById('customBorderBottom').value) || 0;
      const borderLeft = parseFloat(document.getElementById('customBorderLeft').value) || 0;
      const borderRight = parseFloat(document.getElementById('customBorderRight').value) || 0;
      customDetails.push(`Custom Border: T:${borderTop}${unit} B:${borderBottom}${unit} L:${borderLeft}${unit} R:${borderRight}${unit}`);
    } else if (whiteBorder !== 'none') {
      customDetails.push(`White Border All Side : ${whiteBorder}in`);
    }

    if (!context.getIsStickerOrPolysilk()) {
      switch (opt) {
        case 'auto':
        case 'manual':
          customDetails.push(`Eyelet : ${eyelet}pcs`);
          break;
        case 'pipe':
          customDetails.push('Pipe : Top & Bottom');
          break;
      }
    }

    invoiceTextArea.value = context.generateUniversalInvoice(
      invoiceTitle,
      customDetails,
      subTotal,
      1,
      { showQty: false, showTotal: false, unitLabel: '' }
    );
  }
}

export function toggleCustomBorder(context) {
  const btn = document.getElementById('customBorderToggle');
  if (!btn) return;

  const isCurrentlyActive = btn.classList.contains('btn-primary');
  if (isCurrentlyActive) {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
  } else {
    btn.classList.remove('btn-secondary');
    btn.classList.add('btn-primary');

    if (context.getCurrentInputUnit() !== 'in') {
      const unitEl = document.getElementById('measurementUnit');
      if (unitEl) {
        unitEl.value = 'in';
        context.syncStickerDropdownLabel('measurementUnit', 'measurementUnitWrapper');
      }
      context.changeUnits('in');
    }
  }

  if (context.getGlobalAgentMode()) {
    btn.classList.add('agent-active');
  } else {
    btn.classList.remove('agent-active');
  }

  updateFinishingOptions(context);
}

export function updateFinishingOptions(context) {
  const eyeletOption = document.getElementById('eyeletOption') ? document.getElementById('eyeletOption').value : 'none';
  const manualEyeletFields = document.getElementById('manualEyeletFields');
  const customWhiteBorderFields = document.getElementById('customWhiteBorderFields');
  const whiteBorderOption = document.getElementById('whiteBorderOption');
  const customBtn = document.getElementById('customBorderToggle');
  let isCustomActive = customBtn.classList.contains('btn-primary');

  if (eyeletOption === 'pipe') {
    whiteBorderOption.disabled = true;
    whiteBorderOption.value = 'none';
    customBtn.disabled = true;
    customBtn.style.opacity = '0.5';
    customBtn.style.cursor = 'not-allowed';
    if (isCustomActive) {
      customBtn.classList.remove('btn-primary');
      customBtn.classList.add('btn-secondary');
      isCustomActive = false;
    }
  } else {
    customBtn.disabled = false;
    customBtn.style.opacity = '1';
    customBtn.style.cursor = 'pointer';
    if (!isCustomActive) {
      whiteBorderOption.disabled = false;
    }
  }

  manualEyeletFields.style.display = 'none';
  customWhiteBorderFields.style.display = 'none';

  if (eyeletOption === 'manual') {
    manualEyeletFields.style.display = 'grid';
  }

  if (isCustomActive) {
    customWhiteBorderFields.style.display = 'block';
    whiteBorderOption.disabled = true;
    whiteBorderOption.value = 'none';
  }

  if (runtimeState.previousFinishingMode !== eyeletOption) {
    triggerFinishingAnimation(context, eyeletOption);
    runtimeState.previousFinishingMode = eyeletOption;
  }

  kiraHarga(context);
}

export function updatePreview(context) {
  const widthInput = document.getElementById('width');
  const heightInput = document.getElementById('height');
  if (!widthInput || !heightInput) return;

  const rawW = parseFloat(widthInput.value) || 0;
  const rawH = parseFloat(heightInput.value) || 0;
  const unit = document.getElementById('measurementUnit').value;
  const widthInFeet = context.convertToFeetCalc(rawW, unit);
  const heightInFeet = context.convertToFeetCalc(rawH, unit);

  if (Number.isNaN(widthInFeet) || Number.isNaN(heightInFeet) || widthInFeet <= 0 || heightInFeet <= 0) return;

  const eyeletOption = document.getElementById('eyeletOption');
  const mode = eyeletOption ? eyeletOption.value : 'auto';
  let manualCounts = {};
  if (mode === 'manual') {
    manualCounts = {
      top: parseInt(document.getElementById('manualTop').value, 10) || 0,
      bottom: parseInt(document.getElementById('manualBottom').value, 10) || 0,
      left: parseInt(document.getElementById('manualLeft').value, 10) || 0,
      right: parseInt(document.getElementById('manualRight').value, 10) || 0,
    };
  }

  const customBorderToggle = document.getElementById('customBorderToggle');
  const isCustomBorderActive = customBorderToggle && customBorderToggle.classList.contains('btn-primary');
  let customBorders = { top: 0, bottom: 0, left: 0, right: 0 };
  if (isCustomBorderActive) {
    customBorders = {
      top: parseFloat(document.getElementById('customBorderTop').value) || 0,
      bottom: parseFloat(document.getElementById('customBorderBottom').value) || 0,
      left: parseFloat(document.getElementById('customBorderLeft').value) || 0,
      right: parseFloat(document.getElementById('customBorderRight').value) || 0,
    };
  }

  const drawParams = {
    rawW,
    rawH,
    unit,
    isEx: context.isExceptionSize(widthInFeet, heightInFeet),
    isSimple: context.getIsStickerOrPolysilk(),
    mode,
    manualCounts,
    customBorders,
  };

  runtimeState.targetDims = { w: widthInFeet, h: heightInFeet };

  if (runtimeState.animatedDims.w === 0 && runtimeState.animatedDims.h === 0) {
    runtimeState.animatedDims = { w: widthInFeet, h: heightInFeet };
    drawPreview(context, rawW, rawH, unit, widthInFeet, heightInFeet, drawParams.isEx, drawParams.isSimple, mode, manualCounts, customBorders);
    return;
  }

  if (runtimeState.canvasAnimationId) {
    cancelAnimationFrame(runtimeState.canvasAnimationId);
  }

  const startDims = { w: runtimeState.animatedDims.w, h: runtimeState.animatedDims.h };
  runtimeState.animationStartTime = performance.now();

  function animateCanvas(currentTime) {
    const elapsed = currentTime - runtimeState.animationStartTime;
    const progress = Math.min(elapsed / CANVAS_ANIMATION_DURATION, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);

    runtimeState.animatedDims.w = startDims.w + (runtimeState.targetDims.w - startDims.w) * easeOut;
    runtimeState.animatedDims.h = startDims.h + (runtimeState.targetDims.h - startDims.h) * easeOut;

    const animRawW = (runtimeState.animatedDims.w / widthInFeet) * rawW;
    const animRawH = (runtimeState.animatedDims.h / heightInFeet) * rawH;

    drawPreview(
      context,
      animRawW,
      animRawH,
      unit,
      runtimeState.animatedDims.w,
      runtimeState.animatedDims.h,
      drawParams.isEx,
      drawParams.isSimple,
      mode,
      manualCounts,
      customBorders
    );

    if (progress < 1) {
      runtimeState.canvasAnimationId = requestAnimationFrame(animateCanvas);
    } else {
      runtimeState.canvasAnimationId = null;
    }
  }

  runtimeState.canvasAnimationId = requestAnimationFrame(animateCanvas);
}

export function drawPreview(context, rawW, rawH, unit, widthInFeet, heightInFeet, isEx, isSimple, mode = 'auto', manual = {}, customBorders = {}) {
  const canvas = document.getElementById('previewCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const pad = 85;
  const availWidth = canvas.width - pad * 2;
  const availHeight = canvas.height - pad * 2;
  const whiteBorderEl = document.getElementById('whiteBorderOption');
  const whiteBorderInches = (whiteBorderEl && whiteBorderEl.value !== 'none' && !whiteBorderEl.disabled) ? parseInt(whiteBorderEl.value, 10) : 0;
  const customBorderToggle = document.getElementById('customBorderToggle');
  const isCustomBorderActive = customBorderToggle && customBorderToggle.classList.contains('btn-primary');

  let outerW = widthInFeet;
  let outerH = heightInFeet;
  let borderTopFt = 0;
  let borderBottomFt = 0;
  let borderLeftFt = 0;
  let borderRightFt = 0;
  let finalRawW = rawW;
  let finalRawH = rawH;

  if (isCustomBorderActive) {
    borderTopFt = context.convertToFeetCalc(customBorders.top, unit);
    borderBottomFt = context.convertToFeetCalc(customBorders.bottom, unit);
    borderLeftFt = context.convertToFeetCalc(customBorders.left, unit);
    borderRightFt = context.convertToFeetCalc(customBorders.right, unit);
    outerW += borderLeftFt + borderRightFt;
    outerH += borderTopFt + borderBottomFt;
    finalRawW += (customBorders.left || 0) + (customBorders.right || 0);
    finalRawH += (customBorders.top || 0) + (customBorders.bottom || 0);
  } else if (whiteBorderInches > 0) {
    const whiteBorderFeet = whiteBorderInches / 12;
    borderTopFt = whiteBorderFeet;
    borderBottomFt = whiteBorderFeet;
    borderLeftFt = whiteBorderFeet;
    borderRightFt = whiteBorderFeet;
    outerW += 2 * whiteBorderFeet;
    outerH += 2 * whiteBorderFeet;
    const borderInUnit = context.convertFromMm(context.convertToMm(whiteBorderInches, 'in'), unit);
    finalRawW += 2 * borderInUnit;
    finalRawH += 2 * borderInUnit;
  }

  const scale = Math.min(availWidth / outerW, availHeight / outerH);
  const totalDw = outerW * scale;
  const totalDh = outerH * scale;
  const sxTotal = (canvas.width - totalDw) / 2;
  const syTotal = (canvas.height - totalDh) / 2;
  const sx = sxTotal + (borderLeftFt * scale);
  const sy = syTotal + (borderTopFt * scale);
  const dw = widthInFeet * scale;
  const dh = heightInFeet * scale;

  ctx.fillStyle = '#E9ECEF';
  if (isCustomBorderActive || whiteBorderInches > 0) {
    ctx.fillRect(sxTotal, syTotal, totalDw, totalDh);
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;
    ctx.strokeRect(sxTotal, syTotal, totalDw, totalDh);
  }

  const uploadedArtworkImg = context.getUploadedArtworkImg();
  const artConfig = context.getArtConfig();
  if (uploadedArtworkImg) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(sx, sy, dw, dh);

    const artDw = artConfig.width * scale;
    const artDh = artConfig.height * scale;
    const artX = sx + (dw - artDw) / 2;
    const artY = sy + (dh - artDh) / 2;

    ctx.save();
    ctx.translate(artX + artDw / 2, artY + artDh / 2);
    ctx.rotate((artConfig.rotation * Math.PI) / 180);
    if (artConfig.rotation === 90 || artConfig.rotation === 270) {
      ctx.drawImage(uploadedArtworkImg, -artDh / 2, -artDw / 2, artDh, artDw);
    } else {
      ctx.drawImage(uploadedArtworkImg, -artDw / 2, -artDh / 2, artDw, artDh);
    }
    ctx.restore();

    if (artConfig.width < (widthInFeet - 0.01) || artConfig.height < (heightInFeet - 0.01)) {
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(sx, sy, dw, dh);
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, dw, dh);
  } else {
    const grad = ctx.createLinearGradient(sx, sy, sx + dw, sy + dh);
    grad.addColorStop(0, '#007BFF');
    grad.addColorStop(1, '#17a2b8');
    ctx.fillStyle = grad;
    ctx.fillRect(sx, sy, dw, dh);
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, dw, dh);
  }

  drawDimensionLines(context, ctx, sxTotal, syTotal, totalDw, totalDh, finalRawW, finalRawH, unit);
  if (isSimple || mode === 'none' || mode === 'customWhiteBorder') return;

  if (mode === 'pipe') {
    const pipeHeightFt = 1 / 12;
    const pipeExtraWidthFt = 0.5 / 12;
    const drawPipeHeight = pipeHeightFt * scale;
    const drawPipeExtraWidth = pipeExtraWidthFt * scale;
    const pipeTotalWidth = dw + (drawPipeExtraWidth * 2);
    const pipeX = sx - drawPipeExtraWidth;
    const animatedWidth = pipeTotalWidth * runtimeState.pipeAnimationProgress;

    ctx.save();
    ctx.fillStyle = '#CCDFE2';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;

    if (animatedWidth > 0) {
      ctx.fillRect(pipeX, sy - drawPipeHeight, animatedWidth, drawPipeHeight);
      ctx.strokeRect(pipeX, sy - drawPipeHeight, animatedWidth, drawPipeHeight);
      ctx.fillRect(pipeX, sy + dh, animatedWidth, drawPipeHeight);
      ctx.strokeRect(pipeX, sy + dh, animatedWidth, drawPipeHeight);
    }

    ctx.restore();
    return;
  }

  const drawEyelet = (x, y, dropOffset = 0, opacity = 1) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.arc(x, y - dropOffset, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#C0C0C0';
    ctx.strokeStyle = '#6c757d';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y - dropOffset, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#343a40';
    ctx.fill();
    ctx.restore();
  };

  const offset = 12;
  const allEyelets = [];

  if (mode === 'manual') {
    const { top, bottom, left, right } = manual;
    if (top === 1) {
      allEyelets.push({ x: sx + dw / 2, y: sy + offset });
    } else if (top >= 2) {
      allEyelets.push({ x: sx + offset, y: sy + offset });
      allEyelets.push({ x: sx + dw - offset, y: sy + offset });
      const remaining = top - 2;
      const innerWidth = dw - 2 * offset;
      for (let index = 1; index <= remaining; index += 1) {
        allEyelets.push({ x: sx + offset + (innerWidth / (remaining + 1)) * index, y: sy + offset });
      }
    }

    if (bottom === 1) {
      allEyelets.push({ x: sx + dw / 2, y: sy + dh - offset });
    } else if (bottom >= 2) {
      allEyelets.push({ x: sx + offset, y: sy + dh - offset });
      allEyelets.push({ x: sx + dw - offset, y: sy + dh - offset });
      const remaining = bottom - 2;
      const innerWidth = dw - 2 * offset;
      for (let index = 1; index <= remaining; index += 1) {
        allEyelets.push({ x: sx + offset + (innerWidth / (remaining + 1)) * index, y: sy + dh - offset });
      }
    }

    if (left > 0) {
      for (let index = 1; index <= left; index += 1) {
        allEyelets.push({ x: sx + offset, y: sy + (dh / (left + 1)) * index });
      }
    }
    if (right > 0) {
      for (let index = 1; index <= right; index += 1) {
        allEyelets.push({ x: sx + dw - offset, y: sy + (dh / (right + 1)) * index });
      }
    }
  } else if (mode === 'auto') {
    allEyelets.push({ x: sx + offset, y: sy + offset });
    allEyelets.push({ x: sx + dw - offset, y: sy + offset });
    allEyelets.push({ x: sx + dw - offset, y: sy + dh - offset });
    allEyelets.push({ x: sx + offset, y: sy + dh - offset });
    if (!isEx) {
      const topCount = Math.round(widthInFeet / 2) - 1;
      for (let index = 1; index <= topCount; index += 1) {
        allEyelets.push({ x: sx + (dw / (topCount + 1)) * index, y: sy + offset });
      }
      const bottomCount = Math.round(widthInFeet / 3) - 1;
      for (let index = 1; index <= bottomCount; index += 1) {
        allEyelets.push({ x: sx + (dw / (bottomCount + 1)) * index, y: sy + dh - offset });
      }
      const sideEach = (heightInFeet > 2.5 && heightInFeet <= 3) ? 1 : (heightInFeet > 3 && heightInFeet <= 4) ? 2 : (heightInFeet > 4) ? 2 : 0;
      for (let index = 1; index <= sideEach; index += 1) {
        const yPos = sy + (dh / (sideEach + 1)) * index;
        allEyelets.push({ x: sx + offset, y: yPos });
        allEyelets.push({ x: sx + dw - offset, y: yPos });
      }
    }
  }

  const totalEyelets = allEyelets.length;
  allEyelets.forEach((eyelet, index) => {
    const eyeletDelay = index / totalEyelets;
    const individualProgress = Math.max(0, Math.min(1, (runtimeState.eyeletAnimationProgress - eyeletDelay * 0.6) / 0.4));

    const easeOutBounce = (value) => {
      if (value < 1 / 2.75) return 7.5625 * value * value;
      if (value < 2 / 2.75) return 7.5625 * (value - (1.5 / 2.75)) * (value - (1.5 / 2.75)) + 0.75;
      if (value < 2.5 / 2.75) return 7.5625 * (value - (2.25 / 2.75)) * (value - (2.25 / 2.75)) + 0.9375;
      return 7.5625 * (value - (2.625 / 2.75)) * (value - (2.625 / 2.75)) + 0.984375;
    };

    const bounceProgress = easeOutBounce(individualProgress);
    const dropOffset = EYELET_DROP_HEIGHT * (1 - bounceProgress);
    drawEyelet(eyelet.x, eyelet.y, dropOffset, individualProgress);
  });
}

function triggerFinishingAnimation(context, mode) {
  if (runtimeState.finishingAnimationId) {
    cancelAnimationFrame(runtimeState.finishingAnimationId);
  }

  const startTime = performance.now();

  if (mode === 'pipe') {
    runtimeState.pipeAnimationProgress = 0;

    function animatePipe(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / PIPE_SLIDE_DURATION, 1);
      runtimeState.pipeAnimationProgress = 1 - Math.pow(1 - progress, 3);
      updatePreview(context);
      if (progress < 1) {
        runtimeState.finishingAnimationId = requestAnimationFrame(animatePipe);
      } else {
        runtimeState.finishingAnimationId = null;
        runtimeState.pipeAnimationProgress = 1;
      }
    }

    runtimeState.finishingAnimationId = requestAnimationFrame(animatePipe);
  } else if (mode === 'auto' || mode === 'manual') {
    runtimeState.eyeletAnimationProgress = 0;

    function animateEyelets(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / EYELET_DROP_DURATION, 1);
      runtimeState.eyeletAnimationProgress = progress;
      updatePreview(context);
      if (progress < 1) {
        runtimeState.finishingAnimationId = requestAnimationFrame(animateEyelets);
      } else {
        runtimeState.finishingAnimationId = null;
        runtimeState.eyeletAnimationProgress = 1;
      }
    }

    runtimeState.finishingAnimationId = requestAnimationFrame(animateEyelets);
  }
}

function drawDimensionLines(context, ctx, sx, sy, dw, dh, rawW, rawH, unit) {
  const offset = 45;
  const dangerColor = getComputedStyle(document.documentElement).getPropertyValue('--danger-color').trim() || '#dc3545';
  const textColor = '#212529';

  ctx.strokeStyle = dangerColor;
  ctx.lineWidth = 1.5;

  const lineY = sy - offset + 10;
  ctx.beginPath();
  ctx.moveTo(sx, lineY);
  ctx.lineTo(sx + dw, lineY);
  ctx.stroke();

  const lineX = sx - offset;
  ctx.beginPath();
  ctx.moveTo(lineX, sy);
  ctx.lineTo(lineX, sy + dh);
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = 'bold 13px Poppins';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${rawW.toFixed(2)} ${unit}`, sx + dw / 2, lineY - 5);

  ctx.save();
  ctx.translate(lineX - 10, sy + dh / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${rawH.toFixed(2)} ${unit}`, 0, 0);
  ctx.restore();

  const lastClickedASize = context.getLastClickedASize();
  if (lastClickedASize) {
    const bottomLineY = sy + dh + offset - 10;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 16px Poppins';
    ctx.fillText(lastClickedASize, sx + dw / 2, bottomLineY + 5);
    ctx.font = 'bold 13px Poppins';
  }
}