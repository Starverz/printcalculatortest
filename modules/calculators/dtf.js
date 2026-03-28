/**
 * DTF & UVDTF Calculator Module
 */

import { closeCompareModal, openSyncedCompareModal } from '../utils/ui.js';

let _dtfPrevTotal = 0;

// ─────────────────────────── HELPERS ────────────────────────────

function buildDTFPriceListHTML(ctx, forceAgent = null, includeCompareBtn = true, containerId = 'dtf-price-list-container', showHeader = true) {
  const dtfData = ctx.getDTFData();
  const currentCurrency = ctx.getCurrentCurrency();
  const useAgent = forceAgent !== null ? forceAgent : ctx.getGlobalAgentMode();
  const tiers = useAgent ? dtfData.priceTiers.agent : dtfData.priceTiers.customer;
  const titleText = useAgent ? 'DTF PRICE LIST (AGENT)' : 'DTF PRICE LIST (CUSTOMER)';
  const mainTitleColor = useAgent ? 'text-green-600 dark:text-green-500' : 'text-gray-800 dark:text-white';
  const themeColor = useAgent ? '#16a34a' : '#7c3aed';

  return `
  <div id="${containerId}" class="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-lg border border-gray-200 dark:border-gray-700 mt-8">
    ${showHeader ? `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; border-bottom:2px solid #e5e7eb; padding-bottom:20px; gap:16px;">
      <h2 class="font-extrabold text-3xl tracking-wide ${mainTitleColor}" style="margin:0; flex:1;">${titleText}</h2>
      ${includeCompareBtn ? `<button onclick="openDTFCompareModal()" style="background-color:#e53e3e;border:none;color:white;width:48px;height:48px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all 0.3s ease;font-size:20px;" class="hover:opacity-80" title="Compare Customer vs Agent Prices"><i class="fas fa-columns"></i></button>` : ''}
    </div>` : ''}
    <div class="overflow-x-auto rounded-lg border" style="border-color:${themeColor};">
      <table class="w-full border-collapse text-sm">
        <thead style="background-color:${themeColor}; color:white;">
          <tr>
            <th class="p-3 text-left font-semibold">MINIMUM LENGTH</th>
            <th class="p-3 text-right font-semibold">PRICE PER METRE</th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800">
          ${tiers.map(t => `
            <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
              <td class="p-3 text-left text-gray-800 dark:text-gray-200 font-semibold">${t.minM}m and above</td>
              <td class="p-3 text-right" style="color:${themeColor}; font-weight:600;">${currentCurrency.symbol}${t.pricePerM.toFixed(2)} / m</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

export function openDTFCompareModal(ctx) {
  openSyncedCompareModal({
    modalId: 'dtfCompareModal',
    customerPanelId: 'dtfCompareCustPanel',
    agentPanelId: 'dtfCompareAgentPanel',
    customerScrollId: 'dtfCompareCustScroll',
    agentScrollId: 'dtfCompareAgentScroll',
    renderCustomer: () => buildDTFPriceListHTML(ctx, false, false, 'dtf-compare-cust-container', false),
    renderAgent: () => buildDTFPriceListHTML(ctx, true, false, 'dtf-compare-agent-container', false),
    onMissing: () => ctx.showToast('Compare modal not found. Please refresh the page.', 'error'),
  });
}

export function closeDTFCompareModal() {
  closeCompareModal('dtfCompareModal');
}

function drawDTFCanvas(widthCm, heightCm, artworkImg, artConfig, displayUnit = 'cm', rawW = null, rawH = null) {
  const wLabel = rawW !== null ? rawW : widthCm;
  const hLabel = rawH !== null ? rawH : heightCm;
  const unit = displayUnit;
  const canvas = document.getElementById('previewCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  if (!heightCm || heightCm <= 0) return;

  const pad = 85;
  const availW = W - pad * 2;
  const availH = H - pad * 2;
  const ratio = widthCm / heightCm;
  let drawW, drawH;
  if (ratio >= availW / availH) {
    drawW = availW;
    drawH = drawW / ratio;
  } else {
    drawH = availH;
    drawW = drawH * ratio;
  }
  const x = (W - drawW) / 2;
  const y = (H - drawH) / 2;

  if (artworkImg) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, drawW, drawH);

    const cfg = artConfig || {};
    const pxPerCm = drawW / widthCm;
    const artCmW = cfg.width > 0 ? cfg.width : widthCm;
    const imgNatW = artworkImg.naturalWidth || artworkImg.width || 1;
    const imgNatH = artworkImg.naturalHeight || artworkImg.height || 1;
    const artCmH = cfg.height > 0 ? cfg.height : (artCmW * imgNatH / imgNatW);
    const artW = artCmW * pxPerCm;
    const artH = artCmH * pxPerCm;
    const artX = x + (drawW - artW) / 2;
    const artY = y + (drawH - artH) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, drawW, drawH);
    ctx.clip();
    ctx.translate(artX + artW / 2, artY + artH / 2);
    ctx.rotate(((cfg.rotation || 0) * Math.PI) / 180);
    ctx.drawImage(artworkImg, -artW / 2, -artH / 2, artW, artH);
    ctx.restore();

    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, drawW, drawH);
  } else {
    const grad = ctx.createLinearGradient(x, y, x + drawW, y + drawH);
    grad.addColorStop(0, '#007BFF');
    grad.addColorStop(1, '#17a2b8');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, drawW, drawH);
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, drawW, drawH);
  }

  // Dimension lines (red, large-format style)
  const dangerColor = getComputedStyle(document.documentElement).getPropertyValue('--danger-color').trim() || '#dc3545';
  const textColor = '#212529';
  const offset = 45;

  ctx.strokeStyle = dangerColor;
  ctx.lineWidth = 1.5;

  const lineY = y - offset + 10;
  ctx.beginPath();
  ctx.moveTo(x, lineY);
  ctx.lineTo(x + drawW, lineY);
  ctx.stroke();

  const lineX = x - offset;
  ctx.beginPath();
  ctx.moveTo(lineX, y);
  ctx.lineTo(lineX, y + drawH);
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = 'bold 13px Poppins';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${wLabel} ${unit}`, x + drawW / 2, lineY - 5);

  ctx.save();
  ctx.translate(lineX - 10, y + drawH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${hLabel} ${unit}`, 0, 0);
  ctx.restore();
}

