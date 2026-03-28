// modules/calculators/businessCardSettings.js
// Business Card settings panel functions — extracted from app.js
// Uses init(ctx) pattern.

import { saveSettingsScrolls, restoreSettingsScrolls } from '../utils/ui.js';

let _ctx = null;

export function initBusinessCardSettings(ctx) { _ctx = ctx; }

export function renderBusinessCardSettingsTable() {
  console.log('Rendering Business Card Settings Table');
  let html = '';
  const isMaterialsEditing = _ctx.getEditState().materials;
  // Materials Table
  html += `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h4 style="margin:0 0 4px 0;">Material Prices (Per Box)</h4>
            <p style="margin:0; font-size: 13px; color: #9ca3af;">Manage base prices for different materials and quantities.</p>
          </div>
          <div style="display:flex; gap:8px;">
            ${isMaterialsEditing ?
      `<button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="addBusinessCardQty()">+ Add Qty</button>
                 <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="addBusinessCardMaterialInline()">+ Add Material</button>
                 <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="cancelBusinessCardEdit('materials')">Cancel</button>
                 <button class="btn btn-sm btn-primary" style="width: auto; margin-top:0; padding: 8px 14px; font-size: 13px;" onclick="saveBusinessCardSettings('materials')">Done</button>` :
      `<button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="toggleBusinessCardEditMode('materials', true)">Edit</button>`
    }
          </div>
        </div>`;
  html += `<div style="overflow-x: auto; width: 100%; border-radius: 6px; border: 1px solid var(--border-color); padding-bottom: 8px;">
          <table class="settings-table" style="min-width: max-content; width: 100%; border: none;"><thead><tr><th rowspan="2">Material</th><th rowspan="2">Type</th>`;
  _ctx.getData().quantities.forEach((q, index) => {
    html += `<th colspan="2" class="text-center" style="position: relative;">
                     ${q.label}
                     ${isMaterialsEditing ? `<button class="btn btn-sm btn-danger" style="position: absolute; right: 4px; top: 4px; padding: 2px 6px; border-radius: 4px; font-size: 10px;" onclick="removeBusinessCardQty(${index})"><i class="fas fa-trash"></i></button>` : ''}
                   </th>`;
  });
  if (isMaterialsEditing) {
    html += `<th rowspan="2" class="text-center">Actions</th>`;
  }
  html += `</tr><tr>`;
  _ctx.getData().quantities.forEach(() => {
    html += `<th>1-Side</th><th>2-Side</th>`;
  });
  html += `</tr></thead><tbody>`;
  _ctx.getData().materials.forEach((mat, matIndex) => {
    // Customer Row
    html += `<tr data-bc-mat-row="${matIndex}">`;
    if (isMaterialsEditing) {
       html += `<td style="padding:4px;" rowspan="2"><input type="text" value="${mat.name}" data-mat-index="${matIndex}" data-field="name" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align:center; font-weight:600;"></td>`;
    } else {
       html += `<td rowspan="2"><strong>${mat.name}</strong></td>`;
    }
    
    html += `<td style="background: rgba(0,0,0,0.05); font-weight: 600; font-size: 11px;">Cust</td>`;

    _ctx.getData().quantities.forEach((q, index) => {
      const price1 = mat.prices.customerPrice.p1[index] || 0;
      const price2 = mat.prices.customerPrice.p2[index] || 0;

      html += isMaterialsEditing ? `<td style="padding:4px; background: rgba(0,0,0,0.05);"><input type="number" step="0.01" value="${price1.toFixed(2)}" data-mat-index="${matIndex}" data-index="${index}" data-side="p1" data-target="customerPrice" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 6px; width: 100%; box-sizing: border-box;"></td>` : `<td style="background: rgba(0,0,0,0.05);">${_ctx.formatCurrency(price1)}</td>`;
      html += isMaterialsEditing ? `<td style="padding:4px; background: rgba(0,0,0,0.05);"><input type="number" step="0.01" value="${price2.toFixed(2)}" data-mat-index="${matIndex}" data-index="${index}" data-side="p2" data-target="customerPrice" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 6px; width: 100%; box-sizing: border-box;"></td>` : `<td style="background: rgba(0,0,0,0.05);">${_ctx.formatCurrency(price2)}</td>`;
    });

    if (isMaterialsEditing) {
      html += `<td style="padding:4px; white-space:nowrap; vertical-align: middle;" rowspan="2">
              <div style="display: flex; justify-content: center; align-items: center; gap: 4px; width: 100%; height: 100%;">
              <button class="btn btn-sm btn-secondary" style="padding:7px 10px; margin-right:3px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveBusinessCardMaterialUp(${matIndex})"><i class="fas fa-arrow-up"></i></button>
              <button class="btn btn-sm btn-secondary" style="padding:7px 10px; margin-right:3px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveBusinessCardMaterialDown(${matIndex})"><i class="fas fa-arrow-down"></i></button>
              <button class="btn btn-sm btn-danger" style="padding:7px 10px; border-radius:6px;" onclick="removeBusinessCardMaterialByIndex(${matIndex})"><i class="fas fa-trash"></i></button>
              </div>
            </td>`;
    }
    html += `</tr>`;

    // Agent Row
    html += `<tr data-bc-mat-row="${matIndex}">`;
    html += `<td style="background: rgba(0,255,0,0.05); font-weight: 600; font-size: 11px;">Agent</td>`;

    _ctx.getData().quantities.forEach((q, index) => {
      const price1 = mat.prices.agentPrice.p1[index] || 0;
      const price2 = mat.prices.agentPrice.p2[index] || 0;

      html += isMaterialsEditing ? `<td style="padding:4px; background: rgba(0,255,0,0.05);"><input type="number" step="0.01" value="${price1.toFixed(2)}" data-mat-index="${matIndex}" data-index="${index}" data-side="p1" data-target="agentPrice" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 6px; width: 100%; box-sizing: border-box;"></td>` : `<td style="background: rgba(0,255,0,0.05);">${_ctx.formatCurrency(price1)}</td>`;
      html += isMaterialsEditing ? `<td style="padding:4px; background: rgba(0,255,0,0.05);"><input type="number" step="0.01" value="${price2.toFixed(2)}" data-mat-index="${matIndex}" data-index="${index}" data-side="p2" data-target="agentPrice" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 6px; width: 100%; box-sizing: border-box;"></td>` : `<td style="background: rgba(0,255,0,0.05);">${_ctx.formatCurrency(price2)}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table></div></div>`;
  // Addons Section
  html += `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; border-top: 2px solid var(--border-color); padding-top: 24px;">
                <div>
                  <h4 style="margin:0 0 4px 0;">Finishing Add-ons</h4>
                  <p style="margin:0; font-size: 13px; color: #9ca3af;">Manage available finishing options for business cards.</p>
                </div>
        </div>
          <div style="border: 1px dashed #4b5563; border-radius: 10px; padding: 24px; margin-top: 16px; margin-bottom: 16px; text-align: center;">
              <button class="btn btn-primary" style="width:auto; margin:0 0 10px 0; padding: 10px 24px; font-size: 14px; display:inline-flex; align-items:center; gap:8px;" onclick="openAddBusinessCardAddonGroupModal()">
                <i class="fas fa-plus-circle"></i> Create New Add-on Group
              </button>
              <p style="margin:0; font-size: 12px; color:#6b7280;">Click here to create a new category of add-ons (e.g., "Lamination", "Round Corner") which will appear as a new table below.</p>
          </div>`;

  _ctx.getData().addons.forEach((addon, addonIndex) => {
    const isAddonEditing = _ctx.getEditState().addons[addonIndex];
    html += `<div class="settings-panel" style="margin-top: 16px; padding: 20px; border: 1px solid ${isAddonEditing ? '#22c55e' : 'var(--accent-color)'}; border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px;">
              ${isAddonEditing
        ? `<input type="text" value="${addon.name}" id="bcAddonNameInput_${addonIndex}" class="form-control" style="background-color: #f3f4f6; border: 1px solid #d1d5db; color: #1f2937; border-radius: 6px; padding: 8px 12px; font-size: 16px; font-weight: 600; max-width: 280px;">`
        : `<h5 style="margin:0; font-size:16px; font-weight:600;">${addon.name}</h5>`}
              <div class="action-buttons" style="display:flex; gap:8px; flex-shrink:0;">
                ${isAddonEditing
        ? `<button class="btn btn-sm btn-secondary" style="padding: 7px 12px; font-size:13px;" onclick="addBusinessCardAddonOptionInline(${addonIndex})">+ Add Option</button>
                     <button class="btn btn-sm btn-danger" style="padding: 7px 12px; font-size:13px;" onclick="removeBusinessCardAddonType(${addonIndex})">Delete Type</button>
                     <button class="btn btn-sm btn-secondary" style="padding: 7px 12px; font-size:13px;" onclick="cancelBusinessCardEdit('addons', ${addonIndex})">Cancel</button>
                     <button class="btn btn-sm btn-primary" style="width:auto; margin-top:0; padding: 7px 14px; font-size:13px;" onclick="saveBusinessCardSettings('addons', ${addonIndex})">Done</button>`
        : `<button class="btn btn-sm btn-secondary" style="padding: 7px 14px; font-size:13px;" onclick="toggleBusinessCardEditMode('addons', true, ${addonIndex})">Edit</button>`}
              </div>
            </div>
            <table class="settings-table" style="table-layout: fixed; width: 100%;">
              <thead>
                <tr>
                  <th style="width: 40%;">Option</th>
                  <th style="width: 30%;">Cust Price</th>
                  <th style="width: 30%;">Agent Price</th>
                  ${isAddonEditing ? '<th class="text-center" style="width: 140px;">Actions</th>' : ''}
                </tr>
              </thead>
              <tbody>`;

    addon.options.forEach((option, optionIndex) => {
      html += `<tr data-bc-addon-opt="${addonIndex}-${optionIndex}">`;
      if (isAddonEditing) {
        html += `<td style="padding:4px;"><input type="text" value="${option.name || option.label}" data-addon-index="${addonIndex}" data-option-index="${optionIndex}" data-field="name" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align:center;"></td>`;
        html += `<td style="padding:4px;"><input type="number" step="0.01" value="${option.customerPrice.toFixed(2)}" data-addon-index="${addonIndex}" data-option-index="${optionIndex}" data-field="customerPrice" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align: center;"></td>`;
        html += `<td style="padding:4px;"><input type="number" step="0.01" value="${option.agentPrice.toFixed(2)}" data-addon-index="${addonIndex}" data-option-index="${optionIndex}" data-field="agentPrice" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align: center; background: rgba(0,255,0,0.05);"></td>`;
        html += `<td style="padding:4px; white-space:nowrap; vertical-align: middle;">
                <div style="display: flex; justify-content: center; align-items: center; gap: 4px; width: 100%; height: 100%;">
                <button class="btn btn-sm btn-secondary" style="padding:7px 10px; margin-right:3px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveBusinessCardAddonOptionUp(${addonIndex},${optionIndex})"><i class="fas fa-arrow-up"></i></button>
                <button class="btn btn-sm btn-secondary" style="padding:7px 10px; margin-right:3px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveBusinessCardAddonOptionDown(${addonIndex},${optionIndex})"><i class="fas fa-arrow-down"></i></button>
                <button class="btn btn-sm btn-danger" style="padding:7px 10px; border-radius:6px;" onclick="removeBusinessCardAddonOption(${addonIndex},${optionIndex})"><i class="fas fa-trash"></i></button>
                </div>
              </td>`;
      } else {
        html += `<td>${option.name || option.label}</td>`;
        html += `<td>${option.customerPrice > 0 ? "+" + _ctx.formatCurrency(option.customerPrice) : (option.customerPrice < 0 ? _ctx.formatCurrency(option.customerPrice) : "0.00")}</td>`;
        html += `<td>${option.agentPrice > 0 ? "+" + _ctx.formatCurrency(option.agentPrice) : (option.agentPrice < 0 ? _ctx.formatCurrency(option.agentPrice) : "0.00")}</td>`;
      }
      html += `</tr>`;
    });
    html += `</tbody></table></div>`;
  });
  { const _s = saveSettingsScrolls(); document.getElementById("settingsTableDiv").innerHTML = html; restoreSettingsScrolls(_s); }
}

export function openAddBusinessCardAddonGroupModal() {
  const input = document.getElementById('newBCAddonGroupNameInput');
  input.value = '';
  const modal = document.getElementById('addBusinessCardAddonGroupModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => input.focus(), 100);
}

export function closeAddBusinessCardAddonGroupModal() {
  const modal = document.getElementById('addBusinessCardAddonGroupModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

export function confirmAddBusinessCardAddonGroup() {
  const name = document.getElementById('newBCAddonGroupNameInput').value.trim();
  if (!name) { _ctx.showToast('Please enter a group name.', 'warning'); return; }
  const newAddon = { name: name, options: [] };
  // Default empty option since BC options aren't size-dependent like invitation cards
  const defaultOption = { name: 'None', customerPrice: 0, agentPrice: 0 };
  newAddon.options.push(defaultOption);
  _ctx.getData().addons.push(newAddon);
  _ctx.getEditState().addons = _ctx.getData().addons.map(() => false);
  closeAddBusinessCardAddonGroupModal();
  _ctx.showToast(`Add - on group "${name}" created.`);
  renderBusinessCardSettingsTable();
}

export function addBusinessCardAddonOptionInline(addonIndex) {
  preserveBusinessCardAddonInputs(addonIndex);
  const newOption = { name: 'New Option', customerPrice: 0, agentPrice: 0 };
  if (_ctx.getData().addons && _ctx.getData().addons[addonIndex])
    _ctx.getData().addons[addonIndex].options.push(newOption);
  renderBusinessCardSettingsTable();
}

export function moveBusinessCardAddonOptionUp(addonIndex, optionIndex) {
  preserveBusinessCardAddonInputs(addonIndex);
  if (optionIndex > 0) {
    if (_ctx.getData().addons && _ctx.getData().addons[addonIndex]) {
      const options1 = _ctx.getData().addons[addonIndex].options;
      [options1[optionIndex], options1[optionIndex - 1]] = [options1[optionIndex - 1], options1[optionIndex]];
    }
    renderBusinessCardSettingsTable();
    _ctx.highlightMoveRow('data-bc-addon-opt', `${addonIndex}-${optionIndex - 1}`);
  }
}

export function moveBusinessCardAddonOptionDown(addonIndex, optionIndex) {
  preserveBusinessCardAddonInputs(addonIndex);
  if (_ctx.getData().addons[addonIndex] && optionIndex < _ctx.getData().addons[addonIndex].options.length - 1) {
    if (_ctx.getData().addons && _ctx.getData().addons[addonIndex]) {
      const options1 = _ctx.getData().addons[addonIndex].options;
      [options1[optionIndex], options1[optionIndex + 1]] = [options1[optionIndex + 1], options1[optionIndex]];
    }
    renderBusinessCardSettingsTable();
    _ctx.highlightMoveRow('data-bc-addon-opt', `${addonIndex}-${optionIndex + 1}`);
  }
}

function preserveBusinessCardAddonInputs(addonIndex) {
  const addonsArr = _ctx.getData().addons;
  const addon = addonsArr[addonIndex];

  const groupNameInput = document.getElementById(`bcAddonNameInput_${addonIndex}`);
  if (groupNameInput) {
    addon.name = groupNameInput.value.trim() || addon.name;
  }

  addon.options.forEach((option, optionIndex) => {
    const nameEl = document.querySelector(`input[data-addon-index="${addonIndex}"][data-option-index="${optionIndex}"][data-field="name"]`);
    if (nameEl) {
      if (option.hasOwnProperty('label')) {
        option.label = nameEl.value;
        option.value = nameEl.value.toLowerCase().replace(/\s+/g, '');
      } else {
        option.name = nameEl.value;
      }
    }
    const customerCostEl = document.querySelector(`input[data-addon-index="${addonIndex}"][data-option-index="${optionIndex}"][data-field="customerPrice"]`);
    if (customerCostEl) option.customerPrice = parseFloat(customerCostEl.value) || 0;

    const agentCostEl = document.querySelector(`input[data-addon-index="${addonIndex}"][data-option-index="${optionIndex}"][data-field="agentPrice"]`);
    if (agentCostEl) option.agentPrice = parseFloat(agentCostEl.value) || 0;
  });
}

export function toggleBusinessCardEditMode(section, isEditing, index = null) {
  if (isEditing) {
    _ctx.setOriginalData(JSON.parse(JSON.stringify(_ctx.getData())));
  }
  if (section === 'materials') {
    _ctx.getEditState().materials = isEditing;
  } else if (section === 'addons') {
    _ctx.getEditState().addons[index] = isEditing;
  }
  renderBusinessCardSettingsTable();
}

export function cancelBusinessCardEdit(section, index = null) {
  _ctx.replaceData(JSON.parse(JSON.stringify(_ctx.getOriginalData())));
  toggleBusinessCardEditMode(section, false, index);
}

export function saveBusinessCardSettings(section, index = null) {
  _ctx.setPendingCallback(() => _confirmSave_saveBusinessCardSettings(section, index));
}

function _confirmSave_saveBusinessCardSettings(section, index) {

  if (section === 'materials') {
    document.querySelectorAll('#settingsTableDiv input[data-mat-index]').forEach(input => {
      const matIndex = parseInt(input.dataset.matIndex);
      if (input.dataset.field === 'name') {
        _ctx.getData().materials[matIndex].name = input.value;
      } else {
        const index = parseInt(input.dataset.index);
        const side = input.dataset.side;
        const target = input.dataset.target; // 'customerPrice' or 'agentPrice'
        const value = parseFloat(input.value);

        if (!_ctx.getData().materials[matIndex].prices[target]) {
             // Initialize if missing
             _ctx.getData().materials[matIndex].prices[target] = { p1: [], p2: [] };
        }

        if (side === 'p1') _ctx.getData().materials[matIndex].prices[target].p1[index] = value;
        if (side === 'p2') _ctx.getData().materials[matIndex].prices[target].p2[index] = value;
      }
    });
    _ctx.closeSaveConfirmationModal();
    _ctx.showToast('Business Card materials saved successfully!');
    toggleBusinessCardEditMode('materials', false);
  } else if (section === 'addons') {
    const addon = _ctx.getData().addons[index];
    const groupNameInput = document.getElementById(`bcAddonNameInput_${index}`);
    if (groupNameInput) {
      addon.name = groupNameInput.value.trim() || addon.name;
    }
    addon.options.forEach((option, optionIndex) => {
      const nameInput = document.querySelector(`input[data-addon-index="${index}"][data-option-index="${optionIndex}"][data-field="name"]`);
      const customerPriceInput = document.querySelector(`input[data-addon-index="${index}"][data-option-index="${optionIndex}"][data-field="customerPrice"]`);
      const agentPriceInput = document.querySelector(`input[data-addon-index="${index}"][data-option-index="${optionIndex}"][data-field="agentPrice"]`);

      if (option.hasOwnProperty('label')) {
        option.label = nameInput.value;
        option.value = nameInput.value.toLowerCase().replace(/\s+/g, '');
      } else {
        option.name = nameInput.value;
      }
      if (customerPriceInput) option.customerPrice = parseFloat(customerPriceInput.value);
      if (agentPriceInput) option.agentPrice = parseFloat(agentPriceInput.value);
    });
    _ctx.closeSaveConfirmationModal();
    _ctx.showToast(`'${addon.name}' settings saved successfully!`);
    toggleBusinessCardEditMode('addons', false, index);
  }
}

export function addBusinessCardQty() {
  const input = document.getElementById('newQtyNameInput');
  input.value = '';
  const modal = document.getElementById('addQtyModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => input.focus(), 100);
}

export function closeAddQtyModal() {
  const modal = document.getElementById('addQtyModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

export function confirmAddBusinessCardQty() {
  const label = document.getElementById('newQtyNameInput').value.trim();
  if (!label) { _ctx.showToast('Please enter a quantity name.'); return; }

  // Try to parse a numeric value from the label as the 'value' key
  let numericValue = parseInt(label.replace(/[^0-9]/g, ''), 10);
  if (isNaN(numericValue) || numericValue <= 0) {
    // Fallback to highest existing + 1 to avoid conflicts
    let maxVal = 0;
    _ctx.getData().quantities.forEach(q => { if (q.qty > maxVal) maxVal = q.qty; });
    numericValue = maxVal + 1;
  }

  // Ensure strictly unique numeric value
  while (_ctx.getData().quantities.some(q => q.qty === numericValue)) {
    numericValue++;
  }

  _ctx.getData().quantities.push({ label: label, qty: numericValue });

  _ctx.getData().materials.forEach(mat => {
    mat.prices.customerPrice.p1.push(0);
    mat.prices.customerPrice.p2.push(0);
    mat.prices.agentPrice.p1.push(0);
    mat.prices.agentPrice.p2.push(0);
  });

  renderBusinessCardSettingsTable();
  closeAddQtyModal();
  _ctx.showToast(`Quantity '${label}' added successfully.`);
}

export function removeBusinessCardQty(index) {
  const qtyLabel = _ctx.getData().quantities[index].label;
  const qtyValue = _ctx.getData().quantities[index].qty;
  if (_ctx.showDeleteConfirmationModal(
    "Delete Quantity?",
    `Are you sure you want to remove the '${qtyLabel}' column ? `,
    () => {
      _ctx.getData().quantities.splice(index, 1);
      _ctx.getData().materials.forEach(mat => {
        mat.prices.customerPrice.p1.splice(index, 1);
        mat.prices.customerPrice.p2.splice(index, 1);
        mat.prices.agentPrice.p1.splice(index, 1);
        mat.prices.agentPrice.p2.splice(index, 1);
      });
      renderBusinessCardSettingsTable();
      _ctx.showToast("Quantity column removed.");
    }
  ));
}

export function addBusinessCardMaterial() {
  const name = prompt("Enter new material name:");
  if (!name) return;
  const newMaterial = {
    name: name,
    prices: {
      customerPrice: { p1: [], p2: [] },
      agentPrice: { p1: [], p2: [] }
    }
  };
  _ctx.getData().quantities.forEach(q => {
    newMaterial.prices.customerPrice.p1.push(0);
    newMaterial.prices.customerPrice.p2.push(0);
    newMaterial.prices.agentPrice.p1.push(0);
    newMaterial.prices.agentPrice.p2.push(0);
  });
  _ctx.getData().materials.push(newMaterial);
  renderBusinessCardSettingsTable();
}

export function removeBusinessCardMaterialByIndex(index) {
  _ctx.showDeleteConfirmationModal(
    "Delete Material?",
    `Are you sure you want to remove '${_ctx.getData().materials[index].name}' ? `,
    () => {
      _ctx.getData().materials.splice(index, 1);
      renderBusinessCardSettingsTable();
      _ctx.showToast("Material removed.");
    }
  );
}

export function moveBusinessCardMaterialUp(index) {
  if (index > 0) {
    [_ctx.getData().materials[index], _ctx.getData().materials[index - 1]] = [_ctx.getData().materials[index - 1], _ctx.getData().materials[index]];
    renderBusinessCardSettingsTable();
    _ctx.highlightMoveRow('data-bc-mat-row', index - 1);
  }
}

export function moveBusinessCardMaterialDown(index) {
  if (index < _ctx.getData().materials.length - 1) {
    [_ctx.getData().materials[index], _ctx.getData().materials[index + 1]] = [_ctx.getData().materials[index + 1], _ctx.getData().materials[index]];
    renderBusinessCardSettingsTable();
    _ctx.highlightMoveRow('data-bc-mat-row', index + 1);
  }
}

export function addBusinessCardMaterialInline() {
  const newMaterial = {
    name: 'New Material',
    prices: {
      customerPrice: { p1: [], p2: [] },
      agentPrice: { p1: [], p2: [] }
    }
  };
  _ctx.getData().quantities.forEach(q => {
    newMaterial.prices.customerPrice.p1.push(0);
    newMaterial.prices.customerPrice.p2.push(0);
    newMaterial.prices.agentPrice.p1.push(0);
    newMaterial.prices.agentPrice.p2.push(0);
  });
  _ctx.getData().materials.push(newMaterial);
  renderBusinessCardSettingsTable();
}

export function removeBusinessCardMaterial() {
  const options = _ctx.getData().materials.map((m, i) => `${i + 1}: ${m.name} `).join('\n');
  const choice = prompt(`Enter the number of the material to remove: \n${options} `);
  const index = parseInt(choice) - 1;
  if (!isNaN(index) && index >= 0 && index < _ctx.getData().materials.length) {
    _ctx.showDeleteConfirmationModal(
      "Delete Material?",
      `Are you sure you want to remove '${_ctx.getData().materials[index].name}' ? `,
      () => {
        _ctx.getData().materials.splice(index, 1);
        renderBusinessCardSettingsTable();
        _ctx.showToast("Material removed.");
      }
    );
  } else {
    _ctx.showToast("Invalid selection.");
  }
}

export function addBusinessCardAddonType() {
  const name = prompt("Enter new add-on type name (e.g., Hot Stamping):");
  if (!name) return;
  _ctx.getData().addons.push({
    name: name,
    options: [{
      name: 'None',
      customerPrice: 0,
      agentPrice: 0
    }]
  });
  // Ensure the edit state array is the correct length
  _ctx.getEditState().addons = _ctx.getData().addons.map(() => false);
  renderBusinessCardSettingsTable();
}

export function removeBusinessCardAddonType(addonIndex) {
  const addonName = _ctx.getData().addons[addonIndex].name;
  _ctx.showDeleteConfirmationModal(
    "Delete Add-on Type?",
    `Are you sure you want to delete the entire '${addonName}' add - on type ? `,
    () => {
      if (_ctx.getData().addons) _ctx.getData().addons.splice(addonIndex, 1);
      _ctx.getEditState().addons.splice(addonIndex, 1);
      renderBusinessCardSettingsTable();
      _ctx.showToast(`Add - on type '${addonName}' deleted.`);
    }
  );
}

export function addBusinessCardAddonOption(addonIndex) {
  const name = prompt(`Enter new option name for ${_ctx.getData().addons[addonIndex].name}: `);
  if (!name) return;
  const price = parseFloat(prompt(`Enter customer price for ${name}: `));
  const agentPrice = parseFloat(prompt(`Enter agent price for ${name}: `));
  if (isNaN(price) || isNaN(agentPrice)) {
    alert("Invalid price.");
    return;
  }
  const newOption = {
    name: name,
    price: price,
    agentPrice: agentPrice
  };
  if (_ctx.getData().addons && _ctx.getData().addons[addonIndex])
    _ctx.getData().addons[addonIndex].options.push(newOption);
  renderBusinessCardSettingsTable();
  renderBusinessCardSettingsTable();
}

export function removeBusinessCardAddonOption(addonIndex, optionIndex) {
  const addon = _ctx.getData().addons[addonIndex];
  const option = addon.options[optionIndex];
  const labelName = option.name || option.label;
  _ctx.showDeleteConfirmationModal(
    "Delete Option?",
    `Are you sure you want to remove the option '${labelName}' from '${addon.name}' ? `,
    () => {
      if (_ctx.getData().addons && _ctx.getData().addons[addonIndex])
        _ctx.getData().addons[addonIndex].options.splice(optionIndex, 1);
      renderBusinessCardSettingsTable();
      _ctx.showToast("Option removed.");
    }
  );
}

