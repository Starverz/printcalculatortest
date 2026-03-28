// modules/calculators/lanyardSettings.js
// Lanyard settings panel functions — extracted from app.js
// Uses init(ctx) pattern.

import { saveSettingsScrolls, restoreSettingsScrolls } from '../utils/ui.js';

let _ctx = null;
let _originalLanyardSizes = [];

export function initLanyardSettings(ctx) { _ctx = ctx; }

export function openManageLanyardSizesModal() {
  _originalLanyardSizes = _ctx.getData().sizes.map(s => s.label);
  const list = document.getElementById('manageLanyardSizesList');
  list.innerHTML = '';
  _ctx.getData().sizes.forEach((size, idx) => _appendLanyardSizeRow(size.label, idx));
  const modal = document.getElementById('manageLanyardSizesModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

export function closeManageLanyardSizesModal() {
  const modal = document.getElementById('manageLanyardSizesModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function _appendLanyardSizeRow(value, idx) {
  const list = document.getElementById('manageLanyardSizesList');
  const row = document.createElement('div');
  row.className = 'manage-size-row flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700';
  row.innerHTML = `
          <input type="text" value="${value}" placeholder="Size Name" class="flex-1 font-semibold rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors mr-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
          <div class="flex items-center gap-2">
            <button onclick="moveLanyardSizeRowUp(this)" class="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"><i class="fas fa-arrow-up text-xs"></i></button>
            <button onclick="moveLanyardSizeRowDown(this)" class="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"><i class="fas fa-arrow-down text-xs"></i></button>
            <button onclick="removeLanyardSizeRow(this)" class="px-3 py-1.5 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg text-sm transition-colors ml-1">Remove</button>
          </div>`;
  list.appendChild(row);
}

export function addRowToManageLanyardSizes() {
  const list = document.getElementById('manageLanyardSizesList');
  const idx = list.children.length;
  _appendLanyardSizeRow('', idx);
  list.lastElementChild.querySelector('input').focus();
}

export function moveLanyardSizeRowUp(btn) {
  const row = btn.closest('.manage-size-row');
  const prev = row.previousElementSibling;
  if (prev) { row.parentNode.insertBefore(row, prev); _ctx.blinkRow(row); }
}

export function moveLanyardSizeRowDown(btn) {
  const row = btn.closest('.manage-size-row');
  const next = row.nextElementSibling;
  if (next) { row.parentNode.insertBefore(next, row); _ctx.blinkRow(row); }
}

export function removeLanyardSizeRow(btn) {
  btn.closest('.manage-size-row').remove();
}

export function redoManageLanyardSizes() {
  const list = document.getElementById('manageLanyardSizesList');
  list.innerHTML = '';
  _originalLanyardSizes.forEach((size, idx) => _appendLanyardSizeRow(size, idx));
}

export function saveManageLanyardSizes() {
  // First validate
  const rows = document.querySelectorAll('#manageLanyardSizesList .manage-size-row');
  const newSizes = [];
  rows.forEach(row => {
    const val = row.querySelector('input').value.trim();
    if (val && !newSizes.includes(val)) newSizes.push(val);
  });
  if (newSizes.length === 0) { _ctx.showToast('At least one size is required.'); return; }

  // Store the new sizes for later use after confirmation
  window._pendingLanyardSizes = newSizes;
  
  // Show confirmation modal
  _ctx.setPendingCallback(() => _confirmSave_saveManageLanyardSizes('sizes', null));
}

function _confirmSave_saveManageLanyardSizes(section, index) {
  const newSizes = window._pendingLanyardSizes;
  delete window._pendingLanyardSizes;

  // Update lanyard data
  newSizes.forEach((newSizeLabel, newIndex) => {
    const existingSize = _ctx.getData().sizes.find(s => s.label === newSizeLabel);
    if (!existingSize) {
      // New size added, initialize with default prices
      _ctx.getData().sizes.push({
        label: newSizeLabel,
        prices: {
          customer: { p1: new Array(_ctx.getData().quantities.length).fill(0), p2: new Array(_ctx.getData().quantities.length).fill(0) },
          agent: { p1: new Array(_ctx.getData().quantities.length).fill(0), p2: new Array(_ctx.getData().quantities.length).fill(0) }
        }
      });
    }
  });

  // Remove sizes that were deleted
  _ctx.getData().sizes = _ctx.getData().sizes.filter(s => newSizes.includes(s.label));

  // Reorder to match new order
  _ctx.getData().sizes.sort((a, b) => newSizes.indexOf(a.label) - newSizes.indexOf(b.label));

  _ctx.closeSaveConfirmationModal();
  closeManageLanyardSizesModal();
  _ctx.showToast('Lanyard sizes updated successfully.');
  renderLanyardSettingsTable();
}

export function renderLanyardSettingsTable() {
  let html = '';
  const isBaseEditing = _ctx.getEditState().base;
  // --- Base Prices Section ---
  html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h4 style="margin:0 0 4px 0;">Base Prices (Per Piece)</h4>
            <p style="margin:0; font-size: 13px; color: #9ca3af;">Manage base prices for different print sides, sizes, and quantities.</p>
          </div>
          <div style="display:flex; gap:8px;">
            ${isBaseEditing ?
      `<button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="addLanyardQuantity()">+ Add Qty</button>
              <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="toggleLanyardEditMode('base', false)">Cancel</button>
              <button class="btn btn-sm btn-primary" style="width: auto; margin-top:0; padding: 8px 14px; font-size: 13px;" onclick="saveLanyardSettings('base')">Done</button>` :
      `<button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="toggleLanyardEditMode('base', true)">Edit</button>`
    }
          </div>
          </div>
        </div>`;
  html += `<div style="overflow-x: auto; width: 100%; border-radius: 6px; border: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 24px;">
          <table class="settings-table" id="lanyardBasePricesTable" style="margin-top:0; border:none; min-width: max-content; width: 100%;">
          <thead>
            <tr>
              <th rowspan="2">Qty</th>
              <th rowspan="2">Type</th>
              ${_ctx.getData().sizes.map((size, sizeIndex) => `<th colspan="2" style="min-width: 100px;">${size.label}</th>`).join('')}
              ${isBaseEditing ? '<th rowspan="2" class="text-center">Actions</th>' : ''}
            </tr>
            <tr>
              ${_ctx.getData().sizes.map(() => `<th>1-Side</th><th>2-Side</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${_ctx.getData().quantities.map((qty, qtyIndex) => {
    const rowCust = `
                    <tr data-lanyard-qty-row="${qtyIndex}">
                        <td rowspan="2">${isBaseEditing ? `<input type="text" value="${qty}" data-qty-index="${qtyIndex}" data-field="qty" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; font-weight: 600;">` : `<strong>${qty} pcs</strong>`}</td>
                        <td style="background: rgba(0,0,0,0.05); font-weight: 600; font-size: 11px;">Cust</td>
                        ${_ctx.getData().sizes.map((size, sizeIndex) => {
      const price1 = (size.prices.customerPrice.p1 && size.prices.customerPrice.p1[qtyIndex]) || 0;
      const price2 = (size.prices.customerPrice.p2 && size.prices.customerPrice.p2[qtyIndex]) || 0;
      return `
                                <td class="text-center" style="padding: 4px;">${isBaseEditing ? `<input type="number" step="0.01" value="${price1.toFixed(2)}" data-qty-index="${qtyIndex}" data-size-index="${sizeIndex}" data-side="p1" data-target="customerPrice" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 6px; width: 100%; box-sizing: border-box;">` : price1.toFixed(2)}</td>
                                <td class="text-center" style="padding: 4px;">${isBaseEditing ? `<input type="number" step="0.01" value="${price2.toFixed(2)}" data-qty-index="${qtyIndex}" data-size-index="${sizeIndex}" data-side="p2" data-target="customerPrice" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 6px; width: 100%; box-sizing: border-box;">` : price2.toFixed(2)}</td>
                              `;
    }).join('')}
                        ${isBaseEditing ? `<td rowspan="2" style="padding:4px; white-space:nowrap; vertical-align: middle;">
                          <div style="display: flex; justify-content: center; align-items: center; gap: 4px; width: 100%; height: 100%;">
                            <button class="btn btn-sm btn-secondary" style="padding:7px 10px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveLanyardQtyUp(${qtyIndex})"><i class="fas fa-arrow-up"></i></button>
                            <button class="btn btn-sm btn-secondary" style="padding:7px 10px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveLanyardQtyDown(${qtyIndex})"><i class="fas fa-arrow-down"></i></button>
                            <button class="btn btn-sm btn-danger" style="padding:7px 10px; border-radius:6px;" onclick="removeLanyardQtyByIndex(${qtyIndex})"><i class="fas fa-trash"></i></button>
                          </div>
                        </td>` : ''}
                    </tr>`;
    const rowAgent = `
                    <tr data-lanyard-qty-row="${qtyIndex}">
                        <td style="background: rgba(0,255,0,0.05); font-weight: 600; font-size: 11px;">Agent</td>
                        ${_ctx.getData().sizes.map((size, sizeIndex) => {
      const price1 = (size.prices.agentPrice.p1 && size.prices.agentPrice.p1[qtyIndex]) || 0;
      const price2 = (size.prices.agentPrice.p2 && size.prices.agentPrice.p2[qtyIndex]) || 0;
      return `
                                <td class="text-center" style="background: rgba(0,255,0,0.05); padding: 4px;">${isBaseEditing ? `<input type="number" step="0.01" value="${price1.toFixed(2)}" data-qty-index="${qtyIndex}" data-size-index="${sizeIndex}" data-side="p1" data-target="agentPrice" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 6px; width: 100%; box-sizing: border-box;">` : price1.toFixed(2)}</td>
                                <td class="text-center" style="background: rgba(0,255,0,0.05); padding: 4px;">${isBaseEditing ? `<input type="number" step="0.01" value="${price2.toFixed(2)}" data-qty-index="${qtyIndex}" data-size-index="${sizeIndex}" data-side="p2" data-target="agentPrice" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 6px; width: 100%; box-sizing: border-box;">` : price2.toFixed(2)}</td>
                              `;
    }).join('')}
                    </tr>`;
    return rowCust + rowAgent;
  }).join('')}
          </tbody>
        </table>
        </div>`;
  // --- Finishing Add-ons Section ---
  html += `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; border-top: 2px solid var(--border-color); padding-top: 24px;">
            <div>
              <h4 style="margin:0 0 4px 0;">Finishing Add-ons</h4>
              <p style="margin:0; font-size: 13px; color: var(--text-secondary);">Manage available finishing options for lanyards.</p>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:11px; color:#9ca3af; font-weight:600; letter-spacing:0.05em;">COLUMNS:</span>
              <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="openManageLanyardSizesModal()">Manage Sizes</button>
            </div>
        </div>
          <div style="border: 1px dashed var(--border-color); border-radius: 10px; padding: 24px; margin-top: 16px; margin-bottom: 16px; text-align: center;">
            <button class="btn btn-primary" style="width:auto; margin:0 0 10px 0; padding: 10px 24px; font-size: 14px; display:inline-flex; align-items:center; gap:8px;" onclick="openAddLanyardAddonGroupModal()">
              <i class="fas fa-plus-circle"></i> Create New Add-on Group
            </button>
            <p style="margin:0; font-size: 12px; color: var(--text-secondary);">Click here to create a new category of add-ons (e.g., "Badge Holder", "Hook Type") which will appear as a new table below.</p>
          </div>`;

  const lanyardAddonsArr = _ctx.getData().addons;
  lanyardAddonsArr.forEach((addon, addonIndex) => {
    const isAddonEditing = _ctx.getEditState().addons && _ctx.getEditState().addons[addonIndex];
    const addonType = addon.type || 'radio';
    const addonShowIcon = addon.showIcon !== false;
    const isRulesOpen = !!(_ctx.getEditState().addonsRulesOpen && _ctx.getEditState().addonsRulesOpen[addonIndex]);
    html += `<div class="settings-panel" style="margin-top: 16px; padding: 20px; border: 1px solid ${isAddonEditing ? '#22c55e' : 'var(--accent-color)'}; border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${isAddonEditing && isRulesOpen ? '8px' : '16px'}; gap: 12px;">
              ${isAddonEditing
        ? `<input type="text" value="${addon.name}" id="lanyardAddonNameInput_${addonIndex}" class="form-control" style="background-color: #f3f4f6; border: 1px solid #d1d5db; color: #1f2937; border-radius: 6px; padding: 8px 12px; font-size: 16px; font-weight: 600; max-width: 280px;">`
        : `<h5 style="margin:0; font-size:16px; font-weight: 600;">${addon.name}</h5>`}
              <div style="display:flex; gap:8px; flex-shrink:0;">
                ${isAddonEditing ? `
                  <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;${isRulesOpen ? ' background:#3b82f6; border-color:#3b82f6; color:white;' : ''}" onclick="toggleLanyardAddonRulesPanel(${addonIndex})">Add Rules</button>
                  <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="addLanyardAddonOptionInline(${addonIndex})">+ Add Option</button>
                  <button class="btn btn-sm btn-danger" style="padding: 8px 14px; font-size: 13px;" onclick="removeLanyardAddonType(${addonIndex})">Delete Type</button>
                  <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="toggleLanyardEditMode('addons', false, ${addonIndex})">Cancel</button>
                  <button class="btn btn-sm btn-primary" style="width:auto;margin-top:0; padding: 8px 14px; font-size: 13px;" onclick="saveLanyardSettings('addons', ${addonIndex})">Done</button>
                ` : `
                  <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="toggleLanyardEditMode('addons', true, ${addonIndex})">Edit</button>
                `}
              </div>
            </div>
            ${isAddonEditing && isRulesOpen ? `<div style="display:flex; gap:20px; align-items:center; flex-wrap:wrap; background: rgba(0,0,0,0.15); border-radius:8px; padding:10px 14px; margin-bottom:14px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:11px; color:#9ca3af; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Selection</span>
                <button class="btn btn-sm" style="padding:4px 12px; font-size:12px; ${addonType === 'radio' ? 'background:#3b82f6; border-color:#3b82f6; color:white;' : 'background:#374151; border-color:#4b5563; color:#9ca3af;'}" onclick="_lanyardSetAddonRule(${addonIndex},'type','radio')">Single</button>
                <button class="btn btn-sm" style="padding:4px 12px; font-size:12px; ${addonType === 'checkbox' ? 'background:#3b82f6; border-color:#3b82f6; color:white;' : 'background:#374151; border-color:#4b5563; color:#9ca3af;'}" onclick="_lanyardSetAddonRule(${addonIndex},'type','checkbox')">Multiple</button>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:11px; color:#9ca3af; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Display</span>
                <button class="btn btn-sm" style="padding:4px 12px; font-size:12px; ${addonShowIcon ? 'background:#3b82f6; border-color:#3b82f6; color:white;' : 'background:#374151; border-color:#4b5563; color:#9ca3af;'}" onclick="_lanyardSetAddonRule(${addonIndex},'showIcon',true)">Icon</button>
                <button class="btn btn-sm" style="padding:4px 12px; font-size:12px; ${!addonShowIcon ? 'background:#3b82f6; border-color:#3b82f6; color:white;' : 'background:#374151; border-color:#4b5563; color:#9ca3af;'}" onclick="_lanyardSetAddonRule(${addonIndex},'showIcon',false)">Text Only</button>
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
              <tbody>
                ${addon.options.map((option, optionIndex) => {
                  const custCost = option.customerPrice || 0;
                  const agentCost = option.agentPrice || 0;
                  const rowCust = `
                    <tr data-lanyard-addon-option="${addonIndex}-${optionIndex}">
                        <td rowspan="2" ${isAddonEditing ? 'style="padding:4px;"' : ''}>${isAddonEditing ? `<input type="text" value="${option.name}" data-addon-index="${addonIndex}" data-option-index="${optionIndex}" data-field="name" class="form-control" style="background-color: #f3f4f6; border: 1px solid #d1d5db; color: #1f2937; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align:center; font-weight: 600;">` : `<strong>${option.name}</strong>`}</td>
                        ${addonShowIcon ? (isAddonEditing ? `<td rowspan="2" style="padding:0; overflow:hidden; cursor:pointer;" onclick="openAssetPicker('lanyard', ${addonIndex}, ${optionIndex})"><img src="${_ctx.getAssetURL(option.assetId)}" style="width:100%; height:100%; object-fit:contain; display:block; opacity:0.85;" onerror="this.src='${_ctx.getDummyIcon()}'"></td>` : `<td rowspan="2" style="padding:0; overflow:hidden;"><img src="${_ctx.getAssetURL(option.assetId)}" style="width:100%; height:100%; object-fit:contain; display:block;" onerror="this.src='${_ctx.getDummyIcon()}'"></td>`) : ''}
                        <td style="background: rgba(0,0,0,0.05); font-weight: 600; font-size: 11px;">Cust</td>
                        <td style="${isAddonEditing ? 'padding:4px; ' : ''}background: rgba(0,0,0,0.05);">${isAddonEditing ? `<input type="number" step="0.01" value="${custCost.toFixed(2)}" data-addon-index="${addonIndex}" data-option-index="${optionIndex}" data-field="customerPrice" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align: center;">` : (custCost > 0 ? "+" + custCost.toFixed(2) : (custCost < 0 ? custCost.toFixed(2) : "0.00"))}</td>
                        ${isAddonEditing ? `<td rowspan="2" style="padding:4px; white-space:nowrap; vertical-align: middle;">
                          <div style="display: flex; justify-content: center; align-items: center; gap: 4px; width: 100%; height: 100%;">
                              <button class="btn btn-sm btn-secondary" style="padding:7px 10px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveLanyardAddonOptionUp(${addonIndex},${optionIndex})"><i class="fas fa-arrow-up"></i></button>
                              <button class="btn btn-sm btn-secondary" style="padding:7px 10px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveLanyardAddonOptionDown(${addonIndex},${optionIndex})"><i class="fas fa-arrow-down"></i></button>
                              <button class="btn btn-sm btn-danger" style="padding:7px 10px; border-radius:6px;" onclick="removeLanyardAddonOption(${addonIndex},${optionIndex})"><i class="fas fa-trash"></i></button>
                          </div>
                        </td>` : ''}
                    </tr>`;
                  // Agent row
                  const rowAgent = `
                    <tr data-lanyard-addon-option="${addonIndex}-${optionIndex}">
                        <td style="background: rgba(0,255,0,0.05); font-weight: 600; font-size: 11px;">Agent</td>
                        <td style="${isAddonEditing ? 'padding:4px; ' : ''}background: rgba(0,255,0,0.05);">${isAddonEditing ? `<input type="number" step="0.01" value="${agentCost.toFixed(2)}" data-addon-index="${addonIndex}" data-option-index="${optionIndex}" data-field="agentPrice" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align: center;">` : (agentCost > 0 ? "+" + agentCost.toFixed(2) : (agentCost < 0 ? agentCost.toFixed(2) : "0.00"))}</td>
                    </tr>`;
                  return rowCust + rowAgent;
                }).join('')}
              </tbody>
            </table>
          </div>`;
  });
  { const _s = saveSettingsScrolls(); document.getElementById("settingsTableDiv").innerHTML = html; restoreSettingsScrolls(_s); }
}

export function toggleLanyardAddonRulesPanel(addonIndex) {
  preserveLanyardAddonInputs(addonIndex);
  if (!_ctx.getEditState().addonsRulesOpen) _ctx.getEditState().addonsRulesOpen = _ctx.getData().addons.map(() => false);
  _ctx.getEditState().addonsRulesOpen[addonIndex] = !_ctx.getEditState().addonsRulesOpen[addonIndex];
  renderLanyardSettingsTable();
}

export function _lanyardSetAddonRule(addonIndex, field, value) {
  preserveLanyardAddonInputs(addonIndex);
  _ctx.getData().addons[addonIndex][field] = value;
  renderLanyardSettingsTable();
}

export function toggleLanyardEditMode(section, isEditing, index = null) {
  if (isEditing) {
    _ctx.setOriginalData(JSON.parse(JSON.stringify(_ctx.getData())));
  } else if (Object.keys(_ctx.getOriginalData()).length > 0) {
    _ctx.replaceData(JSON.parse(JSON.stringify(_ctx.getOriginalData())));
  }
  if (section === 'addons') {
    if (!_ctx.getEditState().addons) {
      _ctx.getEditState().addons = _ctx.getData().addons.map(() => false);
    }
    _ctx.getEditState().addons[index] = isEditing;
    if (isEditing) {
      if (!_ctx.getEditState().addonsRulesOpen) _ctx.getEditState().addonsRulesOpen = _ctx.getData().addons.map(() => false);
      _ctx.getEditState().addonsRulesOpen[index] = false;
    }
  } else {
    _ctx.getEditState()[section] = isEditing;
  }
  renderLanyardSettingsTable();
}

export function saveLanyardSettings(section, addonIndex = null) {
  _ctx.setPendingCallback(() => _confirmSave_saveLanyardSettings(section, addonIndex));
}

function _confirmSave_saveLanyardSettings(section, index) {

  if (section === 'base') {
    preserveLanyardBaseInputs();
  } else if (section === 'addons') {
    preserveLanyardAddonInputs(index);
  }
  _ctx.closeSaveConfirmationModal();
  _ctx.showToast(`Lanyard ${section} settings saved!`);
  _ctx.setOriginalData({});
  toggleLanyardEditMode(section, false, index);
}

export function addLanyardQuantity() {
  // Preserve current inputs before adding
  preserveLanyardBaseInputs();
  // Find a unique default qty based on last quantity
  let newQty = 1;
  if (_ctx.getData().quantities.length > 0) {
    newQty = _ctx.getData().quantities[_ctx.getData().quantities.length - 1] + 1;
    // Make sure it's unique
    while (_ctx.getData().quantities.includes(newQty)) {
      newQty++;
    }
  }
  _ctx.getData().quantities.push(newQty);
  // Add prices at the end (no sorting)
  const idx = _ctx.getData().quantities.length - 1;
  _ctx.getData().sizes.forEach(size => {
    if (!size.prices) size.prices = { customerPrice: { p1: [], p2: [] }, agentPrice: { p1: [], p2: [] } };
    size.prices.customerPrice.p1.push(0);
    size.prices.customerPrice.p2.push(0);
    size.prices.agentPrice.p1.push(0);
    size.prices.agentPrice.p2.push(0);
  });
  renderLanyardSettingsTable();
}

export function removeLanyardQtyByIndex(qtyIndex) {
  if (_ctx.getData().quantities.length <= 1) {
    _ctx.showToast('Cannot remove the last quantity tier.');
    return;
  }
  preserveLanyardBaseInputs();
  const qty = _ctx.getData().quantities[qtyIndex];
  _ctx.showDeleteConfirmationModal(
    "Remove Quantity?",
    `Are you sure you want to remove the "${qty} pcs" tier ? `,
    () => {
      _ctx.getData().quantities.splice(qtyIndex, 1);
      _ctx.getData().sizes.forEach(size => {
        if (size.prices) {
          size.prices.customerPrice.p1.splice(qtyIndex, 1);
          size.prices.customerPrice.p2.splice(qtyIndex, 1);
          size.prices.agentPrice.p1.splice(qtyIndex, 1);
          size.prices.agentPrice.p2.splice(qtyIndex, 1);
        }
      });
      renderLanyardSettingsTable();
      _ctx.showToast(`Quantity tier "${qty} pcs" removed.`);
    }
  );
}

export function moveLanyardQtyUp(qtyIndex) {
  if (qtyIndex <= 0) return;
  preserveLanyardBaseInputs();
  // Swap quantities
  [_ctx.getData().quantities[qtyIndex], _ctx.getData().quantities[qtyIndex - 1]] = 
  [_ctx.getData().quantities[qtyIndex - 1], _ctx.getData().quantities[qtyIndex]];
  // Swap prices
  _ctx.getData().sizes.forEach(size => {
    if (size.prices) {
      ['customerPrice', 'agentPrice'].forEach(target => {
        const p1 = size.prices[target].p1;
        const p2 = size.prices[target].p2;
        [p1[qtyIndex], p1[qtyIndex - 1]] = [p1[qtyIndex - 1], p1[qtyIndex]];
        [p2[qtyIndex], p2[qtyIndex - 1]] = [p2[qtyIndex - 1], p2[qtyIndex]];
      });
    }
  });
  renderLanyardSettingsTable();
  _ctx.highlightMoveRow('data-lanyard-qty-row', qtyIndex - 1);
}

export function moveLanyardQtyDown(qtyIndex) {
  if (qtyIndex >= _ctx.getData().quantities.length - 1) return;
  preserveLanyardBaseInputs();
  // Swap quantities
  [_ctx.getData().quantities[qtyIndex], _ctx.getData().quantities[qtyIndex + 1]] = 
  [_ctx.getData().quantities[qtyIndex + 1], _ctx.getData().quantities[qtyIndex]];
  // Swap prices
  _ctx.getData().sizes.forEach(size => {
    if (size.prices) {
      ['customerPrice', 'agentPrice'].forEach(target => {
        const p1 = size.prices[target].p1;
        const p2 = size.prices[target].p2;
        [p1[qtyIndex], p1[qtyIndex + 1]] = [p1[qtyIndex + 1], p1[qtyIndex]];
        [p2[qtyIndex], p2[qtyIndex + 1]] = [p2[qtyIndex + 1], p2[qtyIndex]];
      });
    }
  });
  renderLanyardSettingsTable();
  _ctx.highlightMoveRow('data-lanyard-qty-row', qtyIndex + 1);
}

export function addLanyardSize() {
  preserveLanyardBaseInputs();
  let sizeLabel = 'New Size';
  let counter = 1;
  while (_ctx.getData().sizes.find(s => s.label === sizeLabel)) {
    sizeLabel = `New Size ${counter} `;
    counter++;
  }
  let newSize = { label: sizeLabel, prices: { customerPrice: { p1: [], p2: [] }, agentPrice: { p1: [], p2: [] } } };
  _ctx.getData().quantities.forEach(() => {
    newSize.prices.customerPrice.p1.push(0);
    newSize.prices.customerPrice.p2.push(0);
    newSize.prices.agentPrice.p1.push(0);
    newSize.prices.agentPrice.p2.push(0);
  });
  _ctx.getData().sizes.push(newSize);

renderLanyardSettingsTable();
}

export function removeLanyardSizeByIndex(sizeIndex) {
  if (_ctx.getData().sizes.length <= 1) {
    _ctx.showToast('Cannot remove the last size.');
    return;
  }
  preserveLanyardBaseInputs();
  const sizeLabel = _ctx.getData().sizes[sizeIndex].label;
  _ctx.showDeleteConfirmationModal(
    "Remove Size?",
    `Are you sure you want to remove the "${sizeLabel}" size column ? `,
    () => {
      _ctx.getData().sizes.splice(sizeIndex, 1);
      renderLanyardSettingsTable();
      _ctx.showToast(`Size "${sizeLabel}" removed.`);
    }
  );
}

function preserveLanyardBaseInputs() {
  document.querySelectorAll('#settingsTableDiv input[data-qty-index]').forEach(input => {
    const qtyIndex = parseInt(input.dataset.qtyIndex);
    const sizeIndex = parseInt(input.dataset.sizeIndex);
    const side = input.dataset.side; // 'p1' or 'p2'
    const target = input.dataset.target; // 'customerPrice' or 'agentPrice'
    
    const sizeObj = _ctx.getData().sizes[sizeIndex];
    if (sizeObj && sizeObj.prices && sizeObj.prices[target] && sizeObj.prices[target][side]) {
      sizeObj.prices[target][side][qtyIndex] = parseFloat(input.value) || 0;
    }
  });
}

export function addLanyardAddonType() {
  // Legacy prompt-based - now replaced by modal
  openAddLanyardAddonGroupModal();
}

export function openAddLanyardAddonGroupModal() {
  const input = document.getElementById('newLanyardAddonGroupNameInput');
  input.value = '';
  const modal = document.getElementById('addLanyardAddonGroupModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => input.focus(), 100);
}

export function closeAddLanyardAddonGroupModal() {
  const modal = document.getElementById('addLanyardAddonGroupModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

export function confirmAddLanyardAddonGroup() {
  const name = document.getElementById('newLanyardAddonGroupNameInput').value.trim();
  if (!name) { _ctx.showToast('Please enter a group name.', 'warning'); return; }
  const newAddon = {
    name: name,
    type: 'radio',
    options: [{ name: 'None', customerPrice: 0, agentPrice: 0, img: 'https://cdn.jsdelivr.net/gh/Starverz/my-svg-assets/Round_Neck.svg' }]
  };
  _ctx.getData().addons.push(newAddon);
  _ctx.getEditState().addons = _ctx.getData().addons.map(() => false);
  if (!_ctx.getEditState().addonsRulesOpen) _ctx.getEditState().addonsRulesOpen = [];
  _ctx.getEditState().addonsRulesOpen = _ctx.getData().addons.map(() => false);
  closeAddLanyardAddonGroupModal();
  _ctx.showToast(`Add - on group "${name}" created.`);
  renderLanyardSettingsTable();
}

export function removeLanyardAddonType(addonIndex) {
  _ctx.showDeleteConfirmationModal(
    "Delete Add-on Type?",
    `Are you sure you want to delete the '${_ctx.getData().addons[addonIndex].name}' add - on type ? `,
    () => {
      _ctx.getData().addons.splice(addonIndex, 1);
      _ctx.getEditState().addons.splice(addonIndex, 1);
      if (_ctx.getEditState().addonsRulesOpen) _ctx.getEditState().addonsRulesOpen.splice(addonIndex, 1);
      renderLanyardSettingsTable();
      _ctx.showToast("Add-on type deleted.");
    }
  );
}

export function addLanyardAddonOptionInline(addonIndex) {
  preserveLanyardAddonInputs(addonIndex);
  const newOption = { name: 'New Option', customerPrice: 0, agentPrice: 0, img: 'https://cdn.jsdelivr.net/gh/Starverz/my-svg-assets/Round_Neck.svg' };
  _ctx.getData().addons[addonIndex].options.push(newOption);
  renderLanyardSettingsTable();
}

export function removeLanyardAddonOption(addonIndex, optionIndex) {
  preserveLanyardAddonInputs(addonIndex);
  const option = _ctx.getData().addons[addonIndex].options[optionIndex];
  _ctx.showDeleteConfirmationModal(
    "Remove Option?",
    `Are you sure you want to remove option "${option.name}" ? `,
    () => {
      _ctx.getData().addons[addonIndex].options.splice(optionIndex, 1);
      renderLanyardSettingsTable();
      _ctx.showToast(`Option "${option.name}" removed.`);
    }
  );
}

export function moveLanyardAddonOptionUp(addonIndex, optionIndex) {
  preserveLanyardAddonInputs(addonIndex);
  const options = _ctx.getData().addons[addonIndex].options;
  if (optionIndex > 0) {
    [options[optionIndex], options[optionIndex - 1]] = [options[optionIndex - 1], options[optionIndex]];
    renderLanyardSettingsTable();
    _ctx.highlightMoveRow('data-lanyard-addon-option', `${addonIndex}-${optionIndex - 1}`);
  }
}

export function moveLanyardAddonOptionDown(addonIndex, optionIndex) {
  preserveLanyardAddonInputs(addonIndex);
  const options = _ctx.getData().addons[addonIndex].options;
  if (optionIndex < options.length - 1) {
    [options[optionIndex], options[optionIndex + 1]] = [options[optionIndex + 1], options[optionIndex]];
    renderLanyardSettingsTable();
    _ctx.highlightMoveRow('data-lanyard-addon-option', `${addonIndex}-${optionIndex + 1}`);
  }
}

function preserveLanyardAddonInputs(addonIndex) {
  const groupNameInput = document.getElementById(`lanyardAddonNameInput_${addonIndex}`);
  if (groupNameInput) {
    _ctx.getData().addons[addonIndex].name = groupNameInput.value.trim();
  }
  const addon = _ctx.getData().addons[addonIndex];
  addon.options.forEach((option, optionIndex) => {
    const nameEl = document.querySelector(`input[data-addon-index="${addonIndex}"][data-option-index="${optionIndex}"][data-field="name"]`);
    const customerPriceEl = document.querySelector(`input[data-addon-index="${addonIndex}"][data-option-index="${optionIndex}"][data-field="customerPrice"]`);
    const agentPriceEl = document.querySelector(`input[data-addon-index="${addonIndex}"][data-option-index="${optionIndex}"][data-field="agentPrice"]`);
    if (nameEl) option.name = nameEl.value;
    if (customerPriceEl) option.customerPrice = parseFloat(customerPriceEl.value) || 0;
    if (agentPriceEl) option.agentPrice = parseFloat(agentPriceEl.value) || 0;
  });
}