// ────────────────────────── MAIN PAGE ────────────────────────────

export function renderDTFPage(container, ctx, activeTab = 'dtf') {
  const { getGlobalToggleHTML } = ctx;
  const toggleHTML = getGlobalToggleHTML('dtf');
  const activeClass = 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500';
  const inactiveClass = 'text-gray-500 border-b-2 border-transparent hover:text-gray-600 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300';

  container.innerHTML = `
    <h2 class="text-center text-2xl font-bold mb-6 uppercase tracking-wide">DTF &amp; UVDTF</h2>
    ${toggleHTML}
    <div class="w-full max-w-5xl mx-auto">
      <div class="mb-6 border-b border-gray-200 dark:border-gray-700">
        <ul class="flex justify-center -mb-px text-sm font-medium text-center">
          <li class="me-2">
            <button onclick="renderDTFPage(document.getElementById('contentArea'), 'dtf')"
              class="inline-flex items-center justify-center p-4 transition-all duration-200 group ${activeTab === 'dtf' ? activeClass : inactiveClass}">
              <i class="fas fa-print mr-2 ${activeTab === 'dtf' ? 'text-blue-600 dark:text-blue-500' : ''}"></i>DTF Printing
            </button>
          </li>
          <li class="me-2">
            <button onclick="renderDTFPage(document.getElementById('contentArea'), 'uvdtf')"
              class="inline-flex items-center justify-center p-4 transition-all duration-200 group ${activeTab === 'uvdtf' ? activeClass : inactiveClass}">
              <i class="fas fa-star mr-2 ${activeTab === 'uvdtf' ? 'text-blue-600 dark:text-blue-500' : ''}"></i>UVDTF Sticker
            </button>
          </li>
        </ul>
      </div>
      <div id="dtfTabContent"></div>
    </div>`;

  const tabContent = document.getElementById('dtfTabContent');
  if (activeTab === 'dtf') {
    _renderDTFTab(tabContent, ctx);
  } else {
    _renderUVDTFTab(tabContent, ctx);
  }
}

// ───────────────────────── DTF TAB ───────────────────────────────

