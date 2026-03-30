import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Loader, X } from 'lucide-react';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';

const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_FALLBACK_MODEL = import.meta.env.VITE_GEMINI_FALLBACK_MODEL || 'gemini-1.5-flash';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const HYTBOT_API_URL = import.meta.env.VITE_HYTBOT_API_URL;
const MAX_GEMINI_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 1200;

const GENERAL_SYSTEM_PROMPT =
  'You are HYT BOT, a helpful general-purpose AI assistant. You can answer questions on any topic, not just HYTech LMS. When the user asks about HYTech LMS, provide practical app-specific guidance. Keep responses accurate, clear, and concise.';

const getGeminiReplyText = (responseJson) => {
  const parts = responseJson?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return null;
  }
  const text = parts
    .map((part) => part?.text || '')
    .join('\n')
    .trim();
  return text || null;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseRetryAfterMs = (response) => {
  const retryAfter = Number(response.headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return retryAfter * 1000;
  }
  return null;
};

const HytBot = ({ embedded = false }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am HYT BOT. How can I help you today?' },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(!embedded);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [role, setRole] = useState('guest');
  const scrollRef = useRef(null);
  const warnedMissingGeminiKeyRef = useRef(false);
  const rateLimitedUntilRef = useRef(0);
  const { addToast } = useToast();

  useEffect(() => {
    if (!embedded) {
      setIsPanelOpen(true);
    }
  }, [embedded]);

  useEffect(() => {
    if (!embedded || typeof window === 'undefined') {
      return undefined;
    }

    const handleSidebarCollapse = (event) => {
      setIsSidebarCollapsed(Boolean(event?.detail?.isCollapsed));
    };

    window.addEventListener('hytech:sidebar-collapse', handleSidebarCollapse);
    return () => window.removeEventListener('hytech:sidebar-collapse', handleSidebarCollapse);
  }, [embedded]);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const user = auth?.currentUser;
        if (!user) return;
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data() || {};
          setRole(data.role || 'student');
        }
      } catch (err) {
        console.warn('HYT BOT: could not load user role', err);
      }
    };
    fetchRole();
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const offlineFallbackMessage =
    "I'm currently unable to reach the AI service. Please try again in a moment.";

  const requestGeminiReply = async (userMessage) => {
    if (!GEMINI_API_KEY) {
      return null;
    }

    const now = Date.now();
    if (rateLimitedUntilRef.current > now) {
      const waitSeconds = Math.ceil((rateLimitedUntilRef.current - now) / 1000);
      const rateLimitError = new Error(`Gemini is rate-limited. Try again in ${waitSeconds}s.`);
      rateLimitError.status = 429;
      rateLimitError.waitSeconds = waitSeconds;
      throw rateLimitError;
    }

    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }));

    const modelsToTry = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(
      (value, index, list) => value && list.indexOf(value) === index
    );

    let lastError = null;

    for (const modelName of modelsToTry) {
      for (let attempt = 0; attempt <= MAX_GEMINI_RETRIES; attempt += 1) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          modelName
        )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: GENERAL_SYSTEM_PROMPT }],
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: `Context: current LMS role is ${role}.` }],
              },
              ...history,
              {
                role: 'user',
                parts: [{ text: userMessage }],
              },
            ],
            generationConfig: {
              temperature: 0.6,
              topP: 0.9,
              maxOutputTokens: 500,
            },
          }),
        });

        if (response.ok) {
          const json = await response.json();
          const reply = getGeminiReplyText(json);
          if (reply) {
            return reply;
          }
          lastError = new Error('Gemini returned an empty response.');
          break;
        }

        const status = response.status;
        const isRetryable = status === 429 || status >= 500;

        if (isRetryable && attempt < MAX_GEMINI_RETRIES) {
          const retryMs = parseRetryAfterMs(response) || BASE_RETRY_DELAY_MS * (attempt + 1);
          if (status === 429) {
            rateLimitedUntilRef.current = Date.now() + retryMs;
          }
          await sleep(retryMs + Math.floor(Math.random() * 250));
          continue;
        }

        const requestError = new Error(`Gemini request failed with status ${status}`);
        requestError.status = status;
        if (status === 429) {
          const retryMs = parseRetryAfterMs(response) || 15000;
          rateLimitedUntilRef.current = Date.now() + retryMs;
          requestError.waitSeconds = Math.ceil(retryMs / 1000);
        }
        lastError = requestError;
        break;
      }

      if (lastError?.status && lastError.status < 500 && lastError.status !== 429) {
        break;
      }
    }

    if (lastError) {
      throw lastError;
    }

    return null;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setMessages((m) => [...m, { role: 'user', text: userMessage }]);
    setInput('');
    setIsSending(true);

    try {
      let reply = null;

      // Optional backend proxy takes priority when configured.
      if (HYTBOT_API_URL) {
        try {
          const res = await fetch(HYTBOT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMessage, role }),
          });
          if (res.ok) {
            const json = await res.json();
            if (json?.reply) reply = json.reply;
          }
        } catch (e) {
          console.warn('HYT BOT backend error', e);
        }
      }

      // Gemini direct integration (Vite env key).
      if (!reply) {
        try {
          reply = await requestGeminiReply(userMessage);
        } catch (e) {
          if (e?.status === 429) {
            const waitSeconds = e?.waitSeconds || Math.max(1, Math.ceil((rateLimitedUntilRef.current - Date.now()) / 1000));
            reply = `I'm currently rate-limited by the AI provider. Please try again in about ${waitSeconds} second${waitSeconds === 1 ? '' : 's'}.`;
            addToast?.('HYT BOT is temporarily rate-limited. Please wait and try again.', 'warning');
          } else {
            console.warn('HYT BOT Gemini error', e);
          }
        }
      }

      if (!HYTBOT_API_URL && !GEMINI_API_KEY && !warnedMissingGeminiKeyRef.current) {
        warnedMissingGeminiKeyRef.current = true;
        addToast?.('Gemini API key not configured. HYT BOT can only show offline fallback responses.', 'info');
      }

      // Minimal fallback only when AI is unreachable.
      if (!reply) {
        reply = offlineFallbackMessage;
      }

      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
    } catch (err) {
      console.warn('HYT BOT sendMessage failed', err);
      addToast?.('HYT BOT encountered an error and could not reach the AI service.', 'warning');
      const reply = offlineFallbackMessage;
      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
    } finally {
      setIsSending(false);
    }
  };

  const renderChatBody = (messagesContainerClassName) => (
    <>
      <div ref={scrollRef} className={messagesContainerClassName}>
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[80%] ${m.role === 'assistant' ? 'bg-white text-gray-800 rounded-xl p-4 shadow' : 'bg-[#0B005C] text-white rounded-xl p-4 ml-auto'}`}>
            <div className="whitespace-pre-wrap">{m.text}</div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t bg-white flex items-center gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
          placeholder="Ask HYT BOT something..."
          className="flex-1 px-4 py-2 border rounded-xl focus:outline-none"
        />
        <button onClick={sendMessage} disabled={isSending} className="px-4 py-2 bg-[#0B005C] text-white rounded-xl disabled:opacity-60">
          {isSending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </>
  );

  if (embedded) {
    return (
      <>
        {!isPanelOpen && (
          <div className={`fixed z-50 bottom-6 right-4 sm:right-6 lg:right-auto lg:bottom-20 ${isSidebarCollapsed ? 'lg:left-3' : 'lg:left-6'}`}>
            <button
              type="button"
              onClick={() => setIsPanelOpen(true)}
              className={`inline-flex items-center gap-2 bg-[#0B005C] text-white rounded-full shadow-lg hover:bg-[#13007a] transition-colors ${isSidebarCollapsed ? 'lg:px-3 lg:py-3 px-4 py-3' : 'px-4 py-3'}`}
            >
              <MessageCircle className="w-5 h-5" />
              <span className={`font-medium ${isSidebarCollapsed ? 'lg:hidden' : ''}`}>HYT BOT</span>
            </button>
          </div>
        )}

        {isPanelOpen && (
          <div className="fixed z-50 bottom-6 right-4 sm:right-6">
            <div className="w-[min(92vw,430px)] h-[min(72vh,600px)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  <MessageCircle className="w-5 h-5 text-indigo-600" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">HYT BOT</h3>
                    <p className="text-xs text-gray-500 truncate">General AI assistant ({role})</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPanelOpen(false)}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                  aria-label="Close HYT BOT"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {renderChatBody('flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50')}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <MessageCircle className="w-6 h-6 text-indigo-600" />
          <div>
            <h3 className="font-semibold text-gray-900">HYT BOT</h3>
            <p className="text-sm text-gray-500">General AI assistant with HYTech context ({role})</p>
          </div>
        </div>

        {renderChatBody('h-96 overflow-y-auto p-6 space-y-4 bg-gray-50')}
      </div>
    </div>
  );
};

export default HytBot;
