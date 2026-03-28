/**
 * Sublimation Apparel Calculator Module
 */

// ── Pure helpers (no ctx needed) ───────────────────────────────────────────

export function getSublimationOptionCost(option, useAgent = false) {
  if (!option) return 0;
  if (useAgent && option.agentPrice !== undefined) return option.agentPrice;
  if (!useAgent && option.customerPrice !== undefined) return option.customerPrice;
  return option.customerPrice !== undefined ? option.customerPrice : 0;
}

export function getSublimationSizeCost(sizeKey, data, useAgent = false) {
  if (!data || !data.extraSizeCost) return 0;
  const sizeEntry = data.extraSizeCost[sizeKey];
  if (!sizeEntry) return 0;
  if (typeof sizeEntry === 'object' && sizeEntry.customerPrice !== undefined) {
    return useAgent ? (sizeEntry.agentPrice !== undefined ? sizeEntry.agentPrice : sizeEntry.customerPrice) : sizeEntry.customerPrice;
  }
  return sizeEntry;
}

export function normalizeSublimationAddons(targetData) {
  if (!targetData) return;

  if (!Array.isArray(targetData.addons)) {
    const singleChoiceCategories = new Set(['Neck', 'Sleeve', 'Body']);
    const excludedKeys = new Set(['basePrices', 'agentAddons', 'quantities', 'sizes']);
    const legacyGroups = Object.entries(targetData)
      .filter(([key, value]) => {
        if (excludedKeys.has(key)) return false;
        if (!Array.isArray(value) || value.length === 0) return false;
        return value.every(opt => opt && typeof opt === 'object' && (opt.cost !== undefined || opt.name || opt.label));
      })
      .map(([name, options]) => ({
        name,
        type: singleChoiceCategories.has(name) ? 'radio' : 'checkbox',
        options: options.map(opt => ({
          ...opt,
          name: opt.name || opt.label || '',
          customerPrice: opt.customerPrice !== undefined ? opt.customerPrice : (opt.cost !== undefined ? opt.cost : 0),
          agentPrice: opt.agentPrice !== undefined ? opt.agentPrice : (opt.customerPrice !== undefined ? opt.customerPrice : (opt.cost !== undefined ? opt.cost : 0)),
        })),
      }));

    if (legacyGroups.length > 0) {
      targetData.addons = legacyGroups;
    }
  }

  if (!Array.isArray(targetData.addons)) return;

  const legacyAgentMap = new Map();
  if (Array.isArray(targetData.agentAddons)) {
    targetData.agentAddons.forEach(group => {
      const groupName = (group.name || '').trim().toLowerCase();
      const optionMap = new Map();
      (group.options || []).forEach(opt => {
        optionMap.set((opt.name || opt.label || '').trim().toLowerCase(), opt.cost !== undefined ? opt.cost : 0);
      });
      legacyAgentMap.set(groupName, optionMap);
    });
  }

  targetData.addons.forEach(group => {
    const groupName = (group.name || '').trim().toLowerCase();
    const optionMap = legacyAgentMap.get(groupName);
    (group.options || []).forEach(opt => {
      const optionName = (opt.name || opt.label || '').trim().toLowerCase();
      if (opt.customerPrice === undefined) {
        opt.customerPrice = opt.cost !== undefined ? opt.cost : 0;
      }
      if (opt.agentPrice === undefined) {
        if (optionMap && optionMap.has(optionName)) opt.agentPrice = optionMap.get(optionName);
        else opt.agentPrice = opt.customerPrice;
      }
    });
  });
}

// ── Context-dependent helpers ───────────────────────────────────────────────

export function getSublimationBasePrice(qty, ctx) {
  const data = ctx.getSublimationData();
  const useAgent = ctx.getGlobalAgentMode();
  let targetPrice = 45.0;
  const sortedTiers = [...data.basePrices].sort((a, b) => b.qty - a.qty);
  for (const tier of sortedTiers) {
    if (qty >= tier.qty) {
      targetPrice = useAgent && tier.agentPrice !== undefined ? tier.agentPrice : tier.customerPrice;
      break;
    }
  }
  return targetPrice;
}

export function copySublimationInvoiceText(ctx) {
  const textArea = document.getElementById('sublimationInvoiceText');
  if (!textArea) return;
  textArea.select();
  navigator.clipboard.writeText(textArea.value)
    .then(() => ctx.showToast('✓ Invoice copied!'))
    .catch(err => console.error('Failed to copy text: ', err));
}

