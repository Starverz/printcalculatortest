/**
 * Button Badge Calculator Module
 */

export function renderBadgePage(container, ctx) {
  const { getButtonBadgeData } = ctx;
  const buttonBadgeData = getButtonBadgeData();

  container.innerHTML = `
              <div class="calculator-panel mx-auto" style="max-width: 800px;">
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Size:</label>
              <div class="custom-sticker-dropdown" id="badgeSizeWrapper" onclick="toggleGenericStickerDropdown(event, 'badgeSizeWrapper')">
                <div class="custom-sticker-dropdown-trigger">
                  <span class="custom-sticker-dropdown-label" id="badgeSizeLabel">${buttonBadgeData.sizes[0].label}</span>
                  <svg class="custom-sticker-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="custom-sticker-dropdown-options">
                  ${buttonBadgeData.sizes.map((s, i) => `<div class="custom-sticker-dropdown-option ${i === 0 ? 'selected' : ''}" onmousedown="selectGenericStickerDropdownOption('badgeSize', 'badgeSizeWrapper', '${i}', 'kiraBadge')">${s.label}</div>`).join('')}
                </div>
                <select id="badgeSize" class="hidden-native-select" style="display:none;" onchange="kiraBadge()">
                  ${buttonBadgeData.sizes.map((s, i) => `<option value="${i}">${s.label}</option>`).join('')}
                </select>
              </div>
            </div>
            <div>
              <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Shape:</label>
              <div class="custom-sticker-dropdown" id="badgeShapeWrapper" onclick="toggleGenericStickerDropdown(event, 'badgeShapeWrapper')">
                <div class="custom-sticker-dropdown-trigger">
                  <span class="custom-sticker-dropdown-label" id="badgeShapeLabel">${buttonBadgeData.shapes[0]}</span>
                  <svg class="custom-sticker-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="custom-sticker-dropdown-options">
                  ${buttonBadgeData.shapes.map((s, i) => `<div class="custom-sticker-dropdown-option ${i === 0 ? 'selected' : ''}" onmousedown="selectGenericStickerDropdownOption('badgeShape', 'badgeShapeWrapper', '${s}', 'kiraBadge')">${s}</div>`).join('')}
                </div>
                <select id="badgeShape" class="hidden-native-select" style="display:none;" onchange="kiraBadge()">
                  ${buttonBadgeData.shapes.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
          <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Quantity:</label>
          <input type="number" id="badgeQty" value="1" min="1" oninput="kiraBadge()" class="p-2 border rounded-lg h-11 bg-white dark:bg-[#374151] text-gray-900 dark:text-white border-gray-300 dark:border-[#4b5563] w-full">
            <div class="result mt-4" id="badgeResult"></div>
            <div style="margin-top: 12px;">
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <button id="addBadgeToPadBtn" class="btn" onclick="addBadgeToPad()"
                  style="flex-grow: 1; width: auto; background-color: var(--success-color); color: white; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                  + Add to Pad
                </button>

                <button class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600" onclick="copyGiftInvoice('badgeInvoiceText')"
                  style="width: auto; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                  Copy
                </button>
              </div>

              <div class="invoice-copy-area" style="margin-top: 0;">
                <textarea id="badgeInvoiceText" readonly rows="7"
                  class="w-full font-mono text-sm border rounded-lg p-3 resize-y 
                               bg-[#e9ecef] text-[#495057] border-gray-300 
                               dark:bg-[#1f2937] dark:text-[#e5e7eb] dark:border-gray-600"
                ></textarea>
              </div>
            </div>
        </div>`;

  kiraBadge(ctx);
}

export function kiraBadge(ctx) {
  const {
    getButtonBadgeData,
    getGlobalAgentMode,
    getCurrentCurrency,
    formatCurrency,
    generateUniversalInvoice,
  } = ctx;

  const buttonBadgeData = getButtonBadgeData();
  const globalAgentMode = getGlobalAgentMode();
  const currentCurrency = getCurrentCurrency();

  const sizeIdx = document.getElementById('badgeSize').value;
  const qty = parseInt(document.getElementById('badgeQty').value) || 1;
  const shape = document.getElementById('badgeShape').value;
  const base = globalAgentMode ? buttonBadgeData.sizes[sizeIdx].agentPrice : buttonBadgeData.sizes[sizeIdx].customerPrice;

  let discount = 1.0;
  for (let t of buttonBadgeData.tiers) { if (qty >= t.qty) discount = t.discount; }

  const unitPrice = base * discount;
  const total = unitPrice * qty;
  const activeColor = globalAgentMode ? 'var(--success-color)' : 'var(--primary-color)';

  document.getElementById('badgeResult').innerHTML = `<strong style="color:${activeColor}"> Unit: ${currentCurrency.symbol}${formatCurrency(unitPrice)} | Total: ${currentCurrency.symbol}${formatCurrency(total)}</strong>`;
  document.getElementById('badgeInvoiceText').value = generateUniversalInvoice(
    `Button Badge(${buttonBadgeData.sizes[sizeIdx].label})`,
    [`Shape: ${shape}`],
    unitPrice,
    qty
  );
}

export function addBadgeToPad(ctx) {
  const { getButtonBadgeData, getGlobalAgentMode, addItemToQuotePad } = ctx;
  const buttonBadgeData = getButtonBadgeData();

  const sizeIdx = document.getElementById('badgeSize').value;
  const qty = parseInt(document.getElementById('badgeQty').value) || 1;
  const shape = document.getElementById('badgeShape').value;
  const base = getGlobalAgentMode()
    ? buttonBadgeData.sizes[sizeIdx].agentPrice
    : buttonBadgeData.sizes[sizeIdx].customerPrice;

  let discount = 1.0;
  for (let t of buttonBadgeData.tiers) { if (qty >= t.qty) discount = t.discount; }

  addItemToQuotePad({
    type: 'calculator',
    title: `Badge: ${buttonBadgeData.sizes[sizeIdx].label}`,
    name: 'Button Badge',
    unitPrice: base * discount,
    quantity: qty,
    details: {
      size: buttonBadgeData.sizes[sizeIdx].label,
      material: 'Plastic/Metal base',
      finishing: `Shape: ${shape}`,
    },
  });
}
