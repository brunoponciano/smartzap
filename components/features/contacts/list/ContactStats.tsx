'use client';

import React from 'react';
import { Users, UserCheck, UserX } from 'lucide-react';
import type { ContactStatsData } from './types';

export interface ContactStatsProps {
  stats: ContactStatsData;
}

export const ContactStats: React.FC<ContactStatsProps> = ({ stats }) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <Users size={13} className="text-blue-400 shrink-0" />
        <span className="text-xs text-[var(--ds-text-secondary)]">Total</span>
        <span className="text-xs font-semibold text-blue-400">{(stats?.total ?? 0).toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <UserCheck size={13} className="text-emerald-400 shrink-0" />
        <span className="text-xs text-[var(--ds-text-secondary)]">Opt-in</span>
        <span className="text-xs font-semibold text-emerald-400">{(stats?.optIn ?? 0).toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-500/10 border border-zinc-500/20">
        <UserX size={13} className="text-zinc-400 shrink-0" />
        <span className="text-xs text-[var(--ds-text-secondary)]">Inativos</span>
        <span className="text-xs font-semibold text-zinc-400">{(stats?.optOut ?? 0).toLocaleString()}</span>
      </div>
    </div>
  );
};
