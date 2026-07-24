"use client";
import { useState, useEffect, useRef, useCallback } from "react";

export type ConnectionStatus = "idle" | "searching" | "matched";

export type Message = {
    id: string;
    system?: boolean;
    action?: string;
    from?: string;
    text: string;
};

const WS_URL = process.env.NEXT_PUBLIC_WS_URL??"ws://localhost:8080"; // Default to localhost if not set
const RECONNECT_DELAY_MS = 2000;

function generateSafeId(): string {
    if (typeof window !== "undefined" && window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }
    return "user_" + Math.random().toString(36).slice(2, 15) + Date.now().toString(36);
}

export function useChat() {
    const [userId, setUserId] = useState<string>("");
    const [status, setStatus] = useState<ConnectionStatus>("idle");
    const [messages, setMessages] = useState<Message[]>([]);

    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<number | null>(null);
    const isMounted = useRef(true);

    // 1. Safe ID generation to prevent cascading renders
    useEffect(() => {
        const timer = setTimeout(() => {
            setUserId(generateSafeId());
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    // 2. The Socket Lifecycle Manager
    useEffect(() => {
        isMounted.current = true;

        // By using a standard function declaration INSIDE the effect, 
        // JavaScript hoists it, completely bypassing the "accessed before declared" error!
        function connectSocket() {
            if (ws.current?.readyState === WebSocket.CONNECTING) return;

            const socket = new WebSocket(WS_URL);
            ws.current = socket;

            socket.onopen = () => {
                if (reconnectTimeout.current) {
                    window.clearTimeout(reconnectTimeout.current);
                    reconnectTimeout.current = null;
                }
            };

            socket.onerror = (event) => {
                console.error("WebSocket error:", event);
            };

            socket.onclose = () => {
                if (!isMounted.current) return;
                setStatus("idle");
                // Now it perfectly references itself without any ESLint complaints
                reconnectTimeout.current = window.setTimeout(connectSocket, RECONNECT_DELAY_MS);
            };

            socket.onmessage = (event: MessageEvent<string>) => {
                let rawData: Record<string, unknown>;

                try {
                    rawData = JSON.parse(event.data) as Record<string, unknown>;
                    // 🔍 ADD THIS LOG: This will show you exactly what your server is sending in the browser console!
                    console.log("📥 Incoming WS Message:", rawData);
                } catch {
                    console.error("Received malformed WebSocket message:", event.data);
                    return;
                }

                const id = typeof rawData.id === "string" && rawData.id
                    ? rawData.id
                    : crypto.randomUUID();

                const data: Message = {
                    ...(rawData as Omit<Message, "id">),
                    id,
                };

                if (data.system) {
                    // 🛡️ DEFENSIVE PROGRAMMING: 
                    // Trust the 'action' key first. If it's missing (because the backend is old), fallback to text parsing.
                    let resolvedAction = data.action;

                    if (!resolvedAction && data.text) {
                        if (data.text.includes("Searching")) resolvedAction = "searching";
                        else if (data.text.includes("Match found")) resolvedAction = "matched";
                        else if (data.text.includes("disconnected")) resolvedAction = "partner_left";
                    }

                    switch (resolvedAction) {
                        case "searching":
                            setStatus("searching");
                            break;
                        case "matched":
                            setStatus("matched");
                            break;
                        case "partner_left":
                            setStatus("idle");
                            break;
                    }
                }

                setMessages((prev) => [...prev, data]);
            };
        }

        // Initialize the connection
        connectSocket();

        // Cleanup on component unmount
        return () => {
            isMounted.current = false;
            if (ws.current) {
                ws.current.onclose = null;
                ws.current.close();
                ws.current = null;
            }
            if (reconnectTimeout.current) {
                window.clearTimeout(reconnectTimeout.current);
                reconnectTimeout.current = null;
            }
        };
    }, []); // Empty dependency array keeps things perfectly stable

    const findMatch = useCallback(() => {
        if (!userId) return;
        if (ws.current?.readyState !== WebSocket.OPEN) {
            console.warn("Cannot find match: WebSocket is not open.");
            return;
        }

        setMessages([]);
        setStatus("searching");

        ws.current.send(JSON.stringify({ action: "find_match", userId }));
    }, [userId]);

    const sendMessage = useCallback((text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        if (ws.current?.readyState !== WebSocket.OPEN) {
            console.warn("Cannot send message: WebSocket is not open.");
            return;
        }

        ws.current.send(JSON.stringify({ action: "send", userId, text: trimmed }));
    }, [userId]);

    return { userId, status, messages, findMatch, sendMessage } as const;
}