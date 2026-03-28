/**
 * Lanyard Calculator Module
 */

export function copyLanyardInvoiceText(ctx) {
  const invoiceTextArea = document.getElementById('copyableLanyardInvoice');
  if (!invoiceTextArea) {
    ctx.showToast('No Lanyard invoice to copy!', 'error');
    return;
  }
  invoiceTextArea.select();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(invoiceTextArea.value)
      .then(() => ctx.showToast('✓ Lanyard invoice copied!'))
      .catch(err => {
        console.error('Clipboard copy failed:', err);
        document.execCommand('copy');
        ctx.showToast('✓ Lanyard invoice copied (fallback)!');
      });
  } else {
    document.execCommand('copy');
    ctx.showToast('✓ Lanyard invoice copied (fallback)!');
  }
}

export function getLanyardPriceTierIndex(customQty, ctx) {
  const tiers = ctx.getLanyardData().quantities;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (customQty >= tiers[i]) return i;
  }
  return 0;
}

export function generateLanyardAddonsHTML(addons, ctx) {
  const globalAgentMode = ctx.getGlobalAgentMode();
  const currentCurrency = ctx.getCurrentCurrency();
  const { formatCurrency } = ctx;
  const boxStyle = 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm mb-4';
  const labelStyle = 'font-bold mb-2 block text-gray-700 dark:text-gray-200';

  return addons.map((addon, addonIndex) => {
    const addonType = addon.type || 'radio';
    const addonShowIcon = addon.showIcon !== false;
    let cardsHTML = addon.options.map((option, optionIndex) => {
      const costToShow = globalAgentMode ? (option.agentPrice || 0) : (option.customerPrice || 0);
      const priceDisplay = costToShow >= 0
        ? `+ ${currentCurrency.symbol}${formatCurrency(costToShow)} `
        : `- ${currentCurrency.symbol}${formatCurrency(Math.abs(costToShow))} `;
      const agentClass = globalAgentMode ? 'agent-active' : '';
      const getAssetURL = ctx.getAssetURL;
      const getDummyIcon = ctx.getDummyIcon;

      if (addonShowIcon) {
        return `
        <label for="addon-${addonIndex}-${optionIndex}" class="addon-card-label">
          <input type="${addonType}" id="addon-${addonIndex}-${optionIndex}" name="addon-type-${addonIndex}" value="${optionIndex}" ${addonType === 'radio' && optionIndex === 0 ? 'checked' : ''}>
            <div class="addon-card ${agentClass}">
              <div class="addon-card-name-box"><span>${option.name}</span></div>
              <div class="addon-card-img-container"><img src="${option.assetId ? getAssetURL(option.assetId) : (option.img || getDummyIcon())}" alt="${option.name}" class="addon-card-img"></div>
              <div class="addon-card-price-box"><span>${priceDisplay}</span></div>
            </div>
        </label>`;
      } else {
        return `
        <label for="addon-${addonIndex}-${optionIndex}" class="addon-btn-label">
          <input type="${addonType}" id="addon-${addonIndex}-${optionIndex}" name="addon-type-${addonIndex}" value="${optionIndex}" ${addonType === 'radio' && optionIndex === 0 ? 'checked' : ''}>
            <div class="addon-btn ${agentClass}">
              <span class="addon-btn-name">${option.name}</span>
              <span class="addon-btn-price">${priceDisplay}</span>
            </div>
        </label>`;
      }
    }).join('');

    return `
      <div class="${boxStyle}">
        <label class="${labelStyle}">${addon.name}</label>
        <div class="${addonShowIcon ? 'addon-card-grid' : 'addon-btn-grid'}" style="grid-template-columns: repeat(5, 1fr); gap: 8px;" id="lanyardAddonGrid${addonIndex}">${cardsHTML}</div>
      </div>`;
  }).join('');
}

