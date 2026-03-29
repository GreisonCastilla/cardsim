"use client";

import { useState } from "react";
import { login, register } from "../../lib/api";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const data = await login(username, password);
        localStorage.setItem("cardsim_token", data.token);
        alert("Login success!");
        window.location.href = "/";
      } else {
        await register(username, email, password);
        alert("Registered! You can now login.");
        setIsLogin(true);
      }
    } catch (err) {
      alert("Error: " + err);
    }
  };

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    try {
      if (response.credential) {
        // Here we hit our Go backend Google Auth endpoint
        const res = await fetch("http://localhost:8080/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: response.credential })
        });
        
        if (!res.ok) throw new Error("Google login failed on backend");
        
        const data = await res.json();
        localStorage.setItem("cardsim_token", data.token);
        alert("Google Login success!");
        window.location.href = "/";
      }
    } catch (err) {
      alert("Google Login Error: " + err);
    }
  };

  return (
    <div className="h-screen w-screen relative flex items-center justify-center overflow-hidden bg-slate-900 m-0 p-0 text-white">
      {/* Background effect matching main page */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] animate-pulse" />
         <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 glass border border-white/10 p-10 rounded-3xl shadow-2xl flex flex-col items-center w-[400px]">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl shadow-lg mb-4 flex items-center justify-center transform -rotate-6">
          <span className="text-white font-black text-3xl">CS</span>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white mb-8">{isLogin ? "Iniciar Sesión" : "Registrarse"}</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="p-2 rounded bg-slate-700 border border-slate-600 focus:outline-none focus:border-blue-500"
            required
          />
          {!isLogin && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="p-2 rounded bg-slate-700 border border-slate-600 focus:outline-none focus:border-blue-500"
              required
            />
          )}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="p-2 rounded bg-slate-700 border border-slate-600 focus:outline-none focus:border-blue-500"
            required
          />
          <button type="submit" className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all rounded-xl font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] tracking-wide">
            {isLogin ? "Entrar" : "Crear Cuenta"}
          </button>
        </form>
        
        <div className="flex items-center w-full my-6 before:flex-1 before:border-t before:border-white/10 before:mr-3 after:flex-1 after:border-t after:border-white/10 after:ml-3">
          <span className="text-slate-400 text-sm font-semibold">O</span>
        </div>
        
        <div className="flex justify-center flex-col items-center gap-2 w-full mt-2 hover:scale-105 transition-transform">
          <GoogleLogin 
            onSuccess={handleGoogleSuccess}
            onError={() => alert("Google Login Failed")}
            theme="filled_black"
            shape="rectangular"
            text={isLogin ? "signin_with" : "signup_with"}
          />
        </div>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm font-medium text-blue-400 hover:text-blue-300 mt-6 mx-auto block transition-colors"
        >
          {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </div>
    </div>
  );
}