export function generateSublimationVariationsHTML(data, ctx) {
  const useAgent = ctx.getGlobalAgentMode();
  const currentCurrency = ctx.getCurrentCurrency();
  const { formatCurrency, getAssetURL, getDummyIcon } = ctx;
  const agentClass = useAgent ? 'agent-active' : '';
  let html = '';
  let variationCounter = 0;
  const addonsTarget = (data && Array.isArray(data.addons)) ? data.addons : [];

  addonsTarget.forEach(addon => {
    const category = addon.name || '';
    const variations = addon.options || [];
    const addonType = addon.type || 'radio';
    const addonShowIcon = addon.showIcon !== false;
    html += `<h4 class="addon-category-title">${category}</h4>`;

    const variationsHTML = variations.map((v) => {
      const uniqueId = `var${variationCounter}`;
      variationCounter++;
      const inputType = addonType;
      const inputName = addonType === 'radio' ? `sublimation-${category.toLowerCase().replace(/\s+/g, '_')}` : uniqueId;
      const isChecked = addonType === 'radio' && variations.indexOf(v) === 0 ? 'checked' : '';
      const label = v.name || v.label || '';
      const optCost = getSublimationOptionCost(v, useAgent);
      const priceDisplay = optCost >= 0
        ? `+${currentCurrency.symbol}${formatCurrency(optCost)}`
        : `-${currentCurrency.symbol}${formatCurrency(Math.abs(optCost))}`;

      if (addonShowIcon) {
        return `
            <label for="${uniqueId}" class="addon-card-label">
                <input type="${inputType}" id="${uniqueId}" name="${inputName}" value="${v.cost}" ${isChecked}>
                <div class="addon-card ${agentClass}">
                    <div class="addon-card-name-box"><span>${label}</span></div>
                    <div class="addon-card-img-container"><img src="${v.assetId ? getAssetURL(v.assetId) : (v.svg || getDummyIcon())}" alt="${label}" class="addon-card-img"></div>
                    <div class="addon-card-price-box"><span>${priceDisplay}</span></div>
                </div>
            </label>`;
      } else {
        return `
            <label for="${uniqueId}" class="addon-btn-label">
                <input type="${inputType}" id="${uniqueId}" name="${inputName}" value="${v.cost}" ${isChecked}>
                <div class="addon-btn ${agentClass}">
                    <span class="addon-btn-name">${label}</span>
                    <span class="addon-btn-price">${priceDisplay}</span>
                </div>
            </label>`;
      }
    }).join('');

    html += `<div class="${addonShowIcon ? 'addon-card-grid' : 'addon-btn-grid'}">${variationsHTML}</div>`;
  });
  return html;
}

