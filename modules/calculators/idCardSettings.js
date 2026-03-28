// modules/calculators/idCardSettings.js
// ID Card settings panel functions — extracted from app.js
// Uses init(ctx) pattern.

import { saveSettingsScrolls, restoreSettingsScrolls } from '../utils/ui.js';

let _ctx = null;

export function initIdCardSettings(ctx) { _ctx = ctx; }

export function renderIDCardSettingsTable() {
  ensureIDCardDefaultAddons();
  let html = '';

  // --- Base Rates Table (Combined 1-Sided & 2-Sided) ---
  const isBaseEditing = _ctx.getEditState().base;
  html += `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h4 style="margin:0 0 4px 0;">Base Prices (Per Piece)</h4>
            <p style="margin:0; font-size: 13px; color: #9ca3af;">Manage base price tiers for different print sides and quantities.</p>
          </div>
          <div style="display:flex; gap:8px;">
            ${isBaseEditing ?
      `<button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="toggleIDCardEditMode('base', false)">Cancel</button>
               <button class="btn btn-sm btn-primary" style="width: auto; margin-top:0; padding: 8px 14px; font-size: 13px;" onclick="saveIDCardSettings('base')">Done</button>` :
      `<button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="toggleIDCardEditMode('base', true)">Edit</button>`
    }
          </div>
        </div>`;
  
  // Build table with both sides as columns
  html += `<div style="overflow-x: auto; width: 100%; border-radius: 6px; border: 1px solid var(--border-color); padding-bottom: 8px;">
          <table class="settings-table" style="min-width: max-content; width: 100%; border: none;">
            <thead>
              <tr>
                <th rowspan="2" style="vertical-align: middle;">Qty</th>
                <th rowspan="2" style="vertical-align: middle;">Type</th>
                <th colspan="2" style="text-align: center;">Price</th>
                ${isBaseEditing ? '<th rowspan="2" class="text-center" style="vertical-align: middle;">Actions</th>' : ''}
              </tr>
              <tr>
                <th style="text-align: center;">1 Side</th>
                <th style="text-align: center;">2 Side</th>
              </tr>
            </thead>
            <tbody>`;
  
  _ctx.getData().quantities.forEach((qty, index) => {
    const priceObj1Side = _ctx.getData().basePrice['1'][qty];
    const priceObj2Side = _ctx.getData().basePrice['2'][qty];
    
    // Customer Row
    html += `<tr data-idc-qty-row="${index}">`;
    html += `<td rowspan="2" style="position: relative; vertical-align: middle;"><strong>${qty} pcs</strong></td>`;
    html += `<td style="background: rgba(0,0,0,0.05); font-weight: 600; font-size: 11px;">Cust</td>`;
    
    // 1-Side Customer
    html += `<td style="background: rgba(0,0,0,0.05);">${isBaseEditing ? `<input type="number" step="0.01" value="${priceObj1Side.customerPrice.toFixed(2)}" placeholder="0.00" data-side="1" data-qty="${qty}" data-field="customerPrice" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px; width: 100%;">` : _ctx.formatCurrency(priceObj1Side.customerPrice)}</td>`;
    
    // 2-Side Customer
    html += `<td style="background: rgba(0,0,0,0.05);">${isBaseEditing ? `<input type="number" step="0.01" value="${priceObj2Side.customerPrice.toFixed(2)}" placeholder="0.00" data-side="2" data-qty="${qty}" data-field="customerPrice" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px; width: 100%;">` : _ctx.formatCurrency(priceObj2Side.customerPrice)}</td>`;
    
    if (isBaseEditing) {
      html += `<td rowspan="2" style="padding:4px; white-space:nowrap; vertical-align: middle;">
        <div style="display: flex; justify-content: center; align-items: center; gap: 4px; width: 100%; height: 100%;">
          <button class="btn btn-sm btn-secondary" style="padding:7px 10px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveIDCardQtyUp(${index})"><i class="fas fa-arrow-up"></i></button>
          <button class="btn btn-sm btn-secondary" style="padding:7px 10px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveIDCardQtyDown(${index})"><i class="fas fa-arrow-down"></i></button>
          <button class="btn btn-sm btn-danger" style="padding:7px 10px; border-radius:6px;" onclick="removeIDCardQtyByIndex(${index})"><i class="fas fa-trash"></i></button>
        </div>
      </td>`;
    }
    
    html += `</tr>`;
    
    // Agent Row
    html += `<tr data-idc-qty-row="${index}">`;
    html += `<td style="background: rgba(0,255,0,0.05); font-weight: 600; font-size: 11px;">Agent</td>`;
    
    // 1-Side Agent
    html += `<td style="background: rgba(0,255,0,0.05);">${isBaseEditing ? `<input type="number" step="0.01" value="${priceObj1Side.agentPrice.toFixed(2)}" placeholder="0.00" data-side="1" data-qty="${qty}" data-field="agentPrice" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px; width: 100%;">` : _ctx.formatCurrency(priceObj1Side.agentPrice)}</td>`;
    
    // 2-Side Agent
    html += `<td style="background: rgba(0,255,0,0.05);">${isBaseEditing ? `<input type="number" step="0.01" value="${priceObj2Side.agentPrice.toFixed(2)}" placeholder="0.00" data-side="2" data-qty="${qty}" data-field="agentPrice" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px; width: 100%;">` : _ctx.formatCurrency(priceObj2Side.agentPrice)}</td>`;
    
    html += `</tr>`;
  });

  html += `</tbody></table></div>`;

  // --- 2. Dynamic Add-on Groups Section ---
  html += `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; border-top: 2px solid var(--border-color); padding-top: 24px;">
                <div>
                  <h4 style="margin:0 0 4px 0;">Add-on Groups</h4>
                  <p style="margin:0; font-size: 13px; color: #9ca3af;">Manage available finishing options for ID cards.</p>
                </div>
        </div>
          <div style="border: 1px dashed #4b5563; border-radius: 10px; padding: 24px; margin-top: 16px; margin-bottom: 16px; text-align: center;">
              <button class="btn btn-primary" style="width:auto; margin:0 0 10px 0; padding: 10px 24px; font-size: 14px; display:inline-flex; align-items:center; gap:8px;" onclick="openAddIDCardAddonGroupModal()">
                <i class="fas fa-plus-circle"></i> Create New Add-on Group
              </button>
              <p style="margin:0; font-size: 12px; color:#6b7280;">Click here to create a new category of add-ons (e.g., "Lanyard", "Pen") which will appear as a new table below.</p>
          </div>`;

  _ctx.getAddons().forEach((addon, addonIndex) => {
    if (_ctx.getEditState().addons === undefined) _ctx.getEditState().addons = [];
    const isAddonEditing = _ctx.getEditState().addons[addonIndex];

    html += `<div class="settings-panel" style="margin-top: 16px; padding: 20px; border: 1px solid ${isAddonEditing ? '#22c55e' : 'var(--accent-color)'}; border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px;">
              ${isAddonEditing
        ? `<input type="text" value="${addon.name}" id="idcAddonNameInput_${addonIndex}" class="form-control" style="background-color: #f3f4f6; border: 1px solid #d1d5db; color: #1f2937; border-radius: 6px; padding: 8px 12px; font-size: 16px; font-weight: 600; max-width: 280px;">`
        : `<h5 style="margin:0; font-size:16px; font-weight:600;">${addon.name}</h5>`}
              <div class="action-buttons" style="display:flex; gap:8px; flex-shrink:0;">
                ${isAddonEditing
          ? `<button class="btn btn-sm btn-secondary" style="padding: 7px 12px; font-size:13px;" onclick="addIDCardAddonOption('add', ${addonIndex})">+ Add Option</button>
                     <button class="btn btn-sm btn-danger" style="padding: 7px 12px; font-size:13px;" onclick="addIDCardAddonType('remove', ${addonIndex})">Delete Type</button>
                     <button class="btn btn-sm btn-secondary" style="padding: 7px 12px; font-size:13px;" onclick="toggleIDCardEditMode('addons', false, ${addonIndex})">Cancel</button>
                     <button class="btn btn-sm btn-primary" style="width:auto; margin-top:0; padding: 7px 14px; font-size:13px;" onclick="saveIDCardSettings('addons', ${addonIndex})">Done</button>`
          : `<button class="btn btn-sm btn-secondary" style="padding: 7px 14px; font-size:13px;" onclick="toggleIDCardEditMode('addons', true, ${addonIndex})">Edit</button>`}
              </div>
            </div>
            <table class="settings-table" style="table-layout: fixed; width: 100%;">
              <thead>
                <tr>
                  <th style="width: 30%;">Option Name</th>
                  <th style="width: 20%;">Type</th>
                  <th style="width: 25%;">Price</th>
                  ${isAddonEditing ? `<th style="width: 25%;">Actions</th>` : ''}
                </tr>
              </thead>
              <tbody>
                ${addon.options.map((option, optionIndex) => {
                  const agentCost = option.agentPrice !== undefined ? option.agentPrice : option.cost;
                  return `
                    <tr data-idc-addon-opt="${addonIndex}-${optionIndex}" class="idc-cust-row">
                      <td rowspan="2">${isAddonEditing ? `<input type="text" value="${option.name}" data-field="name" data-addon="${addonIndex}" data-option="${optionIndex}" class="form-control" style="background-color: #f3f4f6; border: 1px solid #d1d5db; color: #1f2937; border-radius: 6px; padding: 8px; width: 100%; font-weight: 600;">` : option.name}</td>
                      <td style="background: rgba(0,0,0,0.05); font-weight: 600; font-size: 11px;">Cust</td>
                      <td style="background: rgba(0,0,0,0.05);">${isAddonEditing ? `<input type="number" step="0.01" value="${option.cost.toFixed(2)}" placeholder="0.00" data-field="cost" data-addon="${addonIndex}" data-option="${optionIndex}" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px; width: 100%;">` : (option.cost > 0 ? `+ ${_ctx.formatCurrency(option.cost)}` : (option.cost < 0 ? _ctx.formatCurrency(option.cost) : _ctx.formatCurrency(0)))}</td>
                      ${isAddonEditing ? `<td rowspan="2" style="padding:4px; white-space:nowrap; vertical-align: middle;">
                        <div style="display: flex; justify-content: center; align-items: center; gap: 4px; width: 100%; height: 100%;">
                          <button class="btn btn-sm btn-secondary" style="padding:7px 10px; margin-right:3px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveIDCardAddonOptionUp(${addonIndex}, ${optionIndex})"><i class="fas fa-arrow-up"></i></button>
                          <button class="btn btn-sm btn-secondary" style="padding:7px 10px; margin-right:3px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveIDCardAddonOptionDown(${addonIndex}, ${optionIndex})"><i class="fas fa-arrow-down"></i></button>
                          <button class="btn btn-sm btn-danger" style="padding:7px 10px; border-radius:6px;" onclick="addIDCardAddonOption('remove', ${addonIndex}, ${optionIndex})"><i class="fas fa-trash"></i></button>
                        </div>
                      </td>` : ''}
                    </tr>
                    <tr data-idc-addon-opt="${addonIndex}-${optionIndex}">
                      <td style="background: rgba(0,255,0,0.05); font-weight: 600; font-size: 11px;">Agent</td>
                      <td style="background: rgba(0,255,0,0.05);">${isAddonEditing ? `<input type="number" step="0.01" value="${agentCost.toFixed(2)}" placeholder="0.00" data-field="agentPrice" data-addon="${addonIndex}" data-option="${optionIndex}" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px; width: 100%;">` : (agentCost > 0 ? `+ ${_ctx.formatCurrency(agentCost)}` : (agentCost < 0 ? _ctx.formatCurrency(agentCost) : _ctx.formatCurrency(0)))}</td>
                    </tr>
                          `;
                }).join('')}
              </tbody>
            </table>
            </div>`;
  });

  { const _s = saveSettingsScrolls(); document.getElementById("settingsTableDiv").innerHTML = html; restoreSettingsScrolls(_s); }
}

