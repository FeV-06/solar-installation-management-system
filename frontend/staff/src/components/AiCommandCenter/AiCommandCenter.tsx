import { useState, useRef, useEffect, useMemo, type FormEvent } from 'react';
import {
  Sparkles,
  Send,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  CornerDownRight,
  Shield,
  Wrench,
  TrendingUp,
} from 'lucide-react';
import { Icon } from '../Icon';
import './AiCommandCenter.css';

type ToolExecution = {
  toolName: string;
  success: boolean;
  resultJson?: string;
  errorMessage?: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools?: ToolExecution[];
  sources?: string[];
  suggestedAction?: string;
};

type AiChatApiResponse = {
  reply: string;
  executedTools: ToolExecution[];
  knowledgeSourcesCited: string[];
  suggestedNextAction?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
  userName: string;
};

export function AiCommandCenter({ isOpen, onClose, userRole, userName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: `Welcome to Sol Operations AI, ${userName}. As a **${userRole}**, you can query system knowledge, execute operational workflows, or inspect equipment guidelines directly through natural language.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Role-specific quick prompt recommendations
  const suggestions = useMemo(() => {
    switch (userRole) {
      case 'Admin':
        return [
          'Convert qualified lead #1 to installation',
          'Review and approve site survey for project #1',
          'Generate official quote for installation #1',
          'Show technician packing checklist guidelines',
        ];
      case 'Sales':
        return [
          'Convert qualified lead #1 to project',
          'Review quotation pricing for project #1',
          'Calculate subsidy for 3 kW residential setup',
          'Check PM Surya Ghar documentation rules',
        ];
      case 'Technician':
        return [
          'What are rooftop obstacle clearance rules?',
          'Check electrical earthing & lightning arrester requirements',
          'Record survey measurements for project #1',
          'What is the packing checklist serialization requirement?',
        ];
      default:
        return [
          'What are the PM Surya Ghar subsidy slabs?',
          'How does solar net metering work?',
          'Check installation workflow stages',
        ];
    }
  }, [userRole]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        throw new Error(`AI Service returned ${res.status}`);
      }

      const data: AiChatApiResponse = await res.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        tools: data.executedTools,
        sources: data.knowledgeSourcesCited,
        suggestedAction: data.suggestedNextAction,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : 'Unknown error';
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ Failed to execute command: ${errText}. Please check the server logs or try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleSend();
  };

  const getRoleIcon = () => {
    switch (userRole) {
      case 'Admin':
        return Shield;
      case 'Technician':
        return Wrench;
      case 'Sales':
        return TrendingUp;
      default:
        return Sparkles;
    }
  };

  return (
    <div
      className="ai-command-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ai-command-modal" role="dialog" aria-modal="true" aria-label="Sol AI Operations Command Center">
        {/* Header */}
        <header className="ai-command-header">
          <div className="ai-command-title">
            <Icon icon={Sparkles} />
            <span>Sol AI Operations Copilot</span>
            <span className={`ai-badge role-${userRole.toLowerCase()}`}>
              <Icon icon={getRoleIcon()} />
              {userRole}
            </span>
          </div>
          <div className="ai-command-header-actions">
            <span className="ai-shortcut-badge">Esc to close</span>
            <button
              className="btn btn-quiet btn-icon"
              type="button"
              aria-label="Close command center"
              onClick={onClose}
            >
              <Icon icon={X} />
            </button>
          </div>
        </header>

        {/* Suggestion Chips */}
        <div className="ai-suggestions-bar">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              type="button"
              className="ai-suggestion-chip"
              onClick={() => void handleSend(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Messages Stream */}
        <div className="ai-command-messages">
          {messages.map(m => (
            <div key={m.id} className={`ai-chat-bubble ${m.role}`}>
              <div className="ai-markdown-content">
                <FormattedText text={m.content} />
              </div>

              {/* Tools Executed by AI */}
              {m.tools && m.tools.length > 0 && (
                <div className="ai-tools-group">
                  {m.tools.map((t, idx) => (
                    <div
                      key={idx}
                      className={`ai-tool-pill ${t.success ? 'success' : 'error'}`}
                    >
                      <Icon icon={t.success ? CheckCircle2 : AlertCircle} />
                      <span>
                        Tool: <strong>{t.toolName}</strong> ({t.success ? 'Executed' : 'Failed'})
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Citations and Sources */}
              {m.sources && m.sources.length > 0 && (
                <div className="ai-sources-bar">
                  <span>Grounding:</span>
                  {m.sources.map((src, idx) => (
                    <span key={idx} className="ai-source-tag">
                      <Icon icon={FileText} />
                      {src}
                    </span>
                  ))}
                </div>
              )}

              {/* Suggested Next Action */}
              {m.suggestedAction && (
                <div
                  className="ai-suggested-action"
                  onClick={() => void handleSend(m.suggestedAction)}
                >
                  <Icon icon={CornerDownRight} />
                  <span>Suggested: {m.suggestedAction}</span>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="ai-chat-bubble assistant">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)' }}>
                <Icon icon={Loader2} />
                <span>Processing operational command & analyzing system state...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <footer className="ai-command-footer">
          <form className="ai-command-form" onSubmit={onSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="ai-command-input"
              placeholder={`Ask or command Sol AI (${userRole} workflows, site survey rules, pricing)...`}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="ai-command-send-btn"
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? <Icon icon={Loader2} /> : <Icon icon={Send} />}
              <span>Execute</span>
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}

/** Formats simple markdown highlights (bold, code, newlines) */
function FormattedText({ text }: { text: string }) {
  const paragraphs = text.split('\n\n');
  return (
    <>
      {paragraphs.map((p, pIdx) => {
        const lines = p.split('\n');
        return (
          <p key={pIdx}>
            {lines.map((line, lIdx) => (
              <span key={lIdx}>
                {line.startsWith('- ') || line.startsWith('* ') ? (
                  <span style={{ display: 'block', paddingLeft: '1rem' }}>
                    • {formatInline(line.substring(2))}
                  </span>
                ) : (
                  formatInline(line)
                )}
                {lIdx < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

function formatInline(str: string) {
  const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={idx}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}