export function generateSublimationPriceListHTML(data, quantities, sizes, forceAgent = null, compact = false, showHeader = true, ctx) {
  const useAgent = forceAgent !== null ? forceAgent : ctx.getGlobalAgentMode();
  const { formatCurrency } = ctx;

  let addonsPriceHTML = '';
  const addonsTarget = Array.isArray(data.addons) ? data.addons : [];
  addonsTarget.forEach(addon => {
    const category = addon.name || '';
    const options = addon.options || [];
    const rows = options.map(opt => {
      const cost = getSublimationOptionCost(opt, useAgent);
      return `
            <tr class="border-b border-gray-200 dark:border-gray-600 last:border-0 h-12">
                <td class="p-2 text-gray-600 dark:text-gray-400 text-left text-sm align-middle font-semibold w-2/3">${opt.name || opt.label}</td>
                <td class="p-2 text-gray-600 dark:text-gray-400 text-right text-sm align-middle whitespace-nowrap w-1/3">
                    ${cost > 0 ? `+ ${formatCurrency(cost)}` : (cost < 0 ? `- ${formatCurrency(Math.abs(cost))}` : formatCurrency(0))}
                </td>
            </tr>`;
    }).join('');
    addonsPriceHTML += `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-500 shadow-sm dark:shadow-none">
                <h4 class="bg-orange-600 text-white p-2 text-center font-bold text-sm uppercase">${category}</h4>
                <table class="w-full border-collapse"><tbody>${rows}</tbody></table>
            </div>`;
  });

  const extraSizeKeys = Object.keys(data.extraSizeCost || {});
  const sizePriceRows = sizes.map(sz => {
    const cost = getSublimationSizeCost(sz.value, data, useAgent);
    const display = extraSizeKeys.includes(sz.value)
      ? `+ ${formatCurrency(cost)}`
      : (cost > 0 ? `+ ${formatCurrency(cost)}` : formatCurrency(0));
    return `
            <tr class="border-b border-gray-200 dark:border-gray-700 last:border-0">
                <td class="p-2 text-gray-600 dark:text-gray-400 text-left text-sm font-semibold">${sz.label}</td>
                <td class="p-2 text-gray-600 dark:text-gray-400 text-right text-sm">${display}</td>
            </tr>`;
  }).join('');

  return `
    <div id="price-list-container" class="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg mt-8 border border-gray-200 dark:border-gray-700">
        ${showHeader ? `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 class="font-extrabold text-3xl tracking-wide sublimation-title" style="margin: 0; flex: 1;">SUBLIMATION PRICE LIST${useAgent ? ' (Agent)' : ''}</h2>
          <button onclick="openSublimationCompareModal()" style="background-color: #e53e3e; border: none; color: white; width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: all 0.3s ease; font-size: 20px;" class="hover:opacity-80" title="Compare Customer vs Agent Prices">
            <i class="fas fa-columns"></i>
          </button>
        </div>` : ''}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div class="flex flex-col h-full">
                <h3 class="bg-orange-600 text-white p-2 rounded-t-md text-center font-bold text-sm mb-0">BASE PRICES</h3>
                <div class="border-x border-b border-gray-200 dark:border-gray-600 rounded-b-md overflow-hidden flex-grow bg-white dark:bg-gray-800">
                    <table class="w-full border-collapse text-sm h-full">
                        <thead class="bg-orange-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                            <tr><th class="p-2 text-left font-semibold">QUANTITY</th><th class="p-2 text-right font-semibold">PRICE (RM)</th></tr>
                        </thead>
                        <tbody class="bg-white dark:bg-gray-800">
                            ${quantities.map(q => {
    const displayPrice = useAgent && q.agentPrice !== undefined ? q.agentPrice : q.customerPrice;
    return `<tr class="border-b border-gray-200 dark:border-gray-700 last:border-0">
                                    <td class="p-2 text-gray-600 dark:text-gray-400 font-semibold">${q.label}</td>
                                    <td class="p-2 text-gray-600 dark:text-gray-400 text-right">${formatCurrency(displayPrice)}</td>
                                </tr>`;
  }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="flex flex-col h-full">
                <h3 class="bg-orange-600 text-white p-2 rounded-t-md text-center font-bold text-sm mb-0">SIZE CHARGES</h3>
                <div class="border-x border-b border-gray-200 dark:border-gray-600 rounded-b-md overflow-hidden flex-grow bg-white dark:bg-gray-800">
                    <table class="w-full border-collapse text-sm h-full">
                        <tbody class="bg-white dark:bg-gray-800">${sizePriceRows}</tbody>
                    </table>
                </div>
            </div>
        </div>
        <h3 class="text-center font-bold text-xl text-gray-700 dark:text-white mb-4 border-t dark:border-gray-600 pt-4">ADD-ONS & VARIATIONS</h3>
        <div class="grid gap-4 ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}">
            ${addonsPriceHTML}
        </div>
    </div>`;
}

export function openSublimationCompareModal(ctx) {
  const modal = document.getElementById('sublimationCompareModal');
  if (!modal) {
    ctx.showToast('Compare modal not found. Please refresh the page.', 'error');
    return;
  }
  const custPanel = document.getElementById('sublCompareCustPanel');
  const agentPanel = document.getElementById('sublCompareAgentPanel');
  const custScroll = document.getElementById('sublCompareCustScroll');
  const agentScroll = document.getElementById('sublCompareAgentScroll');
  const data = ctx.getSublimationData();
  const quantities = data.basePrices;
  const extraSizeKeys = Object.keys(data.extraSizeCost);
  const sizes = extraSizeKeys.map(k => ({ label: k, value: k }));
  custPanel.innerHTML = generateSublimationPriceListHTML(data, quantities, sizes, false, true, false, ctx);
  agentPanel.innerHTML = generateSublimationPriceListHTML(data, quantities, sizes, true, true, false, ctx);
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (custScroll && agentScroll) {
    custScroll.onscroll = () => { agentScroll.scrollTop = custScroll.scrollTop; };
    agentScroll.onscroll = () => { custScroll.scrollTop = agentScroll.scrollTop; };
  }
}

