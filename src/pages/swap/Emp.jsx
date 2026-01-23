import { useEffect, useState, useMemo, useRef } from "react";
import Logo from "../../assets/images/swap-emp.png";
import Sett from "../../assets/images/setting.svg";
import Ar from "../../assets/images/reverse.svg";
import Sellbox from "../../assets/images/sell-box.png";
import Buybox from "../../assets/images/buy-bg.png";
import Swapbutton from "../../assets/images/swap-button.svg";

import Usdc from "../../assets/images/usdc.svg";
import Info from "../../assets/images/info.svg";
import Amount from "./Amount";
import Token from "./Token";
import { formatEther } from "viem";
import {
  useAccount,
  useBalance,
  usePublicClient,
  useWriteContract,
} from "wagmi";
import SlippageCalculator from "./SlippageCalculator";
import { EmpsealRouterLiteV3 } from "../../utils/lite/EmpsealRouterLiteV3";
import { formatUnits } from "viem";
import Tokens from "../tokenList.json";
import { useStore } from "../../redux/store/routeStore";
import Transaction from "./Transaction";
import { Copy, Check, InfoIcon } from "lucide-react";
import { useChainConfig } from "../../hooks/useChainConfig";
import { SmartRouter } from "../../utils/services/SmartRouter";
import {
  checkAllowance,
  callApprove,
  EMPTY_ADDRESS,
} from "../../utils/contractCalls";
import { toast } from "react-toastify";
import { usePriceMonitor } from "../../hooks/usePriceMonitor";
import { useWidgetConfig } from "../../widget/useWidgetConfig";
import WalletConnect from "./WalletConnect/WalletConnect";

import { WPLS } from "../../utils/abis/wplsABI";
import { WETHW } from "../../utils/abis/wethwABI";
import { WSONIC } from "../../utils/abis/wsonicABI";

import { set } from "zod";

const getWrappedTokenABI = (chainId) => {
  switch (chainId) {
    case 10001:
      return WETHW;
    case 146:
      return WSONIC;
    case 369:
    default:
      return WPLS;
  }
};

