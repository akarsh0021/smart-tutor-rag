import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Lock, UserPlus, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

function Register({ onRegisterSuccess, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError("All fields are required");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Account created successfully!");
        setTimeout(() => onSwitchToLogin(), 1500);
      } else {
        setError(data.detail || "Registration failed");
      }
    } catch (err) {
      setError("Network error. Please ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-lg p-6"
    >
      <div className="glass-card rounded-[2.5rem] p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -ml-16 -mt-16"></div>
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-amber-600 to-amber-400 rounded-3xl shadow-xl shadow-amber-500/20 mb-6">
            <UserPlus className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Join AI Tutor</h1>
          <p className="text-slate-400 font-medium">Start your personalized learning path</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-200 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-200 text-sm flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            {success}
          </motion.div>
        )}

        <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-slate-300 ml-1">Full Name</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
              <input name="name" type="text" value={formData.name} onChange={handleChange} disabled={loading}
                className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                placeholder="John Doe" required />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-slate-300 ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
              <input name="email" type="email" value={formData.email} onChange={handleChange} disabled={loading}
                className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                placeholder="name@example.com" required />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
              <input name="password" type="password" value={formData.password} onChange={handleChange} disabled={loading}
                className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                placeholder="••••••••" required />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 ml-1">Confirm Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
              <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} disabled={loading}
                className="w-full pl-12 pr-4 py-4 bg-slate-950/50 border border-white/5 rounded-2xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                placeholder="••••••••" required />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="md:col-span-2 w-full btn-accent py-4 mt-4 flex items-center justify-center gap-2 group"
          >
            {loading ? "Creating account..." : (
              <>
                Create Account
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-white/5 text-center">
          <p className="text-slate-500 text-sm mb-4">Already have an account?</p>
          <button onClick={onSwitchToLogin} disabled={loading}
            className="text-amber-400 hover:text-amber-300 font-semibold transition-colors mx-auto"
          >
            Sign in here
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default Register;