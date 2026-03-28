import { findHighestMatchingTier } from '../utils/pricing.js';
import { closeCompareModal, copyTextareaValue, openSyncedCompareModal } from '../utils/ui.js';

export function copyInvitationCardInvoiceText(context) {
  copyTextareaValue('invCardInvoiceText', { showToast: context.showToast });
}

export function addInvitationCardToPad(context) {
  const sizeEl = document.querySelector('#invCardSizeBtns .active');
  const sideEl = document.querySelector('#invCardSideBtns .active');
  const customQtyInput = document.getElementById('invCardCustomQty');
  const customQty = parseInt(customQtyInput.value, 10) || 0;

  if (!sizeEl || !sideEl || customQty <= 0) {
    alert('Please ensure a size, print side, and valid quantity are selected.');
    return;
  }

  const invitationCardData = context.getInvitationCardData();
  const selectedInvCardMaterial = context.getSelectedInvCardMaterial();
  const selectedInvCardAddons = context.getSelectedInvCardAddons();
  const priceTierQty = getInvitationPriceTier(context, customQty);
  const size = sizeEl.dataset.size;
  const side = Number(sideEl.dataset.side);
  const materialObj = invitationCardData.materials[selectedInvCardMaterial];
  const material = materialObj.name;

  const baseObj = invitationCardData.basePrice;
  const addonsArr = invitationCardData.addons;
  const basePriceObj = (((baseObj[size] || {})[priceTierQty] || {})[side]) || { customerPrice: 0, agentPrice: 0 };
  const baseUnit = context.getGlobalAgentMode() ? basePriceObj.agentPrice : basePriceObj.customerPrice;
  const matPriceObj = materialObj.addOn[size] || { customerPrice: 0, agentPrice: 0 };
  const matAdd = context.getGlobalAgentMode() ? matPriceObj.agentPrice : matPriceObj.customerPrice;

  let totalAddonsCost = 0;
  const addonsArrList = [];

  addonsArr.forEach((addon, addonIndex) => {
    const selectedOptionIndex = selectedInvCardAddons[addonIndex] || 0;
    if (selectedOptionIndex > 0) {
      const selectedOption = addon.options[selectedOptionIndex];
      const addonPriceObj = selectedOption.prices[size] || { customerPrice: 0, agentPrice: 0 };
      const addonPrice = context.getGlobalAgentMode() ? addonPriceObj.agentPrice : addonPriceObj.customerPrice;
      totalAddonsCost += addonPrice;
      addonsArrList.push(`${addon.name}: ${selectedOption.name}`);
    }
  });

  const unitPrice = baseUnit + matAdd + totalAddonsCost;
  const finishingStr = addonsArrList.length > 0 ? addonsArrList.join(', ') : 'None';

  context.addItemToQuotePad({
    type: 'calculator',
    title: 'Invitation Card',
    name: `Invitation Card (${size})`,
    unitPrice,
    quantity: customQty,
    details: {
      size: `Size: ${size}`,
      material: `Material: ${material}`,
      finishing: `Print: ${side} Side\nAdd-ons: ${finishingStr}`
    }
  });
}

