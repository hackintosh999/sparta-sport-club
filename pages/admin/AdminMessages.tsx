import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, Timestamp, writeBatch, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, storage } from '../../firebase';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Mail, Trash2, CheckCircle, Reply, Search, Filter, MessageSquare, AlertCircle, ChevronDown, ChevronUp, User, Send, Clock, CheckCircle2, Circle, FileText, Download, Tag, Plus, X, ListChecks, Star, Paperclip, ExternalLink, Play } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReplyTemplatesModal from '../../components/admin/ReplyTemplatesModal';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import SpartaVideoPlayer from '../../components/SpartaVideoPlayer';

interface MessageHistory {
    text: string;
    sender: 'user' | 'admin';
    senderName: string;
    createdAt: Timestamp;
    isRead?: boolean;
    image?: string; // For legacy image support
    attachment?: {
        url: string;
        type: string;
        name: string;
        size?: number;
    };
}

interface Note {
    text: string;
    createdAt: Timestamp;
    adminName: string;
}

interface MessageTag {
    id: string;
    label: string;
    color: string;
}

interface Message {
    id: string;
    userId?: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    status: 'new' | 'in_progress' | 'resolved';
    createdAt: Timestamp;
    notes?: Note[];
    tags?: string[];
    thread?: MessageHistory[];
    isStarred?: boolean;
    isTyping?: {
        admin?: boolean;
        user?: boolean;
    };
}

