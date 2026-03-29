"use client";

import { useState, useEffect } from "react";
import { GameBoard } from "../components/GameBoard";
import { Play, PenTool, LogOut, Globe, Users, LogIn } from "lucide-react";
import { useLanguage } from "../components/LanguageContext";
import { useRouter } from "next/navigation";

type AppState = 'menu' | 'play' | 'create_deck' | 'exit';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('menu');
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("cardsim_token");
    if (!token) {
      router.push("/auth");
    } else {
      setIsLoggedIn(true);
      setIsChecking(false);
    }
  }, [router]);

  const handleAuthCheck = (route: string) => {
    const token = localStorage.getItem("cardsim_token");
    if (!token) {
      router.push("/auth");
    } else {
      if (route === "deck") router.push("/deck-builder");
      if (route === "lobby") router.push("/lobby");
    }
  };

  if (appState === 'play') {
    return <GameBoard onExit={() => setAppState('menu')} />;
  }

  if (appState === 'exit') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-slate-500">
        <p>El juego se ha cerrado. Puedes cerrar esta pestaña.</p>
      </div>
    );
  }

  if (isChecking) {
    return <div className="h-screen w-screen bg-slate-900 pointer-events-none" />;
  }

  // Main Menu
  return (
    <div className="h-screen w-screen relative flex items-center justify-center overflow-hidden bg-slate-900 m-0 p-0">
      
      {/* Cool animated background effect */}
      <div className="absolute inset-0 z-0">
         <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] animate-pulse" />
         <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <button 
        onClick={() => setLanguage(language === 'en' ? 'ja' : 'en')}
        className="absolute top-6 right-6 z-20 flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 text-white px-4 py-2 rounded-full backdrop-blur-md border border-white/10 transition-colors"
      >
        <Globe size={18} />
        <span className="font-bold">{language.toUpperCase()}</span>
      </button>

      <main className="relative z-10 glass border border-white/10 p-12 rounded-3xl shadow-2xl flex flex-col items-center min-w-[400px]">
        
        <div className="flex flex-col items-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl shadow-lg mb-4 flex items-center justify-center transform -rotate-6">
            <span className="text-white font-black text-4xl">CS</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Card<span className="text-emerald-400">Sim</span></h1>
          <p className="text-slate-400 font-medium">Simulador Estratégico de Cartas</p>
        </div>

        <div className="flex flex-col gap-4 w-full">
          {isLoggedIn ? (
            <>
              <button 
                onClick={() => setAppState('play')}
                className="group relative flex items-center justify-center gap-3 w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all rounded-xl font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                <Play className="relative z-10" fill="currentColor" size={20} />
                <span className="relative z-10 text-lg tracking-wide uppercase">{t("ローカルプレイ", "Local Play")}</span>
              </button>

              <button 
                onClick={() => handleAuthCheck('lobby')}
                className="group relative flex items-center justify-center gap-3 w-full py-4 px-6 bg-purple-600 hover:bg-purple-500 hover:scale-105 active:scale-95 transition-all rounded-xl font-bold text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                <Users className="relative z-10" fill="currentColor" size={20} />
                <span className="relative z-10 text-lg tracking-wide uppercase">{t("マルチプレイ", "Multiplayer")}</span>
              </button>

              <button 
                onClick={() => handleAuthCheck('deck')}
                className="flex items-center justify-center gap-3 w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all rounded-xl font-semibold text-slate-200 border border-slate-700"
              >
                <PenTool size={18} />
                <span className="tracking-wide">{t("デッキ構築", "Deck Builder")}</span>
              </button>
            </>
          ) : null}

          <button 
            onClick={() => {
              localStorage.removeItem("cardsim_token");
              setIsLoggedIn(false);
              router.push('/auth');
            }}
            className="flex items-center justify-center gap-3 w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all rounded-xl font-semibold text-slate-200 border border-slate-700 mt-2"
          >
            <LogOut size={18} />
            <span className="tracking-wide">{t("ログアウト", "Logout")}</span>
          </button>
        </div>
      </main>

    </div>
  );
}