export function generateLanyardPriceListHTML(data, forceAgent = null, compact = false, showHeader = true, ctx) {
  const useAgent = forceAgent !== null ? forceAgent : ctx.getGlobalAgentMode();
  const { formatCurrency, getCurrentCurrency } = ctx;
  const currentCurrency = getCurrentCurrency();
  const isAgent = useAgent;
  const titleText = isAgent ? 'LANYARD PRICE LIST (AGENT)' : 'LANYARD PRICE LIST';
  const accentBg = 'bg-fuchsia-600';
  const accentBorder = 'border-fuchsia-600 dark:border-fuchsia-500';
  const accentText = 'text-fuchsia-500';

  let basePriceRows = data.quantities.map((qty, qtyIndex) => `
      <tr class="border-b border-gray-200 dark:border-gray-700">
        <td class="p-3 text-left text-gray-800 dark:text-gray-200 font-semibold">${qty} pcs</td>
            ${data.sizes.map(size => {
    const pricesTarget = (size.prices && (isAgent ? size.prices.agentPrice : size.prices.customerPrice)) || {};
    const p1 = (pricesTarget.p1 && pricesTarget.p1[qtyIndex]) || 0;
    const p2 = (pricesTarget.p2 && pricesTarget.p2[qtyIndex]) || 0;
    return `<td class="p-3 text-gray-600 dark:text-gray-400">${formatCurrency(p1)}</td><td class="p-3 text-gray-600 dark:text-gray-400">${formatCurrency(p2)}</td>`;
  }).join('')}
      </tr>`).join('');

  let addonListHTML = data.addons.map(addon => {
    const addonRows = addon.options.map(opt => {
      const cost = isAgent ? (opt.agentPrice || 0) : (opt.customerPrice || 0);
      const displayPrice = `${cost >= 0 ? '+' : '-'} ${currentCurrency.symbol} ${formatCurrency(Math.abs(cost))}`;
      return `
          <tr class="border-b border-gray-200 dark:border-gray-600 last:border-0 h-12">
            <td class="p-2 text-gray-600 dark:text-gray-400 text-left text-sm align-middle font-semibold w-2/3">${opt.name}</td>
            <td class="p-2 ${accentText} text-right text-sm align-middle whitespace-nowrap w-1/3">${displayPrice}</td>
          </tr>`;
    }).join('');
    return `
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-500 shadow-sm dark:shadow-none">
          <h4 class="${accentBg} text-white p-2 text-center font-bold text-sm uppercase">${addon.name}</h4>
          <table class="w-full border-collapse"><tbody>${addonRows}</tbody></table>
        </div>`;
  }).join('');

  return `
    <div id="lanyard-price-list-container" class="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-lg border border-gray-200 dark:border-gray-700 mt-8 shadow-sm">
        ${showHeader ? `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 class="font-extrabold text-3xl tracking-wide lanyard-title" style="margin: 0; flex: 1;">${titleText}</h2>
          <button onclick="openLanyardCompareModal()" style="background-color: #e53e3e; border: none; color: white; width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: all 0.3s ease; font-size: 20px;" class="hover:opacity-80" title="Compare Customer vs Agent Prices">
            <i class="fas fa-columns"></i>
          </button>
        </div>` : ''}
        <h3 class="${accentBg} text-white p-2 rounded-md text-center font-bold text-base mb-4">PRICE PER PIECE (RM)</h3>
        <div class="overflow-x-auto">
            <table class="w-full border-collapse text-sm text-center">
                <thead class="bg-gray-100 dark:bg-gray-700">
                    <tr>
                        <th class="p-3 text-left font-semibold border-b-2 ${accentBorder} text-gray-800 dark:text-white">QUANTITY</th>
                        ${data.sizes.map(s => `<th colspan="2" class="p-3 font-semibold border-b-2 ${accentBorder} text-gray-800 dark:text-white">${s.label}</th>`).join('')}
                    </tr>
                    <tr>
                        <th class="p-2 text-left font-medium text-gray-600 dark:text-gray-200"></th>
                        ${data.sizes.map(() => `<th class="p-2 font-medium text-gray-600 dark:text-gray-200">1 Side</th><th class="p-2 font-medium text-gray-600 dark:text-gray-200">2 Side</th>`).join('')}
                    </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-800">${basePriceRows}</tbody>
            </table>
        </div>
        <h3 class="${accentBg} text-white p-2 rounded-md text-center font-bold text-base my-4">ADD-ON PRICING</h3>
        <div class="grid gap-6 ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}">
            ${addonListHTML}
        </div>
    </div>`;
}