export function closeSublimationCompareModal() {
  const modal = document.getElementById('sublimationCompareModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

export function handleSublimationCustomQtyChange(ctx) {
  const input = document.getElementById('sublimationCustomQty');
  let qty = parseInt(input.value);
  if (isNaN(qty) || qty < 1) qty = 1;
  ctx.setSelectedSublimationQty(qty);

  let activeTier = 10;
  const tiers = ctx.getSublimationData().basePrices.map(q => q.qty);
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (qty >= tiers[i]) { activeTier = tiers[i]; break; }
  }
  document.querySelectorAll('#sublimationQtyBtns .size-btn').forEach(btn => {
    if (parseInt(btn.dataset.qty) === activeTier) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  kiraSublimation(ctx);
}

export function attachSublimationListeners(ctx) {
  document.querySelectorAll('#sublimationQtyBtns .size-btn').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('#sublimationQtyBtns .size-btn').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      ctx.setSelectedSublimationQty(parseInt(button.dataset.qty));
      document.getElementById('sublimationCustomQty').value = ctx.getSelectedSublimationQty();
      kiraSublimation(ctx);
    });
  });

  document.querySelectorAll('#sublimationSizeBtns .size-btn').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('#sublimationSizeBtns .size-btn').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const customSizeWrapper = document.getElementById('sublimationCustomSizeWrapper');
      const customSizeInput = document.getElementById('sublimationCustomSize');
      if (button.dataset.size === 'XS-2XL') {
        customSizeWrapper.style.display = 'block';
      } else {
        customSizeWrapper.style.display = 'none';
        if (customSizeInput) customSizeInput.value = '';
      }
      kiraSublimation(ctx);
    });
  });

  document.querySelectorAll('.addon-card-label input').forEach(input => {
    input.addEventListener('change', () => kiraSublimation(ctx));
  });

  const addBtn = document.getElementById('addSublimationToPadBtn');
  if (addBtn) addBtn.addEventListener('click', () => addSublimationToPad(ctx));
}

