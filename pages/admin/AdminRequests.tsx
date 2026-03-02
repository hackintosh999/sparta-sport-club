import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, getDocs, where, Timestamp, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Search, CheckCircle, XCircle, Clock, Phone, Mail, Trash2, User, MessageSquare, MessageCircle, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminRequests = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({});
    const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

    useEffect(() => {
        const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedRequests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRequests(loadedRequests);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const updateStatus = async (id: string, newStatus: string, requestData: any) => {
        try {
            await updateDoc(doc(db, "requests", id), { status: newStatus });

            if (requestData.email) {
                let title = 'Обновление статуса заявки';
                let message = `Статус вашей заявки изменен на: ${getStatusLabel(newStatus)}`;

                if (newStatus === 'completed') {
                    title = 'Заявка завершена';
                    message = 'Ваша заявка успешно обработана. Ждем вас на тренировке!';
                } else if (newStatus === 'rejected') {
                    title = 'Заявка отклонена';
                    message = 'К сожалению, ваша заявка была отклонена. Свяжитесь с нами для уточнения.';
                } else if (newStatus === 'contacted') {
                    title = 'Заявка в работе';
                    message = 'Администратор взял вашу заявку в работу. Скоро мы с вами свяжемся.';
                }

                await addDoc(collection(db, "notifications"), {
                    email: requestData.email,
                    title,
                    message,
                    type: 'request',
                    isRead: false,
                    createdAt: new Date(),
                    relatedId: id
                });
            }
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Удалить заявку?")) {
            try {
                await deleteDoc(doc(db, "requests", id));
            } catch (error) {
                console.error("Error deleting request:", error);
            }
        }
    };

    const handleSaveNote = async (id: string) => {
        const note = editingNotes[id];
        if (note === undefined) return;

        setSavingNoteId(id);
        try {
            await updateDoc(doc(db, "requests", id), { adminNotes: note });
        } catch (error) {
            console.error("Error saving notes:", error);
        }
        setSavingNoteId(null);
    };

    const handleNoteChange = (id: string, value: string) => {
        setEditingNotes(prev => ({ ...prev, [id]: value }));
    };

    const openInAppChat = async (req: any) => {
        if (!req.email) {
            alert("Для открытия чата необходим Email пользователя.");
            return;
        }

        try {
            // Check if thread exists
            const q = query(collection(db, "messages"), where("email", "==", req.email));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                navigate(`/admin/messages?id=${snapshot.docs[0].id}`);
            } else {
                // Create new thread
                const docRef = await addDoc(collection(db, "messages"), {
                    userId: req.userId || null,
                    name: `${req.childSurname} ${req.childName}`,
                    email: req.email,
                    subject: `Заявка: ${req.programType || 'Пробная тренировка'}`,
                    message: req.comment || 'Новая заявка через форму на сайте',
                    status: 'new',
                    createdAt: serverTimestamp(),
                    thread: [{
                        text: req.comment || `Новая заявка на программу: ${req.programType || 'Пробная тренировка'}`,
                        sender: 'user',
                        senderName: req.childName,
                        createdAt: Timestamp.now()
                    }]
                });
                navigate(`/admin/messages?id=${docRef.id}`);
            }
        } catch (error) {
            console.error("Error opening chat:", error);
            alert("Ошибка при открытии чата.");
        }
    };

    const filteredRequests = requests.filter(req => {
        const matchesSearch =
            (req.childName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (req.childSurname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (req.parentPhone || '').includes(searchTerm) ||
            (req.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const columns = [
        { id: 'new', title: 'Новые', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
        { id: 'contacted', title: 'В работе', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        { id: 'completed', title: 'Завершены', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
        { id: 'rejected', title: 'Отклонены', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    ];

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Завершен';
            case 'contacted': return 'В работе';
            case 'rejected': return 'Отклонен';
            default: return 'Новый';
        }
    };

    if (loading) return <div className="text-white text-center p-10">Загрузка...</div>;

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 p-1 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-russo text-white mb-2">Заявки</h1>
                    <p className="text-white/40 text-sm font-manrope">Управление входящими запросами (Kanban)</p>
                </div>

                <div className="flex gap-3 w-full md:w-auto bg-[#1a1a1a] p-1.5 rounded-xl border border-white/10">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                        <input
                            type="text"
                            placeholder="Поиск по имени/телефону..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent border-none outline-none pl-9 pr-4 py-2 text-sm text-white placeholder-white/20 font-manrope"
                        />
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <div className="flex gap-4 h-full min-w-max pb-4">
                    {columns.map(column => {
                        const columnRequests = filteredRequests.filter(req => (req.status || 'new') === column.id);

                        return (
                            <div key={column.id} className="w-80 flex flex-col bg-[#111] rounded-2xl border border-white/5 h-full overflow-hidden">
                                {/* Column Header */}
                                <div className={`p-4 border-b border-white/5 flex justify-between items-center ${column.bg}`}>
                                    <h3 className={`font-russo ${column.color}`}>{column.title}</h3>
                                    <span className="bg-black/50 text-white/70 px-2 py-0.5 rounded-full text-xs font-bold">
                                        {columnRequests.length}
                                    </span>
                                </div>

                                {/* Column Content */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                    {columnRequests.map(req => (
                                        <div key={req.id} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 hover:border-sparta-gold/30 transition-all flex flex-col gap-3 shadow-sm hover:shadow-md">

                                            {/* Top info */}
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="text-white font-bold font-russo tracking-wide">
                                                        {req.childSurname} {req.childName}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-1 text-[10px] text-white/40 font-manrope">
                                                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-white/60">
                                                            {req.childAge ? `${req.childAge} лет` : '? лет'}
                                                        </span>
                                                        <Clock size={10} />
                                                        {req.createdAt?.seconds ? format(new Date(req.createdAt.seconds * 1000), 'd MMM') : ''}
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDelete(req.id)} className="text-white/20 hover:text-red-500 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            {/* Contacts */}
                                            <div className="bg-black/20 p-2 rounded-lg space-y-2 mt-1">
                                                {/* Phone & WA */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-xs text-white/80">
                                                        <Phone size={12} className="text-sparta-gold/70" />
                                                        {req.parentPhone || <span className="text-white/30 italic">Нет телефона</span>}
                                                    </div>
                                                    {req.email && (
                                                        <button
                                                            onClick={() => openInAppChat(req)}
                                                            className="text-sparta-gold bg-sparta-gold/10 hover:bg-sparta-gold/20 p-1.5 rounded-md transition-colors"
                                                            title="Открыть чат на сайте"
                                                        >
                                                            <MessageSquare size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                {/* Email & Program */}
                                                <div className="flex items-center gap-2 text-xs text-white/60">
                                                    <MessageSquare size={12} className="text-sparta-gold/50" />
                                                    <span className="truncate">{req.programType || 'Пробная тренировка'}</span>
                                                </div>
                                            </div>

                                            {/* Client Comment */}
                                            {req.comment && (
                                                <div className="text-[11px] text-white/50 italic bg-white/5 p-2 rounded-lg border-l-2 border-white/20">
                                                    "{req.comment}"
                                                </div>
                                            )}

                                            {/* Admin Notes */}
                                            <div className="mt-1">
                                                <div className="relative">
                                                    <textarea
                                                        value={editingNotes[req.id] !== undefined ? editingNotes[req.id] : (req.adminNotes || '')}
                                                        onChange={(e) => handleNoteChange(req.id, e.target.value)}
                                                        placeholder="Внутренняя заметка админа..."
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white/80 focus:outline-none focus:border-yellow-500 min-h-[60px] resize-none"
                                                    />
                                                    {(editingNotes[req.id] !== undefined && editingNotes[req.id] !== req.adminNotes) && (
                                                        <button
                                                            onClick={() => handleSaveNote(req.id)}
                                                            disabled={savingNoteId === req.id}
                                                            className="absolute bottom-2 right-2 p-1.5 bg-yellow-500 text-black rounded-md hover:bg-yellow-400 transition-colors disabled:opacity-50"
                                                            title="Сохранить заметку"
                                                        >
                                                            {savingNoteId === req.id ? <Clock size={12} className="animate-spin" /> : <Save size={12} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Status Change Actions */}
                                            <div className="flex gap-1 mt-2">
                                                <button
                                                    onClick={() => updateStatus(req.id, 'new', req)}
                                                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${req.status === 'new' ? 'bg-yellow-500 text-black' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}
                                                    title="В 'Новые'"
                                                >
                                                    Нов
                                                </button>
                                                <button
                                                    onClick={() => updateStatus(req.id, 'contacted', req)}
                                                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${req.status === 'contacted' ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}
                                                    title="В работу"
                                                >
                                                    В раб
                                                </button>
                                                <button
                                                    onClick={() => updateStatus(req.id, 'completed', req)}
                                                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${req.status === 'completed' ? 'bg-green-500 text-white' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}
                                                    title="Завершить"
                                                >
                                                    Зав
                                                </button>
                                                <button
                                                    onClick={() => updateStatus(req.id, 'rejected', req)}
                                                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${req.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}
                                                    title="Отклонить"
                                                >
                                                    Отк
                                                </button>
                                            </div>

                                        </div>
                                    ))}
                                    {columnRequests.length === 0 && (
                                        <div className="text-center py-8 text-white/20 text-xs font-manrope border border-dashed border-white/5 rounded-xl">
                                            Пусто
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

export default AdminRequests;
