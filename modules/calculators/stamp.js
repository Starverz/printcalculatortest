// modules/calculators/stamp.js
// Stamp calculator logic extracted from app.js
// ctx = createStampContext() — provides stamps, stampCategories, stampInkColors,
//   selectedStampIndex (get/set), stampScrollPos (get/set), globalAgentMode,
//   currentCurrency, formatCurrency, isTaxEnabled, globalTaxPercent,
//   generateUniversalInvoice, addItemToQuotePad, showToast,
//   attachGridListeners, downloadElementAsJPG, getGlobalToggleHTML

export function renderStampPage(container, ctx) {
  const stamps = ctx.getStamps();
  const stampCategories = ctx.getStampCategories();
  const stampInkColors = ctx.getStampInkColors();
  const selectedStampIndex = ctx.getSelectedStampIndex();
  const globalAgentMode = ctx.getGlobalAgentMode();
  const currentCurrency = ctx.getCurrentCurrency();
  const stampScrollPos = ctx.getStampScrollPos();

  let toggleHTML = ctx.getGlobalToggleHTML('stamp');

  const groupedStamps = {};
  stamps.forEach((stamp, index) => {
    const cat = stamp.category || 'Others';
    if (!groupedStamps[cat]) groupedStamps[cat] = [];
    groupedStamps[cat].push({ data: stamp, originalIndex: index });
  });

  let html = `
        <h2 class="w-[75%] max-w-[1100px] mx-auto text-center text-2xl font-bold mb-6 text-gray-900 dark:text-white">Stamp - Select Model</h2>
        ${toggleHTML}
        <div class="material-grid-container">`;

  for (const cat of stampCategories) {
    const category = cat.name;
    const items = groupedStamps[category] || [];
    if (items.length === 0) continue;
    const catColor = cat.color || '#6b7280';
    let darkerColor = catColor;
    if (catColor.startsWith('#')) {
      const r = Math.max(0, parseInt(catColor.slice(1, 3), 16) - 40);
      const g = Math.max(0, parseInt(catColor.slice(3, 5), 16) - 40);
      const b = Math.max(0, parseInt(catColor.slice(5, 7), 16) - 40);
      darkerColor = `rgb(${r}, ${g}, ${b})`;
    }

    html += `
            <h3 class="text-lg font-extrabold uppercase tracking-wide mt-6 mb-3 pb-2 border-b-2" style="color: ${darkerColor}; border-color: ${darkerColor};">
                ${category}
            </h3>
            <div class="material-grid" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); margin-top: 0;">`;

    items.forEach(item => {
      const stamp = item.data;
      const i = item.originalIndex;
      const displayPrice = globalAgentMode ? stamp.agentPrice : stamp.customerPrice;
      const isActive = (i === selectedStampIndex) ? ' active' : '';
      const agentActive = globalAgentMode ? ' agent-active' : '';
      const dimLabel = stamp.shape === 'round' ? `${stamp.width}mm ⌀` : stamp.shape === 'square' ? `${stamp.width}mm` : `${stamp.width}x${stamp.height}mm`;
      const catBadge = stamp.category
        ? `<div class="text-[9px] font-extrabold uppercase mb-0.5 tracking-wider" style="color: ${catColor};">${stamp.category}</div>`
        : '';

      html += `
            <div class='material-card${isActive}${agentActive}' data-action="select-stamp" data-index="${i}">
                <div class='material-info'>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="display:flex; flex-direction:column;">
                            ${catBadge}
                            <strong>${stamp.name}</strong>
                        </div>
                        <span style="font-size: 10px; background: #e9ecef; padding: 2px 6px; border-radius: 4px; color: #495057; white-space: nowrap; margin-left: 4px;">${dimLabel}</span>
                    </div>
                    <span>${currentCurrency.symbol} ${ctx.formatCurrency(displayPrice)}</span>
                </div>
            </div>`;
    });
    html += `</div>`;
  }

  // Fallback "Others" for stamps not in stampCategories
  const handledCategories = new Set(stampCategories.map(c => c.name));
  let hasOthers = false;
  for (const [category, items] of Object.entries(groupedStamps)) {
    if (!handledCategories.has(category)) {
      if (!hasOthers) {
        hasOthers = true;
        html += `
            <h3 class="text-lg font-extrabold uppercase tracking-wide mt-6 mb-3 pb-2 border-b-2 text-gray-800 border-gray-200 dark:text-white dark:border-gray-700">
                Others
            </h3>
            <div class="material-grid" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); margin-top: 0;">`;
      }
      items.forEach(item => {
        const stamp = item.data;
        const i = item.originalIndex;
        const displayPrice = globalAgentMode ? stamp.agentPrice : stamp.customerPrice;
        const isActive = (i === selectedStampIndex) ? ' active' : '';
        const agentActive = globalAgentMode ? ' agent-active' : '';
      const dimLabel = stamp.shape === 'round' ? `${stamp.width}mm ⌀` : stamp.shape === 'square' ? `${stamp.width}mm` : `${stamp.width}x${stamp.height}mm`;

        html += `
            <div class='material-card${isActive}${agentActive}' data-action="select-stamp" data-index="${i}">
                <div class='material-info'>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="display:flex; flex-direction:column;">
                            <strong>${stamp.name}</strong>
                        </div>
                        <span style="font-size: 10px; background: #e9ecef; padding: 2px 6px; border-radius: 4px; color: #495057; white-space: nowrap; margin-left: 4px;">${dimLabel}</span>
                    </div>
                    <span>${currentCurrency.symbol} ${ctx.formatCurrency(displayPrice)}</span>
                </div>
            </div>`;
      });
    }
  }
  if (hasOthers) html += `</div>`;
  html += "</div>";

  if (selectedStampIndex !== null) {
    const s = stamps[selectedStampIndex];
    const activeColor = globalAgentMode ? 'var(--success-color)' : 'var(--primary-color)';

    html += `<div class="calculator-panel w-full max-w-5xl mx-auto mt-8 flex flex-col gap-4">
        <div class="settings-panel grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="flex flex-col gap-6">
                    <h3 class="text-2xl font-bold text-center lg:text-left" style="color: ${activeColor}; margin-top:0;">${s.name}</h3>
                    
                    <div class="flex justify-center lg:justify-start w-full"> 
                        <div class="p-2 bg-white rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm w-full lg:w-auto">
                            <img src="${s.img || 'https://placehold.co/220x220?text=No+Image'}" 
                                 alt="${s.name}" 
                                 class="stamp-product-img" 
                                 onerror="this.onerror=null; this.src='https://placehold.co/220x220?text=No+Image';">
                        </div>
                    </div>

                    <div>
                        <label class="font-semibold mb-2 block">Line Text (For Preview)</label>
                        <div class="flex flex-col gap-2">
                            <input type='text' id='stampLine1' placeholder="Line 1 (e.g. Company Name)" oninput="renderStampPreview()" class="w-full p-2 border rounded"/>
                            <input type='text' id='stampLine2' placeholder="Line 2 (e.g. Reg No)" oninput="renderStampPreview()" class="w-full p-2 border rounded"/>
                            <input type='text' id='stampLine3' placeholder="Line 3 (e.g. Address)" oninput="renderStampPreview()" class="w-full p-2 border rounded"/>
                        </div>
                    </div>

                    <div>
                        <label class="font-semibold mb-2 block">Ink Color</label>
                        <div class="size-btn-group flex flex-wrap gap-2" id="inkColorGroup">
                            ${stampInkColors.map((ink, idx) => `<button class="btn size-btn ${idx === 0 ? 'active' : ''}" onclick="setStampInk(${idx})" style="border-left: 5px solid ${ink.hex}; flex: 1 0 auto;">${ink.name}</button>`).join('')}
                        </div>
                        <input type="hidden" id="selectedInkIndex" value="0">
                    </div>
                </div>

                <div class="flex flex-col h-full">
                    <div class="flex-grow flex flex-col items-center justify-center mb-4 relative">
                        <canvas id="stampPreview" width="600" height="600" 
                            style="background-color: #ffffff; border-radius: 0.5rem; border: 1px solid #e5e7eb; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); width: 100%; height: auto; aspect-ratio: 1 / 1;">
                        </canvas>
                    </div>
                    <div class="result p-4 bg-white dark:bg-gray-800 border rounded-lg" id="stampResult"></div>
                </div>
            </div> 

            <div class="settings-panel" style="margin-top: 0;">
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <button id="addStampToPadBtn" class="btn" onclick="addStampToPad()" 
                        style="flex-grow: 1; width: auto; background-color: var(--success-color); color: white; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                        + Add to Pad
                    </button>
                    
                    <button class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600" onclick="copyStampInvoice()" 
                        style="width: auto; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                        Copy
                    </button>
                </div>
                
                <div class="invoice-copy-area" style="margin-top: 0;">
                <textarea id="stampInvoiceText" readonly rows="6" 
                    class="w-full font-mono text-sm border rounded-lg p-3 resize-y 
                           bg-white text-[#495057] border-gray-300 
                           dark:bg-[#374151] dark:text-[#f3f4f6] dark:border-gray-600"
                ></textarea>
            </div>
            </div>
            
            ${renderStampPriceList(null, true, 'stamp-price-list-container', true, ctx)}
        </div>`;
  }

  container.innerHTML = html;
  ctx.attachGridListeners(container);

  // Scroll Restoration
  const gridContainer = document.querySelector('.material-grid-container');
  if (gridContainer) {
    gridContainer.scrollTop = stampScrollPos;
    setTimeout(() => {
      const refoundGrid = document.querySelector('.material-grid-container');
      if (refoundGrid) refoundGrid.scrollTop = stampScrollPos;
    }, 0);
  }

  if (selectedStampIndex !== null) {
    calculateStampPrice(ctx);
    renderStampPreview(ctx);
  }
}

