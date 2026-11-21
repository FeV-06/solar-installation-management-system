import { useState, useRef, useEffect } from 'react';
import { Bot, Loader2, Send, Sparkles, X } from 'lucide-react';
import { Icon } from '../Icon';
import './AiAssistant.css';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  card?: {
    capacityKw: number;
    subsidy: number;
    netCost: number;
    advance20Pct: number;
    panels: number;
  };
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Namaste! I am your Sol AI solar advisor. How can I help you today? You can ask me to calculate your solar savings, check PM Surya Ghar subsidies, or track your proposal.',
  },
];

const SUGGESTIONS = [
  'Estimate my solar size & subsidy',
  'What is PM Surya Ghar scheme?',
  'What is the 3 kW system package?',
  'Check my project status',
];

export function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.content || 'Here is what I found for your request.';
        let cardData: Message['card'] | undefined;

        if (data.executedTools && data.executedTools.length > 0) {
          const sizingTool = data.executedTools.find((t: { toolName: string }) => t.toolName === 'customer_calculate_sizing');
          if (sizingTool && sizingTool.isSuccess) {
            try {
              const parsed = JSON.parse(sizingTool.resultJson);
              cardData = {
                capacityKw: parsed.recommendedCapacityKw,
                subsidy: parsed.estimatedSubsidyRupees,
                netCost: parsed.netPayableRupees,
                advance20Pct: parsed.advanceRequired20Pct,
                panels: parsed.panelCount,
              };
            } catch {}
          }
        }

        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content,
            card: cardData,
          },
        ]);
      } else {
        throw new Error('API request failed');
      }
    } catch {
      // Local fallback simulation
      setTimeout(() => {
        let simulated = 'I can help answer your questions about rooftop solar sizing and PM Surya Ghar subsidies.';
        let card: Message['card'] | undefined;
        const q = query.toLowerCase();

        if (q.includes('subsidy') || q.includes('pm') || q.includes('surya')) {
          simulated = 'Under PM Surya Ghar Muft Bijli Yojana, residential central subsidies are:\n• 1 kW: ₹30,000\n• 2 kW: ₹60,000\n• 3 kW+: ₹78,000 max\n\nSubsidies are directly credited to your bank account after DISCOM net-meter inspection.';
        } else if (q.includes('bill') || q.includes('size') || q.includes('estimate') || q.includes('3 kw')) {
          simulated = 'Based on average residential consumption, a 3 kW On-Grid system with 6x 550W Mono-PERC panels is recommended.';
          card = {
            capacityKw: 3.0,
            subsidy: 78000,
            netCost: 117000,
            advance20Pct: 23400,
            panels: 6,
          };
        } else if (q.includes('status') || q.includes('portal') || q.includes('project')) {
          simulated = 'To view your live project milestones, quote proposal, and payment records, please sign in to the Customer Portal at /portal.';
        }

        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: simulated,
            card,
          },
        ]);
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="ai-assistant-toggle"
        aria-label="Open Sol AI Assistant"
        onClick={() => setIsOpen(prev => !prev)}
      >
        <Icon icon={Sparkles} />
        <span>Ask Sol AI</span>
      </button>

      {isOpen && (
        <section className="ai-assistant-drawer" aria-label="Sol AI Assistant Window">
          <header className="ai-drawer-head">
            <div className="ai-drawer-title-group">
              <div className="ai-spark-badge">
                <Icon icon={Bot} />
              </div>
              <div>
                <h3 className="ai-drawer-title">Sol AI Advisor</h3>
                <p className="ai-drawer-sub">PM Surya Ghar & Sizing Co-Pilot</p>
              </div>
            </div>
            <button
              type="button"
              className="ai-drawer-close"
              aria-label="Close Assistant"
              onClick={() => setIsOpen(false)}
            >
              <Icon icon={X} />
            </button>
          </header>

          <div className="ai-messages">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`ai-msg ${msg.role === 'user' ? 'ai-msg-user' : 'ai-msg-assistant'}`}
              >
                <div style={{ whiteSpace: 'pre-line' }}>{msg.content}</div>

                {msg.card && (
                  <div className="ai-card-result">
                    <div className="ai-card-title">System Sizing Recommendation</div>
                    <div className="ai-card-stat">
                      <span>System Sizing:</span>
                      <strong>{msg.card.capacityKw} kW ({msg.card.panels}x 550W Panels)</strong>
                    </div>
                    <div className="ai-card-stat">
                      <span>PM Surya Ghar Subsidy:</span>
                      <strong style={{ color: '#16a34a' }}>-₹{msg.card.subsidy.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="ai-card-stat">
                      <span>Net Customer Cost:</span>
                      <strong>₹{msg.card.netCost.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="ai-card-stat">
                      <span>20% Advance to Begin:</span>
                      <strong style={{ color: '#0284c7' }}>₹{msg.card.advance20Pct.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="ai-msg ai-msg-assistant" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Icon icon={Loader2} className="spin" />
                <span>Sol AI is analyzing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-suggestions">
            {SUGGESTIONS.map(s => (
              <button key={s} type="button" className="ai-pill" onClick={() => handleSend(s)}>
                {s}
              </button>
            ))}
          </div>

          <form
            className="ai-input-form"
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              className="ai-input"
              placeholder="Ask about subsidies, sizing, savings..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="ai-send-btn"
              disabled={!input.trim() || loading}
              aria-label="Send Message"
            >
              <Icon icon={Send} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
