import { useChainConfig } from '../hooks/useChainConfig';

export function usePriceFetcher() {
  const { priceApi, wethAddress } = useChainConfig();

  const fetchTokenPrice = async (tokenAddress: string) => {
    if (!priceApi) return null;

    const addressToFetch = tokenAddress === '0x0000000000000000000000000000000000000000'
      ? wethAddress.toLowerCase()
      : tokenAddress.toLowerCase();

    try {
      const response = await fetch(
        `${priceApi.baseUrl}/${priceApi.tokenPriceEndpoint}/${addressToFetch}`
      );

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      const data = await response.json();
      return data?.data?.attributes?.token_prices?.[addressToFetch];
    } catch (error) {
      console.error('Error fetching token price:', error);
      return null;
    }
  };

  return { fetchTokenPrice };
}
