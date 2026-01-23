import pulsechainTokens from './pulsechain.json';
import ethwTokens from './ethw.json';
import sonicTokens from './sonic.json';

export const CHAIN_TOKENS: Record<number, any[]> = {
  369: pulsechainTokens,
  10001: ethwTokens,
  146: sonicTokens,
};
