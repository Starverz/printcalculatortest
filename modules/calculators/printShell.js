function animateInputValue(inputEl, fromValue, toValue, precision, onComplete) {
  const duration = 300;
  const startTime = performance.now();

  inputEl.classList.remove('unit-value-animate');
  void inputEl.offsetWidth;
  inputEl.classList.add('unit-value-animate');

  function updateValue(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const currentValue = fromValue + (toValue - fromValue) * easeOut;

    inputEl.value = currentValue.toFixed(precision);

    if (progress < 1) {
      requestAnimationFrame(updateValue);
    } else {
      inputEl.value = toValue.toFixed(precision);
      setTimeout(() => {
        inputEl.classList.remove('unit-value-animate');
      }, 100);
      if (onComplete) onComplete();
    }
  }

  requestAnimationFrame(updateValue);
}

export function toggleRatioLock(context) {
  const nextValue = !context.getIsRatioLocked();
  context.setIsRatioLocked(nextValue);

  const lockBtn = document.getElementById('toggleRatioLockBtn');
  const widthInput = document.getElementById('width');
  const heightInput = document.getElementById('height');
  if (!lockBtn) return;

  if (context.getGlobalAgentMode()) {
    lockBtn.classList.add('agent-active');
  } else {
    lockBtn.classList.remove('agent-active');
  }

  if (nextValue) {
    lockBtn.innerHTML = '<i class="fas fa-lock fa-fw"></i>';
    lockBtn.classList.add('active');
    const width = parseFloat(widthInput?.value) || 0;
    const height = parseFloat(heightInput?.value) || 0;
    context.setCurrentAspectRatio(width > 0 && height > 0 ? width / height : 1);
  } else {
    lockBtn.innerHTML = '<i class="fas fa-lock-open fa-fw"></i>';
    lockBtn.classList.remove('active');
  }
}

export function handleDimensionInput(changedField, context) {
  if (context.getIsRatioLocked()) {
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    const width = parseFloat(widthInput?.value) || 0;
    const height = parseFloat(heightInput?.value) || 0;
    const precision = context.getCurrentInputUnit() === 'mm' || context.getCurrentInputUnit() === 'cm' ? 1 : 2;
    const ratio = context.getCurrentAspectRatio();

    if (changedField === 'width' && width > 0) {
      heightInput.value = (width / ratio).toFixed(precision);
    } else if (changedField === 'height' && height > 0) {
      widthInput.value = (height * ratio).toFixed(precision);
    }
  }

  context.kiraHarga();
}

export function capturePrintingCalculatorState(context) {
  const widthEl = document.getElementById('width');
  const heightEl = document.getElementById('height');
  const unitEl = document.getElementById('measurementUnit');
  if (!widthEl || !heightEl || !unitEl) return null;

  return {
    itemTitle: document.getElementById('itemTitle') ? document.getElementById('itemTitle').value : '',
    width: widthEl.value,
    height: heightEl.value,
    unit: unitEl.value,
    eyeletOption: document.getElementById('eyeletOption') ? document.getElementById('eyeletOption').value : null,
    whiteBorderOption: document.getElementById('whiteBorderOption') ? document.getElementById('whiteBorderOption').value : null,
    isCustomBorderActive: !!(document.getElementById('customBorderToggle') && document.getElementById('customBorderToggle').classList.contains('btn-primary')),
    manualTop: document.getElementById('manualTop') ? document.getElementById('manualTop').value : null,
    manualBottom: document.getElementById('manualBottom') ? document.getElementById('manualBottom').value : null,
    manualLeft: document.getElementById('manualLeft') ? document.getElementById('manualLeft').value : null,
    manualRight: document.getElementById('manualRight') ? document.getElementById('manualRight').value : null,
    customBorderTop: document.getElementById('customBorderTop') ? document.getElementById('customBorderTop').value : null,
    customBorderBottom: document.getElementById('customBorderBottom') ? document.getElementById('customBorderBottom').value : null,
    customBorderLeft: document.getElementById('customBorderLeft') ? document.getElementById('customBorderLeft').value : null,
    customBorderRight: document.getElementById('customBorderRight') ? document.getElementById('customBorderRight').value : null,
    governmentChk: !!(document.getElementById('governmentChk') && document.getElementById('governmentChk').checked),
    printerSize: document.getElementById('printerSize') ? document.getElementById('printerSize').value : 'none',
    artworkToolsOpen: !!(document.getElementById('artworkToolsPanel') && document.getElementById('artworkToolsPanel').classList.contains('panel-open')),
    downloadOptionsOpen: !!(document.getElementById('downloadOptionsPanel') && document.getElementById('downloadOptionsPanel').classList.contains('panel-open')),
    lastClickedASize: context.getLastClickedASize(),
  };
}