export function renderSublimationCalculator(container, ctx) {
  const data = ctx.getSublimationData();
  normalizeSublimationAddons(data);
  const quantities = data.basePrices;
  const extraSizeKeys = Object.keys(data.extraSizeCost);
  const sizes = extraSizeKeys.map(k => ({ label: k, value: k }));

  const { getGlobalToggleHTML, formatCurrency, getGlobalAgentMode, getSelectedSublimationQty, getCurrentCurrency } = ctx;
  const globalAgentMode = getGlobalAgentMode();
  const currentCurrency = getCurrentCurrency();
  const selectedSublimationQty = getSelectedSublimationQty();
  const agentClass = globalAgentMode ? 'agent-active' : '';
  const defaultSize = sizes.length > 0 ? sizes[0].value : 'XS-2XL';

  const qtyButtonsHTML = quantities.map(q =>
    `<button class="btn size-btn ${agentClass} ${q.qty === selectedSublimationQty ? 'active' : ''}" data-qty="${q.qty}">${q.label}</button>`
  ).join('');

  const sizeButtonsHTML = sizes.map(sz =>
    `<button class="btn size-btn ${agentClass} ${sz.value === defaultSize ? 'active' : ''}" data-size="${sz.value}">${sz.label}</button>`
  ).join('');

  const variationsHTML = generateSublimationVariationsHTML(data, ctx);
  const priceListHTML = generateSublimationPriceListHTML(data, quantities, sizes, null, false, true, ctx);

  container.innerHTML = `
      <div class="calculator-panel mx-auto" style="max-width: 800px;">
        <h2 class="text-3xl font-bold mb-6 text-center sublimation-title uppercase" style="margin-top: 0;">SUBLIMATION APPAREL${globalAgentMode ? ' (Agent)' : ''}</h2>
        ${getGlobalToggleHTML('sublimation')}
        
        <div class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm">
            <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Total Quantity</label>
            <div class="size-btn-group" id="sublimationQtyBtns">${qtyButtonsHTML}</div>
            <p class="text-[5px] tracking-tight italic font-semibold text-gray-600 dark:text-gray-400 mt-2">*Notes : If it range 18pcs it will use price of 10pcs.</p>
            <div class="mt-4">
                <label for="sublimationCustomQty" class="font-semibold text-sm text-gray-600 dark:text-gray-400">Custom Total Quantity:</label>
                <input type="number" id="sublimationCustomQty" value="${selectedSublimationQty}" class="w-full max-w-xs p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" oninput="handleSublimationCustomQtyChange()">
            </div>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm">
            <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Apparel Size</label>
            <div class="size-btn-group" id="sublimationSizeBtns">${sizeButtonsHTML}</div>
            <div class="mt-4">
                <label for="sublimationSizeQty" class="font-semibold text-sm text-gray-600 dark:text-gray-400">Custom Apparel Size Quantity:</label>
                <input type="number" id="sublimationSizeQty" placeholder="0" class="w-full max-w-xs p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" oninput="kiraSublimation()">
                <p class="text-[5px] tracking-tight italic text-gray-500 mt-1">*Leave blank to use Total Quantity for this size</p>
            </div>
            <div id="sublimationCustomSizeWrapper" class="mt-4">
                <label for="sublimationCustomSize" class="font-semibold text-sm text-gray-600 dark:text-gray-400">Custom Size (e.g. S, M, L):</label>
                <input type="text" id="sublimationCustomSize" placeholder="e.g. S, M, L" class="w-full max-w-xs p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase" style="text-transform: uppercase;" maxlength="10" oninput="kiraSublimation()">
                <p class="text-[5px] tracking-tight italic text-gray-500 mt-1">*Specify the exact size (XS, S, M, L, XL, 2XL) for quote pad</p>
            </div>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm mt-6">
            <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Variations & Add-ons</label>
            ${variationsHTML}
        </div>

        <div id="sublimationInvoice"></div>

        <div style="margin-top: 12px;">
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <button id="addSublimationToPadBtn" class="btn" style="flex-grow: 1; width: auto; background-color: var(--success-color); color: white; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                    + Add to Pad
                </button>
                <button id="copySublimationBtn" class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600" onclick="copySublimationInvoiceText()" style="width: auto; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                    Copy
                </button>
            </div>
            <div class="invoice-copy-area" style="margin-top: 0;">
                <textarea id="sublimationInvoiceText" readonly rows="8"
                    class="w-full font-mono text-sm border rounded-lg p-3 resize-y bg-[#e9ecef] text-[#495057] border-gray-300 dark:bg-[#1f2937] dark:text-[#e5e7eb] dark:border-gray-600"
                ></textarea>
            </div>
        </div>

        ${priceListHTML}

        <div class="mt-4 text-center">
            <button class="btn btn-primary" style="width: auto;" onclick="downloadElementAsJPG(event, 'price-list-container', 'sublimation-price-list.jpg')">
                <i class="fas fa-download mr-2"></i> Download Price List (JPG)
            </button>
        </div>
    </div>`;

  attachSublimationListeners(ctx);

  const defaultSizeBtn = document.querySelector('#sublimationSizeBtns .size-btn.active');
  if (defaultSizeBtn && defaultSizeBtn.dataset.size === 'XS-2XL') {
    const wrapper = document.getElementById('sublimationCustomSizeWrapper');
    if (wrapper) wrapper.style.display = 'block';
  }

  kiraSublimation(ctx);
}

