// modules/calculators/invitationCardSettings.js
// Invitation Card settings panel functions — extracted from app.js
// Uses init(ctx) pattern.

import { saveSettingsScrolls, restoreSettingsScrolls } from '../utils/ui.js';

let _ctx = null;
let _originalSizes = [];

export function initInvitationCardSettings(ctx) { _ctx = ctx; }

export function toggleInvitationCardEditMode(section, isEditing, index = null) {
  if (isEditing) {
    // Create a backup of the current data when entering edit mode
    _ctx.setOriginalData(JSON.parse(JSON.stringify(_ctx.getData())));
  } else {
    // If canceling, restore the data from the backup
    if (Object.keys(_ctx.getOriginalData() || {}).length > 0) {
      _ctx.replaceData(JSON.parse(JSON.stringify(_ctx.getOriginalData())));
    }
  }
  if (section === 'base') {
    _ctx.getEditState().base = isEditing;
  } else if (section === 'material') {
    _ctx.getEditState().material = isEditing;
  } else if (section === 'addons') {
    _ctx.getEditState().addons[index] = isEditing;
  }
  renderInvitationCardSettingsTable();
}

export function renderInvitationCardSettingsTable() {
  let html = '';
  const isBaseEditing = _ctx.getEditState().base;
  const isMaterialEditing = _ctx.getEditState().material;
  // --- Base Prices Section ---
  html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h4 style="margin:0 0 4px 0;">Base Prices (Per Piece)</h4>
            <p style="margin:0; font-size: 13px; color: #9ca3af;">Manage base prices for different print sides and quantities.</p>
          </div>
          <div style="display:flex; gap:8px;">
            ${isBaseEditing ?
      `<button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="addInvitationCardQty()">+ Add Qty</button>
             <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="toggleInvitationCardEditMode('base', false)">Cancel</button>
             <button class="btn btn-sm btn-primary" style="width: auto; margin-top:0; padding: 8px 14px; font-size: 13px;" onclick="saveInvitationCardSettings('base')">Done</button>` :
      `<button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="toggleInvitationCardEditMode('base', true)">Edit</button>`
    }
          </div>
        </div>`;
  html += `<div style="overflow-x: auto; width: 100%; border-radius: 6px; border: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 24px;">
        <table class="settings-table" id="basePricesTable" style="margin-top:0; border:none; min-width:max-content; width: 100%;"><thead><tr><th rowspan="2" class="text-center align-middle">Qty</th><th rowspan="2" class="text-center align-middle">Type</th>`;
  _ctx.getData().sizes.forEach(size => {
    html += `<th colspan="2" class="text-center" style="min-width: 100px">${size}</th>`;
  });
  if (isBaseEditing) {
    html += `<th rowspan="2" class="text-center align-middle" style="width: 140px;">Action</th>`;
  }
  html += `</tr><tr>`;
  _ctx.getData().sizes.forEach(() => {
    html += `<th class="header-2line text-center">1-Side</th><th class="header-2line text-center">2-Side</th>`;
  });
  html += `</tr></thead><tbody>`;
  _ctx.getData().quantities.forEach((qty, qtyIndex) => {
    // --- Customer Row ---
    html += `<tr data-ic-qty-row="${qtyIndex}">`;
    if (isBaseEditing) {
      let displayQty = qty <= 0 ? 0 : qty;
      html += `<td class="text-center" style="padding: 4px" rowspan="2"><input type="number" step="1" value="${displayQty}" class="qty-input form-control text-center" data-index="${qtyIndex}" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 10px; width: 100%; box-sizing: border-box;"></td>`;
    } else {
      html += `<td class="text-center" rowspan="2"><strong>${qty} pcs</strong></td>`;
    }
    html += `<td style="background: rgba(0,0,0,0.05); font-weight: 600; font-size: 11px;">Cust</td>`;
    
    _ctx.getData().sizes.forEach(size => {
      const baseObj = _ctx.getData().basePrice;
      const price1Obj = baseObj[size]?.[qty]?.[1] || { customerPrice: 0, agentPrice: 0 };
      const price2Obj = baseObj[size]?.[qty]?.[2] || { customerPrice: 0, agentPrice: 0 };
      const price1Cust = price1Obj.customerPrice || 0;
      const price2Cust = price2Obj.customerPrice || 0;
      html += isBaseEditing ? `<td style="padding: 4px; background: rgba(0,0,0,0.05);"><input type="number" step="0.01" value="${price1Cust.toFixed(2)}" data-size="${size}" data-qty-index="${qtyIndex}" data-side="1" data-target="customer" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 10px; width: 100%; box-sizing: border-box;"></td>` : `<td style="background: rgba(0,0,0,0.05);">${_ctx.formatCurrency(price1Cust)}</td>`;
      html += isBaseEditing ? `<td style="padding: 4px; background: rgba(0,0,0,0.05);"><input type="number" step="0.01" value="${price2Cust.toFixed(2)}" data-size="${size}" data-qty-index="${qtyIndex}" data-side="2" data-target="customer" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 10px; width: 100%; box-sizing: border-box;"></td>` : `<td style="background: rgba(0,0,0,0.05);">${_ctx.formatCurrency(price2Cust)}</td>`;
    });
    if (isBaseEditing) {
      html += `<td rowspan="2" style="padding: 4px; white-space: nowrap; vertical-align: middle;">
                <div style="display: flex; justify-content: center; align-items: center; gap: 4px; width: 100%; height: 100%;">
                <button class="btn btn-sm btn-secondary" style="padding: 8px 12px; margin-right: 4px; border-radius: 6px; background-color: #374151; border: 1px solid #4b5563; color: white;" onclick="moveInvitationCardQtyUp(${qtyIndex})"><i class="fas fa-arrow-up"></i></button>
                <button class="btn btn-sm btn-secondary" style="padding: 8px 12px; margin-right: 4px; border-radius: 6px; background-color: #374151; border: 1px solid #4b5563; color: white;" onclick="moveInvitationCardQtyDown(${qtyIndex})"><i class="fas fa-arrow-down"></i></button>
                <button class="btn btn-sm btn-danger" style="padding: 8px 12px; border-radius: 6px;" onclick="removeInvitationCardQtyByIndex(${qtyIndex})"><i class="fas fa-trash"></i></button>
                </div>
            </td>`;
    }
    html += `</tr>`;

    // --- Agent Row ---
    html += `<tr data-ic-qty-row="${qtyIndex}">`;
    html += `<td style="background: rgba(0,255,0,0.05); font-weight: 600; font-size: 11px;">Agent</td>`;
    
    _ctx.getData().sizes.forEach(size => {
      const baseObj = _ctx.getData().basePrice;
      const price1Obj = baseObj[size]?.[qty]?.[1] || { customerPrice: 0, agentPrice: 0 };
      const price2Obj = baseObj[size]?.[qty]?.[2] || { customerPrice: 0, agentPrice: 0 };
      const price1Agent = price1Obj.agentPrice || 0;
      const price2Agent = price2Obj.agentPrice || 0;
      html += isBaseEditing ? `<td style="padding: 4px; background: rgba(0,255,0,0.05);"><input type="number" step="0.01" value="${price1Agent.toFixed(2)}" data-size="${size}" data-qty-index="${qtyIndex}" data-side="1" data-target="agent" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 10px; width: 100%; box-sizing: border-box;"></td>` : `<td style="background: rgba(0,255,0,0.05);">${_ctx.formatCurrency(price1Agent)}</td>`;
      html += isBaseEditing ? `<td style="padding: 4px; background: rgba(0,255,0,0.05);"><input type="number" step="0.01" value="${price2Agent.toFixed(2)}" data-size="${size}" data-qty-index="${qtyIndex}" data-side="2" data-target="agent" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 10px; width: 100%; box-sizing: border-box;"></td>` : `<td style="background: rgba(0,255,0,0.05);">${_ctx.formatCurrency(price2Agent)}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;
  // --- Material Add-ons Section ---
  html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; border-top: 2px solid var(--border-color); padding-top: 24px; margin-bottom: 16px;">
          <div>
            <h4 style="margin:0 0 4px 0;">Material Add-on Prices</h4>
            <p style="margin:0; font-size: 13px; color: #9ca3af;">Manage price adjustments based on selected material and size.</p>
          </div>
          <div style="display:flex; gap:8px;">
            ${isMaterialEditing ?
      `<button class="btn btn-sm btn-secondary" onclick="addInvitationCardMaterialInline()" style="padding: 8px 14px; font-size: 13px;">+ Add Material</button>
             <button class="btn btn-sm btn-secondary" onclick="toggleInvitationCardEditMode('material', false)" style="padding: 8px 14px; font-size: 13px;">Cancel</button>
             <button class="btn btn-sm btn-primary" onclick="saveInvitationCardSettings('material')" style="width: auto; margin-top:0; padding: 8px 14px; font-size: 13px;">Done</button>` :
      `<button class="btn btn-sm btn-secondary" onclick="toggleInvitationCardEditMode('material', true)" style="padding: 8px 14px; font-size: 13px;">Edit</button>`
    }
          </div>
        </div>`;
  html += `<div style="overflow-x: auto; width: 100%; border-radius: 6px; border: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 24px;">
        <table class="settings-table" id="materialAddonTable" style="margin-top:0; border:none; min-width:max-content; width: 100%;"><thead><tr><th>Material</th><th>Type</th>`;
  _ctx.getData().sizes.forEach(size => {
    html += `<th>${size}</th>`;
  });
  if (isMaterialEditing) {
    html += `<th class="text-center align-middle" style="width: 140px;">Action</th>`;
  }
  html += `</tr></thead><tbody>`;
  _ctx.getData().materials.forEach((mat, matIndex) => {
    // --- Customer Row ---
    html += `<tr data-ic-mat-row="${matIndex}">`;
    if (isMaterialEditing) {
      html += `<td style="padding: 4px" rowspan="2"><input type="text" value="${mat.name}" data-mat-index="${matIndex}" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 10px; width: 100%; box-sizing: border-box;"></td>`;
    } else {
      html += `<td rowspan="2"><strong>${mat.name}</strong></td>`;
    }
    html += `<td style="background: rgba(0,0,0,0.05); font-weight: 600; font-size: 11px;">Cust</td>`;
    
    _ctx.getData().sizes.forEach(size => {
      const priceObj = mat.addOn[size] || { customerPrice: 0, agentPrice: 0 };
      const price = priceObj.customerPrice || 0;
      html += isMaterialEditing ? `<td style="padding: 4px; background: rgba(0,0,0,0.05);"><input type="number" step="0.01" value="${price.toFixed(2)}" data-size="${size}" data-mat-index="${matIndex}" data-target="customer" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 10px; width: 100%; box-sizing: border-box;"></td>` : `<td style="background: rgba(0,0,0,0.05);">+${_ctx.formatCurrency(price)}</td>`;
    });
    if (isMaterialEditing) {
      html += `<td rowspan="2" style="padding: 4px; white-space: nowrap; vertical-align: middle;">
                <div style="display: flex; justify-content: center; align-items: center; gap: 4px; width: 100%; height: 100%;">
                <button class="btn btn-sm btn-secondary" style="padding: 8px 12px; margin-right: 4px; border-radius: 6px; background-color: #374151; border: 1px solid #4b5563; color: white;" onclick="moveInvitationCardMaterialUp(${matIndex})"><i class="fas fa-arrow-up"></i></button>
                <button class="btn btn-sm btn-secondary" style="padding: 8px 12px; margin-right: 4px; border-radius: 6px; background-color: #374151; border: 1px solid #4b5563; color: white;" onclick="moveInvitationCardMaterialDown(${matIndex})"><i class="fas fa-arrow-down"></i></button>
                <button class="btn btn-sm btn-danger" style="padding: 8px 12px; border-radius: 6px;" onclick="removeInvitationCardMaterialByIndex(${matIndex})"><i class="fas fa-trash"></i></button>
                </div>
            </td>`;
    }
    html += `</tr>`;

    // --- Agent Row ---
    html += `<tr data-ic-mat-row="${matIndex}">`;
    html += `<td style="background: rgba(0,255,0,0.05); font-weight: 600; font-size: 11px;">Agent</td>`;
    
    _ctx.getData().sizes.forEach(size => {
      const priceObj = mat.addOn[size] || { customerPrice: 0, agentPrice: 0 };
      const price = priceObj.agentPrice || 0;
      html += isMaterialEditing ? `<td style="padding: 4px; background: rgba(0,255,0,0.05);"><input type="number" step="0.01" value="${price.toFixed(2)}" data-size="${size}" data-mat-index="${matIndex}" data-target="agent" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 10px; width: 100%; box-sizing: border-box;"></td>` : `<td style="background: rgba(0,255,0,0.05);">+${_ctx.formatCurrency(price)}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;
  // --- Dynamic Add-ons Section ---
  html += `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; border-top: 2px solid var(--border-color); padding-top: 24px;">
          <div>
            <h4 style="margin:0 0 4px 0;">Finishing Add-ons</h4>
            <p style="margin:0; font-size: 13px; color: #9ca3af;">Manage available finishing options. Columns represent sizes.</p>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:11px; color:#9ca3af; font-weight:600; letter-spacing:0.05em;">COLUMNS:</span>
            <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="openManageSizesModal()">Manage Sizes</button>
          </div>
        </div>
        <div style="border: 1px dashed #4b5563; border-radius: 10px; padding: 24px; margin-top: 16px; margin-bottom: 16px; text-align: center;">
          <button class="btn btn-primary" style="width:auto; margin:0 0 10px 0; padding: 10px 24px; font-size: 14px; display:inline-flex; align-items:center; gap:8px;" onclick="openAddAddonGroupModal()">
            <i class="fas fa-plus-circle"></i> Create New Add-on Group
          </button>
          <p style="margin:0; font-size: 12px; color:#6b7280;">Click here to create a new category of add-ons (e.g., "Lamination", "Round Corner") which will appear as a new table below.</p>
        </div>`;
  const addonsArr = _ctx.getData().addons;
  addonsArr.forEach((addon, addonIndex) => {
    const isAddonEditing = _ctx.getEditState().addons[addonIndex];
    
    html += `<div class="settings-panel" style="margin-top: 16px; padding: 20px; border: 1px solid ${isAddonEditing ? '#22c55e' : 'var(--accent-color)'}; border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px;">
              ${isAddonEditing
        ? `<input type="text" value="${addon.name}" id="addonNameInput_${addonIndex}" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 12px; font-size: 16px; font-weight: 600; max-width: 280px;">`
        : `<h5 style="margin:0; font-size:16px; font-weight:600;">${addon.name}</h5>`}
              <div class="action-buttons" style="display:flex; gap:8px; flex-shrink:0;">
                ${isAddonEditing
        ? `<button class="btn btn-sm btn-secondary" style="padding: 7px 12px; font-size:13px;" onclick="addInvitationCardAddonOptionInline(${addonIndex})">+ Add Option</button>
                     <button class="btn btn-sm btn-danger" style="padding: 7px 12px; font-size:13px;" onclick="removeInvitationCardAddonType(${addonIndex})">Delete Type</button>
                     <button class="btn btn-sm btn-secondary" style="padding: 7px 12px; font-size:13px;" onclick="toggleInvitationCardEditMode('addons', false, ${addonIndex})">Cancel</button>
                     <button class="btn btn-sm btn-primary" style="width:auto; margin-top:0; padding: 7px 14px; font-size:13px;" onclick="saveInvitationCardSettings('addons', ${addonIndex})">Done</button>`
        : `<button class="btn btn-sm btn-secondary" style="padding: 7px 14px; font-size:13px;" onclick="toggleInvitationCardEditMode('addons', true, ${addonIndex})">Edit</button>`}
              </div>
            </div>
            <table class="settings-table"><thead><tr><th>Option</th><th>Type</th>`;
            
    _ctx.getData().sizes.forEach(size => {
      html += `<th>${size}</th>`;
    });
    html += `${isAddonEditing ? '<th class="text-center">Actions</th>' : ''}</tr></thead><tbody>`;
    
    addon.options.forEach((option, optionIndex) => {
      // --- Customer Row ---
      html += `<tr data-ic-addon-opt="${addonIndex}-${optionIndex}">`;
      if (isAddonEditing) {
        html += `<td style="padding:4px;" rowspan="2"><input type="text" value="${option.name}" data-addon-index="${addonIndex}" data-option-index="${optionIndex}" data-field="name" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align:center;"></td>`;
      } else {
        html += `<td rowspan="2">${option.name}</td>`;
      }
      html += `<td style="background: rgba(0,0,0,0.05); font-weight: 600; font-size: 11px;">Cust</td>`;
      
      _ctx.getData().sizes.forEach(size => {
        const priceObj = option.prices[size] || { customerPrice: 0, agentPrice: 0 };
        const price = priceObj.customerPrice || 0;
        html += isAddonEditing
          ? `<td style="padding:4px; background: rgba(0,0,0,0.05);"><input type="number" step="0.01" value="${price.toFixed(2)}" data-addon-index="${addonIndex}" data-option-index="${optionIndex}" data-size="${size}" data-field="price" data-target="customer" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align: center;"></td>`
          : `<td style="background: rgba(0,0,0,0.05);">+${_ctx.formatCurrency(price)}</td>`;
      });
      if (isAddonEditing) {
        html += `<td rowspan="2" style="padding:4px; white-space:nowrap; vertical-align: middle;">
                <div style="display: flex; justify-content: center; align-items: center; gap: 4px; width: 100%; height: 100%;">
                <button class="btn btn-sm btn-secondary" style="padding:7px 10px; margin-right:3px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveAddonOptionUp(${addonIndex},${optionIndex})"><i class="fas fa-arrow-up"></i></button>
                <button class="btn btn-sm btn-secondary" style="padding:7px 10px; margin-right:3px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveAddonOptionDown(${addonIndex},${optionIndex})"><i class="fas fa-arrow-down"></i></button>
                <button class="btn btn-sm btn-danger" style="padding:7px 10px; border-radius:6px;" onclick="removeInvitationCardAddonOption(${addonIndex},${optionIndex})"><i class="fas fa-trash"></i></button>
                </div>
              </td>`;
      }
      html += `</tr>`;

      // --- Agent Row ---
      html += `<tr data-ic-addon-opt="${addonIndex}-${optionIndex}">`;
      html += `<td style="background: rgba(0,255,0,0.05); font-weight: 600; font-size: 11px;">Agent</td>`;
      
      _ctx.getData().sizes.forEach(size => {
        const priceObj = option.prices[size] || { customerPrice: 0, agentPrice: 0 };
        const price = priceObj.agentPrice || 0;
        html += isAddonEditing
          ? `<td style="padding:4px; background: rgba(0,255,0,0.05);"><input type="number" step="0.01" value="${price.toFixed(2)}" data-addon-index="${addonIndex}" data-option-index="${optionIndex}" data-size="${size}" data-field="price" data-target="agent" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align: center;"></td>`
          : `<td style="background: rgba(0,255,0,0.05);">+${_ctx.formatCurrency(price)}</td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table></div>`;
  });
  { const _s = saveSettingsScrolls(); document.getElementById("settingsTableDiv").innerHTML = html; restoreSettingsScrolls(_s); }
}

function _confirmSave_saveInvitationCardSettings(section, index) {

  if (section === 'base') {
    preserveInvitationCardBaseInputs();
  } else if (section === 'material') {
    preserveInvitationCardMaterialInputs();
  } else if (section === 'addons') {
    const addon = _ctx.getData().addons[index];
    const groupNameInput = document.getElementById(`addonNameInput_${index}`);
    if (groupNameInput) addon.name = groupNameInput.value.trim() || addon.name;

    addon.options.forEach((option, optionIndex) => {
      const nameInput = document.querySelector(`input[data-addon-index="${index}"][data-option-index="${optionIndex}"][data-field="name"]`);
      if (nameInput) option.name = nameInput.value;

      _ctx.getData().sizes.forEach(size => {
        // Customer and Agent prices are now in the same nested object
        const priceInput = document.querySelector(`input[data-addon-index="${index}"][data-option-index="${optionIndex}"][data-size="${size}"][data-target="customer"]`);
        const agentPriceInput = document.querySelector(`input[data-addon-index="${index}"][data-option-index="${optionIndex}"][data-size="${size}"][data-target="agent"]`);
        
        const custPrice = priceInput ? parseFloat(priceInput.value) : (option.prices[size]?.customerPrice || 0);
        const agentPrice = agentPriceInput ? parseFloat(agentPriceInput.value) : (option.prices[size]?.agentPrice || 0);
        
        option.prices[size] = { customerPrice: custPrice, agentPrice: agentPrice };
      });
    });
  } else if (section === 'sizes') {
    const rows = document.querySelectorAll('#manageSizesList .manage-size-row');
    const newSizes = [];
    rows.forEach(row => {
      const val = row.querySelector('input').value.trim().toUpperCase();
      if (val && !newSizes.includes(val)) newSizes.push(val);
    });

    newSizes.forEach(size => {
      if (!_ctx.getData().basePrice[size]) {
        _ctx.getData().basePrice[size] = {};
        _ctx.getData().quantities.forEach(qty => { 
          _ctx.getData().basePrice[size][qty] = { 
            1: {customerPrice: 0, agentPrice: 0}, 
            2: {customerPrice: 0, agentPrice: 0} 
          }; 
        });
      }
      _ctx.getData().materials.forEach(mat => {
        if (!mat.addOn[size]) mat.addOn[size] = {customerPrice: 0, agentPrice: 0};
      });
      _ctx.getData().addons.forEach(addon => {
        addon.options.forEach(option => { 
          if (!option.prices[size]) option.prices[size] = {customerPrice: 0, agentPrice: 0}; 
        });
      });
    });

    const removedSizes = _ctx.getData().sizes.filter(s => !newSizes.includes(s));
    removedSizes.forEach(size => {
      delete _ctx.getData().basePrice[size];
      _ctx.getData().materials.forEach(mat => { delete mat.addOn[size]; });
      _ctx.getData().addons.forEach(addon => {
        addon.options.forEach(option => { delete option.prices[size]; });
      });
    });

    _ctx.getData().sizes = newSizes;
    closeManageSizesModal();
  }

  _ctx.closeSaveConfirmationModal();
  _ctx.showToast(section === 'sizes' ? 'Sizes updated successfully.' : `Invitation Card ${section} settings saved successfully!`);
  _ctx.setOriginalData({});

  if (section !== 'sizes') {
    toggleInvitationCardEditMode(section, false, index);
  } else {
    renderInvitationCardSettingsTable();
  }
}

export function saveInvitationCardSettings(section, index = null) {
  _ctx.setPendingCallback(() => _confirmSave_saveInvitationCardSettings(section, index));
}

export function addInvitationCardQty() {
  preserveInvitationCardBaseInputs();

  // Find a unique temporary number to use as key for new row. 
  // We start from 0 and go down to negatives if there's somehow a 0 already
  // (though during render we'll display it as 0 on screen).
  let newQty = 0;
  while (_ctx.getData().quantities.includes(newQty)) {
    newQty--;
  }

  _ctx.getData().quantities.push(newQty);
  _ctx.getData().sizes.forEach(size => {
    if (!_ctx.getData().basePrice[size]) _ctx.getData().basePrice[size] = {};
    _ctx.getData().basePrice[size][newQty] = {
      1: { customerPrice: 0, agentPrice: 0 },
      2: { customerPrice: 0, agentPrice: 0 }
    };
  });
  renderInvitationCardSettingsTable();
}

export function addInvitationCardSize() {
  const newSize = prompt("Enter new size name (e.g., A7):");
  if (newSize && !_ctx.getData().sizes.includes(newSize.toUpperCase())) {
    const sizeKey = newSize.toUpperCase();
    _ctx.getData().sizes.push(sizeKey);
    // Sync with Base Prices
    _ctx.getData().basePrice[sizeKey] = {};
    _ctx.getData().quantities.forEach(qty => {
      _ctx.getData().basePrice[sizeKey][qty] = {
        1: { customerPrice: 0, agentPrice: 0 },
        2: { customerPrice: 0, agentPrice: 0 }
      };
    });
    // Sync with Material Add-ons
    _ctx.getData().materials.forEach(mat => {
      mat.addOn[sizeKey] = { customerPrice: 0, agentPrice: 0 };
    });
    // Sync with ALL other Add-ons
    _ctx.getData().addons.forEach(addon => {
      addon.options.forEach(option => {
        option.prices[sizeKey] = { customerPrice: 0, agentPrice: 0 };
      });
    });
    renderInvitationCardSettingsTable();
  } else if (newSize) {
    alert("This size already exists.");
  }
}

function preserveInvitationCardMaterialInputs() {
  const newMaterials = [];

  const rows = document.querySelectorAll('#materialAddonTable tbody tr');
  
  for (let i = 0; i < rows.length; i += 2) {
    const row = rows[i];
    const agentRow = rows[i + 1];
    
    const matInput = row.querySelector('input[type="text"][data-mat-index]');
    if (!matInput) continue;

    let matName = matInput.value.trim() || "Unnamed Material";
    const oldMatIndex = parseInt(matInput.dataset.matIndex);

    if (newMaterials.some(m => m.name === matName)) {
      let suffix = 1;
      while (newMaterials.some(m => m.name === `${matName} ${suffix}`)) suffix++;
      matName = `${matName} ${suffix}`;
    }

    const addOn = {};
    _ctx.getData().sizes.forEach(size => {
      const custInput = row.querySelector(`input[data-size="${size}"][data-mat-index="${oldMatIndex}"][data-target="customer"]`);
      const agentInput = agentRow ? agentRow.querySelector(`input[data-size="${size}"][data-mat-index="${oldMatIndex}"][data-target="agent"]`) : null;
      addOn[size] = {
        customerPrice: custInput ? parseFloat(custInput.value) || 0 : 0,
        agentPrice: agentInput ? parseFloat(agentInput.value) || 0 : 0
      };
    });

    newMaterials.push({ name: matName, addOn });
  }
  _ctx.getData().materials = newMaterials;
}

export function addInvitationCardMaterialInline() {
  preserveInvitationCardMaterialInputs();
  let newMatName = "New Material";
  let counter = 1;
  while (_ctx.getData().materials.some(m => m.name === newMatName)) {
    newMatName = "New Material " + counter++;
  }
  const addOn = {};
  _ctx.getData().sizes.forEach(size => { addOn[size] = { customerPrice: 0, agentPrice: 0 }; });
  _ctx.getData().materials.push({ name: newMatName, addOn });
  renderInvitationCardSettingsTable();
}

export function moveInvitationCardMaterialUp(index) {
  preserveInvitationCardMaterialInputs();
  if (index > 0) {
    const tempMat = _ctx.getData().materials[index];
    _ctx.getData().materials[index] = _ctx.getData().materials[index - 1];
    _ctx.getData().materials[index - 1] = tempMat;
    renderInvitationCardSettingsTable();
    _ctx.highlightMoveRow('data-ic-mat-row', index - 1);
  }
}

export function moveInvitationCardMaterialDown(index) {
  preserveInvitationCardMaterialInputs();
  if (index < _ctx.getData().materials.length - 1) {
    const tempMat = _ctx.getData().materials[index];
    _ctx.getData().materials[index] = _ctx.getData().materials[index + 1];
    _ctx.getData().materials[index + 1] = tempMat;
    renderInvitationCardSettingsTable();
    _ctx.highlightMoveRow('data-ic-mat-row', index + 1);
  }
}

export function removeInvitationCardMaterialByIndex(index) {
  if (_ctx.getData().materials.length <= 1) {
    _ctx.showToast('Cannot remove the last material.', 'warning');
    return;
  }
  _ctx.showDeleteConfirmationModal(
    "Remove Material?",
    "Are you sure you want to remove this material?",
    () => {
      preserveInvitationCardMaterialInputs();
      _ctx.getData().materials.splice(index, 1);
      renderInvitationCardSettingsTable();
      _ctx.showToast("Material removed.");
    }
  );
}

export function removeInvitationCardQty() {
  const itemToRemove = prompt(`Enter quantity to remove from: ${_ctx.getData().quantities.join(', ')}`);
  if (itemToRemove && !isNaN(parseInt(itemToRemove))) {
    const qtyNum = parseInt(itemToRemove);
    const index = _ctx.getData().quantities.indexOf(qtyNum);
    if (index > -1) {
      _ctx.getData().quantities.splice(index, 1);
      _ctx.getData().sizes.forEach(size => {
        delete _ctx.getData().basePrice[size][qtyNum];
      });
      _ctx.showToast(`Quantity ${qtyNum} removed.`);
      renderInvitationCardSettingsTable();
    } else {
      _ctx.showToast(`Quantity ${qtyNum} not found.`);
    }
  }
}

function preserveInvitationCardBaseInputs() {
  const newQuantities = [];
  const newBasePrice = {};

  // Ensure all size keys exist
  _ctx.getData().sizes.forEach(size => {
    newBasePrice[size] = {};
  });

  // The table now has 2 rows per quantity. 
  // We iterate through rows, looking for the "Cust" row (which has the qty input).
  const rows = document.querySelectorAll('#basePricesTable tbody tr');
  
  // We need to group rows by quantity index (0 and 1 are Qty 0, 2 and 3 are Qty 1, etc)
  // The "Cust" row has the quantity input.
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const qtyInput = row.querySelector('.qty-input');
    if (!qtyInput) continue; // Skip Agent row, handled by Customer row logic or handled separately

    const qtyValue = parseInt(qtyInput.value) || 0;
    newQuantities.push(qtyValue);

    // Find the next row which should be the Agent row for this quantity
    const agentRow = rows[i+1]; 

    _ctx.getData().sizes.forEach(size => {
      // Customer Data
      const price1Input = row.querySelector(`input[data-size="${size}"][data-side="1"][data-target="customer"]`);
      const price2Input = row.querySelector(`input[data-size="${size}"][data-side="2"][data-target="customer"]`);
      
      // Agent Data
      const agentPrice1Input = agentRow ? agentRow.querySelector(`input[data-size="${size}"][data-side="1"][data-target="agent"]`) : null;
      const agentPrice2Input = agentRow ? agentRow.querySelector(`input[data-size="${size}"][data-side="2"][data-target="agent"]`) : null;
      
      // Create nested structure with explicit dual pricing
      newBasePrice[size][qtyValue] = {
        1: {
          customerPrice: price1Input ? parseFloat(price1Input.value) : 0,
          agentPrice: agentPrice1Input ? parseFloat(agentPrice1Input.value) : 0
        },
        2: {
          customerPrice: price2Input ? parseFloat(price2Input.value) : 0,
          agentPrice: agentPrice2Input ? parseFloat(agentPrice2Input.value) : 0
        }
      };
    });
  }

  _ctx.getData().quantities = newQuantities;
  _ctx.getData().basePrice = newBasePrice;
}

export function moveInvitationCardQtyUp(index) {
  preserveInvitationCardBaseInputs();
  if (index > 0) {
    const tempQty = _ctx.getData().quantities[index];
    _ctx.getData().quantities[index] = _ctx.getData().quantities[index - 1];
    _ctx.getData().quantities[index - 1] = tempQty;
    renderInvitationCardSettingsTable();
    _ctx.highlightMoveRow('data-ic-qty-row', index - 1);
  }
}

export function moveInvitationCardQtyDown(index) {
  preserveInvitationCardBaseInputs();
  if (index < _ctx.getData().quantities.length - 1) {
    const tempQty = _ctx.getData().quantities[index];
    _ctx.getData().quantities[index] = _ctx.getData().quantities[index + 1];
    _ctx.getData().quantities[index + 1] = tempQty;
    renderInvitationCardSettingsTable();
    _ctx.highlightMoveRow('data-ic-qty-row', index + 1);
  }
}

export function removeInvitationCardQtyByIndex(index) {
  if (_ctx.getData().quantities.length <= 1) {
    _ctx.showToast('Cannot remove the last tier.', 'warning');
    return;
  }
  _ctx.showDeleteConfirmationModal(
    "Remove Row?",
    "Are you sure you want to remove this row?",
    () => {
      preserveInvitationCardBaseInputs();
      const qtyNum = _ctx.getData().quantities[index];
      _ctx.getData().quantities.splice(index, 1);
      _ctx.getData().sizes.forEach(size => {
        delete _ctx.getData().basePrice[size][qtyNum];
      });
      renderInvitationCardSettingsTable();
      _ctx.showToast("Row removed.");
    }
  );
}

export function removeInvitationCardSize() {
  if (_ctx.getData().sizes.length <= 1) {
    _ctx.showToast('Cannot remove the last size.', 'warning');
    return;
  }
  const itemToRemove = prompt(`Enter size to remove from: ${_ctx.getData().sizes.join(', ')}`);
  if (itemToRemove) {
    const sizeKey = itemToRemove.toUpperCase();
    const index = _ctx.getData().sizes.indexOf(sizeKey);
    if (index > -1) {
      _ctx.getData().sizes.splice(index, 1);
      delete _ctx.getData().basePrice[sizeKey];
      _ctx.getData().materials.forEach(mat => { delete mat.addOn[sizeKey]; });
      // Remove from all other add-ons
      _ctx.getData().addons.forEach(addon => {
        addon.options.forEach(option => {
          delete option.prices[sizeKey];
        });
      });
      _ctx.showToast(`Size ${sizeKey} removed.`);
      renderInvitationCardSettingsTable();
    } else {
      _ctx.showToast(`Size ${sizeKey} not found.`);
    }
  }
}

export function openAddAddonGroupModal() {
  const input = document.getElementById('newAddonGroupNameInput');
  input.value = '';
  const modal = document.getElementById('addAddonGroupModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => input.focus(), 100);
}

export function closeAddAddonGroupModal() {
  const modal = document.getElementById('addAddonGroupModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

export function confirmAddAddonGroup() {
  const name = document.getElementById('newAddonGroupNameInput').value.trim();
  if (!name) { _ctx.showToast('Please enter a group name.', 'warning'); return; }
  const newAddon = { name: name, options: [] };
  const defaultOption = { name: 'None', prices: {} };
  _ctx.getData().sizes.forEach(size => { defaultOption.prices[size] = {customerPrice: 0, agentPrice: 0}; });
  newAddon.options.push(defaultOption);
  _ctx.getData().addons.push(newAddon);
  _ctx.getEditState().addons = _ctx.getData().addons.map(() => false);
  closeAddAddonGroupModal();
  _ctx.showToast(`Add - on group "${name}" created.`);
  renderInvitationCardSettingsTable();
}

export function openManageSizesModal() {
  _originalSizes = [..._ctx.getData().sizes];
  const list = document.getElementById('manageSizesList');
  list.innerHTML = '';
  _ctx.getData().sizes.forEach((size, idx) => _appendSizeRow(size, idx));
  const modal = document.getElementById('manageSizesModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

export function closeManageSizesModal() {
  const modal = document.getElementById('manageSizesModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

export function redoManageSizes() {
  const list = document.getElementById('manageSizesList');
  list.innerHTML = '';
  _originalSizes.forEach((size, idx) => _appendSizeRow(size, idx));
}

function _appendSizeRow(value, idx) {
  const list = document.getElementById('manageSizesList');
  const row = document.createElement('div');
  row.className = 'manage-size-row flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700';
  row.innerHTML = `
          <input type="text" value="${value}" placeholder="Size Name" class="flex-1 font-semibold rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors mr-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
          <div class="flex items-center gap-2">
            <button onclick="moveSizeRowUp(this)" class="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"><i class="fas fa-arrow-up text-xs"></i></button>
            <button onclick="moveSizeRowDown(this)" class="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"><i class="fas fa-arrow-down text-xs"></i></button>
            <button onclick="removeSizeRow(this)" class="px-3 py-1.5 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg text-sm transition-colors ml-1">Remove</button>
          </div>`;
  list.appendChild(row);
}

export function addSizeRowToManageSizes() {
  const list = document.getElementById('manageSizesList');
  const idx = list.children.length;
  _appendSizeRow('', idx);
  list.lastElementChild.querySelector('input').focus();
}

export function moveSizeRowUp(btn) {
  const row = btn.closest('.manage-size-row');
  const prev = row.previousElementSibling;
  if (prev) { row.parentNode.insertBefore(row, prev); _ctx.blinkRow(row); }
}

export function moveSizeRowDown(btn) {
  const row = btn.closest('.manage-size-row');
  const next = row.nextElementSibling;
  if (next) { row.parentNode.insertBefore(next, row); _ctx.blinkRow(row); }
}

export function removeSizeRow(btn) {
  btn.closest('.manage-size-row').remove();
}

export function saveManageSizes() {
  const rows = document.querySelectorAll('#manageSizesList .manage-size-row');
  const newSizes = [];
  rows.forEach(row => {
    const val = row.querySelector('input').value.trim().toUpperCase();
    if (val && !newSizes.includes(val)) newSizes.push(val);
  });
  if (newSizes.length === 0) { _ctx.showToast('At least one size is required.'); return; }

  saveInvitationCardSettings('sizes');
}

function preserveAddonInputs(addonIndex) {
  const addonsArr = _ctx.getData().addons;
  const addon = addonsArr[addonIndex];
  const nameInput = document.getElementById(`addonNameInput_${addonIndex}`);
  if (nameInput) {
    addon.name = nameInput.value.trim() || addon.name;
    // synchronize name across addon
    if (_ctx.getData().addons[addonIndex]) _ctx.getData().addons[addonIndex].name = addon.name;
  }

  addon.options.forEach((option, optionIndex) => {
    const nameEl = document.querySelector(`input[data-addon-index="${addonIndex}"][data-option-index="${optionIndex}"][data-field="name"]`);
    if (nameEl) {
      option.name = nameEl.value;
      // sync option name
      if (_ctx.getData().addons[addonIndex] && _ctx.getData().addons[addonIndex].options[optionIndex])
        _ctx.getData().addons[addonIndex].options[optionIndex].name = option.name;
    }
    _ctx.getData().sizes.forEach(size => {
      // Read both customer and agent prices
      const custPriceEl = document.querySelector(`input[data-addon-index="${addonIndex}"][data-option-index="${optionIndex}"][data-size="${size}"][data-target="customer"]`);
      const agentPriceEl = document.querySelector(`input[data-addon-index="${addonIndex}"][data-option-index="${optionIndex}"][data-size="${size}"][data-target="agent"]`);
      
      const custPrice = custPriceEl ? parseFloat(custPriceEl.value) || 0 : (option.prices[size]?.customerPrice || 0);
      const agentPrice = agentPriceEl ? parseFloat(agentPriceEl.value) || 0 : (option.prices[size]?.agentPrice || 0);
      
      // Store as nested structure
      option.prices[size] = { customerPrice: custPrice, agentPrice: agentPrice };
    });
  });
}

export function addInvitationCardAddonOptionInline(addonIndex) {
  preserveAddonInputs(addonIndex);
  const newOption = { name: 'New Option', prices: {} };
  _ctx.getData().sizes.forEach(size => { newOption.prices[size] = { customerPrice: 0, agentPrice: 0 }; });
  if (_ctx.getData().addons && _ctx.getData().addons[addonIndex])
    _ctx.getData().addons[addonIndex].options.push(newOption);
  renderInvitationCardSettingsTable();
}

export function moveAddonOptionUp(addonIndex, optionIndex) {
  preserveAddonInputs(addonIndex);
  if (optionIndex > 0) {
    if (_ctx.getData().addons && _ctx.getData().addons[addonIndex]) {
      const options1 = _ctx.getData().addons[addonIndex].options;
      [options1[optionIndex], options1[optionIndex - 1]] = [options1[optionIndex - 1], options1[optionIndex]];
    }
    renderInvitationCardSettingsTable();
    _ctx.highlightMoveRow('data-ic-addon-opt', `${addonIndex}-${optionIndex - 1}`);
  }
}

export function moveAddonOptionDown(addonIndex, optionIndex) {
  preserveAddonInputs(addonIndex);
  if (optionIndex < _ctx.getData().addons[addonIndex].options.length - 1) {
    if (_ctx.getData().addons && _ctx.getData().addons[addonIndex]) {
      const options1 = _ctx.getData().addons[addonIndex].options;
      [options1[optionIndex], options1[optionIndex + 1]] = [options1[optionIndex + 1], options1[optionIndex]];
    }
    renderInvitationCardSettingsTable();
    _ctx.highlightMoveRow('data-ic-addon-opt', `${addonIndex}-${optionIndex + 1}`);
  }
}

export function removeInvitationCardAddonType(addonIndex) {
  const addonName = _ctx.getData().addons[addonIndex].name;
  _ctx.showDeleteConfirmationModal(
    "Delete Add-on Group?",
    `Are you sure you want to delete the entire '${addonName}' add - on group ? `,
    () => {
      if (_ctx.getData().addons) _ctx.getData().addons.splice(addonIndex, 1);
      _ctx.getEditState().addons.splice(addonIndex, 1);
      renderInvitationCardSettingsTable();
      _ctx.showToast(`Add - on group '${addonName}' deleted.`);
    }
  );
}

export function removeInvitationCardAddonOption(addonIndex, optionIndex) {
  const addon = _ctx.getData().addons[addonIndex];
  const option = addon.options[optionIndex];
  _ctx.showDeleteConfirmationModal(
    "Delete Option?",
    `Are you sure you want to remove the option '${option.name}' from '${addon.name}' ? `,
    () => {
      if (_ctx.getData().addons && _ctx.getData().addons[addonIndex])
        _ctx.getData().addons[addonIndex].options.splice(optionIndex, 1);
      renderInvitationCardSettingsTable();
      _ctx.showToast("Option removed.");
    }
  );
}