const Emp = ({ setPadding, setBestRoute, onTokensChange }) => {
  const config = useWidgetConfig();
  const [isAmountVisible, setAmountVisible] = useState(false);
  const [isSlippageVisible, setSlippageVisible] = useState(false);
  const [isSlippageApplied, setIsSlippageApplied] = useState(false);
  const [isTokenVisible, setTokenVisible] = useState(false);
  // const [order, setOrder] = useState(false); // Removed Limit Order
  const [isRateReversed, setIsRateReversed] = useState(false);
  const [selectedTokenA, setSelectedTokenA] = useState(null);
  const [selectedTokenB, setSelectedTokenB] = useState(null);

  useEffect(() => {
    if (onTokensChange) {
      onTokensChange(selectedTokenA, selectedTokenB);
    }
  }, [selectedTokenA, selectedTokenB, onTokensChange]);

  const [isSelectingTokenA, setIsSelectingTokenA] = useState(true);
  const [amountOut, setAmountOut] = useState("0");
  const [amountIn, setAmountIn] = useState("0");
  const [swapStatus, setSwapStatus] = useState("IDLE");
  const [swapHash, setSwapHash] = useState("");
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [selectedPercentage, setSelectedPercentage] = useState("");
  const { address, chain } = useAccount();
  const [balanceAddress, setBalanceAddress] = useState(null);
  const { data: datas } = useBalance({ address });
  const [fees, setFees] = useState(0);
  const [minAmountOut, setMinAmountOut] = useState("0");
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTokenAddress, setActiveTokenAddress] = useState(null);
  const [usdValue, setUsdValue] = useState("0.00");
  const [usdValueTokenB, setUsdValueTokenB] = useState("0.00");
  const [usdValueTokenA, setUsdValueTokenA] = useState("0.00");
  const [conversionRate, setConversionRate] = useState(null);
  const [conversionRateTokenB, setConversionRateTokenB] = useState(null);
  const [isPartialFill, setIsPartialFill] = useState(false);
  const [smartRouter, setSmartRouter] = useState(null);

  const [localBestRoute, setLocalBestRoute] = useState(null);

  const [isQuoting, setIsQuoting] = useState(false);
  const [protocolFee, setProtocolFee] = useState(28); // Default 0.28%
  const publicClient = usePublicClient();
  const [needsApproval, setNeedsApproval] = useState(false);

  // Debounce and request tracking for quote fetching
  const [debouncedAmountIn, setDebouncedAmountIn] = useState("0");
  const quoteRequestIdRef = useRef(0);
  const lastCompletedIdRef = useRef(0); // Track last completed request

  // Price monitor state
  const [initialQuote, setInitialQuote] = useState("");
  const [showPriceAlert, setShowPriceAlert] = useState(false);
  const [newQuote, setNewQuote] = useState("");
  const [percentChange, setPercentChange] = useState(0);

  const updateRoute = (route) => {
    setLocalBestRoute(route);
    if (setBestRoute) {
      setBestRoute(route);
    }
  };

  const { writeContractAsync } = useWriteContract();

  const {
    chain: currentChain,
    chainId,
    symbol,
    tokenList,
    adapters,
    routerAddress,
    wethAddress,
    featureTokens,
    blockExplorer,
    blockExplorerName,
    maxHops,
    stableTokens,
  } = useChainConfig();

  const DEADLINE_MINUTES = 10;
  const deadline = Math.floor(Date.now() / 1000) + DEADLINE_MINUTES * 60;

  useEffect(() => {
    if (publicClient && routerAddress) {
      const router = new SmartRouter(publicClient, routerAddress);
      router.loadAdapters().then(() => {
        if (adapters && adapters.length > 0) {
          const adapterAddresses = adapters.map((a) => a.address);
          router.setAdapters(adapterAddresses);
        }
        setSmartRouter(router);
      });
      router.setMaxHops(maxHops || 3);
      router.setMaxAdapters(adapters ? adapters.length : 12);
      router.setGranularity(3);
    }
  }, [publicClient, routerAddress, adapters]);

  // Handle Widget Config Configuration
  const processedConfigIn = useRef(null);
  const processedConfigOut = useRef(null);

  useEffect(() => {
    if (tokenList && tokenList.length > 0) {
      // Process Token IN
      if (config.defaultTokenIn) {
        // Only retry if we haven't successfully processed this specific config value yet
        // OR if the current selection doesn't match the config (e.g. list update revealed the token)
        const shouldRetry = processedConfigIn.current !== config.defaultTokenIn ||
          (selectedTokenA &&
            selectedTokenA.address?.toLowerCase() !== config.defaultTokenIn.toLowerCase() &&
            selectedTokenA.symbol?.toLowerCase() !== config.defaultTokenIn.toLowerCase());

        if (shouldRetry) {
          let token = tokenList.find(t =>
            t.address?.toLowerCase() === config.defaultTokenIn?.toLowerCase()
          );

          if (!token) {
            token = tokenList.find(t =>
              t.symbol?.toLowerCase() === config.defaultTokenIn?.toLowerCase()
            );
          }

          if (token) {
            setSelectedTokenA(token);
            processedConfigIn.current = config.defaultTokenIn;
          } else if (!selectedTokenA && processedConfigIn.current !== config.defaultTokenIn) {
            // Only set default if we haven't selected anything AND we haven't tried this config yet
            // Don't mark as processed so we keep looking for the configured token
            setSelectedTokenA(tokenList[0]);
          }
        }
      } else if (!selectedTokenA) {
        setSelectedTokenA(tokenList[0]);
      }

      // Process Token OUT
      if (config.defaultTokenOut) {
        const shouldRetry = processedConfigOut.current !== config.defaultTokenOut ||
          (selectedTokenB &&
            selectedTokenB.address?.toLowerCase() !== config.defaultTokenOut.toLowerCase() &&
            selectedTokenB.symbol?.toLowerCase() !== config.defaultTokenOut.toLowerCase());

        if (shouldRetry) {
          let token = tokenList.find(t =>
            t.address?.toLowerCase() === config.defaultTokenOut?.toLowerCase()
          );

          if (!token) {
            token = tokenList.find(t =>
              t.symbol?.toLowerCase() === config.defaultTokenOut?.toLowerCase()
            );
          }

          if (token) {
            setSelectedTokenB(token);
            processedConfigOut.current = config.defaultTokenOut;
          } else if (!selectedTokenB && processedConfigOut.current !== config.defaultTokenOut) {
            setSelectedTokenB(tokenList[1]);
          }
        }
      } else if (!selectedTokenB) {
        setSelectedTokenB(tokenList[1]);
      }
    }
  }, [tokenList, config.defaultTokenIn, config.defaultTokenOut]);

  // Dynamic Fee Update
  useEffect(() => {
    if (config.feePercent > 0) {
      // Assuming feePercent is a percentage like 0.3 for 0.3%.
      // protocolFee 28 means 0.28%. So multiply by 100.
      setProtocolFee(Math.floor(config.feePercent * 100));
      return;
    }

    if (selectedTokenA && selectedTokenB) {
      const isStable = (address) =>
        stableTokens?.some(
          (stable) => stable.toLowerCase() === address.toLowerCase()
        ) || false;

      if (
        isStable(selectedTokenA.address) ||
        isStable(selectedTokenB.address)
      ) {
        setProtocolFee(15); // 0.15% for stable pairs
      } else {
        setProtocolFee(28); // 0.28% for volatile pairs
      }
    } else {
      setProtocolFee(28); // Default for other chains or if undefined
    }
  }, [chainId, selectedTokenA, selectedTokenB, stableTokens, config.feePercent]);

  const handleCloseSuccessModal = () => {
    setSwapStatus("IDLE"); // Reset status when closing modal
  };

  // Debounce amountIn to prevent excessive quote requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAmountIn(amountIn);
    }, 600);
    return () => clearTimeout(timer);
  }, [amountIn]);

  // Quote fetching with debounce and request tracking to prevent stale quotes
  useEffect(() => {
    const getQuote = async () => {
      // Increment request ID to track this specific request
      const currentRequestId = ++quoteRequestIdRef.current;

      if (
        !smartRouter ||
        !debouncedAmountIn ||
        parseFloat(debouncedAmountIn) <= 0 ||
        !selectedTokenA ||
        !selectedTokenB
      ) {
        setAmountOut("0");
        updateRoute(null);
        setRoute([]);
        return;
      }
      setIsQuoting(true);
      setAmountOut("0");

      try {
        const quoteResult = await smartRouter.getBestQuoteFromUser(
          debouncedAmountIn,
          selectedTokenA.address,
          selectedTokenB.address,
          protocolFee
        );

        const route = quoteResult.route;

        // If this request is outdated, ignore the result
        // Mark this request as the latest completed
        lastCompletedIdRef.current = currentRequestId;

        updateRoute(route); // Use updateRoute instead of setBestRoute

        // Handle route response
        if (route) {
          let path = [];
          if (route.type === "CONVERGE") {
            path = [
              route.payload.tokenIn,
              route.payload.intermediate,
              route.payload.tokenOut,
            ];
          } else if (
            (route.type === "SPLIT" || route.type === "NOSPLIT") &&
            route.payload.length > 0
          ) {
            // NOSPLIT is returned by Multi-hop, Chained Intermediate, Converge Multi-hop strategies
            path = route.payload[0].path;
          } else if (route.type === "WRAP" || route.type === "UNWRAP") {
            path = [route.payload.tokenIn, route.payload.tokenOut];
          }
          setRoute(path);
          setAmountOut(quoteResult.amountOutFormatted);
        } else {
          setAmountOut("0");
          setRoute([]);
        }
      } catch (error) {
        console.error("[Emp] Quote error:", error);
        setAmountOut("0");
        setRoute([]);
        updateRoute(null);
      }
      setIsQuoting(false);
    };

    getQuote();
  }, [smartRouter, debouncedAmountIn, selectedTokenA, selectedTokenB, protocolFee]); // Added protocolFee dependency

  // Check approval status whenever token or amount changes
  useEffect(() => {
    const checkApproval = async () => {
      if (
        !address ||
        !selectedTokenA ||
        selectedTokenA.address === EMPTY_ADDRESS ||
        !debouncedAmountIn ||
        parseFloat(debouncedAmountIn) <= 0
      ) {
        setNeedsApproval(false);
        return;
      }

      try {
        const amountInBigInt = convertToBigInt(debouncedAmountIn, selectedTokenA.decimal);
        const allowance = await checkAllowance(
          chainId,
          selectedTokenA.address,
          address
        );

        setNeedsApproval(allowance.data < amountInBigInt);
      } catch (error) {
        console.error("Error checking allowance:", error);
      }
    };

    checkApproval();
  }, [chainId, address, selectedTokenA, debouncedAmountIn]);

  const handleApprove = async () => {
    try {
      setSwapStatus("APPROVING");
      const amountInBigInt = convertToBigInt(amountIn, selectedTokenA.decimal);

      await callApprove(chainId, selectedTokenA.address, amountInBigInt);

      // Re-check allowance to update UI immediately
      const allowance = await checkAllowance(
        chainId,
        selectedTokenA.address,
        address
      );

      if (allowance.data >= amountInBigInt) {
        setNeedsApproval(false);
        setSwapStatus("APPROVED");
        toast.success("Token approved!");
      }
    } catch (error) {
      setSwapStatus("ERROR");
      console.error("Approval failed:", error);
      toast.error("Token approval failed");
    }
  };

  useEffect(() => {
    if (address && datas) {
      setBalanceAddress(formatEther(datas.value));
    } else if (!address) {
      setBalanceAddress("0.00");
    }
  }, [address, datas]);

  const formattedBalance = balanceAddress
    ? `${parseFloat(balanceAddress).toFixed(6)}`
    : "0.00";

  function setRoute(path) {
    useStore.setState({ route: path });
  }

  function setPath(path) {
    useStore.setState({ path: path });
  }

  function setAdapter(adapter) {
    useStore.setState({ adapter: adapter });
  }

  const { data: tokenBalance, isLoading } = useBalance({
    address: address, // Use the connected wallet address
    token: selectedTokenA?.address, // Token address of TokenA
    watch: true,
  });

  // Format the chain balance
  const formattedChainBalance = tokenBalance
    ? parseFloat(tokenBalance.formatted).toFixed(6) // Format to 6 decimal places
    : "0.000";

  const { data: tokenBBalance } = useBalance({
    address: address, // Use the connected wallet address
    token: selectedTokenB?.address, // Token address of TokenA
    watch: true,
  });

  // Format the chain balance
  const formattedChainBalanceTokenB = tokenBBalance
    ? parseFloat(tokenBBalance.formatted).toFixed(6) // Format to 6 decimal places
    : "0.000";

  const handlePercentageChange = (e) => {
    const percentage = e === "" ? "" : parseInt(e);
    setSelectedPercentage(percentage);
    const calculatedAmount = calculateAmount(percentage);
    setAmountIn(calculatedAmount);
  };

  // Calculate the amount based on the selected percentage
  const calculateAmount = (percentage) => {
    if (!percentage || !selectedTokenA) return "";

    let balance;
    if (
      selectedTokenA.address === "0x0000000000000000000000000000000000000000"
    ) {
      // For native token (EMPTY_ADDRESS)
      balance = parseFloat(formattedBalance || 0);
    } else {
      // For other tokens
      balance = parseFloat(tokenBalance?.formatted || 0);
    }
    const calculatedAmount = balance * (percentage / 100);
    if (
      selectedTokenA.address === "0x0000000000000000000000000000000000000000" &&
      percentage === 100
    ) {
      // Leave some balance for gas fees (e.g., 0.01 units)
      return Math.max(0, calculatedAmount).toFixed(6);
    }
    return calculatedAmount.toFixed(6);
  };

  const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";

  const handleTokenSelect = (token) => {
    if (isSelectingTokenA) {
      if (config.lockTokenIn) return; // Respect lock
      setSelectedTokenA(token);
    } else {
      if (config.lockTokenOut) return; // Respect lock
      setSelectedTokenB(token);
    }
    setTokenVisible(false);
  };

  const convertToBigInt = (amount, decimals) => {
    // Add input validation
    if (!amount || isNaN(amount) || !decimals || isNaN(decimals)) {
      return BigInt(0);
    }

    try {
      const parsedAmount = parseFloat(amount);
      const parsedAmountIn = BigInt(Math.floor(parsedAmount * Math.pow(10, 6)));

      if (decimals >= 6) {
        return parsedAmountIn * BigInt(10) ** BigInt(decimals - 6);
      } else {
        return parsedAmountIn / BigInt(10) ** BigInt(6 - decimals);
      }
    } catch (error) {
      console.error("Error converting to BigInt:", error);
      return BigInt(0);
    }
  };

  const handleSlippageCalculated = (adjustedAmount) => {
    const tokenDecimals = selectedTokenB.decimal;
    const decimalAdjusted = Number(adjustedAmount) / 10 ** tokenDecimals;

    // Update states
    setMinAmountOut(adjustedAmount);
    setAmountOut(decimalAdjusted);

    // Reset minAmountOut if needed
    setMinAmountOut("0");
  };

  useEffect(() => {
    const fetchConversionRateTokenA = async () => {
      try {
        // Check if required values are available
        if (!currentChain?.name || !selectedTokenA?.address) {
          return;
        }

        // Determine which address to use for the API call
        const addressToFetch =
          selectedTokenA?.address === EMPTY_ADDRESS && wethAddress
            ? wethAddress?.toLowerCase()
            : selectedTokenA?.address?.toLowerCase();

        const response = await fetch(
          `https://api.geckoterminal.com/api/v2/simple/networks/${symbol}/token_price/${addressToFetch}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Validate and extract token prices
        const tokenPrices = data?.data?.attributes?.token_prices;
        if (!tokenPrices) {
          throw new Error("Token prices not found");
        }

        // Use the correct address to look up the price
        const tokenPrice =
          selectedTokenA?.address === EMPTY_ADDRESS
            ? tokenPrices[wethAddress?.toLowerCase()]
            : tokenPrices[addressToFetch];

        setConversionRate(tokenPrice);
      } catch (error) {
        console.error("Error fetching token price:", error.message);
      }
    };

    fetchConversionRateTokenA();
  }, [chainId, selectedTokenA?.address, wethAddress]);

  useEffect(() => {
    const fetchConversionRateTokenB = async () => {
      try {
        // Check if required values are available
        if (!currentChain?.name || !selectedTokenB?.address) {
          return;
        }

        // Determine which address to use for the API call
        const addressToFetch =
          selectedTokenB?.address === EMPTY_ADDRESS && wethAddress
            ? wethAddress?.toLowerCase()
            : selectedTokenB?.address?.toLowerCase();

        const response = await fetch(
          `https://api.geckoterminal.com/api/v2/simple/networks/${symbol}/token_price/${addressToFetch}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Validate and extract token prices
        const tokenPrices = data?.data?.attributes?.token_prices;
        if (!tokenPrices) {
          throw new Error("Token prices not found");
        }

        // Use the correct address to look up the price
        const tokenPrice =
          selectedTokenB?.address === EMPTY_ADDRESS
            ? tokenPrices[wethAddress?.toLowerCase()]
            : tokenPrices[addressToFetch];

        setConversionRateTokenB(tokenPrice);
      } catch (error) {
        console.error("Error fetching token price:", error.message);
      }
    };

    fetchConversionRateTokenB();
  }, [chainId, selectedTokenB?.address, wethAddress]);

  // Helper Functions
  const handleEmptyData = () => {
    setAmountOut("0");
    setRoute([selectedTokenA?.address, selectedTokenB?.address]);
  };

  useEffect(() => {
    if (conversionRate && !isNaN(conversionRate)) {
      const valueInUSD = (
        parseFloat(amountIn || 0) * parseFloat(conversionRate)
      ).toFixed(2);
      setUsdValue(valueInUSD);
      setUsdValueTokenA(valueInUSD);
    }
  }, [amountIn, conversionRate]);

  useEffect(() => {
    if (conversionRateTokenB && !isNaN(conversionRateTokenB)) {
      const valueInUSD = (
        parseFloat(amountOut || 0) * parseFloat(conversionRateTokenB)
      ).toFixed(2);
      setUsdValueTokenB(valueInUSD);
    }
  }, [amountOut, conversionRateTokenB]);

  const confirmSwap = async () => {
    if (!localBestRoute) return; // Use localBestRoute instead of bestRoute

    try {
      setSwapStatus("LOADING");
      // Handle approval
      // Handle approval - REMOVED automatic approval from here
      if (selectedTokenA.address !== EMPTY_ADDRESS) {
        const amountInBigInt =
          localBestRoute.type === "CONVERGE" || localBestRoute.type === "UNWRAP" // Use localBestRoute
            ? localBestRoute.payload.amountIn
            : convertToBigInt(amountIn, selectedTokenA.decimal);

        const allowance = await checkAllowance(
          chainId,
          selectedTokenA.address,
          address
        );
        if (allowance.data < amountInBigInt) {
          toast.error("Please approve token first");
          setSwapStatus("IDLE");
          return;
        }
      }

      setSwapStatus("SWAPPING");
      const minAmountOut = (localBestRoute.amountOut * 995n) / 1000n; // Use localBestRoute
      const protocolFeeBigInt = BigInt(protocolFee);

      let tx;
      if (localBestRoute.type === "WRAP") {
        // Use localBestRoute
        tx = await writeContractAsync({
          address: wethAddress,
          abi: getWrappedTokenABI(chainId),
          functionName: "deposit",
          value: localBestRoute.payload.amountIn, // Use localBestRoute
        });
      } else if (localBestRoute.type === "UNWRAP") {
        // Use localBestRoute
        tx = await writeContractAsync({
          address: wethAddress,
          abi: getWrappedTokenABI(chainId),
          functionName: "withdraw",
          args: [localBestRoute.payload.amountIn], // Use localBestRoute
        });
      } else if (localBestRoute.type === "CONVERGE") {
        // Use localBestRoute
        tx = await writeContractAsync({
          address: routerAddress,
          abi: EmpsealRouterLiteV3,
          functionName: "executeConvergeSwap",
          args: [
            localBestRoute.payload, // Use localBestRoute
            minAmountOut,
            address,
            protocolFeeBigInt,
            deadline,
          ],
          value:
            selectedTokenA.address === EMPTY_ADDRESS
              ? localBestRoute.payload.amountIn
              : 0n,
        });
      } else {
        // SPLIT
        tx = await writeContractAsync({
          address: routerAddress,
          abi: EmpsealRouterLiteV3,
          functionName: "executeSplitSwap",
          args: [
            localBestRoute.payload, // Use localBestRoute
            convertToBigInt(amountIn, selectedTokenA.decimal),
            minAmountOut,
            address,
            protocolFeeBigInt,
            deadline,
          ],
          value:
            selectedTokenA.address === EMPTY_ADDRESS
              ? convertToBigInt(amountIn, selectedTokenA.decimal)
              : 0n,
        });
      }
      setSwapHash(tx);

      toast.info("Waiting for transaction confirmation...");
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: tx,
      });

      if (receipt.status === "success") {
        setAmountVisible(false);
        setSwapStatus("SWAPPED");
        setSwapSuccess(true);
        toast.success("Transaction Confirmed!");
      } else {
        setAmountVisible(false);
        throw new Error("Transaction reverted on-chain.");
      }
    } catch (error) {
      setAmountVisible(false);
      setSwapStatus("ERROR");

      let message = error.message || "Transaction failed";

      console.error("Swap failed", error);

      if (message.includes("User rejected") || message.includes("User denied")) {
        toast.error("Transaction rejected by user");
        return;
      }

      // Check for explicit revert reasons
      if (message.includes("reverted with the following reason:")) {
        const parts = message.split("reverted with the following reason:");
        if (parts[1]) {
          message = parts[1].trim().split("\n")[0];
        }
      } else if (message.includes("reverted with reason string")) {
        const parts = message.split("reverted with reason string");
        if (parts[1]) {
          message = parts[1].replace(/'/g, "").trim().split("\n")[0];
        }
      } else if (message.length > 60) {
        // Fallback for other long messages
        message = message.substring(0, 60) + "...";
      }

      toast.error(message);
    }
  };
  const getRateDisplay = () => {
    if (!amountIn || !amountOut || +amountOut === 0) return "0";
    const rate = parseFloat(amountOut) / parseFloat(amountIn);
    return isRateReversed ? (1 / rate).toFixed(6) : rate.toFixed(6);
  };

  useEffect(() => {
    setSelectedPercentage("");
    setAmountIn("");
  }, [selectedTokenA]);

  const handleCopyAddress = async (address) => {
    try {
      await navigator.clipboard.writeText(address);
      setActiveTokenAddress(address);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
        setActiveTokenAddress(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  };

  const isInsufficientBalance = () => {
    if (!selectedTokenA) return false;
    const inputAmount = parseFloat(amountIn) || 0;
    const balance =
      selectedTokenA.address === EMPTY_ADDRESS
        ? parseFloat(formattedBalance)
        : parseFloat(tokenBalance?.formatted || "0");

    //small precision difference
    return inputAmount > balance && Math.abs(inputAmount - balance) > 1e-6;
  };

  const getButtonText = () => {
    if (isInsufficientBalance()) return "Insufficient Balance";
    if (isQuoting) return "Loading...";
    if (needsApproval) return "Approve";
    return "Swap";
  };

  // Function to format the number with commas
  const formatNumber = (value) => {
    if (!value) return ""; // Handle empty input

    const [integerPart, decimalPart] = value.split("."); // Split into integer and decimal parts
    const formattedInteger = integerPart
      .replace(/\D/g, "") // Allow only digits
      .replace(/\B(?=(\d{3})+(?!\d))/g, ""); // Add commas to integer part

    // If there's a decimal part, return formatted integer + decimal
    return decimalPart !== undefined
      ? `${formattedInteger}.${decimalPart.replace(/\D/g, "")}` // Remove non-numeric from decimal
      : formattedInteger;
  };

  // Function to handle input changes
  const handleInputChange = (value) => {
    // Remove commas before updating state
    const rawValue = value.replace(/,/g, "");
    setAmountIn(rawValue); // Update the state with the raw number
  };

  const minToReceive = amountOut * 0.0024;
  const minToReceiveAfterFee = amountOut - minToReceive;

  // effect to clear amountOut and quotes when tokens are swapped
  useEffect(() => {
    setAmountOut("0");
    setInitialQuote("");
    setNewQuote("");
    setShowPriceAlert(false);
  }, [selectedTokenA, selectedTokenB]);

  // Use price monitor hook
  const { hasChanged } = usePriceMonitor({
    initialQuote,
    currentQuote: amountOut,
    enabled: !!initialQuote && !!amountOut && !isNaN(amountOut),
    threshold: 0.001, // Temporarily lowered for testing (normal: 0.1)
    onPriceChange: (newQ, percent) => {
      setNewQuote(newQ);
      setPercentChange(percent);
      setShowPriceAlert(true);
    },
  });

  const handleAcceptNewQuote = () => {
    setInitialQuote(newQuote);
    setShowPriceAlert(false);
  };

  const handleRejectNewQuote = () => {
    setShowPriceAlert(false);
  };

  // Market
  const handleOutputChange = () => {
    // This input is read-only, so we don't need an onChange handler
  };
  // For Price Impact
  const priceImpact =
    usdValueTokenA > 0
      ? (
        ((parseFloat(usdValueTokenB) - parseFloat(usdValueTokenA)) /
          parseFloat(usdValueTokenA)) *
        100
      ).toFixed(2)
      : 0;
  // Determine color based on value
  const getPriceImpactColor = (impact) => {
    const value = parseFloat(impact);
    // Green for positive (profit), Red for negative (loss)
    if (value > 0) return "text-green-500";
    if (value < 0) return "text-red-500";
    return "text-black";
  };

  const [dollarinfo, setDollarInfo] = useState(false);
  const [dollarinfo1, setDollarInfo1] = useState(false);

  return (
    <>
      <div
        className={`w-full rounded-xl xl:pb-10 lg:pt-1 pt-20 2xl:px-8 lg:px-8 md:px-6 px-1 md:mt-0 mt-4 relative 2xl:pb-20 xl:pb-10 lg:pb-0 pb-80`}
      >

        <div className={`scales8 top70`}>
          {/* Header: Chain Switcher & Wallet */}
          <div className="md:max-w-[700px] w-full mx-auto flex justify-between items-center mb-4 px-1">
            {/* Left side: could be a logo or chain selector if WalletConnect doesn't handle it fully */}
            <div className="flex items-center gap-2">
              {/* Chain Switcher is handled inside WalletConnect usually, but we might want to expose it better if needed. 
                      For now, WalletConnect component handles both Chain and Connect/Disconnect. 
                      We will rely on WalletConnect to render the buttons. 
                  */}
            </div>

            {/* Right side: Wallet Connect/Disconnect */}
            <div className="flex gap-2">
              <WalletConnect />
            </div>
          </div>

          <div className="md:max-w-[1100px] mx-auto w-full flex flex-col justify-center items-center md:flex-nowrap flex-wrap mobile-hidden lg:mt-1 mt-6 px-3 pb-4">
            {/* Title removed or kept small? User didn't ask to remove it but "exact type of widget" usually implies minimal title. 
                   Keeping it for now but maybe making it smaller or removing if it looks cluttered. 
               */}
            {/* <h1 className="md:text-5xl text-2xl text-center text-[var(--primary-color)] font-orbitron font-bold md:mb-2">
              <>
                Optimized <span className="text-white">Aggregation</span>
              </>
            </h1> */}
          </div>
          <div className="lg:max-w-[700px] md:max-w-[600px] mx-auto w-full flex gap-3 items-center md:justify-start justify-start md:flex-nowrap flex- my-6 lg:px-1 px-0">
            <div className="border-[var(--primary-color)] text-black bg-[var(--primary-color)] cursor-pointer hoverswap transition-all leading-none md:w-[100px] w-[52px] md:h-[47px] h-7 flex justify-center items-center md:rounded-lg rounded-md border md:text-sm text-[7px] font-bold font-orbitron">
              SWAP
            </div>
            <div
              onClick={() => setSlippageVisible(true)}
              className="shrink-0 md:w-[47px] md:h-[47px] w-7 h-7 border border-white rounded-lg flex justify-center items-center hoverswap transition-all cursor-pointer group"
            >
              <img
                src={Sett}
                alt="Sett"
                className="md:w-[26px] w-[14px] group-hover:animate-[spin_3s_linear_infinite]"
              />
            </div>
          </div>
          {/* Swap */}
          <div className="lg:max-w-[700px] md:max-w-[600px] mx-auto w-full">
            <div className="relative bg_swap_box">
              {/* <img className="bg-sell w-full" src={Sellbox} alt="sellbox" /> */}
              <div className="flex justify-between gap-3 items-center">
                <div className="font-orbitron text-dark-400 md:text-2xl text-xs font-semibold leading-normal">
                  You Sell
                </div>
                <div className="text-center absolute -top-8 md:right-0 right-5 gap-3 2xl:px-6 lg:px-4 lg:py-3 rounded-lg mt-2 border border-white bg-[#FFE6C0] md:text-sm text-[10px] px-2 py-2">
                  <span className="font-extrabold font-orbitron leading-normal">
                    BAL
                  </span>
                  <span className="font-bold font-orbitron leading-normal">
                    {" "}
                    :{" "}
                  </span>
                  <span className="rigamesh leading-normal">
                    {!selectedTokenA
                      ? "0.00"
                      : isLoading
                        ? "Loading.."
                        : selectedTokenA.address === EMPTY_ADDRESS
                          ? `${formatNumber(formattedBalance)}`
                          : `${tokenBalance
                            ? formatNumber(
                              parseFloat(tokenBalance.formatted).toFixed(6)
                            )
                            : "0.00"
                          }`}
                  </span>
                </div>
              </div>
              <div className="flex w-full mt-2">
                <div className="md:w-[25%] w-[40%]">
                  <div className="flex justify-between gap-4 items-center cursor-pointer">
                    <div className="flex gap-2 items-center md:mt-5 mt-6">
                      {/* md:w-[220px] w-[160px] */}
                      <div className="flex md:gap-4 gap-1 items-center bg-[var(--bg-color)] md:border-2 border border-white md:rounded-xl rounded-lg md:px-6 px-3 md:py-[18px] py-2.5 margin_left lg:w-[280px] md:w-[220px] w-[125px] justify-center">
                        <div
                          onClick={() => {
                            if (config.lockTokenIn) return;
                            setIsSelectingTokenA(true);
                            setTokenVisible(true);
                            setSelectedPercentage("");
                            setAmountIn("");
                          }}
                          className="flex items-center md:gap-4 gap-1"
                        >
                          {selectedTokenA ? (
                            <>
                              <img
                                className="md:w-9 md:h-9 w-4 h-4"
                                src={selectedTokenA.image || selectedTokenA.logoURI}
                                alt={selectedTokenA.name}
                              />
                              <div className="text-[var(--primary-color)] lg:text-3xl text-sm font-bold font-orbitron leading-normal bg-[var(--bg-color)] appearance-none outline-none">
                                {selectedTokenA.ticker || selectedTokenA.symbol}
                              </div>
                            </>
                          ) : (
                            <span className="text-[var(--primary-color)] font-bold font-orbitron md:text-3xl text-sm">
                              Select token
                            </span>
                          )}
                        </div>
                        {selectedTokenA && (
                          <button
                            onClick={() =>
                              handleCopyAddress(selectedTokenA.address)
                            }
                            className="rounded-md transition-colorss"
                          >
                            {copySuccess &&
                              activeTokenAddress === selectedTokenA.address ? (
                              <Check className="md:w-4 md:h-4 w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="md:w-4 md:h-4 w-3 h-3 text-white hover:text-white" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:w-[75%] w-[60%]">
                  <div className="text-zinc-200 text-[10px] font-normal roboto leading-normal flex md:gap-2 gap-1 md:ml-0 ml-[-40px] justify-end">
                    <span></span>
                    {[25, 50, 75, 100].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`py-1 border bg-[var(--bg-color)] text-white flex justify-center items-center rounded-[10px] md:text-[12px] text-[7px] font-extrabold font-orbitron md:w-[70px] w-11 px-2
            ${selectedPercentage === value
                            ? "!text-black !bg-[#FFE6C0] border-[#FFE6C0]"
                            : "bg-[#FFE7C3] text-[#040404] border-black hover:border-black hover:bg-[var(--primary-color)] hover:text-black"
                          }`}
                        onClick={() => handlePercentageChange(value)}
                        disabled={isLoading}
                      >
                        {value}%
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const inputLength =
                      formatNumber(amountIn)?.replace(/\D/g, "").length || 0;
                    const defaultFontSize =
                      window.innerWidth >= 1024
                        ? 48
                        : window.innerWidth >= 768
                          ? 40
                          : 32;

                    const FREE_DIGITS = window.innerWidth >= 768 ? 10 : 4;
                    const SHRINK_RATE = 3;

                    const excessDigits = Math.max(
                      0,
                      inputLength - FREE_DIGITS
                    );

                    const dynamicFontSize = Math.max(
                      10,
                      defaultFontSize - excessDigits * SHRINK_RATE
                    );
                    return (
                      <input
                        type="text"
                        placeholder={
                          formattedChainBalance === "0.000"
                            ? "0"
                            : calculateAmount(selectedPercentage)
                        }
                        value={formatNumber(amountIn)}
                        onChange={(e) => handleInputChange(e.target.value)}
                        className="text-[#000000] text-sh py-2 text-end w-full outline-none border-none bg-transparent token_input rigamesh placeholder-black transition-all duration-200 ease-in-out"
                        style={{
                          fontSize: `${dynamicFontSize}px`,
                        }}
                      />
                    );
                  })()}
                </div>
              </div>
              <div className="text-right relative text-black md:text-base text-[10px] usd-spacing truncate rigamesh text-sh1 flex justify-end gap-1">
                <div className="relative inline-block">
                  <InfoIcon
                    size={18}
                    className="md:mt-[1.5px] mt-[-1px] cursor-pointer"
                    onMouseEnter={() => setDollarInfo(true)}
                    onMouseLeave={() => setDollarInfo(false)}
                    onClick={() => setDollarInfo((prev) => !prev)}
                  />

                  {dollarinfo && (
                    <div
                      className="roboto fixed rt0 z-50 mt-2 md:w-[500px] w-[300px] whitespace-pre-wrap rounded-lg bg-[var(--bg-color)] px-4 py-3 text-center md:text-sm text-[10px] font-bold text-white shadow-lg
          "
                      onMouseEnter={() => setDollarInfo(true)}
                      onMouseLeave={() => setDollarInfo(false)}
                    >
                      Dollar value display <br />
                      The dollar value displayed are fetched from 3rd party
                      API. They may not be 100% accurate in some cases. For
                      accuracy please check the Output units.
                    </div>
                  )}
                </div>
                {conversionRate
                  ? `$${formatNumber(usdValue)}`
                  : "Fetching Rate..."}
              </div>
            </div>
            <div
              className="cursor-pointer mx-auto my-4 md:pt-7 relative md:top-[-16px] top-[-10px] pt-[20px] md:w-[70px] w-12"
              onClick={() => {
                const _tokenA = selectedTokenA;
                const _tokenB = selectedTokenB;
                setSelectedTokenA(_tokenB);
                setSelectedTokenB(_tokenA);
                setAmountOut("0");
                setAmountIn("0");
                setDebouncedAmountIn("0");
              }}
            >
              <img
                src={Ar}
                alt="Ar"
                className="hoverswap transition-all rounded-xl"
              />
            </div>
            <div className="relative bg_swap_box_black">
              {/* <img className="bg-sell w-full" src={Buybox} alt="Buybox" /> */}
              <div className="flex justify-between gap-3 items-center">
                <div className="font-orbitron text-white md:text-2xl text-xs font-semibold leading-normal">
                  You Buy
                </div>
                <div className="text-center absolute -top-8 md:right-0 right-5 gap-3 2xl:px-6 lg:px-4 lg:py-3 rounded-lg mt-2 border border-white bg-[#FFE6C0] md:text-sm text-[10px] px-2 py-2">
                  <span className="font-extrabold leading-normal">BAL</span>
                  <span className="font-bold font-orbitron leading-normal">
                    {" "}
                    :{" "}
                  </span>
                  <span className="rigamesh leading-normal">
                    {!selectedTokenB
                      ? "0.00"
                      : isLoading
                        ? "Loading.."
                        : selectedTokenB.address === EMPTY_ADDRESS
                          ? `${formatNumber(formattedChainBalanceTokenB)}`
                          : `${tokenBBalance
                            ? formatNumber(
                              parseFloat(tokenBBalance.formatted).toFixed(6)
                            )
                            : "0.00"
                          }`}
                  </span>
                </div>
              </div>

              <div className="flex w-full mt-2">
                <div className="md:w-[25%] w-[40%]">
                  <div className="flex justify-between gap-4 items-center cursor-pointer">
                    <div className="flex gap-2 items-center md:mt-5 mt-6">
                      {/* md:w-[220px] w-[160px] */}
                      <div className="flex md:gap-4 gap-1 items-center justify-center bg-[#FFE6C0] md:border-2 border border-white rounded-lg md:px-6 px-3 md:py-[18px] py-2.5 lg:w-[280px] md:w-[220px] w-[125px] margin_left">
                        <div
                          onClick={() => {
                            if (config.lockTokenOut) return;
                            setIsSelectingTokenA(false);
                            setTokenVisible(true);
                          }}
                          className="flex items-center justify-center md:gap-4 gap-1"
                        >
                          {selectedTokenB ? (
                            <>
                              <img
                                className="md:w-9 md:h-9 w-4 h-4"
                                src={selectedTokenB.image || selectedTokenB.logoURI}
                                alt={selectedTokenB.name}
                              />
                              <div className="text-dark lg:text-3xl text-sm font-bold font-orbitron leading-normal appearance-none outline-none">
                                {selectedTokenB.ticker || selectedTokenB.symbol}
                              </div>
                            </>
                          ) : (
                            <span className="text-dark font-bold font-orbitron md:text-3xl text-sm">
                              Select token
                            </span>
                          )}
                        </div>
                        {selectedTokenB && (
                          <button
                            onClick={() =>
                              handleCopyAddress(selectedTokenB.address)
                            }
                            className="rounded-md transition-colors"
                          >
                            {copySuccess &&
                              activeTokenAddress === selectedTokenB.address ? (
                              <Check className="md:w-4 md:h-4 w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="md:w-4 md:h-4 w-3 h-3 text-black hover:text-black" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:w-[75%] w-[60%]">
                  {/*  */}
                  <div className="text-zinc-200 text-[10px] font-normal roboto leading-normal flex md:gap-2 gap-1 mb-2 md:ml-0 ml-[-40px] justify-end">
                    <span></span>
                    {[25, 50, 75, 100].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`py-1 border border-[var(--primary-color)] flex justify-center items-center rounded-xl md:text-[12px] text-[7px] md:w-[70px] w-11 font-extrabold font-orbitron px-2
            ${selectedPercentage === value
                            ? " text-white bg-[var(--bg-color)]"
                            : "bg-[var(--primary-color)] text-[#040404] hover:border-[var(--primary-color)] hover:bg-transparent hover:text-[var(--primary-color)]"
                          }`}
                        onClick={() => handlePercentageChange(value)}
                        disabled={isLoading}
                      >
                        {value}%
                      </button>
                    ))}
                  </div>
                  {/*  */}
                  {(() => {
                    const numericValue = Number(amountOut);

                    const formattedValue = isNaN(numericValue)
                      ? ""
                      : formatNumber(numericValue.toFixed(2));

                    const outputLength =
                      formattedValue.replace(/,/g, "").length || 0;

                    const defaultFontSize =
                      window.innerWidth >= 1024
                        ? 48
                        : window.innerWidth >= 768
                          ? 40
                          : 32;

                    const FREE_DIGITS = window.innerWidth >= 768 ? 10 : 6;
                    const SHRINK_RATE = 3;

                    const excessDigits = Math.max(
                      0,
                      outputLength - FREE_DIGITS
                    );

                    const dynamicFontSize = Math.max(
                      10,
                      defaultFontSize - excessDigits * SHRINK_RATE
                    );

                    return (
                      <>
                        {isQuoting ? (
                          <span className="text-white animate-pulse text-right w-full flex justify-end">
                            Calculating...
                          </span>
                        ) : (
                          <input
                            type="text"
                            placeholder="0.00"
                            value={formattedValue}
                            onChange={handleOutputChange}
                            readOnly
                            className="text-[#fff] text-sh py-2 text-end w-full leading-7 outline-none border-none bg-transparent token_input rigamesh placeholder-white transition-all duration-200 ease-in-out"
                            style={{
                              fontSize: `${dynamicFontSize}px`,
                            }}
                          />
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="text-right text-white usd-spacing md:text-base text-[10px] rigamesh truncate text-sh1 flex justify-end gap-1 relative">
                <div className="relative inline-block">
                  <InfoIcon
                    size={18}
                    className="md:mt-[1.5px] mt-[-1px] cursor-pointer"
                    onMouseEnter={() => setDollarInfo1(true)}
                    onMouseLeave={() => setDollarInfo1(false)}
                    onClick={() => setDollarInfo1((prev) => !prev)}
                  />
                  {dollarinfo1 && (
                    <div
                      className="roboto fixed rt0 z-50 mt-2 md:w-[500px] w-[300px] whitespace-pre-wrap rounded-lg bg-[var(--bg-color)] px-4 py-3 text-center md:text-sm text-[10px] font-bold text-white shadow-lg
          "
                      onMouseEnter={() => setDollarInfo1(true)}
                      onMouseLeave={() => setDollarInfo1(false)}
                    >
                      Dollar value display <br />
                      The dollar value displayed are fetched from 3rd party
                      API. They may not be 100% accurate in some cases. For
                      accuracy please check the Output units.
                    </div>
                  )}
                </div>
                {conversionRateTokenB ? (
                  <span className="usd-spacing">
                    ${formatNumber(usdValueTokenB)}
                  </span>
                ) : (
                  "Fetching Rate..."
                )}
              </div>
            </div>

            {/* Route Info - Integrated into widget flow */}
            {selectedTokenA && selectedTokenB && amountOut && parseFloat(amountOut) > 0 && (
              <div className="w-full mt-8 px-2">
                <div className="bg-[#FFE6C0] border-2 border-[var(--primary-color)] p-3 rounded-xl shadow-sm md:w-[450px] mx-auto">
                  <div className="font-orbitron text-[10px] md:text-sm text-black">
                    <div className="flex justify-between gap-4 mb-1">
                      <span className="font-bold">Rate:</span>
                      <span className="rigamesh">1 {isRateReversed ? selectedTokenB.ticker : selectedTokenA.ticker} = {getRateDisplay()} {isRateReversed ? selectedTokenA.ticker : selectedTokenB.ticker}</span>
                    </div>
                    <div className="flex justify-between gap-4 mb-1">
                      <span className="font-bold">Min Received:</span>
                      <span className="rigamesh">{formatNumber(parseFloat(minToReceiveAfterFee).toFixed(6))} {selectedTokenB.ticker}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-bold">Price Impact:</span>
                      <span className={`rigamesh ${getPriceImpactColor(priceImpact)}`}>{priceImpact}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div
              className={`relative flex justify-center flex-row md:mt-16 mt-11 xl:pt-0 pt-0 top-0`}
            >
              <button
                onClick={() => {
                  if (amountOut && parseFloat(amountOut) > 0) {
                    setInitialQuote(amountOut);
                    setAmountVisible(true);
                  }
                }}
                disabled={isInsufficientBalance()}
                className={`gtw relative z-50 md:w-[360px] w-[200px] md:h-[68px] h-11 bg-[var(--primary-color)] md:rounded-[10px] rounded-md mx-auto button-trans h- flex justify-center items-center transition-all ${isInsufficientBalance()
                  ? "opacity-50 cursor-not-allowed"
                  : " "
                  } font-orbitron lg:text-3xl text-base font-black`}
              >
                <div className="group-hover:opacity-100 w-full absolute md:top-4 top-2 md:-left-5 -left-3 z-[-1] bg-transparent border-2 border-[var(--primary-color)] md:rounded-[10px] rounded-md md:h-[68px] h-11"></div>
                <span>{getButtonText()}</span>
              </button>
            </div>
          </div>
          {/* Ends */}
        </div>
      </div >

      {isSlippageVisible && (
        <SlippageCalculator
          inputAmount={localBestRoute?.amountOut}
          onSlippageCalculated={handleSlippageCalculated}
          onClose={() => setSlippageVisible(false)}
        />
      )
      }

      <div aria-label="Modal Success">
        {swapSuccess && (
          <Transaction
            transactionHash={swapHash}
            onClose={() => setSwapSuccess(false)}
          />
        )}
      </div>
      <div aria-label="Modal">
        {isAmountVisible && (
          <Amount
            onClose={() => {
              setAmountVisible(false);
              setInitialQuote("");
              setNewQuote("");
              setShowPriceAlert(false);
            }}
            amountIn={amountIn}
            amountOut={parseFloat(amountOut).toFixed(6)}
            tokenA={selectedTokenA}
            tokenB={selectedTokenB}
            refresh={() => { }}
            confirm={confirmSwap}
            handleApprove={handleApprove}
            needsApproval={needsApproval}
            usdValueTokenA={usdValueTokenA}
            usdValueTokenB={usdValueTokenB}
            rate={getRateDisplay()}
            showPriceAlert={showPriceAlert}
            newQuote={newQuote}
            initialQuote={initialQuote}
            percentChange={percentChange}
            onAcceptNewQuote={handleAcceptNewQuote}
            onRejectNewQuote={handleRejectNewQuote}
          />
        )}
      </div>
      <div aria-label="Modal1">
        {isTokenVisible && (
          <Token
            onClose={() => setTokenVisible(false)}
            onSelect={handleTokenSelect}
          />
        )}
      </div>

      <div className="w-full flex justify-center py-4 mt-4">
        <a
          href="https://empx.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-orbitron text-gray-500 hover:text-[var(--primary-color)] transition-colors opacity-70 hover:opacity-100"
        >
          Powered by EMPX
        </a>
      </div>
      {/* <iframe src="https://switch.win/widget?network=pulsechain&background_color=000000&font_color=ffffff&secondary_font_color=7a7a7a&border_color=01e401&backdrop_color=f1f1f1&from=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee&to=0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39" allow="clipboard-read; clipboard-write" width="100%" height="900px" /> */}
    </>
  );
};

export default Emp;
