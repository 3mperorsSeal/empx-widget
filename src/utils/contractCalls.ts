import { Address, erc20Abi } from "viem";
import {
  readContract,
  writeContract,
  waitForTransactionReceipt,
} from "@wagmi/core";
import { toast } from "react-toastify";
import { SwapStatus, TradeInfo } from "./types/interface";
import { WPLS } from "./abis/wplsABI";
import { WETHW } from "./abis/wethwABI";
import { WSONIC } from "./abis/wsonicABI";
import { WETH } from "./abis/wethBaseABI";
import { WSEI } from "./abis/wseiABI";
import { WBERA } from "./abis/wberaABI";
import { WRBTC } from "./abis/wrbtcABI";

import { config } from "../Wagmi/config";
import { getChainConfig } from "./getChainConfig";
import {
  SWAP_ROUTER_ABI,
  SWAP_ROUTER_INTEGRATOR_ABI,
} from "./abis/swapRouterABI";

// Get the wrapped token ABI based on chain ID
const getWrappedTokenABI = (chainId: number) => {
  switch (chainId) {
    case 10001: // ETHW
      return WETHW;
    case 146: // Sonic
      return WSONIC;
    case 8453: // base
      return WETH;
    case 1329: // Sei
      return WSEI;
    case 80094: // Bera
      return WBERA;
    case 30: // rootstock
      return WRBTC;
    case 369: // Pulsechain
    default:
      return WPLS;
  }
};

const getCurrentChainConfig = (chainId: number) => {
  return getChainConfig(chainId);
};

const DEFAULT_ROUTER_FEE = 28n;
const BYTES_32_REGEX = /^0x[0-9a-fA-F]{64}$/;

const getValidIntegratorId = (integratorId?: string | null): `0x${string}` | undefined => {
  if (!integratorId) return undefined;
  const trimmed = integratorId.trim();
  if (!trimmed || !BYTES_32_REGEX.test(trimmed)) {
    return undefined;
  }
  return trimmed as `0x${string}`;
};

const getTradePayload = (tradeInfo: TradeInfo) => ({
  adapters: tradeInfo.adapters,
  amountIn: tradeInfo.amountIn,
  amountOut: tradeInfo.amountOut,
  path: tradeInfo.path,
});

const getSwapArgs = (
  tradeInfo: TradeInfo,
  userAddress: Address,
  fee: bigint = DEFAULT_ROUTER_FEE,
) => {
  const baseArgs = [getTradePayload(tradeInfo), userAddress, fee] as const;
  return baseArgs;
};

const getSwapArgsWithIntegrator = (
  tradeInfo: TradeInfo,
  userAddress: Address,
  integratorId: `0x${string}`,
  fee: bigint = DEFAULT_ROUTER_FEE,
) => {
  return [
    getTradePayload(tradeInfo),
    userAddress,
    fee,
    integratorId,
  ] as const;
};

export const EMPTY_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

export const checkAllowance = async (chainId: number, tokenInAddress: string, userAddress: Address) => {
  try {
    const {routerAddress} = getCurrentChainConfig(chainId);
    let result = await readContract(config, {
      abi: erc20Abi,
      address: tokenInAddress as Address,
      functionName: "allowance",
      args: [userAddress, routerAddress],
    });
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    throw e;
  }
};

export const callApprove = async (chainId: number, tokenInAddress: string, amountIn: bigint) => {
  try {
    const {routerAddress} = getCurrentChainConfig(chainId);
    let result = await writeContract(config, {
      abi: erc20Abi,
      address: tokenInAddress as Address,
      functionName: "approve",
      args: [routerAddress, amountIn],
    });
    await waitForTransaction(result);
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    throw e;
  }
};

const swapFromEth = async (
  chainId: number,
  tradeInfo: TradeInfo,
  userAddress: Address,
  integratorId?: `0x${string}`,
  fee: bigint = DEFAULT_ROUTER_FEE,
) => {
  try {
    const {routerAddress} = getCurrentChainConfig(chainId);
    const fnName = chainId === 369 ? "swapNoSplitFromPLS" : "swapNoSplitFromETH";
    let result: `0x${string}`;
    if (integratorId) {
      result = await writeContract(config, {
        abi: SWAP_ROUTER_INTEGRATOR_ABI,
        address: routerAddress,
        functionName: fnName,
        args: getSwapArgsWithIntegrator(tradeInfo, userAddress, integratorId, fee),
        value: tradeInfo.amountIn,
      });
    } else {
      result = await writeContract(config, {
        abi: SWAP_ROUTER_ABI,
        address: routerAddress,
        functionName: fnName,
        args: getSwapArgs(tradeInfo, userAddress, fee),
        value: tradeInfo.amountIn,
      });
    }
    await waitForTransaction(result);
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    console.log("error", e);
    throw e;
  }
};

const swapToEth = async (
  chainId: number,
  tradeInfo: TradeInfo,
  userAddress: Address,
  integratorId?: `0x${string}`,
  fee: bigint = DEFAULT_ROUTER_FEE,
) => {
  try {
    const {routerAddress} = getCurrentChainConfig(chainId);
    const fnName = chainId === 369 ? "swapNoSplitToPLS" : "swapNoSplitToETH";
    let result: `0x${string}`;
    if (integratorId) {
      result = await writeContract(config, {
        abi: SWAP_ROUTER_INTEGRATOR_ABI,
        address: routerAddress,
        functionName: fnName,
        args: getSwapArgsWithIntegrator(tradeInfo, userAddress, integratorId, fee),
      });
    } else {
      result = await writeContract(config, {
        abi: SWAP_ROUTER_ABI,
        address: routerAddress,
        functionName: fnName,
        args: getSwapArgs(tradeInfo, userAddress, fee),
      });
    }
    await waitForTransaction(result);
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    throw e;
  }
};

