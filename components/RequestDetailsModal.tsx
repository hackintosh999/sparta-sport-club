
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, User, Phone, Mail, MessageSquare, Ban, CheckCircle2, AlertCircle, Clock, Trash2, Edit2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface RequestDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: any;
    onContactSupport: () => void;
}

const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({ isOpen, onClose, request, onContactSupport }) => {
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        parentName: '',
        parentPhone: ''
    });

    React.useEffect(() => {
        if (request) {
            setEditForm({
                parentName: request.parentName || request.name || '',
                parentPhone: request.parentPhone || request.phone || ''
            });
            setIsEditing(false);
        }
    }, [request]);

    if (!isOpen || !request) return null;

    const handleDelete = async () => {
        const isNew = request.status === 'new';
        const confirmMessage = isNew
            ? 'Отменить и удалить эту заявку?'
            : 'Удалить эту заявку из истории?';

        if (!window.confirm(confirmMessage)) return;

        setLoading(true);
        try {
            await deleteDoc(doc(db, "requests", request.id));
            onClose();
        } catch (error) {
            console.error("Error deleting request:", error);
            alert("Не удалось удалить заявку.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateDoc(doc(db, "requests", request.id), {
                parentName: editForm.parentName,
                parentPhone: editForm.parentPhone,
                name: editForm.parentName, // Keep compatible with older fields if needed
                phone: editForm.parentPhone,
                updatedAt: new Date()
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating request:", error);
            alert("Не удалось сохранить изменения.");
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'completed': return { label: 'Завершено', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircle2 };
            case 'contacted': return { label: 'В работе', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: MessageSquare };
            case 'rejected': return { label: 'Отклонено', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Ban };
            case 'cancelled': return { label: 'Отменено', color: 'text-gray-400', bg: 'bg-white/5', border: 'border-white/10', icon: Ban };
            default: return { label: 'На рассмотрении', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: Clock };
        }
    };

    const statusInfo = getStatusInfo(request.status);
    const StatusIcon = statusInfo.icon;
    const canEdit = request.status === 'new';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative bg-[#121212] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl overflow-hidden"
                >
                    {/* Background Glow */}
                    <div className={`absolute top - 0 right - 0 w - 64 h - 64 ${statusInfo.bg.replace('/10', '/5')} blur - [80px] rounded - full pointer - events - none`} />

                    {/* Header */}
                    <div className="flex justify-between items-start mb-8 relative">
                        <div>
                            <h2 className="text-2xl font-bold text-white font-russo mb-2">Детали заявки</h2>
                            <p className="text-white/50 text-sm">ID: {request.id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {canEdit && !isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-sparta-gold"
                                    title="Редактировать"
                                >
                                    <Edit2 size={20} />
                                </button>
                            )}
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`flex items - center gap - 2 px - 4 py - 3 rounded - xl border mb - 8 ${statusInfo.bg} ${statusInfo.border} `}>
                        <StatusIcon size={20} className={statusInfo.color} />
                        <span className={`font - bold ${statusInfo.color} `}>{statusInfo.label}</span>
                    </div>

                    {/* Content Grid */}
                    <div className="space-y-6 mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-xs text-white/30 uppercase font-bold tracking-wider">Программа</label>
                                <div className="text-white font-medium flex items-center gap-2">
                                    <Calendar size={16} className="text-sparta-gold" />
                                    {request.programType || 'Пробная тренировка'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-white/30 uppercase font-bold tracking-wider">Дата создания</label>
                                <div className="text-white font-medium">
                                    {request.createdAt?.seconds
                                        ? format(new Date(request.createdAt.seconds * 1000), 'd MMMM yyyy HH:mm', { locale: ru })
                                        : 'Неизвестно'}
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-white/5" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-xs text-white/30 uppercase font-bold tracking-wider">Имя спортсмена</label>
                                <div className="text-white font-medium flex items-center gap-2">
                                    <User size={16} className="text-white/50" />
                                    {request.childName || 'Не указано'}
                                </div>
                            </div>

                            {/* Parent Name Field */}
                            <div className="space-y-1">
                                <label className="text-xs text-white/30 uppercase font-bold tracking-wider">Имя родителя</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editForm.parentName}
                                        onChange={(e) => setEditForm({ ...editForm, parentName: e.target.value })}
                                        className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-1 text-white text-sm focus:border-sparta-gold outline-none"
                                    />
                                ) : (
                                    <div className="text-white font-medium flex items-center gap-2">
                                        <User size={16} className="text-white/50" />
                                        {request.parentName || request.name || 'Не указано'}
                                    </div>
                                )}
                            </div>

                            {/* Phone Field */}
                            <div className="space-y-1">
                                <label className="text-xs text-white/30 uppercase font-bold tracking-wider">Телефон</label>
                                {isEditing ? (
                                    <input
                                        type="tel"
                                        value={editForm.parentPhone}
                                        onChange={(e) => setEditForm({ ...editForm, parentPhone: e.target.value })}
                                        className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-1 text-white text-sm focus:border-sparta-gold outline-none"
                                    />
                                ) : (
                                    <div className="text-white font-medium flex items-center gap-2">
                                        <Phone size={16} className="text-white/50" />
                                        {request.parentPhone || request.phone || 'Не указано'}
                                    </div>
                                )}
                            </div>
                            {/* Optional fields if they exist */}
                            {request.email && (
                                <div className="space-y-1">
                                    <label className="text-xs text-white/30 uppercase font-bold tracking-wider">Email</label>
                                    <div className="text-white font-medium flex items-center gap-2">
                                        <Mail size={16} className="text-white/50" />
                                        {request.email}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl transition-all font-bold border border-white/10"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-2 bg-sparta-gold text-black hover:bg-yellow-500 py-3 rounded-xl transition-all font-bold disabled:opacity-50"
                                >
                                    {loading ? 'Сохранение...' : 'Сохранить'}
                                    <Save size={18} />
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => { onClose(); onContactSupport(); }}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl transition-all font-bold border border-white/10"
                                >
                                    <MessageSquare size={18} />
                                    Поддержка
                                </button>

                                <button
                                    onClick={handleDelete}
                                    disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3 rounded-xl transition-all font-bold border border-red-500/20 disabled:opacity-50"
                                >
                                    <Trash2 size={18} />
                                    {loading ? 'Удаление...' : (request.status === 'new' ? 'Отменить' : 'Удалить')}
                                </button>
                            </>
                        )}
                    </div>

                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default RequestDetailsModal;