export function attachLanyardListeners(ctx) {
  ['lanyardSizeBtns', 'lanyardSideBtns'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON') {
          el.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
          e.target.classList.add('active');
          kiraLanyard(ctx);
        }
      });
    }
  });

  const qtyGroup = document.getElementById('lanyardQtyBtns');
  if (qtyGroup) {
    qtyGroup.addEventListener('click', e => {
      if (e.target.tagName === 'BUTTON') {
        qtyGroup.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById('lanyardCustomQty').value = e.target.dataset.qty;
        handleLanyardCustomQtyChange(ctx);
      }
    });
  }

  ctx.getLanyardData().addons.forEach((_, addonIndex) => {
    const grid = document.getElementById(`lanyardAddonGrid${addonIndex}`);
    if (grid) {
      grid.addEventListener('change', () => kiraLanyard(ctx));
    }
  });

  const addBtn = document.getElementById('addLanyardToPadBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => addLanyardToPad(ctx));
  }
}

export function renderLanyardCalculator(container, ctx) {
  const data = ctx.getLanyardData();
  const { getGlobalToggleHTML, getGlobalAgentMode } = ctx;
  const globalAgentMode = getGlobalAgentMode();
  const agentClass = globalAgentMode ? 'agent-active' : '';
  const boxStyle = 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm mb-4';
  const labelStyle = 'font-bold mb-2 block text-gray-700 dark:text-gray-200';

  let qtyButtonsHTML = data.quantities.map(q => `<button class="btn size-btn ${agentClass} ${q === 50 ? 'active' : ''}" data-qty="${q}">${q} pcs</button>`).join('');
  let sizeButtonsHTML = data.sizes.map((s, i) => `<button class="btn size-btn ${agentClass} ${i === 0 ? 'active' : ''}" data-size-index="${i}">${s.label}</button>`).join('');
  let sideButtonsHTML = `<button class="btn size-btn ${agentClass}" data-side-index="0">1 Side</button><button class="btn size-btn ${agentClass} active" data-side-index="1">2 Side</button>`;
  let addonsHTML = generateLanyardAddonsHTML(data.addons, ctx);
  let priceLayoutHTML = generateLanyardPriceListHTML(data, null, false, true, ctx);

  container.innerHTML = `
      <div class="calculator-panel mx-auto" style="max-width: 800px;">
         <h2 class="text-3xl font-bold mb-6 text-center lanyard-title uppercase" style="margin-top: 0;">LANYARD${globalAgentMode ? ' (Agent)' : ''}</h2>
         ${getGlobalToggleHTML('lanyard')}
         
         <div class="${boxStyle}">
             <label class="${labelStyle}">Quantity</label>
             <div class="size-btn-group" id="lanyardQtyBtns">${qtyButtonsHTML}</div>
             <p class="text-[5px] tracking-tight italic font-semibold text-gray-600 dark:text-gray-400 mt-2">*Notes : If it range 80pcs it will use price of 50pcs.</p>
             <div class="mt-4">
                 <label for="lanyardCustomQty" class="font-semibold text-sm text-gray-600 dark:text-gray-400">Custom Quantity:</label>
                 <input type="number" id="lanyardCustomQty" value="50" class="w-full max-w-xs p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" oninput="handleLanyardCustomQtyChange()">
             </div>
         </div>

         <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="${boxStyle}">
                <label class="${labelStyle}">Size</label>
                <div class="size-btn-group" id="lanyardSizeBtns">${sizeButtonsHTML}</div>
            </div>
            <div class="${boxStyle}">
                <label class="${labelStyle}">Print Side</label>
                <div class="size-btn-group" id="lanyardSideBtns">${sideButtonsHTML}</div>
            </div>
        </div>

        ${addonsHTML}
        
        <div id="lanyardInvoice"></div>
        
        <div style="margin-top: 12px;">
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <button id="addLanyardToPadBtn" class="btn" style="flex-grow: 1; width: auto; background-color: var(--success-color); color: white; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                  + Add to Pad
              </button>
              <button id="copyLanyardInvoiceBtn" class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600" onclick="copyLanyardInvoiceText()" style="width: auto; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                  Copy
              </button>
          </div>
          <div class="invoice-copy-area" style="margin-top: 0;">
              <textarea id="copyableLanyardInvoice" readonly rows="9" class="w-full font-mono text-sm border rounded-lg p-3 resize-y bg-[#e9ecef] text-[#495057] border-gray-300 dark:bg-[#1f2937] dark:text-[#e5e7eb] dark:border-gray-600"></textarea>
          </div>
        </div>

        ${priceLayoutHTML}

        <div class="mt-4 text-center">
            <button class="btn btn-primary" style="width: auto;" onclick="downloadElementAsJPG(event, 'lanyard-price-list-container', 'lanyard-price-list.jpg')">
                <i class="fas fa-download mr-2"></i> Download Price List (JPG)
            </button>
        </div>
    </div>`;

  attachLanyardListeners(ctx);
  setTimeout(() => kiraLanyard(ctx), 0);
}

