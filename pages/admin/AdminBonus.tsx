import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, getDocs, doc, updateDoc, addDoc, deleteDoc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Plus, Edit2, Trash2, AlertTriangle, Loader2, Save, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface BonusItem {
    id: string;
    label: string;
    color: string;
    probability: number;
    type: 'discount_percent' | 'discount_fixed' | 'item' | 'free_training';
    value: string;
    description?: string;
}

const DEFAULT_ITEMS: Omit<BonusItem, 'id'>[] = [
    { label: 'Скидка 5%', color: '#3B82F6', probability: 40, type: 'discount_percent', value: '5', description: 'На следующий месяц' },
    { label: 'Скидка 10%', color: '#EAB308', probability: 20, type: 'discount_percent', value: '10', description: 'На следующий месяц' },
    { label: 'Скидка 15%', color: '#10B981', probability: 10, type: 'discount_percent', value: '15', description: 'На следующий месяц' },
    { label: 'Футболка SPARTA', color: '#111827', probability: 5, type: 'item', value: 't-shirt-black', description: 'Черная футболка' },
    { label: 'Шорты SPARTA', color: '#EF4444', probability: 5, type: 'item', value: 'shorts-red', description: 'Красные шорты' },
    { label: 'Тренировка', color: '#8B5CF6', probability: 10, type: 'free_training', value: '1', description: 'Одно бесплатное занятие' },
    { label: 'Скидка 20%', color: '#F97316', probability: 5, type: 'discount_percent', value: '20', description: 'На следующий месяц' },
    { label: 'Кепка SPARTA', color: '#4ADE80', probability: 5, type: 'item', value: 'cap-green', description: 'Фирменная кепка' }
];

