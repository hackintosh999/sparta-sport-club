import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Info, CheckCircle, AlertCircle, Filter, Trash2, CheckSquare, ExternalLink } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface NotificationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: any[];
    onMarkAsRead: (id: string) => Promise<void>;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose, notifications, onMarkAsRead }) => {
    const [filter, setFilter] = useState<'all' | 'request' | 'news'>('all');
    const [sort, setSort] = useState<'newest' | 'oldest' | 'unread'>('newest');
    const navigate = useNavigate();

    // Internal fetching removed in favor of props

    const deleteNotification = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await deleteDoc(doc(db, "notifications", id));
        } catch (err) {
            console.error(err);
        }
    };

    const clearAll = async () => {
        if (notifications.length === 0) return;
        if (!window.confirm("Удалить все уведомления?")) return;

        const batch = writeBatch(db);
        notifications.forEach(n => {
            batch.delete(doc(db, "notifications", n.id));
        });
        await batch.commit();
    };

    const markAllAsRead = async () => {
        const unread = notifications.filter(n => !n.isRead);
        if (unread.length === 0) return;

        const batch = writeBatch(db);
        unread.forEach(n => {
            batch.update(doc(db, "notifications", n.id), { isRead: true });
        });
        await batch.commit();
    };

    const handleNotificationClick = async (note: any) => {
        // Mark as read first
        if (!note.isRead) {
            onMarkAsRead(note.id);
        }

        onClose(); // Close modal

        // Navigate based on type
        if (note.type === 'request' && note.relatedId) {
            navigate(`/dashboard?ticketId=${note.relatedId}`);
        } else if (note.type === 'news' && note.relatedId) {
            navigate(`/?newsId=${note.relatedId}#news`);
        }
    };

    const getSortedNotifications = () => {
        let filtered = notifications.filter(n => filter === 'all' || n.type === filter);

        return filtered.sort((a, b) => {
            if (sort === 'unread') {
                if (a.isRead === b.isRead) return b.createdAt?.seconds - a.createdAt?.seconds; // Secondary sort by date
                return a.isRead ? 1 : -1; // Unread first
            }
            if (sort === 'oldest') {
                return a.createdAt?.seconds - b.createdAt?.seconds;
            }
            // newest (default)
            return b.createdAt?.seconds - a.createdAt?.seconds;
        });
    };

    const processedNotifications = getSortedNotifications();
    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
                    />
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-y-0 right-0 z-[70] w-full max-w-md bg-[#111] border-l border-white/10 shadow-2xl flex flex-col font-manrope"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#1a1a1a]">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Bell className="text-sparta-gold" size={24} />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-[#1a1a1a]" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-xl font-russo text-white">Уведомления</h2>
                                    <p className="text-xs text-white/40">{unreadCount} непрочитанных</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Actions Toolkit */}
                        <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between gap-2">
                            <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                                <button
                                    onClick={() => setSort('newest')}
                                    className={`px-3 py-1 text-xs rounded-md transition-all ${sort === 'newest' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                                >
                                    Новые
                                </button>
                                <button
                                    onClick={() => setSort('unread')}
                                    className={`px-3 py-1 text-xs rounded-md transition-all ${sort === 'unread' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                                >
                                    Непрочитанные
                                </button>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={markAllAsRead}
                                    disabled={unreadCount === 0}
                                    className="p-2 text-white/40 hover:text-sparta-gold disabled:opacity-30 transition-colors"
                                    title="Прочитать все"
                                >
                                    <CheckSquare size={18} />
                                </button>
                                <button
                                    onClick={clearAll}
                                    disabled={notifications.length === 0}
                                    className="p-2 text-white/40 hover:text-red-500 disabled:opacity-30 transition-colors"
                                    title="Удалить все"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Filters Chips */}
                        <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${filter === 'all' ? 'bg-sparta-gold text-black border-sparta-gold' : 'bg-transparent text-white/50 border-white/10 hover:border-white/30'}`}
                            >
                                Все
                            </button>
                            <button
                                onClick={() => setFilter('request')}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${filter === 'request' ? 'bg-sparta-gold text-black border-sparta-gold' : 'bg-transparent text-white/50 border-white/10 hover:border-white/30'}`}
                            >
                                Заявки
                            </button>
                            <button
                                onClick={() => setFilter('news')}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${filter === 'news' ? 'bg-sparta-gold text-black border-sparta-gold' : 'bg-transparent text-white/50 border-white/10 hover:border-white/30'}`}
                            >
                                Новости
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {processedNotifications.length > 0 ? (
                                processedNotifications.map((note) => (
                                    <motion.div
                                        key={note.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${note.isRead ? 'bg-white/5 border-white/5 opacity-60 hover:opacity-100' : 'bg-[#1a1a1a] border-sparta-gold/30 shadow-[0_4px_20px_rgba(0,0,0,0.2)]'}`}
                                        onClick={() => handleNotificationClick(note)}
                                    >
                                        {!note.isRead && (
                                            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-sparta-gold shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                                        )}

                                        <div className="flex items-start gap-3">
                                            <div className={`mt-1 p-2 rounded-lg shrink-0 ${note.type === 'request' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                                                {note.type === 'request' ? <Info size={16} /> : <AlertCircle size={16} />}
                                            </div>
                                            <div className="flex-1 min-w-0 pr-6">
                                                <h4 className="text-white font-bold text-sm mb-1 truncate pr-2">{note.title}</h4>
                                                <p className="text-white/70 text-xs leading-relaxed mb-3 line-clamp-2">{note.message}</p>

                                                <div className="flex items-center justify-between">
                                                    <span className="text-white/30 text-[10px]">
                                                        {note.createdAt?.seconds ? format(new Date(note.createdAt.seconds * 1000), 'd MMM HH:mm', { locale: ru }) : 'Недавно'}
                                                    </span>
                                                    <span className="text-sparta-gold text-[10px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase tracking-wider">
                                                        {note.type === 'request' ? 'В чат' : 'Читать'} <ExternalLink size={10} />
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => deleteNotification(note.id, e)}
                                                className="absolute bottom-3 right-3 text-white/10 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                                                title="Удалить"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-4">
                                    <Bell size={48} className="opacity-20 translate-y-[-20px]" />
                                    <p className="text-sm">Уведомлений пока нет</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default NotificationsModal;