export function openLanyardCompareModal(ctx) {
  const modal = document.getElementById('lanyardCompareModal');
  if (!modal) {
    ctx.showToast('Compare modal not found. Please refresh the page.', 'error');
    return;
  }
  const custPanel = document.getElementById('lanyardCompareCustPanel');
  const agentPanel = document.getElementById('lanyardCompareAgentPanel');
  const custScroll = document.getElementById('lanyardCompareCustScroll');
  const agentScroll = document.getElementById('lanyardCompareAgentScroll');
  const data = ctx.getLanyardData();
  custPanel.innerHTML = generateLanyardPriceListHTML(data, false, true, false, ctx);
  agentPanel.innerHTML = generateLanyardPriceListHTML(data, true, true, false, ctx);
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (custScroll && agentScroll) {
    custScroll.onscroll = () => { agentScroll.scrollTop = custScroll.scrollTop; };
    agentScroll.onscroll = () => { custScroll.scrollTop = agentScroll.scrollTop; };
  }
}

export function closeLanyardCompareModal() {
  const modal = document.getElementById('lanyardCompareModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

export function handleLanyardCustomQtyChange(ctx) {
  const customQtyInput = document.getElementById('lanyardCustomQty');
  const customQty = parseInt(customQtyInput.value) || 0;
  const priceTierIndex = getLanyardPriceTierIndex(customQty, ctx);
  const priceTierQty = ctx.getLanyardData().quantities[priceTierIndex];
  document.querySelectorAll('#lanyardQtyBtns .btn').forEach(btn => {
    if (parseInt(btn.dataset.qty) === priceTierQty) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  kiraLanyard(ctx);
}

export function kiraLanyard(ctx) {
  const invoiceEl = document.getElementById('lanyardInvoice');
  const customQtyInput = document.getElementById('lanyardCustomQty');
  if (!invoiceEl || !customQtyInput) return;

  const customQty = parseInt(customQtyInput.value) || 0;
  if (customQty <= 0) {
    invoiceEl.innerHTML = `<div class="p-4 text-red-500 font-bold text-center">Please enter a valid quantity.</div>`;
    const ta = document.getElementById('copyableLanyardInvoice');
    if (ta) ta.value = 'Invalid quantity.';
    return;
  }

  const data = ctx.getLanyardData();
  const { getGlobalAgentMode, getCurrentCurrency, formatCurrency, getIsTaxEnabled, getGlobalTaxPercent } = ctx;
  const globalAgentMode = getGlobalAgentMode();
  const currentCurrency = getCurrentCurrency();
  const isTaxEnabled = getIsTaxEnabled();
  const globalTaxPercent = getGlobalTaxPercent();

  const priceTierIndex = getLanyardPriceTierIndex(customQty, ctx);
  const priceTierQty = data.quantities[priceTierIndex];
  const activeSizeBtn = document.querySelector('#lanyardSizeBtns .active');
  const activeSideBtn = document.querySelector('#lanyardSideBtns .active');

  if (!activeSizeBtn) {
    invoiceEl.innerHTML = `<div class="p-4 text-orange-500 font-bold text-center">No sizes configured. Please add a size in Settings.</div>`;
    const ta = document.getElementById('copyableLanyardInvoice');
    if (ta) ta.value = 'No sizes configured. Please add a size in Settings.';
    return;
  }
  if (!activeSideBtn) return;

  const sizeIndex = parseInt(activeSizeBtn.dataset.sizeIndex);
  const sideValue = parseInt(activeSideBtn.dataset.sideIndex) + 1;
  const size = data.sizes[sizeIndex];
  if (!size) return;
  const sideLabel = sideValue === 1 ? '1 Side' : '2 Side';
  const sideKey = sideValue === 1 ? 'p1' : 'p2';

  const pricesTarget = globalAgentMode ? size.prices.agentPrice : size.prices.customerPrice;
  const basePrice = (pricesTarget[sideKey] && pricesTarget[sideKey][priceTierIndex]) || 0;

  let extrasCost = 0;
  let invoiceBodyHTML = `
            <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
                <span class="font-medium text-gray-500 dark:text-gray-400">Lanyard Price (Tier: ${priceTierQty}, ${size.label}, ${sideLabel})</span>
                <span class="font-bold text-gray-800 dark:text-gray-200">${currentCurrency.symbol} ${formatCurrency(basePrice)}</span>
            </div>`;

  data.addons.forEach((addon, addonIndex) => {
    if (addon.type === 'radio') {
      const checkedRadio = document.querySelector(`input[name="addon-type-${addonIndex}"]:checked`);
      if (checkedRadio) {
        const optionIndex = parseInt(checkedRadio.value);
        const selectedOption = addon.options[optionIndex];
        const optionCost = globalAgentMode ? selectedOption.agentPrice : selectedOption.customerPrice;
        extrasCost += optionCost;
        if (optionCost !== 0) {
          const sign = optionCost > 0 ? '+' : '-';
          invoiceBodyHTML += `
                  <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
                      <span class="font-medium text-gray-500 dark:text-gray-400">${addon.name} (${selectedOption.name})</span>
                      <span class="font-bold text-gray-800 dark:text-gray-200">${sign} ${currentCurrency.symbol} ${formatCurrency(Math.abs(optionCost))}</span>
                  </div>`;
        }
      }
    } else {
      const checkedBoxes = document.querySelectorAll(`input[name="addon-type-${addonIndex}"]:checked`);
      checkedBoxes.forEach(box => {
        const optionIndex = parseInt(box.value);
        const selectedOption = addon.options[optionIndex];
        const optionCost = globalAgentMode ? selectedOption.agentPrice : selectedOption.customerPrice;
        extrasCost += optionCost;
        invoiceBodyHTML += `
              <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
                  <span class="font-medium text-gray-500 dark:text-gray-400">${addon.name} (${selectedOption.name})</span>
                  <span class="font-bold text-gray-800 dark:text-gray-200">+ ${currentCurrency.symbol} ${formatCurrency(optionCost)}</span>
              </div>`;
      });
    }
  });

  const unitPrice = basePrice + extrasCost;
  const subTotal = unitPrice * customQty;
  invoiceBodyHTML += `
            <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
                <span class="font-medium text-gray-500 dark:text-gray-400">Price / pc</span>
                <span class="font-bold text-gray-800 dark:text-gray-200">${currentCurrency.symbol} ${formatCurrency(unitPrice)}</span>
            </div>`;

  let finalTotal = subTotal;
  if (isTaxEnabled) {
    const taxAmount = subTotal * (globalTaxPercent / 100);
    finalTotal += taxAmount;
    invoiceBodyHTML += `
              <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
                  <span class="font-medium text-gray-500 dark:text-gray-400">Tax (${globalTaxPercent}%)</span>
                  <span class="font-bold text-gray-800 dark:text-gray-200">${currentCurrency.symbol} ${formatCurrency(taxAmount)}</span>
              </div>`;
  }

  invoiceEl.innerHTML = `
            <div class="mt-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div class="p-6">${invoiceBodyHTML}</div>
                <div class="${globalAgentMode ? 'bg-green-600' : 'bg-blue-600'} text-white p-4 text-right">
                    <div class="text-xl font-bold">Total for ${customQty} pcs: ${currentCurrency.symbol} ${formatCurrency(finalTotal)}</div>
                </div>
                <a href="https://www.google.com/" target="_blank" class="block bg-gray-500 hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 text-white text-center py-3 font-semibold transition-colors">Download Lanyard Template</a>
            </div>`;

  const invoiceTextArea = document.getElementById('copyableLanyardInvoice');
  if (invoiceTextArea) {
    let customDetails = [`Size : ${size.label}`, `Print : ${sideLabel}`];
    data.addons.forEach((addon, addonIndex) => {
      let label = addon.name;
      if (label === 'Hook Type') label = 'Hook';
      if (addon.type === 'radio') {
        const checkedRadio = document.querySelector(`input[name="addon-type-${addonIndex}"]:checked`);
        if (checkedRadio) {
          const optionIndex = parseInt(checkedRadio.value);
          customDetails.push(`${label} : ${addon.options[optionIndex].name}`);
        }
      } else {
        const checkedBoxes = document.querySelectorAll(`input[name="addon-type-${addonIndex}"]:checked`);
        checkedBoxes.forEach(box => {
          const optionIndex = parseInt(box.value);
          customDetails.push(`${label} : ${addon.options[optionIndex].name}`);
        });
      }
    });

    let invoiceText = 'Lanyard\n';
    customDetails.forEach(detail => { invoiceText += `${detail}\n`; });
    invoiceText += `Price Per / pc : ${currentCurrency.symbol}${formatCurrency(unitPrice)}/pc\n`;
    invoiceText += `Qty : ${customQty} pcs\n`;
    if (isTaxEnabled) {
      const taxAmt = subTotal * (globalTaxPercent / 100);
      invoiceText += `Tax (${globalTaxPercent}%): ${currentCurrency.symbol}${formatCurrency(taxAmt)}\n`;
    }
    invoiceText += `Total Price : ${currentCurrency.symbol}${formatCurrency(finalTotal)}`;
    invoiceTextArea.value = invoiceText;
  }
}

export function addLanyardToPad(ctx) {
  const customQtyInput = document.getElementById('lanyardCustomQty');
  const customQty = parseInt(customQtyInput.value) || 0;
  if (customQty <= 0) {
    alert('Please enter a valid quantity.');
    return;
  }

  const data = ctx.getLanyardData();
  const { getGlobalAgentMode, addItemToQuotePad } = ctx;
  const globalAgentMode = getGlobalAgentMode();

  const sizeIndex = parseInt(document.querySelector('#lanyardSizeBtns .active').dataset.sizeIndex);
  const sideValue = parseInt(document.querySelector('#lanyardSideBtns .active').dataset.sideIndex) + 1;
  const size = data.sizes[sizeIndex];
  const sideLabel = sideValue === 1 ? '1 Side' : '2 Side';

  const priceTierIndex = getLanyardPriceTierIndex(customQty, ctx);
  const pricesTarget = globalAgentMode ? size.prices.agentPrice : size.prices.customerPrice;
  const sideKey = sideValue === 1 ? 'p1' : 'p2';
  const basePrice = (pricesTarget[sideKey] && pricesTarget[sideKey][priceTierIndex]) || 0;

  let extrasCost = 0;
  let addonLines = [];
  data.addons.forEach((addon, addonIndex) => {
    if (addon.type === 'radio') {
      const checkedRadio = document.querySelector(`input[name="addon-type-${addonIndex}"]:checked`);
      if (checkedRadio) {
        const optionIndex = parseInt(checkedRadio.value);
        const selectedOption = addon.options[optionIndex];
        extrasCost += globalAgentMode ? selectedOption.agentPrice : selectedOption.customerPrice;
        let label = addon.name;
        if (label === 'Hook Type') label = 'Hook';
        addonLines.push(`${label} : ${selectedOption.name} `);
      }
    } else {
      const checkedBoxes = document.querySelectorAll(`input[name="addon-type-${addonIndex}"]:checked`);
      checkedBoxes.forEach(box => {
        const optionIndex = parseInt(box.value);
        const selectedOption = addon.options[optionIndex];
        extrasCost += globalAgentMode ? selectedOption.agentPrice : selectedOption.customerPrice;
        addonLines.push(`Extra: ${selectedOption.name} `);
      });
    }
  });

  addItemToQuotePad({
    type: 'calculator',
    title: 'Lanyard',
    name: `Lanyard ${size.label} `,
    unitPrice: basePrice + extrasCost,
    quantity: customQty,
    details: {
      size: `Size: ${size.label} `,
      material: `Print: ${sideLabel} `,
      finishing: addonLines.join('\n'),
    },
  });
}
