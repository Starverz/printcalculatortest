/**
 * ID Card Calculator Module
 */

function syncIDCardLegacyPunchHolePriceFromAddons(ctx) {
  const idCardData = ctx.getIDCardData();
  const idCardAddons = ctx.getIDCardAddons();

  if (!idCardData.punchHolePrice) {
    idCardData.punchHolePrice = {
      none: { customerPrice: 0, agentPrice: 0 },
      yes: { customerPrice: 1, agentPrice: 0.8 }
    };
  }

  const punchAddon = idCardAddons.find(a => (a.name || '').toLowerCase().includes('punch hole'));
  if (!punchAddon || !Array.isArray(punchAddon.options) || punchAddon.options.length === 0) return;

  const noneOption = punchAddon.options.find(o => (o.name || '').toLowerCase() === 'none') || punchAddon.options[0];
  const yesOption = punchAddon.options.find(o => (o.name || '').toLowerCase() === 'yes') ||
    punchAddon.options.find(o => (o.name || '').toLowerCase() !== 'none');

  if (noneOption) {
    idCardData.punchHolePrice.none.customerPrice = noneOption.cost !== undefined ? noneOption.cost : 0;
    idCardData.punchHolePrice.none.agentPrice = noneOption.agentPrice !== undefined ? noneOption.agentPrice : idCardData.punchHolePrice.none.customerPrice;
  }
  if (yesOption) {
    idCardData.punchHolePrice.yes.customerPrice = yesOption.cost !== undefined ? yesOption.cost : 0;
    idCardData.punchHolePrice.yes.agentPrice = yesOption.agentPrice !== undefined ? yesOption.agentPrice : idCardData.punchHolePrice.yes.customerPrice;
  }
}

export function ensureIDCardDefaultAddons(ctx) {
  let idCardAddons = ctx.getIDCardAddons();
  if (!Array.isArray(idCardAddons)) {
    idCardAddons = [];
    ctx.setIDCardAddons(idCardAddons);
  }

  if (idCardAddons.length === 0) {
    const idCardData = ctx.getIDCardData();
    const none = (idCardData.punchHolePrice && idCardData.punchHolePrice.none) || { customerPrice: 0, agentPrice: 0 };
    const yes = (idCardData.punchHolePrice && idCardData.punchHolePrice.yes) || { customerPrice: 1, agentPrice: 0.8 };
    idCardAddons = [{
      name: 'Punch Hole',
      type: 'radio',
      options: [
        { name: 'None', cost: none.customerPrice || 0, agentPrice: none.agentPrice || 0 },
        { name: 'Yes', cost: yes.customerPrice || 0, agentPrice: yes.agentPrice || 0 }
      ]
    }];
    ctx.setIDCardAddons(idCardAddons);
  }

  idCardAddons.forEach(addon => {
    if (!addon.type) addon.type = 'radio';
    if (!Array.isArray(addon.options)) addon.options = [];
    addon.options.forEach(option => {
      if (option.cost === undefined) option.cost = 0;
      if (option.agentPrice === undefined) option.agentPrice = option.cost;
    });
  });

  syncIDCardLegacyPunchHolePriceFromAddons(ctx);
}

export function getIDCUnitPrice(qty, side = '1', ctx) {
  const idCardData = ctx.getIDCardData();
  const quantities = idCardData.quantities;
  let applicableQty = quantities[0];
  for (let i = quantities.length - 1; i >= 0; i--) {
    if (qty >= quantities[i]) {
      applicableQty = quantities[i];
      break;
    }
  }
  const priceObj = idCardData.basePrice[side]?.[applicableQty];
  if (!priceObj) {
    return ctx.getGlobalAgentMode() ? 20.0 : 25.0;
  }
  return ctx.getGlobalAgentMode() ? priceObj.agentPrice : priceObj.customerPrice;
}

