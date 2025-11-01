"use client";

import { useState } from "react";

export default function NLPInput({ onCommand }: { onCommand: (text: string) => void }) {
  const [text, setText] = useState("");

  function submit() {
    const t = text.trim();
    if (!t) return;
    onCommand(t);
    setText("");
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="card section">
      <div className="inputRow">
        <input
          className="input"
          placeholder="e.g., Add coffee for $4.50 yesterday"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
        />
        <button className="button" onClick={submit}>Add</button>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <span className="badge">Try</span>
        <span className="muted">"spent 20 on lunch", "show groceries this month", "set budget 300 for groceries"</span>
      </div>
    </div>
  );
}