export function toggleIDCardEditMode(section, isEditing, index = null) {
  if (isEditing) {
    _ctx.setOriginalData({
      basePrice: JSON.parse(JSON.stringify(_ctx.getData().basePrice)),
      punchHolePrice: JSON.parse(JSON.stringify(_ctx.getData().punchHolePrice)),
      addons: JSON.parse(JSON.stringify(_ctx.getAddons()))
    });
  } else {
    if (_ctx.getOriginalData().basePrice) {
      _ctx.getData().basePrice = JSON.parse(JSON.stringify(_ctx.getOriginalData().basePrice));
      _ctx.getData().punchHolePrice = JSON.parse(JSON.stringify(_ctx.getOriginalData().punchHolePrice));
      _ctx.setAddons(JSON.parse(JSON.stringify(_ctx.getOriginalData().addons)));
    }
  }

  if (section === 'addons') {
    if (!_ctx.getEditState().addons) _ctx.getEditState().addons = [];
    _ctx.getEditState().addons[index] = isEditing;
  } else {
    _ctx.getEditState()[section] = isEditing;
  }
  renderIDCardSettingsTable();
}

export function saveIDCardSettings(section, addonIndex = null) {
  _ctx.setPendingCallback(() => _confirmSave_saveIDCardSettings(section, addonIndex));
}