export function handleIdCardCustomQtyChange(ctx) {
  const input = document.getElementById('idCardCustomQty');
  let qty = parseInt(input.value);
  if (isNaN(qty) || qty < 1) qty = 1;
  ctx.setSelectedIdCardQty(qty);
  const tiers = ctx.getIDCardData().quantities;
  let activeTier = tiers[0];
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (qty >= tiers[i]) { activeTier = tiers[i]; break; }
  }
  document.querySelectorAll('#idCardQtyBtns .btn').forEach(btn => {
    if (parseInt(btn.dataset.qty) === activeTier) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  kiraIdCard(ctx);
}

export function getSelectedIDCardAddonData(ctx) {
  ensureIDCardDefaultAddons(ctx);
  const idCardAddons = ctx.getIDCardAddons();
  const globalAgentMode = ctx.getGlobalAgentMode();
  const selections = [];
  let totalCost = 0;

  idCardAddons.forEach((addon, addonIndex) => {
    const activeBtn = document.querySelector(`#idCardAddonBtns-${addonIndex} .active`);
    const selectedIndex = activeBtn ? parseInt(activeBtn.dataset.optionIndex, 10) : 0;
    const selectedOption = addon.options[selectedIndex] || addon.options[0];
    if (!selectedOption) return;

    const customerCost = selectedOption.cost !== undefined ? selectedOption.cost : 0;
    const agentCost = selectedOption.agentPrice !== undefined ? selectedOption.agentPrice : customerCost;
    const optionCost = globalAgentMode ? agentCost : customerCost;

    totalCost += optionCost;
    selections.push({
      addonName: addon.name,
      optionName: selectedOption.name,
      cost: optionCost
    });
  });

  return { selections, totalCost };
}

export function kiraIdCard(ctx) {
  const qty = ctx.getSelectedIdCardQty();
  const invoiceEl = document.getElementById('idCardInvoice');
  const invoiceTextEl = document.getElementById('idCardInvoiceText');
  if (!invoiceEl) return;

  const sideOption = document.querySelector('#idCardSideBtns .active').dataset.value;
  const baseUnitPrice = getIDCUnitPrice(qty, sideOption, ctx);
  const addonData = getSelectedIDCardAddonData(ctx);
  const finalUnitPrice = baseUnitPrice + addonData.totalCost;
  const subTotal = finalUnitPrice * qty;
  const { getCurrentCurrency, formatCurrency, getIsTaxEnabled, getGlobalTaxPercent, getGlobalAgentMode, generateUniversalInvoice } = ctx;
  const currentCurrency = getCurrentCurrency();
  const isTaxEnabled = getIsTaxEnabled();
  const globalTaxPercent = getGlobalTaxPercent();
  const globalAgentMode = getGlobalAgentMode();

  let taxRow = '';
  let finalTotal = subTotal;
  if (isTaxEnabled) {
    const taxAmount = subTotal * (globalTaxPercent / 100);
    finalTotal += taxAmount;
    taxRow = `
    <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
        <span class="font-medium text-gray-500 dark:text-gray-400">Tax (${globalTaxPercent}%)</span>
        <span class="font-bold text-gray-800 dark:text-gray-200">${currentCurrency.symbol} ${formatCurrency(taxAmount)}</span>
    </div>`;
  }

  const addonRows = addonData.selections
    .filter(sel => {
      const optionName = (sel.optionName || '').trim().toLowerCase();
      return sel.cost !== 0 || (optionName !== '' && optionName !== 'none' && optionName !== 'no');
    })
    .map(sel => {
      const optionName = (sel.optionName || '').trim();
      const label = optionName ? `${sel.addonName} (${optionName})` : sel.addonName;
      const value = sel.cost === 0
        ? optionName
        : `${sel.cost > 0 ? '+' : '-'} ${currentCurrency.symbol} ${formatCurrency(Math.abs(sel.cost))}`;
      return `
      <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
          <span class="font-medium text-gray-500 dark:text-gray-400">${label}</span>
          <span class="font-bold text-gray-800 dark:text-gray-200">${value}</span>
      </div>`;
    }).join('');

  invoiceEl.innerHTML = `
    <div class="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div class="p-6">
            <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
                <span class="font-medium text-gray-500 dark:text-gray-400">Base Price (Tier: ${qty} pcs)</span>
                <span class="font-bold text-gray-800 dark:text-gray-200">${currentCurrency.symbol} ${formatCurrency(baseUnitPrice)}</span>
            </div>
            <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
                <span class="font-medium text-gray-500 dark:text-gray-400">Material</span>
                <span class="font-bold text-gray-800 dark:text-gray-200">Standard PVC</span>
            </div>
            <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
                <span class="font-medium text-gray-500 dark:text-gray-400">Print Side</span>
                <span class="font-bold text-gray-800 dark:text-gray-200">${sideOption === '2' ? '2 Sided' : '1 Sided'}</span>
            </div>
            ${addonRows}
            <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
                <span class="font-medium text-gray-500 dark:text-gray-400">Final Price/Card</span>
                <span class="font-bold text-gray-800 dark:text-gray-200">${currentCurrency.symbol} ${formatCurrency(finalUnitPrice)}</span>
            </div>
            ${taxRow}
        </div>
        <div class="${globalAgentMode ? 'bg-green-600' : 'bg-blue-600'} text-white p-2 text-right">
            <div class="text-xl font-bold">Total for ${qty} Cards: ${currentCurrency.symbol} ${formatCurrency(finalTotal)}</div>
        </div>
        <a href="https://drive.google.com/drive/folders/1i_tgc97MS-UtGqVr1Iew2pSG2uU63HSJ?usp=sharing" target="_blank"
           class="block bg-gray-500 hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 text-white text-center py-3 font-semibold transition-colors">
            Download ID Card Template
        </a>
    </div>`;

  if (invoiceTextEl) {
    let customDetails = [];
    customDetails.push('Material: Standard PVC');
    customDetails.push(`Print: ${sideOption === '2' ? '2 Sided' : '1 Sided'}`);
    addonData.selections.forEach(sel => {
      const optionName = (sel.optionName || '').trim().toLowerCase();
      if (optionName === '' || optionName === 'none' || optionName === 'no') return;
      if ((sel.addonName || '').toLowerCase().includes('punch hole')) {
        customDetails.push('Finishing: Punch Hole');
      } else {
        customDetails.push(`${sel.addonName}: ${sel.optionName}`);
      }
    });
    invoiceTextEl.value = generateUniversalInvoice('ID Card Printing', customDetails, finalUnitPrice, qty);
  }
}

export function addIdCardToPad(ctx) {
  const qty = ctx.getSelectedIdCardQty();
  const sideOption = document.querySelector('#idCardSideBtns .active').dataset.value;
  const baseUnitPrice = getIDCUnitPrice(qty, sideOption, ctx);
  const addonData = getSelectedIDCardAddonData(ctx);
  const unitPrice = baseUnitPrice + addonData.totalCost;

  let finishingArr = [];
  addonData.selections.forEach(sel => {
    const optionName = (sel.optionName || '').trim().toLowerCase();
    if (optionName === '' || optionName === 'none' || optionName === 'no') return;
    if ((sel.addonName || '').toLowerCase().includes('punch hole')) {
      finishingArr.push('Punch Hole');
    } else {
      finishingArr.push(`${sel.addonName}: ${sel.optionName}`);
    }
  });
  const finishingStr = finishingArr.length > 0 ? finishingArr.join(', ') : 'None';

  ctx.addItemToQuotePad({
    type: 'calculator',
    title: 'ID Card',
    name: 'ID Card(Standard PVC)',
    unitPrice,
    quantity: qty,
    details: {
      size: 'Standard CR80',
      material: 'Material: Standard PVC',
      finishing: `Side: ${sideOption} Side\nExtras: ${finishingStr}`
    }
  });
}

export function copyIdCardInvoice(ctx) {
  const txt = document.getElementById('idCardInvoiceText');
  if (txt) {
    txt.select();
    navigator.clipboard.writeText(txt.value).then(() => {
      ctx.showToast('✓ Invoice copied!');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }
}

export function generateIDCardPriceListHTML(forceAgent = null, showHeader = true, ctx) {
  ensureIDCardDefaultAddons(ctx);
  const idCardData = ctx.getIDCardData();
  const idCardAddons = ctx.getIDCardAddons();
  const { formatCurrency } = ctx;
  const isAgent = forceAgent !== null ? forceAgent : ctx.getGlobalAgentMode();
  const titleText = isAgent ? 'ID CARD PRICE LIST (AGENT)' : 'ID CARD PRICE LIST';

  const priceRows = idCardData.quantities.map(qty => {
    const key = qty.toString();
    const p1obj = idCardData.basePrice['1']?.[key];
    const p2obj = idCardData.basePrice['2']?.[key];
    const p1 = p1obj ? (isAgent ? p1obj.agentPrice : p1obj.customerPrice) : 0;
    const p2 = p2obj ? (isAgent ? p2obj.agentPrice : p2obj.customerPrice) : 0;
    return `
      <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
        <td class="p-3 text-left text-gray-800 dark:text-gray-200 font-semibold">${qty} pcs</td>
        <td class="p-3 text-center text-gray-600 dark:text-gray-400">${formatCurrency(p1)}</td>
        <td class="p-3 text-center text-gray-600 dark:text-gray-400">${formatCurrency(p2)}</td>
      </tr>`;
  }).join('');

  const p1base = idCardData.basePrice['1']?.['1'];
  const p2base = idCardData.basePrice['2']?.['1'];
  const sideSurcharge = (p1base && p2base)
    ? (isAgent ? p2base.agentPrice : p2base.customerPrice) - (isAgent ? p1base.agentPrice : p1base.customerPrice)
    : 0;
  const sideAddonHTML = `
    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-500 shadow-sm dark:shadow-none" style="flex: 1 1 180px; max-width: 300px; min-width: 160px;">
      <h4 class="bg-indigo-600 text-white p-2 text-center font-bold text-sm uppercase">Print Side</h4>
      <table class="w-full border-collapse"><tbody>
        <tr class="border-b border-gray-200 dark:border-gray-600 last:border-0 h-12">
          <td class="p-2 text-gray-600 dark:text-gray-400 text-left text-sm align-middle font-semibold w-2/3">1 Side</td>
          <td class="p-2 text-gray-600 dark:text-gray-400 text-right text-sm align-middle whitespace-nowrap w-1/3">${formatCurrency(0)}</td>
        </tr>
        <tr class="border-b border-gray-200 dark:border-gray-600 last:border-0 h-12">
          <td class="p-2 text-gray-600 dark:text-gray-400 text-left text-sm align-middle font-semibold w-2/3">2 Sides</td>
          <td class="p-2 text-gray-600 dark:text-gray-400 text-right text-sm align-middle whitespace-nowrap w-1/3">+ ${formatCurrency(sideSurcharge)}</td>
        </tr>
      </tbody></table>
    </div>`;

  const addonsHTML = idCardAddons.map(addon => {
    const rows = addon.options.map(opt => {
      const price = isAgent ? (opt.agentPrice || 0) : (opt.cost || 0);
      const displayPrice = price > 0 ? `+ ${formatCurrency(price)}` : formatCurrency(0);
      return `
        <tr class="border-b border-gray-200 dark:border-gray-600 last:border-0 h-12">
          <td class="p-2 text-gray-600 dark:text-gray-400 text-left text-sm align-middle font-semibold w-2/3">${opt.name}</td>
          <td class="p-2 text-gray-600 dark:text-gray-400 text-right text-sm align-middle whitespace-nowrap w-1/3">${displayPrice}</td>
        </tr>`;
    }).join('');
    return `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-500 shadow-sm dark:shadow-none" style="flex: 1 1 180px; max-width: 300px; min-width: 160px;">
        <h4 class="bg-indigo-600 text-white p-2 text-center font-bold text-sm uppercase">${addon.name}</h4>
        <table class="w-full border-collapse"><tbody>${rows}</tbody></table>
      </div>`;
  }).join('');

  return `
    <div id="id-card-price-list-container" class="bg-white dark:bg-gray-800 p-6 rounded-lg mt-8 border border-gray-200 dark:border-gray-700 shadow-sm">
      ${showHeader ? `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h2 class="font-extrabold text-3xl tracking-wide id-card-title" style="margin: 0; flex: 1;">${titleText}</h2>
        <button onclick="openIDCardCompareModal()" style="background-color: #e53e3e; border: none; color: white; width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: all 0.3s ease; font-size: 20px;" class="hover:opacity-80" title="Compare Customer vs Agent Prices">
          <i class="fas fa-columns"></i>
        </button>
      </div>` : ''}
      <h3 class="bg-indigo-600 text-white p-2 rounded-md text-center font-bold text-base mb-4">PRICE PER CARD (RM)</h3>
      <div class="overflow-x-auto mb-8">
        <table class="w-full border-collapse text-sm text-center">
          <thead class="bg-indigo-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
            <tr>
              <th class="p-3 text-left font-semibold border-b-2 border-indigo-600 dark:border-indigo-500">QUANTITY</th>
              <th class="p-3 font-semibold border-b-2 border-indigo-600 dark:border-indigo-500">1 Side</th>
              <th class="p-3 font-semibold border-b-2 border-indigo-600 dark:border-indigo-500">2 Sides</th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800">${priceRows}</tbody>
        </table>
      </div>
      <h3 class="text-center font-bold text-xl text-gray-700 dark:text-white mb-4 border-t dark:border-gray-600 pt-4">ADD-ONS &amp; EXTRAS</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 24px; justify-content: center;">
        ${sideAddonHTML}
        ${addonsHTML}
      </div>
    </div>`;
}

export function openIDCardCompareModal(ctx) {
  const modal = document.getElementById('idCardCompareModal');
  if (!modal) {
    ctx.showToast('Compare modal not found. Please refresh the page.', 'error');
    return;
  }
  const custPanel = document.getElementById('idCardCompareCustPanel');
  const agentPanel = document.getElementById('idCardCompareAgentPanel');
  const custScroll = document.getElementById('idCardCompareCustScroll');
  const agentScroll = document.getElementById('idCardCompareAgentScroll');
  custPanel.innerHTML = generateIDCardPriceListHTML(false, false, ctx);
  agentPanel.innerHTML = generateIDCardPriceListHTML(true, false, ctx);
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (custScroll && agentScroll) {
    custScroll.onscroll = () => { agentScroll.scrollTop = custScroll.scrollTop; };
    agentScroll.onscroll = () => { custScroll.scrollTop = agentScroll.scrollTop; };
  }
}

export function closeIDCardCompareModal() {
  const modal = document.getElementById('idCardCompareModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

export function attachIDCardListeners(ctx) {
  const qtyGroup = document.getElementById('idCardQtyBtns');
  if (qtyGroup) {
    qtyGroup.addEventListener('click', e => {
      if (e.target.tagName === 'BUTTON') {
        qtyGroup.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById('idCardCustomQty').value = e.target.dataset.qty;
        handleIdCardCustomQtyChange(ctx);
      }
    });
  }

  const sideEl = document.getElementById('idCardSideBtns');
  if (sideEl) {
    sideEl.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (btn) {
        sideEl.querySelectorAll('.size-btn').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        kiraIdCard(ctx);
      }
    });
  }

  document.querySelectorAll('.idCardAddonBtns').forEach(el => {
    el.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (btn) {
        el.querySelectorAll('.size-btn').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        kiraIdCard(ctx);
      }
    });
  });

  const addBtn = document.getElementById('addIdCardToPadBtn');
  if (addBtn) addBtn.addEventListener('click', () => addIdCardToPad(ctx));

  const copyBtn = document.getElementById('copyIdCardInvoiceBtn');
  if (copyBtn) copyBtn.addEventListener('click', () => copyIdCardInvoice(ctx));
}

export function renderIDCardCalculator(container, ctx) {
  if (!ctx.getSelectedIdCardQty()) ctx.setSelectedIdCardQty(10);
  ensureIDCardDefaultAddons(ctx);

  const idCardData = ctx.getIDCardData();
  const idCardAddons = ctx.getIDCardAddons();
  const selectedIdCardQty = ctx.getSelectedIdCardQty();
  const globalAgentMode = ctx.getGlobalAgentMode();
  const { getGlobalToggleHTML } = ctx;
  const agentClass = globalAgentMode ? 'agent-active' : '';

  const qtyButtonsHTML = idCardData.quantities.map(qty =>
    `<button class="btn size-btn ${agentClass} ${qty === selectedIdCardQty ? 'active' : ''}" data-qty="${qty}">${qty} pcs</button>`
  ).join('');

  const priceLayoutHTML = generateIDCardPriceListHTML(null, true, ctx);
  const addonControlsHTML = idCardAddons.map((addon, addonIndex) => {
    const addonButtons = addon.options.map((option, optionIndex) =>
      `<button class="btn size-btn ${agentClass} ${optionIndex === 0 ? 'active' : ''}" data-addon-index="${addonIndex}" data-option-index="${optionIndex}">${option.name}</button>`
    ).join('');
    return `
      <div class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
        <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">${addon.name}</label>
        <div class="size-btn-group idCardAddonBtns" id="idCardAddonBtns-${addonIndex}">
          ${addonButtons}
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="calculator-panel mx-auto" style="max-width: 800px;">
        <h2 class="text-3xl font-bold mb-6 text-center id-card-title uppercase" style="margin-top: 0;">ID CARD${globalAgentMode ? ' (Agent)' : ''}</h2>
        ${getGlobalToggleHTML('idCard')}

        <div class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm">
            <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Quantity</label>
            <div class="size-btn-group" id="idCardQtyBtns">${qtyButtonsHTML}</div>
            <p class="text-[5px] tracking-tight italic font-semibold text-gray-600 dark:text-gray-400 mt-2">*Notes : If it range 18pcs it will use price of 10pcs.</p>
            <div class="mt-4">
                <label for="idCardCustomQty" class="font-semibold text-sm text-gray-600 dark:text-gray-400">Custom Quantity:</label>
                <input type="number" id="idCardCustomQty" value="${selectedIdCardQty}" class="w-full max-w-xs p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" oninput="handleIdCardCustomQtyChange()">
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Print Side</label>
                <div class="size-btn-group" id="idCardSideBtns">
                    <button class="btn size-btn ${agentClass} active" data-value="1">1 Side</button>
                    <button class="btn size-btn ${agentClass}" data-value="2">2 Side</button>
                </div>
            </div>
            ${addonControlsHTML}
        </div>

        <div id="idCardInvoice"></div>

        <div style="margin-top: 12px;">
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <button id="addIdCardToPadBtn" class="btn"
                    style="flex-grow: 1; width: auto; background-color: var(--success-color); color: white; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                    + Add to Pad
                </button>
                <button id="copyIdCardInvoiceBtn" class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
                    style="width: auto; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                    Copy
                </button>
            </div>
            <div class="invoice-copy-area" style="margin-top: 0;">
                <textarea id="idCardInvoiceText" readonly rows="7"
                    class="w-full font-mono text-sm border rounded-lg p-3 resize-y bg-[#e9ecef] text-[#495057] border-gray-300 dark:bg-[#1f2937] dark:text-[#e5e7eb] dark:border-gray-600"
                ></textarea>
            </div>
        </div>

        ${priceLayoutHTML}

        <div class="mt-4 text-center">
            <button class="btn btn-primary" style="width: auto;" onclick="downloadElementAsJPG(event, 'id-card-price-list-container', 'id-card-price-list.jpg')">
                <i class="fas fa-download mr-2"></i> Download Price List (JPG)
            </button>
        </div>
    </div>`;

  attachIDCardListeners(ctx);
  kiraIdCard(ctx);
}