export function restorePrintingCalculatorState(state, context) {
  if (!state) return;

  if (document.getElementById('itemTitle')) document.getElementById('itemTitle').value = state.itemTitle || '';
  if (document.getElementById('width')) document.getElementById('width').value = state.width;
  if (document.getElementById('height')) document.getElementById('height').value = state.height;
  if (document.getElementById('measurementUnit') && state.unit) {
    document.getElementById('measurementUnit').value = state.unit;
    context.setCurrentInputUnit(state.unit);
    document.querySelectorAll('.dynamic-unit').forEach((span) => {
      span.textContent = state.unit;
    });
  }

  if (document.getElementById('eyeletOption') && state.eyeletOption !== null) document.getElementById('eyeletOption').value = state.eyeletOption;
  if (document.getElementById('whiteBorderOption') && state.whiteBorderOption !== null) document.getElementById('whiteBorderOption').value = state.whiteBorderOption;

  if (document.getElementById('manualTop') && state.manualTop !== null) document.getElementById('manualTop').value = state.manualTop;
  if (document.getElementById('manualBottom') && state.manualBottom !== null) document.getElementById('manualBottom').value = state.manualBottom;
  if (document.getElementById('manualLeft') && state.manualLeft !== null) document.getElementById('manualLeft').value = state.manualLeft;
  if (document.getElementById('manualRight') && state.manualRight !== null) document.getElementById('manualRight').value = state.manualRight;

  if (document.getElementById('customBorderTop') && state.customBorderTop !== null) document.getElementById('customBorderTop').value = state.customBorderTop;
  if (document.getElementById('customBorderBottom') && state.customBorderBottom !== null) document.getElementById('customBorderBottom').value = state.customBorderBottom;
  if (document.getElementById('customBorderLeft') && state.customBorderLeft !== null) document.getElementById('customBorderLeft').value = state.customBorderLeft;
  if (document.getElementById('customBorderRight') && state.customBorderRight !== null) document.getElementById('customBorderRight').value = state.customBorderRight;

  if (document.getElementById('governmentChk')) document.getElementById('governmentChk').checked = !!state.governmentChk;
  if (document.getElementById('printerSize') && state.printerSize) document.getElementById('printerSize').value = state.printerSize;

  const customBtn = document.getElementById('customBorderToggle');
  if (customBtn) {
    customBtn.classList.remove('btn-primary', 'btn-secondary');
    customBtn.classList.add(state.isCustomBorderActive ? 'btn-primary' : 'btn-secondary');
    if (context.getGlobalAgentMode()) customBtn.classList.add('agent-active');
    else customBtn.classList.remove('agent-active');
  }

  if (state.lastClickedASize) {
    context.setLastClickedASize(state.lastClickedASize);
  }

  const artPanel = document.getElementById('artworkToolsPanel');
  const artIcon = document.getElementById('artToggleIcon');
  const artBtn = document.getElementById('artworkToolsBtn');
  const dlPanel = document.getElementById('downloadOptionsPanel');
  const dlIcon = document.getElementById('dlToggleIcon');
  const dlBtn = document.getElementById('downloadOptionsBtn');

  const artOpen = !!state.artworkToolsOpen;
  const dlOpen = !!state.downloadOptionsOpen && !artOpen;

  if (artPanel) artPanel.classList.toggle('panel-open', artOpen);
  if (dlPanel) dlPanel.classList.toggle('panel-open', dlOpen);

  if (artIcon) {
    artIcon.classList.toggle('fa-chevron-up', artOpen);
    artIcon.classList.toggle('fa-chevron-down', !artOpen);
  }
  if (dlIcon) {
    dlIcon.classList.toggle('fa-chevron-up', dlOpen);
    dlIcon.classList.toggle('fa-chevron-down', !dlOpen);
  }

  context.applyMainCalcPanelButtonVisual(artBtn, artOpen);
  context.applyMainCalcPanelButtonVisual(dlBtn, dlOpen);
  context.getArtConfig().showTools = artOpen;

  document.querySelectorAll('.calculator-panel .custom-sticker-dropdown').forEach((wrapper) => {
    const select = wrapper.querySelector('select');
    if (select && select.id && wrapper.id) context.syncStickerDropdownLabel(select.id, wrapper.id);
  });
}

