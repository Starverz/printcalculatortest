export function findHighestMatchingTier(tiers, quantity, getValue = (tier) => tier) {
  const normalizedValues = tiers.map(getValue);

  for (let index = normalizedValues.length - 1; index >= 0; index -= 1) {
    const tierValue = normalizedValues[index];
    if (quantity >= tierValue) {
      return tierValue;
    }
  }

  return normalizedValues[0];
}