function _renderDTFTab(container, ctx) {
  const { getDTFData, getGlobalAgentMode, initArtworkDragAndDrop, getCurrentDTFUnit } = ctx;
  const dtfData = getDTFData();
  const isAgent = getGlobalAgentMode();
  const activeColor = isAgent ? 'var(--success-color)' : 'var(--primary-color)';
  const unit = getCurrentDTFUnit ? getCurrentDTFUnit() : 'cm';
  const unitLabels = { cm: 'Centimeter (cm)', mm: 'Millimeter (mm)', m: 'Meter (m)' };
  const defaultW = unit === 'mm' ? dtfData.fixedWidthCm * 10 : (unit === 'm' ? (dtfData.fixedWidthCm / 100).toFixed(2) : dtfData.fixedWidthCm);
  const defaultH = unit === 'mm' ? 1000 : (unit === 'm' ? '1.00' : 100);

  container.innerHTML = `
    <div class="calculator-panel mx-auto" style="max-width: 800px;">

      <!-- Custom Title -->
      <div style="margin-bottom: 12px;">
        <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Custom Title (Optional):</label>
        <input type="text" id="dtfItemTitle" placeholder="e.g., DTF Roll Design" oninput="kiraDTF()"
          class="p-2 border rounded-lg h-11 bg-white dark:bg-[#374151] text-gray-900 dark:text-white border-gray-300 dark:border-[#4b5563] w-full" />
      </div>

      <!-- Width + Height + Qty + Unit -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; align-items: end;">
        <div>
          <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Width:</label>
          <div style="position: relative;">
            <input type="number" id="dtfWidthCm" value="${defaultW}" min="0.01" step="0.1" oninput="kiraDTF()"
              class="p-2 border rounded-lg h-11 bg-white dark:bg-[#374151] text-gray-900 dark:text-white border-gray-300 dark:border-[#4b5563] w-full"
              style="padding-right: 38px; box-sizing: border-box;" />
            <span class="dtf-unit-badge" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">${unit}</span>
          </div>
        </div>
        <div>
          <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Height:</label>
          <div style="position: relative;">
            <input type="number" id="dtfHeightCm" value="${defaultH}" min="0.01" step="0.1" oninput="kiraDTF()"
              class="p-2 border rounded-lg h-11 bg-white dark:bg-[#374151] text-gray-900 dark:text-white border-gray-300 dark:border-[#4b5563] w-full"
              style="padding-right: 38px; box-sizing: border-box;" />
            <span class="dtf-unit-badge" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">${unit}</span>
          </div>
        </div>
        <div>
          <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Qty (pcs):</label>
          <input type="number" id="dtfQty" value="1" min="1" step="1" oninput="kiraDTF()"
            class="p-2 border rounded-lg h-11 bg-white dark:bg-[#374151] text-gray-900 dark:text-white border-gray-300 dark:border-[#4b5563] w-full" />
        </div>
        <div>
          <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Unit:</label>
          <div class="custom-sticker-dropdown" id="dtfUnitWrapper" onclick="toggleGenericStickerDropdown(event, 'dtfUnitWrapper')">
            <div class="custom-sticker-dropdown-trigger">
              <span class="custom-sticker-dropdown-label" id="dtfUnitLabel">${unitLabels[unit]}</span>
              <svg class="custom-sticker-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="custom-sticker-dropdown-options">
              <div class="custom-sticker-dropdown-option ${unit === 'cm' ? 'selected' : ''}" data-value="cm" onmousedown="changeDTFUnits('cm')">Centimeter (cm)</div>
              <div class="custom-sticker-dropdown-option ${unit === 'mm' ? 'selected' : ''}" data-value="mm" onmousedown="changeDTFUnits('mm')">Millimeter (mm)</div>
              <div class="custom-sticker-dropdown-option ${unit === 'm' ? 'selected' : ''}" data-value="m" onmousedown="changeDTFUnits('m')">Meter (m)</div>
            </div>
          </div>
        </div>
      </div>

      <div class="result mt-2" id="dtfResult"></div>

      <!-- Canvas -->
      <div id="previewCanvasWrapper" style="position: relative; width: fit-content; margin: 12px auto 0 auto;">
        <canvas id="previewCanvas" width="760" height="400" style="display: block;"></canvas>
        <div id="dragOverlay"
          style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                 background: rgba(255,255,255,0.85); border: 4px dashed var(--primary-color); z-index: 10;
                 align-items: center; justify-content: center; flex-direction: column; backdrop-filter: blur(2px);">
          <i class="fas fa-cloud-upload-alt" style="font-size: 48px; color: var(--primary-color); margin-bottom: 10px;"></i>
          <span style="font-weight: 700; color: var(--primary-color); font-size: 18px;">Drop Artwork Here</span>
        </div>
      </div>

      <!-- Artwork / Download buttons -->
      <div style="display: flex; justify-content: center; gap: 8px; margin-top: 12px; width: 760px; margin-left: auto; margin-right: auto;">
        <button class="btn btn-sm btn-secondary" id="artworkToolsBtn" onclick="toggleArtworkTools()"
          style="flex: 1; background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color);">
          <i class="fas fa-image mr-2"></i> Manage Artwork Design
          <i class="fas fa-chevron-down ml-1" id="artToggleIcon"></i>
        </button>
        <button class="btn btn-secondary btn-sm" id="downloadOptionsBtn" onclick="toggleDownloadOptions()"
          style="flex: 1; background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color);">
          <i class="fas fa-file-export mr-2"></i> Download Options
          <i class="fas fa-chevron-down ml-1" id="dlToggleIcon"></i>
        </button>
        <button class="btn btn-secondary btn-sm" onclick="downloadPreviewCanvas()"
          style="flex: 1; background: transparent; color: #28a745; border: 1px solid #28a745;">
          <i class="fas fa-camera mr-2"></i> Download Preview
        </button>
      </div>

      <!-- Artwork Tools panel (collapsible) -->
      <div id="artworkToolsPanel" class="panel-collapsible"
        style="background: var(--light-bg); padding-left: 16px; padding-right: 16px; border-radius: 8px;">

        <div style="display: flex; gap: 10px; margin-bottom: 12px; align-items: center;">
          <input type="file" id="designUpload" accept="image/png, image/jpeg, image/jpg, image/svg+xml, application/pdf"
            style="display: none;" onchange="handleDesignUpload(this)">
          <button class="btn btn-sm btn-primary" onclick="document.getElementById('designUpload').click()"
            style="width: auto; margin-top: 0; white-space: nowrap;">
            <i class="fas fa-upload mr-2"></i> Upload Image
          </button>
          <button class="btn btn-sm btn-danger" onclick="clearDesign()"
            style="width: auto; margin-top: 0; white-space: nowrap;">
            <i class="fas fa-trash mr-2"></i> Clear
          </button>
          <div class="artwork-filename-wrapper">
            <span id="designFileName" class="artwork-filename-text"></span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr auto auto auto; gap: 8px; align-items: end;">
          <div>
            <label id="designWLabel" style="font-size: 11px;">Design Width:</label>
            <div style="position: relative;">
              <input type="number" id="designW" step="0.1" oninput="updateDesignDims('w')" disabled
                style="padding-right: 30px;">
              <span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">cm</span>
            </div>
          </div>
          <div>
            <label id="designHLabel" style="font-size: 11px;">Design Height:</label>
            <div style="position: relative;">
              <input type="number" id="designH" step="0.1" oninput="updateDesignDims('h')" disabled
                style="padding-right: 30px;">
              <span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">cm</span>
            </div>
          </div>
          <button class="btn btn-sm bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
            onclick="rotateDesignImg()" title="Rotate 90°"
            style="height: 42px; width: 42px; display: flex; align-items: center; justify-content: center; margin-top: 0;">
            <i class="fas fa-sync-alt"></i>
          </button>
          <button class="btn btn-sm bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 active-control"
            id="artLockBtn" onclick="toggleArtLock()" title="Lock Ratio"
            style="height: 42px; width: 42px; display: flex; align-items: center; justify-content: center; margin-top: 0;">
            <i class="fas fa-lock"></i>
          </button>
          <button class="btn btn-sm bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
            onclick="resetArtworkFit()" title="Reset to Fit"
            style="height: 42px; width: 42px; display: flex; align-items: center; justify-content: center; margin-top: 0;">
            <i class="fas fa-compress-arrows-alt"></i>
          </button>
        </div>
        <p style="font-size: 11px; color: var(--text-secondary); margin-top: 8px; margin-bottom: 0;">* Design is automatically scaled to fit within material bounds.</p>
      </div>

      <!-- Download Options panel (collapsible) -->
      <div id="downloadOptionsPanel" class="panel-collapsible"
        style="background: var(--light-bg); padding-left: 16px; padding-right: 16px; border-radius: 8px;">
        <div style="margin-bottom: 12px;">
          <div style="display: flex; gap: 8px; align-items: end; flex-wrap: wrap;">
            <div>
              <label style="font-size: 11px; font-weight: 700; margin-bottom: 6px; display: block;">Select DPI:</label>
              <div class="size-btn-group" id="dpiBtnGroup">
                <button class="btn size-btn" onclick="setDownloadDPI(72)">72</button>
                <button class="btn size-btn" onclick="setDownloadDPI(100)">100</button>
                <button class="btn size-btn" onclick="setDownloadDPI(150)">150</button>
                <button class="btn size-btn" onclick="setDownloadDPI(200)">200</button>
                <button class="btn size-btn" onclick="setDownloadDPI(250)">250</button>
                <button class="btn size-btn active" onclick="setDownloadDPI(300)">300</button>
              </div>
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; margin-bottom: 6px; display: block;">File Type:</label>
              <div class="size-btn-group" id="fileTypeBtnGroup">
                <button class="btn size-btn active" onclick="setFileType('jpg')">JPG</button>
                <button class="btn size-btn" onclick="setFileType('png')">PNG</button>
              </div>
            </div>
            <div style="flex: 1; min-width: 160px;">
              <label style="font-size: 11px; font-weight: 700; margin-bottom: 6px; display: block;">Custom DPI:</label>
              <div style="display: flex; gap: 6px; align-items: center;">
                <input type="number" id="customDpiInput" placeholder="e.g. 400" min="1" max="9999"
                  class="p-2 border rounded-lg h-9 bg-white dark:bg-[#374151] text-gray-900 dark:text-white border-gray-300 dark:border-[#4b5563] w-full" />
                <button class="btn size-btn" onclick="setCustomDPI()" style="white-space: nowrap;">Set DPI</button>
              </div>
            </div>
          </div>
        </div>
        <button class="btn w-full" onclick="handleFinalDownload()"
          style="background-color: var(--primary-color); color: white; margin-top: 0;">
          <i class="fas fa-download mr-2"></i> Download File
        </button>
      </div>

      <!-- Add to Pad + Copy buttons -->
      <div style="display: flex; gap: 8px; margin-top: 16px;">
        <button id="addDTFToPadBtn" class="btn"
          onclick="addDTFToPad()"
          style="flex-grow: 1; width: auto; background-color: var(--success-color); color: white; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
          + Add to Pad
        </button>
        <button class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
          onclick="copyGiftInvoice('dtfInvoiceText')"
          style="width: auto; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
          Copy
        </button>
      </div>

      <!-- Invoice textarea -->
      <div class="invoice-copy-area" style="margin-top: 8px;">
        <textarea id="dtfInvoiceText" readonly rows="1"
          class="w-full font-mono text-sm border rounded-lg p-3
                 bg-[#e9ecef] text-[#495057] border-gray-300
                 dark:bg-[#1f2937] dark:text-[#e5e7eb] dark:border-gray-600"
          style="overflow:hidden; resize:none;"
        ></textarea>
      </div>
      <!-- Static price tier table -->
      ${buildDTFPriceListHTML(ctx)}
    </div>`;

  initArtworkDragAndDrop();
  _dtfPrevTotal = 0;
  kiraDTF(ctx);
}