export function renderStampPriceList(forceAgent = null, includeDownload = true, containerId = 'stamp-price-list-container', showHeader = true, ctx) {
  const stamps = ctx.getStamps();
  const globalAgentMode = ctx.getGlobalAgentMode();
  const currentCurrency = ctx.getCurrentCurrency();

  const useAgent = forceAgent !== null ? forceAgent : globalAgentMode;
  const mainTitleColor = useAgent ? 'text-green-600 dark:text-green-500' : 'text-gray-900 dark:text-white';
  const titleText = useAgent ? 'STAMP PRICE LIST (AGENT)' : 'STAMP PRICE LIST (CUSTOMER)';

  const groupedStamps = {};
  stamps.forEach((stamp) => {
    const cat = stamp.category || 'Others';
    if (!groupedStamps[cat]) groupedStamps[cat] = [];
    groupedStamps[cat].push(stamp);
  });

  let html = `
        <div id="${containerId}" class="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-lg border border-gray-200 dark:border-gray-700">
            ${showHeader ? `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #374151; padding-bottom: 20px;">
              <h2 class="font-extrabold text-3xl tracking-wide ${mainTitleColor}" style="margin: 0; flex: 1;">${titleText}</h2>
              <button onclick="openStampCompareModal()" style="
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
              " class="hover:opacity-80" title="Compare Customer vs Agent Prices">
                <i class="fas fa-columns"></i>
              </button>
            </div>` : ''}`;

  for (const [category, items] of Object.entries(groupedStamps)) {
    let themeColorClass = 'bg-gray-600';
    let textColorClass = 'text-green-600 dark:text-green-500';

    if (category === 'Pre Ink Rubber Stamp') {
      themeColorClass = 'bg-green-600';
      textColorClass = 'text-green-600 dark:text-green-500';
    } else if (category === 'Flash Stamp') {
      themeColorClass = 'bg-teal-600';
      textColorClass = 'text-teal-600 dark:text-teal-500';
    } else if (category === 'Stamp Pad Rubber Stamp') {
      themeColorClass = 'bg-orange-600';
      textColorClass = 'text-orange-600 dark:text-orange-500';
    }

    html += `
            <div class="mb-10">
                <h3 class="font-extrabold text-xl mb-3 uppercase tracking-wider ${textColorClass}">${category}</h3>
                
                <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <table class="w-full border-collapse text-sm text-center" style="table-layout: fixed;">
                        <colgroup>
                            <col style="width: 40%;">
                            <col style="width: 25%;">
                            <col style="width: 20%;">
                            <col style="width: 15%;">
                        </colgroup>
                        <thead class="${themeColorClass} text-white">
                            <tr>
                                <th class="p-3 text-left font-bold uppercase tracking-wider">MODEL NAME</th>
                                <th class="p-3 text-center font-bold uppercase tracking-wider">SIZE (mm)</th>
                                <th class="p-3 text-center font-bold uppercase tracking-wider">SHAPE</th>
                                <th class="p-3 text-right font-bold uppercase tracking-wider">PRICE</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">`;
    items.forEach(s => {
      const price = useAgent ? s.agentPrice : s.customerPrice;
      const shapeLabel = s.shape.charAt(0).toUpperCase() + s.shape.slice(1);
      const dimLabel = s.shape === 'round' ? `${s.width} ⌀` : `${s.width} x ${s.height}`;
      html += `
                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td class="p-2 text-left text-gray-900 dark:text-gray-100 font-bold" style="word-wrap: break-word; overflow-wrap: break-word;">${s.name}</td>
                        <td class="p-2 text-center text-gray-700 dark:text-gray-300 font-medium">${dimLabel}</td>
                        <td class="p-2 text-center text-gray-700 dark:text-gray-300 font-medium">${shapeLabel}</td>
                        <td class="p-2 text-right text-gray-700 dark:text-gray-300 font-medium">${currentCurrency.symbol} ${ctx.formatCurrency(price)}</td>
                    </tr>`;
    });
    html += `   </tbody>
                    </table>
                </div>
            </div>`;
  }
  html += `
        <p class="text-center text-xs text-gray-500 dark:text-gray-400 mt-4 border-t pt-4">*Prices include standard ink (Blue/Black/Red).</p>
      </div>`;

  if (includeDownload) {
    html += `
      <div class="mt-4 text-center">
        <button class="btn btn-primary" style="width: auto;" onclick="downloadElementAsJPG(event, '${containerId}', 'stamp-price-list.jpg')">
          <i class="fas fa-download mr-2"></i> Download Price List (JPG)
        </button>
      </div>`;
  }
  return html;
}

