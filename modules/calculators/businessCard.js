import { findHighestMatchingTier } from '../utils/pricing.js';
import { closeCompareModal, copyTextareaValue, openSyncedCompareModal } from '../utils/ui.js';

export function copyBusinessCardInvoiceText(context) {
  copyTextareaValue('bcInvoiceText', { showToast: context.showToast });
}

export function getBusinessCardPriceTier(context, customQty) {
  return findHighestMatchingTier(context.getBusinessCardData().quantities, customQty, (quantity) => quantity.qty);
}

export function handleBcCustomQtyChange(context) {
  const customQtyInput = document.getElementById('bcCustomQty');
  let customQty = parseInt(customQtyInput.value, 10);
  if (Number.isNaN(customQty) || customQty < 1) {
    customQty = 1;
  }

  const priceTierQty = getBusinessCardPriceTier(context, customQty);
  const qtyButtons = document.querySelectorAll('#bcQtyGroup .btn');
  qtyButtons.forEach((button) => {
    if (parseInt(button.dataset.value, 10) === priceTierQty) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });

  context.getSelectedBc().qty = customQty;
  kiraBusinessCard(context);
}

export function kiraBusinessCard(context) {
  const invoiceEl = document.getElementById('bcInvoice');
  const invoiceTextEl = document.getElementById('bcInvoiceText');
  if (!invoiceEl) return;

  const businessCardData = context.getBusinessCardData();
  const selectedBc = context.getSelectedBc();
  const qty = selectedBc.qty;
  const priceTierQty = getBusinessCardPriceTier(context, qty);
  const { materials, quantities } = businessCardData;
  const tierIndex = quantities.findIndex((quantity) => quantity.qty === priceTierQty);
  const addons = businessCardData.addons;
  const material = materials[selectedBc.material];
  const side = selectedBc.printSide;
  const p1Array = context.getGlobalAgentMode() ? material.prices.agentPrice.p1 : material.prices.customerPrice.p1;
  const p2Array = context.getGlobalAgentMode() ? material.prices.agentPrice.p2 : material.prices.customerPrice.p2;
  const matPrice = side === 1 ? p1Array[tierIndex] : p2Array[tierIndex];

  let addonPrice = 0;
  let addonHtmlRows = '';

  addons.forEach((addon, addonIndex) => {
    if (!selectedBc.selectedAddons[addonIndex] && selectedBc.selectedAddons[addonIndex] !== 0) {
      selectedBc.selectedAddons[addonIndex] = 0;
    }

    const option = addon.options[selectedBc.selectedAddons[addonIndex]];
    if (!option) return;

    addonPrice += context.getGlobalAgentMode() ? (option.agentPrice || 0) : (option.customerPrice || 0);
    if (selectedBc.selectedAddons[addonIndex] > 0) {
      addonHtmlRows += `
        <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
            <span class="font-medium text-gray-500 dark:text-gray-400">${addon.name}</span>
            <span class="font-bold text-gray-800 dark:text-gray-200">${option.name}</span>
        </div>`;
    }
  });

  const unitPrice = matPrice + addonPrice;
  const subTotal = qty * unitPrice;
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
                <span class="font-medium text-gray-500 dark:text-gray-400">Material</span>
                <span class="font-bold text-gray-800 dark:text-gray-200 text-right">${material.name}</span>
            </div>
            
            <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
                <span class="font-medium text-gray-500 dark:text-gray-400">Print Side</span>
                <span class="font-bold text-gray-800 dark:text-gray-200">${side} Side</span>
            </div>

            ${addonHtmlRows}

            <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
                <span class="font-medium text-gray-500 dark:text-gray-400">Price Per Box (Tier: ${priceTierQty})</span>
                <span class="font-bold text-gray-800 dark:text-gray-200">${context.getCurrentCurrency().symbol} ${context.formatCurrency(unitPrice)}</span>
            </div>

            <div class="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 text-base">
                <span class="font-medium text-gray-500 dark:text-gray-400">Quantity</span>
                <span class="font-bold text-gray-800 dark:text-gray-200">${qty} Box${qty > 1 ? 'es' : ''}</span>
            </div>

            ${taxRow}
        </div>

        <div class="${context.getGlobalAgentMode() ? 'bg-green-600' : 'bg-blue-600'} text-white p-4 text-right">
            <div class="text-xl font-bold">
                Total for ${qty} Box${qty > 1 ? 'es' : ''}: ${context.getCurrentCurrency().symbol} ${context.formatCurrency(finalTotal)}
            </div>
        </div>

        <a href="https://drive.google.com/drive/folders/1i_tgc97MS-UtGqVr1Iew2pSG2uU63HSJ?usp=sharing" target="_blank" 
           class="block bg-gray-500 hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 text-white text-center py-3 font-semibold transition-colors">
            Download Business Card Template
        </a>
    </div>
    `;

  if (invoiceTextEl) {
    const customDetails = [];
    customDetails.push(`Material : ${material.name}`);
    customDetails.push(`Print : ${side} Side`);

    addons.forEach((addon, addonIndex) => {
      if (selectedBc.selectedAddons[addonIndex] > 0) {
        const option = addon.options[selectedBc.selectedAddons[addonIndex]];
        if (option) customDetails.push(`${addon.name} : ${option.name}`);
      }
    });

    invoiceTextEl.value = context.generateUniversalInvoice('Business Card', customDetails, unitPrice, qty);
  }
}

export function addBusinessCardToPad(context) {
  const businessCardData = context.getBusinessCardData();
  const selectedBc = context.getSelectedBc();
  const qty = selectedBc.qty;
  const priceTierQty = getBusinessCardPriceTier(context, qty);
  const { materials, quantities } = businessCardData;
  const tierIndex = quantities.findIndex((quantity) => quantity.qty === priceTierQty);
  const addons = businessCardData.addons;
  const material = materials[selectedBc.material];
  const side = selectedBc.printSide;

  const p1Array = context.getGlobalAgentMode() ? material.prices.agentPrice.p1 : material.prices.customerPrice.p1;
  const p2Array = context.getGlobalAgentMode() ? material.prices.agentPrice.p2 : material.prices.customerPrice.p2;
  const matPrice = side === 1 ? p1Array[tierIndex] : p2Array[tierIndex];
  let addonPrice = 0;
  const finishingDetails = [];

  const laminationOption = addons[0]?.options[selectedBc.selectedAddons[0]];
  if (selectedBc.selectedAddons[0] > 0 && laminationOption) {
    addonPrice += context.getGlobalAgentMode() ? laminationOption.agentPrice : laminationOption.customerPrice;
    finishingDetails.push(`Finishing: ${laminationOption.name}`);
  }

  const roundCornerOption = addons[1]?.options[selectedBc.selectedAddons[1]];
  if (selectedBc.selectedAddons[1] > 0 && roundCornerOption) {
    addonPrice += context.getGlobalAgentMode() ? roundCornerOption.agentPrice : roundCornerOption.customerPrice;
    finishingDetails.push(`Corner: ${roundCornerOption.name}`);
  }

  const spotUvOption = addons[2]?.options[selectedBc.selectedAddons[2]];
  if (selectedBc.selectedAddons[2] > 0 && spotUvOption) {
    addonPrice += context.getGlobalAgentMode() ? spotUvOption.agentPrice : spotUvOption.customerPrice;
    finishingDetails.push(`Spot UV: ${spotUvOption.name}`);
  }

  const unitPrice = matPrice + addonPrice;
  const finishingStr = finishingDetails.length > 0 ? finishingDetails.join(', ') : 'None';

  context.addItemToQuotePad({
    type: 'calculator',
    title: 'Business Card',
    name: `Business Card (${material.name})`,
    unitPrice,
    quantity: qty,
    details: {
      size: 'Standard (90mm x 54mm)',
      material: `Material: ${material.name}`,
      finishing: `Print: ${side} Side\n${finishingStr}`,
    },
  });
}

export function generateBusinessCardPriceListHTML(context, data, forceAgent = null, compact = false, showHeader = true) {
  const { quantities, materials, addons } = data;
  const useAgent = forceAgent !== null ? forceAgent : context.getGlobalAgentMode();

  const basePriceRows = materials.map((material) => {
    const p1Array = useAgent ? material.prices.agentPrice.p1 : material.prices.customerPrice.p1;
    const p2Array = useAgent ? material.prices.agentPrice.p2 : material.prices.customerPrice.p2;
    return `
        <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="p-3 text-left text-gray-800 dark:text-gray-200 font-semibold">${material.name}</td>
            ${quantities.map((quantity, index) => `
                <td class="p-3 text-gray-600 dark:text-gray-400">${context.formatCurrency(p1Array[index] || 0)}</td>
                <td class="p-3 text-gray-600 dark:text-gray-400">${context.formatCurrency(p2Array[index] || 0)}</td>
            `).join('')}
        </tr>
    `;
  }).join('');

  let addonsPriceHTML = '';
  addons.forEach((addon) => {
    const rows = addon.options.map((option) => {
      const displayCost = useAgent ? option.agentPrice : option.customerPrice;
      const displayPrice = displayCost > 0 ? `+ ${context.formatCurrency(displayCost)}` : context.formatCurrency(0);
      const displayName = option.name || option.label;
      return `
            <tr class="border-b border-gray-200 dark:border-gray-600 last:border-0 h-12">
                <td class="p-2 text-gray-600 dark:text-gray-400 text-left text-sm align-middle font-semibold w-2/3">${displayName}</td>
                <td class="p-2 text-gray-600 dark:text-gray-400 text-right text-sm align-middle whitespace-nowrap w-1/3">
                    ${displayPrice}
                </td>
            </tr>`;
    }).join('');

    addonsPriceHTML += `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-500 shadow-sm dark:shadow-none">
                <h4 class="bg-green-600 text-white p-2 text-center font-bold text-sm uppercase">${addon.name}</h4>
              <table class="w-full border-collapse"><tbody>${rows}</tbody></table>
            </div>`;
  });

  return `
        <div id="bc-price-list-container" class="bg-white dark:bg-gray-800 p-6 rounded-lg mt-8 border border-gray-200 dark:border-gray-700 shadow-sm">
            ${showHeader ? `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
              <h2 class="font-extrabold text-3xl tracking-wide business-card-title" style="margin: 0; flex: 1;">BUSINESS CARD PRICE LIST${useAgent ? ' (Agent)' : ''}</h2>
              <button onclick="openBusinessCardCompareModal()" style="
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
            </div>` : ''}
            
            <h3 class="bg-green-600 text-white p-2 rounded-md text-center font-bold text-base mb-4">PRICE PER BOX (RM)</h3>
            <div class="overflow-x-auto mb-8">
                <table class="w-full border-collapse text-sm text-center">
                    <thead class="bg-green-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                        <tr>
                            <th class="p-3 text-left font-semibold border-b-2 border-green-600 dark:border-green-500">MATERIAL</th>
                            ${quantities.map((quantity) => `<th colspan="2" class="p-3 font-semibold border-b-2 border-green-600 dark:border-green-500">${quantity.label}</th>`).join('')}
                        </tr>
                        <tr>
                            <th class="p-2 text-left font-medium"></th>
                            ${quantities.map(() => '<th class="p-2 font-medium">1 Side</th><th class="p-2 font-medium">2 Side</th>').join('')}
                        </tr>
                    </thead>
                    <tbody class="bg-white dark:bg-gray-800">
                        ${basePriceRows}
                    </tbody>
                </table>
            </div>

            <h3 class="text-center font-bold text-xl text-gray-700 dark:text-white mb-4 border-t dark:border-gray-600 pt-4">ADD-ONS & FINISHING</h3>
            <div class="grid gap-6 ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}">
                ${addonsPriceHTML}
            </div>
        </div>
    `;
}

export function openBusinessCardCompareModal(context) {
  const businessCardData = context.getBusinessCardData();

  openSyncedCompareModal({
    modalId: 'businessCardCompareModal',
    customerPanelId: 'bcCompareCustPanel',
    agentPanelId: 'bcCompareAgentPanel',
    customerScrollId: 'bcCompareCustScroll',
    agentScrollId: 'bcCompareAgentScroll',
    renderCustomer: () => generateBusinessCardPriceListHTML(context, businessCardData, false, true, false),
    renderAgent: () => generateBusinessCardPriceListHTML(context, businessCardData, true, true, false),
    onMissing: () => context.showToast('Compare modal not found. Please refresh the page.', 'error'),
  });
}

export function closeBusinessCardCompareModal() {
  closeCompareModal('businessCardCompareModal');
}

export function attachBusinessCardListeners(context) {
  const addGroupListener = (id, callback) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
          element.querySelectorAll('button').forEach((button) => button.classList.remove('active'));
          event.target.classList.add('active');
          callback(event.target);
          kiraBusinessCard(context);
        }
      });
    }
  };

  addGroupListener('bcQtyGroup', (target) => {
    context.getSelectedBc().qty = parseInt(target.dataset.value, 10);
    document.getElementById('bcCustomQty').value = context.getSelectedBc().qty;
  });

  addGroupListener('bcSideGroup', (target) => {
    context.getSelectedBc().printSide = parseInt(target.dataset.value, 10);
  });

  addGroupListener('bcMaterialGroup', (target) => {
    context.getSelectedBc().material = parseInt(target.dataset.value, 10);
  });

  context.getBusinessCardData().addons.forEach((_, addonIndex) => {
    addGroupListener(`bcAddonGroup${addonIndex}`, (target) => {
      context.getSelectedBc().selectedAddons[addonIndex] = parseInt(target.dataset.optionIndex, 10);
    });
  });
}

export function renderBusinessCardPage(container, context) {
  const businessCardData = context.getBusinessCardData();
  const { quantities, materials, addons, printSides } = businessCardData;
  const selectedBc = context.getSelectedBc();

  while (selectedBc.selectedAddons.length < addons.length) {
    selectedBc.selectedAddons.push(0);
  }
  if (selectedBc.selectedAddons.length > addons.length) {
    selectedBc.selectedAddons = selectedBc.selectedAddons.slice(0, addons.length);
  }

  const boxStyle = 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm h-auto';
  const labelStyle = 'font-bold mb-2 block text-gray-700 dark:text-gray-200';
  const agentClass = context.getGlobalAgentMode() ? 'agent-active' : '';

  const qtyButtons = quantities.map((quantity) =>
    `<button class="btn size-btn ${quantity.qty === selectedBc.qty ? 'active' : ''} ${agentClass}" data-value="${quantity.qty}">${quantity.label}</button>`
  ).join('');

  const materialButtons = materials.map((material, index) =>
    `<button class="btn size-btn ${index === selectedBc.material ? 'active' : ''} ${agentClass}" data-value="${index}">${material.name}</button>`
  ).join('');

  const sideButtons = printSides.map((side) =>
    `<button class="btn size-btn ${side.value === selectedBc.printSide ? 'active' : ''} ${agentClass}" data-value="${side.value}">${side.label}</button>`
  ).join('');

  const addonBoxes = addons.map((addon, addonIndex) => {
    const buttons = addon.options.map((option, optionIndex) =>
      `<button class="btn size-btn ${optionIndex === selectedBc.selectedAddons[addonIndex] ? 'active' : ''} ${agentClass}" data-addon-index="${addonIndex}" data-option-index="${optionIndex}">${option.name || option.label}</button>`
    ).join('');
    return `<div class="${boxStyle}"><label class="${labelStyle}">${addon.name}</label><div class="size-btn-group" id="bcAddonGroup${addonIndex}">${buttons}</div></div>`;
  });

  const additionalAddonRows = addonBoxes.length > 1 ? addonBoxes.slice(1).reduce((html, addonBox, index, rest) => {
    if (index % 2 === 0) {
      const nextAddonBox = rest[index + 1] || '';
      return `${html}<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">${addonBox}${nextAddonBox}</div>`;
    }
    return html;
  }, '') : '';

  const priceLayoutHTML = generateBusinessCardPriceListHTML(context, businessCardData);

  container.innerHTML = `
    <div class="calculator-panel mx-auto" style="max-width: 800px;">
        <h2 class="text-3xl font-bold mb-6 text-center business-card-title uppercase" style="margin-top: 0;">BUSINESS CARD${context.getGlobalAgentMode() ? ' (Agent)' : ''}</h2>
        ${context.getGlobalToggleHTML('businessCard')}
        
        <div class="${boxStyle} mb-4">
            <label class="${labelStyle}">Quantity</label>
            <div class="size-btn-group" id="bcQtyGroup">${qtyButtons}</div>
            <p class="text-[5px] tracking-tight italic font-semibold text-gray-600 dark:text-gray-400 mt-2">*Notes : If it range 3 Box it will use price of 2 Box.</p>
            <div class="mt-4">
                <label for="bcCustomQty" class="font-semibold text-sm text-gray-600 dark:text-gray-400">Custom Quantity (Boxes):</label>
                <input type="number" id="bcCustomQty" value="${selectedBc.qty}" class="w-full max-w-xs p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" oninput="handleBcCustomQtyChange()">
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="${boxStyle}">
                <label class="${labelStyle}">Print Side</label>
                <div class="size-btn-group" id="bcSideGroup">${sideButtons}</div>
            </div>
            ${addonBoxes.length > 0 ? addonBoxes[0] : ''}
        </div>

        ${additionalAddonRows}
        
        <div class="${boxStyle} mb-4">
            <label class="${labelStyle}">Material</label>
            <div class="size-btn-group" id="bcMaterialGroup" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">${materialButtons}</div>
        </div>
        
        <div id="bcInvoice"></div>

        <div style="margin-top: 12px;">
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <button id="addBcToPadBtn" class="btn" onclick="addBusinessCardToPad()" 
                    style="flex-grow: 1; width: auto; background-color: var(--success-color); color: white; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                    + Add to Pad
                </button>
                
                <button id="copyBcBtn" class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600" onclick="copyBusinessCardInvoiceText()" 
                    style="width: auto; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                    Copy
                </button>
            </div>
            
            <div class="invoice-copy-area" style="margin-top: 0;">
                <textarea id="bcInvoiceText" readonly rows="7"
                    class="w-full font-mono text-sm border rounded-lg p-3 resize-y 
                     bg-[#e9ecef] text-[#495057] border-gray-300 
                     dark:bg-[#1f2937] dark:text-[#e5e7eb] dark:border-gray-600"
                ></textarea>
            </div>
        </div>

        ${priceLayoutHTML}
        
        <div class="mt-4 text-center">
            <button class="btn btn-primary" style="width: auto;" onclick="downloadElementAsJPG(event, 'bc-price-list-container', 'business-card-price-list.jpg')">
            <i class="fas fa-download mr-2"></i> Download Price List (JPG)
            </button>
        </div>
    </div>`;

  attachBusinessCardListeners(context);
  kiraBusinessCard(context);
}