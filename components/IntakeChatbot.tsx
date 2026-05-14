"use client";

import { useState, useEffect, useRef } from "react";

const QUESTIONS = [
  {
    id: "ownership",
    bot: "Do you currently own this property?",
    options: ["Yes, I own it", "I'm a co-owner", "No"]
  },
  {
    id: "timeline",
    bot: "What's your ideal timeline to sell?",
    options: ["As soon as possible", "Within 30 days", "30–90 days", "Just exploring options"]
  },
  {
    id: "motivation",
    bot: "What's the main reason for selling?",
    options: ["Relocation", "Financial need", "Downsizing", "Estate or inheritance", "Other"]
  },
  {
    id: "mortgage",
    bot: "Is there an active mortgage on the property?",
    options: ["Yes", "No — owned free and clear", "Not sure"]
  },
  {
    id: "liens",
    bot: "Are there any liens or judgments on the property?",
    options: ["No", "Yes", "I'm not sure"]
  },
  {
    id: "occupancy",
    bot: "Is the property currently occupied?",
    options: ["I live there", "Tenants are living there", "It's vacant"]
  },
  {
    id: "offer_type",
    bot: "Are you open to different offer structures?",
    options: ["Cash offer only", "Open to all options", "Prefer a traditional MLS listing"]
  }
];

const DONE_MESSAGE =
  "Thanks! Your answers have been saved and will be included with your submission. Our team reviews these before reaching out. 🏡";

interface Message {
  from: "bot" | "user";
  text: string;
}

export default function IntakeChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "bot",
      text: "Hi! I have 7 quick questions that help our team prepare a better review for your property. Want to start?"
    }
  ]);
  const [qIndex, setQIndex] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(false);
  const [unread, setUnread] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Clear unread when opened
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  // Load saved answers on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ch_prequal_answers");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Object.keys(parsed).length === QUESTIONS.length) {
          setAnswers(parsed);
          setDone(true);
          setQIndex(QUESTIONS.length);
          setUnread(0);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const pushBotMessage = (text: string, delay = 800) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, { from: "bot", text }]);
      if (!open) setUnread(prev => prev + 1);
    }, delay);
  };

  const handleChoice = (choice: string) => {
    // Intro screen
    if (qIndex === -1) {
      if (choice === "Maybe later") {
        setOpen(false);
        return;
      }
      setMessages(prev => [...prev, { from: "user", text: "Yes, let's start!" }]);
      setQIndex(0);
      pushBotMessage(QUESTIONS[0].bot);
      return;
    }

    // Active question
    const question = QUESTIONS[qIndex];
    const newAnswers = { ...answers, [question.id]: choice };
    setAnswers(newAnswers);
    setMessages(prev => [...prev, { from: "user", text: choice }]);

    const nextIndex = qIndex + 1;

    if (nextIndex >= QUESTIONS.length) {
      // All done
      localStorage.setItem("ch_prequal_answers", JSON.stringify(newAnswers));
      setDone(true);
      setQIndex(nextIndex);
      pushBotMessage(DONE_MESSAGE);
    } else {
      setQIndex(nextIndex);
      pushBotMessage(QUESTIONS[nextIndex].bot);
    }
  };

  const currentChoices = () => {
    if (done) return [];
    if (qIndex === -1) return ["Yes, let's start!", "Maybe later"];
    if (qIndex < QUESTIONS.length) return QUESTIONS[qIndex].options;
    return [];
  };

  const choices = currentChoices();

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        className="chatbot-trigger"
        aria-label={open ? "Close chat" : "Open pre-qualification chat"}
        onClick={() => setOpen(prev => !prev)}
      >
        {open ? (
          <span className="chatbot-trigger-icon">×</span>
        ) : (
          <span className="chatbot-trigger-icon">💬</span>
        )}
        {!open && unread > 0 && (
          <span className="chatbot-badge">{unread}</span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="chatbot-panel" role="dialog" aria-label="Pre-qualification assistant">
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
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          {/* Progress bar */}
          {!done && qIndex >= 0 && (
            <div className="chatbot-progress-bar">
              <div
                className="chatbot-progress-fill"
                style={{ width: `${Math.round((qIndex / QUESTIONS.length) * 100)}%` }}
              />
            </div>
          )}
          {done && <div className="chatbot-progress-bar"><div className="chatbot-progress-fill" style={{ width: "100%" }} /></div>}

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chatbot-message-row${msg.from === "user" ? " user-row" : ""}`}
              >
                <div className={msg.from === "bot" ? "bot-bubble" : "user-bubble"}>
                  {msg.text}
                </div>
              </div>
            ))}

            {typing && (
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

          {/* Question counter */}
          {!done && qIndex >= 0 && (
            <div className="chatbot-counter">
              Question {qIndex + 1} of {QUESTIONS.length}
            </div>
          )}

          {/* Choice buttons */}
          {choices.length > 0 && !typing && (
            <div className="chatbot-choices">
              {choices.map(choice => (
                <button
                  key={choice}
                  type="button"
                  className={`chat-choice-btn${choice === "Maybe later" ? " chat-choice-secondary" : ""}`}
                  onClick={() => handleChoice(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
          )}

          {done && (
            <div className="chatbot-done-footer">
              <span className="chatbot-done-check">✓</span>
              All questions answered — saved to your submission.
            </div>
          )}
        </div>
      )}
    </>
  );
}
