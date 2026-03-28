// modules/calculators/acrylicSettings.js
// Acrylic settings TABLE functions — extracted from app.js
// Uses init(ctx) pattern.

import { saveSettingsScrolls, restoreSettingsScrolls } from '../utils/ui.js';

let _ctx = null;

export function initAcrylicSettings(ctx) { _ctx = ctx; }

export function syncAcrylicPriceInputsToState(type) {
  const draftPriceTable = JSON.parse(JSON.stringify(_ctx.getPriceTable()));

  for (const [index, item] of draftPriceTable.customer[type].entries()) {
    const nameInput = document.querySelector(`[data-acrylic-type="${type}"][data-row-index="${index}"][data-field="name"]`);
    const customerInput = document.querySelector(`[data-acrylic-type="${type}"][data-row-index="${index}"][data-field="customerPrice"]`);
    const agentInput = document.querySelector(`[data-acrylic-type="${type}"][data-row-index="${index}"][data-field="agentPrice"]`);

    const fallbackName = _ctx.getAcrylicBaseLabel(item.label) || (type === 'acrylic' ? 'New Material' : 'New Service');
    const baseName = nameInput ? (nameInput.value.trim() || fallbackName) : fallbackName;
    const customerPrice = customerInput ? (parseFloat(customerInput.value) || 0) : item.price;
    const agentPrice = agentInput ? (parseFloat(agentInput.value) || 0) : draftPriceTable.agent[type][index].price;

    draftPriceTable.customer[type][index] = {
      ...draftPriceTable.customer[type][index],
      label: _ctx.formatAcrylicUnitLabel(baseName, customerPrice),
      price: customerPrice
    };
    draftPriceTable.agent[type][index] = {
      ...draftPriceTable.agent[type][index],
      label: _ctx.formatAcrylicUnitLabel(baseName, agentPrice),
      price: agentPrice
    };
  }

  _ctx.replacePriceTable(draftPriceTable);
}

export function syncAcrylicMarkupInputsToState() {
  const draftMarkupRules = JSON.parse(JSON.stringify(_ctx.getMarkupRules()));

  for (const [index] of draftMarkupRules.customer.entries()) {
    const thresholdInput = document.querySelector(`[data-markup-row-index="${index}"][data-field="threshold"]`);
    const customerMultiplierInput = document.querySelector(`[data-markup-row-index="${index}"][data-field="customerMultiplier"]`);
    const agentMultiplierInput = document.querySelector(`[data-markup-row-index="${index}"][data-field="agentMultiplier"]`);
    const isLastRule = index === draftMarkupRules.customer.length - 1;

    draftMarkupRules.customer[index] = {
      threshold: isLastRule ? Infinity : (parseFloat(thresholdInput?.value) || 0),
      multiplier: parseFloat(customerMultiplierInput?.value) || 0
    };
    draftMarkupRules.agent[index] = {
      threshold: isLastRule ? Infinity : (parseFloat(thresholdInput?.value) || 0),
      multiplier: parseFloat(agentMultiplierInput?.value) || 0
    };
  }

  _ctx.replaceMarkupRules(draftMarkupRules);
}

export function addAcrylicPriceRow(type) {
  syncAcrylicPriceInputsToState(type);
  const defaultName = type === 'acrylic' ? 'New Material' : 'New Service';
  _ctx.getPriceTable().customer[type].push({
    label: _ctx.formatAcrylicUnitLabel(defaultName, 0),
    price: 0
  });
  _ctx.getPriceTable().agent[type].push({
    label: _ctx.formatAcrylicUnitLabel(defaultName, 0),
    price: 0
  });
  renderAcrylicPricingSettingsTable();
}

