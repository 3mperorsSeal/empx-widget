export const useWidgetConfig = () => {
  const params = new URLSearchParams(window.location.search);

  return {
    chain: params.get('chain') || 'pulsechain',
    theme: params.get('theme') || 'dark',
    background: params.get('background') || '#000000',
    primaryColor: params.get('primaryColor') || '#e49c01ff',

    // Token selection (disabled)
    // defaultTokenIn: params.get('from'),
    // defaultTokenOut: params.get('to'),
    // lockTokenIn: params.get('lockFrom') === 'true',
    // lockTokenOut: params.get('lockTo') === 'true',

    // Fee (disabled - using internal protocol fees)
    // feePercent: Number(params.get('feePercent') || '0'),

    // Integrator support
    integratorId: params.get('integratorId') || null,
  };
};