function _confirmSave_saveIDCardSettings(section, index) {

  if (section === 'base') {
    // Update all prices for both 1-sided and 2-sided printing
    _ctx.getData().quantities.forEach(qty => {
      ['1', '2'].forEach(side => {
        const custInput = document.querySelector(`input[data-side="${side}"][data-qty="${qty}"][data-field="customerPrice"]`);
        const agentInput = document.querySelector(`input[data-side="${side}"][data-qty="${qty}"][data-field="agentPrice"]`);
        if (custInput) _ctx.getData().basePrice[side][qty].customerPrice = parseFloat(custInput.value) || 0;
        if (agentInput) _ctx.getData().basePrice[side][qty].agentPrice = parseFloat(agentInput.value) || 0;
      });
    });
  } else if (section === 'addons') {
    const addon = _ctx.getAddons()[addonIndex];
    addon.options.forEach((option, optionIndex) => {
      const nameInput = document.querySelector(`input[data-addon="${addonIndex}"][data-option="${optionIndex}"][data-field="name"]`);
      const costInput = document.querySelector(`input[data-addon="${addonIndex}"][data-option="${optionIndex}"][data-field="cost"]`);
      const agentCostInput = document.querySelector(`input[data-addon="${addonIndex}"][data-option="${optionIndex}"][data-field="agentPrice"]`);

      if (nameInput) option.name = nameInput.value;
      if (costInput) option.cost = parseFloat(costInput.value) || 0;
      if (agentCostInput) option.agentPrice = parseFloat(agentCostInput.value) || 0;
    });
    syncIDCardLegacyPunchHolePriceFromAddons();
  }
  _ctx.closeSaveConfirmationModal();
  _ctx.showToast('ID Card settings saved successfully!');
  _ctx.setOriginalData({});
  if (section === 'addons') {
    _ctx.getEditState().addons[addonIndex] = false;
  } else {
    _ctx.getEditState()[section] = false;
  }
  renderIDCardSettingsTable();
}

