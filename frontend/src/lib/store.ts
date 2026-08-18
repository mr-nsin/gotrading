import {
 create } from 'zustand';
import {
 decode } from '@msgpack/msgpack';

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

interface Position {
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number;
  pnl: number;
  strategy_name: string;
}

interface LogEntry {
  id: string;
  level: string;
  message: string;
  timestamp: string;
}

interface AppState {
  // Global Data
  totalPnl: number;
  availableMargin: number;
  connectedBrokers: number;
  tickers: MarketData[];
  activePositions: Position[];
  recentLogs: LogEntry[];
  
  // WebSocket State
  isConnected: boolean;
  connect: (token?: string) => void;
  disconnect: () => void;
}

let ws: WebSocket | null = null;

export const useAppStore = create<AppState>((set, get) => ({
  totalPnl: 0,
  availableMargin: 0,
  connectedBrokers: 0,
  tickers: [],
  activePositions: [],
  recentLogs: [],
  isConnected: false,

  connect: (token?: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, '') || 'localhost:8000';
    const wsUrl = `${protocol}//${host}/stream/ws/dashboard${token ? `?token=${token}` : ''}`;
    
    ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer'; // Crucial for MsgPack

    ws.onopen = () => {
      set({ isConnected: true });
    };

    ws.onmessage = (event) => {
      try {
        if (event.data instanceof ArrayBuffer) {
          const data = decode(new Uint8Array(event.data)) as any;
          
          if (data.type === 'PORTFOLIO_UPDATE') {
            set({
              totalPnl: data.total_pnl,
              availableMargin: data.available_margin,
              connectedBrokers: data.connected_brokers,
              tickers: data.tickers || [],
              activePositions: data.active_positions || [],
              recentLogs: data.recent_logs || [],
            });
          }
          // Handling atomic order acks
          else if (data.type === 'ORDER_ACK') {
             // We can trigger a toast notification or invalidate a query here
          }
        }
      } catch (err) {
        console.error('Failed to decode MsgPack websocket data', err);
      }
    };

    ws.onclose = () => {
      set({ isConnected: false });
      ws = null;
      setTimeout(() => get().connect(token), 3000);
    };
    
    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      ws?.close();
    };
  },

  disconnect: () => {
    if (ws) {
      ws.close();
      ws = null;
    }
  }
}));
