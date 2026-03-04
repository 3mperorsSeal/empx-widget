import { useEffect, useState, useMemo, useRef } from "react";
// import Logo from "../../assets/images/swap-emp.png";
import Sett from "../../assets/images/setting.svg";
import empLogo from "../../assets/images/emp-main-logo.png";
import Logo from "../../assets/images/empx-new.svg";

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
import { EmpsealRouterV7 } from "../../utils/lite/EmpsealRouterV7";
import { formatUnits } from "viem";
import Tokens from "../tokenList.json";
import { useStore } from "../../redux/store/routeStore";
import Transaction from "./Transaction";
import { Copy, Check, InfoIcon, ArrowDownUp } from "lucide-react";
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
  const [isFindingBetterRoute, setIsFindingBetterRoute] = useState(false);
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
  // Handle Token Selection - supports URL params for default tokens
  useEffect(() => {
    if (tokenList && tokenList.length > 0) {
      if (!selectedTokenA) {
        const fromConfig = config.defaultTokenIn
          ? tokenList.find(
              (t) =>
                t.address.toLowerCase() === config.defaultTokenIn.toLowerCase(),
            )
          : null;
        setSelectedTokenA(fromConfig || tokenList[0]);
      }
      if (!selectedTokenB) {
        const toConfig = config.defaultTokenOut
          ? tokenList.find(
              (t) =>
                t.address.toLowerCase() ===
                config.defaultTokenOut.toLowerCase(),
            )
          : null;
        setSelectedTokenB(toConfig || tokenList[1]);
      }
    }
  }, [tokenList, config.defaultTokenIn, config.defaultTokenOut]);

  // Dynamic Fee Update
  useEffect(() => {
    if (selectedTokenA && selectedTokenB) {
      const isStable = (address) =>
        stableTokens?.some(
          (stable) => stable.toLowerCase() === address.toLowerCase(),
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
  }, [chainId, selectedTokenA, selectedTokenB, stableTokens]);

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
        setIsFindingBetterRoute(false);
        return;
      }
      setIsQuoting(true);
      setAmountOut("0");
      setIsFindingBetterRoute(true);

      try {
        // Progressive quote callback - updates UI immediately with fast quote
        const onQuoteUpdate = (quoteResult, isFinal) => {
          // Check if this request is still the latest
          if (currentRequestId !== quoteRequestIdRef.current) return;

          if (!quoteResult) {
            if (isFinal) {
              setIsQuoting(false);
              setIsFindingBetterRoute(false);
            }
            return;
          }

          const route = quoteResult.route;
          lastCompletedIdRef.current = currentRequestId;
          updateRoute(route);

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

          // Update loading states
          if (isFinal) {
            setIsQuoting(false);
            setIsFindingBetterRoute(false);
          } else {
            // Fast quote received, but still searching for better routes
            setIsQuoting(false);
          }
        };

        await smartRouter.getBestQuoteFromUserProgressive(
          debouncedAmountIn,
          selectedTokenA.address,
          selectedTokenB.address,
          protocolFee,
          onQuoteUpdate,
        );
      } catch (error) {
        console.error("[Emp] Quote error:", error);
        setAmountOut("0");
        setRoute([]);
        updateRoute(null);
        setIsQuoting(false);
        setIsFindingBetterRoute(false);
      }
    };

    getQuote();
  }, [
    smartRouter,
    debouncedAmountIn,
    selectedTokenA,
    selectedTokenB,
    protocolFee,
  ]); // Added protocolFee dependency

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
        const amountInBigInt = convertToBigInt(
          debouncedAmountIn,
          selectedTokenA.decimal,
        );
        const allowance = await checkAllowance(
          chainId,
          selectedTokenA.address,
          address,
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
        address,
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
      if (token === selectedTokenB) {
        // Swap if same token selected
        setSelectedTokenB(selectedTokenA);
        setSelectedTokenA(token);
        setAmountOut("0");
        setAmountIn("0");
      } else {
        setSelectedTokenA(token);
      }
    } else {
      if (token === selectedTokenA) {
        // Swap if same token selected
        setSelectedTokenA(selectedTokenB);
        setSelectedTokenB(token);
        setAmountOut("0");
        setAmountIn("0");
      } else {
        setSelectedTokenB(token);
      }
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
          `https://api.geckoterminal.com/api/v2/simple/networks/${symbol}/token_price/${addressToFetch}`,
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
          `https://api.geckoterminal.com/api/v2/simple/networks/${symbol}/token_price/${addressToFetch}`,
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
          address,
        );
        if (allowance.data < amountInBigInt) {
          toast.error("Please approve token first");
          setSwapStatus("IDLE");
          return;
        }
      }

      setSwapStatus("SWAPPING");
      // Calculate minAmountOut with slippage tolerance
      // Base: 0.5% slippage (995/1000)
      // If integratorId is present, add extra buffer for integrator fee (max 3%)
      // Using 1% total buffer (990/1000) when integrator is active to be safe
      const slippageMultiplier = config.integratorId ? 990n : 995n;
      const minAmountOut =
        (localBestRoute.amountOut * slippageMultiplier) / 1000n;
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
        // Prepare integratorId (bytes32) - null or hex string from config
        const integratorIdBytes32 = config.integratorId
          ? config.integratorId
          : "0x0000000000000000000000000000000000000000000000000000000000000000";

        tx = await writeContractAsync({
          address: routerAddress,
          abi: EmpsealRouterV7,
          functionName: "executeConvergeSwap",
          args: [
            localBestRoute.payload, // Use localBestRoute
            minAmountOut,
            address,
            protocolFeeBigInt,
            deadline,
            integratorIdBytes32, // NEW: integratorId
          ],
          value:
            selectedTokenA.address === EMPTY_ADDRESS
              ? localBestRoute.payload.amountIn
              : 0n,
        });
      } else {
        // SPLIT
        // Prepare integratorId (bytes32) - null or hex string from config
        const integratorIdBytes32 = config.integratorId
          ? config.integratorId
          : "0x0000000000000000000000000000000000000000000000000000000000000000";

        tx = await writeContractAsync({
          address: routerAddress,
          abi: EmpsealRouterV7,
          functionName: "executeSplitSwap",
          args: [
            localBestRoute.payload, // Use localBestRoute
            convertToBigInt(amountIn, selectedTokenA.decimal),
            minAmountOut,
            address,
            protocolFeeBigInt,
            deadline,
            integratorIdBytes32, // NEW: integratorId
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

      if (
        message.includes("User rejected") ||
        message.includes("User denied")
      ) {
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
    if (swapStatus === "APPROVING") return "Approving...";
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

  const [selectedPercentageBuy, setSelectedPercentageBuy] = useState("");
  const handlePercentageChangeBuy = (percentage) => {
    const parsedPercentage = percentage === "" ? "" : parseInt(percentage);
    setSelectedPercentageBuy(parsedPercentage);

    // Calculate based on tokenB balance
    let balance;
    if (selectedTokenB.address === EMPTY_ADDRESS) {
      balance = parseFloat(formattedBalance || 0);
    } else {
      balance = parseFloat(tokenBBalance?.formatted || 0);
    }

    const calculatedAmount = balance * (parsedPercentage / 100);
    setAmountOut(calculatedAmount.toFixed(6));
  };
  useEffect(() => {
    setSelectedPercentageBuy("");
    setAmountIn("");
    setAmountOut("0");
  }, [selectedTokenB]);
  // In your Emp component, add loading state
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);

  // Update this when you're fetching quotes
  useEffect(() => {
    if (isQuoting) {
      setIsRoutingLoading(true);
    } else {
      // Add a small delay to show loading state smoothly
      const timer = setTimeout(() => {
        setIsRoutingLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isQuoting]);

  const getFontSizeClass = (text = "") => {
    const length = text.toString().length;

    if (length >= 6) return "text-xs md:text-xs";
    return "text-xs md:text-xs";
  };

  return (
    <>
      <div
        className={`w-full rounded-xl xl:pb-10 lg:pt-1 pt-5 2xl:px-8 lg:px-8 md:px-6 px-1 md:mt-0 mt-4 relative 2xl:pb-20 lg:pb-0 pb-20`}
      >
        {/* scales8 top70 */}
        <div className={`w-full`}>
          <div className="container w-full mx-auto flex justify-between items-center mb-4 px-1">
            {/* Left side: could be a logo or chain selector if WalletConnect doesn't handle it fully */}
            <a href="https://www.empx.io/dapp">
              <img
                src={Logo}
                alt="Logo"
                className="mx-aut 2xl:w-[145px] md:w-[130px] w-[110px] md:ml-0 ml-2"
              />
            </a>

            {/* Right side: Wallet Connect/Disconnect */}
            <div className="flex gap-2 wallet-bg-bridge">
              <WalletConnect />
            </div>
          </div>
          <div className="scales8">
            <div className="lg:max-w-[600px] md:max-w-[600px] mx-auto w-full flex gap-3 items-center md:justify-start justify-start md:flex-nowrap flex- mt-2 mb-3 lg:px-1 px-0">
              <div
                onClick={() => setSlippageVisible(true)}
                className="ml-auto shrink-0 bg-[var(--bg-color)] md:px-6 px-3 md:py-2 py-2 border-2 border-[var(--primary)] rounded-lg flex justify-center items-center hoverswap transition-all cursor-pointer group"
              >
                <p className="text-[var(--primary-color)] md:text-[10px] text-[10px] font-extrabold font-orbitron">
                  SETTINGS
                </p>
              </div>
            </div>
            {/* Swap */}
            <div className="lg:max-w-[600px] md:max-w-[600px] mx-auto w-full">
              <div className="relative bg_swap_box bg-[var(--bg-color)]">
                <div className="flex justify-between gap-3 items-center">
                  <div className="font-orbitron md:text-[15px] text-xs font-extrabold leading-normal text-[var(--primary-color)]">
                    You Sell
                  </div>
                  <div className="md:text-xs text-[10px] font-orbitron">
                    <span className="font-normal leading-normal text-[var(--primary-color)]">
                      BAL
                    </span>
                    <span className="font-normal leading-normal text-[var(--primary-color)]">
                      {" "}
                      :{" "}
                    </span>
                    <span className="text-white leading-normal">
                      {!selectedTokenA
                        ? "0.00"
                        : isLoading
                          ? "Loading.."
                          : selectedTokenA.address === EMPTY_ADDRESS
                            ? `${formatNumber(formattedBalance)}`
                            : `${
                                tokenBalance
                                  ? formatNumber(
                                      parseFloat(
                                        tokenBalance.formatted,
                                      ).toFixed(6),
                                    )
                                  : "0.00"
                              }`}
                    </span>
                  </div>
                </div>
                <div className="flex w-full mt-3 mt6 md:gap-5 gap-2 items-center">
                  <div className="lg:md:max-w-[200px] w-full">
                    <div className="flex justify-between items-center cursor-pointer gap-4 w-full">
                      <div className="flex gap-2 items-center w-full">
                        <div className="flex md:gap-4 gap-1 items-center bg-[var(--bg-color)] border border-[var(--primary)] md:rounded-[7px] rounded-lg md:px-3 px-3 md:py-[8px] py-2 justify-center w-full">
                          <div
                            onClick={() => {
                              setIsSelectingTokenA(true);
                              setTokenVisible(true);
                              setSelectedPercentage("");
                              setAmountIn("");
                            }}
                            className="flex items-center md:gap-4 gap-1 w-full justify-center"
                          >
                            {selectedTokenA ? (
                              <>
                                <img
                                  className="md:w-5 md:h-5 w-4 h-4"
                                  src={
                                    selectedTokenA.image ||
                                    selectedTokenA.logoURI
                                  }
                                  alt={selectedTokenA.name}
                                />
                                <div className="text-white font-bold font-orbitron leading-normal bg-[var(--bg-color)] appearance-none outline-none">
                                  {selectedTokenA.ticker ||
                                    selectedTokenA.symbol}
                                </div>
                              </>
                            ) : (
                              <span className="text-white font-extrabold font-orbitron md:text-xs text-xs capitalize">
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
                  <div className="w-full md:h-[53px] h-9">
                    {(() => {
                      const inputLength =
                        formatNumber(amountIn)?.replace(/\D/g, "").length || 0;
                      const defaultFontSize =
                        window.innerWidth >= 1024
                          ? 28
                          : window.innerWidth >= 768
                            ? 24
                            : 20;
                      const FREE_DIGITS = window.innerWidth >= 768 ? 12 : 5;
                      const SHRINK_RATE = 3;

                      const excessDigits = Math.max(
                        0,
                        inputLength - FREE_DIGITS,
                      );

                      const dynamicFontSize = Math.max(
                        10,
                        defaultFontSize - excessDigits * SHRINK_RATE,
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
                          className="font-orbitron font-extrabold text-white rounded-[10px] px-1 py-3 text-end w-full h-full outline-none border-none transition-all duration-200 ease-in-out bg-[var(--bg-color)] space"
                          style={{
                            fontSize: `${dynamicFontSize}px`,
                          }}
                        />
                      );
                    })()}
                  </div>
                </div>
                <div className="flex justify-between gap-2 items-center 2xl:mt-3 mt-3 md:flex-nowrap flex-wrap mt6">
                  <div className="text-[var(--primary-color)] font-orbitron md:text-[15px] text-xs flex flex-col relative top-2">
                    <span>
                      {selectedTokenA ? (
                        conversionRate ? (
                          `$${parseFloat(conversionRate).toFixed(6)}`
                        ) : (
                          <span className="animate-pulse">Loading...</span>
                        )
                      ) : (
                        "--"
                      )}
                    </span>
                    <span className="font-bold mt-1">Market Price</span>
                  </div>
                  <div className="text-zinc-200 text-[10px] font-normal font-orbitron leading-normal flex md:gap-2 gap-1 justify-end">
                    <span></span>
                    {[25, 50, 75, 100].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`py-1 border bg-[#EEC485] hover:text-white flex justify-center items-center rounded-full md:text-[10px] text-[8px] font-medium font-orbitron md:w-12 w-11 px-2
            ${
              selectedPercentage === value
                ? "!text-[var(--primary-color)] hover:!text-[var(--primary-color)] !bg-[var(--bg-color)] border-[var(--primary)]"
                : "bg-[#EEC485] text-[#040404] border border-[var(--primary)] hover:border-[var(--primary)] hover:bg-[var(--bg-color)] hover:!text-[var(--primary-color]"
            }`}
                        onClick={() => handlePercentageChange(value)}
                        disabled={isLoading}
                      >
                        {value}%
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-right relative text-white md:text-xs text-[10px] usd-spacing truncate font-orbitron mt-2 text-sh1 flex justify-end gap-1">
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
                        className="font-orbitron fixed rt0 z-50 mt-2 md:w-[450px] w-[300px] whitespace-pre-wrap rounded-lg bg-[var(--bg-color)] px-4 py-3 text-center md:text-xs text-[9px] font-bold text-white shadow-lg"
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
                  {selectedTokenA
                    ? conversionRate
                      ? `$${formatNumber(usdValue)}`
                      : "Fetching Rate..."
                    : "$0.00"}
                </div>
              </div>
              <div
                className="cursor-pointer mx-auto my-4 relative md:w-11 w-10 h-10 bg-[var(--primary-color)] rounded-lg flex justify-center items-center hoverswap transition-all"
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
                <ArrowDownUp className="md:w-4 md:h-4 w-3 h-3 text-black" />
              </div>

              <div className="relative bg_swap_box_black bg-[var(--bg-color)]">
                <div className="flex justify-between gap-3 items-center">
                  <div className="font-orbitron md:text-[15px] text-xs font-extrabold leading-normal text-[var(--primary-color)]">
                    You Buy
                  </div>
                  <div className="md:text-xs text-[10px] font-orbitron">
                    <span className="font-normal leading-normal text-[var(--primary-color)]">
                      BAL
                    </span>{" "}
                    <span className="font-normal leading-normal text-[var(--primary-color)]">
                      {" "}
                      :{" "}
                    </span>
                    <span className="text-white leading-normal">
                      {!selectedTokenB
                        ? "0.00"
                        : isLoading
                          ? "Loading.."
                          : selectedTokenB.address === EMPTY_ADDRESS
                            ? `${formatNumber(formattedChainBalanceTokenB)}`
                            : `${
                                tokenBBalance
                                  ? formatNumber(
                                      parseFloat(
                                        tokenBBalance.formatted,
                                      ).toFixed(6),
                                    )
                                  : "0.00"
                              }`}
                    </span>
                  </div>
                </div>

                <div className="flex w-full mt-3 mt6 md:gap-5 gap-2 items-center">
                  <div className="lg:md:max-w-[200px] w-full">
                    <div className="flex justify-between items-center cursor-pointer gap-4 w-full">
                      <div className="flex gap-2 items-center w-full">
                        <div className="flex md:gap-4 gap-1 items-center bg-[var(--bg-color)] border border-[var(--primary)] md:rounded-[7px] rounded-lg md:px-3 px-3 md:py-[8px] py-2 justify-center w-full">
                          <div
                            onClick={() => {
                              setIsSelectingTokenA(false);
                              setTokenVisible(true);
                            }}
                            className="flex items-center justify-center md:gap-4 gap-1 w-full"
                          >
                            {selectedTokenB ? (
                              <>
                                <img
                                  className="md:w-5 md:h-5 w-4 h-4"
                                  src={
                                    selectedTokenB.image ||
                                    selectedTokenB.logoURI
                                  }
                                  alt={selectedTokenB.name}
                                />
                                <div className="text-white font-bold font-orbitron leading-normal bg-[var(--bg-color)] appearance-none outline-none">
                                  {selectedTokenB.ticker ||
                                    selectedTokenB.symbol}
                                </div>
                              </>
                            ) : (
                              <span className="text-white font-extrabold font-orbitron md:text-xs text-xs capitalize">
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
                                <Copy className="md:w-4 md:h-4 w-3 h-3 text-white hover:text-white" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full md:h-[53px] h-9">
                    {(() => {
                      const numericValue = Number(amountOut);

                      const formattedValue = isNaN(numericValue)
                        ? ""
                        : formatNumber(numericValue.toFixed(4));

                      const outputLength =
                        formattedValue.replace(/,/g, "").length || 0;

                      const defaultFontSize =
                        window.innerWidth >= 1024
                          ? 28
                          : window.innerWidth >= 768
                            ? 24
                            : 20;
                      const FREE_DIGITS = window.innerWidth >= 768 ? 12 : 6;
                      const SHRINK_RATE = 3;

                      const excessDigits = Math.max(
                        0,
                        outputLength - FREE_DIGITS,
                      );

                      const dynamicFontSize = Math.max(
                        10,
                        defaultFontSize - excessDigits * SHRINK_RATE,
                      );

                      return (
                        <>
                          {isQuoting ? (
                            <span className="font-orbitron text-white animate-pulse text-right w-full flex justify-end">
                              Calculating...
                            </span>
                          ) : (
                            <input
                              type="text"
                              placeholder="0.00"
                              value={formattedValue}
                              onChange={handleOutputChange}
                              readOnly
                              className="font-orbitron font-extrabold text-white rounded-[10px] px-1 py-3 text-end w-full h-full outline-none border-none transition-all duration-200 ease-in-out bg-[var(--bg-color)] space"
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
                <div className="flex justify-between gap-2 items-center 2xl:mt-3 mt-3 md:flex-nowrap flex-wrap mt6">
                  <div className="text-[var(--primary-color)] font-orbitron md:text-[15px] text-xs flex flex-col relative top-2">
                    <span>
                      {selectedTokenB ? (
                        conversionRateTokenB ? (
                          `$${parseFloat(conversionRateTokenB).toFixed(6)}`
                        ) : (
                          <span className="animate-pulse">Loading...</span>
                        )
                      ) : (
                        "--"
                      )}
                    </span>
                    <span className="font-bold mt-1">Market Price</span>
                  </div>
                  <div className="text-zinc-200 text-[10px] font-normal font-orbitron leading-normal flex md:gap-2 gap-1 justify-end">
                    <span></span>
                    {[25, 50, 75, 100].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`py-1 border bg-[#EEC485] hover:text-white flex justify-center items-center rounded-full md:text-[10px] text-[8px] font-medium font-orbitron md:w-12 w-11 px-2
            ${
              selectedPercentageBuy === value
                ? "!text-[var(--primary-color)] hover:!text-[var(--primary-color)] !bg-[var(--bg-color)] border-[var(--primary)]"
                : "bg-[#EEC485] text-[#040404] border border-[var(--primary)] hover:border-[var(--primary)] hover:bg-[var(--bg-color)] hover:!text-[var(--primary-color]"
            }`}
                        onClick={() => setSelectedPercentageBuy(value)}
                        disabled={isLoading}
                      >
                        {value}%
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-right relative text-white md:text-xs text-[10px] usd-spacing truncate font-orbitron mt-2 text-sh1 flex justify-end gap-1">
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
                        className="font-orbitron fixed rt0 z-50 mt-2 md:w-[450px] w-[300px] whitespace-pre-wrap rounded-lg bg-[var(--bg-color)] px-4 py-3 text-center md:text-xs text-[9px] font-bold text-white shadow-lg"
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
                  {selectedTokenB ? (
                    conversionRateTokenB ? (
                      <span className="font-orbitron">
                        ${formatNumber(usdValueTokenB)}
                      </span>
                    ) : (
                      "Fetching Rate..."
                    )
                  ) : (
                    "$0.00"
                  )}
                </div>
              </div>

              {/* Route Info - Integrated into widget flow */}
              {selectedTokenA &&
                selectedTokenB &&
                amountOut &&
                parseFloat(amountOut) > 0 && (
                  <div className="bg_swap_box bg-[var(--bg-color)] border-2 border-[var(--primary)] mt-6 md:px-5 px-4 !py-6 font-orbitron">
                    <div className="w-full mx-auto">
                      <div className="font-orbitron text-[10px] md:text-sm text-[var(--primary-color)]">
                        <div className="flex justify-between gap-4 mb-1">
                          <span className="font-bold">Rate:</span>
                          <span>
                            1{" "}
                            {isRateReversed
                              ? selectedTokenB.ticker
                              : selectedTokenA.ticker}{" "}
                            = {getRateDisplay()}{" "}
                            {isRateReversed
                              ? selectedTokenA.ticker
                              : selectedTokenB.ticker}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 mb-1">
                          <span className="font-bold">Min Received:</span>
                          <span>
                            {formatNumber(
                              parseFloat(minToReceiveAfterFee).toFixed(6),
                            )}{" "}
                            {selectedTokenB.ticker}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="font-bold">Price Impact:</span>
                          <span
                            className={`${getPriceImpactColor(priceImpact)}`}
                          >
                            {priceImpact}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              <div
                className={`relative flex justify-center flex-row md:mt-5 mt-4 xl:pt-0`}
              >
                <button
                  onClick={() => {
                    if (amountOut && parseFloat(amountOut) > 0) {
                      setInitialQuote(amountOut);
                      setAmountVisible(true);
                    }
                  }}
                  disabled={isInsufficientBalance()}
                  className={`gtw relative z-50 w-full uppercase md:h-12 h-11 bg-[#F59216] md:rounded-[10px] rounded-md mx-auto button-trans h- flex justify-center items-center transition-all ${
                    isInsufficientBalance()
                      ? "opacity-50 cursor-not-allowed"
                      : " "
                  } font-orbitron lg:text-base text-base font-extrabold`}
                >
                  <span>{getButtonText()}</span>
                </button>
              </div>
            </div>
            {/* Ends */}
          </div>
        </div>
      </div>

      {isSlippageVisible && (
        <SlippageCalculator
          inputAmount={localBestRoute?.amountOut}
          onSlippageCalculated={handleSlippageCalculated}
          onClose={() => setSlippageVisible(false)}
        />
      )}

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
            refresh={() => {}}
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
            swapStatus={swapStatus}
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
          Powered by
          <img
            src={empLogo}
            alt="Empx Logo"
            className="inline-block ml-1 md:w-12 w-8 align-middle"
          />
        </a>
      </div>
    </>
  );
};

export default Emp;
