// src/App.js
import React, { useState } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Quiz from "./components/Quiz";
import AITutor from "./components/AITutor";

function App() {
  const [user, setUser] = useState(null);
  const [topic, setTopic] = useState("");
  const [showRegister, setShowRegister] = useState(false);

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
    setShowRegister(false);
  };

  const handleBackToTutor = () => {
    setTopic("");
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
            user={user}
            onBackToTutor={handleBackToTutor}
            onLogout={handleLogout}
          />
        ) : (
          <AITutor
            onSelectTopic={(t) => setTopic(t)}
            user={user}
            onLogout={handleLogout}
          />
        )}
      </div>
    </div>
  );
}

export default App;