export function moveIDCardQtyUp(index) {
  if (index > 0) {
    const quantities = _ctx.getData().quantities;
    [quantities[index - 1], quantities[index]] = [quantities[index], quantities[index - 1]];
    renderIDCardSettingsTable();
    _ctx.highlightMoveRow('data-idc-qty-row', index - 1);
  }
}

export function moveIDCardQtyDown(index) {
  const quantities = _ctx.getData().quantities;
  if (index < quantities.length - 1) {
    [quantities[index], quantities[index + 1]] = [quantities[index + 1], quantities[index]];
    renderIDCardSettingsTable();
    _ctx.highlightMoveRow('data-idc-qty-row', index + 1);
  }
}

export function removeIDCardQtyByIndex(index) {
  const qty = _ctx.getData().quantities[index];
  _ctx.showDeleteConfirmationModal(
    'Delete Quantity Tier?',
    `Are you sure you want to delete the "${qty} pcs" tier? This action cannot be undone.`,
    () => {
      _ctx.getData().quantities.splice(index, 1);
      delete _ctx.getData().basePrice['1'][qty];
      delete _ctx.getData().basePrice['2'][qty];
      _ctx.showToast(`Quantity tier "${qty} pcs" deleted.`);
      renderIDCardSettingsTable();
    }
  );
}