export function kiraDTF(ctx) {
  const {
    getDTFData,
    getGlobalAgentMode,
    getCurrentCurrency,
    formatCurrency,
    generateUniversalInvoice,
    getArtConfig,
    getUploadedArtworkImg,
    getCurrentDTFUnit,
    convertToMm,
  } = ctx;

  const dtfData = getDTFData();
  const isAgent = getGlobalAgentMode();
  const currentCurrency = getCurrentCurrency();
  const activeColor = isAgent ? 'var(--success-color)' : 'var(--primary-color)';
  const unit = getCurrentDTFUnit ? getCurrentDTFUnit() : 'cm';

  const rawW = parseFloat(document.getElementById('dtfWidthCm')?.value) || dtfData.fixedWidthCm;
  const rawH = parseFloat(document.getElementById('dtfHeightCm')?.value) || 0;
  const qty = Math.max(1, parseInt(document.getElementById('dtfQty')?.value) || 1);

  // Convert to cm for internal pricing
  const toCm = (val) => convertToMm ? convertToMm(val, unit) / 10 : val;
  const widthCm = toCm(rawW);
  const heightCm = toCm(rawH);
  const totalHeightCm = heightCm * qty;

  const tiers = isAgent ? dtfData.priceTiers.agent : dtfData.priceTiers.customer;

  // Tier based on total length (height × qty)
  const totalHeightM = totalHeightCm / 100;
  let applicableTier = tiers[0];
  for (const t of tiers) {
    if (totalHeightM >= t.minM) applicableTier = t;
  }

  const total = (applicableTier.pricePerM / 100) * totalHeightCm;

  drawDTFCanvas(widthCm, heightCm, getUploadedArtworkImg(), getArtConfig(), unit, rawW, rawH);

  const fmt = (v) => Number.isInteger(v) ? `${v}` : parseFloat(v.toPrecision(6)).toString();
  const totalRaw = rawH * qty;

  const resultEl = document.getElementById('dtfResult');
  if (resultEl) {
    if (heightCm > 0) {
      const _dtfDetailsCollapsed = resultEl.querySelector('[data-dtf-details][data-open="false"]') !== null;
      resultEl.innerHTML = `
        <div data-dtf-invoice style="display:flex; align-items:stretch; justify-content:space-between; gap:17px; flex-wrap:wrap;">
          <div style="flex:1; min-width:260px;">
            <button onclick="(function(btn){var d=btn.closest('[data-dtf-invoice]').querySelector('[data-dtf-details]');var open=d.dataset.open!=='false';if(open){d.style.maxHeight='0';d.dataset.open='false';btn.querySelector('i').style.transform='rotate(-90deg)';}else{d.style.maxHeight=d.scrollHeight+'px';d.dataset.open='true';btn.querySelector('i').style.transform='rotate(0deg)';};})(this)" style="background:none;border:none;padding:0;cursor:pointer;display:flex;align-items:center;gap:5px;color:var(--text-secondary);font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:4px;" title="Toggle details">
              <i class="fas fa-chevron-down" style="font-size:10px;transition:transform 0.2s;"></i> Details
            </button>
            <div data-dtf-details data-open="true" style="font-size:14px; line-height:1.7; color:var(--text-secondary); overflow:hidden; max-height:600px; transition:max-height 0.35s ease;">
              Artwork Size : ${fmt(rawW)}${unit} (W) x ${fmt(rawH)}${unit} (H)<br>
              Total Size : ${fmt(rawH)}${unit} x ${qty}pcs = ${fmt(totalRaw)}${unit}<br>
              Rate : ${currentCurrency.symbol}${formatCurrency(applicableTier.pricePerM)}/m
            </div>
          </div>
          <div style="padding-left:14px; border-left:1px solid var(--border-color); text-align:right; flex-shrink:0; display:flex; flex-direction:column; justify-content:flex-end;">
            <div style="font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-secondary); margin-bottom:3px;">Total Price</div>
            <div style="font-size:28px; font-weight:800; color:${activeColor}; line-height:1; white-space:nowrap;">
              ${currentCurrency.symbol}<span id="dtfPriceTicker">${formatCurrency(_dtfPrevTotal)}</span>
            </div>
          </div>
        </div>`;
      if (_dtfDetailsCollapsed) {
        const d = resultEl.querySelector('[data-dtf-details]');
        const i = resultEl.querySelector('[data-dtf-invoice] button i');
        if (d) { d.style.maxHeight = '0'; d.dataset.open = 'false'; }
        if (i) { i.style.transform = 'rotate(-90deg)'; }
      }
      ctx.animatePriceTicker('dtfPriceTicker', _dtfPrevTotal, total, 500);
      _dtfPrevTotal = total;
    } else {
      resultEl.innerHTML = '';
      _dtfPrevTotal = 0;
    }
  }

  // Populate hidden textarea for Copy button
  const title = document.getElementById('dtfItemTitle')?.value?.trim() || 'DTF Print';
  const invoiceEl = document.getElementById('dtfInvoiceText');
  if (invoiceEl) {
    invoiceEl.value = generateUniversalInvoice(
      title,
      [
        `Artwork Size  : ${fmt(rawW)}${unit} (W) x ${fmt(rawH)}${unit} (H)`,
        `Total Size : ${fmt(rawH)}${unit} x ${qty}pcs = ${fmt(totalRaw)}${unit}`,
      ],
      total,
      1,
      { showQty: false, showPrice: false, unitLabel: '' }
    );
    invoiceEl.style.height = 'auto';
    invoiceEl.style.height = invoiceEl.scrollHeight + 'px';
  }

  // Keep static price list in sync with agent/customer mode
  const priceListEl = document.getElementById('dtf-price-list-container');
  if (priceListEl) {
    priceListEl.outerHTML = buildDTFPriceListHTML(ctx);
  }
}

