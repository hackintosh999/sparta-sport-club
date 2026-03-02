import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, Timestamp, doc, updateDoc, arrayUnion, or } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { MessageSquare, Send, User, ChevronRight, Plus, Clock, CheckCircle2, Circle, Search, Paperclip, X, Image as ImageIcon, Smile, Star, Check, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface MessageHistory {
    text: string;
    sender: 'user' | 'admin';
    senderName: string;
    createdAt: Timestamp;
    image?: string;
    isRead?: boolean;
}

interface Ticket {
    id: string;
    subject: string;
    status: 'new' | 'in_progress' | 'resolved';
    createdAt: Timestamp;
    thread?: MessageHistory[];
    message: string; // Initial message
    isReadByUser?: boolean;
    rating?: number;
    isTyping?: {
        admin?: boolean;
        user?: boolean;
    };
    userId?: string | null;
    email?: string;
}

interface UserRequestsProps {
    ticketId?: string | null;
}

const UserRequests: React.FC<UserRequestsProps> = ({ ticketId }) => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

    // Auto-select ticket from prop (deep link)
    useEffect(() => {
        if (ticketId) {
            setSelectedTicketId(ticketId);
            setFilterStatus('all'); // Ensure it's not hidden by active filter
        }
    }, [ticketId]);
    const [replyText, setReplyText] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // New Features State
    const [searchQuery, setSearchQuery] = useState('');
    const [attachment, setAttachment] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'closed'>('all');
    const [isAgentTyping, setIsAgentTyping] = useState(false);

    // New Ticket Form State
    const [newSubject, setNewSubject] = useState('');
    const [newMessage, setNewMessage] = useState('');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Close emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.emoji-picker-container')) {
                setShowEmojiPicker(false);
            }
        };

        if (showEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "messages"),
            or(
                where("userId", "==", user.uid),
                where("email", "==", user.email)
            )
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));

            // Client-side sorting: newest first
            loadedTickets.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });

            setTickets(loadedTickets);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tickets:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Self-healing: If messages found by email are missing userId, update them
    useEffect(() => {
        if (!user || tickets.length === 0) return;

        const orphanTickets = tickets.filter(t => !t.userId && t.email === user.email);
        if (orphanTickets.length > 0) {
            orphanTickets.forEach(async (ticket) => {
                try {
                    await updateDoc(doc(db, "messages", ticket.id), {
                        userId: user.uid
                    });
                } catch (e) {
                    console.error("Error healing ticket userId:", e);
                }
            });
        }
    }, [tickets, user]);

    // Force real-time update for the specific active ticket (redundancy for safety)
    useEffect(() => {
        if (!selectedTicketId) {
            setIsAgentTyping(false);
            return;
        }

        const unsubscribe = onSnapshot(doc(db, "messages", selectedTicketId), (docSnapshot) => {
            if (docSnapshot.exists()) {
                const updatedTicket = { id: docSnapshot.id, ...docSnapshot.data() } as Ticket;

                // Update tickets list
                setTickets((prevTickets) =>
                    prevTickets.map(t => t.id === updatedTicket.id ? updatedTicket : t)
                );

                // Update typing status
                if (updatedTicket.isTyping?.admin) {
                    setIsAgentTyping(true);
                } else {
                    setIsAgentTyping(false);
                }
            }
        }, (error) => {
            console.error("Error fetching ticket details:", error);
        });

        return () => unsubscribe();
    }, [selectedTicketId]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachment(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEmojiClick = (emoji: string) => {
        setReplyText(prev => prev + emoji);
        setShowEmojiPicker(false); // Optional: keep open if multi-select desired
    };

    const handleSendReply = async () => {
        if ((!replyText.trim() && !attachment) || !selectedTicketId) return;

        const reply: any = {
            text: replyText,
            sender: 'user',
            senderName: user?.displayName || 'Пользователь',
            createdAt: Timestamp.now()
        };

        if (attachment) {
            reply.image = attachment;
        }

        try {
            await updateDoc(doc(db, "messages", selectedTicketId), {
                thread: arrayUnion(reply),
                status: 'new' // Re-open or mark as updated for admin
            });

            setReplyText('');
            setAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const handleCreateTicket = async () => {
        if (!newSubject.trim() || !newMessage.trim()) return;

        const docRef = await addDoc(collection(db, "messages"), {
            userId: user?.uid,
            name: user?.displayName || 'Пользователь',
            email: user?.email,
            subject: newSubject,
            message: newMessage, // Initial message is stored here
            status: 'new',
            createdAt: Timestamp.now(),
            thread: [{
                text: newMessage,
                sender: 'user',
                senderName: user?.displayName || 'Пользователь',
                createdAt: Timestamp.now()
            }]
        });

        setIsCreating(false);
        setNewSubject('');
        setNewMessage('');
        setSelectedTicketId(docRef.id); // Auto-open the new chat
    };

    const selectedTicket = tickets.find(t => t.id === selectedTicketId);

    const filteredTickets = tickets.filter(t => {
        const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all'
            ? true
            : filterStatus === 'active'
                ? ['new', 'in_progress'].includes(t.status)
                : t.status === 'resolved';
        return matchesSearch && matchesFilter;
    });

    // Auto-scroll when thread updates
    useEffect(() => {
        scrollToBottom();
    }, [selectedTicket?.thread, selectedTicketId, isAgentTyping]);

    // Mark as read when opening a ticket with unread admin messages
    useEffect(() => {
        if (selectedTicketId && selectedTicket) {
            const thread = selectedTicket.thread || [];
            if (thread.length > 0) {
                const lastMsg = thread[thread.length - 1];
                // If last message is from admin and not marked read, mark it
                if (lastMsg.sender === 'admin' && selectedTicket.isReadByUser !== true) {
                    updateDoc(doc(db, "messages", selectedTicketId), { isReadByUser: true });
                }
            }
        }
    }, [selectedTicketId, selectedTicket]);

    const handleRateTicket = async (rating: number) => {
        if (!selectedTicketId) return;

        if (rating === 5) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }

        try {
            await updateDoc(doc(db, "messages", selectedTicketId), {
                rating: rating
            });
        } catch (error) {
            console.error("Error rating ticket:", error);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'new': return { label: 'Новое', color: 'text-sparta-gold', icon: Circle };
            case 'in_progress': return { label: 'В работе', color: 'text-blue-400', icon: Clock };
            case 'resolved': return { label: 'Решено', color: 'text-green-500', icon: CheckCircle2 };
            default: return { label: status, color: 'text-gray-400', icon: Circle };
        }
    };

    const StatusIcon = selectedTicket ? getStatusInfo(selectedTicket.status).icon : Circle;

    if (loading) return <div className="p-8 text-center text-white/50">Загрузка...</div>;

    return (
        <div className="h-[600px] flex flex-col md:flex-row gap-6 font-manrope">
            {/* List Sidebar */}
            <div className={`flex-1 md:w-1/3 flex flex-col ${selectedTicketId ? 'hidden md:flex' : ''}`}>
                <div className="flex flex-col gap-4 mb-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-russo text-white">Мои обращения</h2>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="p-2 bg-sparta-gold rounded-full text-black hover:bg-white transition-colors"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                        <input
                            type="text"
                            placeholder="Поиск обращений..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-sparta-gold outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                    {isCreating && (
                        <div className="bg-white/5 rounded-xl p-4 border border-sparta-gold/50 animate-in fade-in slide-in-from-top-2">
                            <input
                                type="text"
                                placeholder="Тема (например, Оплата)"
                                value={newSubject}
                                onChange={(e) => setNewSubject(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white mb-2 text-sm focus:border-sparta-gold outline-none"
                            />
                            <textarea
                                placeholder="Опишите проблему..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                rows={3}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white mb-2 text-sm focus:border-sparta-gold outline-none resize-none"
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsCreating(false)} className="px-3 py-1 text-xs text-white/50 hover:text-white">Отмена</button>
                                <button onClick={handleCreateTicket} className="px-3 py-1 bg-sparta-gold text-black rounded-lg text-xs font-bold hover:bg-white transition-colors">Создать</button>
                            </div>
                        </div>
                    )}

                    {filteredTickets.map(ticket => {
                        const status = getStatusInfo(ticket.status);
                        const Icon = status.icon;
                        return (
                            <div
                                key={ticket.id}
                                onClick={() => setSelectedTicketId(ticket.id)}
                                className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedTicketId === ticket.id ? 'bg-white/10 border-sparta-gold' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-white truncate pr-2">{ticket.subject}</h3>
                                    <Icon size={16} className={status.color} />
                                </div>
                                <p className="text-white/50 text-xs line-clamp-2 mb-2">{ticket.message}</p>
                                <div className="flex justify-between items-center text-[10px] text-white/30">
                                    <span>{format(ticket.createdAt.toDate(), 'd MMM HH:mm', { locale: ru })}</span>
                                    {ticket.status === 'in_progress' && <span className="text-blue-400">В работе</span>}
                                </div>
                            </div>
                        );
                    })}

                    {tickets.length === 0 && !isCreating && (
                        <div className="text-center text-white/30 py-8">
                            <MessageSquare className="mx-auto mb-2 opacity-50" />
                            <p>Нет обращений</p>
                        </div>
                    )}
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-4 px-1">
                    {[
                        { id: 'all', label: 'Все' },
                        { id: 'active', label: 'Активные' },
                        { id: 'closed', label: 'Закрытые' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterStatus(tab.id as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === tab.id
                                ? 'bg-sparta-gold text-black shadow-[0_0_10px_rgba(212,175,55,0.2)]'
                                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-[2] bg-white/5 rounded-3xl overflow-hidden flex flex-col border border-white/10 ${!selectedTicketId ? 'hidden md:flex' : ''}`}>
                {selectedTicket ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-black/20">
                            <button onClick={() => setSelectedTicketId(null)} className="md:hidden text-white/50">
                                <ChevronRight className="rotate-180" />
                            </button>
                            <div>
                                <h3 className="text-white font-bold text-lg">{selectedTicket.subject}</h3>
                                <div className="flex items-center gap-2 text-xs text-white/50">
                                    <span className="text-sparta-gold">#{selectedTicket.id.slice(-6)}</span>
                                    <span>•</span>
                                    <span>{format(selectedTicket.createdAt.toDate(), 'd MMMM yyyy', { locale: ru })}</span>
                                </div>
                            </div>
                            <div className={`ml-auto px-3 py-1 rounded-full text-xs border bg-black/40 ${getStatusInfo(selectedTicket.status).color} ${selectedTicket.status === 'resolved' ? 'border-green-500/30' : 'border-white/10'}`}>
                                {getStatusInfo(selectedTicket.status).label}
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Initial Message (if not in thread) */}
                            {(!selectedTicket.thread || selectedTicket.thread.length === 0) && (
                                <div className="flex justify-end">
                                    <div className="max-w-[80%] bg-sparta-gold/20 text-white rounded-2xl rounded-tr-none p-4">
                                        <div className="text-sm">{selectedTicket.message}</div>
                                        <div className="text-[10px] text-white/40 mt-1 text-right">
                                            {format(selectedTicket.createdAt.toDate(), 'HH:mm')}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Thread with Date Headers */}
                            <AnimatePresence mode="popLayout">
                                {selectedTicket.thread?.map((msg, idx) => {
                                    const isUser = msg.sender === 'user';
                                    const msgDate = msg.createdAt.toDate();

                                    // Determine if we need to show a date header
                                    let showDateHeader = false;
                                    if (idx === 0) {
                                        showDateHeader = true;
                                    } else {
                                        const prevMsg = selectedTicket.thread![idx - 1];
                                        const prevDate = prevMsg.createdAt.toDate();
                                        if (prevDate.toDateString() !== msgDate.toDateString()) {
                                            showDateHeader = true;
                                        }
                                    }

                                    return (
                                        <React.Fragment key={idx}>
                                            {showDateHeader && (
                                                <div className="flex justify-center my-4">
                                                    <span className="text-[10px] uppercase font-bold text-white/30 bg-white/5 px-2 py-1 rounded-full">
                                                        {isToday(msgDate) ? 'Сегодня' : isYesterday(msgDate) ? 'Вчера' : format(msgDate, 'd MMMM', { locale: ru })}
                                                    </span>
                                                </div>
                                            )}
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {!isUser && (
                                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mr-2 mt-auto">
                                                        <User size={16} className="text-sparta-gold" />
                                                    </div>
                                                )}
                                                <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm overflow-hidden ${isUser
                                                    ? 'bg-sparta-gold text-black rounded-tr-none shadow-[0_4px_15px_rgba(212,175,55,0.1)]'
                                                    : 'bg-white/10 text-white rounded-tl-none border border-white/5'
                                                    }`}>
                                                    {msg.image && (
                                                        <div className="mb-2 rounded-lg overflow-hidden border border-black/10">
                                                            <img src={msg.image} alt="attachment" className="max-w-full h-auto" />
                                                        </div>
                                                    )}
                                                    <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                                                    <div className={`text-[10px] mt-1 flex gap-2 items-center ${isUser ? 'justify-end text-black/40' : 'text-white/30'}`}>
                                                        <span>{msg.senderName}</span>
                                                        <span>{format(msgDate, 'HH:mm')}</span>
                                                        {isUser && (
                                                            <CheckCheck
                                                                size={14}
                                                                className={msg.isRead ? "text-black" : "text-black/20"}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </React.Fragment>
                                    );
                                })}
                            </AnimatePresence>
                            {isAgentTyping && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex justify-start"
                                >
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mr-2 mt-auto">
                                        <User size={16} className="text-sparta-gold" />
                                    </div>
                                    <div className="bg-white/10 text-white p-4 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-black/20 border-t border-white/10 relative">
                            {selectedTicket.status === 'resolved' ? (
                                <div className="text-center text-white/50 text-sm py-4">
                                    <div className="mb-2 text-white">Вопрос решен? Оцените работу поддержки:</div>
                                    <div className="flex justify-center gap-2">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                onClick={() => handleRateTicket(star)}
                                                className={`transition-colors ${selectedTicket.rating && star <= selectedTicket.rating ? 'text-sparta-gold' : 'text-white/20 hover:text-sparta-gold'}`}
                                            >
                                                <Star size={24} className={selectedTicket.rating && star <= selectedTicket.rating ? 'fill-sparta-gold' : ''} />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-4 text-xs">Обращение закрыто. Создайте новое, если возникли вопросы.</div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {/* Quick Replies */}
                                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                        {["Где проходит тренировка?", "Какая стоимость?", "Как записаться?", "График работы"].map((reply, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setReplyText(reply)}
                                                className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-white/70 hover:text-white transition-colors whitespace-nowrap"
                                            >
                                                {reply}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Attachment Preview */}
                                    {attachment && (
                                        <div className="relative inline-block w-20 h-20 rounded-lg overflow-hidden border border-sparta-gold/50">
                                            <img src={attachment} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => setAttachment(null)}
                                                className="absolute top-1 right-1 bg-black/50 hover:bg-black rounded-full p-0.5 text-white transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Emoji Picker Popup */}
                                    <AnimatePresence>
                                        {showEmojiPicker && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                className="absolute bottom-20 left-4 bg-[#1a1a1a] border border-white/10 rounded-xl p-3 shadow-2xl z-50 emoji-picker-container w-64"
                                            >
                                                <div className="grid grid-cols-6 gap-2">
                                                    {["😊", "👍", "👎", "👋", "🔥", "⚽", "💪", "🏆", "📅", "✅", "❌", "❓", "😎", "🤔", "😢", "🎉", "🤝", "🥇"].map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            onClick={() => handleEmojiClick(emoji)}
                                                            className="text-xl hover:bg-white/10 p-1 rounded transition-colors"
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="flex gap-2 items-end">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            ref={fileInputRef}
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className={`p-3 rounded-xl transition-colors mb-[1px] emoji-picker-container ${showEmojiPicker ? 'bg-white/10 text-white' : 'bg-white/5 text-white/50 hover:text-white'}`}
                                            title="Смайлики"
                                        >
                                            <Smile size={20} />
                                        </button>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`p-3 rounded-xl transition-colors mb-[1px] ${attachment ? 'bg-sparta-gold text-black' : 'bg-white/5 text-white/50 hover:text-white'}`}
                                            title="Прикрепить изображение"
                                        >
                                            <Paperclip size={20} />
                                        </button>

                                        <textarea
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendReply();
                                                }
                                            }}
                                            placeholder="Напишите сообщение..."
                                            rows={1}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-sparta-gold outline-none resize-none min-h-[46px] max-h-[120px]"
                                            style={{ height: 'auto' }}
                                            onInput={(e) => {
                                                e.currentTarget.style.height = 'auto';
                                                e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                                            }}
                                        />
                                        <button
                                            onClick={handleSendReply}
                                            disabled={!replyText.trim() && !attachment}
                                            className="p-3 bg-sparta-gold text-black rounded-xl hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-[1px]"
                                        >
                                            <Send size={20} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[url('https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center relative">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
                            <div className="w-20 h-20 bg-sparta-gold/10 rounded-full flex items-center justify-center mb-6 border border-sparta-gold/20 shadow-[0_0_30px_rgba(212,175,55,0.1)]">
                                <MessageSquare size={32} className="text-sparta-gold" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Поддержка Sparta</h3>
                            <p className="text-white/50 mb-8">
                                Выберите обращение из списка слева или создайте новое.
                                Мы обычно отвечаем в течение 15 минут в рабочее время.
                            </p>

                            <div className="grid grid-cols-2 gap-4 w-full text-sm">
                                <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col items-center gap-2">
                                    <Clock size={20} className="text-sparta-gold" />
                                    <span className="text-white">09:00 - 21:00</span>
                                    <span className="text-white/30 text-xs">Время работы</span>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col items-center gap-2">
                                    <CheckCircle2 size={20} className="text-green-500" />
                                    <span className="text-white">Онлайн</span>
                                    <span className="text-white/30 text-xs">Статус поддержки</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserRequests;