export function moveAcrylicPriceUp(type, index) {
  syncAcrylicPriceInputsToState(type);
  if (index > 0) {
    [_ctx.getPriceTable().customer[type][index], _ctx.getPriceTable().customer[type][index - 1]] = [_ctx.getPriceTable().customer[type][index - 1], _ctx.getPriceTable().customer[type][index]];
    [_ctx.getPriceTable().agent[type][index], _ctx.getPriceTable().agent[type][index - 1]] = [_ctx.getPriceTable().agent[type][index - 1], _ctx.getPriceTable().agent[type][index]];
    renderAcrylicPricingSettingsTable();
    _ctx.highlightMoveRow('data-acrylic-price-row', `${type}-${index - 1}`);
  }
}

export function moveAcrylicPriceDown(type, index) {
  syncAcrylicPriceInputsToState(type);
  if (index < _ctx.getPriceTable().customer[type].length - 1) {
    [_ctx.getPriceTable().customer[type][index], _ctx.getPriceTable().customer[type][index + 1]] = [_ctx.getPriceTable().customer[type][index + 1], _ctx.getPriceTable().customer[type][index]];
    [_ctx.getPriceTable().agent[type][index], _ctx.getPriceTable().agent[type][index + 1]] = [_ctx.getPriceTable().agent[type][index + 1], _ctx.getPriceTable().agent[type][index]];
    renderAcrylicPricingSettingsTable();
    _ctx.highlightMoveRow('data-acrylic-price-row', `${type}-${index + 1}`);
  }
}

export function removeAcrylicPriceRow(type, index) {
  if (_ctx.getPriceTable().customer[type].length <= 1) {
    _ctx.showToast('Cannot remove the last row.');
    return;
  }

  syncAcrylicPriceInputsToState(type);
  const rowName = _ctx.getAcrylicBaseLabel(_ctx.getPriceTable().customer[type][index].label);

  _ctx.showDeleteConfirmationModal(
    'Remove Row?',
    `Are you sure you want to remove "${rowName}"?`,
    () => {
      _ctx.getPriceTable().customer[type].splice(index, 1);
      _ctx.getPriceTable().agent[type].splice(index, 1);
      renderAcrylicPricingSettingsTable();
      _ctx.showToast(`Removed "${rowName}".`);
    }
  );
}

export function addAcrylicMarkupRule() {
  syncAcrylicMarkupInputsToState();
  const insertIndex = Math.max(_ctx.getMarkupRules().customer.length - 1, 0);
  _ctx.getMarkupRules().customer.splice(insertIndex, 0, { threshold: 0, multiplier: 1 });
  _ctx.getMarkupRules().agent.splice(insertIndex, 0, { threshold: 0, multiplier: 1 });
  renderAcrylicPricingSettingsTable();
}

export function moveAcrylicMarkupRuleUp(index) {
  syncAcrylicMarkupInputsToState();
  if (index > 0) {
    [_ctx.getMarkupRules().customer[index], _ctx.getMarkupRules().customer[index - 1]] = [_ctx.getMarkupRules().customer[index - 1], _ctx.getMarkupRules().customer[index]];
    [_ctx.getMarkupRules().agent[index], _ctx.getMarkupRules().agent[index - 1]] = [_ctx.getMarkupRules().agent[index - 1], _ctx.getMarkupRules().agent[index]];
    renderAcrylicPricingSettingsTable();
    _ctx.highlightMoveRow('data-acrylic-markup-row', `${index - 1}`);
  }
}

export function moveAcrylicMarkupRuleDown(index) {
  syncAcrylicMarkupInputsToState();
  if (index < _ctx.getMarkupRules().customer.length - 2) {
    [_ctx.getMarkupRules().customer[index], _ctx.getMarkupRules().customer[index + 1]] = [_ctx.getMarkupRules().customer[index + 1], _ctx.getMarkupRules().customer[index]];
    [_ctx.getMarkupRules().agent[index], _ctx.getMarkupRules().agent[index + 1]] = [_ctx.getMarkupRules().agent[index + 1], _ctx.getMarkupRules().agent[index]];
    renderAcrylicPricingSettingsTable();
    _ctx.highlightMoveRow('data-acrylic-markup-row', `${index + 1}`);
  }
}