export function addDTFToPad(ctx) {
  const { getDTFData, getGlobalAgentMode, addItemToQuotePad, showToast, getCurrentDTFUnit, convertToMm } = ctx;
  const dtfData = getDTFData();
  const unit = getCurrentDTFUnit ? getCurrentDTFUnit() : 'cm';

  const rawW = parseFloat(document.getElementById('dtfWidthCm')?.value) || dtfData.fixedWidthCm;
  const rawH = parseFloat(document.getElementById('dtfHeightCm')?.value) || 0;
  const qty = Math.max(1, parseInt(document.getElementById('dtfQty')?.value) || 1);
  if (rawH <= 0) {
    showToast('Please enter a valid height.', 'error');
    return;
  }

  const toCm = (val) => convertToMm ? convertToMm(val, unit) / 10 : val;
  const widthCm = toCm(rawW);
  const heightCm = toCm(rawH);
  const totalHeightCm = heightCm * qty;

  const tiers = getGlobalAgentMode() ? dtfData.priceTiers.agent : dtfData.priceTiers.customer;
  const totalHeightM = totalHeightCm / 100;
  let applicableTier = tiers[0];
  for (const t of tiers) {
    if (totalHeightM >= t.minM) applicableTier = t;
  }

  const total = (applicableTier.pricePerM / 100) * totalHeightCm;
  const title = document.getElementById('dtfItemTitle')?.value?.trim() || 'DTF Print';

  addItemToQuotePad({
    type: 'calculator',
    title,
    name: 'DTF Print',
    unitPrice: total,
    quantity: 1,
    details: {
      width: `${rawW}${unit}`,
      height: `${rawH}${unit} x ${qty}pcs = ${totalHeightCm.toFixed(1)}cm`,
      rate: `RM${applicableTier.pricePerM.toFixed(2)}/m`,
    },
  });
}

