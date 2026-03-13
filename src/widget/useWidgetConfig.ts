export const DEFAULT_WIDGET_CONFIG = {
  chain: 'pulsechain',
  theme: 'dark',
  background: '#000000',
  primaryColor: '#e49c01ff',
  borderColor: '#e49c01ff',
  integratorId: null,
};

export const parseWidgetConfig = (params: URLSearchParams) => ({
  chain: params.get('chain') || DEFAULT_WIDGET_CONFIG.chain,
  theme: DEFAULT_WIDGET_CONFIG.theme,
  background: params.get('background') || DEFAULT_WIDGET_CONFIG.background,
  primaryColor: params.get('primaryColor') || DEFAULT_WIDGET_CONFIG.primaryColor,
  borderColor: params.get('borderColor') || DEFAULT_WIDGET_CONFIG.borderColor,

  // Token selection
  defaultTokenIn: params.get('from'),
  defaultTokenOut: params.get('to'),

  // Fee (disabled - using internal protocol fees)
  // feePercent: Number(params.get('feePercent') || '0'),

  // Integrator support
  integratorId: params.get('integratorId')?.trim() || DEFAULT_WIDGET_CONFIG.integratorId,
});

export const useWidgetConfig = () => {
  const params = new URLSearchParams(window.location.search);
  return parseWidgetConfig(params);
};
