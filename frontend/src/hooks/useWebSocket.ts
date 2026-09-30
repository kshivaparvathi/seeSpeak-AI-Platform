import { useRef, useCallback, useState, useEffect } from 'react';

interface UseWebSocketOptions {
  url?: string;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onJsonMessage?: (data: any) => void;
  onBinaryMessage?: (data: ArrayBuffer) => void;
}

export function useWebSocket({
  url,
  onOpen,
  onClose,
  onError,
  onJsonMessage,
  onBinaryMessage,
}: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const getDefaultWsUrl = useCallback(() => {
    if (import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL;
    }
    const loc = window.location;
    // When running under vite proxy or localhost
    const host = loc.port === '5173' ? 'localhost:8000' : loc.host;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${host}/ws/session`;
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = url || getDefaultWsUrl();
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      if (onOpen) onOpen();
    };

    ws.onclose = (e) => {
      setIsConnected(false);
      if (onClose) onClose(e);
    };

    ws.onerror = (e) => {
      if (onError) onError(e);
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const json = JSON.parse(event.data);
          if (onJsonMessage) onJsonMessage(json);
        } catch (err) {
          console.error('Failed to parse WS JSON message:', err);
        }
      } else if (event.data instanceof ArrayBuffer) {
        if (onBinaryMessage) onBinaryMessage(event.data);
      }
    };
  }, [getDefaultWsUrl, onBinaryMessage, onClose, onError, onJsonMessage, onOpen, url]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const sendJson = useCallback((data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    }
  }, []);

  const sendBinary = useCallback((data: ArrayBuffer | ArrayBufferView) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(data);
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connect,
    disconnect,
    sendJson,
    sendBinary,
  };
}