export function generateInvitationPriceListHTML(context, data, forceAgent = null, showHeader = true) {
  const baseObj = data.basePrice;
  const useAgent = forceAgent !== null ? forceAgent : context.getGlobalAgentMode();
  const mainTitleColor = useAgent ? 'text-green-600 dark:text-green-500' : 'text-gray-800 dark:text-white';
  const accentBorder = useAgent ? 'border-green-600 dark:border-green-500' : 'border-teal-600 dark:border-teal-500';
  const titleText = useAgent ? 'INVITATION CARD PRICE LIST (AGENT)' : 'INVITATION CARD PRICE LIST (CUSTOMER)';

  const basePriceRows = data.quantities.map((qty) => `
        <tr class="border-b border-gray-200 dark:border-gray-700">
            <td class="p-3 text-left text-gray-800 dark:text-gray-200 font-semibold">${qty} pcs</td>
            ${data.sizes.map((size) => {
              const side1Obj = baseObj[size]?.[qty]?.[1];
              const side2Obj = baseObj[size]?.[qty]?.[2];
              const side1 = useAgent ? side1Obj?.agentPrice : side1Obj?.customerPrice;
              const side2 = useAgent ? side2Obj?.agentPrice : side2Obj?.customerPrice;
              return `<td class="p-3 text-gray-600 dark:text-gray-400">1 Side: ${context.formatCurrency(side1 ?? 0)}<br>2 Side: ${context.formatCurrency(side2 ?? 0)}</td>`;
            }).join('')}
        </tr>`).join('');

  const materialRows = data.materials.map((material) => `
        <tr class="border-b border-gray-200 dark:border-gray-700">
            <td class="p-3 text-left text-gray-800 dark:text-gray-200 font-semibold">${material.name}</td>
            ${data.sizes.map((size) => {
              const priceObj = material.addOn[size] || { customerPrice: 0, agentPrice: 0 };
              const price = useAgent ? priceObj.agentPrice : priceObj.customerPrice;
              return `<td class="p-3 text-gray-600 dark:text-gray-400">+ ${context.formatCurrency(price)}</td>`;
            }).join('')}
        </tr>`).join('');

  const addonTablesHTML = data.addons.map((addon) => {
    const optionRows = addon.options.map((option) => `
          <tr class="border-b border-gray-200 dark:border-gray-700 last:border-0">
              <td class="p-3 text-left text-gray-800 dark:text-gray-200 font-semibold">${option.name}</td>
              ${data.sizes.map((size) => {
                const priceObj = option.prices[size] || { customerPrice: 0, agentPrice: 0 };
                const price = useAgent ? priceObj.agentPrice : priceObj.customerPrice;
                return `<td class="p-3 text-gray-600 dark:text-gray-400">+ ${context.formatCurrency(price)}</td>`;
              }).join('')}
          </tr>`).join('');

    return `
      <div class="overflow-x-auto mt-6">
        <h3 class="font-bold text-lg mb-3 text-gray-800 dark:text-white">${addon.name}</h3>
        <table class="w-full border-collapse text-sm text-center">
          <thead class="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th class="p-3 text-left font-semibold border-b-2 ${accentBorder} text-gray-800 dark:text-white">OPTION</th>
              ${data.sizes.map((size) => `<th class="p-3 font-semibold border-b-2 ${accentBorder} text-gray-800 dark:text-white">${size}</th>`).join('')}
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800">${optionRows}</tbody>
        </table>
      </div>`;
  }).join('');

  return `
    <div id="invitation-card-price-list-container" class="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-lg border border-gray-200 dark:border-gray-700 mt-8">
      ${showHeader ? `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px;">
        <h2 class="font-extrabold text-3xl tracking-wide ${mainTitleColor}" style="margin: 0; flex: 1;">${titleText}</h2>
        <button onclick="openInvitationCompareModal()" style="
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
        " class="hover:opacity-80" title="Compare Customer vs Agent Prices"><i class="fas fa-columns"></i></button>
      </div>` : ''}

      <div class="overflow-x-auto">
        <h3 class="font-bold text-lg mb-3 text-gray-800 dark:text-white">Base Price</h3>
        <table class="w-full border-collapse text-sm text-center">
          <thead class="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th class="p-3 text-left font-semibold border-b-2 ${accentBorder} text-gray-800 dark:text-white">QUANTITY</th>
              ${data.sizes.map((size) => `<th class="p-3 font-semibold border-b-2 ${accentBorder} text-gray-800 dark:text-white">${size}</th>`).join('')}
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800">${basePriceRows}</tbody>
        </table>
      </div>

      <div class="overflow-x-auto mt-6">
         <h3 class="font-bold text-lg mb-3 text-gray-800 dark:text-white">Material Add-on</h3>
         <table class="w-full border-collapse text-sm text-center">
            <thead class="bg-gray-100 dark:bg-gray-700">
                <tr>
                    <th class="p-3 text-left font-semibold border-b-2 ${accentBorder} text-gray-800 dark:text-white">MATERIAL</th>
                    ${data.sizes.map((size) => `<th class="p-3 font-semibold border-b-2 ${accentBorder} text-gray-800 dark:text-white">${size}</th>`).join('')}
                </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800">${materialRows}</tbody>
        </table>
    </div>

    ${addonTablesHTML}
    </div>
  `;
}

