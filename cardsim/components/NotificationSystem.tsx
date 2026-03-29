"use client";

import React from "react";
import { cn } from "../lib/utils";

export interface NotificationState {
  msg: string;
  type: 'error' | 'info';
}

interface NotificationSystemProps {
  notification: NotificationState | null;
}

export function NotificationSystem({ notification }: NotificationSystemProps) {
  if (!notification) return null;

  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[3000] animate-in slide-in-from-top-4 fade-in duration-500">
      <div className={cn(
        "px-8 py-3.5 rounded-2xl border shadow-4xl backdrop-blur-2xl flex items-center gap-4 transition-all scale-100 hover:scale-105",
        notification.type === 'error' ? "bg-red-950/80 border-red-500/40 text-red-100 shadow-red-900/20" : "bg-blue-950/80 border-blue-500/40 text-blue-100 shadow-blue-900/20"
      )}>
        <div className={cn("w-2.5 h-2.5 rounded-full", notification.type === 'error' ? "bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]")} />
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] leading-none mb-1">{notification.type === 'error' ? 'Action Denied' : 'Information'}</span>
          <span className="text-[9px] font-bold text-white/70 tracking-wider low-case">{notification.msg}</span>
        </div>
      </div>
    </div>
  );
}