export function addIDCardAddonType(action, addonIndex = null) {
  if (action === 'add') {
    const name = prompt("Enter new add-on group name (e.g., Lanyard):");
    if (!name || name.trim() === '') return;
    _ctx.getAddons().push({
      name: name.trim(),
      type: 'radio',
      options: [{ name: "None", cost: 0.00, agentPrice: 0.00 }]
    });
    _ctx.getEditState().addons = _ctx.getAddons().map(() => false);
  } else if (action === 'remove' && addonIndex !== null) {
    const addonName = _ctx.getAddons()[addonIndex].name;
    _ctx.showDeleteConfirmationModal(
      "Delete Add-on Group?",
      `Are you sure you want to delete the entire '${addonName}' add-on group?`,
      () => {
        _ctx.getAddons().splice(addonIndex, 1);
        if (_ctx.getEditState().addons) _ctx.getEditState().addons.splice(addonIndex, 1);
        renderIDCardSettingsTable();
        _ctx.showToast(`Add-on group '${addonName}' deleted.`);
      }
    );
  }
  renderIDCardSettingsTable();
}

export function addIDCardAddonOption(action, addonIndex, optionIndex = null) {
  if (action === 'add') {
    _ctx.getAddons()[addonIndex].options.push({ name: "New Option", cost: 0.00, agentPrice: 0.00 });
  } else if (action === 'remove' && optionIndex !== null) {
    const option = _ctx.getAddons()[addonIndex].options[optionIndex];
    _ctx.showDeleteConfirmationModal(
      "Delete Option?",
      `Are you sure you want to delete the option "${option.name}"?`,
      () => {
        _ctx.getAddons()[addonIndex].options.splice(optionIndex, 1);
        renderIDCardSettingsTable();
      }
    );
  }
  renderIDCardSettingsTable();
}

export function moveIDCardAddonOptionUp(addonIndex, optionIndex) {
  if (optionIndex > 0) {
    const options = _ctx.getAddons()[addonIndex].options;
    [options[optionIndex], options[optionIndex - 1]] = [options[optionIndex - 1], options[optionIndex]];
    renderIDCardSettingsTable();
    _ctx.highlightMoveRow('data-idc-addon-opt', `${addonIndex}-${optionIndex - 1}`);
  }
}

export function moveIDCardAddonOptionDown(addonIndex, optionIndex) {
  const options = _ctx.getAddons()[addonIndex].options;
  if (optionIndex < options.length - 1) {
    [options[optionIndex], options[optionIndex + 1]] = [options[optionIndex + 1], options[optionIndex]];
    renderIDCardSettingsTable();
    _ctx.highlightMoveRow('data-idc-addon-opt', `${addonIndex}-${optionIndex + 1}`);
  }
}

export function openAddIDCardAddonGroupModal() {
  const input = document.getElementById('newIDCardAddonGroupNameInput');
  input.value = '';
  const modal = document.getElementById('addIDCardAddonGroupModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => input.focus(), 100);
}

export function closeAddIDCardAddonGroupModal() {
  const modal = document.getElementById('addIDCardAddonGroupModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

export function confirmAddIDCardAddonGroup() {
  const name = document.getElementById('newIDCardAddonGroupNameInput').value.trim();
  if (!name) { _ctx.showToast('Please enter a group name.', 'warning'); return; }
  const newAddon = { name: name, options: [] };
  const defaultOption = { name: "Default Option", cost: 0.00, agentPrice: 0.00 };
  newAddon.options.push(defaultOption);
  _ctx.getAddons().push(newAddon);
  _ctx.getEditState().addons = _ctx.getAddons().map(() => false);
  closeAddIDCardAddonGroupModal();
  _ctx.showToast(`Add-on group "${name}" created.`);
  renderIDCardSettingsTable();

}

