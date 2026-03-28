import { closeCompareModal, openSyncedCompareModal } from '../utils/ui.js';

function getValue(getter) {
  return typeof getter === 'function' ? getter() : getter;
}

export function addStandToQuotePad(context) {
  const selectedMaterialIndex = context.getSelectedMaterialIndex();
  if (selectedMaterialIndex === null) return;

  const stands = context.getStands();
  const stand = stands[selectedMaterialIndex];
  const qty = Math.max(1, parseInt(document.getElementById('standQty')?.value) || 1);
  const unitPrice = context.getGlobalAgentMode() ? stand.agentPrice : stand.customerPrice;

  context.addItemToQuotePad({
    type: 'calculator',
    title: stand.name,
    name: stand.name,
    unitPrice,
    quantity: qty,
    details: {
      size: 'Standard Size',
      material: `Type : ${stand.name}`,
      finishing: ''
    }
  });
}

export function generateStandPriceListHTML(context, forceAgent = null, includeDownload = true, includeCompareBtn = true, containerId = 'stand-price-list-container', showHeader = true) {
  const stands = context.getStands();
  const useAgent = forceAgent !== null ? forceAgent : context.getGlobalAgentMode();
  const currentCurrency = context.getCurrentCurrency();
  const mainTitleColor = useAgent ? 'text-green-600 dark:text-green-500' : 'text-gray-800 dark:text-white';
  const titleText = useAgent ? 'STAND PRICE LIST (AGENT)' : 'STAND PRICE LIST (CUSTOMER)';
  const themeColor = useAgent ? '#16a34a' : '#8b5cf6';

  let html = `
  <div id="${containerId}" class="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-lg border border-gray-200 dark:border-gray-700 mt-8">
        ${showHeader ? `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; gap: 16px;">
          <h2 class="font-extrabold text-3xl tracking-wide ${mainTitleColor}" style="margin: 0; flex: 1;">${titleText}</h2>
          ${includeCompareBtn ? `<button onclick="openStandCompareModal()" style="
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
          " class="hover:opacity-80" title="Compare Customer vs Agent Prices"><i class="fas fa-columns"></i></button>` : ''}
        </div>` : ''}
        <div class="overflow-x-auto rounded-lg border" style="border-color: ${themeColor};">
            <table class="w-full border-collapse text-sm text-center">
                <thead style="background-color: ${themeColor}; color: white;">
                    <tr>
                        <th class="p-3 text-left font-semibold">STAND NAME</th>
                        <th class="p-3 text-right font-semibold">PRICE</th>
                    </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-800">`;

  stands.forEach((stand) => {
    const price = useAgent ? stand.agentPrice : stand.customerPrice;
    html += `
            <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="p-3 text-left text-gray-800 dark:text-gray-200 font-semibold">${stand.name}</td>
                <td class="p-3 text-right text-gray-600 dark:text-gray-400">${currentCurrency.symbol} ${context.formatCurrency(price)}</td>
            </tr>`;
  });

  html += `
                </tbody>
            </table>
        </div>`;

  if (includeDownload) {
    html += `
    <div class="mt-4 text-center">
        <button class="btn btn-primary" style="width: auto;" onclick="downloadElementAsJPG(event, '${containerId}', 'stand-price-list.jpg')">
            <i class="fas fa-download mr-2"></i> Download Price List (JPG)
        </button>
    </div>`;
  }

  html += `
  </div>`;

  return html;
}

export function openStandCompareModal(context) {
  openSyncedCompareModal({
    modalId: 'standCompareModal',
    customerPanelId: 'standCompareCustPanel',
    agentPanelId: 'standCompareAgentPanel',
    customerScrollId: 'standCompareCustScroll',
    agentScrollId: 'standCompareAgentScroll',
    renderCustomer: () => generateStandPriceListHTML(context, false, false, false, 'stand-compare-cust-price-list-container', false),
    renderAgent: () => generateStandPriceListHTML(context, true, false, false, 'stand-compare-agent-price-list-container', false),
    onMissing: () => context.showToast('Compare modal not found. Please refresh the page.', 'error'),
  });
}

export function closeStandCompareModal() {
  closeCompareModal('standCompareModal');
}

export function selectStand(index, context) {
  const grid = document.querySelector('.material-grid-container');
  if (grid) {
    context.setStandScrollPos(grid.scrollTop);
  }

  context.setSelectedMaterialIndex(index);
  const contentArea = document.getElementById('contentArea');
  if (contentArea) {
    renderStandGrid(contentArea, context);
  }
}

