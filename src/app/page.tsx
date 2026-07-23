"use client";
import { useState, useRef, useEffect, type FormEvent } from "react";
import { useChat } from "./hooks/useChat";

export default function ChatApp() {
  const { userId, status, messages,  findMatch, sendMessage } = useChat();
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom whenever a new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText("");
  };

  // Check if the current session just ended so we can show the disconnect panel
  const lastMessage = messages[messages.length - 1];
  const isDisconnected = lastMessage?.action === "partner_left";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-sans text-slate-900">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl overflow-hidden flex flex-col h-[600px] border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 text-center z-10 shadow-md">
          <h1 className="text-xl font-bold tracking-wide">Anonymous Chat</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            {userId ? `ID: ${userId.slice(0, 8)}` : "Connecting..."}
          </p>
        </div>

        {/* Dynamic Body */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-gray-50 relative">
          {/* Idle State */}
          {status === "idle" && !isDisconnected && (
            <div className="m-auto text-center">
              <button
                onClick={findMatch}
                disabled={!userId}
                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              >
                Find a Stranger
              </button>
            </div>
          )}

          {/* Searching State */}
          {status === "searching" && (
            <div className="m-auto text-center flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-600 font-medium animate-pulse">
                Searching the globe...
              </p>
            </div>
          )}

          {/* Matched / Chat State */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={[
                "max-w-[80%] p-3 rounded-2xl text-sm shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2",
                msg.system
                  ? "bg-slate-200 text-slate-600 mx-auto text-center text-xs font-medium px-4 py-1 rounded-full"
                  : msg.from === userId
                    ? "bg-blue-600 text-white self-end rounded-br-none"
                    : "bg-white border border-slate-200 text-slate-800 self-start rounded-bl-none",
              ].join(" ")}
            >
              {msg.text}
            </div>
          ))}

          {/* Invisible Anchor for Auto-Scroll */}
          <div ref={messagesEndRef} className="h-1" />
        </div>

        {/* Active Input Form */}
        {status === "matched" && !isDisconnected && (
          <form
            onSubmit={handleSend}
            className="p-3 bg-white border-t border-slate-200 flex gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              autoComplete="off"
              className="flex-1 p-3 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-6 py-2 bg-blue-600 disabled:bg-slate-300 text-white rounded-full font-medium hover:bg-blue-700 transition-colors"
            >
              Send
            </button>
          </form>
        )}

        {/* Graceful Disconnect Panel */}
        {isDisconnected && (
          <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-slate-600 font-medium">
              Stranger has disconnected.
            </p>
            <button
              onClick={findMatch}
              className="px-6 py-2 border-2 border-blue-600 text-blue-600 font-medium rounded-full hover:bg-blue-50 transition-colors"
            >
              Find New Stranger
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
