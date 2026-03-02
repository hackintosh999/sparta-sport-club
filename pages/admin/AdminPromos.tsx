import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Copy, Search, Calendar, Users, Tag, AlertCircle, Check, Loader2, Sparkles, Layers } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, serverTimestamp, Timestamp, onSnapshot } from 'firebase/firestore';

interface PromoCode {
    id: string;
    code: string;
    type: 'spins' | 'discount' | 'balance';
    value: number;
    maxUses: number; // -1 for infinite
    currentUses: number;
    expiresAt: Timestamp | null;
    createdAt: Timestamp;
    batchId?: string;
    applicableTo?: 'all' | 'subscriptions' | 'shop';
}

const AdminPromos = () => {
    const [promos, setPromos] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Create Form State
    const [newCode, setNewCode] = useState('');
    const [type, setType] = useState<'spins' | 'discount' | 'balance'>('spins');
    const [applicableTo, setApplicableTo] = useState<'all' | 'subscriptions' | 'shop'>('all');
    const [value, setValue] = useState(1);
    const [maxUses, setMaxUses] = useState(1); // Default 1 use
    const [isUnlimited, setIsUnlimited] = useState(false);
    const [expiryDate, setExpiryDate] = useState('');

    // Batch Mode
    const [isBatch, setIsBatch] = useState(false);
    const [batchCount, setBatchCount] = useState(10);
    const [batchPrefix, setBatchPrefix] = useState('SPARTA');

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'promo_codes'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PromoCode));
            setPromos(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching promos:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const generateCode = (prefix: string = '') => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = prefix ? `${prefix}-` : '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const expiryTimestamp = expiryDate ? Timestamp.fromDate(new Date(expiryDate)) : null;
        const usesLimit = isUnlimited ? -1 : maxUses;

        try {
            if (isBatch) {
                // Batch Generation
                const batchId = generateCode('BATCH');
                const promises = [];
                for (let i = 0; i < batchCount; i++) {
                    const code = generateCode(batchPrefix);
                    promises.push(addDoc(collection(db, 'promo_codes'), {
                        code,
                        type,
                        applicableTo,
                        value: Number(value),
                        maxUses: usesLimit,
                        currentUses: 0,
                        usersUsed: [],
                        expiresAt: expiryTimestamp,
                        createdAt: serverTimestamp(),
                        batchId
                    }));
                }
                await Promise.all(promises);
            } else {
                // Single Creation
                await addDoc(collection(db, 'promo_codes'), {
                    code: newCode.toUpperCase(),
                    type,
                    applicableTo,
                    value: Number(value),
                    maxUses: usesLimit,
                    currentUses: 0,
                    usersUsed: [],
                    expiresAt: expiryTimestamp,
                    createdAt: serverTimestamp()
                });
            }

            setIsCreateModalOpen(false);
            // Reset form
            setNewCode('');
            setIsBatch(false);
        } catch (error) {
            console.error("Error creating promo:", error);
            alert("Ошибка при создании");
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Удалить этот промокод?')) {
            await deleteDoc(doc(db, 'promo_codes', id));
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could show toast here
    };

    const filteredPromos = promos.filter(p =>
        p.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-black/40 p-6 rounded-2xl border border-white/5 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-sparta-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                    <h1 className="text-4xl font-russo text-white mb-2">Промокоды</h1>
                    <p className="text-gray-400 font-manrope">Конструктор акций, скидок и бонусов</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="relative z-10 bg-sparta-gold text-black px-6 py-3 rounded-xl font-bold font-manrope flex items-center gap-2 hover:bg-yellow-500 hover:scale-105 transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                >
                    <Plus size={20} />
                    Создать Промокод
                </button>
            </div>

            {/* Search */}
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-sparta-gold/0 via-sparta-gold/10 to-transparent rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={20} />
                <input
                    type="text"
                    placeholder="Поиск по коду..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="relative w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-sparta-gold/50 transition-colors font-manrope backdrop-blur-sm"
                />
            </div>

            {/* Table */}
            <div className="bg-black/40 rounded-2xl border border-white/5 overflow-hidden backdrop-blur-sm shadow-xl">
                <div className="grid grid-cols-7 gap-4 p-4 border-b border-white/5 text-gray-400 font-manrope text-sm font-bold uppercase tracking-wider">
                    <div className="col-span-2">Код</div>
                    <div>Тип</div>
                    <div>Значение</div>
                    <div>Исп. Limit</div>
                    <div>Срок</div>
                    <div className="text-right">Действия</div>
                </div>

                {loading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 className="animate-spin text-sparta-gold" size={32} />
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {filteredPromos.map((promo) => {
                            const isExpired = promo.expiresAt && promo.expiresAt.toDate() < new Date();
                            const isExhausted = promo.maxUses !== -1 && promo.currentUses >= promo.maxUses;
                            const isActive = !isExpired && !isExhausted;

                            return (
                                <div key={promo.id} className={`grid grid-cols-7 gap-4 p-4 items-center hover:bg-white/5 transition-all group ${!isActive ? 'opacity-40 grayscale' : ''}`}>
                                    <div className="col-span-2 flex items-center gap-3">
                                        <div className="bg-black p-2.5 rounded-xl border border-white/10 font-mono text-sparta-gold font-bold tracking-widest text-lg shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] flex items-center justify-between w-full max-w-[200px]">
                                            {promo.code}
                                            <button
                                                onClick={() => copyToClipboard(promo.code)}
                                                className="text-white/20 hover:text-sparta-gold transition-colors"
                                                title="Копировать"
                                            >
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                        {promo.batchId && (
                                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md border border-blue-500/20 flex items-center gap-1 uppercase tracking-widest font-bold">
                                                <Layers size={10} /> {promo.batchId}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <div className={`
                                            inline-flex flex-col gap-1 items-start
                                        `}>
                                            <div className={`
                                                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border
                                                ${promo.type === 'spins' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                    promo.type === 'discount' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}
                                            `}>
                                                {promo.type === 'spins' && <Sparkles size={12} />}
                                                {promo.type === 'discount' && <Tag size={12} />}
                                                {promo.type === 'balance' && <AlertCircle size={12} />}
                                                {promo.type === 'spins' ? 'Вращение' : promo.type === 'discount' ? 'Скидка' : 'Баланс'}
                                            </div>
                                            {promo.applicableTo === 'subscriptions' && <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded-md border border-white/10 uppercase tracking-widest whitespace-nowrap">Только Подписки</span>}
                                            {promo.applicableTo === 'shop' && <span className="text-[10px] text-sparta-gold/70 bg-sparta-gold/10 px-2 py-0.5 rounded-md border border-sparta-gold/20 uppercase tracking-widest whitespace-nowrap">Только Магазин</span>}
                                        </div>
                                    </div>
                                    <div className="text-white font-bold text-lg font-russo">
                                        {promo.type === 'discount' ? <span className="text-green-400">-{promo.value}%</span> : promo.value}
                                    </div>
                                    <div className="text-gray-300 flex items-center gap-2 font-mono">
                                        <Users size={14} className="text-white/40" />
                                        <span className={isExhausted ? 'text-red-400' : 'text-white'}>{promo.currentUses}</span>
                                        <span className="text-white/30">/</span>
                                        <span className="text-white/50">{promo.maxUses === -1 ? '∞' : promo.maxUses}</span>
                                    </div>
                                    <div className="text-sm font-medium">
                                        {promo.expiresAt ? (
                                            <span className={isExpired ? 'text-red-400' : 'text-white/70'}>
                                                {promo.expiresAt.toDate().toLocaleDateString('ru-RU')}
                                            </span>
                                        ) : (
                                            <span className="text-sparta-gold/50 flex flex-col">
                                                <span>Бессрочно</span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex justify-end pr-2">
                                        <button
                                            onClick={() => handleDelete(promo.id)}
                                            className="p-2 bg-red-500/10 text-red-500/50 hover:bg-red-500 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="Удалить код"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-[#111] border border-white/10 rounded-3xl p-8 w-full max-w-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sparta-gold to-transparent opacity-50" />
                            <h2 className="text-3xl font-russo text-white mb-2">Создать Промокод</h2>
                            <p className="text-white/40 font-manrope mb-8 text-sm">Настройте тип бонуса, лимиты и сроки действия</p>

                            <form onSubmit={handleCreate} className="space-y-6">
                                {/* Type Selection */}
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { id: 'spins', label: 'Вращения', icon: Sparkles },
                                        { id: 'discount', label: 'Скидка', icon: Tag },
                                        { id: 'balance', label: 'Баланс', icon: AlertCircle } // Placeholder icon
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setType(t.id as any)}
                                            className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${type === t.id
                                                ? 'bg-white/10 border-white/20 text-white shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]'
                                                : 'bg-black/30 border-transparent text-white/30 hover:bg-white/5 hover:text-white/70'
                                                }`}
                                        >
                                            <t.icon size={28} className={type === t.id ? 'text-sparta-gold' : ''} />
                                            <span className="font-bold text-sm uppercase tracking-wider">{t.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Applicable To Selection */}
                                <div>
                                    <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Применяется к</label>
                                    <div className="flex gap-2">
                                        {[
                                            { id: 'all', label: 'Ко всему' },
                                            { id: 'subscriptions', label: 'Подписки' },
                                            { id: 'shop', label: 'Товары Магазина' }
                                        ].map((t) => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => setApplicableTo(t.id as any)}
                                                className={`flex-1 py-3 px-2 rounded-xl border text-sm font-bold uppercase tracking-wide transition-all ${applicableTo === t.id
                                                    ? 'bg-sparta-gold/10 border-sparta-gold text-sparta-gold shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                                                    : 'bg-black/30 border-white/5 text-white/40 hover:text-white/70 hover:bg-white/5'
                                                    }`}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Mode Selection (Single vs Batch) */}
                                <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setIsBatch(false)}
                                        className={`flex-1 py-2 rounded-lg font-bold transition-all text-sm ${!isBatch ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/70'}`}
                                    >
                                        Одиночный Код
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsBatch(true)}
                                        className={`flex-1 py-2 rounded-lg font-bold transition-all text-sm ${isBatch ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/70'}`}
                                    >
                                        Массовая Генерация (Batch)
                                    </button>
                                </div>

                                {/* Fields */}
                                <div className="grid grid-cols-2 gap-6 bg-black/20 p-6 rounded-2xl border border-white/5">
                                    {isBatch ? (
                                        <>
                                            <div>
                                                <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Префикс Кодов</label>
                                                <input
                                                    type="text"
                                                    value={batchPrefix}
                                                    onChange={e => setBatchPrefix(e.target.value.toUpperCase())}
                                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white uppercase focus:border-sparta-gold outline-none transition-colors"
                                                    placeholder="SPARTA"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Количество</label>
                                                <input
                                                    type="number"
                                                    value={batchCount}
                                                    onChange={e => setBatchCount(Number(e.target.value))}
                                                    min="1" max="500"
                                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold outline-none transition-colors"
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="col-span-2">
                                            <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Уникальный Код</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newCode}
                                                    onChange={e => setNewCode(e.target.value.toUpperCase())}
                                                    className="flex-1 bg-black/50 border border-white/10 rounded-xl p-4 text-white uppercase font-mono tracking-widest text-lg focus:border-sparta-gold outline-none transition-colors"
                                                    placeholder="Оставьте пустым для автосгенерации"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setNewCode(generateCode())}
                                                    className="bg-white/5 px-6 rounded-xl text-white/50 hover:text-sparta-gold hover:bg-white/10 transition-all border border-white/5"
                                                    title="Сгенерировать случайно"
                                                >
                                                    <Sparkles size={24} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-2">
                                            {type === 'discount' ? 'Размер скидки (%)' : type === 'balance' ? 'Сумма зачисления' : 'Количество вращений'}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={value}
                                                onChange={e => setValue(Number(e.target.value))}
                                                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white font-bold text-lg focus:border-sparta-gold outline-none pl-10 transition-colors"
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 font-bold">
                                                {type === 'discount' ? '%' : type === 'balance' ? '₽' : 'x'}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Срок действия (включительно)</label>
                                        <input
                                            type="date"
                                            value={expiryDate}
                                            onChange={e => setExpiryDate(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold outline-none transition-colors [color-scheme:dark]"
                                        />
                                    </div>

                                    <div className="col-span-2 pt-4 border-t border-white/5 mt-2">
                                        <label className="flex items-center gap-4 cursor-pointer p-4 bg-black/30 rounded-xl border border-white/5 hover:bg-white/5 transition-all group">
                                            <div className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${isUnlimited ? 'bg-sparta-gold border-sparta-gold text-black' : 'border-white/20 text-transparent'}`}>
                                                <Check size={16} />
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={isUnlimited}
                                                onChange={e => setIsUnlimited(e.target.checked)}
                                                className="hidden"
                                            />
                                            <div>
                                                <span className="text-white font-bold block">Многоразовый промокод</span>
                                                <span className="text-white/40 text-xs block mt-0.5">Код не имеет ограничения по общему числу активаций</span>
                                            </div>
                                        </label>

                                        {!isUnlimited && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="mt-4"
                                            >
                                                <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Макс. число активаций (всего)</label>
                                                <input
                                                    type="number"
                                                    value={maxUses}
                                                    onChange={e => setMaxUses(Number(e.target.value))}
                                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold outline-none transition-colors"
                                                />
                                            </motion.div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="flex-1 py-4 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-colors"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] bg-sparta-gold text-black py-4 rounded-xl font-bold hover:bg-yellow-500 transition-all flex justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : (
                                            <div className="flex items-center gap-2">
                                                <Sparkles size={18} /> Создать Код{isBatch ? 'ы' : ''}
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminPromos;