export function openInvitationCompareModal(context) {
  const invitationCardData = context.getInvitationCardData();

  openSyncedCompareModal({
    modalId: 'invitationCompareModal',
    customerPanelId: 'invCompareCustPanel',
    agentPanelId: 'invCompareAgentPanel',
    customerScrollId: 'invCompareCustScroll',
    agentScrollId: 'invCompareAgentScroll',
    renderCustomer: () => generateInvitationPriceListHTML(context, invitationCardData, false, false),
    renderAgent: () => generateInvitationPriceListHTML(context, invitationCardData, true, false),
    onMissing: () => context.showToast('Compare modal not found. Please refresh the page.', 'error'),
  });
}

export function closeInvitationCompareModal() {
  closeCompareModal('invitationCompareModal');
}

export function attachInvitationListeners(context) {
  ['invCardSizeBtns', 'invCardSideBtns'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
          el.querySelectorAll('button').forEach((button) => button.classList.remove('active'));
          event.target.classList.add('active');
          kiraInvitationCard(context);
        }
      });
    }
  });

  const qtyGroup = document.getElementById('invCardQtyBtns');
  if (qtyGroup) {
    qtyGroup.addEventListener('click', (event) => {
      if (event.target.tagName === 'BUTTON') {
        qtyGroup.querySelectorAll('button').forEach((button) => button.classList.remove('active'));
        event.target.classList.add('active');
        document.getElementById('invCardCustomQty').value = event.target.dataset.qty;
        handleInvCardCustomQtyChange(context);
      }
    });
  }

  const matGroup = document.getElementById('invCardMaterialGroup');
  if (matGroup) {
    matGroup.addEventListener('click', (event) => {
      if (event.target.tagName === 'BUTTON') {
        matGroup.querySelectorAll('button').forEach((button) => button.classList.remove('active'));
        event.target.classList.add('active');
        context.setSelectedInvCardMaterial(parseInt(event.target.dataset.value, 10));
        kiraInvitationCard(context);
      }
    });
  }

  context.getInvitationCardData().addons.forEach((addon, addonIndex) => {
    const addonGroup = document.getElementById(`invCardAddonGroup${addonIndex}`);
    if (addonGroup) {
      addonGroup.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
          addonGroup.querySelectorAll('button').forEach((button) => button.classList.remove('active'));
          event.target.classList.add('active');
          context.setSelectedInvCardAddon(addonIndex, parseInt(event.target.dataset.optionIndex, 10));
          kiraInvitationCard(context);
        }
      });
    }
  });
}

