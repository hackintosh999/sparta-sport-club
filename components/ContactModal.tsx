import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Mail, User, MessageSquare, AlertCircle, CheckCircle, Paperclip, Smile, Image as ImageIcon, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { addDoc, collection, serverTimestamp, query, where, orderBy, onSnapshot, doc, updateDoc, arrayUnion, Timestamp, limit, or } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';

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
    message: string;
    isReadByUser?: boolean;
    isTyping?: {
        admin?: boolean;
        user?: boolean;
    };
}

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    // Chat states
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
    const [replyText, setReplyText] = useState('');
    const [isAgentTyping, setIsAgentTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && auth.currentUser) {
            setName(auth.currentUser.displayName || '');
            setEmail(auth.currentUser.email || '');

            // Listen for the latest active ticket for this user
            const q = query(
                collection(db, "messages"),
                or(
                    where("userId", "==", auth.currentUser.uid),
                    where("email", "==", auth.currentUser.email)
                ),
                orderBy("createdAt", "desc"),
                limit(1)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                if (!snapshot.empty) {
                    const ticket = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Ticket;
                    setActiveTicket(ticket);
                    setIsAgentTyping(!!ticket.isTyping?.admin);
                } else {
                    setActiveTicket(null);
                }
            });

            return () => unsubscribe();
        }
    }, [isOpen]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [activeTicket?.thread, isAgentTyping]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await addDoc(collection(db, 'messages'), {
                userId: auth.currentUser?.uid || null,
                name,
                email,
                subject,
                message,
                status: 'new',
                createdAt: serverTimestamp(),
                thread: [{
                    text: message,
                    sender: 'user',
                    senderName: name,
                    createdAt: Timestamp.now()
                }]
            });
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setMessage('');
                setSubject('');
                // If logged in, we stay to show the chat
                if (!auth.currentUser) onClose();
            }, 2000);
        } catch (err) {
            console.error(err);
            setError('Ошибка отправки сообщения. Попробуйте позже.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !activeTicket || !auth.currentUser) return;

        const reply: MessageHistory = {
            text: replyText,
            sender: 'user',
            senderName: auth.currentUser.displayName || 'Пользователь',
            createdAt: Timestamp.now()
        };

        try {
            await updateDoc(doc(db, "messages", activeTicket.id), {
                thread: arrayUnion(reply),
                status: 'new' // Mark as new for admin
            });
            setReplyText('');
        } catch (error) {
            console.error("Error sending reply:", error);
        }
    };

    const formatMessageDate = (date: Date) => {
        if (isToday(date)) return format(date, 'HH:mm');
        if (isYesterday(date)) return 'Вчера';
        return format(date, 'd MMM', { locale: ru });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-[#121212] w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <MessageSquare className="text-sparta-gold" size={20} />
                                    {auth.currentUser && activeTicket ? activeTicket.subject : 'Написать нам'}
                                </h3>
                                <p className="text-white/40 text-xs mt-1">
                                    {auth.currentUser && activeTicket
                                        ? `ID: #${activeTicket.id.slice(-6)} • Статус: ${activeTicket.status === 'resolved' ? 'Решено' : 'В работе'}`
                                        : 'Мы ответим вам в ближайшее время'}
                                </p>
                            </div>
                            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-hidden flex flex-col bg-[#0a0a0a]">
                            {auth.currentUser && activeTicket ? (
                                <>
                                    {/* Chat Messages */}
                                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                        {activeTicket.thread?.map((msg, idx) => {
                                            const isUser = msg.sender === 'user';
                                            return (
                                                <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                                    {!isUser && (
                                                        <div className="w-8 h-8 rounded-full bg-sparta-gold/10 flex items-center justify-center mr-2 mt-auto border border-sparta-gold/20">
                                                            <User size={14} className="text-sparta-gold" />
                                                        </div>
                                                    )}
                                                    <div className={`max-w-[80%] p-4 rounded-2xl ${isUser
                                                        ? 'bg-sparta-gold text-black rounded-tr-none shadow-[0_4px_15px_rgba(212,175,55,0.1)]'
                                                        : 'bg-white/10 text-white rounded-tl-none border border-white/5'
                                                        }`}>
                                                        <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                                                        <div className={`text-[10px] mt-1 flex gap-2 items-center ${isUser ? 'justify-end text-black/40' : 'text-white/30'}`}>
                                                            <span>{formatMessageDate(msg.createdAt.toDate())}</span>
                                                            {!isUser && <span>• Администратор</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {isAgentTyping && (
                                            <div className="flex justify-start">
                                                <div className="w-8 h-8 rounded-full bg-sparta-gold/10 flex items-center justify-center mr-2 mt-auto border border-sparta-gold/20">
                                                    <User size={14} className="text-sparta-gold" />
                                                </div>
                                                <div className="bg-white/10 text-white p-4 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
                                                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                                                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                                                </div>
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input Area */}
                                    <div className="p-4 bg-white/5 border-t border-white/10 shrink-0">
                                        <div className="flex gap-2 items-end">
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
                                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-sparta-gold outline-none resize-none min-h-[46px] max-h-32 custom-scrollbar"
                                                onInput={(e) => {
                                                    e.currentTarget.style.height = 'auto';
                                                    e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                                                }}
                                            />
                                            <button
                                                onClick={handleSendReply}
                                                disabled={!replyText.trim()}
                                                className="p-3 bg-sparta-gold text-black rounded-xl hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-[1px]"
                                            >
                                                <Send size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-6">
                                    {success ? (
                                        <div className="py-12 flex flex-col items-center text-center">
                                            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                                                <CheckCircle className="text-green-500" size={32} />
                                            </div>
                                            <h4 className="text-xl font-bold text-white mb-2">Сообщение отправлено!</h4>
                                            <p className="text-white/50">Спасибо за обращение. {auth.currentUser ? 'Теперь вы можете общаться с нами прямо здесь.' : 'Мы свяжемся с вами по указанному email.'}</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            {error && (
                                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 text-red-400 text-sm">
                                                    <AlertCircle size={16} />
                                                    {error}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs text-white/50 ml-1">Ваше имя</label>
                                                    <div className="relative">
                                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                                                        <input
                                                            type="text"
                                                            value={name}
                                                            onChange={(e) => setName(e.target.value)}
                                                            required
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-sparta-gold outline-none transition-colors"
                                                            placeholder="Иван Иванов"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs text-white/50 ml-1">Email для связи</label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                                                        <input
                                                            type="email"
                                                            value={email}
                                                            onChange={(e) => setEmail(e.target.value)}
                                                            required
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-sparta-gold outline-none transition-colors"
                                                            placeholder="example@mail.ru"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs text-white/50 ml-1">Тема сообщения</label>
                                                <div className="relative">
                                                    <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                                                    <input
                                                        type="text"
                                                        value={subject}
                                                        onChange={(e) => setSubject(e.target.value)}
                                                        required
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:border-sparta-gold outline-none transition-colors"
                                                        placeholder="Вопрос по тренировкам..."
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs text-white/50 ml-1">Сообщение</label>
                                                <textarea
                                                    value={message}
                                                    onChange={(e) => setMessage(e.target.value)}
                                                    required
                                                    rows={4}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-sparta-gold outline-none transition-colors resize-none"
                                                    placeholder="Опишите ваш вопрос подробнее..."
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full bg-sparta-gold text-black font-bold py-4 rounded-xl hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                                            >
                                                {loading ? (
                                                    <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                ) : (
                                                    <>
                                                        <Send size={18} />
                                                        Отправить сообщение
                                                    </>
                                                )}
                                            </button>

                                            {!auth.currentUser && (
                                                <p className="text-center text-[10px] text-white/30 mt-4">
                                                    Войдите в аккаунт, чтобы общаться с поддержкой в режиме реального времени.
                                                </p>
                                            )}
                                        </form>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ContactModal;