export function showCalculator(category, index, preservedState, context) {
  const gridContainer = document.querySelector('.material-grid-container');
  if (gridContainer) {
    context.setScrollPosition(category, gridContainer.scrollTop);
  }

  context.setCurrentInputUnit(context.getLastUsedDimensions().unit);
  context.setSelectedMaterialIndex(index);
  context.setCurrentCategory(category);

  const sourceArray = category === 'largeFormat' ? context.getMaterials() : context.getSignboardMaterials();
  const material = sourceArray[index];
  if (!material) return;

  context.setPricePerSqFt(material.agent ? material.agentPrice : material.customerPrice);
  context.setIsStickerOrPolysilk(material.simple);

  const content = document.getElementById('contentArea');
  const gridHTML = category === 'largeFormat'
    ? context.renderMaterialGrid(content, 'largeFormat', true)
    : context.renderMaterialGrid(content, 'signboard', true);
  const catName = category === 'largeFormat' ? 'Large Format' : 'Signboard';
  const { width: lastUsedWidth, height: lastUsedHeight } = context.getLastUsedDimensions();
  const defaultWidth = material.fixed ? material.fixedWidth : lastUsedWidth;
  const defaultHeight = material.fixed ? material.fixedHeight : lastUsedHeight;
  const isFixed = material.fixed;
  const titleColor = material.agent ? 'var(--success-color)' : 'var(--primary-color)';
  const agentSuffix = material.agent ? ' - Agent' : '';
  const agentClass = material.agent ? ' agent-active' : '';
  const lockActiveClass = context.getIsRatioLocked() ? ' active' : '';
  const lockIconClass = context.getIsRatioLocked() ? 'fa-lock' : 'fa-lock-open';
  const panelPrimaryColor = material.agent ? 'var(--success-color)' : 'var(--primary-color)';
  const priceUnit = material.fixed ? '' : ' / sq ft';
  const currentInputUnit = context.getCurrentInputUnit();
  const currentCurrency = context.getCurrentCurrency();

  if (context.getIsRatioLocked() && defaultWidth > 0 && defaultHeight > 0) {
    context.setCurrentAspectRatio(defaultWidth / defaultHeight);
  }

  content.innerHTML = `
<h2 style="width: 75%; max-width: 1100px; margin: 0 auto; text-align: center;">${catName} - Select Material</h2>
${gridHTML}
<div class='calculator-panel' style="overflow: hidden; padding-top: 0;">
  <div style="background-color: ${panelPrimaryColor}; color: white; text-align: center; padding: 12px 16px; font-size: 15px; font-weight: 700; margin: 0 -20px 12px -20px; border-radius: 12px 12px 0 0; letter-spacing: 0.01em;">
    ${material.name} &mdash; ${currentCurrency.symbol}${context.formatCurrency(context.getPricePerSqFt())}${priceUnit}${agentSuffix}
  </div>

<div class="lf-title-preset-row" style="display: grid; grid-template-columns: 1fr auto; gap: 8px 20px; align-items: flex-end; margin-top: 6px;">
  <div>
  <label for='itemTitle'>Custom Title (Optional):</label>
  <input type='text' id='itemTitle' placeholder="e.g., Design Title" oninput="kiraHarga()" />
  </div>
  <div>
  <label>Preset A-Sizes:</label>
  <div id="aSizeBtnGroup" class="size-btn-group" style="flex-wrap: wrap;"><button id="btn-A0" class="size-btn${agentClass}" onclick="setASize('A0', 841, 1189)">A0</button><button id="btn-A1" class="size-btn${agentClass}" onclick="setASize('A1', 594, 841)">A1</button><button id="btn-A2" class="size-btn${agentClass}" onclick="setASize('A2', 420, 594)">A2</button><button id="btn-A3" class="size-btn${agentClass}" onclick="setASize('A3', 297, 420)">A3</button><button id="btn-A4" class="size-btn${agentClass}" onclick="setASize('A4', 210, 297)">A4</button><button id="btn-A5" class="size-btn${agentClass}" onclick="setASize('A5', 148, 210)">A5</button><button id="btn-A6" class="size-btn${agentClass}" onclick="setASize('A6', 105, 148)">A6</button></div>
  </div>
</div>

  <div class="lf-dimension-row">
    <div class="lf-dimension-field lf-dimension-field--width">
      <label for='width'>Width:</label>
      <div style="position: relative;">
        <input type='number' id='width' step='0.1' value='${defaultWidth}' oninput='lastClickedASize = null; clearASizeHighlight(); handleDimensionInput("width");' ${isFixed ? 'disabled' : ''} class="p-2 border rounded-lg h-11 bg-white dark:bg-[#374151] text-gray-900 dark:text-white border-gray-300 dark:border-[#4b5563] w-full" style="padding-right: 35px; box-sizing: border-box;"/>
        <span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">${currentInputUnit}</span>
      </div>
    </div>
    <div class="lf-dimension-field lf-dimension-field--height">
      <label for='height'>Height:</label>
      <div style="position: relative;">
        <input type='number' id='height' step='0.1' value='${defaultHeight}' oninput='lastClickedASize = null; clearASizeHighlight(); handleDimensionInput("height");' ${isFixed ? 'disabled' : ''} class="p-2 border rounded-lg h-11 bg-white dark:bg-[#374151] text-gray-900 dark:text-white border-gray-300 dark:border-[#4b5563] w-full" style="padding-right: 35px; box-sizing: border-box;"/>
        <span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">${currentInputUnit}</span>
      </div>
    </div>
    <div class="lf-dimension-field lf-dimension-field--unit">
      <label>Unit:</label>
      <div class="custom-sticker-dropdown" id="measurementUnitWrapper" onclick="toggleGenericStickerDropdown(event, 'measurementUnitWrapper')">
        <div class="custom-sticker-dropdown-trigger">
          <span class="custom-sticker-dropdown-label" id="measurementUnitLabel">Feet (ft)</span>
          <svg class="custom-sticker-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="custom-sticker-dropdown-options">
          <div class="custom-sticker-dropdown-option ${currentInputUnit === 'ft' ? 'selected' : ''}" data-value="ft" onmousedown="selectGenericStickerDropdownOption('measurementUnit', 'measurementUnitWrapper', 'ft', 'changeUnits')">Feet (ft)</div>
          <div class="custom-sticker-dropdown-option ${currentInputUnit === 'in' ? 'selected' : ''}" data-value="in" onmousedown="selectGenericStickerDropdownOption('measurementUnit', 'measurementUnitWrapper', 'in', 'changeUnits')">Inches (in)</div>
          <div class="custom-sticker-dropdown-option ${currentInputUnit === 'cm' ? 'selected' : ''}" data-value="cm" onmousedown="selectGenericStickerDropdownOption('measurementUnit', 'measurementUnitWrapper', 'cm', 'changeUnits')">Centimeter (cm)</div>
          <div class="custom-sticker-dropdown-option ${currentInputUnit === 'mm' ? 'selected' : ''}" data-value="mm" onmousedown="selectGenericStickerDropdownOption('measurementUnit', 'measurementUnitWrapper', 'mm', 'changeUnits')">Millimeter (mm)</div>
          <div class="custom-sticker-dropdown-option ${currentInputUnit === 'm' ? 'selected' : ''}" data-value="m" onmousedown="selectGenericStickerDropdownOption('measurementUnit', 'measurementUnitWrapper', 'm', 'changeUnits')">Meter (m)</div>
        </div>
        <select id='measurementUnit' onchange='changeUnits(this.value)' class="hidden-native-select" style="display:none;">
          <option value='ft' ${currentInputUnit === 'ft' ? 'selected' : ''}>Feet (ft)</option>
          <option value='in' ${currentInputUnit === 'in' ? 'selected' : ''}>Inches (in)</option>
          <option value='cm' ${currentInputUnit === 'cm' ? 'selected' : ''}>Centimeter (cm)</option>
          <option value='mm' ${currentInputUnit === 'mm' ? 'selected' : ''}>Millimeter (mm)</option>
          <option value='m' ${currentInputUnit === 'm' ? 'selected' : ''}>Meter (m)</option>
        </select>
      </div>
    </div>
    <div class="lf-dimension-icon-group">
      <button class="btn size-btn${agentClass} lf-dimension-icon-btn lf-dimension-icon-btn--switch" onclick="switchDimensions()" style="height: 44px; width: 44px; padding: 0; display: flex; align-items: center; justify-content: center; flex-grow: 0; border-radius: 0.5rem;" ${isFixed ? 'disabled' : ''}><i class="fas fa-exchange-alt fa-fw"></i></button>
      <button id="toggleRatioLockBtn" class="btn size-btn${agentClass}${lockActiveClass} lf-dimension-icon-btn lf-dimension-icon-btn--lock" onclick="toggleRatioLock()" style="height: 44px; width: 44px; padding: 0; display: flex; align-items: center; justify-content: center; flex-grow: 0; border-radius: 0.5rem;" ${isFixed ? 'disabled' : ''}><i class="fas ${lockIconClass} fa-fw"></i></button>
    </div>
  </div>
            
            <div class="lf-finishing-row" style="display: grid; grid-template-columns: ${!material.simple ? '1fr 1fr auto' : '1fr auto'}; gap: 12px; margin-top: 6px; align-items: flex-end;">
                ${!material.simple ? `
                <div>
                    <label>Finishing:</label>
                    <div class="custom-sticker-dropdown" id="eyeletOptionWrapper" onclick="toggleGenericStickerDropdown(event, 'eyeletOptionWrapper')">
                        <div class="custom-sticker-dropdown-trigger">
                            <span class="custom-sticker-dropdown-label" id="eyeletOptionLabel">Auto Eyelets</span>
                            <svg class="custom-sticker-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div class="custom-sticker-dropdown-options">
                            <div class="custom-sticker-dropdown-option selected" onmousedown="selectGenericStickerDropdownOption('eyeletOption', 'eyeletOptionWrapper', 'auto', 'updateFinishingOptions')">Auto Eyelets</div>
                            <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('eyeletOption', 'eyeletOptionWrapper', 'manual', 'updateFinishingOptions')">Manual Eyelets</div>
                            <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('eyeletOption', 'eyeletOptionWrapper', 'pipe', 'updateFinishingOptions')">Pipe</div>
                            <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('eyeletOption', 'eyeletOptionWrapper', 'none', 'updateFinishingOptions')">No Finishing</div>
                        </div>
                        <select id='eyeletOption' onchange='updateFinishingOptions()' class="hidden-native-select" style="display:none;">
                            <option value='auto' selected>Auto Eyelets</option>
                            <option value='manual'>Manual Eyelets</option>
                            <option value='pipe'>Pipe</option>
                            <option value='none'>No Finishing</option>
                        </select>
                    </div>
                </div>` : ''}
                
                <div class="lf-finishing-row-bottom">
                <div>
                    <label>White Border All Side:</label>
                    <div class="custom-sticker-dropdown" id="whiteBorderOptionWrapper" onclick="toggleGenericStickerDropdown(event, 'whiteBorderOptionWrapper')">
                        <div class="custom-sticker-dropdown-trigger">
                            <span class="custom-sticker-dropdown-label" id="whiteBorderOptionLabel">None</span>
                            <svg class="custom-sticker-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div class="custom-sticker-dropdown-options">
                            <div class="custom-sticker-dropdown-option selected" onmousedown="selectGenericStickerDropdownOption('whiteBorderOption', 'whiteBorderOptionWrapper', 'none', 'kiraHarga')">None</div>
                            <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('whiteBorderOption', 'whiteBorderOptionWrapper', '1', 'kiraHarga')">1 inches</div>
                            <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('whiteBorderOption', 'whiteBorderOptionWrapper', '2', 'kiraHarga')">2 inches</div>
                            <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('whiteBorderOption', 'whiteBorderOptionWrapper', '3', 'kiraHarga')">3 inches</div>
                            <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('whiteBorderOption', 'whiteBorderOptionWrapper', '4', 'kiraHarga')">4 inches</div>
                            <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('whiteBorderOption', 'whiteBorderOptionWrapper', '5', 'kiraHarga')">5 inches</div>
                        </div>
                        <select id='whiteBorderOption' onchange='kiraHarga()' class="hidden-native-select" style="display:none;">
                            <option value='none'>None</option>
                            <option value='1'>1 inches</option>
                            <option value='2'>2 inches</option>
                            <option value='3'>3 inches</option>
                            <option value='4'>4 inches</option>
                            <option value='5'>5 inches</option>
                        </select>
                    </div>
                </div>

                <button id="customBorderToggle" class="btn btn-secondary${agentClass}" onclick="toggleCustomBorder()" style="width: auto; padding: 8px 16px; margin-bottom: 0; height: 44px; display: flex; align-items: center; justify-content: center;">
                    Custom
                </button>
                </div>
            </div>

            <div id='manualEyeletFields' style='display:none; margin-top: 10px; grid-template-columns: repeat(4, 1fr); gap: 10px;'>
                <div style="grid-column: span 4; font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-secondary); border-bottom: 1px dashed var(--border-color); padding-bottom: 2px; margin-bottom: -5px;">Manual Eyelet Position</div>
                <div><label>Top</label><input type='number' id='manualTop' value='0' oninput='kiraHarga()'/></div><div><label>Bottom</label><input type='number' id='manualBottom' value='0' oninput='kiraHarga()'/></div><div><label>Left</label><input type='number' id='manualLeft' value='0' oninput='kiraHarga()'/></div><div><label>Right</label><input type='number' id='manualRight' value='0' oninput='kiraHarga()'/></div>
            </div>
            
            <div id='customWhiteBorderFields' style='display:none; margin-top: 10px;'>
                <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-secondary); border-bottom: 1px dashed var(--border-color); padding-bottom: 2px; margin-bottom: 8px;">Custom White Border Size</div>
                <div style="grid-template-columns: repeat(4, 1fr); gap: 10px; display: grid;">
                    <div>
                        <label>Top</label>
                        <div style="position: relative;">
                            <input type='number' id='customBorderTop' value='0' step="0.1" oninput='kiraHarga()' style="padding-right: 35px;"/>
                            <span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">${currentInputUnit}</span>
                        </div>
                    </div>
                    <div>
                        <label>Bottom</label>
                        <div style="position: relative;">
                            <input type='number' id='customBorderBottom' value='0' step="0.1" oninput='kiraHarga()' style="padding-right: 35px;"/>
                            <span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">${currentInputUnit}</span>
                        </div>
                    </div>
                    <div>
                        <label>Left</label>
                        <div style="position: relative;">
                            <input type='number' id='customBorderLeft' value='0' step="0.1" oninput='kiraHarga()' style="padding-right: 35px;"/>
                            <span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">${currentInputUnit}</span>
                        </div>
                    </div>
                    <div>
                        <label>Right</label>
                        <div style="position: relative;">
                            <input type='number' id='customBorderRight' value='0' step="0.1" oninput='kiraHarga()' style="padding-right: 35px;"/>
                            <span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">${currentInputUnit}</span>
                        </div>
                    </div>
                </div>
                <span class="text-xs text-gray-500 dark:text-gray-400 mt-2">*The input size is based on the currently selected measurement unit. During Custom White Border, make sure use Inch.</span>
            </div>
            ${!material.simple ? `
            <div class="lf-gov-printer-row" style="display: grid; grid-template-columns: 1fr 1fr auto; column-gap: 16px; row-gap: 4px; margin-top: 8px; align-items: start;">
              <div class="calculator-label-like" style="grid-column: 1; grid-row: 1;">Add Government</div>

              <div style="grid-column: 1; grid-row: 2;">
                <div class="modern-checkbox-grid" style="grid-template-columns: 1fr; margin: 0;">
                  <div class="checkbox-group" style="height: 44px; box-sizing: border-box; display: flex; align-items: center;">
                    <input type='checkbox' id='governmentChk' onchange="kiraHarga()"/>
                    <label for='governmentChk'>${context.getGlobalGovSurchargePercent()}%</label>
                  </div>
                </div>
              </div>

              <label class="calculator-label-like" style="grid-column: 2 / 4; grid-row: 1;">Select Printer for Joint Glue Cost:</label>

              <div style="grid-column: 2 / 4; grid-row: 2;">
                <div class="custom-sticker-dropdown" id="printerSizeWrapper" onclick="toggleGenericStickerDropdown(event, 'printerSizeWrapper')">
                  <div class="custom-sticker-dropdown-trigger">
                    <span class="custom-sticker-dropdown-label" id="printerSizeLabel">None</span>
                    <svg class="custom-sticker-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <div class="custom-sticker-dropdown-options">
                    <div class="custom-sticker-dropdown-option selected" onmousedown="selectGenericStickerDropdownOption('printerSize', 'printerSizeWrapper', 'none', 'kiraHarga')">None</div>
                    <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('printerSize', 'printerSizeWrapper', '4', 'kiraHarga')">4ft</div>
                    <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('printerSize', 'printerSizeWrapper', '5', 'kiraHarga')">5ft</div>
                    <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('printerSize', 'printerSizeWrapper', '6', 'kiraHarga')">6ft</div>
                    <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('printerSize', 'printerSizeWrapper', '8', 'kiraHarga')">8ft</div>
                    <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('printerSize', 'printerSizeWrapper', '10', 'kiraHarga')">10ft</div>
                    <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('printerSize', 'printerSizeWrapper', '16', 'kiraHarga')">16ft</div>
                  </div>
                  <select id='printerSize' onchange='kiraHarga()' class="hidden-native-select" style="display:none;">
                    <option value='none' selected>None</option>
                    <option value='4'>4ft</option>
                    <option value='5'>5ft</option>
                    <option value='6'>6ft</option>
                    <option value='8'>8ft</option>
                    <option value='10'>10ft</option>
                    <option value='16'>16ft</option>
                  </select>
                </div>
              </div>
            </div>` : `
            <div style="display: grid; grid-template-columns: 1fr; row-gap: 4px; margin-top: 8px; align-items: start;">
              <div class="calculator-label-like">Add Government</div>
              <div class="modern-checkbox-grid" style="grid-template-columns: 1fr; margin: 0;">
                <div class="checkbox-group">
                  <input type='checkbox' id='governmentChk' onchange="kiraHarga()"/>
                  <label for='governmentChk'>${context.getGlobalGovSurchargePercent()}%</label>
                </div>
              </div>

              <label class="calculator-label-like">Select Printer for Joint Glue Cost:</label>
              <div class="custom-sticker-dropdown" id="printerSizeWrapper" onclick="toggleGenericStickerDropdown(event, 'printerSizeWrapper')">
                <div class="custom-sticker-dropdown-trigger">
                  <span class="custom-sticker-dropdown-label" id="printerSizeLabel">None</span>
                  <svg class="custom-sticker-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="custom-sticker-dropdown-options">
                  <div class="custom-sticker-dropdown-option selected" onmousedown="selectGenericStickerDropdownOption('printerSize', 'printerSizeWrapper', 'none', 'kiraHarga')">None</div>
                  <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('printerSize', 'printerSizeWrapper', '4', 'kiraHarga')">4ft</div>
                  <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('printerSize', 'printerSizeWrapper', '5', 'kiraHarga')">5ft</div>
                  <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('printerSize', 'printerSizeWrapper', '6', 'kiraHarga')">6ft</div>
                  <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('printerSize', 'printerSizeWrapper', '8', 'kiraHarga')">8ft</div>
                  <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('printerSize', 'printerSizeWrapper', '10', 'kiraHarga')">10ft</div>
                  <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('printerSize', 'printerSizeWrapper', '16', 'kiraHarga')">16ft</div>
                </div>
                <select id='printerSize' onchange='kiraHarga()' class="hidden-native-select" style="display:none;">
                  <option value='none' selected>None</option>
                  <option value='4'>4ft</option>
                  <option value='5'>5ft</option>
                  <option value='6'>6ft</option>
                  <option value='8'>8ft</option>
                  <option value='10'>10ft</option>
                  <option value='16'>16ft</option>
                </select>
              </div>
            </div>`}

    <div class='result' id='result'></div>

    <div id='previewCanvasWrapper' style='position: relative; width: fit-content; margin: 0 auto;'>
        <canvas id='previewCanvas' width='760' height='400' style='display: block;'></canvas>
        <div id='dragOverlay' style='display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.85); border: 4px dashed var(--primary-color); z-index: 10; align-items: center; justify-content: center; flex-direction: column; backdrop-filter: blur(2px);'>
            <i class='fas fa-cloud-upload-alt' style='font-size: 48px; color: var(--primary-color); margin-bottom: 10px;'></i>
            <span style='font-weight: 700; color: var(--primary-color); font-size: 18px;'>Drop Artwork Here</span>
        </div>
    </div>
    <div class="preview-action-grid" style="margin-top: 8px;">
      <button class="btn btn-sm btn-secondary preview-action-btn" id="artworkToolsBtn" onclick="toggleArtworkTools()" style="background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color);">
        <i class="fas fa-image mr-2"></i> Manage Artwork Design
        <i class="fas fa-chevron-down ml-1" id="artToggleIcon"></i>
      </button>
      <button class="btn btn-secondary btn-sm preview-action-btn" id="downloadOptionsBtn" onclick="toggleDownloadOptions()" style="background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color);">
        <i class="fas fa-file-export mr-2"></i> Download Options
        <i class="fas fa-chevron-down ml-1" id="dlToggleIcon"></i>
      </button>
      <button class="btn btn-secondary btn-sm preview-action-btn preview-action-btn--span" onclick="downloadPreviewCanvas()" style="background: transparent; color: #28a745; border: 1px solid #28a745;">
        <i class="fas fa-camera mr-2"></i> Download Preview
      </button>
    </div>

    <div id="artworkToolsPanel" class="panel-collapsible" style="background: var(--light-bg); padding-left: 16px; padding-right: 16px; border-radius: 8px;">
    
    <div style="display: flex; gap: 10px; margin-bottom: 12px; align-items: center;">
        <input type="file" id="designUpload" accept="image/png, image/jpeg, image/jpg, image/svg+xml, application/pdf" style="display: none;" onchange="handleDesignUpload(this)">
        <button class="btn btn-sm btn-primary" onclick="document.getElementById('designUpload').click()" style="width: auto; margin-top: 0; white-space: nowrap; background: ${panelPrimaryColor}; border-color: ${panelPrimaryColor};">
            <i class="fas fa-upload mr-2"></i> Upload Image
        </button>
        <button class="btn btn-sm btn-danger" onclick="clearDesign()" style="width: auto; margin-top: 0; white-space: nowrap;">
            <i class="fas fa-trash mr-2"></i> Clear
        </button>
        <div class="artwork-filename-wrapper">
            <span id="designFileName" class="artwork-filename-text"></span>
        </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr auto auto auto; gap: 8px; align-items: end;">
        <div>
            <label id="designWLabel" style="font-size: 11px;">Design Width:</label>
            <div style="position: relative;">
                <input type="number" id="designW" step="0.1" oninput="updateDesignDims('w')" disabled style="padding-right: 30px;">
                <span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">ft</span>
            </div>
        </div>
        <div>
            <label id="designHLabel" style="font-size: 11px;">Design Height:</label>
            <div style="position: relative;">
                <input type="number" id="designH" step="0.1" oninput="updateDesignDims('h')" disabled style="padding-right: 30px;">
                <span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">ft</span>
            </div>
        </div>
        
        <button class="btn btn-sm bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600" onclick="rotateDesignImg()" title="Rotate 90°" style="height: 42px; width: 42px; display: flex; align-items: center; justify-content: center; margin-top: 0;">
            <i class="fas fa-sync-alt"></i>
        </button>
        
          <button class="btn btn-sm bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 active-control ${agentClass}" id="artLockBtn" onclick="toggleArtLock()" title="Lock Ratio" style="height: 42px; width: 42px; display: flex; align-items: center; justify-content: center; margin-top: 0;">
            <i class="fas fa-lock"></i>
        </button>

        <button class="btn btn-sm bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600" onclick="resetArtworkFit()" title="Reset to Fit" style="height: 42px; width: 42px; display: flex; align-items: center; justify-content: center; margin-top: 0;">
            <i class="fas fa-compress-arrows-alt"></i>
        </button>
    </div>
    <p style="font-size: 11px; color: var(--text-secondary); margin-top: 8px; margin-bottom: 0;">* Design is automatically scaled to fit within material bounds.</p>
</div>

      <div id="downloadOptionsPanel" class="panel-collapsible"
        style="background: var(--light-bg); padding-left: 16px; padding-right: 16px; border-radius: 8px;">
        <div style="margin-bottom: 12px;">
          <div style="display: flex; gap: 8px; align-items: end;">
            <div>
              <label style="font-size: 11px; font-weight: 700; margin-bottom: 6px; display: block;">Select DPI:</label>
              <div class="size-btn-group" id="dpiBtnGroup">
                <button class="btn size-btn${agentClass}" onclick="setDownloadDPI(72)">72</button>
                <button class="btn size-btn${agentClass}" onclick="setDownloadDPI(100)">100</button>
                <button class="btn size-btn${agentClass}" onclick="setDownloadDPI(150)">150</button>
                <button class="btn size-btn${agentClass}" onclick="setDownloadDPI(200)">200</button>
                <button class="btn size-btn${agentClass}" onclick="setDownloadDPI(250)">250</button>
                <button class="btn size-btn active${agentClass}" onclick="setDownloadDPI(300)">300</button>
              </div>
            </div>
            <div style="margin-left: 12px;">
              <label style="font-size: 11px; font-weight: 700; margin-bottom: 6px; display: block;">Custom:</label>
              <div style="position: relative;">
                <input type="number" id="customDpiInput" placeholder="300" oninput="setCustomDPI(this.value)" style="padding-right: 10px; width: 80px;">
              </div>
            </div>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: end; gap: 10px;">
          <div>
            <label style="font-size: 11px; font-weight: 700; margin-bottom: 6px; display: block;">Select File Type:</label>
            <div class="size-btn-group" id="fileTypeBtnGroup">
              <button class="btn size-btn${agentClass}" onclick="setFileType('jpg')">JPG</button>
              <button class="btn size-btn active${agentClass}" onclick="setFileType('svg')">SVG</button>
              <button class="btn size-btn${agentClass}" onclick="setFileType('pdf')">PDF</button>
            </div>
          </div>
          <button class="btn btn-primary" onclick="handleFinalDownload()" style="width: auto; padding: 10px 24px; margin-top: 0; background: ${panelPrimaryColor}; border-color: ${panelPrimaryColor};">
            <i class="fas fa-download mr-2"></i> Download
          </button>
        </div>
      </div>

      <div style="display: flex; gap: 8px; margin-top: 16px;">
        <button id="addPrintingToPadBtn" class="btn" onclick="addToQuotePad()"
          style="flex-grow: 1; width: auto; background-color: var(--success-color); color: white; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
          + Add to Pad
        </button>
        <button id="copyPrintingInvoiceBtn" class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600" onclick="copyInvoiceText()"
          style="width: auto; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
          Copy
        </button>
      </div>
      <div class="invoice-copy-area" style="margin-top: 8px;">
        <textarea id="invoiceText" readonly rows="1"
          class="w-full font-mono text-sm border rounded-lg p-3
                 bg-[#e9ecef] text-[#495057] border-gray-300
                 dark:bg-[#1f2937] dark:text-[#e5e7eb] dark:border-gray-600"
          style="overflow:hidden; resize:none;"
        ></textarea>
      </div>
      </div>`;

  if (context.getLastClickedASize()) {
    const presetBtn = document.getElementById(`btn-${context.getLastClickedASize()}`);
    if (presetBtn) presetBtn.classList.add('active');
  }

  if (preservedState) {
    restorePrintingCalculatorState(preservedState, context);
    if (context.getLastClickedASize()) {
      const presetBtn = document.getElementById(`btn-${context.getLastClickedASize()}`);
      if (presetBtn) presetBtn.classList.add('active');
    }
  }

  const newGridContainer = document.querySelector('.material-grid-container');
  if (newGridContainer) {
    newGridContainer.scrollTop = context.getScrollPosition(category);
    setTimeout(() => {
      const refound = document.querySelector('.material-grid-container');
      if (refound) {
        refound.scrollTop = context.getScrollPosition(category);
      }
    }, 0);
  }

  context.kiraHarga();
  if (document.getElementById('eyeletOption')) {
    context.updateFinishingOptions();
  }

  context.attachGridListeners(content);
  context.initArtworkDragAndDrop();

  // Redraw canvas on resize so square/landscape switch applies in real time
  let _lfResizeTimer = null;
  const _lfResizeHandler = () => {
    // Immediate CSS update — canvas visually tracks window width during drag
    const canvas = document.getElementById('previewCanvas');
    const wrapper = document.getElementById('previewCanvasWrapper');
    if (canvas && wrapper) {
      const isSmall = window.innerWidth < 640;
      if (isSmall) {
        wrapper.style.width = '100%';
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
      } else {
        wrapper.style.width = 'fit-content';
        canvas.style.width = '';
        canvas.style.height = '';
      }
    }
    // Debounced full redraw after user stops resizing
    clearTimeout(_lfResizeTimer);
    _lfResizeTimer = setTimeout(() => context.kiraHarga(), 150);
  };
  window.removeEventListener('resize', window._dtfResizeHandler);
  window._dtfResizeHandler = _lfResizeHandler;
  window.addEventListener('resize', _lfResizeHandler);
}