// ─────────────────────────── UVDTF TAB ────────────────────────────

function _renderUVDTFTab(container, ctx) {
  const { getUVDTFData, initArtworkDragAndDrop } = ctx;
  const uvdtfData = getUVDTFData();

  container.innerHTML = `
    <div class="calculator-panel mx-auto" style="max-width: 800px;">
      <!-- Row 1: Custom Title -->
      <div class="mb-4">
        <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Custom Title (Optional):</label>
        <input type="text" id="uvdtfItemTitle" placeholder="e.g., UVDTF Sticker Name" oninput="kiraUVDTF()"
          class="p-2 border rounded-lg h-11 bg-white dark:bg-[#374151] text-gray-900 dark:text-white border-gray-300 dark:border-[#4b5563] w-full" />
      </div>

      <!-- Row 2: UVDTF Type + Quantity (equal width) -->
      <div class="mb-4" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">UVDTF Type:</label>
          <div class="custom-sticker-dropdown" id="uvdtfTypeWrapper"
            onclick="toggleGenericStickerDropdown(event, 'uvdtfTypeWrapper')">
            <div class="custom-sticker-dropdown-trigger">
              <span class="custom-sticker-dropdown-label" id="uvdtfTypeLabel">${uvdtfData.variants[0].label}</span>
              <svg class="custom-sticker-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="custom-sticker-dropdown-options">
              ${uvdtfData.variants.map((v, i) =>
                `<div class="custom-sticker-dropdown-option ${i === 0 ? 'selected' : ''}"
                  onmousedown="selectGenericStickerDropdownOption('uvdtfType', 'uvdtfTypeWrapper', '${i}', 'kiraUVDTF')">${v.label}</div>`
              ).join('')}
            </div>
            <select id="uvdtfType" class="hidden-native-select" style="display:none;" onchange="kiraUVDTF()">
              ${uvdtfData.variants.map((v, i) => `<option value="${i}">${v.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Quantity:</label>
          <input type="number" id="uvdtfQty" value="1" min="1" oninput="kiraUVDTF()"
            class="p-2 border rounded-lg h-11 bg-white dark:bg-[#374151] text-gray-900 dark:text-white border-gray-300 dark:border-[#4b5563] w-full" />
        </div>
      </div>

      <div class="result mt-4" id="uvdtfResult"></div>

      <!-- Canvas -->
      <div id="previewCanvasWrapper" style="position: relative; width: fit-content; margin: 12px auto 0 auto;">
        <canvas id="previewCanvas" width="760" height="400" style="display: block;"></canvas>
        <div id="dragOverlay"
          style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                 background: rgba(255,255,255,0.85); border: 4px dashed var(--primary-color); z-index: 10;
                 align-items: center; justify-content: center; flex-direction: column; backdrop-filter: blur(2px);">
          <i class="fas fa-cloud-upload-alt" style="font-size: 48px; color: var(--primary-color); margin-bottom: 10px;"></i>
          <span style="font-weight: 700; color: var(--primary-color); font-size: 18px;">Drop Artwork Here</span>
        </div>
      </div>

      <!-- Artwork / Download buttons -->
      <div style="display: flex; justify-content: center; gap: 8px; margin-top: 12px; width: 760px; margin-left: auto; margin-right: auto;">
        <button class="btn btn-sm btn-secondary" id="artworkToolsBtn" onclick="toggleArtworkTools()"
          style="flex: 1; background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color);">
          <i class="fas fa-image mr-2"></i> Manage Artwork Design
          <i class="fas fa-chevron-down ml-1" id="artToggleIcon"></i>
        </button>
        <button class="btn btn-secondary btn-sm" id="downloadOptionsBtn" onclick="toggleDownloadOptions()"
          style="flex: 1; background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color);">
          <i class="fas fa-file-export mr-2"></i> Download Options
          <i class="fas fa-chevron-down ml-1" id="dlToggleIcon"></i>
        </button>
        <button class="btn btn-secondary btn-sm" onclick="downloadPreviewCanvas()"
          style="flex: 1; background: transparent; color: #28a745; border: 1px solid #28a745;">
          <i class="fas fa-camera mr-2"></i> Download Preview
        </button>
      </div>

      <!-- Download Options panel (collapsible) -->
      <div id="downloadOptionsPanel" class="panel-collapsible"
        style="background: var(--light-bg); padding-left: 16px; padding-right: 16px; border-radius: 8px;">
        <div style="margin-bottom: 12px;">
          <div style="display: flex; gap: 8px; align-items: end; flex-wrap: wrap;">
            <div>
              <label style="font-size: 11px; font-weight: 700; margin-bottom: 6px; display: block;">Select DPI:</label>
              <div class="size-btn-group" id="dpiBtnGroup">
                <button class="btn size-btn" onclick="setDownloadDPI(72)">72</button>
                <button class="btn size-btn" onclick="setDownloadDPI(100)">100</button>
                <button class="btn size-btn" onclick="setDownloadDPI(150)">150</button>
                <button class="btn size-btn" onclick="setDownloadDPI(200)">200</button>
                <button class="btn size-btn" onclick="setDownloadDPI(250)">250</button>
                <button class="btn size-btn active" onclick="setDownloadDPI(300)">300</button>
              </div>
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 700; margin-bottom: 6px; display: block;">Custom:</label>
              <input type="number" id="customDpiInput" placeholder="300" oninput="setCustomDPI(this.value)"
                style="width: 80px; padding: 8px 10px;">
            </div>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: end; gap: 10px; flex-wrap: wrap;">
          <div>
            <label style="font-size: 11px; font-weight: 700; margin-bottom: 6px; display: block;">Select File Type:</label>
            <div class="size-btn-group" id="fileTypeBtnGroup">
              <button class="btn size-btn" onclick="setFileType('jpg')">JPG</button>
              <button class="btn size-btn active" onclick="setFileType('svg')">SVG</button>
              <button class="btn size-btn" onclick="setFileType('pdf')">PDF</button>
            </div>
          </div>
          <button class="btn btn-primary" onclick="handleFinalDownload()"
            style="width: auto; padding: 10px 24px; margin-top: 0;">
            <i class="fas fa-download mr-2"></i> Download
          </button>
        </div>
      </div>

      <!-- Artwork Tools panel (collapsible) -->
      <div id="artworkToolsPanel" class="panel-collapsible"
        style="background: var(--light-bg); padding-left: 16px; padding-right: 16px; border-radius: 8px;">
        <div style="display: flex; gap: 10px; margin-bottom: 12px; align-items: center; flex-wrap: wrap;">
          <input type="file" id="designUpload" accept="image/png, image/jpeg, image/jpg, image/svg+xml, application/pdf"
            style="display: none;" onchange="handleDesignUpload(this)">
          <button class="btn btn-sm btn-primary" onclick="document.getElementById('designUpload').click()"
            style="width: auto; margin-top: 0; white-space: nowrap;">
            <i class="fas fa-upload mr-2"></i> Upload Image
          </button>
          <button class="btn btn-sm btn-danger" onclick="clearDesign()"
            style="width: auto; margin-top: 0; white-space: nowrap;">
            <i class="fas fa-trash mr-2"></i> Clear
          </button>
          <span id="designFileName" class="text-xs text-gray-400 truncate"></span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr auto auto auto; gap: 8px; align-items: end;">
          <div>
            <label style="font-size: 11px; font-weight: 700; margin-bottom: 6px; display: block;">Design Width:</label>
            <div style="position: relative;">
              <input type="number" id="designW" step="0.1" oninput="updateDesignDims('w')" disabled
                style="padding-right: 30px; width: 100%;">
              <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">cm</span>
            </div>
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 700; margin-bottom: 6px; display: block;">Design Height:</label>
            <div style="position: relative;">
              <input type="number" id="designH" step="0.1" oninput="updateDesignDims('h')" disabled
                style="padding-right: 30px; width: 100%;">
              <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">cm</span>
            </div>
          </div>
          <button class="btn btn-sm bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
            onclick="rotateDesignImg()" title="Rotate 90°"
            style="height: 42px; width: 42px; display: flex; align-items: center; justify-content: center; margin-top: 0;">
            <i class="fas fa-sync-alt"></i>
          </button>
          <button class="btn btn-sm bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 active-control"
            id="artLockBtn" onclick="toggleArtLock()" title="Lock Ratio"
            style="height: 42px; width: 42px; display: flex; align-items: center; justify-content: center; margin-top: 0;">
            <i class="fas fa-lock"></i>
          </button>
          <button class="btn btn-sm bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
            onclick="resetArtworkFit()" title="Reset to Fit"
            style="height: 42px; width: 42px; display: flex; align-items: center; justify-content: center; margin-top: 0;">
            <i class="fas fa-compress-arrows-alt"></i>
          </button>
        </div>
        <p style="font-size: 11px; color: var(--text-secondary); margin-top: 8px; margin-bottom: 0;">
          * Design is automatically scaled to fit within material bounds.
        </p>
      </div>

      <!-- Add to Pad + Copy buttons -->
      <div style="display: flex; gap: 8px; margin-top: 16px;">
        <button id="addUVDTFToPadBtn" class="btn" onclick="addUVDTFToPad()"
          style="flex-grow: 1; width: auto; background-color: var(--success-color); color: white; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
          + Add to Pad
        </button>
        <button class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
          onclick="copyGiftInvoice('uvdtfInvoiceText')"
          style="width: auto; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
          Copy
        </button>
      </div>

      <!-- Invoice textarea -->
      <div class="invoice-copy-area" style="margin-top: 8px;">
        <textarea id="uvdtfInvoiceText" readonly rows="7"
          class="w-full font-mono text-sm border rounded-lg p-3 resize-y
                 bg-[#e9ecef] text-[#495057] border-gray-300
                 dark:bg-[#1f2937] dark:text-[#e5e7eb] dark:border-gray-600"
        ></textarea>
      </div>
    </div>`;

  initArtworkDragAndDrop();
  kiraUVDTF(ctx);
}

export function kiraUVDTF(ctx) {
  const {
    getUVDTFData,
    getGlobalAgentMode,
    getCurrentCurrency,
    formatCurrency,
    generateUniversalInvoice,
    getUploadedArtworkImg,
    getArtConfig,
  } = ctx;

  const uvdtfData = getUVDTFData();
  const isAgent = getGlobalAgentMode();
  const currentCurrency = getCurrentCurrency();
  const activeColor = isAgent ? 'var(--success-color)' : 'var(--primary-color)';

  const typeIdx = parseInt(document.getElementById('uvdtfType')?.value || 0);
  const qty = parseInt(document.getElementById('uvdtfQty')?.value) || 1;
  const variant = uvdtfData.variants[typeIdx];
  const base = isAgent ? variant.agentPrice : variant.customerPrice;

  let discount = 1.0;
  for (const t of (uvdtfData.tiers || [])) {
    if (qty >= t.qty) discount = t.discount;
  }

  const unitPrice = base * discount;
  const total = unitPrice * qty;

  const resultEl = document.getElementById('uvdtfResult');
  if (resultEl) {
    resultEl.innerHTML = `<strong style="color:${activeColor}">Unit: ${currentCurrency.symbol}${formatCurrency(unitPrice)} | Total: ${currentCurrency.symbol}${formatCurrency(total)}</strong>`;
  }

  const dW = parseFloat(document.getElementById('designW')?.value) || 10;
  const dH = parseFloat(document.getElementById('designH')?.value) || 10;
  drawDTFCanvas(dW, dH, getUploadedArtworkImg(), getArtConfig(), 'cm', dW, dH);

  const invoiceEl = document.getElementById('uvdtfInvoiceText');
  if (invoiceEl) {
    const title = document.getElementById('uvdtfItemTitle')?.value?.trim() || 'UVDTF Sticker';
    invoiceEl.value = generateUniversalInvoice(
      title,
      [`Type: ${variant.label}`],
      unitPrice,
      qty
    );
  }
}

export function addUVDTFToPad(ctx) {
  const { getUVDTFData, getGlobalAgentMode, addItemToQuotePad } = ctx;
  const uvdtfData = getUVDTFData();

  const typeIdx = parseInt(document.getElementById('uvdtfType')?.value || 0);
  const qty = parseInt(document.getElementById('uvdtfQty')?.value) || 1;
  const variant = uvdtfData.variants[typeIdx];
  const base = getGlobalAgentMode() ? variant.agentPrice : variant.customerPrice;

  let discount = 1.0;
  for (const t of (uvdtfData.tiers || [])) {
    if (qty >= t.qty) discount = t.discount;
  }

  addItemToQuotePad({
    type: 'calculator',
    title: 'UVDTF Sticker',
    name: 'UVDTF',
    unitPrice: base * discount,
    quantity: qty,
    details: { type: variant.label },
  });
}
