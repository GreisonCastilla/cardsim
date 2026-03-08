"use client";

import { useState } from "react";
import { GameBoard } from "../components/GameBoard";
import { Play, PenTool, LogOut } from "lucide-react";

type AppState = 'menu' | 'play' | 'create_deck' | 'exit';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('menu');

  if (appState === 'play') {
    return <GameBoard onExit={() => setAppState('menu')} />;
  }

  if (appState === 'create_deck') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <h1 className="text-3xl font-bold mb-8 text-blue-400">Constructor de Mazos (Próximamente)</h1>
        <button 
          onClick={() => setAppState('menu')}
          className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
        >
          Volver al Menú
        </button>
      </div>
    );
  }

  if (appState === 'exit') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-slate-500">
        <p>El juego se ha cerrado. Puedes cerrar esta pestaña.</p>
      </div>
    );
  }

  // Main Menu
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-900">
      
      {/* Cool animated background effect */}
      <div className="absolute inset-0 z-0">
         <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] animate-pulse" />
         <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <main className="relative z-10 glass border border-white/10 p-12 rounded-3xl shadow-2xl flex flex-col items-center min-w-[400px]">
        
        <div className="flex flex-col items-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl shadow-lg mb-4 flex items-center justify-center transform -rotate-6">
            <span className="text-white font-black text-4xl">CS</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Card<span className="text-emerald-400">Sim</span></h1>
          <p className="text-slate-400 font-medium">Simulador Estratégico de Cartas</p>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <button 
            onClick={() => setAppState('play')}
            className="group relative flex items-center justify-center gap-3 w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all rounded-xl font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
            <Play className="relative z-10" fill="currentColor" size={20} />
            <span className="relative z-10 text-lg tracking-wide uppercase">Jugar Local</span>
          </button>

          <button 
            onClick={() => setAppState('create_deck')}
            className="flex items-center justify-center gap-3 w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 hover:scale-105 active:scale-95 transition-all rounded-xl font-semibold text-slate-200 border border-slate-700"
          >
            <PenTool size={18} />
            <span className="tracking-wide">Crear Mazo</span>
          </button>

          <button 
            onClick={() => setAppState('exit')}
            className="flex items-center justify-center gap-3 w-full py-3 px-6 hover:bg-red-500/10 hover:text-red-400 active:scale-95 transition-all rounded-xl font-medium text-slate-500 mt-2"
          >
            <LogOut size={18} />
            <span>Salir</span>
          </button>
        </div>
      </main>

    </div>
  );
}
