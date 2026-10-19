"use client";

import { useEffect, useState } from "react";
import { Bot, Sparkles, X } from "lucide-react";

export default function AiAssistantLauncher() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="ai-assistant-launcher">
      {open && (
        <section
          id="gurukrupa-ai-assistant"
          className="ai-assistant-card"
          role="dialog"
          aria-labelledby="gurukrupa-ai-title"
        >
          <div className="ai-assistant-card-top">
            <span className="ai-assistant-mark" aria-hidden="true">
              <Sparkles size={19} />
            </span>
            <span className="ai-assistant-status">Coming soon</span>
            <button
              type="button"
              className="ai-assistant-close"
              onClick={() => setOpen(false)}
              aria-label="Close AI assistant preview"
            >
              <X size={17} />
            </button>
          </div>
          <h2 id="gurukrupa-ai-title">Gurukrupa Agency AI Assistant</h2>
          <p>
            A smarter way to find business answers is on the way.
          </p>
          <div className="ai-assistant-preview-note">
            <span className="ai-assistant-live-dot" />
            Your business assistant is in the works
          </div>
        </section>
      )}

      <button
        type="button"
        className={`ai-assistant-button${open ? " is-open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Close AI assistant preview" : "Open AI assistant preview"}
        aria-expanded={open}
        aria-controls={open ? "gurukrupa-ai-assistant" : undefined}
      >
        {open ? <Sparkles size={25} /> : <Bot size={25} />}
        <span className="ai-assistant-ai-tag">AI</span>
      </button>
    </div>
  );
}
