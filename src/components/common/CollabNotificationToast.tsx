import React, { useEffect } from 'react';
import { Users, Sparkles, X } from 'lucide-react';

export interface CollabToastData {
  id: string;
  senderName: string;
  senderColor?: string;
  message: string;
  type?: 'update' | 'join' | 'leave';
}

interface CollabNotificationToastProps {
  toast: CollabToastData | null;
  onDismiss: () => void;
}

export const CollabNotificationToast: React.FC<CollabNotificationToastProps> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-slide-up max-w-sm w-full">
      <div className="bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 rounded-xl p-3 shadow-2xl flex items-center justify-between gap-3 text-xs text-slate-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-[11px] shrink-0 shadow"
            style={{ backgroundColor: toast.senderColor || '#10b981' }}
          >
            {toast.senderName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-100 flex items-center gap-1.5 truncate">
              <span>{toast.senderName}</span>
              {toast.type === 'update' && <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />}
              {toast.type === 'join' && <Users className="w-3 h-3 text-blue-400 shrink-0" />}
            </div>
            <div className="text-[11px] text-slate-400 truncate">{toast.message}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