export function kiraSublimation(ctx) {
  const sublimationData = ctx.getSublimationData();
  if (!sublimationData) return;
  const allVariations = (Array.isArray(sublimationData.addons) ? sublimationData.addons : []).flatMap(addon => addon.options || []);

  const totalOrderQty = ctx.getSelectedSublimationQty();
  const sizeQtyInput = document.getElementById('sublimationSizeQty');
  const sizeQtyVal = parseInt(sizeQtyInput ? sizeQtyInput.value : 0);
  const calcQty = (!isNaN(sizeQtyVal) && sizeQtyVal > 0) ? sizeQtyVal : totalOrderQty;

  const invoiceEl = document.getElementById('sublimationInvoice');
  if (!invoiceEl) return;

  const activeSizeButton = document.querySelector('#sublimationSizeBtns .size-btn.active');
  const size = activeSizeButton ? activeSizeButton.dataset.size : 'XS-2XL';
  const customSizeInput = document.getElementById('sublimationCustomSize');
  const customSizeValue = (customSizeInput && customSizeInput.value.trim().toUpperCase()) || '';
  let sizeLabel;
  if (size === 'XS-2XL' && customSizeValue !== '') {
    sizeLabel = customSizeValue;
  } else {
    sizeLabel = activeSizeButton ? activeSizeButton.innerText : 'XS-2XL';
  }

  const activeQtyButton = document.querySelector('#sublimationQtyBtns .size-btn.active');
  const qtyLabel = activeQtyButton ? activeQtyButton.innerText : totalOrderQty;

  const basePrice = getSublimationBasePrice(totalOrderQty, ctx);
  const sizeCost = getSublimationSizeCost(size, sublimationData, ctx.getGlobalAgentMode());
  let subTotalPerPiece = basePrice + sizeCost;

  const currentCurrency = ctx.getCurrentCurrency();
  const { formatCurrency, generateUniversalInvoice, getIsTaxEnabled, getGlobalTaxPercent, getGlobalAgentMode } = ctx;
  const globalAgentMode = getGlobalAgentMode();
  const isTaxEnabled = getIsTaxEnabled();
  const globalTaxPercent = getGlobalTaxPercent();

  let invoiceBodyHTML = '';
  invoiceBodyHTML += `<div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base"><span class="font-medium text-gray-500 dark:text-gray-400">Base Price (Tier: ${qtyLabel})</span><span class="font-bold text-gray-800 dark:text-gray-200">${currentCurrency.symbol} ${formatCurrency(basePrice)} / pc</span></div>`;

  const extraSizeKeys = Object.keys(sublimationData.extraSizeCost || {});
  if (extraSizeKeys.includes(size) || sizeCost > 0) {
    invoiceBodyHTML += `<div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base"><span class="font-medium text-gray-500 dark:text-gray-400">Extra Size (${sizeLabel})</span><span class="font-bold text-gray-800 dark:text-gray-200">${sizeCost > 0 ? '+ ' : ''}${currentCurrency.symbol} ${formatCurrency(sizeCost)}</span></div>`;
  }

  allVariations.forEach(function (variation, index) {
    const inputElement = document.getElementById('var' + index);
    if (inputElement && inputElement.checked) {
      const optCost = getSublimationOptionCost(variation, globalAgentMode);
      subTotalPerPiece += optCost;
      if (optCost !== 0) {
        const sign = optCost > 0 ? '+' : '-';
        invoiceBodyHTML += `<div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base"><span class="font-medium text-gray-500 dark:text-gray-400">${variation.name || variation.label}</span><span class="font-bold text-gray-800 dark:text-gray-200">${sign} ${currentCurrency.symbol} ${formatCurrency(Math.abs(optCost))}</span></div>`;
      }
    }
  });

  invoiceBodyHTML += `<div class="flex justify-between py-2 text-base"><span class="font-medium text-gray-500 dark:text-gray-400">Quantity</span><span class="font-bold text-gray-800 dark:text-gray-200">${calcQty} pcs</span></div>`;

  let finalTotalPerPiece = subTotalPerPiece;
  if (isTaxEnabled) {
    const taxAmountPerPiece = subTotalPerPiece * (globalTaxPercent / 100);
    finalTotalPerPiece += taxAmountPerPiece;
    invoiceBodyHTML += `<div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base"><span class="font-medium text-gray-500 dark:text-gray-400">Subtotal Per Piece</span><span class="font-bold text-gray-800 dark:text-gray-200">${currentCurrency.symbol} ${formatCurrency(subTotalPerPiece)}</span></div>`;
    invoiceBodyHTML += `<div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base"><span class="font-medium text-gray-500 dark:text-gray-400">Tax (${globalTaxPercent}%)</span><span class="font-bold text-gray-800 dark:text-gray-200">+ ${currentCurrency.symbol} ${formatCurrency(taxAmountPerPiece)}</span></div>`;
  }

  const grandTotal = finalTotalPerPiece * calcQty;

  invoiceEl.innerHTML = `
        <div class="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div class="px-6 pt-6 pb-0">
                ${invoiceBodyHTML}
                <div class="flex justify-between py-2 border-t border-gray-200 dark:border-gray-700 text-base mt-2 pt-2">
                    <span class="font-bold text-gray-700 dark:text-gray-300">Unit Price</span>
                    <span class="font-bold text-gray-800 dark:text-gray-200">${currentCurrency.symbol} ${formatCurrency(finalTotalPerPiece)}</span>
                </div>
            </div>
            <div class="${globalAgentMode ? 'bg-green-600' : 'bg-blue-600'} text-white p-2 text-right">
                <div class="text-xl font-bold" style="display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: baseline; gap: 0 6px;"><span>Total for ${calcQty} pcs:</span><span style="white-space: nowrap;">${currentCurrency.symbol} ${formatCurrency(grandTotal)}</span></div>
            </div>
            <a href="https://drive.google.com/drive/folders/15XN8y-K_l-u-VvbL-lXwFhy7_Kq_wZ_J?usp=sharing" target="_blank" class="block bg-gray-500 hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 text-white text-center py-3 font-semibold transition-colors">Download Sublimation Template</a>
        </div>`;

  const invoiceTextArea = document.getElementById('sublimationInvoiceText');
  if (invoiceTextArea) {
    let customDetails = [`Size : ${sizeLabel}`];
    let variationCounter = 0;
    const addons = Array.isArray(sublimationData.addons) ? sublimationData.addons : [];
    addons.forEach(addon => {
      const category = addon.name || '';
      const isSingleChoice = ['Neck', 'Sleeve', 'Body'].includes(category);
      (addon.options || []).forEach(variation => {
        const inputElement = document.getElementById('var' + variationCounter);
        if (inputElement && inputElement.checked) {
          const prefix = isSingleChoice ? category : 'Extra';
          customDetails.push(`${prefix} : ${variation.name || variation.label}`);
        }
        variationCounter++;
      });
    });
    invoiceTextArea.value = generateUniversalInvoice('Sublimation', customDetails, subTotalPerPiece, calcQty);
  }
}

