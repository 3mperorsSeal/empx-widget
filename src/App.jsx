import { useState, useEffect } from 'react'
import './styles/global.scss';
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { pulsechain, sonic } from "wagmi/chains";
import { Provider } from "react-redux";
import store from "./redux/store/store";
import { ToastContainer } from "react-toastify";
import WagmiProviderWrapper from "./Wagmi/WagmiProvider";
import Emp from "./pages/swap/Emp";
import "react-toastify/dist/ReactToastify.css";

import { useWidgetConfig } from "./widget/useWidgetConfig";

// ChainSwitcher logic
const ChainSwitcher = ({ children }) => {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { isConnected } = useAccount();
  const config = useWidgetConfig();

  useEffect(() => {
    if (isConnected && chainId) {
      // Define supported chains mapping
      const chainMap = {
        'pulsechain': pulsechain.id,
        // 'sonic': sonic.id,
        // 'ethw': 10001
      };

      const targetChainId = chainMap[config.chain?.toLowerCase()] || pulsechain.id;
      const supportedChainIds = Object.values(chainMap);

      if (chainId !== targetChainId && supportedChainIds.includes(targetChainId)) {
        switchChain({ chainId: targetChainId });
      } else if (!supportedChainIds.includes(chainId)) {
        // Fallback if connected to unsupported chain
        switchChain({ chainId: pulsechain.id });
      }
    }
  }, [chainId, isConnected, switchChain, config.chain]);

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

  const widgetStyle = {
    '--primary-color': config.primaryColor,
    '--bg-color': config.background,
    backgroundColor: 'var(--bg-color)',
    color: config.theme === 'light' ? '#000000' : '#ffffff',
  };

  return (
    <div style={widgetStyle} className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[480px]">
        <Emp
          setPadding={setPadding}
          setBestRoute={setBestRoute}
          onTokensChange={handleTokensChange}
        />
      </div>
      <ToastContainer position="top-right" theme={config.theme} autoClose={5000} />
    </div>
  );
};

function App() {
  return (
    <WagmiProviderWrapper appType="swap">
      <Provider store={store}>
        <ChainSwitcher>
          <WidgetLayout />
        </ChainSwitcher>
      </Provider>
    </WagmiProviderWrapper>
  )
}

export default App