const COLORS = ['#D4AF37', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const AdminMessages = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [replyMode, setReplyMode] = useState<'internal' | 'email'>('internal');
    const [internalReplyText, setInternalReplyText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved' | 'starred'>('all');
    const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
    const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
    const [availableTags, setAvailableTags] = useState<MessageTag[]>([]);
    const [newTagLabel, setNewTagLabel] = useState('');
    const [newNote, setNewNote] = useState('');
    const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ email: string, subject: string, name: string } | null>(null);

    // Attachment State
    const [attachment, setAttachment] = useState<{ file: File, preview: string, type: string } | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logic
    useEffect(() => {
        if (expandedId && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [expandedId, messages]);

    // Specific document listener for active chat to ensure instant updates
    useEffect(() => {
        if (!expandedId) return;
        const unsubscribe = onSnapshot(doc(db, "messages", expandedId), async (docSnapshot) => {
            if (docSnapshot.exists()) {
                const updatedMsg = { id: docSnapshot.id, ...docSnapshot.data() } as Message;
                setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));

                // Mark messages as read if they are from user and not read
                if (updatedMsg.thread) {
                    const hasUnread = updatedMsg.thread.some(m => m.sender === 'user' && !m.isRead);
                    if (hasUnread) {
                        const newThread = updatedMsg.thread.map(m =>
                            m.sender === 'user' ? { ...m, isRead: true } : m
                        );
                        await updateDoc(doc(db, "messages", expandedId), {
                            thread: newThread
                        });
                    }
                }
            }
        });
        return () => unsubscribe();
    }, [expandedId]);

    // Fetch Messages
    useEffect(() => {
        const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(msgs);
            setLoading(false);

            // Handle deep linking from AdminRequests or other parts
            const params = new URLSearchParams(location.search);
            const threadId = params.get('id');
            const email = params.get('email');

            if (threadId) {
                setExpandedId(threadId);
                // Clear params after handling to avoid re-opening on manual refresh if needed, 
                // but usually fine to leave for the session
            } else if (email && msgs.length > 0) {
                const latestFromEmail = msgs.find(m => m.email === email);
                if (latestFromEmail) {
                    setExpandedId(latestFromEmail.id);
                }
            }
        });
        return () => unsubscribe();
    }, [location.search]);

    // Fetch Tags
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "message_tags"), (snapshot) => {
            setAvailableTags(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageTag)));
        });
        return () => unsubscribe();
    }, []);

    // --- Actions ---

    const handleToggleStar = async (id: string, current: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        await updateDoc(doc(db, "messages", id), { isStarred: !current });
    };

    const handleDelete = async (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (window.confirm('Вы уверены, что хотите удалить это сообщение?')) {
            await deleteDoc(doc(db, "messages", id));
            setSelectedMessages(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            if (expandedId === id) setExpandedId(null);
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedMessages.size) return;
        if (!window.confirm(`Удалить выбранные сообщения (${selectedMessages.size})?`)) return;

        const batch = writeBatch(db);
        selectedMessages.forEach(id => {
            batch.delete(doc(db, "messages", id));
        });
        await batch.commit();
        setSelectedMessages(new Set());
    };

    const handleBulkStatus = async (status: 'new' | 'in_progress' | 'resolved') => {
        if (!selectedMessages.size) return;
        const batch = writeBatch(db);
        selectedMessages.forEach(id => {
            batch.update(doc(db, "messages", id), { status });
        });
        await batch.commit();
        setSelectedMessages(new Set());
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        await updateDoc(doc(db, "messages", id), { status: newStatus });
    };

    const handleTyping = (() => {
        let timeout: any;
        return async (id: string) => {
            if (timeout) clearTimeout(timeout);
            await updateDoc(doc(db, "messages", id), { "isTyping.admin": true });
            timeout = setTimeout(async () => {
                try {
                    await updateDoc(doc(db, "messages", id), { "isTyping.admin": false });
                } catch (e) { }
            }, 3000);
        };
    })();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setAttachment({
                file,
                preview: reader.result as string,
                type: file.type
            });
        };
        reader.readAsDataURL(file);
    };

    const uploadFile = async (messageId: string, file: File): Promise<{ url: string, type: string, name: string, size: number }> => {
        const fileName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `chat_attachments/${messageId}/${fileName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                uploadTask.cancel();
                reject(new Error("Превышено время ожидания загрузки. Ошибка CORS?"));
            }, 30000);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => {
                    clearTimeout(timeout);
                    console.error("Firebase Storage error:", error);
                    reject(error);
                },
                async () => {
                    clearTimeout(timeout);
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve({
                            url: downloadURL,
                            type: file.type,
                            name: file.name,
                            size: file.size
                        });
                    } catch (error) {
                        console.error("Error getting download URL:", error);
                        reject(error);
                    }
                }
            );
        });
    };

    const handleInternalReply = async (id: string) => {
        if (!internalReplyText.trim() && !attachment) return;

        const message = messages.find(m => m.id === id);
        if (!message || !message.email) return;

        try {
            let attachmentData = null;
            if (attachment) {
                setUploadProgress(0); // Start showing progress immediately
                attachmentData = await uploadFile(id, attachment.file);
            }

            const reply: MessageHistory = {
                text: internalReplyText,
                sender: 'admin',
                senderName: auth.currentUser?.displayName || 'Администратор',
                createdAt: Timestamp.now(),
                ...(attachmentData && { attachment: attachmentData })
            };

            const batch = writeBatch(db);
            const msgRef = doc(db, "messages", id);

            batch.update(msgRef, {
                thread: arrayUnion(reply),
                status: 'in_progress',
                isReadByUser: false,
                "isTyping.admin": false
            });

            const notificationRef = doc(collection(db, "notifications"));
            batch.set(notificationRef, {
                email: message.email,
                type: 'request',
                title: 'Новый ответ от поддержки',
                message: `Вы получили ответ на обращение: ${message.subject}`,
                isRead: false,
                createdAt: serverTimestamp(),
                relatedId: id
            });

            await batch.commit();
            setInternalReplyText('');
            setAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error: any) {
            console.error("Full reply error:", error);
            const errorMessage = error?.message || "";
            if (errorMessage.includes("CORS") || errorMessage.includes("Network Error") || errorMessage.includes("Превышено время")) {
                alert("⚠️ Ошибка настройки сервера (CORS)\n\nФайлы не отправляются, так как не настроен Firebase Storage.\n\nПожалуйста, выполните команду настройки в Google Cloud Shell (см. чат).");
            } else {
                alert(`Ошибка при отправке: ${errorMessage}`);
            }
        } finally {
            setUploadProgress(null);
        }
    };

    const handleEmailReply = (email: string, subject: string, name: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setReplyingTo({ email, subject, name });
        setIsTemplatesOpen(true);
    };

    const onTemplateSelect = async (content: string) => {
        if (!replyingTo) return;

        if (replyMode === 'internal' && expandedId) {
            setInternalReplyText(content);
            setIsTemplatesOpen(false);
            setReplyingTo(null);
            return;
        }

        const { email, subject, name } = replyingTo;
        const body = `Здравствуйте, ${name}!\n\n${content}\n\nС уважением,\nКоманда Sparta Sports Center`;

        try {
            await navigator.clipboard.writeText(body);
            alert('Текст ответа скопирован в буфер обмена! Открываем почтовый клиент...');
        } catch (err) { }

        window.location.href = `mailto:${email}?subject=Re: ${subject}&body=${encodeURIComponent(body)}`;
        setIsTemplatesOpen(false);
        setReplyingTo(null);
    };

    const handleAddNote = async (id: string) => {
        if (!newNote.trim()) return;
        const note: Note = {
            text: newNote,
            createdAt: Timestamp.now(),
            adminName: auth.currentUser?.displayName || 'Admin'
        };
        await updateDoc(doc(db, "messages", id), { notes: arrayUnion(note) });
        setNewNote('');
    };

    const createTag = async () => {
        if (!newTagLabel.trim()) return;
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        await setDoc(doc(collection(db, "message_tags")), { label: newTagLabel, color });
        setNewTagLabel('');
    };

    const deleteTag = async (id: string) => {
        if (window.confirm('Удалить этот тег?')) {
            await deleteDoc(doc(db, "message_tags", id));
        }
    };

    const toggleMessageTag = async (messageId: string, tagId: string, hasTag: boolean) => {
        await updateDoc(doc(db, "messages", messageId), {
            tags: hasTag ? arrayRemove(tagId) : arrayUnion(tagId)
        });
    };

    const handleExportCSV = () => {
        const headers = ['ID', 'Date', 'Name', 'Email', 'Subject', 'Message', 'Status', 'Tags'];
        const csvContent = [
            headers.join(','),
            ...messages.map(msg => [
                msg.id,
                format(msg.createdAt.toDate(), 'yyyy-MM-dd HH:mm'),
                `"${msg.name}"`,
                msg.email,
                `"${msg.subject}"`,
                `"${msg.message.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
                msg.status,
                `"${msg.tags?.map(tId => availableTags.find(t => t.id === tId)?.label).join('; ') || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `messages_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedMessages);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedMessages(newSet);
    };

    const filteredMessages = messages.filter(msg => {
        const name = msg.name || '';
        const email = msg.email || '';
        const subject = msg.subject || '';

        const matchesSearch =
            name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            subject.toLowerCase().includes(searchTerm.toLowerCase());

        if (filter === 'all') return matchesSearch;
        if (filter === 'starred') return matchesSearch && msg.isStarred;
        return matchesSearch && msg.status === filter;
    });

    const unreadCount = messages.filter(m => m.status === 'new').length;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'bg-sparta-gold text-black border-sparta-gold';
            case 'in_progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
            case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/50';
            default: return 'bg-white/10 text-white/50 border-white/10';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'new': return 'Новое';
            case 'in_progress': return 'В работе';
            case 'resolved': return 'Решено';
            default: return status;
        }
    };

    return (
        <div className="p-8 font-manrope">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-russo text-white mb-2">Сообщения</h1>
                    <p className="text-white/50">Обработка запросов и обратная связь</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-colors">
                        <Download size={18} /> <span className="hidden md:inline">Экспорт CSV</span>
                    </button>
                    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                        <Mail className="text-sparta-gold" />
                        <span className="text-white font-bold">{unreadCount}</span>
                        <span className="text-white/50 text-sm hidden md:inline">новых</span>
                    </div>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedMessages.size > 0 && (
                <div className="mb-6 bg-sparta-gold/10 border border-sparta-gold/30 p-4 rounded-xl flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-2">
                    <span className="text-sparta-gold font-bold">{selectedMessages.size} выбрано</span>
                    <div className="h-4 w-px bg-sparta-gold/30 mx-2" />
                    <button onClick={handleBulkDelete} className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm">
                        <Trash2 size={16} /> Удалить
                    </button>
                    <button onClick={() => handleBulkStatus('resolved')} className="flex items-center gap-2 text-green-400 hover:text-green-300 text-sm">
                        <CheckCircle2 size={16} /> Пометить "Решено"
                    </button>
                    <button onClick={() => handleBulkStatus('in_progress')} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm">
                        <Clock size={16} /> Пометить "В работе"
                    </button>
                    <button onClick={() => setSelectedMessages(new Set())} className="ml-auto text-white/50 hover:text-white text-sm">
                        Снять выделение
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col xl:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <input
                        type="text"
                        placeholder="Поиск по имени, email или теме..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#121212] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-sparta-gold outline-none"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 xl:pb-0 scrollbar-hide">
                    {(['all', 'new', 'in_progress', 'resolved', 'starred'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl border transition-colors whitespace-nowrap flex items-center gap-2 ${filter === f ? 'bg-white/10 text-white border-white/30' : 'bg-transparent text-white/50 border-white/5 hover:border-white/20'}`}
                        >
                            {f === 'starred' && <Star size={14} className={filter === 'starred' ? "fill-white" : ""} />}
                            {f === 'all' ? 'Все' : f === 'starred' ? 'Важные' : getStatusLabel(f)}
                        </button>
                    ))}
                    <button
                        onClick={() => setIsTagManagerOpen(!isTagManagerOpen)}
                        className={`px-4 py-2 rounded-xl border border-white/10 hover:border-white/30 transition-colors whitespace-nowrap flex items-center gap-2 ${isTagManagerOpen ? 'bg-white/10 text-white' : 'text-white/50'}`}
                    >
                        <Tag size={16} /> Теги
                    </button>
                </div>
            </div>

            {/* Tag Manager */}
            {isTagManagerOpen && (
                <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10 animate-in fade-in">
                    <h4 className="text-white font-bold mb-3 flex items-center gap-2"><Tag size={16} /> Управление тегами</h4>
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newTagLabel}
                            onChange={(e) => setNewTagLabel(e.target.value)}
                            placeholder="Новый тег..."
                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-sparta-gold outline-none"
                        />
                        <button onClick={createTag} className="p-2 bg-sparta-gold text-black rounded-lg hover:bg-white transition-colors">
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {availableTags.map(tag => (
                            <div key={tag.id} className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full border border-white/10">
                                <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: tag.color }} />
                                <span className="text-white text-sm">{tag.label}</span>
                                <button onClick={() => deleteTag(tag.id)} className="text-white/30 hover:text-red-400 ml-1"><X size={14} /></button>
                            </div>
                        ))}
                        {availableTags.length === 0 && <span className="text-white/30 text-sm">Нет тегов</span>}
                    </div>
                </div>
            )}

            {/* List */}
            <div className="bg-[#121212] rounded-3xl border border-white/10 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-white/50">Загрузка...</div>
                ) : filteredMessages.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <MessageSquare size={48} className="text-white/10 mb-4" />
                        <p className="text-white/50">Сообщений не найдено</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {filteredMessages.map((msg) => (
                            <div key={msg.id} className={`group hover:bg-white/5 transition-colors ${expandedId === msg.id ? 'bg-white/5' : ''}`}>
                                {/* Header Row */}
                                <div
                                    onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
                                    className="p-6 cursor-pointer flex flex-col md:flex-row gap-4 md:items-center relative"
                                >
                                    {/* Selection Checkbox */}
                                    <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedMessages.has(msg.id)}
                                            onChange={() => toggleSelection(msg.id)}
                                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-sparta-gold focus:ring-offset-0 focus:ring-1 focus:ring-sparta-gold cursor-pointer"
                                        />
                                    </div>

                                    {/* Star Button */}
                                    <div className="md:ml-4" onClick={(e) => handleToggleStar(msg.id, !!msg.isStarred, e)}>
                                        <Star
                                            size={18}
                                            className={`transition-colors ${msg.isStarred ? 'text-sparta-gold fill-sparta-gold' : 'text-white/10 group-hover:text-white/30'}`}
                                        />
                                    </div>

                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${msg.status === 'new' ? 'bg-sparta-gold text-black' : 'bg-white/10 text-white/50'}`}>
                                            <Mail size={20} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className={`font-bold text-sm ${msg.status === 'new' ? 'text-white' : 'text-white/70'}`}>
                                                    {msg.name}
                                                </span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(msg.status)}`}>
                                                    {getStatusLabel(msg.status)}
                                                </span>
                                                {msg.tags?.map(tId => {
                                                    const tag = availableTags.find(t => t.id === tId);
                                                    if (!tag) return null;
                                                    return (
                                                        <span key={tId} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-white/70 border border-white/10">
                                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                                                            {tag.label}
                                                        </span>
                                                    );
                                                })}
                                                <span className="text-white/30 text-xs ml-auto md:ml-0">
                                                    {msg.createdAt?.seconds
                                                        ? format(new Date(msg.createdAt.seconds * 1000), 'd MMM HH:mm', { locale: ru })
                                                        : '...'}
                                                </span>
                                            </div>
                                            <h4 className="text-white font-medium text-sm truncate">{msg.subject}</h4>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity ml-auto md:ml-0">
                                        <button
                                            onClick={(e) => handleEmailReply(msg.email, msg.subject, msg.name, e)}
                                            className="p-2 text-white/50 hover:text-sparta-gold hover:bg-white/5 rounded-lg transition-colors"
                                            title="Ответить"
                                        >
                                            <Reply size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(msg.id, e)}
                                            className="p-2 text-white/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Удалить"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        {expandedId === msg.id ? <ChevronUp className="text-white/50" /> : <ChevronDown className="text-white/50" />}
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {expandedId === msg.id && (
                                    <div className="px-6 pb-6 pt-0 border-t border-white/5 md:border-t-0 animate-in slide-in-from-top-2 duration-200 pl-16">
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                                            {/* Left: Chat & Details */}
                                            <div className="lg:col-span-2 space-y-6">

                                                {/* Chat History */}
                                                <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden flex flex-col max-h-[500px]">
                                                    {/* Initial Message Header */}
                                                    <div className="p-4 bg-white/5 border-b border-white/5">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="text-white font-bold text-sm mb-1">{msg.subject}</h4>
                                                                <p className="text-white/50 text-xs">От: {msg.name} ({msg.email})</p>
                                                            </div>
                                                            <div className="text-white/30 text-xs">
                                                                {format(msg.createdAt.toDate(), 'dd.MM HH:mm')}
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 text-white/90 text-sm whitespace-pre-wrap bg-black/20 p-3 rounded-lg border border-white/5">
                                                            {msg.message}
                                                        </div>
                                                    </div>

                                                    {/* Thread */}
                                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0a0a]">
                                                        {msg.thread?.map((reply, idx) => {
                                                            const isAdmin = reply.sender === 'admin';
                                                            return (
                                                                <div key={idx} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                                                    <div className={`max-w-[85%] p-3 rounded-xl ${isAdmin
                                                                        ? 'bg-sparta-gold/20 text-white rounded-tr-none'
                                                                        : 'bg-white/10 text-white rounded-tl-none'
                                                                        }`}>
                                                                        {/* Legacy Image support (matches UserRequests) */}
                                                                        {reply.image && (
                                                                            <div className="mb-2 rounded-lg overflow-hidden border border-white/10 max-w-sm">
                                                                                <img src={reply.image} alt="Attachment" className="w-full h-auto cursor-pointer" onClick={() => window.open(reply.image, '_blank')} />
                                                                            </div>
                                                                        )}

                                                                        {/* New Attachment Support */}
                                                                        {reply.attachment && (
                                                                            <div className="mb-2 rounded-lg overflow-hidden border border-white/10 max-w-sm bg-black/20">
                                                                                {reply.attachment.type.startsWith('image/') ? (
                                                                                    <img src={reply.attachment.url} alt={reply.attachment.name} className="w-full h-auto cursor-pointer" onClick={() => window.open(reply.attachment.url, '_blank')} />
                                                                                ) : reply.attachment.type.startsWith('video/') ? (
                                                                                    <div className="w-full aspect-video">
                                                                                        <SpartaVideoPlayer src={reply.attachment.url} className="w-full h-full" />
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="p-3 flex items-center justify-between gap-4">
                                                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                                                            <FileText size={20} className="text-sparta-gold shrink-0" />
                                                                                            <div className="min-w-0">
                                                                                                <div className="text-xs font-bold text-white truncate">{reply.attachment.name}</div>
                                                                                                <div className="text-[10px] text-white/40">{reply.attachment.size ? (reply.attachment.size / 1024 / 1024).toFixed(2) + ' MB' : 'File'}</div>
                                                                                            </div>
                                                                                        </div>
                                                                                        <a href={reply.attachment.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white shrink-0">
                                                                                            <Download size={18} />
                                                                                        </a>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        <div className="text-sm whitespace-pre-wrap">{reply.text}</div>
                                                                        <div className={`text-[10px] mt-1 flex gap-2 ${isAdmin ? 'justify-end text-white/40' : 'text-white/30'}`}>
                                                                            <span className="font-bold">{reply.senderName}</span>
                                                                            <span>{format(reply.createdAt.toDate(), 'dd.MM HH:mm')}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        <div ref={chatEndRef} />
                                                    </div>

                                                    {/* Reply Input */}
                                                    <div className="p-4 bg-white/5 border-t border-white/5">
                                                        <div className="flex gap-2 mb-2">
                                                            <button
                                                                onClick={() => setReplyMode('internal')}
                                                                className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${replyMode === 'internal' ? 'bg-sparta-gold text-black font-bold' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                                                            >
                                                                В чат (На сайте)
                                                            </button>
                                                            <button
                                                                onClick={() => setReplyMode('email')}
                                                                className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${replyMode === 'email' ? 'bg-sparta-gold text-black font-bold' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                                                            >
                                                                Email (Внешний)
                                                            </button>
                                                        </div>

                                                        {replyMode === 'internal' ? (
                                                            <div>
                                                                <div className="flex gap-2">
                                                                    <div className="relative flex-1">
                                                                        <textarea
                                                                            value={internalReplyText}
                                                                            onChange={(e) => {
                                                                                setInternalReplyText(e.target.value);
                                                                                handleTyping(msg.id);
                                                                            }}
                                                                            placeholder="Напишите ответ пользователю..."
                                                                            rows={1}
                                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-20 text-white focus:border-sparta-gold outline-none resize-none overflow-hidden min-h-[46px]"
                                                                            style={{ height: 'auto', minHeight: '46px' }}
                                                                            onInput={(e) => {
                                                                                e.currentTarget.style.height = 'auto';
                                                                                e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                                                                            }}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                                    e.preventDefault();
                                                                                    handleInternalReply(msg.id);
                                                                                }
                                                                            }}
                                                                        />
                                                                        <div className="absolute right-2 top-2 flex items-center gap-1">
                                                                            <button
                                                                                onClick={() => fileInputRef.current?.click()}
                                                                                className={`p-1.5 hover:bg-white/10 rounded-lg transition-colors ${attachment ? 'text-sparta-gold' : 'text-white/30 hover:text-white'}`}
                                                                                title="Прикрепить файл"
                                                                            >
                                                                                <Paperclip size={16} />
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setReplyingTo({ email: msg.email, subject: msg.subject, name: msg.name });
                                                                                    setIsTemplatesOpen(true);
                                                                                }}
                                                                                className="p-1.5 hover:bg-white/10 rounded-lg text-white/30 hover:text-sparta-gold transition-colors"
                                                                                title="Шаблоны"
                                                                            >
                                                                                <FileText size={16} />
                                                                            </button>
                                                                        </div>
                                                                        <input
                                                                            type="file"
                                                                            ref={fileInputRef}
                                                                            className="hidden"
                                                                            onChange={handleFileSelect}
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleInternalReply(msg.id)}
                                                                        disabled={(!internalReplyText.trim() && !attachment) || uploadProgress !== null}
                                                                        className="p-3 bg-sparta-gold text-black rounded-xl hover:bg-white transition-colors disabled:opacity-50 relative overflow-hidden"
                                                                    >
                                                                        {uploadProgress !== null ? (
                                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                                                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                                                            </div>
                                                                        ) : <Send size={20} />}
                                                                        {uploadProgress !== null && (
                                                                            <div
                                                                                className="absolute bottom-0 left-0 h-1 bg-black/40 transition-all duration-300"
                                                                                style={{ width: `${uploadProgress}%` }}
                                                                            />
                                                                        )}
                                                                    </button>
                                                                </div>

                                                                {/* Attachment Preview UI */}
                                                                {attachment && (
                                                                    <div className="mt-2 flex items-start gap-3 p-2 bg-white/5 rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-1">
                                                                        {attachment.type.startsWith('image/') ? (
                                                                            <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                                                                                <img src={attachment.preview} alt="Preview" className="w-full h-full object-cover" />
                                                                            </div>
                                                                        ) : attachment.type.startsWith('video/') ? (
                                                                            <div className="w-16 h-16 rounded-lg bg-black flex items-center justify-center shrink-0">
                                                                                <Play size={24} className="text-sparta-gold" />
                                                                            </div>
                                                                        ) : (
                                                                            <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                                                                <FileText size={24} className="text-white/50" />
                                                                            </div>
                                                                        )}
                                                                        <div className="flex-1 min-w-0 py-1">
                                                                            <div className="text-xs font-bold text-white truncate">{attachment.file.name}</div>
                                                                            <div className="text-[10px] text-white/40">{(attachment.file.size / 1024 / 1024).toFixed(2)} MB</div>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => {
                                                                                setAttachment(null);
                                                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                                                            }}
                                                                            className="p-2 hover:bg-white/10 rounded-full text-white/30 hover:text-red-400 transition-colors"
                                                                        >
                                                                            <X size={16} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => handleEmailReply(msg.email, msg.subject, msg.name, e)}
                                                                className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                                                            >
                                                                <Mail size={18} /> Открыть почтовый клиент
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Internal Notes */}
                                                <div>
                                                    <h4 className="text-white/30 text-[10px] uppercase tracking-wider mb-2 font-bold flex items-center gap-2">
                                                        <MessageSquare size={12} /> Заметки для команды
                                                    </h4>
                                                    <div className="space-y-3 mb-3">
                                                        {msg.notes?.map((note, idx) => (
                                                            <div key={idx} className="bg-white/5 rounded-xl p-3 text-sm">
                                                                <p className="text-white/80 mb-1">{note.text}</p>
                                                                <div className="flex justify-between text-[10px] text-white/30">
                                                                    <span>{note.adminName}</span>
                                                                    <span>{format(note.createdAt.toDate(), 'd MMM HH:mm', { locale: ru })}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {(!msg.notes || msg.notes.length === 0) && (
                                                            <p className="text-white/20 text-sm italic">Заметок пока нет</p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={newNote}
                                                            onChange={(e) => setNewNote(e.target.value)}
                                                            placeholder="Добавить заметку..."
                                                            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-sparta-gold outline-none"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    handleAddNote(msg.id);
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => handleAddNote(msg.id)}
                                                            className="p-2 bg-sparta-gold text-black rounded-xl hover:bg-white transition-colors"
                                                        >
                                                            <Send size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Column */}
                                            <div className="space-y-6">
                                                <div className="bg-black/20 rounded-2xl p-4 border border-white/5 space-y-4">
                                                    <div>
                                                        <label className="text-white/30 text-xs block mb-1">Статус</label>
                                                        <div className="space-y-2">
                                                            {(['new', 'in_progress', 'resolved'] as const).map(status => (
                                                                <button
                                                                    key={status}
                                                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(msg.id, status); }}
                                                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${msg.status === status ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5 border border-transparent opacity-50 hover:opacity-100'}`}
                                                                >
                                                                    {status === 'new' && <Circle size={14} className="text-sparta-gold fill-sparta-gold" />}
                                                                    {status === 'in_progress' && <Clock size={14} className="text-blue-400" />}
                                                                    {status === 'resolved' && <CheckCircle2 size={14} className="text-green-500" />}
                                                                    <span className={msg.status === status ? 'text-white' : 'text-white/60'}>
                                                                        {getStatusLabel(status)}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-white/30 text-xs block mb-2">Теги</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {availableTags.map(tag => {
                                                                const hasTag = msg.tags?.includes(tag.id);
                                                                return (
                                                                    <button
                                                                        key={tag.id}
                                                                        onClick={() => toggleMessageTag(msg.id, tag.id, !!hasTag)}
                                                                        className={`px-2 py-1 rounded-full text-xs border transition-all ${hasTag ? 'bg-white/10 border-white/30 text-white' : 'bg-white/5 border-white/10 text-white/50'}`}
                                                                        style={hasTag ? { borderColor: tag.color } : {}}
                                                                    >
                                                                        {tag.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    <div className="pt-4 border-t border-white/5">
                                                        <div className="text-white/30 text-xs">Email</div>
                                                        <div className="text-white text-sm select-all">{msg.email}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ReplyTemplatesModal
                isOpen={isTemplatesOpen}
                onClose={() => setIsTemplatesOpen(false)}
                onSelect={onTemplateSelect}
            />
        </div>
    );
};

export default AdminMessages;