export function removeAcrylicMarkupRule(index) {
  if (_ctx.getMarkupRules().customer.length <= 2) {
    _ctx.showToast('Cannot remove the last editable rule.');
    return;
  }

  syncAcrylicMarkupInputsToState();
  _ctx.showDeleteConfirmationModal(
    'Remove Rule?',
    'Are you sure you want to remove this markup rule?',
    () => {
      _ctx.getMarkupRules().customer.splice(index, 1);
      _ctx.getMarkupRules().agent.splice(index, 1);
      renderAcrylicPricingSettingsTable();
      _ctx.showToast('Markup rule removed.');
    }
  );
}

export function toggleAcrylicSettingsEditMode(section, isEditing) {
  if (isEditing) {
    if (section === 'materials') {
      _ctx.setBackup('originalAcrylicMaterialPriceTable', JSON.parse(JSON.stringify(_ctx.getPriceTable())));
    } else if (section === 'printing') {
      _ctx.setBackup('originalAcrylicPrintingPriceTable', JSON.parse(JSON.stringify(_ctx.getPriceTable())));
    } else if (section === 'markup') {
      _ctx.setBackup('originalAcrylicMarkupRules', JSON.parse(JSON.stringify(_ctx.getMarkupRules())));
    }
  }

  _ctx.getEditState()[section] = isEditing;
  renderAcrylicPricingSettingsTable();
}

export function cancelAcrylicSettingsEdit(section) {
  if (section === 'materials' && _ctx.getBackup('originalAcrylicMaterialPriceTable')) {
    _ctx.replacePriceTable(JSON.parse(JSON.stringify(_ctx.getBackup('originalAcrylicMaterialPriceTable'))));
  } else if (section === 'printing' && _ctx.getBackup('originalAcrylicPrintingPriceTable')) {
    _ctx.replacePriceTable(JSON.parse(JSON.stringify(_ctx.getBackup('originalAcrylicPrintingPriceTable'))));
  } else if (section === 'markup' && _ctx.getBackup('originalAcrylicMarkupRules')) {
    _ctx.replaceMarkupRules(JSON.parse(JSON.stringify(_ctx.getBackup('originalAcrylicMarkupRules'))));
  }

  _ctx.getEditState()[section] = false;
  renderAcrylicPricingSettingsTable();
}

function _confirmSave_saveAcrylicSettings(section, index) {

  if (section === 'materials' || section === 'printing') {
    const draftPriceTable = JSON.parse(JSON.stringify(_ctx.getPriceTable()));
    const type = section === 'materials' ? 'acrylic' : 'print';

    for (const [index, item] of draftPriceTable.customer[type].entries()) {
      const nameInput = document.querySelector(`[data-acrylic-type="${type}"][data-row-index="${index}"][data-field="name"]`);
      const customerInput = document.querySelector(`[data-acrylic-type="${type}"][data-row-index="${index}"][data-field="customerPrice"]`);
      const agentInput = document.querySelector(`[data-acrylic-type="${type}"][data-row-index="${index}"][data-field="agentPrice"]`);

      const baseName = nameInput ? nameInput.value.trim() : _ctx.getAcrylicBaseLabel(item.label);
      const customerPrice = customerInput ? parseFloat(customerInput.value) : item.price;
      const agentPrice = agentInput ? parseFloat(agentInput.value) : draftPriceTable.agent[type][index].price;

      if (!baseName || Number.isNaN(customerPrice) || Number.isNaN(agentPrice)) {
        alert('Please fill all Acrylic pricing fields with valid values.');
        return;
      }

      draftPriceTable.customer[type][index] = {
        ...draftPriceTable.customer[type][index],
        label: _ctx.formatAcrylicUnitLabel(baseName, customerPrice),
        price: customerPrice
      };
      draftPriceTable.agent[type][index] = {
        ...draftPriceTable.agent[type][index],
        label: _ctx.formatAcrylicUnitLabel(baseName, agentPrice),
        price: agentPrice
      };
    }

    _ctx.replacePriceTable(draftPriceTable);
  }

  if (section === 'markup') {
    const draftMarkupRules = JSON.parse(JSON.stringify(_ctx.getMarkupRules()));

    for (const [index] of draftMarkupRules.customer.entries()) {
      const thresholdInput = document.querySelector(`[data-markup-row-index="${index}"][data-field="threshold"]`);
      const customerMultiplierInput = document.querySelector(`[data-markup-row-index="${index}"][data-field="customerMultiplier"]`);
      const agentMultiplierInput = document.querySelector(`[data-markup-row-index="${index}"][data-field="agentMultiplier"]`);

      const isLastRule = index === draftMarkupRules.customer.length - 1;
      const threshold = isLastRule ? Infinity : parseFloat(thresholdInput.value);
      const customerMultiplier = parseFloat(customerMultiplierInput.value);
      const agentMultiplier = parseFloat(agentMultiplierInput.value);

      if ((!isLastRule && Number.isNaN(threshold)) || Number.isNaN(customerMultiplier) || Number.isNaN(agentMultiplier)) {
        alert('Please fill all Acrylic markup fields with valid values.');
        return;
      }

      draftMarkupRules.customer[index] = { threshold, multiplier: customerMultiplier };
      draftMarkupRules.agent[index] = { threshold, multiplier: agentMultiplier };
    }

    _ctx.replaceMarkupRules(draftMarkupRules);
  }

  _ctx.closeSaveConfirmationModal();
  _ctx.saveAcrylicSettings();
  _ctx.getEditState()[section] = false;

  if (section === 'materials') {
    _ctx.setBackup('originalAcrylicMaterialPriceTable', null);
  } else if (section === 'printing') {
    _ctx.setBackup('originalAcrylicPrintingPriceTable', null);
  } else if (section === 'markup') {
    _ctx.setBackup('originalAcrylicMarkupRules', null);
  }

  _ctx.showToast('Acrylic settings saved!', 'success');
  renderAcrylicPricingSettingsTable();
}

