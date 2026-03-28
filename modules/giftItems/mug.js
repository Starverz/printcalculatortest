/**
 * Mug Printing Calculator Module
 */

export function renderMugPage(container, ctx) {
  const { getMugData, getGlobalAgentMode, getCurrentCurrency, formatCurrency } = ctx;
  const mugData = getMugData();
  const firstTypes = mugData.versions[0].types;

  const SVG_ARROW = `<svg class="custom-sticker-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  container.innerHTML = `
    <div class="calculator-panel mx-auto" style="max-width: 800px;">
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Mug Version:</label>
          <div class="custom-sticker-dropdown" id="mugVersionWrapper" onclick="toggleGenericStickerDropdown(event, 'mugVersionWrapper')">
            <div class="custom-sticker-dropdown-trigger">
              <span class="custom-sticker-dropdown-label" id="mugVersionLabel">${mugData.versions[0].label}</span>
              ${SVG_ARROW}
            </div>
            <div class="custom-sticker-dropdown-options">
              ${mugData.versions.map((v, i) => `<div class="custom-sticker-dropdown-option ${i === 0 ? 'selected' : ''}" onmousedown="selectGenericStickerDropdownOption('mugVersion', 'mugVersionWrapper', '${i}', 'mugVersionChange')">${v.label}</div>`).join('')}
            </div>
            <select id="mugVersion" class="hidden-native-select" style="display:none;" onchange="mugVersionChange(this.value)">
              ${mugData.versions.map((v, i) => `<option value="${i}">${v.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Mug Type:</label>
          <div class="custom-sticker-dropdown" id="mugTypeWrapper" onclick="toggleGenericStickerDropdown(event, 'mugTypeWrapper')">
            <div class="custom-sticker-dropdown-trigger">
              <span class="custom-sticker-dropdown-label" id="mugTypeLabel">${firstTypes[0].label}</span>
              ${SVG_ARROW}
            </div>
            <div class="custom-sticker-dropdown-options">
              ${firstTypes.map((t, i) => `<div class="custom-sticker-dropdown-option ${i === 0 ? 'selected' : ''}" onmousedown="selectGenericStickerDropdownOption('mugType', 'mugTypeWrapper', '${i}', 'kiraMug')">${t.label}</div>`).join('')}
            </div>
            <select id="mugType" class="hidden-native-select" style="display:none;" onchange="kiraMug()">
              ${firstTypes.map((t, i) => `<option value="${i}">${t.label}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
      <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Quantity:</label>
      <input type="number" id="mugQty" value="1" min="1" oninput="kiraMug()"
        class="p-2 border rounded-lg h-11 bg-white dark:bg-[#374151] text-gray-900 dark:text-white border-gray-300 dark:border-[#4b5563] w-full">
      <div class="result mt-4" id="mugResult"></div>
      <div style="margin-top: 12px;">
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <button id="addMugToPadBtn" class="btn" onclick="addMugToPad()"
            style="flex-grow: 1; width: auto; background-color: var(--success-color); color: white; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
            + Add to Pad
          </button>
          <button class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
            onclick="copyGiftInvoice('mugInvoiceText')"
            style="width: auto; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
            Copy
          </button>
        </div>
        <div class="invoice-copy-area" style="margin-top: 0;">
          <textarea id="mugInvoiceText" readonly rows="7"
            class="w-full font-mono text-sm border rounded-lg p-3 resize-y
                   bg-[#e9ecef] text-[#495057] border-gray-300
                   dark:bg-[#1f2937] dark:text-[#e5e7eb] dark:border-gray-600"></textarea>
        </div>
      </div>
    </div>`;

  kiraMug(ctx);
}

export function kiraMug(ctx) {
  const { getMugData, getGlobalAgentMode, getCurrentCurrency, formatCurrency, generateUniversalInvoice } = ctx;
  const mugData = getMugData();
  const globalAgentMode = getGlobalAgentMode();
  const currentCurrency = getCurrentCurrency();

  const versionIdx = parseInt(document.getElementById('mugVersion')?.value ?? '0');
  const typeIdx    = parseInt(document.getElementById('mugType')?.value ?? '0');
  const qty        = parseInt(document.getElementById('mugQty')?.value) || 1;

  const version = mugData.versions[versionIdx];
  const type    = version?.types[typeIdx];
  if (!type) return;

  const base  = globalAgentMode ? type.agentPrice : type.customerPrice;
  const total = base * qty;
  const activeColor = globalAgentMode ? 'var(--success-color)' : 'var(--primary-color)';

  const resultEl = document.getElementById('mugResult');
  if (resultEl) {
    resultEl.innerHTML = `<strong style="color:${activeColor}">Unit: ${currentCurrency.symbol}${formatCurrency(base)} | Total: ${currentCurrency.symbol}${formatCurrency(total)}</strong>`;
  }

  const invoiceEl = document.getElementById('mugInvoiceText');
  if (invoiceEl) {
    invoiceEl.value = generateUniversalInvoice(
      `${version.label} - ${type.label}`,
      [`Version: ${version.label}`, `Type: ${type.label}`],
      base, qty
    );
  }
}

export function addMugToPad(ctx) {
  const { getMugData, getGlobalAgentMode, addItemToQuotePad } = ctx;
  const mugData = getMugData();

  const versionIdx = parseInt(document.getElementById('mugVersion')?.value ?? '0');
  const typeIdx    = parseInt(document.getElementById('mugType')?.value ?? '0');
  const qty        = parseInt(document.getElementById('mugQty')?.value) || 1;

  const version = mugData.versions[versionIdx];
  const type    = version?.types[typeIdx];
  if (!type) return;

  addItemToQuotePad({
    type: 'calculator',
    title: `Mug: ${version.label} - ${type.label}`,
    name: `${version.label} - ${type.label}`,
    unitPrice: getGlobalAgentMode() ? type.agentPrice : type.customerPrice,
    quantity: qty,
    details: { version: version.label, type: type.label, finishing: 'UV Wrap Print' },
  });
}
