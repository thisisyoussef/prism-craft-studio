export const featureFlags = {
  designers: (import.meta.env.VITE_ENABLE_DESIGNERS ?? '1') !== '0',
  findOrder: (import.meta.env.VITE_ENABLE_FIND_ORDER ?? '1') !== '0',
};

export type FeatureFlags = typeof featureFlags;
