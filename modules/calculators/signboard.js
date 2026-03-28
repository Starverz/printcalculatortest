// modules/calculators/signboard.js
// Compatibility wrapper for Signboard calculator APIs.

import { calculateSignboard as calculateSignboardRuntime } from './printRuntime.js';
import { showCalculator } from './printShell.js';

let _ctx = null;

export function initSignboard(ctx) {
  _ctx = ctx;
}

export function renderSignboardCalculator(container, context = _ctx) {
  // Container is kept for API compatibility with instruction template.
  void container;
  if (!context) return;
  showCalculator('signboard', 0, null, context);
}

export function calculateSignboard(context = _ctx) {
  if (!context) return;
  calculateSignboardRuntime(context);
}

export function openSignboardPage(container, deps = {}) {
  if (typeof deps.setScrollPosition === 'function') deps.setScrollPosition(0);
  if (typeof deps.setDefaultDimensions === 'function') deps.setDefaultDimensions();

  const rows = Array.isArray(deps.signboardMaterials) ? deps.signboardMaterials : [];
  rows.forEach((item) => {
    item.agent = !!deps.globalAgentMode;
  });

  if (typeof deps.renderMaterialGrid === 'function') {
    deps.renderMaterialGrid(container, 'signboard');
  }
}
