export const fetchTokenPrice = async (tokenAddress, wethAddress, chainId) => {
  if (!tokenAddress || !chainId) return null;

  const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";
  const chainNetworkMap = {
    369: "pulsechain",
    10001: "ethw",
    146: "sonic",
    8453: "base",
    1329: "sei-network",
    80094: "berachain",
    30: "rootstock",
    143: "monad",
  };
  const networkSlug = chainNetworkMap[Number(chainId)];
  if (!networkSlug) return null;
  const addressToFetch =
    tokenAddress === EMPTY_ADDRESS && wethAddress
      ? wethAddress.toLowerCase()
      : tokenAddress.toLowerCase();

  try {
    // Primary: GeckoTerminal
    const geckoResponse = await fetch(
      `https://api.geckoterminal.com/api/v2/simple/networks/${networkSlug}/token_price/${addressToFetch}`
    );

    if (geckoResponse.ok) {
      const data = await geckoResponse.json();
      const tokenPrices = data?.data?.attributes?.token_prices;
      if (tokenPrices) {
        const geckoPrice = Object.entries(tokenPrices).find(
          ([address]) => address.toLowerCase() === addressToFetch,
        )?.[1];
        if (geckoPrice && !Number.isNaN(Number(geckoPrice))) {
          return geckoPrice;
        }
      }
    }

    throw new Error("GeckoTerminal fetch failed or price not found");
  } catch (error) {
    console.warn("GeckoTerminal error, falling back to DexScreener:", error.message);

    // Fallback: DexScreener
    try {
      const dsResponse = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${addressToFetch}`
      );

      if (dsResponse.ok) {
        const dsData = await dsResponse.json();
        if (dsData && dsData.pairs && dsData.pairs.length > 0) {
          const bestPair = dsData.pairs
            .filter((pair) => {
              const pairChainId = pair?.chainId?.toLowerCase();
              const baseAddress = pair?.baseToken?.address?.toLowerCase();
              const quoteAddress = pair?.quoteToken?.address?.toLowerCase();
              return (
                pair?.priceUsd &&
                pairChainId === networkSlug &&
                (baseAddress === addressToFetch || quoteAddress === addressToFetch)
              );
            })
            .sort(
              (a, b) =>
                Number(b?.liquidity?.usd || 0) - Number(a?.liquidity?.usd || 0),
            )[0];

          return bestPair?.priceUsd || null;
        }
      }
    } catch (dsError) {
      console.error("DexScreener fetch also failed:", dsError.message);
    }

    return null;
  }
};
