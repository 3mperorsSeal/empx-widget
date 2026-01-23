export const useWidgetConfig = () => {
  const params = new URLSearchParams(window.location.search);

  return {
    chain: params.get('chain') || 'pulsechain',
    theme: params.get('theme') || 'dark',
    background: params.get('background') || '#000000',
    primaryColor: params.get('primaryColor') || '#01e401',

    defaultTokenIn: params.get('from'),
    defaultTokenOut: params.get('to'),

    lockTokenIn: params.get('lockFrom') === 'true',
    lockTokenOut: params.get('lockTo') === 'true',

    feePercent: Number(params.get('feePercent') || '0'),
    referrer: params.get('referrer'),
  };
};
