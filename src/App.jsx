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
import Wallet from "./pages/swap/Wallet";

// ChainSwitcher logic
const ChainSwitcher = ({ children }) => {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (isConnected && chainId) {
      const swapChainIds = [pulsechain.id, 10001, sonic.id]; // pulsechain, ethw, sonic
      if (!swapChainIds.includes(chainId)) {
        switchChain({ chainId: pulsechain.id });
      }
    }
  }, [chainId, isConnected, switchChain]);

  return children;
};

// Widget Layout
const WidgetLayout = () => {
  // We can manage layout state here if needed
  const [padding, setPadding] = useState("");
  const [bestRoute, setBestRoute] = useState(null);
  const [tokenA, setTokenA] = useState(null);
  const [tokenB, setTokenB] = useState(null);

  const handleTokensChange = (tA, tB) => {
    setTokenA(tA);
    setTokenB(tB);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[480px]">
        <div className="mb-4 flex justify-end">
          <Wallet />
        </div>
        <Emp
          setPadding={setPadding}
          setBestRoute={setBestRoute}
          onTokensChange={handleTokensChange}
        />
      </div>
      <ToastContainer position="top-right" theme="dark" autoClose={5000} />
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
