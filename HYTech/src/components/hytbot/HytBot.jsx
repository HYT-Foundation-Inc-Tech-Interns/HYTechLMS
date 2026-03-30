import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Loader, X } from 'lucide-react';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '../../context/ToastContext';

const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_FALLBACK_MODEL = import.meta.env.VITE_GEMINI_FALLBACK_MODEL || 'gemini-flash-latest';
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

const includesAny = (text, keywords) => keywords.some((keyword) => text.includes(keyword));

const buildLocalFallbackReply = (userMessage, currentRole = 'guest') => {
  const text = String(userMessage || '').toLowerCase().trim();
  const role = String(currentRole || 'guest').toLowerCase();

  const homeByRole = {
    admin: '/admin',
    trainer: '/trainer',
    supervisor: '/supervisor',
    student: '/student',
  };

  const roleLabelByRole = {
    admin: 'Admin',
    trainer: 'Trainer',
    supervisor: 'Supervisor',
    student: 'Student',
    guest: 'User',
  };

  const homePath = homeByRole[role] || '/signin';
  const settingsPath = homePath === '/signin' ? '/signin' : `${homePath}/settings`;

  if (!text) {
    return 'Ask me anything about HYTech LMS and I will guide you step-by-step.';
  }

  if (includesAny(text, ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'])) {
    return `Hello! I can still help with HYTech LMS tasks for ${roleLabelByRole[role] || 'User'} accounts. Try asking things like "how to reset password" or "where is settings".`;
  }

  if (includesAny(text, ['reset password', 'forgot password', 'change password', 'password'])) {
    return `Password help:\n1. Go to ${settingsPath}.\n2. Open Security / Change Password.\n3. Enter your current password, new password, and confirmation.\n4. Click Save Password.\n\nIf you are locked out, use the Forgot Password option on the Sign In page.`;
  }

  if (includesAny(text, ['settings', 'profile', 'update name', 'birth date', 'middle name', 'name extension'])) {
    return `Profile settings help:\n1. Open ${settingsPath}.\n2. Update First Name, Last Name, Birth Date, and other fields.\n3. Click Save Changes (Profile tab) to persist updates.\n\nMiddle Name and Name Extension are optional fields.`;
  }

  if (includesAny(text, ['notification', 'notifications', 'alert', 'alerts'])) {
    return `Notifications help:\n1. Open the bell icon in the top navbar for quick updates.\n2. Open the Notifications page for complete history.\n3. In Settings, adjust notification preferences and save.`;
  }

  if (role === 'student') {
    if (includesAny(text, ['course', 'my course', 'enrolled', 'lessons', 'materials'])) {
      return 'Student course navigation:\n1. Open My Courses from the sidebar.\n2. Select your enrolled course.\n3. Use Tasks and Calendar tabs to track deadlines.';
    }
    if (includesAny(text, ['certificate', 'certificates'])) {
      return 'Certificates are in the Student sidebar under Certificates. Completed courses with requirements met will appear there.';
    }
    if (includesAny(text, ['task', 'assignment', 'deadline'])) {
      return 'Use Student > Tasks to view pending assignments and deadlines. You can also check Calendar for schedule-based reminders.';
    }
  }

  if (role === 'trainer') {
    if (includesAny(text, ['course', 'courses', 'manage course'])) {
      return 'Trainer course flow:\n1. Go to /trainer.\n2. Open a course from My Courses.\n3. Manage tasks, materials, and learner progress inside the course.';
    }
    if (includesAny(text, ['sector', 'sectors'])) {
      return 'Use Trainer > Sectors to view Training Regulations and sector details.';
    }
  }

  if (role === 'admin') {
    if (includesAny(text, ['user', 'users', 'add user', 'account'])) {
      return 'Admin user management:\n1. Open Admin > User Management.\n2. Add/Edit user details (first/middle/last/extension/birth date).\n3. Save to create or update user records.';
    }
    if (includesAny(text, ['logs', 'system log', 'audit'])) {
      return 'Open Admin > System Logs to review activity and audit events.';
    }
  }

  if (role === 'supervisor') {
    if (includesAny(text, ['report', 'reports', 'analytics'])) {
      return 'Supervisor reports are available in Supervisor > Reports for progress and performance monitoring.';
    }
    if (includesAny(text, ['trainer', 'trainers', 'student', 'students'])) {
      return 'Use Supervisor sidebar sections (Trainers, Students, Courses) to monitor accounts and performance.';
    }
  }

  return `I can still assist with HYTech LMS navigation and actions. Try asking:\n- "How do I update my profile?"\n- "Where do I reset password?"\n- "Where are notifications?"\n- "How do I manage users/courses/tasks?"`;
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
    'Live AI is currently unavailable, so I am using built-in HYTech guidance.';

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
      let aiUnavailableReason = '';

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
          } else {
            aiUnavailableReason = 'backend';
          }
        } catch (e) {
          aiUnavailableReason = 'backend';
          console.warn('HYT BOT backend error', e);
        }
      }

      // Gemini direct integration (Vite env key).
      if (!reply) {
        try {
          reply = await requestGeminiReply(userMessage);
        } catch (e) {
          if (e?.status === 429) {
            aiUnavailableReason = 'quota';
            addToast?.('HYT BOT is temporarily rate-limited. Please wait and try again.', 'warning');
          } else {
            aiUnavailableReason = 'gemini';
            console.warn('HYT BOT Gemini error', e);
          }
        }
      }

      if (!HYTBOT_API_URL && !GEMINI_API_KEY && !warnedMissingGeminiKeyRef.current) {
        warnedMissingGeminiKeyRef.current = true;
        aiUnavailableReason = 'missing-key';
        addToast?.('Gemini API key not configured. HYT BOT can only show offline fallback responses.', 'info');
      }

      // Local intelligent fallback when live AI is unavailable.
      if (!reply) {
        const localReply = buildLocalFallbackReply(userMessage, role);
        if (aiUnavailableReason) {
          reply = `${localReply}\n\n${offlineFallbackMessage}`;
        } else {
          reply = localReply;
        }
      }

      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
    } catch (err) {
      console.warn('HYT BOT sendMessage failed', err);
      addToast?.('HYT BOT encountered an error and could not reach the AI service.', 'warning');
      const localReply = buildLocalFallbackReply(userMessage, role);
      const reply = `${localReply}\n\n${offlineFallbackMessage}`;
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
                    <p className="text-xs text-gray-500 truncate">AI assistant</p>
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
            <p className="text-sm text-gray-500">AI assistant with HYTech context</p>
          </div>
        </div>

        {renderChatBody('h-96 overflow-y-auto p-6 space-y-4 bg-gray-50')}
      </div>
    </div>
  );
};

export default HytBot;
