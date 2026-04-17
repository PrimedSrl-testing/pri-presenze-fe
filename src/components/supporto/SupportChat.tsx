"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageCircleQuestion,
  X,
  Send,
  Loader2,
  Bot,
  User,
  AlertTriangle,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opening
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/supporto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore nella risposta");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err: any) {
      setError(err.message || "Errore di comunicazione");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* ── Floating Button ────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          bottom: 24,
          left: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #3b5bdb 0%, #5c7cfa 100%)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(59,91,219,.4), 0 2px 8px rgba(0,0,0,.15)",
          zIndex: 9999,
          transition: "transform .2s, box-shadow .2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.08)";
          e.currentTarget.style.boxShadow =
            "0 6px 28px rgba(59,91,219,.5), 0 3px 12px rgba(0,0,0,.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow =
            "0 4px 20px rgba(59,91,219,.4), 0 2px 8px rgba(0,0,0,.15)";
        }}
        title={open ? "Chiudi supporto" : "Richiesta di Supporto"}
      >
        {open ? <X size={24} /> : <MessageCircleQuestion size={24} />}
      </button>

      {/* ── Floating Label (when closed) ───────────────────────────────── */}
      {!open && (
        <div
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            bottom: 32,
            left: 88,
            background: "#3b5bdb",
            color: "#fff",
            padding: "8px 14px",
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 12px rgba(59,91,219,.3)",
            zIndex: 9999,
            whiteSpace: "nowrap",
            animation: "supportPulse 3s ease-in-out infinite",
          }}
        >
          Hai bisogno di aiuto?
        </div>
      )}

      {/* ── Chat Panel ─────────────────────────────────────────────────── */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 92,
            left: 24,
            width: 420,
            maxWidth: "calc(100vw - 48px)",
            height: 520,
            maxHeight: "calc(100vh - 120px)",
            background: "var(--bg, #fff)",
            borderRadius: 16,
            boxShadow:
              "0 8px 40px rgba(0,0,0,.15), 0 2px 8px rgba(0,0,0,.08)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9998,
            overflow: "hidden",
            border: "1px solid var(--bdr, #e5e5e5)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 18px",
              background: "linear-gradient(135deg, #3b5bdb 0%, #5c7cfa 100%)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}
          >
            <Bot size={20} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>
                Supporto PRIMED HR
              </div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>
                Chiedi come funziona il gestionale
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "rgba(255,255,255,.15)",
                border: "none",
                borderRadius: "50%",
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#fff",
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Welcome message */}
            {messages.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px 16px",
                  color: "var(--tm, #888)",
                }}
              >
                <Bot
                  size={36}
                  style={{
                    margin: "0 auto 12px",
                    color: "var(--ac, #3b5bdb)",
                    opacity: 0.5,
                  }}
                />
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--t, #333)",
                    marginBottom: 6,
                  }}
                >
                  Come posso aiutarti?
                </p>
                <p style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                  Puoi chiedermi come funziona qualsiasi parte del gestionale,
                  informazioni su CCNL Metalmeccanici o domande INPS.
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    marginTop: 16,
                  }}
                >
                  {[
                    "Come configuro la pausa pranzo?",
                    "Come funziona la pipeline eccesso ore?",
                    "Quante ore di straordinario posso pagare?",
                    "Come creo un template orario?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setInput(q);
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }}
                      style={{
                        background: "var(--acl, #eef2ff)",
                        border: "1px solid rgba(59,91,219,.15)",
                        borderRadius: 8,
                        padding: "8px 12px",
                        fontSize: 12,
                        color: "var(--ac, #3b5bdb)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background .15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(59,91,219,.12)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          "var(--acl, #eef2ff)")
                      }
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background:
                      msg.role === "user"
                        ? "var(--ac, #3b5bdb)"
                        : "var(--okl, #e6f9e6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {msg.role === "user" ? (
                    <User size={14} style={{ color: "#fff" }} />
                  ) : (
                    <Bot
                      size={14}
                      style={{ color: "var(--ok, #2b8a3e)" }}
                    />
                  )}
                </div>

                {/* Bubble */}
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "10px 14px",
                    borderRadius:
                      msg.role === "user"
                        ? "14px 14px 4px 14px"
                        : "14px 14px 14px 4px",
                    background:
                      msg.role === "user"
                        ? "var(--ac, #3b5bdb)"
                        : "var(--bgs, #f5f5f5)",
                    color:
                      msg.role === "user"
                        ? "#fff"
                        : "var(--t, #333)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div style={{ display: "flex", gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--okl, #e6f9e6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Bot
                    size={14}
                    style={{ color: "var(--ok, #2b8a3e)" }}
                  />
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "14px 14px 14px 4px",
                    background: "var(--bgs, #f5f5f5)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Loader2
                    size={14}
                    style={{
                      color: "var(--ac, #3b5bdb)",
                      animation: "sp 1s linear infinite",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12.5,
                      color: "var(--tm, #888)",
                    }}
                  >
                    Sto cercando...
                  </span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  background: "var(--erl, #ffeaea)",
                  borderRadius: 10,
                  fontSize: 12.5,
                  color: "var(--er, #e03131)",
                }}
              >
                <AlertTriangle size={14} />
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <div
            style={{
              padding: "12px 14px",
              borderTop: "1px solid var(--bdr, #e5e5e5)",
              display: "flex",
              gap: 8,
              flexShrink: 0,
              background: "var(--bg, #fff)",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi la tua domanda..."
              rows={1}
              style={{
                flex: 1,
                resize: "none",
                border: "1.5px solid var(--bdr, #e5e5e5)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
                fontFamily: "inherit",
                background: "var(--bgs, #f9f9f9)",
                color: "var(--t, #333)",
                outline: "none",
                transition: "border-color .15s",
                maxHeight: 80,
                overflowY: "auto",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--ac, #3b5bdb)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--bdr, #e5e5e5)")
              }
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                border: "none",
                background:
                  !input.trim() || loading
                    ? "var(--bdr, #e5e5e5)"
                    : "var(--ac, #3b5bdb)",
                color: "#fff",
                cursor:
                  !input.trim() || loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background .15s",
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes supportPulse {
          0%, 100% { opacity: 1; transform: translateY(0); }
          50% { opacity: 0.7; transform: translateY(-2px); }
        }
      `}</style>
    </>
  );
}
