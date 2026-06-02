"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  currentStep?: number;
}

export default function IntakeChatbot({ currentStep = 0 }: Props) {
  const [open,      setOpen]      = useState(false);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [isTyping,  setIsTyping]  = useState(false);
  const [unread,    setUnread]    = useState(0);
  const [hasInited, setHasInited] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-generate opening message the first time the panel is opened
  useEffect(() => {
    if (!open || hasInited) return;
    setHasInited(true);
    setUnread(0);
    setIsTyping(true);

    fetch("/api/chatbot", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages:    [{ role: "user", content: "__INIT__" }],
        currentStep,
        isInit:      true,
      }),
    })
      .then(r => r.json().catch(() => ({})))
      .then(json => {
        const reply: string = json?.data?.reply ?? "Hi! I'm your Complete Home assistant — ask me anything about the form.";
        setMessages([{ role: "assistant", content: reply }]);
        if (!open) setUnread(1);
      })
      .catch(() => {
        setMessages([{ role: "assistant", content: "Hi! I'm your Complete Home assistant — ask me anything about the form." }]);
      })
      .finally(() => setIsTyping(false));
  }, [open, hasInited, currentStep]);

  // Clear unread + focus input when opened
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chatbot", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages:    nextMessages.slice(-12),
          currentStep,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble right now. Please try again in a moment." }]);
        return;
      }

      const { reply } = json.data as { reply: string };
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      if (!open) setUnread(prev => prev + 1);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection issue — please try again." }]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, currentStep, isTyping, open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* ── Floating trigger ── */}
      <button
        type="button"
        className="chatbot-trigger"
        aria-label={open ? "Close assistant" : "Open assistant"}
        onClick={() => setOpen(prev => !prev)}
      >
        {open
          ? <span className="chatbot-trigger-icon">×</span>
          : <span className="chatbot-trigger-icon">💬</span>
        }
        {!open && unread > 0 && (
          <span className="chatbot-badge">{unread}</span>
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div className="chatbot-panel" role="dialog" aria-label="Complete Home Assistant">

          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-avatar">🏠</div>
            <div className="chatbot-header-info">
              <span className="chatbot-header-name">Complete Home Assistant</span>
              <span className="chatbot-header-status">
                <span className="chatbot-online-dot" />
                Online
              </span>
            </div>
            <button
              type="button"
              className="chatbot-close-btn"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >×</button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chatbot-message-row${msg.role === "user" ? " user-row" : ""}`}>
                <div className={msg.role === "assistant" ? "bot-bubble" : "user-bubble"}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chatbot-message-row">
                <div className="bot-bubble typing-indicator">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Text input */}
          <div className="chatbot-input-row">
            <input
              ref={inputRef}
              type="text"
              className="chatbot-input"
              placeholder="Ask anything about the form…"
              value={input}
              maxLength={500}
              disabled={isTyping}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="chatbot-send-btn"
              disabled={isTyping || !input.trim()}
              onClick={() => sendMessage(input)}
              aria-label="Send"
            >↑</button>
          </div>

        </div>
      )}
    </>
  );
}
