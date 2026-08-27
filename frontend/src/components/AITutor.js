import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, LogOut, BookOpen, User, Bot, Sparkles, Brain } from "lucide-react";
import ReactMarkdown from "react-markdown";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

function AITutor({ onSelectTopic, user, onLogout }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Welcome **${user.name || user.username}**! 👋\n\nI’m your expert AI Tutor. How can I help you today?`,
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentTopic, setCurrentTopic] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ai-tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage,
          conversation_history: messages,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
        setCurrentTopic(userMessage);
      } else {
        throw new Error();
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ System error. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1700px] h-[88vh] min-h-[700px] flex gap-6">
      {/* Sidebar */}
      <aside className="w-80 glass-card rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-amber-500"></div>
        
        <div className="flex items-center gap-4 mb-12">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20 text-white">
            <Brain size={28} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">AI Expert</h2>
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Active Session</p>
          </div>
        </div>

        <div className="space-y-4 flex-1">
          <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Authenticated</p>
            <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {user.name || user.username}
            </p>
          </div>

          {currentTopic && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => onSelectTopic(currentTopic)}
              className="w-full btn-accent flex items-center justify-center gap-3 group relative overflow-hidden"
            >
              <BookOpen size={20} className="group-hover:rotate-12 transition-transform" />
              <span className="relative z-10">Generate Quiz</span>
            </motion.button>
          )}
        </div>

        <button
          onClick={onLogout}
          className="btn-secondary w-full flex items-center justify-center gap-3 text-red-400 border-red-500/10 hover:bg-red-500/10 transition-colors mt-auto"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 glass-card rounded-[2.5rem] flex flex-col relative overflow-hidden pb-6 min-h-0">
        {/* Header */}
        <div className="px-10 py-6 border-b border-white/5 flex items-center justify-between bg-white/2">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-indigo-500 rounded-full animate-ping"></div>
            <div>
              <h1 className="text-lg font-bold text-white">Interactive Learning</h1>
              <p className="text-xs text-slate-500">LLM-Powered Pedagogical Assistant</p>
            </div>
          </div>
          <Sparkles className="text-amber-400 w-5 h-5 opacity-50" />
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-10 py-8 space-y-8 scroll-smooth min-h-0">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex gap-4 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                    msg.role === "user" ? "bg-amber-500 text-white" : "bg-indigo-600 text-white"
                  }`}>
                    {msg.role === "user" ? <User size={20} /> : <Bot size={20} />}
                  </div>

                  <div className={`p-6 rounded-[1.8rem] text-[0.95rem] leading-relaxed shadow-xl border ${
                    msg.role === "user" 
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-50 rounded-tr-none" 
                      : "bg-slate-800/50 border-white/5 text-slate-200 rounded-tl-none"
                  }`}>
                    <ReactMarkdown
                      components={{
                        // react-markdown v9+/v10: the `inline` prop was removed.
                        // Override `pre` as a passthrough so the default <pre> wrapper
                        // doesn't double-nest with the <pre> we render in `code`.
                        pre({ children }) {
                          return <>{children}</>;
                        },
                        code({ node, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          // Block code: has a language- className, OR content is multiline
                          const isBlock = !!match || String(children).includes('\n');
                          if (isBlock) {
                            return (
                              <div className="relative group my-4">
                                <div className="absolute -top-3 left-4 px-2 py-0.5 bg-slate-700 text-[10px] font-bold text-slate-300 rounded uppercase tracking-widest border border-white/5">
                                  {match ? match[1] : 'code'}
                                </div>
                                <pre className="mt-2 bg-slate-950 p-6 rounded-2xl border border-white/5 overflow-x-auto shadow-2xl">
                                  <code className="text-indigo-300 font-mono text-sm leading-relaxed whitespace-pre" {...props}>
                                    {children}
                                  </code>
                                </pre>
                              </div>
                            );
                          }
                          // Inline code: single backtick, no language class, single line
                          return (
                            <code className="bg-slate-700/50 text-amber-300 px-1.5 py-0.5 rounded-md font-mono text-sm" {...props}>
                              {children}
                            </code>
                          );
                        },
                        p: ({children}) => <p className="mb-4 last:mb-0">{children}</p>,
                        ul: ({children}) => <ul className="list-disc ml-6 mb-4 space-y-2">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal ml-6 mb-4 space-y-2">{children}</ol>,
                        h1: ({children}) => <h1 className="text-2xl font-black mb-4 text-white tracking-tight">{children}</h1>,
                        h2: ({children}) => <h2 className="text-xl font-bold mb-3 text-indigo-300 tracking-tight">{children}</h2>,
                        h3: ({children}) => <h3 className="text-lg font-semibold mb-2 text-amber-200">{children}</h3>,
                        strong: ({children}) => <strong className="font-bold text-white">{children}</strong>,
                        em: ({children}) => <em className="italic text-slate-300">{children}</em>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 ml-14">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">AI is analyzing</span>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="px-10 py-6">
          <div className="relative group p-1 bg-gradient-to-r from-indigo-500/20 to-amber-500/20 rounded-[2.2rem] transition-all hover:from-indigo-500/30 hover:to-amber-500/30">
            <div className="flex gap-2 p-1.5 items-center bg-slate-950 rounded-[2rem] border border-white/5">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask about anything... (e.g. Explain Python Decorators)"
                className="flex-1 bg-transparent px-6 py-4 text-white outline-none placeholder:text-slate-600 font-medium"
                disabled={loading}
              />
              <button
                onClick={handleSendMessage}
                disabled={loading || !inputValue.trim()}
                className="w-12 h-12 flex items-center justify-center bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all disabled:opacity-20 active:scale-90"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AITutor;
