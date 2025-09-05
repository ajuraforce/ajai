import { queryClient } from "@/lib/queryClient";

type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

export function connectWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  
  function connect() {
    try {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("WebSocket connected");
        reconnectAttempts = 0;
      };
      
      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };
      
      ws.onclose = () => {
        console.log("WebSocket disconnected");
        
        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          setTimeout(() => {
            console.log(`Attempting to reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`);
            connect();
          }, 2000 * reconnectAttempts);
        }
      };
      
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
      
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
    }
  }
  
  function handleWebSocketMessage(message: WebSocketMessage) {
    console.log("Received WebSocket message:", message);
    
    switch (message.type) {
      case "NEW_SIGNAL":
        queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
        break;
        
      case "SIGNAL_EXECUTED":
        queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
        queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
        break;
        
      case "POSITION_CLOSED":
        queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
        break;
        
      case "NEW_NEWS":
        queryClient.invalidateQueries({ queryKey: ["/api/news"] });
        break;
        
      case "MARKET_DATA_UPDATE":
        queryClient.invalidateQueries({ queryKey: ["/api/market-data"] });
        queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
        break;
        
      case "RISK_UPDATE":
        queryClient.invalidateQueries({ queryKey: ["/api/risk-metrics"] });
        break;
        
      default:
        console.log("Unknown message type:", message.type);
    }
  }
  
  // Initial connection
  connect();
  
  // Return cleanup function
  return () => {
    if (ws) {
      ws.close();
    }
  };
}
