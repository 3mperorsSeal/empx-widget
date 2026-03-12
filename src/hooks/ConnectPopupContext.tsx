import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ConnectPopupContextType {
  showConnectPopup: boolean;
  setShowConnectPopup: (show: boolean) => void;
}

const ConnectPopupContext = createContext<ConnectPopupContextType | undefined>(undefined);

export function ConnectPopupProvider({ children }: { children: ReactNode }) {
  const [showConnectPopup, setShowConnectPopup] = useState(false);

  return (
    <ConnectPopupContext.Provider value={{ showConnectPopup, setShowConnectPopup }}>
      {children}
    </ConnectPopupContext.Provider>
  );
}

export function useConnectPopup() {
  const context = useContext(ConnectPopupContext);
  if (context === undefined) {
    throw new Error('useConnectPopup must be used within a ConnectPopupProvider');
  }
  return context;
}