const swapNoSplitToEth = async (chainId: number, tradeInfo: TradeInfo, userAddress: Address) => {
  try {
    const {wethAddress} = getCurrentChainConfig(chainId);
    const wrappedTokenABI = getWrappedTokenABI(chainId);
    let result = await writeContract(config, {
      abi: wrappedTokenABI,
      address: wethAddress,
      functionName: "withdraw",
      args: [tradeInfo.amountIn],
    });
    await waitForTransaction(result);
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    throw e;
  }
};

const swapNoSplitFromEth = async (
  chainId: number,
  tradeInfo: TradeInfo,
  userAddress: Address
) => {
  try {
    const {wethAddress} = getCurrentChainConfig(chainId);
    const wrappedTokenABI = getWrappedTokenABI(chainId);
    let result = await writeContract(config, {
      abi: wrappedTokenABI,
      address: wethAddress,
      functionName: "deposit",
      args: [],
      value: tradeInfo.amountIn,
    });
    await waitForTransaction(result);
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    throw e;
  }
};

const swap = async (
  chainId: number,
  tradeInfo: TradeInfo,
  userAddress: Address,
  integratorId?: `0x${string}`,
  fee: bigint = DEFAULT_ROUTER_FEE,
) => {
  try {
    const {routerAddress} = getCurrentChainConfig(chainId);
    let result: `0x${string}`;
    if (integratorId) {
      result = await writeContract(config, {
        abi: SWAP_ROUTER_INTEGRATOR_ABI,
        address: routerAddress,
        functionName: "swapNoSplit",
        args: getSwapArgsWithIntegrator(tradeInfo, userAddress, integratorId, fee),
      });
    } else {
      result = await writeContract(config, {
        abi: SWAP_ROUTER_ABI,
        address: routerAddress,
        functionName: "swapNoSplit",
        args: getSwapArgs(tradeInfo, userAddress, fee),
      });
    }
    await waitForTransaction(result);
    return {
      success: true,
      data: result,
    };
  } catch (e: any) {
    throw e;
  }
};

const waitForTransaction = async (hash: Address) => {
  try {
    const transactionReceipt = await waitForTransactionReceipt(config, {
      confirmations: 2,
      hash,
    });
    if (transactionReceipt.status === "success") {
      return {
        success: true,
        data: transactionReceipt,
      };
    }
    throw transactionReceipt.status;
  } catch (e: any) {
    throw e;
  }
};

export const swapTokens = async (
  setStatus: (status: SwapStatus) => void,
  setSwapHash: (hash: string) => void,
  tokenInAddress: Address,
  tokenOutAddress: Address,
  userAddress: Address,
  tradeInfo: TradeInfo,
  chainId: number,
  integratorId?: string | null,
  protocolFee?: number,
) => {
  try {
    const {wethAddress} = getCurrentChainConfig(chainId);
    const validatedIntegratorId = getValidIntegratorId(integratorId);
    if (integratorId && !validatedIntegratorId) {
      console.warn("Ignoring invalid integratorId. Expected bytes32 hex string.");
    }
    const fee = protocolFee != null ? BigInt(protocolFee) : DEFAULT_ROUTER_FEE;
    setStatus("LOADING");
    const defaultResponse = {
      success: false,
      data: EMPTY_ADDRESS,
    };
    let swapResponse = defaultResponse;
    if (tokenInAddress !== EMPTY_ADDRESS) {
      const approvedTokens = await checkAllowance(chainId, tokenInAddress, userAddress);
      if (approvedTokens.data < tradeInfo.amountIn) {
        try {
          setStatus("APPROVING");
          await callApprove(chainId, tokenInAddress, tradeInfo.amountIn);
          setStatus("APPROVED");
          toast.success("Token approved! Ready to confirm the transaction.");
        } catch (error) {
          setStatus("ERROR");
          console.error("Approval failed:", error);
          toast.error("Token approval failed");
          throw error; // Rethrow if necessary for further error handling
        }
      }
    }
    // setStatus("APPROVED");
    setStatus("SWAPPING");
    if (tokenInAddress === EMPTY_ADDRESS && tokenOutAddress === wethAddress) {
      swapResponse = await swapNoSplitFromEth(chainId, tradeInfo, userAddress);
    } else if (
      tokenInAddress === wethAddress &&
      tokenOutAddress === EMPTY_ADDRESS
    ) {
      swapResponse = await swapNoSplitToEth(chainId, tradeInfo, userAddress);
    } else if (tokenInAddress === EMPTY_ADDRESS) {
      swapResponse = await swapFromEth(chainId, tradeInfo, userAddress, validatedIntegratorId, fee);
    } else if (tokenOutAddress === EMPTY_ADDRESS) {
      swapResponse = await swapToEth(chainId, tradeInfo, userAddress, validatedIntegratorId, fee);
    } else {
      swapResponse = await swap(chainId, tradeInfo, userAddress, validatedIntegratorId, fee);
      toast.success("Transaction Successful");
    }
    setStatus("SWAPPED");
    setSwapHash(swapResponse.data);
    return swapResponse;
  } catch (error: any) {
    if (
      error?.message &&
      error.message.includes("EmpsealRouter: Insufficient output amount")
    ) {
      setStatus("ERROR");
      toast.error("Output amount too high. Adjust slippage and retry.");
    } else {
      setStatus("ERROR");
      toast.error("Transaction rejected");
    }
    throw error;
  }
};