export function renderStandGrid(container, context) {
  const stands = context.getStands();
  const selectedMaterialIndex = context.getSelectedMaterialIndex();
  const globalAgentMode = context.getGlobalAgentMode();
  const currentCurrency = context.getCurrentCurrency();
  const standScrollPos = context.getStandScrollPos();
  let html = `
            <h2 class="w-[75%] max-w-[1100px] mx-auto text-center text-2xl font-bold mb-6">
                Stands - Select Type
            </h2>
            ${context.getGlobalToggleHTML('stand')} 
            <div class="material-grid-container"> 
                <div class='material-grid' id='stand-grid' style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));">
        `;

  stands.forEach((stand, index) => {
    const displayPrice = globalAgentMode ? stand.agentPrice : stand.customerPrice;
    const isActive = index === selectedMaterialIndex ? ' active' : '';
    const agentActive = globalAgentMode ? ' agent-active' : '';

    html += `
              <div class='material-card${isActive}${agentActive}' data-action="select-stand" data-index="${index}">
                <div class='material-info'>
                  <strong>${stand.name}</strong>
                  <span>${currentCurrency.symbol} ${context.formatCurrency(displayPrice)}</span>
                </div>
              </div>
            `;
  });
  html += '</div></div>';

  if (selectedMaterialIndex !== null) {
    const stand = stands[selectedMaterialIndex];
    const subTotal = globalAgentMode ? stand.agentPrice : stand.customerPrice;

    let resultHTML = `<strong>Selected: ${stand.name}</strong><br>`;
    let finalTotal = subTotal;

    if (context.getIsTaxEnabled()) {
      const taxAmount = subTotal * (context.getGlobalTaxPercent() / 100);
      finalTotal += taxAmount;
      resultHTML += `Total Not Include Tax: ${currentCurrency.symbol} ${context.formatCurrency(subTotal)}<br>`;
      resultHTML += `Tax (${context.getGlobalTaxPercent()}%): ${currentCurrency.symbol} ${context.formatCurrency(taxAmount)}<br><br>`;
    }

    const totalColor = globalAgentMode ? 'var(--success-color)' : 'var(--primary-color)';
    resultHTML += `<strong style="color: ${totalColor}; font-size: 22px;">Total Price: ${currentCurrency.symbol} ${context.formatCurrency(finalTotal)}</strong>`;

    const invoiceText = context.generateUniversalInvoice(
      stand.name,
      [`Type : ${stand.name}`],
      subTotal,
      1,
      { showQty: false, showTotal: false, unitLabel: '' }
    );

    html += `
              <div class="calculator-panel">
                <div>
                  <label>Quantity:</label>
                  <input type='number' id='standQty' value='1' min='1' oninput='updateStandQty()' />
                  <input type="hidden" id="standName" value="${stand.name}">
                  <input type="hidden" id="standPrice" value="${subTotal}">
                </div>
                <div class='result' id='result'>${resultHTML}</div>
                
                <div style="margin-top: 12px;">
                    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <button id="addStandToPadBtn" class="btn" onclick="addStandToQuotePad()" 
                            style="flex-grow: 1; width: auto; background-color: var(--success-color); color: white; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                            + Add to Pad
                        </button>
                        
                        <button id="copyStandBtn" class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600" onclick="copyInvoiceText()" 
                            style="width: auto; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                            Copy
                        </button>
                    </div>
                    
                    <div class="invoice-copy-area" style="margin-top: 0;">
                        <textarea id="invoiceText" readonly rows="4"
                            class="w-full font-mono text-sm border rounded-lg p-3 resize-y 
                             bg-[#e9ecef] text-[#495057] border-gray-300 
                             dark:bg-[#1f2937] dark:text-[#e5e7eb] dark:border-gray-600"
                        >${invoiceText}</textarea>
                    </div>
                </div>
                ${generateStandPriceListHTML(context)}
              </div>
            `;
  }

  container.innerHTML = html;
  context.attachGridListeners(container);

  const gridContainer = document.querySelector('.material-grid-container');
  if (gridContainer) {
    gridContainer.scrollTop = standScrollPos;
    setTimeout(() => {
      const refound = document.querySelector('.material-grid-container');
      if (refound) {
        refound.scrollTop = standScrollPos;
      }
    }, 0);
  }
}

export function updateStandQty(context) {
  const standName = document.getElementById('standName')?.value;
  const standPrice = parseFloat(document.getElementById('standPrice')?.value);
  const qtyInput = document.getElementById('standQty');
  const resultEl = document.getElementById('result');
  const textArea = document.getElementById('invoiceText');

  if (!qtyInput || !resultEl || !textArea) return;

  const qty = Math.max(1, parseInt(qtyInput.value) || 1);
  const globalAgentMode = context.getGlobalAgentMode();
  const currentCurrency = context.getCurrentCurrency();
  const totalColor = globalAgentMode ? 'var(--success-color)' : 'var(--primary-color)';

  let subTotal = standPrice * qty;
  let resultHTML = `<strong>Selected: ${standName}</strong><br>`;

  if (context.getIsTaxEnabled()) {
    const taxAmount = subTotal * (context.getGlobalTaxPercent() / 100);
    const withTax = subTotal + taxAmount;
    resultHTML += `Total Not Include Tax: ${currentCurrency.symbol} ${context.formatCurrency(subTotal)}<br>`;
    resultHTML += `Tax (${context.getGlobalTaxPercent()}%): ${currentCurrency.symbol} ${context.formatCurrency(taxAmount)}<br><br>`;
    subTotal = withTax;
  }

  resultHTML += `<strong style="color: ${totalColor}; font-size: 22px;">Total Price: ${currentCurrency.symbol} ${context.formatCurrency(subTotal)}</strong>`;
  resultEl.innerHTML = resultHTML;

  textArea.value = context.generateUniversalInvoice(
    standName,
    [`Type : ${standName}`],
    standPrice,
    qty,
    { showQty: qty > 1, showTotal: qty > 1, unitLabel: '' }
  );
}

export function openStandPage(container, deps = {}) {
  if (typeof deps.setStandScrollPos === 'function') {
    deps.setStandScrollPos(0);
  }

  if (typeof deps.renderStandGrid === 'function') {
    deps.renderStandGrid(container);
  }
}
