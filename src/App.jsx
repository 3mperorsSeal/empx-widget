import { useState, useEffect, useRef } from "react";
import "./styles/global.scss";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { pulsechain, sonic, sei, rootstock } from "wagmi/chains";
import { Provider } from "react-redux";
import store from "./redux/store/store";
import { ToastContainer } from "react-toastify";
import WagmiProviderWrapper from "./Wagmi/WagmiProvider";
import Emp from "./pages/swap/Emp";
import "react-toastify/dist/ReactToastify.css";
import BG from "./assets/images/empx-bg1.webp";

import { useWidgetConfig } from "./widget/useWidgetConfig";
import WidgetBuilder from "./pages/WidgetBuilder";
import { ChainProvider, useSelectedChainId, useSetSelectedChainId } from "./hooks/ChainContext";

// ChainSwitcher logic
const ChainSwitcher = ({ children }) => {
  const chainId = useChainId();
  const { chains: walletChains, switchChain } = useSwitchChain();
  const { isConnected } = useAccount();
  const config = useWidgetConfig();
  const selectedChainId = useSelectedChainId();
  const setSelectedChainId = useSetSelectedChainId();

  const [hasInitialized, setHasInitialized] = useState(false);
  const configChainKey = config.chain ?? "";
  const prevConfigChainRef = useRef(configChainKey);

  useEffect(() => {
    const normalizedConfigChain = config.chain?.toLowerCase().trim();
    const chainMap = {
      pulsechain: pulsechain.id,
      pulse: pulsechain.id,
      sonic: sonic.id,
      ethw: 10001,
      ethereumpow: 10001,
      base: 8453,
      berachain: 80094,
      sei: sei.id,
      "sei-network": sei.id,
      rootstock: rootstock.id,
      monad: 143,
      mon: 143,
    };
    const supportedChainIds = Object.values(chainMap);
    const walletSupportedChainIds = walletChains.map((walletChain) => walletChain.id);
    const targetChainId = chainMap[normalizedConfigChain] || pulsechain.id;

    const configChainChanged = prevConfigChainRef.current !== configChainKey;

    if (!hasInitialized) {
      if (isConnected) {
        setSelectedChainId(targetChainId);
        if (
          chainId !== targetChainId &&
          walletSupportedChainIds.includes(targetChainId)
        ) {
          switchChain?.({ chainId: targetChainId });
        } else if (!supportedChainIds.includes(chainId)) {
          setSelectedChainId(pulsechain.id);
          if (walletSupportedChainIds.includes(pulsechain.id)) {
            switchChain?.({ chainId: pulsechain.id });
          }
        }
      } else {
        setSelectedChainId(targetChainId);
      }
      setHasInitialized(true);
    } else {
      // Re-run if config.chain changes (Builder mode)
      if (isConnected) {
        if (chainId && !supportedChainIds.includes(chainId)) {
          setSelectedChainId(pulsechain.id);
          if (walletSupportedChainIds.includes(pulsechain.id)) {
            switchChain?.({ chainId: pulsechain.id });
          }
        } else if (configChainChanged && chainId !== targetChainId && config.chain) {
          setSelectedChainId(targetChainId);
          if (walletSupportedChainIds.includes(targetChainId)) {
            switchChain?.({ chainId: targetChainId });
          }
        } else if (configChainChanged && config.chain) {
          setSelectedChainId(targetChainId);
        }
      } else {
        if (configChainChanged && selectedChainId !== targetChainId) {
          setSelectedChainId(targetChainId);
        }
      }
    }

    prevConfigChainRef.current = configChainKey;
  }, [
    chainId,
    isConnected,
    walletChains,
    switchChain,
    config.chain,
    configChainKey,
    hasInitialized,
    selectedChainId,
    setSelectedChainId,
  ]);

  return children;
};

// Widget Layout
const WidgetLayout = () => {
  const config = useWidgetConfig();

  // We can manage layout state here if needed
  const [padding, setPadding] = useState("");
  const [bestRoute, setBestRoute] = useState(null);
  const [tokenA, setTokenA] = useState(null);
  const [tokenB, setTokenB] = useState(null);

  const handleTokensChange = (tA, tB) => {
    setTokenA(tA);
    setTokenB(tB);
  };

  const parseHexToRgb = (value) => {
    if (!value) {
      return null;
    }
    const normalized = value.trim().replace("#", "");
    if (normalized.length < 6) {
      return null;
    }
    const hex = normalized.slice(0, 6);
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      return null;
    }
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  };

  const primaryRgb = parseHexToRgb(config.primaryColor) || "255, 153, 0";

  const widgetStyle = {
    "--primary-color": config.primaryColor,
    "--primary": config.primaryColor,
    "--primary-rgb": primaryRgb,
    "--bg-color": config.background,
    "--border-color": config.borderColor,
    // backgroundColor: "var(--bg-color)",
    color: "#ffffff",
  };

  return (
    <div
      style={widgetStyle}
      className="min-h-screen flex flex-col items-center justify-center p-4 relative bg-[var(--bg-color)]"
    >
      {/* <img
        src={BG}
        alt="Background"
        className="w-full h-full fixed top-0 left-0 -z-10"
      /> */}
      <div className="w-full">
        <Emp
          setPadding={setPadding}
          setBestRoute={setBestRoute}
          onTokensChange={handleTokensChange}
        />
      </div>
      <ToastContainer
        position="top-right"
        theme={config.theme}
        autoClose={5000}
      />
    </div>
  );
};

function App() {
  const isBuilderRoute = window.location.pathname.startsWith("/builder");

  if (isBuilderRoute) {
    return <WidgetBuilder />;
  }

  return (
    <WagmiProviderWrapper appType="swap">
      <ChainProvider>
        <Provider store={store}>
          <ChainSwitcher>
            <WidgetLayout />
          </ChainSwitcher>
        </Provider>
      </ChainProvider>
    </WagmiProviderWrapper>
  );
}

export default App;
