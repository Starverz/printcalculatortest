// modules/stickers/sublimationMigration.js
// Placeholder migration surface for future sublimation-related sticker data migrations.

export const SUBLIMATION_MIGRATION_VERSION = 1;

export function needsSublimationMigration() {
  return false;
}

export function migrateSublimationStickerState(state) {
  return state;
}
