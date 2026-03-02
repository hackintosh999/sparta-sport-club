import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Sparkles, Loader2, Tag, Calendar, Clock } from 'lucide-react';
import BonusWheel from './BonusWheel';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { doc, collection, addDoc, getDoc, getDocs, updateDoc, query, where, serverTimestamp, setDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import confetti from 'canvas-confetti';

interface BonusModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const BonusModal: React.FC<BonusModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();

    // --- State ---
    const [gameState, setGameState] = useState<'idle' | 'spinning' | 'won'>('idle');
    const [winner, setWinner] = useState<any | null>(null);
    const [canSpin, setCanSpin] = useState(false);
    const [spinsAvailable, setSpinsAvailable] = useState(0);
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);

    // Global Config State
    const [wheelConfig, setWheelConfig] = useState({ spinDuration: 8, enableDailySpin: true });
    const [nextFreeSpinDate, setNextFreeSpinDate] = useState<Date | null>(null);

    // Promo Code State
    const [promoCode, setPromoCode] = useState('');
    const [promoLoading, setPromoLoading] = useState(false);
    const [promoMessage, setPromoMessage] = useState('');

    useEffect(() => {
        if (!isOpen || !user) return;

        setLoading(true);
        setGameState('idle');
        setWinner(null);

        let unsubscribeConfig: () => void;
        let unsubscribeItems: () => void;
        let unsubscribeUserBonus: () => void;

        // 1. Listen to Config
        unsubscribeConfig = onSnapshot(doc(db, 'config', 'wheel_settings'), (docSnap) => {
            let currentConfig = { spinDuration: 8, enableDailySpin: true };
            if (docSnap.exists()) {
                currentConfig = docSnap.data() as any;
                setWheelConfig(currentConfig);
            }

            // 3. Check/Create User Bonus State (depends on config)
            const userBonusRef = doc(db, 'users', user.uid, 'private', 'bonus_state');
            if (unsubscribeUserBonus) unsubscribeUserBonus(); // clear previous if config changed

            unsubscribeUserBonus = onSnapshot(userBonusRef, async (bonusSnap) => {
                let currentSpins = 0;

                if (!bonusSnap.exists()) {
                    currentSpins = currentConfig.enableDailySpin ? 1 : 0;
                    await setDoc(userBonusRef, {
                        spinsAvailable: currentSpins,
                        history: [],
                        lastDailySpin: currentConfig.enableDailySpin ? new Date().toISOString() : null
                    });
                } else {
                    const data = bonusSnap.data();
                    currentSpins = data.spinsAvailable || 0;
                    const lastDailySpin = data.lastDailySpin ? new Date(data.lastDailySpin) : null;

                    if (currentConfig.enableDailySpin) {
                        const now = new Date();
                        if (!lastDailySpin || !isSameDay(lastDailySpin, now)) {
                            currentSpins += 1;
                            await updateDoc(userBonusRef, {
                                spinsAvailable: currentSpins,
                                lastDailySpin: now.toISOString()
                            });
                        } else {
                            const tomorrow = new Date(now);
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            tomorrow.setHours(0, 0, 0, 0);
                            setNextFreeSpinDate(tomorrow);
                        }
                    }
                }

                setSpinsAvailable(currentSpins);
            });
        });

        // 2. Listen to Items
        unsubscribeItems = onSnapshot(collection(db, 'bonus_items'), (itemsSnap) => {
            const fetchedItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (fetchedItems.length === 0) {
                setItems([
                    { id: 'd10', label: '-10%', color: '#EAB308', probability: 50, type: 'discount_percent', value: 10 },
                    { id: 'd5', label: '-5%', color: '#64748B', probability: 50, type: 'discount_percent', value: 5 }
                ]);
            } else {
                setItems(fetchedItems);
            }
            setLoading(false);
        });

        return () => {
            if (unsubscribeConfig) unsubscribeConfig();
            if (unsubscribeItems) unsubscribeItems();
            if (unsubscribeUserBonus) unsubscribeUserBonus();
        };
    }, [user, isOpen]);

    useEffect(() => {
        if (gameState === 'idle') {
            setCanSpin(spinsAvailable > 0);
        }
    }, [spinsAvailable, gameState]);

    const handleSpinClick = async () => {
        if (!canSpin || gameState !== 'idle' || spinsAvailable <= 0) return;

        // Optimistic update
        setSpinsAvailable(prev => prev - 1);
        setCanSpin(false);
        setGameState('spinning');

        // Sync with Firestore
        try {
            const userBonusRef = doc(db, 'users', user!.uid, 'private', 'bonus_state');
            await updateDoc(userBonusRef, {
                spinsAvailable: spinsAvailable - 1
            });
        } catch (err) {
            console.error("Error decrementing spin:", err);
        }
    };

    const triggerConfetti = () => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    };

    const handleSpinEnd = (winningItem: any) => {
        setTimeout(() => {
            setWinner(winningItem);
            setGameState('won');
            triggerConfetti();
            saveBonus(winningItem);
        }, 500); // Small delay after physics stop before showing modal
    };

    const saveBonus = async (item: any) => {
        if (!user) return;
        try {
            await addDoc(collection(db, `users/${user.uid}/bonuses`), {
                ...item,
                isUsed: false,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error saving bonus:", error);
        }
    };

    const handleClaim = () => {
        setGameState('idle');
        setWinner(null);
        if (spinsAvailable > 0) setCanSpin(true);
    };

    const handleActivatePromo = async (e: React.FormEvent) => {
        e.preventDefault();
        setPromoMessage('');
        if (!promoCode.trim()) return;
        setPromoLoading(true);

        try {
            const code = promoCode.toUpperCase().trim();
            const q = query(collection(db, 'promo_codes'), where('code', '==', code));
            const snap = await getDocs(q);

            if (snap.empty) {
                setPromoMessage('Промокод не найден');
                setPromoLoading(false);
                return;
            }

            const promoDoc = snap.docs[0];
            const promoRef = doc(db, 'promo_codes', promoDoc.id);

            await runTransaction(db, async (transaction) => {
                const pDoc = await transaction.get(promoRef);
                if (!pDoc.exists()) throw "Ошибка кода";
                const pData = pDoc.data();

                if (pData.expiresAt && pData.expiresAt.toDate() < new Date()) throw "Срок действия кода истек";
                if (pData.maxUses !== -1 && pData.currentUses >= pData.maxUses) throw "Лимит активаций исчерпан";
                if (pData.usersUsed?.includes(user.uid)) throw "Вы уже использовали этот код";

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

            const pType = promoDoc.data().type;
            const pVal = promoDoc.data().value;
            if (pType === 'discount') {
                setPromoMessage(`Скидка ${pVal}% получена! Ищите в бонусах`);
            } else if (pType === 'balance') {
                setPromoMessage(`Баланс пополнен на ${pVal}₽`);
            } else {
                setPromoMessage(`Начислено вращений: ${pVal}`);
                setSpinsAvailable(prev => prev + pVal);
                setCanSpin(true);
            }
        } catch (err: any) {
            console.error(err);
            setPromoMessage(typeof err === 'string' ? err : 'Ошибка активации');
        }
        setPromoLoading(false);
        setPromoCode('');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Dark Backdrop with heavy blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={gameState === 'spinning' ? undefined : onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                    />

                    {/* Main Container */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-[1000px] h-[90vh] max-h-[850px] bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-6 lg:p-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col lg:flex-row gap-10"
                    >
                        {/* Ambient Glows */}
                        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-sparta-gold opacity-10 blur-[100px] rounded-full pointer-events-none" />
                        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-white opacity-5 blur-[100px] rounded-full pointer-events-none" />

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            disabled={gameState === 'spinning'}
                            className="absolute top-6 right-6 lg:top-8 lg:right-8 z-50 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 p-3 rounded-full transition-all disabled:opacity-0"
                        >
                            <X size={24} />
                        </button>

                        {/* Left Column: Info & Controls */}
                        <div className="flex-1 flex flex-col justify-center relative z-10 space-y-8 lg:pr-10">
                            <div>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-sparta-gold/10 border border-sparta-gold/20 rounded-full mb-6">
                                    <Gift size={16} className="text-sparta-gold" />
                                    <span className="text-sparta-gold text-xs font-bold uppercase tracking-widest font-manrope">Ежедневный Бонус</span>
                                </div>
                                <h2 className="text-5xl lg:text-6xl font-russo text-white leading-tight mb-4">
                                    Колесо <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-sparta-gold to-yellow-600 drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]">Фортуны</span>
                                </h2>
                                <p className="text-white/50 font-manrope text-base lg:text-lg">
                                    {wheelConfig.enableDailySpin && spinsAvailable === 0 && nextFreeSpinDate
                                        ? "Ваш бесплатный спин будет доступен завтра. А пока можно использовать промокод."
                                        : "Крутите колесо и выигрывайте эксклюзивные скидки, фирменную экипировку и бесплатные тренировки!"}
                                </p>
                            </div>

                            {/* Status Panel */}
                            <div className="bg-[#111] border border-white/5 rounded-3xl p-6 lg:p-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-sparta-gold opacity-5 blur-2xl rounded-full transition-opacity group-hover:opacity-10" />

                                <div className="flex items-center justify-between mb-8 relative z-10">
                                    <div>
                                        <p className="text-white/40 font-manrope text-sm mb-1 uppercase tracking-wider font-bold">Доступно попыток</p>
                                        <p className="text-5xl font-russo text-white">{spinsAvailable}</p>
                                    </div>
                                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 group-hover:bg-sparta-gold/10 group-hover:text-sparta-gold group-hover:border-sparta-gold/20 transition-all text-white/30">
                                        <Sparkles size={28} />
                                    </div>
                                </div>

                                <button
                                    onClick={handleSpinClick}
                                    disabled={!canSpin || gameState !== 'idle' || spinsAvailable <= 0}
                                    className="w-full relative group overflow-hidden bg-sparta-gold text-black py-4 lg:py-5 rounded-2xl font-russo text-xl uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]"
                                >
                                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity disabled:hidden" />
                                    {gameState === 'spinning' ? 'Вращение...' : 'Крутить Колесо'}
                                </button>

                                {/* Promo Code / Countdown Area */}
                                <div className="mt-6 pt-6 border-t border-white/5">
                                    {wheelConfig.enableDailySpin && spinsAvailable === 0 && nextFreeSpinDate && gameState === 'idle' ? (
                                        <div className="flex items-center gap-3 text-white/50 bg-black/40 p-4 rounded-xl border border-white/5">
                                            <Calendar size={18} className="text-white/30" />
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider mb-0.5 font-manrope">Следующий бесплатный спин</p>
                                                <p className="font-mono text-white/70">{format(nextFreeSpinDate, 'd MMMM HH:mm', { locale: ru })}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleActivatePromo} className="flex gap-2">
                                            <div className="relative flex-1">
                                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                    <Tag size={16} className="text-white/30" />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Промокод на спины"
                                                    value={promoCode}
                                                    onChange={(e) => setPromoCode(e.target.value)}
                                                    className="w-full bg-[#1a1a1a] border border-white/10 focus:border-sparta-gold/50 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white font-mono uppercase tracking-wider transition-colors placeholder:normal-case placeholder:tracking-normal"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={promoLoading || !promoCode.trim()}
                                                className="bg-white/10 hover:bg-white/20 text-white px-5 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center font-manrope text-sm"
                                            >
                                                {promoLoading ? <Loader2 size={18} className="animate-spin" /> : 'Активировать'}
                                            </button>
                                        </form>
                                    )}
                                    {promoMessage && (
                                        <p className="text-center font-manrope text-xs mt-3 text-sparta-gold bg-sparta-gold/10 py-2 rounded-lg border border-sparta-gold/20">
                                            {promoMessage}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: The Wheel */}
                        <div className="flex-1 flex items-center justify-center relative min-h-[400px]">
                            {loading ? (
                                <div className="flex flex-col items-center gap-4">
                                    <Loader2 size={40} className="animate-spin text-sparta-gold" />
                                    <span className="text-white/50 font-manrope uppercase tracking-widest text-xs font-bold">Подготовка колеса...</span>
                                </div>
                            ) : (
                                <BonusWheel
                                    items={items}
                                    onSpinEnd={handleSpinEnd}
                                    isSpinning={gameState === 'spinning'}
                                    setIsSpinning={() => { }}
                                    duration={wheelConfig.spinDuration}
                                />
                            )}
                        </div>

                        {/* Win Overlay Modal (Nested) */}
                        <AnimatePresence>
                            {gameState === 'won' && winner && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/80 backdrop-blur-xl z-[60] flex items-center justify-center p-6"
                                >
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0, y: 50 }}
                                        animate={{ scale: 1, opacity: 1, y: 0 }}
                                        transition={{ type: 'spring', bounce: 0.5 }}
                                        className="bg-[#111] border border-white/10 rounded-[2rem] p-10 max-w-sm w-full shadow-2xl relative text-center overflow-hidden"
                                    >
                                        <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] animate-[spin_10s_linear_infinite] pointer-events-none opacity-20"
                                            style={{
                                                background: `conic-gradient(from 0deg, transparent 0deg, ${winner.color} 180deg, transparent 360deg)`
                                            }}
                                        />

                                        <div className="relative z-10 flex flex-col items-center">
                                            <div className="w-24 h-24 rounded-full mb-6 flex items-center justify-center shadow-2xl border-4 border-white/10" style={{ backgroundColor: winner.color }}>
                                                <Gift size={40} className="text-black" />
                                            </div>

                                            <p className="text-white/50 uppercase tracking-widest text-xs font-bold mb-2">Ваш приз</p>
                                            <h3 className="text-3xl font-russo text-white mb-2">{winner.label}</h3>
                                            <p className="text-white/70 font-manrope text-sm mb-8">{winner.description || 'Приз добавлен в ваш профиль!'}</p>

                                            <button
                                                onClick={handleClaim}
                                                className="w-full bg-sparta-gold text-black py-4 rounded-xl font-bold uppercase tracking-wider transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                                            >
                                                Забрать
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default BonusModal;
