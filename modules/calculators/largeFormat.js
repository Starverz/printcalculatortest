// modules/calculators/largeFormat.js
// Compatibility wrapper for Large Format calculator APIs.

import { calculateLargeFormat as calculateLargeFormatRuntime } from './printRuntime.js';
import { showCalculator } from './printShell.js';

let _ctx = null;

export function initLargeFormat(ctx) {
  _ctx = ctx;
}

export function renderLargeFormatCalculator(container, context = _ctx) {
  // Container is kept for API compatibility with instruction template.
  void container;
  if (!context) return;
  showCalculator('largeFormat', 0, null, context);
}

export function calculateLargeFormat(context = _ctx) {
  if (!context) return;
  calculateLargeFormatRuntime(context);
}

export function openLargeFormatPage(container, deps = {}) {
  if (typeof deps.setScrollPosition === 'function') deps.setScrollPosition(0);
  if (typeof deps.setDefaultDimensions === 'function') deps.setDefaultDimensions();

  const rows = Array.isArray(deps.materials) ? deps.materials : [];
  rows.forEach((item) => {
    item.agent = !!deps.globalAgentMode;
  });

  if (typeof deps.renderMaterialGrid === 'function') {
    deps.renderMaterialGrid(container, 'largeFormat');
  }
}