export function setASize(sizeName, widthMm, heightMm, context) {
  context.setLastClickedASize(sizeName);
  clearASizeHighlight();

  const button = document.getElementById(`btn-${sizeName}`);
  if (button) button.classList.add('active');

  const targetUnit = document.getElementById('measurementUnit').value;
  const convertedWidth = context.convertFromMm(widthMm, targetUnit);
  const convertedHeight = context.convertFromMm(heightMm, targetUnit);
  const precision = targetUnit === 'mm' ? 0 : 2;

  document.getElementById('width').value = convertedWidth.toFixed(precision);
  document.getElementById('height').value = convertedHeight.toFixed(precision);

  if (context.getIsRatioLocked()) {
    context.setCurrentAspectRatio(convertedWidth / convertedHeight);
  }

  context.kiraHarga();
}

export function changeUnits(newUnit, context) {
  if (newUnit === context.getCurrentInputUnit()) return;

  const widthInput = document.getElementById('width');
  const heightInput = document.getElementById('height');
  const currentWidth = parseFloat(widthInput.value) || 0;
  const currentHeight = parseFloat(heightInput.value) || 0;
  const currentUnit = context.getCurrentInputUnit();
  const widthInMm = context.convertToMm(currentWidth, currentUnit);
  const heightInMm = context.convertToMm(currentHeight, currentUnit);
  const newConvertedWidth = context.convertFromMm(widthInMm, newUnit);
  const newConvertedHeight = context.convertFromMm(heightInMm, newUnit);
  const precision = newUnit === 'mm' || newUnit === 'cm' ? 1 : 2;

  let animationsRemaining = 2;
  const onAnimationComplete = () => {
    animationsRemaining -= 1;
    if (animationsRemaining <= 0) {
      context.kiraHarga();
    }
  };

  animateInputValue(widthInput, currentWidth, newConvertedWidth, precision, onAnimationComplete);
  animateInputValue(heightInput, currentHeight, newConvertedHeight, precision, onAnimationComplete);

  const isCustomBorderActive = document.getElementById('customBorderToggle') && document.getElementById('customBorderToggle').classList.contains('btn-primary');
  if (isCustomBorderActive) {
    ['customBorderTop', 'customBorderBottom', 'customBorderLeft', 'customBorderRight'].forEach((id) => {
      const inputEl = document.getElementById(id);
      if (inputEl) {
        const currentValue = parseFloat(inputEl.value) || 0;
        if (currentValue > 0) {
          animationsRemaining += 1;
          const valueInMm = context.convertToMm(currentValue, currentUnit);
          const newValue = context.convertFromMm(valueInMm, newUnit);
          animateInputValue(inputEl, currentValue, newValue, precision, onAnimationComplete);
        }
      }
    });
  }

  const designWInput = document.getElementById('designW');
  const designHInput = document.getElementById('designH');
  if (designWInput && !designWInput.disabled) {
    const currentArtW = parseFloat(designWInput.value) || 0;
    const currentArtH = parseFloat(designHInput.value) || 0;
    if (currentArtW > 0) {
      const designWInMm = context.convertToMm(currentArtW, currentUnit);
      const newArtW = context.convertFromMm(designWInMm, newUnit);
      designWInput.value = newArtW.toFixed(precision);
    }
    if (currentArtH > 0) {
      const designHInMm = context.convertToMm(currentArtH, currentUnit);
      const newArtH = context.convertFromMm(designHInMm, newUnit);
      designHInput.value = newArtH.toFixed(precision);
    }
  }

  const designWLabel = document.getElementById('designWLabel');
  const designHLabel = document.getElementById('designHLabel');
  if (designWLabel) designWLabel.textContent = `Design Width (${newUnit})`;
  if (designHLabel) designHLabel.textContent = `Design Height (${newUnit})`;

  document.querySelectorAll('.dynamic-unit').forEach((span) => {
    span.textContent = newUnit;
  });

  context.setCurrentInputUnit(newUnit);
}

export function switchDimensions(context) {
  const widthInput = document.getElementById('width');
  const heightInput = document.getElementById('height');
  const tempWidth = widthInput.value;
  widthInput.value = heightInput.value;
  heightInput.value = tempWidth;

  if (context.getIsRatioLocked() && context.getCurrentAspectRatio() !== 0) {
    context.setCurrentAspectRatio(1 / context.getCurrentAspectRatio());
  }

  context.kiraHarga();
}

export function clearASizeHighlight() {
  const group = document.getElementById('aSizeBtnGroup');
  if (!group) return;

  group.querySelectorAll('.size-btn').forEach((btn) => {
    btn.classList.remove('active');
  });
}