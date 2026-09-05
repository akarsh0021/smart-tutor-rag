import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Quiz from "./components/Quiz";
import AITutor from "./components/AITutor";

function App() {
  const [user, setUser] = useState(null);
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionType, setQuestionType] = useState("multiple_choice");
  const [showRegister, setShowRegister] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (user && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: `Welcome **${user.name || user.username}**! 👋\n\nI'm your expert AI Tutor. How can I help you today?`,
        },
      ]);
    }
  }, [user, messages.length]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setShowRegister(false);
  };

  const handleRegisterSuccess = (userData) => {
    setUser(userData);
    setShowRegister(false);
  };

  const handleLogout = () => {
    setUser(null);
    setTopic("");
    setNumQuestions(5);
    setQuestionType("multiple_choice");
    setShowRegister(false);
    setMessages([]);
  };

  const handleBackToTutor = () => {
    setTopic("");
  };

  const handleSelectTopic = (selectedTopic, count = 5, type = "multiple_choice") => {
    setTopic(selectedTopic);
    setNumQuestions(count);
    setQuestionType(type);
  };

  const handleSwitchToRegister = () => {
    setShowRegister(true);
  };

  const handleSwitchToLogin = () => {
    setShowRegister(false);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 relative flex items-center justify-center">
      {/* Mesh Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 w-full py-10 px-4 min-h-screen flex items-center justify-center">
        {!user ? (
          showRegister ? (
            <Register
              onRegisterSuccess={handleRegisterSuccess}
              onSwitchToLogin={handleSwitchToLogin}
            />
          ) : (
            <Login
              onLoginSuccess={handleLoginSuccess}
              onSwitchToRegister={handleSwitchToRegister}
            />
          )
        ) : topic ? (
          <Quiz
            topic={topic}
            numQuestions={numQuestions}
            questionType={questionType}
            user={user}
            onBackToTutor={handleBackToTutor}
            onLogout={handleLogout}
          />
        ) : (
          <AITutor
            onSelectTopic={handleSelectTopic}
            user={user}
            onLogout={handleLogout}
            messages={messages}
            setMessages={setMessages}
          />
        )}
      </div>
    </div>
  );
}

export default App;
