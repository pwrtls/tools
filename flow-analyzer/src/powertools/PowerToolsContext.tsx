import React, { createContext, useContext, useState, useEffect } from 'react';

interface PowerToolsContextType {
  isInitialized: boolean;
  accessToken: string | null;
  environmentUrl: string | null;
  setEnvironmentUrl: (url: string) => void;
  setAccessToken: (token: string) => void;
}

const PowerToolsContext = createContext<PowerToolsContextType>({
  isInitialized: false,
  accessToken: null,
  environmentUrl: null,
  setEnvironmentUrl: () => {},
  setAccessToken: () => {}
});

export const usePowerToolsContext = () => useContext(PowerToolsContext);

export const PowerToolsContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [environmentUrl, setEnvironmentUrl] = useState<string | null>(null);

  useEffect(() => {
    // Check if we have stored credentials
    const storedToken = localStorage.getItem('powerToolsAccessToken');
    const storedUrl = localStorage.getItem('powerToolsEnvironmentUrl');

    if (storedToken && storedUrl) {
      setAccessToken(storedToken);
      setEnvironmentUrl(storedUrl);
      setIsInitialized(true);
    }
  }, []);

  const handleSetAccessToken = (token: string) => {
    setAccessToken(token);
    localStorage.setItem('powerToolsAccessToken', token);
  };

  const handleSetEnvironmentUrl = (url: string) => {
    setEnvironmentUrl(url);
    localStorage.setItem('powerToolsEnvironmentUrl', url);
  };

  return (
    <PowerToolsContext.Provider
      value={{
        isInitialized,
        accessToken,
        environmentUrl,
        setAccessToken: handleSetAccessToken,
        setEnvironmentUrl: handleSetEnvironmentUrl
      }}
    >
      {children}
    </PowerToolsContext.Provider>
  );
}; 