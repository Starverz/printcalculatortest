/**
 * Acrylic Keychain Calculator Module
 */

export function renderKeychainPage(container, ctx) {
  const { getKeychainData } = ctx;
  const keychainData = getKeychainData();

  container.innerHTML = `
        <div class="calculator-panel mx-auto" style="max-width: 800px;">
          <div class="mb-4">
            <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Keychain Type:</label>
            <div class="custom-sticker-dropdown" id="keychainTypeWrapper" onclick="toggleGenericStickerDropdown(event, 'keychainTypeWrapper')">
              <div class="custom-sticker-dropdown-trigger">
                <span class="custom-sticker-dropdown-label" id="keychainTypeLabel">${keychainData.variants[0].label}</span>
                <svg class="custom-sticker-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="custom-sticker-dropdown-options">
                ${keychainData.variants.map((v, i) => `<div class="custom-sticker-dropdown-option ${i === 0 ? 'selected' : ''}" onmousedown="selectGenericStickerDropdownOption('keychainType', 'keychainTypeWrapper', '${i}', 'kiraKeychain')">${v.label}</div>`).join('')}
              </div>
              <select id="keychainType" class="hidden-native-select" style="display:none;" onchange="kiraKeychain()">
                ${keychainData.variants.map((v, i) => `<option value="${i}">${v.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="mb-4">
            <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Quantity:</label>
            <input type="number" id="keychainQty" value="1" min="1" oninput="kiraKeychain()" class="p-2 border rounded-lg h-11 bg-white dark:bg-[#374151] text-gray-900 dark:text-white border-gray-300 dark:border-[#4b5563] w-full">
          </div>
          <div class="result mt-4" id="keychainResult"></div>

          <div style="margin-top: 12px;">
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <button id="addKeychainToPadBtn" class="btn" onclick="addKeychainToPad()"
                style="flex-grow: 1; width: auto; background-color: var(--success-color); color: white; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                + Add to Pad
              </button>

              <button class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600" onclick="copyGiftInvoice('keychainInvoiceText')"
                style="width: auto; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                Copy
              </button>
            </div>

            <div class="invoice-copy-area" style="margin-top: 0;">
              <textarea id="keychainInvoiceText" readonly rows="7"
                class="w-full font-mono text-sm border rounded-lg p-3 resize-y 
                               bg-[#e9ecef] text-[#495057] border-gray-300 
                               dark:bg-[#1f2937] dark:text-[#e5e7eb] dark:border-gray-600"
              ></textarea>
            </div>
          </div>
        </div>`;

  kiraKeychain(ctx);
}

export function kiraKeychain(ctx) {
  const {
    getKeychainData,
    getGlobalAgentMode,
    getCurrentCurrency,
    formatCurrency,
    generateUniversalInvoice,
  } = ctx;

  const keychainData = getKeychainData();
  const globalAgentMode = getGlobalAgentMode();
  const currentCurrency = getCurrentCurrency();

  const typeIdx = document.getElementById('keychainType').value;
  const qty = parseInt(document.getElementById('keychainQty').value) || 1;
  const base = globalAgentMode ? keychainData.variants[typeIdx].agentPrice : keychainData.variants[typeIdx].customerPrice;

  let discount = 1.0;
  for (let t of keychainData.tiers) { if (qty >= t.qty) discount = t.discount; }

  const unitPrice = base * discount;
  const total = unitPrice * qty;
  const activeColor = globalAgentMode ? 'var(--success-color)' : 'var(--primary-color)';

  document.getElementById('keychainResult').innerHTML = `<strong style="color:${activeColor}"> Unit: ${currentCurrency.symbol}${formatCurrency(unitPrice)} | Total: ${currentCurrency.symbol}${formatCurrency(total)}</strong>`;
  document.getElementById('keychainInvoiceText').value = generateUniversalInvoice(
    'Acrylic Keychain',
    [`Type: ${keychainData.variants[typeIdx].label}`],
    unitPrice,
    qty
  );
}

export function addKeychainToPad(ctx) {
  const { getKeychainData, getGlobalAgentMode, addItemToQuotePad } = ctx;
  const keychainData = getKeychainData();

  const typeIdx = document.getElementById('keychainType').value;
  const qty = parseInt(document.getElementById('keychainQty').value) || 1;
  const base = getGlobalAgentMode()
    ? keychainData.variants[typeIdx].agentPrice
    : keychainData.variants[typeIdx].customerPrice;

  let discount = 1.0;
  for (let t of keychainData.tiers) { if (qty >= t.qty) discount = t.discount; }

  addItemToQuotePad({
    type: 'calculator',
    title: 'Keychain: Acrylic',
    name: 'Acrylic Keychain',
    unitPrice: base * discount,
    quantity: qty,
    details: {
      size: 'Custom (~5cm)',
      material: keychainData.variants[typeIdx].label,
      finishing: 'UV Double Sided',
    },
  });
}
