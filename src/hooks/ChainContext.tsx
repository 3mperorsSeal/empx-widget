import React, { createContext, useContext, useState, useCallback } from 'react';

interface ChainContextType {
    selectedChainId: number;
    setSelectedChainId: (chainId: number) => void;
}

const DEFAULT_CHAIN_ID = 369; // PulseChain

const ChainContext = createContext<ChainContextType>({
    selectedChainId: DEFAULT_CHAIN_ID,
    setSelectedChainId: () => { },
});

export function ChainProvider({ children }: { children: React.ReactNode }) {
    const [localChainId, setLocalChainId] = useState<number>(DEFAULT_CHAIN_ID);

    const setSelectedChainId = useCallback((chainId: number) => {
        setLocalChainId(chainId);
    }, []);

    // Local state is the source of truth; wallet changes keep it in sync.
    const selectedChainId = localChainId;

    return (
        <ChainContext.Provider value={{ selectedChainId, setSelectedChainId }}>
            {children}
        </ChainContext.Provider>
    );
}

export function useSelectedChainId(): number {
    const { selectedChainId } = useContext(ChainContext);
    return selectedChainId;
}

export function useSetSelectedChainId(): (chainId: number) => void {
    const { setSelectedChainId } = useContext(ChainContext);
    return setSelectedChainId;
}
