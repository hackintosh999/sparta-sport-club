import React from 'react';
import { Ban, Lock, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface BannedScreenProps {
    banDetails: {
        reason: string;
        expiresAt: number | null;
        type: string;
    };
}

const BannedScreen: React.FC<BannedScreenProps> = ({ banDetails }) => {
    const { logout } = useAuth();

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-red-900/10 pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 to-sparta-gold" />

            <div className="max-w-xl w-full bg-[#121212] border border-red-500/30 rounded-3xl p-8 relative overflow-hidden shadow-[0_0_100px_rgba(220,38,38,0.2)]">
                {/* Background Pattern */}
                <Ban className="absolute -right-10 -bottom-10 text-red-500/5 rotate-12" size={300} />

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20 animate-pulse">
                        <Lock size={48} className="text-red-500" />
                    </div>

                    <h1 className="text-4xl font-russo text-white mb-2 uppercase tracking-wider">Доступ запрещен</h1>
                    <div className="px-3 py-1 rounded bg-red-500/20 text-red-500 text-xs font-bold uppercase mb-8 border border-red-500/20">
                        Ваш аккаунт заблокирован
                    </div>

                    <div className="w-full bg-red-500/5 rounded-xl p-6 border border-red-500/10 mb-8">
                        <h3 className="text-red-400 text-xs font-bold uppercase mb-2">Причина блокировки</h3>
                        <p className="text-white text-lg font-medium">"{banDetails.reason}"</p>
                    </div>

                    <div className="flex items-center gap-2 text-white/50 text-sm mb-8">
                        <Clock size={16} />
                        {banDetails.expiresAt ? (
                            <span>
                                Истекает через: <span className="text-white font-bold">{formatDistanceToNow(banDetails.expiresAt, { locale: ru })}</span>
                            </span>
                        ) : (
                            <span className="text-red-500 font-bold uppercase">Навсегда</span>
                        )}
                    </div>

                    <button
                        onClick={logout}
                        className="px-8 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold border border-white/10 transition-colors"
                    >
                        Выйти из аккаунта
                    </button>

                    <p className="mt-8 text-white/20 text-xs">
                        ID блокировки: {Math.random().toString(36).substr(2, 9).toUpperCase()}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BannedScreen;