const AdminBonus = () => {
    // --- Items State ---
    const [items, setItems] = useState<BonusItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<BonusItem | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // --- Config State ---
    const [configLoading, setConfigLoading] = useState(true);
    const [configSaving, setConfigSaving] = useState(false);
    const [wheelConfig, setWheelConfig] = useState({
        spinDuration: 8,
        enableDailySpin: true
    });

    const [formData, setFormData] = useState<Omit<BonusItem, 'id'>>({
        label: '',
        color: '#EAB308',
        probability: 10,
        type: 'discount_percent',
        value: '',
        description: ''
    });

    useEffect(() => {
        setLoading(true);
        setConfigLoading(true);

        // 1. Listen to Items
        const q = query(collection(db, 'bonus_items'));
        const unsubscribeItems = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BonusItem));
            setItems(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching items:", error);
            setLoading(false);
        });

        // 2. Listen to Config
        const configRef = doc(db, 'config', 'wheel_settings');
        const unsubscribeConfig = onSnapshot(configRef, async (docSnap) => {
            if (docSnap.exists()) {
                setWheelConfig(docSnap.data() as any);
            } else {
                // Initialize default config if not exists
                await setDoc(configRef, { spinDuration: 8, enableDailySpin: true });
            }
            setConfigLoading(false);
        }, (error) => {
            console.error("Error fetching config:", error);
            setConfigLoading(false);
        });

        return () => {
            unsubscribeItems();
            unsubscribeConfig();
        };
    }, []);

    const handleSaveConfig = async () => {
        setConfigSaving(true);
        try {
            const configRef = doc(db, 'config', 'wheel_settings');
            await setDoc(configRef, wheelConfig);
        } catch (err) {
            console.error("Error saving config:", err);
            alert("Ошибка сохранения настроек");
        }
        setConfigSaving(false);
    };

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingItem && !isCreating) {
                const ref = doc(db, 'bonus_items', editingItem.id);
                await updateDoc(ref, { ...formData });
            } else {
                await addDoc(collection(db, 'bonus_items'), formData);
            }
            setEditingItem(null);
            setIsCreating(false);
        } catch (error) {
            console.error("Error saving item:", error);
        }
        setLoading(false);
    };

    const handleDeleteItem = async (id: string) => {
        if (window.confirm('Удалить этот сектор?')) {
            await deleteDoc(doc(db, 'bonus_items', id));
        }
    };

    const startEdit = (item: BonusItem) => {
        setFormData({
            label: item.label,
            color: item.color,
            probability: item.probability,
            type: item.type,
            value: item.value,
            description: item.description
        });
        setEditingItem(item);
        setIsCreating(false);
    };

    const startCreate = () => {
        setFormData({
            label: '',
            color: '#EAB308',
            probability: 10,
            type: 'discount_percent',
            value: '',
            description: ''
        });
        setEditingItem({ id: 'temp' } as BonusItem);
        setIsCreating(true);
    };

    const seedDefaults = async () => {
        if (!window.confirm("Это добавит стандартные призы. Продолжить?")) return;
        setLoading(true);
        for (const item of DEFAULT_ITEMS) {
            await addDoc(collection(db, 'bonus_items'), item);
        }
        setLoading(false);
    };

    const totalProbability = items.reduce((sum, item) => sum + Number(item.probability), 0);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-russo text-white mb-2">Колесо Фортуны</h1>
                    <p className="text-gray-400 font-manrope">Управление секторами и глобальными настройками</p>
                </div>
                <button
                    onClick={startCreate}
                    className="bg-sparta-gold text-black px-6 py-3 rounded-xl font-bold font-manrope flex items-center gap-2 hover:bg-yellow-500 transition-colors shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                >
                    <Plus size={20} />
                    Добавить сектор
                </button>
            </div>

            {/* Global Settings Panel */}
            <div className="bg-[#111] border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-sparta-gold opacity-5 blur-3xl rounded-full" />
                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-3 bg-white/5 rounded-xl text-white/50 group-hover:text-sparta-gold group-hover:bg-sparta-gold/10 transition-colors">
                        <Settings size={22} />
                    </div>
                    <h2 className="text-xl font-russo text-white">Глобальные Настройки</h2>
                </div>

                {!configLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4">
                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <span className="block text-white font-bold font-manrope mb-1">Ежедневный Бесплатный Спин</span>
                                    <span className="block text-white/40 text-xs">Выдавать пользователю 1 шанс раз в сутки при входе.</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={wheelConfig.enableDailySpin}
                                        onChange={(e) => setWheelConfig({ ...wheelConfig, enableDailySpin: e.target.checked })}
                                    />
                                    <div className={`block w-14 h-8 rounded-full transition-colors ${wheelConfig.enableDailySpin ? 'bg-emerald-500' : 'bg-white/10'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${wheelConfig.enableDailySpin ? 'transform translate-x-6' : ''}`}></div>
                                </div>
                            </label>
                        </div>

                        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
                            <label className="block text-white font-bold font-manrope mb-2">Длительность Вращения (сек)</label>
                            <input
                                type="range"
                                min="3"
                                max="15"
                                step="1"
                                value={wheelConfig.spinDuration}
                                onChange={(e) => setWheelConfig({ ...wheelConfig, spinDuration: Number(e.target.value) })}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sparta-gold"
                            />
                            <div className="flex justify-between text-white/30 text-xs mt-2 font-mono">
                                <span>3s (Быстро)</span>
                                <span className="text-sparta-gold font-bold text-sm">{wheelConfig.spinDuration} сек.</span>
                                <span>15s (Долго)</span>
                            </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end">
                            <button
                                onClick={handleSaveConfig}
                                disabled={configSaving}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold transition-colors font-manrope disabled:opacity-50"
                            >
                                {configSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Применить настройки
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="animate-pulse flex gap-4">
                        <div className="h-24 bg-white/5 rounded-2xl flex-1"></div>
                        <div className="h-24 bg-white/5 rounded-2xl flex-1"></div>
                    </div>
                )}
            </div>

            {/* Warning if probability != 100 */}
            {Math.abs(totalProbability - 100) > 1 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-center gap-3 text-red-400">
                    <AlertTriangle size={24} className="shrink-0" />
                    <div>
                        <span className="block font-bold">Внимание: Сумма вероятностей равна {totalProbability}%.</span>
                        <span className="block text-sm opacity-80">Для корректной работы рулетки сумма шансов всех секторов должна составлять ровно 100%.</span>
                    </div>
                </motion.div>
            )}

            {/* Empty State */}
            {items.length === 0 && !loading && (
                <div className="text-center py-16 bg-[#111] rounded-3xl border border-white/5">
                    <p className="text-white/40 mb-4 font-manrope">Сектора на колесе еще не созданы.</p>
                    <button onClick={seedDefaults} className="text-sparta-gold underline hover:text-white transition-colors">
                        Заполнить стандартным набором призов
                    </button>
                </div>
            )}

            {/* Grid of Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                    <div key={item.id} className="bg-[#111] border border-white/5 rounded-3xl p-6 relative group hover:border-white/10 hover:shadow-xl transition-all overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 w-24 h-24 opacity-20 blur-2xl rounded-full transition-opacity group-hover:opacity-40" style={{ backgroundColor: item.color }} />

                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="w-12 h-12 rounded-xl border border-white/10 shadow-lg flex items-center justify-center font-bold text-black" style={{ backgroundColor: item.color }}>
                                {item.probability}%
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => startEdit(item)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-colors">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDeleteItem(item.id)} className="p-2.5 bg-white/5 hover:bg-red-500/20 rounded-xl text-white/50 hover:text-red-500 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-2xl font-russo text-white mb-1 relative z-10 truncate">{item.label}</h3>
                        <p className="text-white/40 text-sm font-manrope mb-6 flex-1 relative z-10 line-clamp-2">{item.description || 'Нет описания'}</p>

                        <div className="space-y-3 pt-4 border-t border-white/5 relative z-10 text-sm font-manrope">
                            <div className="flex justify-between items-center bg-[#1a1a1a] p-2.5 rounded-lg border border-white/5">
                                <span className="text-white/40 text-xs uppercase tracking-wider font-bold">Тип</span>
                                <span className="text-white truncate max-w-[120px]">{item.type}</span>
                            </div>
                            <div className="flex justify-between items-center bg-[#1a1a1a] p-2.5 rounded-lg border border-white/5">
                                <span className="text-white/40 text-xs uppercase tracking-wider font-bold">Значение</span>
                                <span className="text-sparta-gold font-bold truncate max-w-[120px]">{item.value}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit/Create Modal */}
            <AnimatePresence>
                {editingItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingItem(null)} />

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-[#111] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh] relative z-10"
                        >
                            <h2 className="text-2xl font-russo text-white mb-6">
                                {isCreating ? 'Создание сектора приза' : 'Редактирование сектора'}
                            </h2>

                            <form onSubmit={handleSaveItem} className="space-y-5">
                                <div>
                                    <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Название сектора (Label)</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.label}
                                        onChange={e => setFormData({ ...formData, label: e.target.value })}
                                        className="w-full bg-[#1a1a1a] border border-white/5 focus:border-sparta-gold/50 rounded-xl p-3.5 text-white transition-colors"
                                        placeholder="Например: Скидка 10%"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Шанс (%)</label>
                                        <input
                                            required
                                            type="number"
                                            value={formData.probability}
                                            onChange={e => setFormData({ ...formData, probability: Number(e.target.value) })}
                                            className="w-full bg-[#1a1a1a] border border-white/5 focus:border-sparta-gold/50 rounded-xl p-3.5 text-white font-mono transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Тематический Цвет</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={formData.color}
                                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                                className="w-12 h-[52px] rounded-xl bg-transparent cursor-pointer border-0 p-0"
                                            />
                                            <input
                                                type="text"
                                                value={formData.color}
                                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                                className="flex-1 bg-[#1a1a1a] border border-white/5 focus:border-sparta-gold/50 rounded-xl p-3.5 text-white uppercase font-mono text-sm transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Технический тип приза</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                        className="w-full bg-[#1a1a1a] border border-white/5 focus:border-sparta-gold/50 rounded-xl p-3.5 text-white appearance-none cursor-pointer transition-colors"
                                    >
                                        <option value="discount_percent">Скидка (%)</option>
                                        <option value="discount_fixed">Скидка (Руб)</option>
                                        <option value="item">Предмет (Одежда/Инвентарь)</option>
                                        <option value="free_training">Бесплатная Тренировка</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Техническое значение (Value)</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.value}
                                        onChange={e => setFormData({ ...formData, value: e.target.value })}
                                        className="w-full bg-[#1a1a1a] border border-white/5 focus:border-sparta-gold/50 rounded-xl p-3.5 text-white font-mono transition-colors"
                                        placeholder="Напр: 10, 500, t-shirt-green"
                                    />
                                    <p className="text-xs text-white/30 mt-1.5 font-manrope">Для скидок — число. Для предметов — уникальный код в базе (id).</p>
                                </div>

                                <div>
                                    <label className="block text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Описание (опционально)</label>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-[#1a1a1a] border border-white/5 focus:border-sparta-gold/50 rounded-xl p-3.5 text-white transition-colors"
                                        placeholder="Описание для пользователя..."
                                    />
                                </div>

                                <div className="flex gap-4 mt-8 pt-6 border-t border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setEditingItem(null)}
                                        className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold transition-colors font-manrope"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 bg-sparta-gold text-black py-3.5 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all flex justify-center items-center gap-2 font-manrope disabled:opacity-50"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                        Сохранить Сектор
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

export default AdminBonus;
