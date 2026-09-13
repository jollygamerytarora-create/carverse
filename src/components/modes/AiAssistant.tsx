'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { currentVehicle } from '@/lib/store';
import { askCarverseAi } from '@/lib/aiAssistant';

interface Msg {
  from: 'user' | 'bot';
  text: string;
}

export default function AiAssistant() {
  const store = useStore();
  const vehicle = currentVehicle();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (msgs.length === 0) {
      setMsgs([{ from: 'bot', text: `Hi! I can see you're looking at the **${vehicle.model}**. Ask me anything about it — or about any car in the database.` }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = { from: 'user', text };
    const reply = askCarverseAi(text, vehicle);
    setMsgs((m) => [...m, userMsg, { from: 'bot', text: reply.text }]);
    setInput('');
  };

  const suggestions = ['Is this practical for daily driving?', 'Which is faster?', `Compare this with the Model S`, 'Which has more boot space?'];

  return (
    <div className="ai-wrap" role="dialog" aria-label="CARVERSE AI assistant">
      <div className="ai-head">
        <span className="dot" />
        <b>Carverse AI</b>
        <button className="x" onClick={() => store.setAiOpen(false)} aria-label="Close assistant">✕</button>
      </div>
      <div className="ai-msgs" ref={scrollRef}>
        {msgs.map((m, i) => (
          <div key={i} className={`ai-msg ${m.from}`}>
            {m.text.split('**').map((part, j) => (j % 2 === 1 ? <b key={j}>{part}</b> : part))}
          </div>
        ))}
      </div>
      <div className="ai-sugg">
        {suggestions.slice(0, 2).map((s) => (
          <button key={s} onClick={() => send(s)}>{s}</button>
        ))}
      </div>
      <form
        className="ai-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Ask about the ${vehicle.model}…`} aria-label="Ask the assistant" />
        <button type="submit" className="iconbtn" style={{ width: 36, height: 36 }} aria-label="Send">➤</button>
      </form>
    </div>
  );
}
