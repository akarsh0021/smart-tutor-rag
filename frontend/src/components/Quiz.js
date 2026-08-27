import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, CheckCircle, XCircle, RefreshCcw, Send, Award, Brain } from "lucide-react";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

function Quiz({ topic, user, onBackToTutor, onLogout }) {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [userAnswers, setUserAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");

  const generateQuiz = useCallback(async () => {
    setLoading(true);
    setError("");
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setShowResults(false);
    setScore(0);
    setFeedback("");
    setSelectedAnswer("");

    try {
      const response = await fetch(`${API_BASE_URL}/ai-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, num_questions: 5, force_new: true }),
      });
      const data = await response.json();
      if (response.ok && data.questions?.length > 0) {
        setQuestions(data.questions);
      } else {
        setError("Failed to generate quiz. System might be busy.");
      }
    } catch (err) {
      setError("Connection error. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  }, [topic]);

  useEffect(() => {
    if (topic) generateQuiz();
  }, [topic, generateQuiz]);

  const handleNextQuestion = () => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = selectedAnswer;
    setUserAnswers(newAnswers);
    setSelectedAnswer("");

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      calculateResult(newAnswers);
    }
  };

  const calculateResult = async (answers) => {
    let correctCount = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct_answer) correctCount++; });
    setScore(correctCount);
    setShowResults(true);

    try {
      const res = await fetch("http://localhost:8000/quiz-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: correctCount, total: questions.length, topic }),
      });
      const data = await res.json();
      setFeedback(data.feedback);
    } catch {
      setFeedback("Excellent work! Consistency is the key to mastery.");
    }
  };

  if (loading) return (
    <div className="w-full max-w-md p-10 glass-card rounded-[3rem] text-center">
      <div className="relative w-24 h-24 mx-auto mb-8">
        <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <Brain className="absolute inset-0 m-auto text-indigo-500 w-10 h-10 animate-pulse" />
      </div>
      <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Crafting Quiz</h2>
      <p className="text-slate-500 font-medium">Analyzing topic: {topic}</p>
    </div>
  );

  if (error) return (
    <div className="w-full max-w-md p-10 glass-card rounded-[3rem] text-center border-red-500/20">
      <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-500">
        <XCircle size={40} />
      </div>
      <h2 className="text-2xl font-bold text-white mb-4">Generation Error</h2>
      <p className="text-slate-400 mb-8">{error}</p>
      <div className="flex gap-4">
        <button onClick={() => generateQuiz()} className="btn-primary flex-1 py-4">Retry</button>
        <button onClick={onBackToTutor} className="btn-secondary flex-1 py-4">Back</button>
      </div>
    </div>
  );

  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl p-6">
        <div className="glass-card rounded-[3rem] p-12 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
          
          <div className="text-center mb-12">
            <div className="inline-flex relative mb-6">
              <Award className={`w-24 h-24 ${percentage >= 80 ? "text-amber-400" : "text-slate-400"}`} />
              <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full"></div>
            </div>
            <h1 className="text-4xl font-black text-white mb-2 leading-tight">Mastery Level: {percentage}%</h1>
            <p className="text-slate-400 text-lg">You identified {score} out of {questions.length} concepts correctly</p>
          </div>

          <div className="p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem] mb-12 text-center italic text-indigo-100 text-lg leading-relaxed">
            "{feedback}"
          </div>

          <div className="space-y-6 mb-12">
            <h3 className="text-xl font-bold text-white flex items-center gap-3 ml-2">
              <BookOpen className="text-indigo-400" /> Assessment Review
            </h3>
            <div className="grid gap-4">
              {questions.map((q, i) => (
                <div key={i} className="p-6 bg-slate-900/40 border border-white/5 rounded-2xl flex gap-6 items-start">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${userAnswers[i] === q.correct_answer ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-100"}`}>
                    {userAnswers[i] === q.correct_answer ? <CheckCircle size={24} /> : <XCircle size={24} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold mb-2">Q{i+1}: {q.question}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-500 font-medium">Your selection: <span className={userAnswers[i] === q.correct_answer ? "text-green-400" : "text-red-400"}>{userAnswers[i] || "Skipped"}</span></span>
                      {userAnswers[i] !== q.correct_answer && <span className="text-green-400 font-medium">Correct: {q.correct_answer}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button onClick={() => generateQuiz()} className="btn-primary px-10 py-5 text-lg flex items-center gap-3">
              <RefreshCcw size={22} /> Retry Assessment
            </button>
            <button onClick={onBackToTutor} className="btn-secondary px-10 py-5 text-lg">Back to Tutor</button>
          </div>
        </div>
      </motion.div>
    );
  }

  const currentQ = questions[currentQuestionIndex];
  return (
    <div className="w-full max-w-4xl p-6">
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-[3rem] p-12 relative overflow-hidden">
        <div className="flex justify-between items-center mb-10">
          <button onClick={onBackToTutor} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold">
            <ArrowLeft size={18} /> Exit Quiz
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm font-black text-slate-500 tracking-widest uppercase">Question {currentQuestionIndex + 1}/{questions.length}</span>
            <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-indigo-500 to-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <h2 className="text-3xl font-black text-white mb-12 leading-snug tracking-tight">
          {currentQ.question}
        </h2>

        <div className="grid gap-4 mb-12">
          {currentQ.options.map((opt, i) => (
            <motion.button
              key={i}
              whileHover={{ x: 10 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedAnswer(opt)}
              className={`w-full p-6 rounded-2xl text-left border transition-all text-lg font-bold flex items-center gap-4 group ${
                selectedAnswer === opt 
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20" 
                  : "bg-slate-900/40 border-white/5 text-slate-300 hover:bg-slate-800 hover:border-white/10"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm ${
                selectedAnswer === opt ? "bg-white/20 text-white" : "bg-slate-800 text-slate-500"
              }`}>
                {String.fromCharCode(65 + i)}
              </div>
              {opt}
            </motion.button>
          ))}
        </div>

        <button 
          onClick={handleNextQuestion} 
          disabled={!selectedAnswer}
          className="w-full btn-accent py-5 text-xl flex items-center justify-center gap-4 group disabled:opacity-20"
        >
          {currentQuestionIndex < questions.length - 1 ? "Proceed to Next" : "Finalize Assessment"}
          <Send className="group-hover:translate-x-2 transition-transform" size={20} />
        </button>
      </motion.div>
    </div>
  );
}

export default Quiz;