export function saveAcrylicSettingsSection(section) {
  _ctx.setPendingCallback(() => _confirmSave_saveAcrylicSettings(section, null));
}

export function renderAcrylicPricingSettingsTable() {
  const isMaterialsEditing = _ctx.getEditState().materials;
  const isPrintingEditing = _ctx.getEditState().printing;
  const isMarkupEditing = _ctx.getEditState().markup;

  const renderPriceRows = (type, isEditing) => _ctx.getPriceTable().customer[type].map((customerItem, index) => {
    const agentItem = _ctx.getPriceTable().agent[type][index];
    const baseName = _ctx.getAcrylicBaseLabel(customerItem.label);

    return `
      <tr data-acrylic-price-row="${type}-${index}">
        <td>
          ${isEditing
            ? `<input type="text" value="${baseName}" data-acrylic-type="${type}" data-row-index="${index}" data-field="name" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align:center;">`
            : `<strong>${baseName}</strong>`}
        </td>
        <td class="customer-price-col">
          ${isEditing
            ? `<input type="number" step="0.01" value="${customerItem.price.toFixed(2)}" data-acrylic-type="${type}" data-row-index="${index}" data-field="customerPrice" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align:center;">`
            : `${_ctx.getCurrentCurrency().symbol}${customerItem.price.toFixed(2)}`}
        </td>
        <td class="agent-price-col">
          ${isEditing
            ? `<input type="number" step="0.01" value="${agentItem.price.toFixed(2)}" data-acrylic-type="${type}" data-row-index="${index}" data-field="agentPrice" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align:center;">`
            : `${_ctx.getCurrentCurrency().symbol}${agentItem.price.toFixed(2)}`}
        </td>
        ${isEditing ? `<td style="padding:4px; white-space:nowrap; vertical-align: middle;">
          <div style="display: flex; justify-content: center; align-items: center; gap: 4px;">
            <button class="btn btn-sm btn-secondary" style="padding:7px 10px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveAcrylicPriceUp('${type}', ${index})"><i class="fas fa-arrow-up"></i></button>
            <button class="btn btn-sm btn-secondary" style="padding:7px 10px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveAcrylicPriceDown('${type}', ${index})"><i class="fas fa-arrow-down"></i></button>
            <button class="btn btn-sm btn-danger" style="padding:7px 10px; border-radius:6px;" onclick="removeAcrylicPriceRow('${type}', ${index})"><i class="fas fa-trash"></i></button>
          </div>
        </td>` : ''}
      </tr>`;
  }).join('');

  const markupRows = _ctx.getMarkupRules().customer.map((customerRule, index) => {
    const agentRule = _ctx.getMarkupRules().agent[index];
    const isLastRule = index === _ctx.getMarkupRules().customer.length - 1;

    return `
      <tr data-acrylic-markup-row="${index}">
        <td>
          ${isMarkupEditing
            ? (isLastRule
              ? `<div class="text-center font-semibold">Infinity</div>`
              : `<input type="number" step="0.01" value="${customerRule.threshold}" data-markup-row-index="${index}" data-field="threshold" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align:center;">`)
            : (isLastRule ? 'Infinity' : `${_ctx.getCurrentCurrency().symbol}${_ctx.formatCurrency(customerRule.threshold)}`)}
        </td>
        <td class="customer-price-col">
          ${isMarkupEditing
            ? `<input type="number" step="0.01" value="${customerRule.multiplier}" data-markup-row-index="${index}" data-field="customerMultiplier" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align:center;">`
            : customerRule.multiplier.toFixed(2)}
        </td>
        <td class="agent-price-col">
          ${isMarkupEditing
            ? `<input type="number" step="0.01" value="${agentRule.multiplier}" data-markup-row-index="${index}" data-field="agentMultiplier" class="form-control text-center" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align:center;">`
            : agentRule.multiplier.toFixed(2)}
        </td>
        ${isMarkupEditing ? `<td style="padding:4px; white-space:nowrap; vertical-align: middle;">
          ${isLastRule ? '' : `<div style="display: flex; justify-content: center; align-items: center; gap: 4px;">
            <button class="btn btn-sm btn-secondary" style="padding:7px 10px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveAcrylicMarkupRuleUp(${index})"><i class="fas fa-arrow-up"></i></button>
            <button class="btn btn-sm btn-secondary" style="padding:7px 10px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveAcrylicMarkupRuleDown(${index})"><i class="fas fa-arrow-down"></i></button>
            <button class="btn btn-sm btn-danger" style="padding:7px 10px; border-radius:6px;" onclick="removeAcrylicMarkupRule(${index})"><i class="fas fa-trash"></i></button>
          </div>`}
        </td>` : ''}
      </tr>`;
  }).join('');

  const html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px;">
        <div>
          <h4 style="margin:0 0 4px 0;">Acrylic/Wood Prices</h4>
        </div>
        <div style="display:flex; gap:8px;">
          ${isMaterialsEditing
            ? `<button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px; width:auto; margin-top:0;" onclick="addAcrylicPriceRow('acrylic')">+ Add Material</button>
               <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px; width:auto; margin-top:0;" onclick="cancelAcrylicSettingsEdit('materials')">Cancel</button>
               <button class="btn btn-sm btn-primary" style="padding: 8px 14px; font-size: 13px; width:auto; margin-top:0;" onclick="saveAcrylicSettingsSection('materials')">Done</button>`
            : `<button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px; width:auto; margin-top:0;" onclick="toggleAcrylicSettingsEditMode('materials', true)">Edit</button>`}
        </div>
      </div>
      <table class="settings-table" style="margin-top:0; width: 100%; margin-bottom: 24px; table-layout: fixed;">
        <colgroup>
          <col style="width: ${isMaterialsEditing ? '45%' : '60%'};">
          <col style="width: ${isMaterialsEditing ? '20%' : '20%'};">
          <col style="width: ${isMaterialsEditing ? '20%' : '20%'};">
          ${isMaterialsEditing ? '<col style="width: 15%;">' : ''}
        </colgroup>
          <thead>
            <tr>
              <th>Material</th>
              <th class="customer-price-col">Customer Price</th>
              <th class="agent-price-col">Agent Price</th>
              ${isMaterialsEditing ? '<th class="text-center">Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>${renderPriceRows('acrylic', isMaterialsEditing)}</tbody>
        </table>

      <div style="display: flex; justify-content: space-between; align-items: center; margin: 24px 0 16px 0; gap: 12px; padding-top: 24px; border-top: 1px solid var(--border-color);">
        <div>
          <h4 style="margin:0 0 4px 0;">Printing Prices (per inÂ²)</h4>
        </div>
        <div style="display:flex; gap:8px;">
          ${isPrintingEditing
            ? `<button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px; width:auto; margin-top:0;" onclick="addAcrylicPriceRow('print')">+ Add Service</button>
               <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px; width:auto; margin-top:0;" onclick="cancelAcrylicSettingsEdit('printing')">Cancel</button>
               <button class="btn btn-sm btn-primary" style="padding: 8px 14px; font-size: 13px; width:auto; margin-top:0;" onclick="saveAcrylicSettingsSection('printing')">Done</button>`
            : `<button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px; width:auto; margin-top:0;" onclick="toggleAcrylicSettingsEditMode('printing', true)">Edit</button>`}
        </div>
      </div>
      <table class="settings-table" style="margin-top:0; width: 100%; margin-bottom: 24px; table-layout: fixed;">
        <colgroup>
          <col style="width: ${isPrintingEditing ? '45%' : '60%'};">
          <col style="width: ${isPrintingEditing ? '20%' : '20%'};">
          <col style="width: ${isPrintingEditing ? '20%' : '20%'};">
          ${isPrintingEditing ? '<col style="width: 15%;">' : ''}
        </colgroup>
          <thead>
            <tr>
              <th>Service</th>
              <th class="customer-price-col">Customer Price</th>
              <th class="agent-price-col">Agent Price</th>
              ${isPrintingEditing ? '<th class="text-center">Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>${renderPriceRows('print', isPrintingEditing)}</tbody>
      </table>

      <div style="display: flex; justify-content: space-between; align-items: center; margin: 24px 0 16px 0; gap: 12px; padding-top: 24px; border-top: 1px solid var(--border-color);">
          <div>
            <h4 style="margin:0 0 4px 0;">Markup Rules</h4>
            <p style="margin:0; font-size: 13px; color: #9ca3af;">Adjust the multiplier bands used to apply markup or discount by price range.</p>
          </div>
          <div style="display:flex; gap:8px;">
            ${isMarkupEditing
              ? `<button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px; width:auto; margin-top:0;" onclick="addAcrylicMarkupRule()">+ Add Rule</button>
                 <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px; width:auto; margin-top:0;" onclick="cancelAcrylicSettingsEdit('markup')">Cancel</button>
                 <button class="btn btn-sm btn-primary" style="padding: 8px 14px; font-size: 13px; width:auto; margin-top:0;" onclick="saveAcrylicSettingsSection('markup')">Done</button>`
              : `<button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px; width:auto; margin-top:0;" onclick="toggleAcrylicSettingsEditMode('markup', true)">Edit</button>`}
          </div>
      </div>

      <table class="settings-table" style="margin-top:0; width: 100%; table-layout: fixed;">
        <colgroup>
          <col style="width: ${isMarkupEditing ? '45%' : '60%'};">
          <col style="width: ${isMarkupEditing ? '20%' : '20%'};">
          <col style="width: ${isMarkupEditing ? '20%' : '20%'};">
          ${isMarkupEditing ? '<col style="width: 15%;">' : ''}
        </colgroup>
        <thead>
          <tr>
            <th>Up To Price</th>
            <th class="customer-price-col">Customer Multiplier</th>
            <th class="agent-price-col">Agent Multiplier</th>
            ${isMarkupEditing ? '<th class="text-center">Actions</th>' : ''}
          </tr>
        </thead>
        <tbody>${markupRows}</tbody>
      </table>`;

  { const _s = saveSettingsScrolls(); document.getElementById("settingsTableDiv").innerHTML = html; restoreSettingsScrolls(_s); }
}