export function addSublimationToPad(ctx) {
  const sublimationData = ctx.getSublimationData();
  if (!sublimationData) return;
  const totalOrderQty = ctx.getSelectedSublimationQty();
  const { getGlobalAgentMode, getIsTaxEnabled, getGlobalTaxPercent, addItemToQuotePad, getCurrentCurrency, formatCurrency } = ctx;
  const globalAgentMode = getGlobalAgentMode();

  const sizeQtyInput = document.getElementById('sublimationSizeQty');
  const sizeQtyVal = parseInt(sizeQtyInput ? sizeQtyInput.value : 0);
  const finalQty = (!isNaN(sizeQtyVal) && sizeQtyVal > 0) ? sizeQtyVal : totalOrderQty;

  const activeSizeButton = document.querySelector('#sublimationSizeBtns .size-btn.active');
  const sizeVal = activeSizeButton ? activeSizeButton.dataset.size : 'XS-2XL';
  const customSizeInput = document.getElementById('sublimationCustomSize');
  const customSizeValue = (customSizeInput && customSizeInput.value.trim().toUpperCase()) || '';
  let sizeLabel;
  if (sizeVal === 'XS-2XL' && customSizeValue !== '') {
    sizeLabel = customSizeValue;
  } else {
    sizeLabel = activeSizeButton ? activeSizeButton.innerText : 'XS-2XL';
  }

  const basePrice = getSublimationBasePrice(totalOrderQty, ctx);
  const sizeCost = getSublimationSizeCost(sizeVal, sublimationData, globalAgentMode);
  let subTotalPerPiece = basePrice + sizeCost;
  let variationDetails = [];
  let variationCounter = 0;

  const addons = Array.isArray(sublimationData.addons) ? sublimationData.addons : [];
  addons.forEach(addon => {
    const category = addon.name || '';
    (addon.options || []).forEach(function (variation) {
      const inputElement = document.getElementById('var' + variationCounter);
      if (inputElement && inputElement.checked) {
        subTotalPerPiece += getSublimationOptionCost(variation, globalAgentMode);
        variationDetails.push(category + ': ' + (variation.name || variation.label));
      }
      variationCounter++;
    });
  });

  let finalTotalPerPiece = subTotalPerPiece;
  if (getIsTaxEnabled()) {
    finalTotalPerPiece += subTotalPerPiece * (getGlobalTaxPercent() / 100);
  }

  const variationStr = variationDetails.length > 0 ? variationDetails.join('\n') : 'None';
  addItemToQuotePad({
    type: 'calculator',
    title: 'Sublimation Apparel',
    name: 'Sublimation (' + sizeLabel + ')',
    unitPrice: subTotalPerPiece,
    quantity: finalQty,
    details: {
      size: 'Size: ' + sizeLabel,
      material: 'Material: Microfiber Eyelet',
      finishing: variationStr,
      price: 'Unit Price: ' + getCurrentCurrency().symbol + formatCurrency(finalTotalPerPiece) + ' (Tier ' + totalOrderQty + ')',
    },
  });
}