export function handleInvCardCustomQtyChange(context) {
  const customQtyInput = document.getElementById('invCardCustomQty');
  const customQty = parseInt(customQtyInput.value, 10) || 0;
  const priceTierQty = getInvitationPriceTier(context, customQty);
  const qtyBtns = document.querySelectorAll('#invCardQtyBtns .btn');
  qtyBtns.forEach((button) => {
    if (parseInt(button.dataset.qty, 10) === priceTierQty) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
  kiraInvitationCard(context);
}

export function getInvitationPriceTier(context, customQty) {
  return findHighestMatchingTier(context.getInvitationCardData().quantities, customQty);
}

export function kiraInvitationCard(context) {
  const sizeEl = document.querySelector('#invCardSizeBtns .active');
  const sideEl = document.querySelector('#invCardSideBtns .active');
  const customQtyInput = document.getElementById('invCardCustomQty');
  const invoiceEl = document.getElementById('invCardInvoice');

  if (!invoiceEl || !customQtyInput) return;

  const invitationCardData = context.getInvitationCardData();
  const selectedInvCardMaterial = context.getSelectedInvCardMaterial();
  const selectedInvCardAddons = context.getSelectedInvCardAddons();
  const customQty = parseInt(customQtyInput.value, 10) || 0;
  const size = sizeEl ? sizeEl.dataset.size : (invitationCardData.sizes[0] ?? null);

  if (!size) {
    invoiceEl.innerHTML = '<div class="p-4 text-orange-500 font-bold text-center">No sizes configured. Please add a size in Settings.</div>';
    const ta = document.getElementById('invCardInvoiceText');
    if (ta) ta.value = 'No sizes configured. Please add a size in Settings.';
    return;
  }

  const side = sideEl ? Number(sideEl.dataset.side) : 1;

  if (customQty <= 0) {
    invoiceEl.innerHTML = '<div class="p-4 text-red-500 font-bold text-center">Please enter a valid quantity.</div>';
    const invoiceTextArea = document.getElementById('invCardInvoiceText');
    if (invoiceTextArea) invoiceTextArea.value = 'Invalid quantity.';
    return;
  }

  const priceTierQty = getInvitationPriceTier(context, customQty);
  const materialObj = invitationCardData.materials[selectedInvCardMaterial];
  const material = materialObj.name;
  const baseObj = invitationCardData.basePrice;
  const addonsArr = invitationCardData.addons;
  const basePriceObj = (((baseObj[size] || {})[priceTierQty] || {})[side]) || { customerPrice: 0, agentPrice: 0 };
  const baseUnit = context.getGlobalAgentMode() ? basePriceObj.agentPrice : basePriceObj.customerPrice;
  const matPriceObj = materialObj.addOn[size] || { customerPrice: 0, agentPrice: 0 };
  const matAdd = context.getGlobalAgentMode() ? matPriceObj.agentPrice : matPriceObj.customerPrice;

  let totalAddonsCost = 0;
  let addonsHtmlRows = '';
  const addonsTextList = [];

  addonsArr.forEach((addon, addonIndex) => {
    const selectedOptionIndex = selectedInvCardAddons[addonIndex] || 0;
    if (selectedOptionIndex > 0) {
      const selectedOption = addon.options[selectedOptionIndex];
      const addonPriceObj = selectedOption.prices[size] || { customerPrice: 0, agentPrice: 0 };
      const addonPrice = context.getGlobalAgentMode() ? addonPriceObj.agentPrice : addonPriceObj.customerPrice;
      totalAddonsCost += addonPrice;
      addonsHtmlRows += `
            <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
                <span class="font-medium text-gray-500 dark:text-gray-400">${addon.name}</span>
                <span class="font-bold text-gray-800 dark:text-gray-200">${selectedOption.name}</span>
            </div>`;
      addonsTextList.push(`${addon.name} : ${selectedOption.name}`);
    }
  });

  const unitPrice = baseUnit + matAdd + totalAddonsCost;
  const subTotal = unitPrice * customQty;
  let taxRow = '';
  let finalTotal = subTotal;

  if (context.getIsTaxEnabled()) {
    const taxAmount = subTotal * (context.getGlobalTaxPercent() / 100);
    finalTotal += taxAmount;
    taxRow = `
        <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
            <span class="font-medium text-gray-500 dark:text-gray-400">Tax (${context.getGlobalTaxPercent()}%)</span>
            <span class="font-bold text-gray-800 dark:text-gray-200">${context.getCurrentCurrency().symbol} ${context.formatCurrency(taxAmount)}</span>
        </div>`;
  }

  invoiceEl.innerHTML = `
    <div class="mt-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div class="p-6">
            <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
                <span class="font-medium text-gray-500 dark:text-gray-400">Size</span>
                <span class="font-bold text-gray-800 dark:text-gray-200 text-right">${size}</span>
            </div>
            
            <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
                <span class="font-medium text-gray-500 dark:text-gray-400">Material</span>
                <span class="font-bold text-gray-800 dark:text-gray-200 text-right">${material}</span>
            </div>

            <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
                <span class="font-medium text-gray-500 dark:text-gray-400">Print Side</span>
                <span class="font-bold text-gray-800 dark:text-gray-200">${side} Side</span>
            </div>

            ${addonsHtmlRows}

            <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
                <span class="font-medium text-gray-500 dark:text-gray-400">Price/Pcs</span>
                <span class="font-bold text-gray-800 dark:text-gray-200">${context.getCurrentCurrency().symbol} ${context.formatCurrency(unitPrice)}</span>
            </div>

            <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
                <span class="font-medium text-gray-500 dark:text-gray-400">Quantity</span>
                <span class="font-bold text-gray-800 dark:text-gray-200">${customQty} pcs</span>
            </div>

            ${taxRow}
        </div>

        <div class="${context.getGlobalAgentMode() ? 'bg-green-600' : 'bg-blue-600'} text-white p-4 text-right">
            <div class="text-xl font-bold">
                Total for ${customQty} pcs: ${context.getCurrentCurrency().symbol} ${context.formatCurrency(finalTotal)}
            </div>
        </div>

        <a href="https://drive.google.com/drive/folders/1XJnaZAQjyNvDVJFtCojwHlNOgdEyBpk1?usp=sharing" target="_blank" 
           class="block bg-gray-500 hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 text-white text-center py-3 font-semibold transition-colors">
            Download Invitation Card Template
        </a>
    </div>
    `;

  const invoiceTextArea = document.getElementById('invCardInvoiceText');
  if (invoiceTextArea) {
    let invoiceText = 'Invitation Card\n';
    invoiceText += `Size : ${size}\n`;
    invoiceText += `Material : ${material}\n`;
    invoiceText += `Print : ${side} Side\n`;
    addonsTextList.forEach((line) => {
      invoiceText += `${line}\n`;
    });
    invoiceText += `Price Per/pc : ${context.getCurrentCurrency().symbol}${context.formatCurrency(unitPrice)}/pc\n`;
    invoiceText += `Qty : ${customQty} pcs\n`;
    if (context.getIsTaxEnabled()) {
      const taxAmt = subTotal * (context.getGlobalTaxPercent() / 100);
      invoiceText += `Tax (${context.getGlobalTaxPercent()}%): ${context.getCurrentCurrency().symbol}${context.formatCurrency(taxAmt)}\n`;
    }
    invoiceText += `Total Price : ${context.getCurrentCurrency().symbol}${context.formatCurrency(finalTotal)}`;
    invoiceTextArea.value = invoiceText;
  }
}

export function renderInvitationCardCalculator(container, context) {
  const data = context.getInvitationCardData();

  if (context.getSelectedInvCardMaterial() >= data.materials.length) {
    context.setSelectedInvCardMaterial(0);
  }

  const agentClass = context.getGlobalAgentMode() ? 'agent-active' : '';
  const selectedInvCardMaterial = context.getSelectedInvCardMaterial();
  const selectedInvCardAddons = context.getSelectedInvCardAddons();
  const defaultActiveQty = data.quantities.includes(100) ? 100 : (data.quantities[0] ?? null);
  const qtyButtons = data.quantities.map((qty) =>
    `<button class="btn size-btn ${agentClass} ${qty === defaultActiveQty ? 'active' : ''}" data-qty="${qty}">${qty} pcs</button>`
  ).join('');

  const defaultActiveSize = data.sizes.includes('A5') ? 'A5' : (data.sizes[0] ?? null);
  const sizeButtons = data.sizes.map((size) =>
    `<button class="btn size-btn ${agentClass} ${size === defaultActiveSize ? 'active' : ''}" data-size="${size}">${size}</button>`
  ).join('');

  const materialButtons = data.materials.map((material, index) =>
    `<button class="btn size-btn ${agentClass} ${index === selectedInvCardMaterial ? 'active' : ''}" data-value="${index}">${material.name}</button>`
  ).join('');

  const addonGroupsHTML = data.addons.map((addon, addonIndex) =>
    `<div class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
        <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">${addon.name}</label>
        <div class="size-btn-group" id="invCardAddonGroup${addonIndex}">
          ${addon.options.map((option, optionIndex) =>
            `<button class="btn size-btn ${agentClass} ${optionIndex === (selectedInvCardAddons[addonIndex] || 0) ? 'active' : ''}" data-addon-index="${addonIndex}" data-option-index="${optionIndex}">${option.name}</button>`
          ).join('')}
        </div>
    </div>`
  ).join('');

  const priceLayoutHTML = generateInvitationPriceListHTML(context, data);

  container.innerHTML = `
    <div class="calculator-panel mx-auto" style="max-width: 800px;">
        <h2 class="text-3xl font-bold mb-6 text-center invitation-card-title uppercase" style="margin-top: 0;">INVITATION CARD${context.getGlobalAgentMode() ? ' (Agent)' : ''}</h2>
        ${context.getGlobalToggleHTML('invitationCard')}
        
        <div class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm">
            <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Quantity</label>
            <div class="size-btn-group" id="invCardQtyBtns">${qtyButtons}</div>
            <p class="text-[5px] tracking-tight italic font-semibold text-gray-600 dark:text-gray-400 mt-2">*Notes : If it range 80pcs it will use price of 50pcs.</p>
            <div class="mt-4">
                <label for="invCardCustomQty" class="font-semibold text-sm text-gray-600 dark:text-gray-400">Custom Quantity:</label>
                <input type="number" id="invCardCustomQty" value="100" class="w-full max-w-xs p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" oninput="handleInvCardCustomQtyChange()">
            </div>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm">
            <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Size</label>
            <div class="size-btn-group" id="invCardSizeBtns">${sizeButtons}</div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
              <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Print Side</label>
              <div class="size-btn-group" id="invCardSideBtns"><button class="btn size-btn ${agentClass} active" data-side="1">1 Side</button><button class="btn size-btn ${agentClass}" data-side="2">2 Sides</button></div>
          </div>
          ${addonGroupsHTML}
        </div>

        <div class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-4 shadow-sm">
            <label class="font-bold mb-2 block text-gray-700 dark:text-gray-200">Material</label>
            <div class="size-btn-group" id="invCardMaterialGroup" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">${materialButtons}</div>
        </div>

        <div id="invCardInvoice"></div>

        <div style="margin-top: 12px;">
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <button id="addInvToPadBtn" class="btn" onclick="addInvitationCardToPad()" 
                    style="flex-grow: 1; width: auto; background-color: var(--success-color); color: white; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                    + Add to Pad
                </button>
                
                <button id="copyInvCardBtn" class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600" onclick="copyInvitationCardInvoiceText()" 
                    style="width: auto; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                    Copy
                </button>
            </div>
            
            <div class="invoice-copy-area" style="margin-top: 0;">
                <textarea id="invCardInvoiceText" readonly rows="8"
                    class="w-full font-mono text-sm border rounded-lg p-3 resize-y 
                     bg-[#e9ecef] text-[#495057] border-gray-300 
                     dark:bg-[#1f2937] dark:text-[#e5e7eb] dark:border-gray-600"
                ></textarea>
            </div>
        </div>

        ${priceLayoutHTML}


        <div class="mt-4 text-center">
            <button class="btn btn-primary" style="width: auto;" onclick="downloadElementAsJPG(event, 'invitation-card-price-list-container', 'invitation-card-price-list.jpg')">
                <i class="fas fa-download mr-2"></i> Download Price List (JPG)
            </button>
        </div>
    </div>`;

  attachInvitationListeners(context);
  kiraInvitationCard(context);
}
