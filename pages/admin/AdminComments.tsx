import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, getDocs, updateDoc, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { Trash2, MessageSquare, ExternalLink, Shield, Pin, Search, Filter, Loader, Send, CheckSquare, Square, X, Copy, MessageCircle, Ban, Edit2, EyeOff, Eye, Unlock, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const AdminComments = () => {
    const [comments, setComments] = useState<any[]>([]);
    const [newsMap, setNewsMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'root' | 'reply'>('all');
    const [newsFilter, setNewsFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'banned'>('all');

    // New Feature State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [userMap, setUserMap] = useState<Record<string, any>>({});

    // Ban Modal State
    const [banModalOpen, setBanModalOpen] = useState(false);
    const [banTargetUser, setBanTargetUser] = useState<{ id: string, name: string } | null>(null);
    const [banReason, setBanReason] = useState('');
    const [banDuration, setBanDuration] = useState('1'); // hours
    const [banType, setBanType] = useState<'comment' | 'full'>('comment');

    useEffect(() => {
        // Fetch News to map IDs to Titles
        const fetchNews = async () => {
            const newsSnap = await getDocs(collection(db, "news"));
            const map: Record<string, string> = {};
            newsSnap.docs.forEach(doc => {
                map[doc.id] = doc.data().title;
            });
            setNewsMap(map);
        };

        fetchNews();

        // Listen to Comments
        const q = query(collection(db, "comments"), orderBy("createdAt", "desc"));
        const unsubscribeComments = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        // Listen to Users (for Ban status)
        const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
            const map: Record<string, any> = {};
            snapshot.docs.forEach(doc => {
                map[doc.id] = doc.data();
            });
            setUserMap(map);
        });

        return () => {
            unsubscribeComments();
            unsubscribeUsers();
        };
    }, []);

    const handleDelete = async (id: string) => {
        if (window.confirm("Удалить этот комментарий навсегда?")) {
            try {
                await deleteDoc(doc(db, "comments", id));
            } catch (error) {
                console.error("Error deleting comment:", error);
            }
        }
    };

    const togglePin = async (id: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, "comments", id), {
                isPinned: !currentStatus
            });
        } catch (error) {
            console.error("Error pinning comment:", error);
        }
    };

    const toggleHide = async (id: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, "comments", id), {
                isHidden: !currentStatus
            });
        } catch (error) {
            console.error("Error hiding comment:", error);
        }
    };

    // --- Bulk Selection Logic ---
    const handleSelectAll = () => {
        if (selectedIds.size === filteredComments.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredComments.map(c => c.id)));
        }
    };

    const handleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkDelete = async () => {
        if (window.confirm(`Удалить выбранные комментарии (${selectedIds.size})?`)) {
            try {
                const promises = Array.from(selectedIds).map((id) => deleteDoc(doc(db, "comments", id as string)));
                await Promise.all(promises);
                setSelectedIds(new Set());
            } catch (error) {
                console.error("Error bulk deleting:", error);
            }
        }
    };

    const handleBulkHide = async (hide: boolean) => {
        if (window.confirm(`${hide ? 'Скрыть' : 'Восстановить'} выбранные комментарии (${selectedIds.size})?`)) {
            try {
                const promises = Array.from(selectedIds).map((id) => updateDoc(doc(db, "comments", id as string), { isHidden: hide }));
                await Promise.all(promises);
                setSelectedIds(new Set());
            } catch (error) {
                console.error("Error bulk hiding:", error);
            }
        }
    };

    const openBanModal = (userId: string, userName: string) => {
        const user = userMap[userId];
        const isFullyBanned = user?.status === 'deleted';
        const isCommentBanned = user?.commentBanUntil && new Date(user.commentBanUntil.seconds * 1000) > new Date();

        if (isFullyBanned) {
            if (window.confirm(`Вы уверены, что хотите разбанить пользователя ${userName}?`)) {
                updateDoc(doc(db, "users", userId), { status: 'active', commentBanUntil: null, commentBanReason: null })
                    .then(() => alert(`Пользователь ${userName} разблокирован.`))
                    .catch(error => {
                        console.error("Error unbanning user:", error);
                        alert("Ошибка при разблокировке пользователя.");
                    });
            }
        } else if (isCommentBanned) {
            if (window.confirm(`Снять запрет на комментарии с пользователя ${userName}?`)) {
                updateDoc(doc(db, "users", userId), { commentBanUntil: null, commentBanReason: null })
                    .then(() => alert(`Ограничение для ${userName} снято.`))
                    .catch(error => {
                        console.error("Error unmuting user:", error);
                        alert("Ошибка при снятии ограничения.");
                    });
            }
        } else {
            setBanTargetUser({ id: userId, name: userName });
            setBanType('comment');
            setBanDuration('1');
            setBanReason('');
            setBanModalOpen(true);
        }
    };

    const handleApplyBan = async () => {
        if (!banTargetUser) return;

        let banData: any = {};
        if (banType === 'full') {
            banData = { status: 'deleted' };
        } else {
            let banUntil = new Date();
            if (banDuration === 'forever') {
                banUntil.setFullYear(banUntil.getFullYear() + 100);
            } else {
                banUntil.setHours(banUntil.getHours() + parseInt(banDuration));
            }
            banData = {
                commentBanUntil: banUntil,
                commentBanReason: banReason
            };
        }

        try {
            await updateDoc(doc(db, "users", banTargetUser.id), banData);
            setBanModalOpen(false);
            setBanTargetUser(null);
            alert("Ограничения успешно применены.");
        } catch (error) {
            console.error("Error applying ban:", error);
            alert("Ошибка при применении ограничений.");
        }
    };

    const handleClearUserComments = async () => {
        if (!banTargetUser) return;

        if (window.confirm(`Вы уверены, что хотите удалить ВСЕ комментарии от пользователя ${banTargetUser.name}? Это действие нельзя отменить!`)) {
            try {
                // Find all comments by this user
                const q = query(collection(db, "comments"), where("userId", "==", banTargetUser.id));
                const snapshot = await getDocs(q);

                // Delete them all
                const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, "comments", docSnap.id)));
                await Promise.all(deletePromises);

                alert(`Успешно удалено ${snapshot.size} комментариев пользователя ${banTargetUser.name}.`);
                setBanModalOpen(false);
                setBanTargetUser(null);
            } catch (error) {
                console.error("Error clearing user comments:", error);
                alert("Ошибка при удалении комментариев.");
            }
        }
    };

    const saveEdit = async (id: string) => {
        if (!editText.trim()) return;
        try {
            await updateDoc(doc(db, "comments", id), { text: editText });
            setEditingId(null);
            setEditText("");
        } catch (error) {
            console.error("Error updating comment:", error);
            alert("Ошибка при сохранении.");
        }
    };

    // --- Reply Logic ---
    const handleReply = async (comment: any) => {
        if (!replyText.trim()) return;

        try {
            await addDoc(collection(db, "comments"), {
                newsId: comment.newsId,
                parentId: comment.id,
                text: replyText,
                userId: 'admin_action', // Or actual auth.currentUser.uid
                userName: 'Sparta Admin',
                userRole: 'admin',
                createdAt: serverTimestamp(),
                likes: [],
                isPinned: false
            });
            setReplyingTo(null);
            setReplyText('');
        } catch (error) {
            console.error("Error sending reply:", error);
        }
    };

    const filteredComments = comments.filter(c => {
        const matchesSearch =
            c.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.userEmail?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesFilter =
            filter === 'all' ||
            (filter === 'root' && !c.parentId) ||
            (filter === 'reply' && c.parentId);

        const matchesNews = newsFilter === 'all' || c.newsId === newsFilter;
        const matchesStatus = statusFilter === 'all' || (statusFilter === 'banned' && userMap[c.userId]?.status === 'deleted');

        return matchesSearch && matchesFilter && matchesNews && matchesStatus;
    });

    if (loading) return <div className="text-white p-8">Загрузка комментариев...</div>;

    return (
        <div className="p-8 font-manrope">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <h1 className="text-3xl font-russo text-white">Модерация Комментариев</h1>

                <div className="flex flex-wrap gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                        <input
                            type="text"
                            placeholder="Поиск по тексту или автору..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white text-sm focus:border-sparta-gold outline-none w-64"
                        />
                    </div>

                    {/* Filter Type */}
                    <select
                        value={filter}
                        onChange={(e: any) => setFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-sparta-gold cursor-pointer"
                    >
                        <option value="all">Все типы</option>
                        <option value="root">Только основные</option>
                        <option value="reply">Только ответы</option>
                    </select>

                    {/* Filter News */}
                    <select
                        value={newsFilter}
                        onChange={(e) => setNewsFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-sparta-gold cursor-pointer max-w-[200px] truncate"
                    >
                        <option value="all">Все новости</option>
                        {Object.entries(newsMap).map(([id, title]) => (
                            <option key={id} value={id}>{title}</option>
                        ))}
                    </select>

                    {/* Filter Status */}
                    <select
                        value={statusFilter}
                        onChange={(e: any) => setStatusFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-sparta-gold cursor-pointer"
                    >
                        <option value="all">Все пользователи</option>
                        <option value="banned">Заблокированные</option>
                    </select>
                </div>
            </div>

            <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-white/50 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 w-12">
                                    <button onClick={handleSelectAll} className="hover:text-white transition-colors">
                                        {filteredComments.length > 0 && selectedIds.size === filteredComments.length ? (
                                            <CheckSquare size={18} className="text-sparta-gold" />
                                        ) : (
                                            <Square size={18} />
                                        )}
                                    </button>
                                </th>
                                <th className="px-6 py-4 font-bold">Автор</th>
                                <th className="px-6 py-4 font-bold">Комментарий</th>
                                <th className="px-6 py-4 font-bold">К новости</th>
                                <th className="px-6 py-4 font-bold">Дата</th>
                                <th className="px-6 py-4 font-bold text-right">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredComments.map((comment) => (
                                <React.Fragment key={comment.id}>
                                    <tr className={`hover:bg-white/[0.02] transition-colors group ${selectedIds.has(comment.id) ? 'bg-sparta-gold/5' : ''} ${comment.isHidden ? 'opacity-50 grayscale' : ''}`}>
                                        <td className="px-6 py-4">
                                            <button onClick={() => handleSelect(comment.id)} className="text-white/30 hover:text-white transition-colors">
                                                {selectedIds.has(comment.id) ? (
                                                    <CheckSquare size={18} className="text-sparta-gold" />
                                                ) : (
                                                    <Square size={18} />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer transition-colors ${userMap[comment.userId]?.status === 'deleted'
                                                        ? 'bg-red-500 text-white hover:bg-red-600'
                                                        : 'bg-sparta-gold/10 text-sparta-gold hover:bg-sparta-gold hover:text-black'
                                                        }`}
                                                    title={userMap[comment.userId]?.status === 'deleted' ? "Пользователь заблокирован" : "Копировать Email"}
                                                    onClick={() => {
                                                        if (comment.userEmail) navigator.clipboard.writeText(comment.userEmail);
                                                    }}
                                                >
                                                    {userMap[comment.userId]?.status === 'deleted' ? <Ban size={14} /> : (comment.userName?.[0].toUpperCase() || '?')}
                                                </div>
                                                <div>
                                                    <p
                                                        className={`text-sm font-bold flex items-center gap-1 cursor-pointer transition-colors ${userMap[comment.userId]?.status === 'deleted'
                                                            ? 'text-red-500 line-through'
                                                            : 'text-white hover:text-sparta-gold'
                                                            }`}
                                                        onClick={() => setSearchQuery(comment.userName)}
                                                        title="Фильтровать по автору"
                                                    >
                                                        {comment.userName}
                                                        {comment.userRole === 'admin' && <Shield size={12} className="text-sparta-gold" />}
                                                    </p>
                                                    <p className="text-white/30 text-[10px]">{comment.userEmail}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs xl:max-w-md">
                                            {editingId === comment.id ? (
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={editText}
                                                        onChange={(e) => setEditText(e.target.value)}
                                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-sparta-gold outline-none"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => saveEdit(comment.id)} className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30">
                                                        <CheckSquare size={16} />
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-start gap-2">
                                                    {comment.parentId && <MessageSquare size={14} className="text-white/20 mt-1 shrink-0" />}
                                                    <p className={`text-sm line-clamp-2 group-hover:line-clamp-none transition-all ${comment.isHidden ? 'text-white/30 italic' : 'text-white/70'}`}>
                                                        "{comment.text}"
                                                    </p>
                                                    {comment.isHidden && (
                                                        <span className="bg-white/10 text-white/50 text-[10px] px-2 py-0.5 rounded-full ml-2 whitespace-nowrap">Скрыт</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div
                                                onClick={() => window.open(`/?news=${comment.newsId}`, '_blank')}
                                                className="flex items-center gap-2 text-sparta-gold/70 text-xs hover:text-sparta-gold cursor-pointer group/link"
                                            >
                                                <span className="truncate max-w-[150px]">{newsMap[comment.newsId] || 'Удаленная новость'}</span>
                                                <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-white/30 text-xs">
                                            {comment.createdAt?.seconds
                                                ? format(new Date(comment.createdAt.seconds * 1000), 'd MMM HH:mm', { locale: ru })
                                                : '...'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setEditingId(comment.id);
                                                        setEditText(comment.text);
                                                        setReplyingTo(null);
                                                    }}
                                                    className="p-2 hover:bg-white/10 text-white/30 hover:text-white rounded-lg transition-colors"
                                                    title="Редактировать"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                                    className={`p-2 rounded-lg transition-all ${replyingTo === comment.id ? 'bg-sparta-gold text-black' : 'hover:bg-white/10 text-white/30 hover:text-white'}`}
                                                    title="Ответить"
                                                >
                                                    <MessageCircle size={16} />
                                                </button>
                                                <button
                                                    onClick={() => togglePin(comment.id, comment.isPinned)}
                                                    className={`p-2 rounded-lg transition-all ${comment.isPinned ? 'bg-sparta-gold text-black' : 'hover:bg-white/10 text-white/30 hover:text-white'}`}
                                                    title={comment.isPinned ? "Открепить" : "Закрепить"}
                                                >
                                                    <Pin size={16} />
                                                </button>
                                                <button
                                                    onClick={() => toggleHide(comment.id, comment.isHidden)}
                                                    className={`p-2 rounded-lg transition-all ${comment.isHidden ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/30 hover:text-white'}`}
                                                    title={comment.isHidden ? "Показать" : "Скрыть"}
                                                >
                                                    {comment.isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => openBanModal(comment.userId, comment.userName)}
                                                    className={`p-2 rounded-lg transition-all ${userMap[comment.userId]?.status === 'deleted' ? 'bg-red-500/20 text-red-400' :
                                                        (userMap[comment.userId]?.commentBanUntil && new Date(userMap[comment.userId].commentBanUntil.seconds * 1000) > new Date()) ? 'bg-orange-500/20 text-orange-400' :
                                                            'hover:bg-white/10 text-white/30 hover:text-white'
                                                        }`}
                                                    title={userMap[comment.userId]?.status === 'deleted' ? "Пользователь заблокирован (Нажмите чтобы разбанить)" :
                                                        (userMap[comment.userId]?.commentBanUntil && new Date(userMap[comment.userId].commentBanUntil.seconds * 1000) > new Date()) ? "Мут активен (Нажмите чтобы снять)" : "Ограничить автора"}
                                                >
                                                    {userMap[comment.userId]?.status === 'deleted' ? <Unlock size={16} /> :
                                                        (userMap[comment.userId]?.commentBanUntil && new Date(userMap[comment.userId].commentBanUntil.seconds * 1000) > new Date()) ? <Unlock size={16} /> : <Ban size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(comment.id)}
                                                    className="p-2 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-lg transition-colors"
                                                    title="Удалить"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {/* Inline Reply Box */}
                                    {replyingTo === comment.id && (
                                        <tr className="bg-white/[0.02] animate-in fade-in slide-in-from-top-2">
                                            <td colSpan={6} className="px-6 py-4">
                                                <div className="flex gap-2 items-center">
                                                    <div className="w-8 h-8 rounded-full bg-sparta-gold flex items-center justify-center text-black font-bold text-xs">
                                                        A
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={replyText}
                                                        onChange={(e) => setReplyText(e.target.value)}
                                                        placeholder={`Ответ пользователю @${comment.userName}...`}
                                                        className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-sparta-gold outline-none"
                                                        autoFocus
                                                        onKeyDown={(e) => e.key === 'Enter' && handleReply(comment)}
                                                    />
                                                    <button
                                                        onClick={() => handleReply(comment)}
                                                        className="p-2 bg-sparta-gold text-black rounded-xl hover:bg-[#ffd700] transition-colors"
                                                    >
                                                        <Send size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredComments.length === 0 && (
                    <div className="text-center py-20 text-white/20">
                        <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Комментариев не найдено</p>
                    </div>
                )}
            </div>

            <div className="mt-4 flex gap-4 text-xs text-white/30">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-sparta-gold"></div>
                    <span>Закреплено</span>
                </div>
                <div className="flex items-center gap-2">
                    <MessageSquare size={12} />
                    <span>Ответ на комментарий</span>
                </div>
            </div>
            {/* Bulk Actions Toolbar */}
            <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#222] border border-white/20 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 transition-all duration-300 z-50 ${selectedIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-sparta-gold flex items-center justify-center text-black font-bold text-xs">
                        {selectedIds.size}
                    </div>
                    <span className="text-white text-sm font-medium">Выбрано</span>
                </div>

                <div className="w-px h-6 bg-white/10" />

                <button
                    onClick={() => handleBulkHide(true)}
                    className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-bold"
                >
                    <EyeOff size={18} />
                    Скрыть
                </button>

                <button
                    onClick={() => handleBulkHide(false)}
                    className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-bold"
                >
                    <Eye size={18} />
                    Показать
                </button>

                <div className="w-px h-6 bg-white/10" />

                <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm font-bold"
                >
                    <Trash2 size={18} />
                    Удалить
                </button>

                <button
                    onClick={() => setSelectedIds(new Set())}
                    className="p-1 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Ban Modal */}
            {banModalOpen && banTargetUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <button
                            onClick={() => setBanModalOpen(false)}
                            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-russo text-white mb-6 pr-8">Ограничение пользователя</h2>

                        <div className="mb-6 bg-white/5 rounded-xl p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-sparta-gold/20 flex items-center justify-center text-sparta-gold font-bold shrink-0">
                                {banTargetUser.name[0].toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <div className="text-white font-bold truncate">{banTargetUser.name}</div>
                                <div className="text-white/50 text-xs truncate">ID: {banTargetUser.id}</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-white/70 text-sm mb-2">Тип ограничения</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setBanType('comment')}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-colors ${banType === 'comment' ? 'bg-sparta-gold/10 border-sparta-gold text-sparta-gold' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}
                                    >
                                        <MessageSquare size={16} className="inline mr-2" />
                                        Только комменты
                                    </button>
                                    <button
                                        onClick={() => setBanType('full')}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-colors ${banType === 'full' ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}
                                    >
                                        <Ban size={16} className="inline mr-2" />
                                        Полный Бан
                                    </button>
                                </div>
                            </div>

                            {banType === 'comment' && (
                                <>
                                    <div>
                                        <label className="block text-white/70 text-sm mb-2">Срок запрета</label>
                                        <select
                                            value={banDuration}
                                            onChange={(e) => setBanDuration(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-sparta-gold outline-none"
                                        >
                                            <option value="1">На 1 час</option>
                                            <option value="24">На 24 часа (Сутки)</option>
                                            <option value="168">На 7 дней (Неделя)</option>
                                            <option value="720">На 30 дней (Месяц)</option>
                                            <option value="forever">Навсегда</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-white/70 text-sm mb-2">Причина (будет видна пользователю)</label>
                                        <input
                                            type="text"
                                            value={banReason}
                                            onChange={(e) => setBanReason(e.target.value)}
                                            placeholder="Например: Спам, нецензурная лексика"
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-sparta-gold outline-none"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="mt-8 flex justify-between gap-3 border-t border-white/10 pt-6">
                            <button
                                onClick={handleClearUserComments}
                                className="px-4 py-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2 text-sm max-w-[50%] text-left"
                                title="Удалить все сообщения и ответы этого пользователя"
                            >
                                <Trash2 size={16} className="shrink-0" />
                                Очистить все комментарии автора
                            </button>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setBanModalOpen(false)}
                                    className="px-6 py-2 rounded-xl text-white/70 hover:bg-white/10 transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleApplyBan}
                                    className={`px-6 py-2 rounded-xl font-bold transition-colors shadow-lg ${banType === 'full' ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' : 'bg-sparta-gold hover:bg-[#ffd700] text-black shadow-sparta-gold/20'}`}
                                >
                                    Применить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminComments;
