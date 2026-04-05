import { useEffect, useRef, useCallback } from "react";
import { tokenStore } from "../api/client";

const BASE_URL = import.meta.env.VITE_API_URL || "";

interface UseSSEOptions<T> {
  path: string;
  eventName: string;
  onMessage: (data: T) => void;
  enabled?: boolean;
}

/**
 * Subscribes to a Server-Sent Events stream, automatically:
 * - Attaches the Bearer token as a query param (SSE doesn't support custom headers)
 * - Reconnects on connection drop with exponential backoff
 * - Cleans up on unmount or when `enabled` becomes false
 */
export function useSSE<T>({ path, eventName, onMessage, enabled = true }: UseSSEOptions<T>) {
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay = useRef(1000);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const token = tokenStore.getAccessToken();
    if (!token) return;

    const url = `${BASE_URL}${path}?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener(eventName, (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as T;
        onMessageRef.current(data);
        retryDelay.current = 1000; // reset on success
      } catch {
        // ignore parse errors
      }
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      // Exponential backoff: 1s → 2s → 4s → max 30s
      const delay = Math.min(retryDelay.current, 30_000);
      retryDelay.current = delay * 2;
      reconnectTimer.current = setTimeout(connect, delay);
    };
  }, [path, eventName]);

  useEffect(() => {
    if (!enabled) return;

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [enabled, connect]);
}