export function openStampCompareModal(ctx) {
  const modal = document.getElementById('stampCompareModal');
  if (!modal) {
    ctx.showToast('Compare modal not found. Please refresh the page.', 'error');
    return;
  }
  const custPanel = document.getElementById('stampCompareCustPanel');
  const agentPanel = document.getElementById('stampCompareAgentPanel');
  const custScroll = document.getElementById('stampCompareCustScroll');
  const agentScroll = document.getElementById('stampCompareAgentScroll');

  custPanel.innerHTML = renderStampPriceList(false, false, 'stamp-compare-cust-price-list-container', false, ctx);
  agentPanel.innerHTML = renderStampPriceList(true, false, 'stamp-compare-agent-price-list-container', false, ctx);

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  if (custScroll && agentScroll) {
    custScroll.onscroll = () => { agentScroll.scrollTop = custScroll.scrollTop; };
    agentScroll.onscroll = () => { custScroll.scrollTop = agentScroll.scrollTop; };
  }
}

export function closeStampCompareModal() {
  const modal = document.getElementById('stampCompareModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

export function selectStamp(index, ctx) {
  const container = document.querySelector('.material-grid-container');
  if (container) ctx.setStampScrollPos(container.scrollTop);
  ctx.setSelectedStampIndex(index);
  renderStampPage(document.getElementById('contentArea'), ctx);
}

export function setStampInk(index, ctx) {
  document.getElementById('selectedInkIndex').value = index;
  document.querySelectorAll('#inkColorGroup .size-btn').forEach((btn, i) => {
    if (i === index) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  renderStampPreview(ctx);
  calculateStampPrice(ctx);
}

export function changeStampQty(delta, ctx) {
  const input = document.getElementById('stampQty');
  if (!input) return;
  let val = parseInt(input.value) || 1;
  val = Math.max(1, val + delta);
  input.value = val;
  calculateStampPrice(ctx);
}

export function calculateStampPrice(ctx) {
  const selectedStampIndex = ctx.getSelectedStampIndex();
  if (selectedStampIndex === null) return;
  const stamps = ctx.getStamps();
  const stamp = stamps[selectedStampIndex];
  const stampInkColors = ctx.getStampInkColors();
  const globalAgentMode = ctx.getGlobalAgentMode();
  const currentCurrency = ctx.getCurrentCurrency();
  const isTaxEnabled = ctx.getIsTaxEnabled();
  const globalTaxPercent = ctx.getGlobalTaxPercent();

  const qty = 1;
  const inkIndex = parseInt(document.getElementById('selectedInkIndex').value) || 0;
  const inkName = stampInkColors[inkIndex].name;

  const unitPrice = globalAgentMode ? stamp.agentPrice : stamp.customerPrice;
  const subTotal = unitPrice * qty;
  let finalTotal = subTotal;

  let taxHtml = '';
  if (isTaxEnabled) {
    const taxAmt = subTotal * (globalTaxPercent / 100);
    finalTotal += taxAmt;
    taxHtml = `<br>Tax (${globalTaxPercent}%): ${currentCurrency.symbol}${ctx.formatCurrency(taxAmt)}`;
  }

  const resultDiv = document.getElementById('stampResult');
  const activeColor = globalAgentMode ? 'var(--success-color)' : 'var(--primary-color)';

  resultDiv.innerHTML = `
            <strong>Model:</strong> ${stamp.name}<br>
            <strong>Ink:</strong> ${inkName}<br>
            <strong>Unit Price:</strong> ${currentCurrency.symbol}${ctx.formatCurrency(unitPrice)}<br>
            ${taxHtml}
            <div style="margin-top:8px; font-size:1.2em; color:${activeColor}; font-weight:bold;">
                Total: ${currentCurrency.symbol}${ctx.formatCurrency(finalTotal)}
            </div>
        `;

  const txtArea = document.getElementById('stampInvoiceText');
  if (txtArea) {
    const customDetails = [
      `Size: ${stamp.width}mm x ${stamp.height}mm (${stamp.shape})`,
      `Ink: ${inkName}`,
    ];
    txtArea.value = ctx.generateUniversalInvoice(`Stamp - ${stamp.name}`, customDetails, unitPrice, qty);
  }
}

export function renderStampPreview(ctx) {
  const canvas = document.getElementById('stampPreview');
  if (!canvas) return;
  const canvasCtx = canvas.getContext('2d');
  const stamps = ctx.getStamps();
  const stampInkColors = ctx.getStampInkColors();
  const selectedStampIndex = ctx.getSelectedStampIndex();
  const stamp = stamps[selectedStampIndex];
  const inkIndex = parseInt(document.getElementById('selectedInkIndex').value) || 0;
  const color = stampInkColors[inkIndex].hex;
  const line1 = document.getElementById('stampLine1').value;
  const line2 = document.getElementById('stampLine2').value;
  const line3 = document.getElementById('stampLine3').value;

  // Background
  canvasCtx.fillStyle = "#FFFFFF";
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

  // Scaling
  const padding = 200;
  const availW = canvas.width - padding;
  const availH = canvas.height - padding;
  const scale = Math.min(availW / stamp.width, availH / stamp.height);
  const drawW = stamp.width * scale;
  const drawH = stamp.height * scale;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Main shape
  canvasCtx.strokeStyle = color;
  canvasCtx.lineWidth = 3;
  canvasCtx.fillStyle = "#FFFFFF";
  canvasCtx.beginPath();
  if (stamp.shape === 'round') {
    canvasCtx.arc(cx, cy, drawW / 2, 0, Math.PI * 2);
  } else if (stamp.shape === 'oval') {
    canvasCtx.ellipse(cx, cy, drawW / 2, drawH / 2, 0, 0, Math.PI * 2);
  } else {
    canvasCtx.rect(cx - drawW / 2, cy - drawH / 2, drawW, drawH);
  }
  canvasCtx.fill();
  canvasCtx.stroke();

  // Text
  canvasCtx.fillStyle = color;
  canvasCtx.textAlign = 'center';
  canvasCtx.textBaseline = 'middle';
  const fontSize = Math.max(16, drawH / 4);
  canvasCtx.font = `bold ${fontSize}px Arial`;
  if (line2 && line3) {
    canvasCtx.fillText(line1, cx, cy - drawH / 3 + 5);
    canvasCtx.font = `${fontSize * 0.8}px Arial`;
    canvasCtx.fillText(line2, cx, cy + 2);
    canvasCtx.fillText(line3, cx, cy + drawH / 3);
  } else if (line2) {
    canvasCtx.fillText(line1, cx, cy - drawH / 4);
    canvasCtx.fillText(line2, cx, cy + drawH / 4);
  } else {
    canvasCtx.fillText(line1, cx, cy);
  }

  // Dimension lines
  canvasCtx.strokeStyle = "#dc3545";
  canvasCtx.fillStyle = "#000000";
  canvasCtx.lineWidth = 2;
  canvasCtx.font = "bold 20px Poppins, Arial";
  const offset = 25;

  // Width (Top)
  const topY = cy - drawH / 2 - offset;
  const leftX = cx - drawW / 2;
  const rightX = cx + drawW / 2;
  canvasCtx.beginPath(); canvasCtx.moveTo(leftX, topY); canvasCtx.lineTo(rightX, topY); canvasCtx.stroke();
  canvasCtx.beginPath(); canvasCtx.moveTo(leftX, topY - 6); canvasCtx.lineTo(leftX, topY + 6); canvasCtx.stroke();
  canvasCtx.beginPath(); canvasCtx.moveTo(rightX, topY - 6); canvasCtx.lineTo(rightX, topY + 6); canvasCtx.stroke();
  canvasCtx.textAlign = "center"; canvasCtx.textBaseline = "bottom";
  canvasCtx.fillText(`${stamp.width}mm`, cx, topY - 6);

  // Height (Left)
  const leftLineX = cx - drawW / 2 - offset;
  const topEdgeY = cy - drawH / 2;
  const bottomEdgeY = cy + drawH / 2;
  canvasCtx.beginPath(); canvasCtx.moveTo(leftLineX, topEdgeY); canvasCtx.lineTo(leftLineX, bottomEdgeY); canvasCtx.stroke();
  canvasCtx.beginPath(); canvasCtx.moveTo(leftLineX - 6, topEdgeY); canvasCtx.lineTo(leftLineX + 6, topEdgeY); canvasCtx.stroke();
  canvasCtx.beginPath(); canvasCtx.moveTo(leftLineX - 6, bottomEdgeY); canvasCtx.lineTo(leftLineX + 6, bottomEdgeY); canvasCtx.stroke();
  canvasCtx.save();
  canvasCtx.translate(leftLineX - 10, cy);
  canvasCtx.rotate(-Math.PI / 2);
  canvasCtx.textAlign = "center"; canvasCtx.textBaseline = "bottom";
  canvasCtx.fillText(`${stamp.height}mm`, 0, 0);
  canvasCtx.restore();

  // Model name label
  canvasCtx.fillStyle = "#111827";
  canvasCtx.textAlign = "center"; canvasCtx.textBaseline = "top";
  canvasCtx.font = "bold 18px Poppins, Arial";
  canvasCtx.fillText(stamp.name, cx, cy + drawH / 2 + 35);
}

export function addStampToPad(ctx) {
  const selectedStampIndex = ctx.getSelectedStampIndex();
  if (selectedStampIndex === null) return;
  const stamps = ctx.getStamps();
  const stamp = stamps[selectedStampIndex];
  const stampInkColors = ctx.getStampInkColors();
  const globalAgentMode = ctx.getGlobalAgentMode();

  const qty = 1;
  const inkIndex = parseInt(document.getElementById('selectedInkIndex').value) || 0;
  const inkName = stampInkColors[inkIndex].name;
  const line1 = document.getElementById('stampLine1').value;
  const unitPrice = globalAgentMode ? stamp.agentPrice : stamp.customerPrice;

  ctx.addItemToQuotePad({
    type: 'calculator',
    title: line1 ? `Stamp: ${line1}` : `Stamp: ${stamp.name}`,
    name: stamp.name,
    unitPrice,
    quantity: qty,
    details: {
      size: `Size: ${stamp.width}mm x ${stamp.height}mm`,
      material: `Shape: ${stamp.shape.toUpperCase()}`,
      finishing: `Ink: ${inkName}`,
    },
  });
}

export function copyStampInvoice() {
  const txt = document.getElementById('stampInvoiceText');
  if (!txt) return;
  txt.select();
  navigator.clipboard.writeText(txt.value).then(() => {
    // showToast is not needed since clipboard success is silent
  });
}

export function openStampPage(container, deps = {}) {
  if (typeof deps.setStampScrollPos === 'function') {
    deps.setStampScrollPos(0);
  }

  if (typeof deps.setGlobalAgentMode === 'function') {
    deps.setGlobalAgentMode(!!deps.globalAgentMode, 'stamp');
  }

  if (typeof deps.renderStampPage === 'function') {
    deps.renderStampPage(container);
  }
}
