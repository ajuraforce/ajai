import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAll }}>
      {children}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  );
};

interface NotificationContainerProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={() => onRemove(notification.id)}
        />
      ))}
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onRemove: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(onRemove, 150); // Wait for exit animation
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'info':
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div
      className={cn(
        'flex items-start space-x-3 p-4 rounded-lg border shadow-lg transition-all duration-200 transform',
        getBackgroundColor(),
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
      data-testid={`notification-${notification.type}`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {notification.message}
        </p>
        
        {notification.action && (
          <div className="mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={notification.action.onClick}
              className="text-xs"
              data-testid="notification-action"
            >
              {notification.action.label}
            </Button>
          </div>
        )}
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRemove}
        className="flex-shrink-0 h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
        data-testid="notification-close"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

// Utility functions for common notification types
export const useNotificationHelpers = () => {
  const { addNotification } = useNotifications();

  return {
    success: (message: string, action?: { label: string; onClick: () => void }) =>
      addNotification({ message, type: 'success', action }),
    
    error: (message: string, action?: { label: string; onClick: () => void }) =>
      addNotification({ message, type: 'error', action }),
    
    warning: (message: string, action?: { label: string; onClick: () => void }) =>
      addNotification({ message, type: 'warning', action }),
    
    info: (message: string, action?: { label: string; onClick: () => void }) =>
      addNotification({ message, type: 'info', action }),
    
    tradeExecuted: (symbol: string, action: string, price: string) =>
      addNotification({
        message: `${action} ${symbol} executed at $${price}`,
        type: 'success',
        action: {
          label: 'View Details',
          onClick: () => console.log('Navigate to trade history')
        }
      }),
    
    signalGenerated: (symbol: string, action: string, confidence: string) =>
      addNotification({
        message: `New ${action} signal for ${symbol} (${confidence}% confidence)`,
        type: 'info',
        action: {
          label: 'View Signal',
          onClick: () => console.log('Navigate to signals')
        }
      }),
    
    riskAlert: (message: string) =>
      addNotification({
        message,
        type: 'warning',
        duration: 8000,
        action: {
          label: 'Review Risk',
          onClick: () => console.log('Navigate to risk metrics')
        }
      }),
    
    newsAlert: (headline: string) =>
      addNotification({
        message: `Breaking: ${headline}`,
        type: 'info',
        duration: 6000,
        action: {
          label: 'Read More',
          onClick: () => console.log('Navigate to news')
        }
      })
  };
};