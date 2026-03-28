// modules/calculators/sublimationSettings.js
// Sublimation settings panel functions — extracted from app.js
// Uses init(ctx) pattern: call initSublimationSettings(ctx) once at app start.

import { saveSettingsScrolls, restoreSettingsScrolls } from '../utils/ui.js';

let _ctx = null;

export function initSublimationSettings(ctx) {
  _ctx = ctx;
}

export function renderSublimationSettingsTable() {
  let html = '';
  const isBaseEditing = _ctx.getEditState().base;
  const isExtraSizeEditing = _ctx.getEditState().extraSize;
  // --- Base Prices Section ---
  html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h4 style="margin:0 0 4px 0;">Base Prices (Per Piece)</h4>
            <p style="margin:0; font-size: 13px; color: #9ca3af;">Manage base prices for different print sides and quantities.</p>
          </div>
          <div style="display:flex; gap:8px;">
            ${isBaseEditing ? `
                <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="addRemoveSublimationQuantity('add')">+ Add Qty Tier</button>
                <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="toggleSublimationEditMode('base', false)">Cancel</button>
                <button class="btn btn-sm btn-primary" style="width: auto; margin-top:0; padding: 8px 14px; font-size: 13px;" onclick="saveSublimationSettings('base')">Done</button>
            ` : `
                <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="toggleSublimationEditMode('base', true)">Edit</button>
            `}
          </div>
        </div>`;
  html += `<table class="settings-table" style="table-layout: fixed; width: 100%;">
          <thead><tr><th style="width: 35%;">Qty</th><th style="width: 10%;">Type</th><th style="width: 40%;">Price</th>${isBaseEditing ? '<th class="text-center" style="width: 15%;">Actions</th>' : ''}</tr></thead>
          <tbody>
            ${_ctx.getData().basePrices.map((tier, index) => {
    const custPrice = tier.customerPrice || 0;
    const agentPrice = tier.agentPrice !== undefined ? tier.agentPrice : tier.customerPrice;
    // Customer row
    const rowCust = `
                    <tr data-sublimation-base-price="${index}">
                        <td rowspan="2">${isBaseEditing ? `<input type="text" value="${tier.qty}" data-index="${index}" data-field="qty" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align:center;">` : `<strong>${tier.qty} pcs</strong>`}</td>
                        <td style="background: rgba(0,0,0,0.05); font-weight: 600; font-size: 11px;">Cust</td>
                        <td style="background: rgba(0,0,0,0.05);">${isBaseEditing ? `<input type="number" step="0.01" value="${custPrice.toFixed(2)}" data-index="${index}" data-field="customerPrice" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align:center;">` : _ctx.formatCurrency(custPrice)}</td>
                        ${isBaseEditing ? `<td rowspan="2" style="padding:4px; white-space:nowrap; vertical-align: middle;">
                          <div style="display: flex; justify-content: center; align-items: center; gap: 4px;">
                            <button class="btn btn-sm btn-secondary" style="padding:7px 10px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveSublimationBasePriceUp(${index})"><i class="fas fa-arrow-up"></i></button>
                            <button class="btn btn-sm btn-secondary" style="padding:7px 10px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveSublimationBasePriceDown(${index})"><i class="fas fa-arrow-down"></i></button>
                            <button class="btn btn-sm btn-danger" style="padding:7px 10px; border-radius:6px;" onclick="removeSublimationBasePriceByIndex(${index})"><i class="fas fa-trash"></i></button>
                          </div>
                        </td>` : ''}
                    </tr>`;
    // Agent row
    const rowAgent = `
                    <tr data-sublimation-base-price="${index}">
                        <td style="background: rgba(0,255,0,0.05); font-weight: 600; font-size: 11px;">Agent</td>
                        <td style="background: rgba(0,255,0,0.05);">${isBaseEditing ? `<input type="number" step="0.01" value="${agentPrice.toFixed(2)}" data-index="${index}" data-field="agentPrice" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align:center;">` : _ctx.formatCurrency(agentPrice)}</td>
                    </tr>`;
    return rowCust + rowAgent;
  }).join('')}
          </tbody>
        </table>`;
  // --- Extra Size Cost Section ---
  html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; border-top: 2px solid var(--border-color); padding-top: 24px; margin-bottom: 16px;">
          <div>
            <h4 style="margin:0 0 4px 0;">Extra Size Costs</h4>
            <p style="margin:0; font-size: 13px; color: #9ca3af;">Manage additional costs for specific sizes.</p>
          </div>
          <div style="display:flex; gap:8px;">
             ${isExtraSizeEditing ? `
                <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="addRemoveSublimationSize('add')">+ Add Size</button>
                <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="toggleSublimationEditMode('extraSize', false)">Cancel</button>
                <button class="btn btn-sm btn-primary" style="width: auto; margin-top:0; padding: 8px 14px; font-size: 13px;" onclick="saveSublimationSettings('extraSize')">Done</button>
            ` : `
                <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="toggleSublimationEditMode('extraSize', true)">Edit</button>
            `}
          </div>
        </div>`;
  html += `<table class="settings-table" style="table-layout: fixed; width: 100%;">
            <thead><tr><th style="width: 35%;">Size</th><th style="width: 10%;">Type</th><th style="width: 40%;">Additional Cost</th>${isExtraSizeEditing ? '<th class="text-center" style="width: 15%;">Actions</th>' : ''}</tr></thead>
            <tbody>
                ${Object.keys(_ctx.getData().extraSizeCost).map((size, sizeIndex) => {
    const custCost = _ctx.getSublimationSizeCost(size, sublimationData, false);
    const agentCost = _ctx.getSublimationSizeCost(size, sublimationData, true);
    // Customer row
    const rowCust = `
                    <tr data-sublimation-size="${sizeIndex}">
                        <td rowspan="2">${isExtraSizeEditing ? `<input type="text" value="${size}" data-old-size="${size}" data-size-index="${sizeIndex}" data-field="sizeName" class="form-control" ${size === 'XS-2XL' ? 'readonly title="XS-2XL is the base size and cannot be renamed." style="background-color: #1f2937; border: 1px solid #4b5563; color: #9ca3af; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align:center; cursor:not-allowed;"' : 'style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align:center;"'}>` : `<strong>${size}</strong>`}</td>
                        <td style="background: rgba(0,0,0,0.05); font-weight: 600; font-size: 11px;">Cust</td>
                        <td style="background: rgba(0,0,0,0.05);">${isExtraSizeEditing ? `<input type="number" step="0.01" value="${custCost.toFixed(2)}" data-size="${size}" data-field="cost" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align:center;">` : `+ ${_ctx.formatCurrency(custCost)}`}</td>
                        ${isExtraSizeEditing ? `<td rowspan="2" style="padding:4px; white-space:nowrap; vertical-align: middle;">
                          <div style="display: flex; justify-content: center; align-items: center; gap: 4px;">
                            <button class="btn btn-sm btn-secondary" style="padding:7px 10px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveSublimationSizeUp(${sizeIndex})"><i class="fas fa-arrow-up"></i></button>
                            <button class="btn btn-sm btn-secondary" style="padding:7px 10px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveSublimationSizeDown(${sizeIndex})"><i class="fas fa-arrow-down"></i></button>
                            ${size === 'XS-2XL' ? `<button class="btn btn-sm btn-secondary" style="padding:7px 10px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:#6b7280; cursor:not-allowed;" disabled title="XS-2XL cannot be removed"><i class="fas fa-lock"></i></button>` : `<button class="btn btn-sm btn-danger" style="padding:7px 10px; border-radius:6px;" onclick="removeSublimationSizeByIndex(${sizeIndex})"><i class="fas fa-trash"></i></button>`}
                          </div>
                        </td>` : ''}
                    </tr>`;
    // Agent row
    const rowAgent = `
                    <tr data-sublimation-size="${sizeIndex}">
                        <td style="background: rgba(0,255,0,0.05); font-weight: 600; font-size: 11px;">Agent</td>
                        <td style="background: rgba(0,255,0,0.05);">${isExtraSizeEditing ? `<input type="number" step="0.01" value="${agentCost.toFixed(2)}" data-size="${size}" data-field="agentPrice" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align:center;">` : `+ ${_ctx.formatCurrency(agentCost)}`}</td>
                    </tr>`;
    return rowCust + rowAgent;
  }).join('')}
            </tbody>
        </table>`;
  // --- Addons Section ---
  html += `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; border-top: 2px solid var(--border-color); padding-top: 24px;">
                <div>
                  <h4 style="margin:0 0 4px 0;">Finishing Add-ons</h4>
                  <p style="margin:0; font-size: 13px; color: #9ca3af;">Manage available finishing options for sublimation products.</p>
                </div>
        </div>
          <div style="border: 1px dashed #4b5563; border-radius: 10px; padding: 24px; margin-top: 16px; margin-bottom: 16px; text-align: center;">
              <button class="btn btn-primary" style="width:auto; margin:0 0 10px 0; padding: 10px 24px; font-size: 14px; display:inline-flex; align-items:center; gap:8px;" onclick="addRemoveSublimationAddonType('add')">
                <i class="fas fa-plus-circle"></i> Create New Add-on Group
              </button>
              <p style="margin:0; font-size: 12px; color:#6b7280;">Click here to create a new category of add-ons (e.g., "Lamination", "Size") which will appear as a new table below.</p>
          </div>`;

  const addonsArr = _ctx.getData().addons;
  addonsArr.forEach((addon, addonIndex) => {
    const isAddonEditing = _ctx.getEditState().addons[addonIndex];
    const addonType = addon.type || 'radio';
    const addonShowIcon = addon.showIcon !== false;
    const isRulesOpen = !!_ctx.getEditState().addonsRulesOpen[addonIndex];
    html += `<div class="settings-panel" style="margin-top: 16px; padding: 20px; border: 1px solid ${isAddonEditing ? '#22c55e' : 'var(--accent-color)'}; border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${isAddonEditing && isRulesOpen ? '8px' : '16px'}; gap: 12px;">
              ${isAddonEditing
        ? `<input type="text" value="${addon.name}" id="subAddonNameInput_${addonIndex}" class="form-control" style="background-color: #f3f4f6; border: 1px solid #d1d5db; color: #1f2937; border-radius: 6px; padding: 8px 12px; font-size: 16px; font-weight: 600; max-width: 280px;">`
        : `<h5 style="margin:0; font-size:16px; font-weight:600;">${addon.name}</h5>`}
              <div class="action-buttons" style="display:flex; gap:8px; flex-shrink:0;">
                ${isAddonEditing
        ? `<button class="btn btn-sm btn-secondary" style="padding: 7px 12px; font-size:13px;${isRulesOpen ? ' background:#3b82f6; border-color:#3b82f6; color:white;' : ''}" onclick="toggleSubAddonRulesPanel(${addonIndex})">Add Rules</button>
                     <button class="btn btn-sm btn-secondary" style="padding: 7px 12px; font-size:13px;" onclick="addRemoveSublimationAddonOption('add', ${addonIndex})">+ Add Option</button>
                     <button class="btn btn-sm btn-danger" style="padding: 7px 12px; font-size:13px;" onclick="addRemoveSublimationAddonType('remove', ${addonIndex})">Delete Type</button>
                     <button class="btn btn-sm btn-secondary" style="padding: 7px 12px; font-size:13px;" onclick="toggleSublimationEditMode('addons', false, ${addonIndex})">Cancel</button>
                     <button class="btn btn-sm btn-primary" style="width:auto; margin-top:0; padding: 7px 14px; font-size:13px;" onclick="saveSublimationSettings('addons', ${addonIndex})">Done</button>`
        : `<button class="btn btn-sm btn-secondary" style="padding: 7px 14px; font-size:13px;" onclick="toggleSublimationEditMode('addons', true, ${addonIndex})">Edit</button>`}
              </div>
            </div>
            ${isAddonEditing && isRulesOpen ? `<div style="display:flex; gap:20px; align-items:center; flex-wrap:wrap; background: rgba(0,0,0,0.15); border-radius:8px; padding:10px 14px; margin-bottom:14px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:11px; color:#9ca3af; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Selection</span>
                <button class="btn btn-sm" style="padding:4px 12px; font-size:12px; ${addonType === 'radio' ? 'background:#3b82f6; border-color:#3b82f6; color:white;' : 'background:#374151; border-color:#4b5563; color:#9ca3af;'}" onclick="_subSetAddonRule(${addonIndex},'type','radio')">Single</button>
                <button class="btn btn-sm" style="padding:4px 12px; font-size:12px; ${addonType === 'checkbox' ? 'background:#3b82f6; border-color:#3b82f6; color:white;' : 'background:#374151; border-color:#4b5563; color:#9ca3af;'}" onclick="_subSetAddonRule(${addonIndex},'type','checkbox')">Multiple</button>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:11px; color:#9ca3af; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Display</span>
                <button class="btn btn-sm" style="padding:4px 12px; font-size:12px; ${addonShowIcon ? 'background:#3b82f6; border-color:#3b82f6; color:white;' : 'background:#374151; border-color:#4b5563; color:#9ca3af;'}" onclick="_subSetAddonRule(${addonIndex},'showIcon',true)">Icon</button>
                <button class="btn btn-sm" style="padding:4px 12px; font-size:12px; ${!addonShowIcon ? 'background:#3b82f6; border-color:#3b82f6; color:white;' : 'background:#374151; border-color:#4b5563; color:#9ca3af;'}" onclick="_subSetAddonRule(${addonIndex},'showIcon',false)">Text Only</button>
              </div>
            </div>` : ''}
            <table class="settings-table" style="table-layout: fixed; width: 100%;">
              <thead>
                <tr>
                  <th style="width: ${isAddonEditing ? (addonShowIcon ? '30%' : '35%') : (addonShowIcon ? '40%' : '45%')};">Option</th>
                  ${addonShowIcon ? '<th style="width: 10%; text-align:center;">Icon</th>' : ''}
                  <th style="width: ${addonShowIcon ? '20%' : '25%'};">Type</th>
                  <th style="width: ${isAddonEditing ? (addonShowIcon ? '20%' : '25%') : (addonShowIcon ? '30%' : '30%')};">Price</th>
                  ${isAddonEditing ? '<th class="text-center" style="width: 20%;">Actions</th>' : ''}
                </tr>
              </thead>
              <tbody>`;

    addon.options.forEach((option, optionIndex) => {
      const custCost = option.customerPrice || 0;
      const agentCost = (option.agentPrice !== undefined) ? option.agentPrice : (option.customerPrice || 0);

      // Customer Row
      html += `<tr data-sublimation-addon-option="${addonIndex}-${optionIndex}">`;
      if (isAddonEditing) {
        html += `<td rowspan="2" style="padding:4px;"><input type="text" value="${option.name || option.label}" data-addon-index="${addonIndex}" data-option-index="${optionIndex}" data-field="name" class="form-control" style="background-color: #f3f4f6; border: 1px solid #d1d5db; color: #1f2937; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align:center; font-weight: 600;"></td>`;
        if (addonShowIcon) html += `<td rowspan="2" style="padding:0; overflow:hidden; cursor:pointer;" onclick="openAssetPicker('sublimation', ${addonIndex}, ${optionIndex})"><img src="${getAssetURL(option.assetId)}" style="width:100%; height:100%; object-fit:contain; display:block; opacity:0.85;" onerror="this.src='${DUMMY_ICON}'"></td>`;
      } else {
        html += `<td rowspan="2">${option.name || option.label}</td>`;
        if (addonShowIcon) html += `<td rowspan="2" style="padding:0; overflow:hidden;"><img src="${getAssetURL(option.assetId)}" style="width:100%; height:100%; object-fit:contain; display:block;" onerror="this.src='${DUMMY_ICON}'"></td>`;
      }
      html += `<td style="background: rgba(0,0,0,0.05); font-weight: 600; font-size: 11px;">Cust</td>`;
      html += isAddonEditing ? `<td style="padding:4px; background: rgba(0,0,0,0.05);"><input type="number" step="0.01" value="${custCost.toFixed(2)}" data-addon-index="${addonIndex}" data-option-index="${optionIndex}" data-field="customerPrice" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align: center;"></td>` : `<td style="background: rgba(0,0,0,0.05);">${custCost > 0 ? "+" + _ctx.formatCurrency(custCost) : (custCost < 0 ? _ctx.formatCurrency(custCost) : "0.00")}</td>`;
      
      if (isAddonEditing) {
        html += `<td rowspan="2" style="padding:4px; white-space:nowrap; vertical-align: middle;">
                <div style="display: flex; justify-content: center; align-items: center; gap: 4px; width: 100%; height: 100%;">
                    <button class="btn btn-sm btn-secondary" style="padding:7px 10px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveSublimationAddonOptionUp(${addonIndex}, ${optionIndex})"><i class="fas fa-arrow-up"></i></button>
                    <button class="btn btn-sm btn-secondary" style="padding:7px 10px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveSublimationAddonOptionDown(${addonIndex}, ${optionIndex})"><i class="fas fa-arrow-down"></i></button>
                    <button class="btn btn-sm btn-danger" style="padding:7px 10px; border-radius:6px;" onclick="addRemoveSublimationAddonOption('remove', ${addonIndex}, ${optionIndex})"><i class="fas fa-trash"></i></button>
                </div>
              </td>`;
      }
      html += `</tr>`;

      // Agent Row
      html += `<tr data-sublimation-addon-option="${addonIndex}-${optionIndex}">`;
      html += `<td style="background: rgba(0,255,0,0.05); font-weight: 600; font-size: 11px;">Agent</td>`;
      html += isAddonEditing ? `<td style="padding:4px; background: rgba(0,255,0,0.05);"><input type="number" step="0.01" value="${agentCost.toFixed(2)}" data-addon-index="${addonIndex}" data-option-index="${optionIndex}" data-field="agentPrice" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align: center;"></td>` : `<td style="background: rgba(0,255,0,0.05);">${agentCost > 0 ? "+" + _ctx.formatCurrency(agentCost) : (agentCost < 0 ? _ctx.formatCurrency(agentCost) : "0.00")}</td>`;
      html += `</tr>`;
    });
    html += `</tbody></table></div>`;
  });
  { const _s = saveSettingsScrolls(); document.getElementById("settingsTableDiv").innerHTML = html; restoreSettingsScrolls(_s); }
}

export function saveSublimationSettings(section, addonIndex = null) {
  _ctx.setPendingCallback(() => _confirmSave(section, addonIndex));
}

function _confirmSave(section, addonIndex) {

  if (section === 'base') {
    _ctx.getData().basePrices.forEach((tier, index) => {
      const qtyInput = document.querySelector(`input[data-index="${index}"][data-field="qty"]`);
      const priceInput = document.querySelector(`input[data-index="${index}"][data-field="customerPrice"]`);
      const agentPriceInput = document.querySelector(`input[data-index="${index}"][data-field="agentPrice"]`);
      
      if (qtyInput) tier.qty = parseInt(qtyInput.value);
      if (priceInput) tier.customerPrice = parseFloat(priceInput.value);
      if (agentPriceInput) tier.agentPrice = parseFloat(agentPriceInput.value);
    });
  } else if (section === 'extraSize') {
    // Collect all size/cost inputs and restructure into consolidated format
    const sizeEntries = {};
    document.querySelectorAll('#settingsTableDiv input[data-size]').forEach(input => {
      const size = input.dataset.size;
      const field = input.dataset.field; // 'cost' or 'agentPrice'
      if (!sizeEntries[size]) sizeEntries[size] = {};
      sizeEntries[size][field] = parseFloat(input.value) || 0;
    });
    // Save back to the consolidated format
    Object.entries(sizeEntries).forEach(([size, entry]) => {
      _ctx.getData().extraSizeCost[size] = {
        customerPrice: entry.cost !== undefined ? entry.cost : (_ctx.getData().extraSizeCost[size]?.customerPrice || 0),
        agentPrice: entry.agentPrice !== undefined ? entry.agentPrice : (_ctx.getData().extraSizeCost[size]?.agentPrice || 0)
      };
    });
  } else if (section === 'addons') {
    preserveSublimationAddonInputs(addonIndex);
  }
  _ctx.closeSaveConfirmationModal();
  _ctx.showToast(`Sublimation ${section} settings saved!`);
  _ctx.setOriginalData({});
  toggleSublimationEditMode(section, false, addonIndex);
}

function preserveSublimationAddonInputs(addonIndex) {
  const addon = _ctx.getData().addons[addonIndex];
  if (!addon) return;
  
  // Handle Group Name
  const groupNameInput = document.getElementById(`subAddonNameInput_${addonIndex}`);
  if (groupNameInput) {
    addon.name = groupNameInput.value.trim() || addon.name;
  }

  addon.options.forEach((option, optionIndex) => {
    const nameEl = document.querySelector(`input[data-addon-index="${addonIndex}"][data-option-index="${optionIndex}"][data-field="name"]`);
    const costEl = document.querySelector(`input[data-addon-index="${addonIndex}"][data-option-index="${optionIndex}"][data-field="customerPrice"]`);
    const agentCostEl = document.querySelector(`input[data-addon-index="${addonIndex}"][data-option-index="${optionIndex}"][data-field="agentPrice"]`);
    
    if (nameEl) option.name = nameEl.value;
    if (costEl) option.customerPrice = parseFloat(costEl.value) || 0;
    if (agentCostEl) option.agentPrice = parseFloat(agentCostEl.value) || 0;
  });
}

function preserveSublimationBaseInputs() {
  _ctx.getData().basePrices.forEach((tier, index) => {
    const qtyInput = document.querySelector(`input[data-index="${index}"][data-field="qty"]`);
    const priceInput = document.querySelector(`input[data-index="${index}"][data-field="customerPrice"]`);
    const agentPriceInput = document.querySelector(`input[data-index="${index}"][data-field="agentPrice"]`);

    if (qtyInput) tier.qty = parseInt(qtyInput.value);
    if (priceInput) tier.customerPrice = parseFloat(priceInput.value);
    if (agentPriceInput) tier.agentPrice = parseFloat(agentPriceInput.value);
  });
}

function preserveSublimationSizeInputs() {
  const newCost = {};
  // Each size has a customer-price input (data-field="cost") and agent-price input (data-field="agentPrice")
  // both with data-size="<sizeName>" (which may have been renamed via the text input data-field="sizeName")
  document.querySelectorAll('#settingsTableDiv input[data-field="sizeName"]').forEach(nameInput => {
    const newName = nameInput.value.trim() || nameInput.dataset.oldSize;
    const idx = nameInput.dataset.sizeIndex;
    // Find paired price inputs by their original size name stored in data-old-size
    const origSize = nameInput.dataset.oldSize;
    const custInput = document.querySelector(`#settingsTableDiv input[data-size="${origSize}"][data-field="cost"]`);
    const agentInput = document.querySelector(`#settingsTableDiv input[data-size="${origSize}"][data-field="agentPrice"]`);
    newCost[newName] = {
      customerPrice: custInput ? (parseFloat(custInput.value) || 0) : (_ctx.getData().extraSizeCost[origSize]?.customerPrice || 0),
      agentPrice: agentInput ? (parseFloat(agentInput.value) || 0) : (_ctx.getData().extraSizeCost[origSize]?.agentPrice || 0)
    };
  });
  // If no name inputs exist (view mode), fall back to current data
  if (Object.keys(newCost).length === 0) return;
  _ctx.getData().extraSizeCost = newCost;
  // Resync global reference
  globalSublimationData.extraSizeCost = _ctx.getData().extraSizeCost;
}

export function addRemoveSublimationAddonOption(action, addonIndex, optionIndex = null) {
  if (action === 'add') {
    preserveSublimationAddonInputs(addonIndex);
    _ctx.getData().addons[addonIndex].options.push({
      name: "New Option",
      customerPrice: 0.00,
      agentPrice: 0.00
    });
    renderSublimationSettingsTable();
  } else if (action === 'remove') {
    preserveSublimationAddonInputs(addonIndex);
    _ctx.getData().addons[addonIndex].options.splice(optionIndex, 1);
    renderSublimationSettingsTable();
  }
}

export function openAddSublimationAddonGroupModal() {
  const input = document.getElementById('newSublimationAddonGroupNameInput');
  input.value = '';
  const modal = document.getElementById('addSublimationAddonGroupModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => input.focus(), 100);
}

export function closeAddSublimationAddonGroupModal() {
  const modal = document.getElementById('addSublimationAddonGroupModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

export function confirmAddSublimationAddonGroup() {
  const name = document.getElementById('newSublimationAddonGroupNameInput').value.trim();
  if (!name) { _ctx.showToast('Please enter a group name.', 'warning'); return; }
  const newAddon = {
    name: name,
    options: [{ name: 'None', customerPrice: 0, agentPrice: 0 }]
  };
  _ctx.getData().addons.push(newAddon);
  _ctx.getEditState().addons.push(false);
  _ctx.getEditState().addonsRulesOpen.push(false);
  closeAddSublimationAddonGroupModal();
  _ctx.showToast(`Add-on group "${name}" created.`);
  renderSublimationSettingsTable();
}

export function addRemoveSublimationAddonType(action, addonIndex = null) {
  if (action === 'add') {
    openAddSublimationAddonGroupModal();
    return;
    _ctx.getData().addons.push({
      name: "New Type",
      options: []
    });
    _ctx.getEditState().addons.push(false);
    renderSublimationSettingsTable();
  } else if (action === 'remove') {
    const addon = _ctx.getData().addons[addonIndex];
    _ctx.showDeleteConfirmationModal(
      "Delete Add-on Type?",
      `Are you sure you want to delete "${addon.name}"?`,
      () => {
        _ctx.getData().addons.splice(addonIndex, 1);
        _ctx.getEditState().addons.splice(addonIndex, 1);
        _ctx.getEditState().addonsRulesOpen.splice(addonIndex, 1);
        renderSublimationSettingsTable();
        _ctx.showToast(`Add-on type deleted.`);
      }
    );
  }
}

export function moveSublimationAddonOptionUp(addonIndex, optionIndex) {
  preserveSublimationAddonInputs(addonIndex);
  if (optionIndex > 0) {
    const options = _ctx.getData().addons[addonIndex].options;
    [options[optionIndex], options[optionIndex - 1]] = [options[optionIndex - 1], options[optionIndex]];
    renderSublimationSettingsTable();
    _ctx.highlightMoveRow('data-sublimation-addon-option', `${addonIndex}-${optionIndex - 1}`);
  }
}

export function moveSublimationAddonOptionDown(addonIndex, optionIndex) {
  preserveSublimationAddonInputs(addonIndex);
  const options = _ctx.getData().addons[addonIndex].options;
  if (optionIndex < options.length - 1) {
    [options[optionIndex], options[optionIndex + 1]] = [options[optionIndex + 1], options[optionIndex]];
    renderSublimationSettingsTable();
    _ctx.highlightMoveRow('data-sublimation-addon-option', `${addonIndex}-${optionIndex + 1}`);
  }
}
// --- Base Prices: Move Up / Down / Remove ---
export function moveSublimationBasePriceUp(index) {
  preserveSublimationBaseInputs();
  if (index > 0) {
    const arr = _ctx.getData().basePrices;
    [arr[index], arr[index - 1]] = [arr[index - 1], arr[index]];
    renderSublimationSettingsTable();
    _ctx.highlightMoveRow('data-sublimation-base-price', index - 1);
  }
}

export function moveSublimationBasePriceDown(index) {
  preserveSublimationBaseInputs();
  const arr = _ctx.getData().basePrices;
  if (index < arr.length - 1) {
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    renderSublimationSettingsTable();
    _ctx.highlightMoveRow('data-sublimation-base-price', index + 1);
  }
}

export function removeSublimationBasePriceByIndex(index) {
  if (_ctx.getData().basePrices.length <= 1) {
    _ctx.showToast('Cannot remove the last tier.', 'warning');
    return;
  }
  preserveSublimationBaseInputs();
  const tier = _ctx.getData().basePrices[index];
  _ctx.showDeleteConfirmationModal(
    "Remove Tier?",
    `Are you sure you want to remove tier "${tier.label}"?`,
    () => {
      _ctx.getData().basePrices.splice(index, 1);
      renderSublimationSettingsTable();
      _ctx.showToast(`Tier "${tier.label}" removed.`);
    }
  );
}

// --- Extra Size Costs: Move Up / Down / Remove ---
export function moveSublimationSizeUp(sizeIndex) {
  preserveSublimationSizeInputs();
  const entries = Object.entries(_ctx.getData().extraSizeCost);
  if (sizeIndex > 0) {
    [entries[sizeIndex], entries[sizeIndex - 1]] = [entries[sizeIndex - 1], entries[sizeIndex]];
    _ctx.getData().extraSizeCost = Object.fromEntries(entries);
    renderSublimationSettingsTable();
    _ctx.highlightMoveRow('data-sublimation-size', sizeIndex - 1);
  }
}

export function moveSublimationSizeDown(sizeIndex) {
  preserveSublimationSizeInputs();
  const entries = Object.entries(_ctx.getData().extraSizeCost);
  if (sizeIndex < entries.length - 1) {
    [entries[sizeIndex], entries[sizeIndex + 1]] = [entries[sizeIndex + 1], entries[sizeIndex]];
    _ctx.getData().extraSizeCost = Object.fromEntries(entries);
    renderSublimationSettingsTable();
    _ctx.highlightMoveRow('data-sublimation-size', sizeIndex + 1);
  }
}

export function removeSublimationSizeByIndex(sizeIndex) {
  const entries = Object.entries(_ctx.getData().extraSizeCost);
  if (entries.length <= 1) {
    _ctx.showToast('Cannot remove the last size entry.', 'warning');
    return;
  }
  preserveSublimationSizeInputs();
  const [sizeName] = entries[sizeIndex];
  if (sizeName === 'XS-2XL') {
    _ctx.showToast('XS-2XL is the base size and cannot be removed.', 'warning');
    return;
  }
  
  _ctx.showDeleteConfirmationModal(
    "Remove Size?",
    `Are you sure you want to remove size "${sizeName}"?`,
    () => {
      entries.splice(sizeIndex, 1);
      _ctx.getData().extraSizeCost = Object.fromEntries(entries);
      // Resync global reference after object replacement
      globalSublimationData.extraSizeCost = _ctx.getData().extraSizeCost;
      renderSublimationSettingsTable();
      _ctx.showToast(`Size "${sizeName}" removed.`);
    }
  );
}

export function addRemoveSublimationQuantity(action) {
  if (action === 'add') {
    preserveSublimationBaseInputs();
    _ctx.getData().basePrices.push({
      label: "New Tier",
      qty: 0,
      customerPrice: 0.00,
      agentPrice: 0.00
    });
  } else if (action === 'remove') {
    if (_ctx.getData().basePrices.length > 1) {
      preserveSublimationBaseInputs();
      _ctx.getData().basePrices.pop();
    } else {
      _ctx.showToast('Cannot remove the last quantity tier.', 'warning');
    }
  }
  renderSublimationSettingsTable();
}

export function addRemoveSublimationSize(action) {
  if (action === 'add') {
    preserveSublimationSizeInputs();
    // Generate a unique default name
    let newName = 'New Size';
    let counter = 1;
    while (_ctx.getData().extraSizeCost[newName] !== undefined) {
      newName = `New Size ${counter}`;
      counter++;
    }
    _ctx.getData().extraSizeCost[newName] = 0.00;
  }
  renderSublimationSettingsTable();
}

export function toggleSubAddonRulesPanel(addonIndex) {
  preserveSublimationAddonInputs(addonIndex);
  _ctx.getEditState().addonsRulesOpen[addonIndex] = !_ctx.getEditState().addonsRulesOpen[addonIndex];
  renderSublimationSettingsTable();
}

export function _subSetAddonRule(addonIndex, field, value) {
  preserveSublimationAddonInputs(addonIndex);
  _ctx.getData().addons[addonIndex][field] = value;
  renderSublimationSettingsTable();
}

export function toggleSublimationEditMode(section, isEditing, index = null) {
  if (isEditing) {
    _ctx.setOriginalData(JSON.parse(JSON.stringify(_ctx.getData())));
  } else if (Object.keys(_ctx.getOriginalData()).length > 0) {
    _ctx.replaceData(JSON.parse(JSON.stringify(_ctx.getOriginalData())));
  }
  if (section === 'addons') {
    _ctx.getEditState().addons[index] = isEditing;
    if (isEditing) _ctx.getEditState().addonsRulesOpen[index] = false;
  } else {
    sublimationEditState[section] = isEditing;
  }
  renderSublimationSettingsTable();
}
