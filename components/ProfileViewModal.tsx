import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Calendar, Phone, Hash, Mail, Trophy, Edit2, Save, Upload, Shirt, Activity, Tag, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, collection, query, where, getDocs, runTransaction, writeBatch, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Trash2 } from 'lucide-react'; // Ensure Trash2 is imported

interface ProfileViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    userData: any;
}

const ProfileViewModal: React.FC<ProfileViewModalProps> = ({ isOpen, onClose, userData }) => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        childSurname: '',
        childName: '',
        childAge: '',
        childDobYear: '',
        parentPhone: '',
        jerseyNumber: '',
        position: 'Нападающий',
        photoURL: ''
    });

    React.useEffect(() => {
        if (userData) {
            setFormData({
                childSurname: userData.childSurname || '',
                childName: userData.childName || '',
                childAge: userData.childAge || '',
                childDobYear: userData.childDobYear || '',
                parentPhone: userData.parentPhone || '',
                jerseyNumber: userData.jerseyNumber || '',
                position: userData.position || 'Нападающий',
                photoURL: userData.photoURL || ''
            });
        }
    }, [userData]);

    // Helper to resize image and convert to Base64
    const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 500;
                    const MAX_HEIGHT = 500;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 0.7 quality
                };
                img.onerror = error => reject(error);
            };
            reader.onerror = error => reject(error);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && user) {
            const file = e.target.files[0];

            if (file.size > 5 * 1024 * 1024) {
                alert("Файл слишком большой (максимум 5 МБ)");
                return;
            }

            setUploading(true);
            try {
                // 1. Resize image client-side first (crucial for Base64 fallback)
                const optimizedBase64 = await resizeImage(file);

                try {
                    // 2. Try Firebase Storage Upload
                    const storageRef = ref(storage, `avatars/${user.uid}_${Date.now()}`);
                    const uploadPromise = uploadBytes(storageRef, file);
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("Timeout")), 10000)
                    );

                    await Promise.race([uploadPromise, timeoutPromise]);
                    const url = await getDownloadURL(storageRef);
                    setFormData(prev => ({ ...prev, photoURL: url }));
                } catch (uploadError) {
                    console.warn("Storage upload failed, falling back to Base64:", uploadError);
                    // 3. Fallback: Use Base64 directly if Storage failed (CORS/Network issues)
                    setFormData(prev => ({ ...prev, photoURL: optimizedBase64 }));
                    // alert("Использован альтернативный метод загрузки (Base64)");
                }
            } catch (error) {
                console.error("Error processing avatar:", error);
                alert("Не удалось обработать фото");
            } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            await updateDoc(doc(db, "users", user.uid), {
                ...formData,
                updatedAt: new Date()
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Не удалось сохранить профиль");
        } finally {
            setLoading(false);
        }
    };

    // Promo Code Logic
    const [promoCode, setPromoCode] = useState('');
    const [promoLoading, setPromoLoading] = useState(false);

    const handleActivatePromo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !promoCode.trim()) return;
        setPromoLoading(true);

        try {
            const code = promoCode.toUpperCase().trim();
            const q = query(collection(db, 'promo_codes'), where('code', '==', code));
            const snap = await getDocs(q);

            if (snap.empty) {
                alert("Промокод не найден");
                setPromoLoading(false);
                return;
            }

            const promoDoc = snap.docs[0];
            const promoRef = doc(db, 'promo_codes', promoDoc.id);

            await runTransaction(db, async (transaction) => {
                // 1. READ all necessary docs first
                const pDoc = await transaction.get(promoRef);
                if (!pDoc.exists()) throw "Code error";
                const pData = pDoc.data();

                // Validation
                if (pData.expiresAt && pData.expiresAt.toDate() < new Date()) throw "Срок действия истек";
                if (pData.maxUses !== -1 && pData.currentUses >= pData.maxUses) throw "Лимит активаций исчерпан";
                if (pData.usersUsed?.includes(user.uid)) throw "Вы уже использовали этот код";

                // Prepare reads for specific types
                let currentSpins = 0;
                let userBonusRef: any = null;
                let userRef: any = null;
                let currentUserData: any = null;

                if (pData.type === 'spins' || pData.type === 'discount') {
                    userBonusRef = doc(db, 'users', user.uid, 'private', 'bonus_state');
                    const uDoc = await transaction.get(userBonusRef);
                    if (uDoc.exists()) {
                        const data = uDoc.data() as any;
                        currentSpins = data.spinsAvailable || 0;
                        currentUserData = data;
                    }
                } else if (pData.type === 'balance') {
                    userRef = doc(db, 'users', user.uid);
                    const uDoc = await transaction.get(userRef);
                    if (uDoc.exists()) {
                        currentUserData = uDoc.data();
                    }
                }

                // 2. WRITE updates
                transaction.update(promoRef, {
                    currentUses: (pData.currentUses || 0) + 1,
                    usersUsed: [...(pData.usersUsed || []), user.uid]
                });

                if (pData.type === 'spins' && userBonusRef) {
                    transaction.set(userBonusRef, {
                        spinsAvailable: currentSpins + (pData.value || 1)
                    }, { merge: true });
                } else if (pData.type === 'discount' && userBonusRef) {
                    const newDiscount = {
                        id: `promo_${Date.now()}`,
                        type: 'promo_discount',
                        value: pData.value,
                        code: code,
                        grantedAt: new Date().toISOString()
                    };
                    const existingBonuses = currentUserData?.bonuses || [];
                    transaction.set(userBonusRef, {
                        bonuses: [...existingBonuses, newDiscount]
                    }, { merge: true });
                } else if (pData.type === 'balance' && userRef) {
                    const currentBalance = currentUserData?.walletBalance || 0;
                    transaction.set(userRef, {
                        walletBalance: currentBalance + (pData.value || 0)
                    }, { merge: true });
                }
            });

            if (promoDoc.data().type === 'discount') {
                alert(`Скидка ${promoDoc.data().value}% получена! Проверьте ваши бонусы.`);
            } else if (promoDoc.data().type === 'balance') {
                alert(`Ваш баланс пополнен на ${promoDoc.data().value}₽!`);
            } else {
                alert(`Промокод активирован. Получено вращений: ${promoDoc.data().value}`);
            }
            setPromoCode('');
        } catch (error: any) {
            console.error("Promo Activation Error:", error);
            const msg = typeof error === 'string' ? error : (error?.message || "Неизвестная ошибка активации");
            alert(`Ошибка: ${msg}`);
        }
        setPromoLoading(false);
    };

    // Revoke Achievement Logic
    const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
    const [revokeId, setRevokeId] = useState<string | null>(null);
    const [revokeReason, setRevokeReason] = useState('');

    const handleRevokeAchievement = async () => {
        if (!revokeId || !userData) return;
        setLoading(true);

        try {
            const batch = writeBatch(db);
            const userRef = doc(db, "users", userData.id);

            // 1. Remove Achievement from array
            const updatedAchievements = userData.achievements.filter((a: any) => a.id !== revokeId);
            batch.update(userRef, { achievements: updatedAchievements });

            // 2. Notification (Optional)
            if (revokeReason.trim() && userData.email) {
                const notifRef = doc(collection(db, "notifications"));
                batch.set(notifRef, {
                    userId: userData.id,
                    email: userData.email,
                    title: "Награда отозвана 😔",
                    message: `Ваша награда была отозвана администратором. Причина: ${revokeReason}`,
                    isRead: false,
                    type: 'alert',
                    createdAt: serverTimestamp()
                });
            }

            await batch.commit();
            // alert("Награда отозвана"); // Silent success is better for UX here, or use toast if available
            setIsRevokeModalOpen(false);
            setRevokeId(null);
            setRevokeReason('');
            onClose(); // Close main modal to refresh data
        } catch (error) {
            console.error(error);
            alert("Ошибка при отзыве");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md overflow-hidden border border-sparta-gold/30 shadow-[0_0_60px_rgba(212,175,55,0.15)] pointer-events-auto relative">
                            {/* Header Actions */}
                            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                                {!isEditing && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="p-2 text-white/30 hover:text-sparta-gold transition-colors rounded-full hover:bg-white/5"
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                )}
                                <button onClick={onClose} className="p-2 text-white/30 hover:text-white transition-colors rounded-full hover:bg-white/5">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Decorative Glow */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-sparta-gold to-transparent" />

                            <div className="p-8">
                                <div className="text-center mb-8">
                                    <h2 className="font-russo text-2xl text-white mb-2">
                                        {isEditing ? 'Редактирование' : 'Профиль спортсмена'}
                                    </h2>
                                    <p className="text-white/50 text-sm font-manrope">
                                        {isEditing ? 'Настройте свой спортивный профиль' : 'Информация об участнике клуба'}
                                    </p>
                                </div>

                                {userData ? (
                                    <div className="space-y-4 font-manrope">

                                        {/* Avatar & Basic Info */}
                                        <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex items-start gap-4">
                                            <div className="relative group">
                                                <div className="w-20 h-20 rounded-full bg-sparta-gold/10 flex items-center justify-center text-sparta-gold shrink-0 overflow-hidden border border-white/10">
                                                    {(formData.photoURL || user?.photoURL) ? (
                                                        <img src={formData.photoURL || user?.photoURL || ''} alt="Avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Trophy size={32} />
                                                    )}
                                                </div>
                                                {isEditing && (
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
                                                    >
                                                        <Upload size={20} className="text-white" />
                                                    </button>
                                                )}
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                    accept="image/*"
                                                />
                                            </div>

                                            <div className="flex-1 space-y-3">
                                                <div>
                                                    <p className="text-xs text-white/40 uppercase tracking-widest mb-1">ФИО Спортсмена</p>
                                                    {isEditing ? (
                                                        <div className="space-y-2">
                                                            <input
                                                                value={formData.childSurname}
                                                                onChange={e => setFormData({ ...formData, childSurname: e.target.value })}
                                                                placeholder="Фамилия"
                                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white focus:border-sparta-gold outline-none"
                                                            />
                                                            <input
                                                                value={formData.childName}
                                                                onChange={e => setFormData({ ...formData, childName: e.target.value })}
                                                                placeholder="Имя"
                                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white focus:border-sparta-gold outline-none"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <p className="text-white font-bold text-lg">{userData.childSurname} {userData.childName}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Jersey & Position */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-black/40 p-4 rounded-xl border border-white/5 relative overflow-hidden group">
                                                {/* Jersey Background Effect */}
                                                <Shirt className="absolute -right-4 -bottom-4 text-white/5 w-24 h-24 rotate-12" />

                                                <div className="relative z-10">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Hash size={14} className="text-white/30" />
                                                        <p className="text-[10px] text-white/40 uppercase">Номер</p>
                                                    </div>
                                                    {isEditing ? (
                                                        <input
                                                            value={formData.jerseyNumber}
                                                            onChange={e => setFormData({ ...formData, jerseyNumber: e.target.value })}
                                                            placeholder="#"
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white text-xl font-bold focus:border-sparta-gold outline-none"
                                                        />
                                                    ) : (
                                                        <p className="text-sparta-gold font-bold text-4xl font-russo tracking-wider">
                                                            {userData.jerseyNumber || '#'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Activity size={14} className="text-white/30" />
                                                    <p className="text-[10px] text-white/40 uppercase">Позиция</p>
                                                </div>
                                                {isEditing ? (
                                                    <select
                                                        value={formData.position}
                                                        onChange={e => setFormData({ ...formData, position: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-sparta-gold outline-none [&>option]:bg-[#1a1a1a]"
                                                    >
                                                        <option value="Нападающий">Нападающий</option>
                                                        <option value="Защитник">Защитник</option>
                                                        <option value="Вратарь">Вратарь</option>
                                                        <option value="Полузащитник">Полузащитник</option>
                                                    </select>
                                                ) : (
                                                    <p className="text-white font-bold text-lg leading-tight">
                                                        {userData.position || 'Нападающий'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Hash size={14} className="text-white/30" />
                                                    <p className="text-[10px] text-white/40 uppercase">Возраст</p>
                                                </div>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={formData.childAge}
                                                        onChange={e => setFormData({ ...formData, childAge: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white focus:border-sparta-gold outline-none font-bold"
                                                    />
                                                ) : (
                                                    <p className="text-white font-bold text-xl">{userData.childAge} <span className="text-sm font-normal text-white/30">лет</span></p>
                                                )}
                                            </div>
                                            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Calendar size={14} className="text-white/30" />
                                                    <p className="text-[10px] text-white/40 uppercase">Год рожд.</p>
                                                </div>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={formData.childDobYear}
                                                        onChange={e => setFormData({ ...formData, childDobYear: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white focus:border-sparta-gold outline-none font-bold"
                                                    />
                                                ) : (
                                                    <p className="text-white font-bold text-xl">{userData.childDobYear}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Contact Info */}
                                        <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-3">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/30">
                                                    <Phone size={18} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Телефон родителя</p>
                                                    {isEditing ? (
                                                        <input
                                                            type="tel"
                                                            value={formData.parentPhone}
                                                            onChange={e => setFormData({ ...formData, parentPhone: e.target.value })}
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white focus:border-sparta-gold outline-none font-bold"
                                                        />
                                                    ) : (
                                                        <p className="text-white font-bold tracking-wider">{userData.parentPhone}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="w-full h-px bg-white/5" />
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/30">
                                                    <Mail size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Email аккаунта</p>
                                                    <p className="text-white font-bold text-sm text-white/70">{userData.email}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Achievements Section */}
                                        <div className="mt-6 border-t border-white/10 pt-6">
                                            <h3 className="text-white font-russo text-lg mb-4 flex items-center gap-2">
                                                <Trophy className="text-sparta-gold" size={20} />
                                                Награды ({userData?.achievements?.length || 0})
                                            </h3>

                                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                                {userData?.achievements?.map((ach: any) => (
                                                    <div key={ach.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 group">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center text-sparta-gold border border-white/10">
                                                                <Trophy size={16} />
                                                            </div>
                                                            <div>
                                                                <p className="text-white text-sm font-bold">
                                                                    Награда
                                                                </p>
                                                                <p className="text-white/40 text-xs">
                                                                    {new Date(ach.date).toLocaleDateString()} • {ach.reason || 'За заслуги'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {user?.uid && userData?.role !== 'admin' && (
                                                            <button
                                                                onClick={() => {
                                                                    setRevokeId(ach.id);
                                                                    setRevokeReason('');
                                                                    setIsRevokeModalOpen(true);
                                                                }}
                                                                className="p-2 text-white/20 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Забрать награду"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                {(!userData?.achievements || userData.achievements.length === 0) && (
                                                    <p className="text-white/30 text-sm italic">Наград пока нет</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Promo Code Section */}
                                        <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-3 mt-4">
                                            <div className="flex items-center gap-2">
                                                <Tag size={16} className="text-sparta-gold" />
                                                <p className="text-xs text-white/40 uppercase tracking-widest">Промокод</p>
                                            </div>
                                            <form onSubmit={handleActivatePromo} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={promoCode}
                                                    onChange={e => setPromoCode(e.target.value)}
                                                    placeholder="CODE"
                                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-sparta-gold outline-none uppercase font-bold tracking-wider"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={!promoCode || promoLoading}
                                                    className="bg-sparta-gold text-black px-4 rounded-lg font-bold text-sm hover:bg-yellow-500 disabled:opacity-50 flex items-center justify-center transition-colors"
                                                >
                                                    {promoLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'OK'}
                                                </button>
                                            </form>
                                            <p className="text-[10px] text-white/30 leading-tight">
                                                Введите код для получения бонусов, скидок или вращений.
                                            </p>
                                        </div>

                                        {isEditing && (
                                            <div className="flex gap-3 mt-6">
                                                <button
                                                    onClick={() => setIsEditing(false)}
                                                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all"
                                                >
                                                    Отмена
                                                </button>
                                                <button
                                                    onClick={handleSave}
                                                    disabled={loading || uploading}
                                                    className="flex-1 py-3 rounded-xl bg-sparta-gold text-black font-bold hover:bg-yellow-500 transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {uploading ? 'Загрузка фото...' : loading ? 'Сохранение...' : 'Сохранить'}
                                                    <Save size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-white/30">
                                        <p>Данные профиля не найдены</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Revoke Confirmation Modal */}
                    {
                        isRevokeModalOpen && (
                            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                                    <h3 className="text-xl font-bold text-white font-russo mb-4">Отозвать награду?</h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-white/40 text-xs font-bold mb-1">Причина (опционально)</label>
                                            <textarea
                                                value={revokeReason}
                                                onChange={(e) => setRevokeReason(e.target.value)}
                                                className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-red-500/50 outline-none h-20 resize-none"
                                                placeholder="Если пусто — уведомления не будет."
                                            />
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setIsRevokeModalOpen(false)}
                                                className="flex-1 bg-white/5 text-white font-bold py-3 rounded-xl hover:bg-white/10 transition-colors"
                                            >
                                                Отмена
                                            </button>
                                            <button
                                                onClick={handleRevokeAchievement}
                                                className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all flex items-center justify-center gap-2"
                                            >
                                                <Trash2 size={18} />
                                                Забрать
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </>
            )}
        </AnimatePresence >
    );
};

export default ProfileViewModal;
