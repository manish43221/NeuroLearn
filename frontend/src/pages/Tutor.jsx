
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import api, { errMsg } from "../services/api";
import CoursePicker from "../components/CoursePicker";

// Initial tutor greeting
const INITIAL_MESSAGE = {
  role: "assistant",
  text: "Hi! I'm your AI Tutor. Ask me anything about your course, and I'll help you understand it step by step.",
  offline: false,
};

// Markdown styling
const markdownComponents = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>
  ),

  h2: ({ children }) => (
    <h2 className="text-lg font-bold mt-4 mb-2">{children}</h2>
  ),

  h3: ({ children }) => (
    <h3 className="text-base font-semibold mt-3 mb-2">{children}</h3>
  ),

  p: ({ children }) => (
    <p className="mb-3 last:mb-0 leading-7">{children}</p>
  ),

  strong: ({ children }) => (
    <strong className="font-bold">{children}</strong>
  ),

  ul: ({ children }) => (
    <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>
  ),

  ol: ({ children }) => (
    <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>
  ),

  li: ({ children }) => (
    <li className="pl-1 leading-7">{children}</li>
  ),

  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-brand-500 pl-4 my-3 italic text-slate-600 dark:text-slate-300">
      {children}
    </blockquote>
  ),

  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-lg bg-slate-900 text-slate-100 p-4 my-3 text-sm">
      {children}
    </pre>
  ),

  code: ({ children, className }) => {
    const isBlock = Boolean(className);

    return isBlock ? (
      <code className={`${className || ""} font-mono`}>
        {children}
      </code>
    ) : (
      <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    );
  },

  table: ({ children }) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border-collapse border border-slate-300 dark:border-slate-600 text-sm">
        {children}
      </table>
    </div>
  ),

  th: ({ children }) => (
    <th className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-left font-semibold bg-slate-200 dark:bg-slate-700">
      {children}
    </th>
  ),

  td: ({ children }) => (
    <td className="border border-slate-300 dark:border-slate-600 px-3 py-2">
      {children}
    </td>
  ),

  hr: () => (
    <hr className="my-4 border-slate-300 dark:border-slate-600" />
  ),
};

function TutorMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[90%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-brand-600 text-white rounded-br-sm"
            : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm"
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold">🤖 AI Tutor</span>

            {message.offline && (
              <span className="chip text-xs">
                Offline response
              </span>
            )}
          </div>
        )}

        {isUser ? (
          <p className="whitespace-pre-wrap break-words leading-6">
            {message.text}
          </p>
        ) : (
          <div className="break-words text-sm leading-7">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {message.text || ""}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Tutor() {
  const [courseId, setCourseId] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState([INITIAL_MESSAGE]);

  const sessionRef = useRef(0);
  const requestLock = useRef(false);
  const bottomRef = useRef(null);

  // Scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [chat, busy]);

  // Start a new conversation
  function newChat() {
    sessionRef.current += 1;
    requestLock.current = false;

    setBusy(false);
    setQ("");
    setChat([INITIAL_MESSAGE]);
  }

  // Handle course change
  function handleCourseChange(value) {
    if (value === courseId) return;

    sessionRef.current += 1;
    requestLock.current = false;

    setCourseId(value);
    setBusy(false);
    setQ("");
    setChat([INITIAL_MESSAGE]);
  }

  // Send question to AI Tutor
  async function sendQuestion(event) {
    event?.preventDefault();

    const question = q.trim();

    if (!question) {
      toast.error("Please enter a question.");
      return;
    }

    if (!courseId) {
      toast.error("Please select a course first.");
      return;
    }

    // Prevent duplicate requests
    if (requestLock.current) return;

    requestLock.current = true;

    const currentSession = sessionRef.current;

    // Preserve previous conversation context
    const history = chat
      .filter(
        (message) =>
          (message.role === "user" || message.role === "assistant") &&
          message.text?.trim()
      )
      .slice(-10)
      .map((message) => ({
        role: message.role,
        content: message.text,
      }));

    const userMessage = {
      role: "user",
      text: question,
    };

    setChat((previous) => [...previous, userMessage]);
    setQ("");
    setBusy(true);

    try {
      const response = await api.post("/ai/tutor", {
        courseId,
        question,
        history,
      });

      // Ignore responses belonging to an older chat
      if (currentSession !== sessionRef.current) return;

      const data = response.data?.data || response.data;

      const answer = data?.answer;

      if (!answer) {
        throw new Error("The tutor returned an empty response.");
      }

      setChat((previous) => [
        ...previous,
        {
          role: "assistant",
          text: answer,
          offline: data?.source === "offline",
        },
      ]);
    } catch (error) {
      if (currentSession !== sessionRef.current) return;

      toast.error(errMsg(error));

      setChat((previous) => [
        ...previous,
        {
          role: "assistant",
          text: "Sorry, I couldn't process your question right now. Please try again.",
          offline: false,
        },
      ]);
    } finally {
      if (currentSession === sessionRef.current) {
        setBusy(false);
        requestLock.current = false;
      }
    }
  }

  return (
    <div className="page max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold">
            🤖 AI Tutor
          </h1>

          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ask questions and learn with personalized explanations.
          </p>
        </div>

        <button
          type="button"
          onClick={newChat}
          className="btn-primary whitespace-nowrap"
        >
          + New Chat
        </button>
      </div>

      {/* Course selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Course
        </label>

        <CoursePicker
          value={courseId}
          onChange={handleCourseChange}
        />
      </div>

      {/* Chat container */}
      <div className="card">
        <div className="h-[460px] overflow-y-auto p-4">
          {chat.map((message, index) => (
            <TutorMessage
              key={`${index}-${message.role}`}
              message={message}
            />
          ))}

          {/* Loading indicator */}
          {busy && (
            <div className="flex justify-start mb-4">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
                  <span className="animate-pulse">●</span>
                  <span>AI Tutor is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Question input */}
      <form
        onSubmit={sendQuestion}
        className="flex items-end gap-2 mt-3"
      >
        <textarea
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey
            ) {
              event.preventDefault();
              sendQuestion(event);
            }
          }}
          placeholder="Ask something... (Enter to send)"
          rows={2}
          disabled={busy}
          className="input flex-1 resize-none"
        />

        <button
          type="submit"
          disabled={busy || !q.trim() || !courseId}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Asking..." : "Ask"}
        </button>
      </form>

      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
        Conversation context is maintained during this session.
        Refreshing the page starts a new conversation.
      </p>
    </div>
  );
}
