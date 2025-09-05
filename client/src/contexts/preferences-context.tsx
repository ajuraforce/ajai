import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UserPreferences {
  watchlist: string[];
  alerts: {
    trades: boolean;
    signals: boolean;
    news: boolean;
    risk: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  layout: {
    sidebarCollapsed: boolean;
    chartType: 'line' | 'candlestick';
    refreshInterval: number; // in seconds
  };
  trading: {
    defaultQuantity: number;
    confirmTrades: boolean;
    riskLevel: 'conservative' | 'moderate' | 'aggressive';
  };
  notifications: {
    sound: boolean;
    desktop: boolean;
    email: boolean;
  };
}

const defaultPreferences: UserPreferences = {
  watchlist: ['BTC/USD', 'ETH/USD', 'AAPL', 'GOOGL', 'TSLA'],
  alerts: {
    trades: true,
    signals: true,
    news: true,
    risk: true,
  },
  theme: 'system',
  layout: {
    sidebarCollapsed: false,
    chartType: 'line',
    refreshInterval: 10,
  },
  trading: {
    defaultQuantity: 1,
    confirmTrades: true,
    riskLevel: 'moderate',
  },
  notifications: {
    sound: true,
    desktop: true,
    email: false,
  },
};

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

interface PreferencesProviderProps {
  children: ReactNode;
}

export const PreferencesProvider: React.FC<PreferencesProviderProps> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem('userPreferences');
      return saved ? { ...defaultPreferences, ...JSON.parse(saved) } : defaultPreferences;
    } catch (error) {
      console.warn('Failed to load preferences from localStorage:', error);
      return defaultPreferences;
    }
  });

  // Save to localStorage whenever preferences change
  useEffect(() => {
    try {
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save preferences to localStorage:', error);
    }
  }, [preferences]);

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev };
      
      // Deep merge for nested objects
      Object.keys(updates).forEach(key => {
        const value = updates[key as keyof UserPreferences];
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          updated[key as keyof UserPreferences] = { 
            ...prev[key as keyof UserPreferences] as any, 
            ...value 
          };
        } else {
          updated[key as keyof UserPreferences] = value as any;
        }
      });
      
      return updated;
    });
  };

  const addToWatchlist = (symbol: string) => {
    setPreferences(prev => ({
      ...prev,
      watchlist: [...new Set([...prev.watchlist, symbol.toUpperCase()])]
    }));
  };

  const removeFromWatchlist = (symbol: string) => {
    setPreferences(prev => ({
      ...prev,
      watchlist: prev.watchlist.filter(s => s !== symbol.toUpperCase())
    }));
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
    localStorage.removeItem('userPreferences');
  };

  return (
    <PreferencesContext.Provider value={{
      preferences,
      updatePreferences,
      addToWatchlist,
      removeFromWatchlist,
      resetPreferences,
    }}>
      {children}
    </PreferencesContext.Provider>
  );
};