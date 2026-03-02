import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, CreditCard, Wallet, Smartphone, ShieldCheck, Zap, Star, Trophy, Tag, Loader2 } from 'lucide-react';
import { Button, GlassCard } from './UIComponents';
import { Program } from '../types';
import { db } from '../firebase';
import { collection, addDoc, Timestamp, doc, updateDoc, getDoc, setDoc, query, where, getDocs, arrayUnion, deleteField } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import MembershipReceipt from './profile/MembershipReceipt';

interface MembershipModalProps {
    isOpen: boolean;
    onClose: () => void;
    program: Program | null;
    duration: number;
    price: number;
    mode?: 'purchase' | 'renew' | 'upgrade';
}

const MembershipModal: React.FC<MembershipModalProps> = ({
    isOpen,
    onClose,
    program,
    duration,
    price,
    mode = 'purchase'
}) => {
    const { user, userProfile } = useAuth();
    const [step, setStep] = useState<'details' | 'payment'>('details');
    const [paymentMethod, setPaymentMethod] = useState<'robokassa' | 'balance' | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [newOrder, setNewOrder] = useState<any>(null);

    // Promo Code State
    const [promoCode, setPromoCode] = useState('');
    const [promoError, setPromoError] = useState('');
    const [promoSuccessSplash, setPromoSuccessSplash] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<any>(null);
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [showPromoInput, setShowPromoInput] = useState(false);

    const [selectedDuration, setSelectedDuration] = useState<number>(duration);
    const [selectedPrice, setSelectedPrice] = useState<number>(price);
    const [hasFamilyDiscount, setHasFamilyDiscount] = useState(false);
    const [unusedCredit, setUnusedCredit] = useState(0);

    // Initial family check
    useEffect(() => {
        const checkFamily = async () => {
            if (userProfile?.parentPhone) {
                const q = query(collection(db, "users"), where("parentPhone", "==", userProfile.parentPhone));
                const snap = await getDocs(q);
                if (snap.size > 1) {
                    setHasFamilyDiscount(true);
                }
            }
        };
        checkFamily();
    }, [userProfile]);

    // Auto-apply saved promo code
    useEffect(() => {
        if (!appliedPromo && !promoCode && userProfile && program && isOpen && user) {
            let codeToApply: string | null = null;

            // Check item-specific promo first
            if (userProfile.activePromos?.[program.id]) {
                codeToApply = userProfile.activePromos[program.id].code;
            } else if (userProfile.activePromoCode && userProfile.activePromoDiscount) {
                // Fallback to global active promo
                const applicableTo = userProfile.activePromoApplicableTo || 'all';
                if (applicableTo === 'all' || applicableTo === 'subscriptions') {
                    codeToApply = userProfile.activePromoCode;
                }
            }

            if (codeToApply) {
                const fetchPromo = async () => {
                    const q = query(collection(db, 'promo_codes'), where('code', '==', codeToApply));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        const promoDoc = snap.docs[0];
                        setAppliedPromo({ id: promoDoc.id, ...promoDoc.data() });
                        setPromoCode(codeToApply!);
                    } else if (userProfile.activePromos?.[program.id]) {
                        // Clear invalid saved promo for this item
                        const userRef = doc(db, 'users', user.uid);
                        await updateDoc(userRef, {
                            [`activePromos.${program.id}`]: deleteField()
                        });
                    }
                };
                fetchPromo();
            }
        }
    }, [isOpen, userProfile, program, user]);

    // Pro-rata upgrade calculation
    useEffect(() => {
        if (mode === 'upgrade' && userProfile?.subscription) {
            const sub = userProfile.subscription;
            if (sub.expiresAt && sub.startedAt && sub.purchasePrice) {
                const now = new Date();
                const expiry = sub.expiresAt.toDate();
                const start = sub.startedAt.toDate();

                const totalDuration = expiry.getTime() - start.getTime();
                const remainingDuration = expiry.getTime() - now.getTime();

                if (remainingDuration > 0 && totalDuration > 0) {
                    const credit = Math.floor((sub.purchasePrice / totalDuration) * remainingDuration);
                    setUnusedCredit(Math.max(0, credit));
                }
            } else if (sub.expiresAt) {
                // Fallback if startedAt/purchasePrice missing (estimative)
                const now = new Date();
                const expiry = sub.expiresAt.toDate();
                const remainingDays = Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

                // Assume 1000 RUB per month if price unknown
                const credit = remainingDays * 33;
                setUnusedCredit(credit);
            }
        } else {
            setUnusedCredit(0);
        }
    }, [mode, userProfile]);

    // Update price when duration changes
    useEffect(() => {
        if (program?.prices) {
            let p = program.prices[selectedDuration] || price;
            if (hasFamilyDiscount) {
                p = Math.floor(p * 0.9);
            }

            // Apply Promo Code Discount
            if (appliedPromo && appliedPromo.type === 'discount') {
                p = Math.floor(p * (1 - appliedPromo.value / 100));
            }

            // Subtract unused credit if upgrading
            if (mode === 'upgrade') {
                p = Math.max(0, p - unusedCredit);
            }

            setSelectedPrice(p);
        }
    }, [selectedDuration, program, price, hasFamilyDiscount, mode, unusedCredit, appliedPromo]);

    const applyPromoCode = async () => {
        if (!promoCode.trim()) return;
        setIsApplyingPromo(true);
        setPromoError('');

        try {
            const q = query(collection(db, 'promo_codes'), where('code', '==', promoCode.toUpperCase()));
            const snap = await getDocs(q);

            if (snap.empty) {
                setPromoError('Промокод не найден');
                setIsApplyingPromo(false);
                return;
            }

            const promoDoc = snap.docs[0];
            const promoData = promoDoc.data();

            // Validate promo
            if (promoData.expiresAt && promoData.expiresAt.toDate() < new Date()) {
                setPromoError('Срок действия промокода истек');
                setIsApplyingPromo(false);
                return;
            }
            if (promoData.maxUses !== -1 && promoData.currentUses >= promoData.maxUses) {
                setPromoError('Промокод больше не действителен (лимит исчерпан)');
                setIsApplyingPromo(false);
                return;
            }
            if (promoData.usersUsed && user && promoData.usersUsed.includes(user.uid)) {
                setPromoError('Вы уже использовали этот промокод');
                setIsApplyingPromo(false);
                return;
            }
            if (promoData.type !== 'discount') {
                setPromoError('Этот промокод не применим к тарифам (нужна скидка)');
                setIsApplyingPromo(false);
                return;
            }
            if (promoData.applicableTo === 'shop') {
                setPromoError('Этот промокод действует только в разделе "Магазин"');
                setIsApplyingPromo(false);
                return;
            }

            // Success
            setAppliedPromo({ id: promoDoc.id, ...promoData });

            if (user && program) {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                    [`activePromos.${program.id}`]: {
                        code: promoData.code,
                        discount: promoData.value,
                        id: promoDoc.id,
                        type: promoData.type
                    }
                });
            }

            setPromoSuccessSplash(true);
            setTimeout(() => setPromoSuccessSplash(false), 2500); // 2.5sec splash
            setShowPromoInput(false);
        } catch (error) {
            console.error(error);
            setPromoError('Ошибка при проверке промокода');
        } finally {
            setIsApplyingPromo(false);
        }
    };

    if (!program) return null;

    const handleNext = () => setStep('payment');
    const handleBack = () => setStep('details');

    const handleConfirmPayment = async () => {
        if (!paymentMethod || !user) return;
        setIsProcessing(true);

        try {
            // Check for Family Discount (accounts with same parent phone)
            let finalPrice = selectedPrice;
            let isFamilyDiscount = false;

            if (userProfile?.parentPhone) {
                const q = query(collection(db, "users"), where("parentPhone", "==", userProfile.parentPhone));
                const snap = await getDocs(q);
                if (snap.size > 1) {
                    finalPrice = Math.floor(selectedPrice * 0.9);
                    isFamilyDiscount = true;
                }
            }

            const orderData = {
                email: user.email,
                userName: user.displayName || 'Anonymous',
                planId: program.id,
                planTitle: program.title,
                duration: selectedDuration,
                price: finalPrice,
                paymentMethod,
                date: Timestamp.now(),
                status: paymentMethod === 'balance' ? 'completed' : 'pending',
                discountApplied: appliedPromo ? `promo:${appliedPromo.code}` : (isFamilyDiscount ? 'family' : (mode === 'upgrade' ? 'upgrade_credit' : 'none'))
            };

            // If paying by balance directly, we run logic. Else for YooKassa it's delayed.
            // Mark promo as used
            if (appliedPromo) {
                const promoRef = doc(db, 'promo_codes', appliedPromo.id);
                // Increment uses, append user UID
                await updateDoc(promoRef, {
                    currentUses: appliedPromo.currentUses + 1,
                    usersUsed: arrayUnion(user.uid)
                });
            }

            if (paymentMethod === 'balance') {
                const currentBalance = userProfile?.walletBalance || 0;
                if (currentBalance < finalPrice) {
                    alert("Недостаточно средств на балансе!");
                    setIsProcessing(false);
                    return;
                }

                // Deduct Balance
                const userRef = doc(db, 'users', user.uid);

                const updates: any = { walletBalance: currentBalance - finalPrice };
                if (appliedPromo) {
                    if (userProfile?.activePromos?.[program.id]?.code === appliedPromo.code) {
                        updates[`activePromos.${program.id}`] = deleteField();
                    }
                    if (userProfile?.activePromoCode === appliedPromo.code) {
                        updates.activePromoCode = null;
                        updates.activePromoDiscount = null;
                        updates.activePromoApplicableTo = null;
                    }
                }

                await updateDoc(userRef, updates);

                // Grant subscription manually since it's instant
                const orderRef = await addDoc(collection(db, "orders"), orderData);
                setNewOrder({ id: orderRef.id, ...orderData });
                await grantSubscription(finalPrice);
                setIsSuccess(true);
            } else if (paymentMethod === 'robokassa') {
                // Real Robokassa integration via our proxy backend
                const response = await fetch('/api/robokassa-create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: finalPrice,
                        description: `Оплата абонемента: ${program.title} на ${selectedDuration} мес.`,
                        userId: user.uid,
                        subscriptionId: program.id,
                        type: 'subscription'
                    })
                });

                if (!response.ok) {
                    throw new Error("Ошибка при создании платежа в Robokassa");
                }

                const data = await response.json();

                // Save pending order so verification logic on Dashboard can confirm it later
                await addDoc(collection(db, "orders"), {
                    ...orderData,
                    paymentId: data.invId.toString(),
                    status: 'pending_robokassa'
                });

                if (appliedPromo) {
                    const userRef = doc(db, 'users', user.uid);
                    const updates: any = {};
                    if (userProfile?.activePromos?.[program.id]?.code === appliedPromo.code) {
                        updates[`activePromos.${program.id}`] = deleteField();
                    }
                    if (userProfile?.activePromoCode === appliedPromo.code) {
                        updates.activePromoCode = null;
                        updates.activePromoDiscount = null;
                        updates.activePromoApplicableTo = null;
                    }
                    if (Object.keys(updates).length > 0) {
                        await updateDoc(userRef, updates);
                    }
                }

                // Redirect user to real Robokassa payment gateway
                window.location.href = data.url;
            }

        } catch (error) {
            console.error("Error creating purchase order:", error);
            alert("Ошибка при оплате. Пожалуйста, попробуйте еще раз.");
        } finally {
            setIsProcessing(false);
        }
    };

    const grantSubscription = async (finalPrice: number) => {
        let expiresAtDate = new Date();
        let isEarlyRenewal = false;

        // If renewing, extend from current expiry if it's in the future
        if (mode === 'renew' && userProfile?.subscription?.expiresAt) {
            try {
                const currentExpiry = userProfile.subscription.expiresAt.toDate();
                if (currentExpiry > new Date()) {
                    expiresAtDate = new Date(currentExpiry);

                    // Early renewal bonus (> 5 days before expiry)
                    const daysToExpiry = (currentExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                    if (daysToExpiry > 5) {
                        isEarlyRenewal = true;
                    }
                }
            } catch (e) {
                console.error("Error parsing current expiry:", e);
            }
        }

        expiresAtDate.setMonth(expiresAtDate.getMonth() + selectedDuration);

        // Grant Early Renewal Bonus if applicable
        if (isEarlyRenewal && user) {
            const bonusRef = doc(db, 'users', user.uid, 'private', 'bonus_state');
            const bonusSnap = await getDoc(bonusRef);
            const currentSpins = bonusSnap.exists() ? (bonusSnap.data().spinsAvailable || 0) : 0;

            await setDoc(bonusRef, {
                spinsAvailable: currentSpins + 1,
                lastBonusReason: 'early_renewal',
                lastBonusAt: Timestamp.now()
            }, { merge: true });

            // Create notification about bonus
            await addDoc(collection(db, "notifications"), {
                email: user.email,
                title: "Бонус за лояльность! 🎁",
                message: `Спасибо за раннее продление! Вам начислено +1 вращение в Колесе Фортуны.`,
                type: 'bonus',
                isRead: false,
                createdAt: Timestamp.now()
            });
        }

        const userRef = doc(db, "users", user!.uid);
        await updateDoc(userRef, {
            subscription: {
                planId: program!.id,
                title: program!.title,
                expiresAt: Timestamp.fromDate(expiresAtDate),
                status: 'active',
                startedAt: mode === 'renew' ? (userProfile?.subscription?.startedAt || Timestamp.now()) : Timestamp.now(),
                purchasePrice: finalPrice + unusedCredit // The base price for pro-rata
            }
        });
    };

    const getIcon = (title: string) => {
        if (title.toLowerCase().includes('новичок')) return <Zap className="text-blue-400" size={32} />;
        if (title.toLowerCase().includes('профессионал')) return <Star className="text-sparta-gold" size={32} />;
        return <Trophy className="text-red-500" size={32} />;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-xl bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-xl font-russo text-white uppercase tracking-wider">
                                {isSuccess ? 'Заявка принята' : step === 'details' ? (mode === 'renew' ? 'Продление подписки' : 'Детали плана') : 'Способ оплаты'}
                            </h2>
                            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8">
                            <AnimatePresence mode="wait">
                                {isSuccess ? (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-center py-4"
                                    >
                                        {!newOrder ? (
                                            <>
                                                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                                    <ShieldCheck size={40} />
                                                </div>
                                                <h3 className="text-2xl font-russo mb-4">Спасибо за выбор!</h3>
                                                <p className="text-white/60 mb-8 max-w-sm mx-auto">
                                                    Ваша подписка активирована. Вы можете посмотреть чек или вернуться в профиль.
                                                </p>
                                                <Button onClick={onClose} className="w-full">
                                                    Вернуться в профиль
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <MembershipReceipt
                                                    order={{
                                                        ...newOrder,
                                                        userName: user?.displayName || 'Спортсмен',
                                                        email: user?.email || ''
                                                    }}
                                                    onClose={onClose}
                                                />
                                            </div>
                                        )}
                                    </motion.div>
                                ) : step === 'details' ? (
                                    <motion.div
                                        key="details"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="relative"
                                    >
                                        {/* Success Splash Overlay */}
                                        <AnimatePresence>
                                            {promoSuccessSplash && appliedPromo && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                                                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                                    exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                                                    className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md rounded-2xl flex items-center justify-center border border-green-500/30 overflow-hidden"
                                                >
                                                    <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/20 rounded-full blur-[100px] pointer-events-none" />
                                                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-sparta-gold/20 rounded-full blur-[100px] pointer-events-none" />

                                                    <div className="text-center p-8 relative z-10">
                                                        <motion.div
                                                            initial={{ scale: 0, rotate: -180 }}
                                                            animate={{ scale: 1, rotate: 0 }}
                                                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                                            className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(74,222,128,0.5)]"
                                                        >
                                                            <Tag size={40} className="text-black" />
                                                        </motion.div>
                                                        <motion.h3
                                                            initial={{ y: 20, opacity: 0 }}
                                                            animate={{ y: 0, opacity: 1 }}
                                                            transition={{ delay: 0.2 }}
                                                            className="text-4xl font-russo text-white mb-2 uppercase tracking-widest"
                                                        >
                                                            Скидка -{appliedPromo.value}%!
                                                        </motion.h3>
                                                        <motion.p
                                                            initial={{ y: 20, opacity: 0 }}
                                                            animate={{ y: 0, opacity: 1 }}
                                                            transition={{ delay: 0.3 }}
                                                            className="text-sparta-gold font-bold mb-4"
                                                        >
                                                            Промокод {appliedPromo.code} активирован
                                                        </motion.p>
                                                        <motion.div
                                                            initial={{ scale: 0.8, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            transition={{ delay: 0.4 }}
                                                            className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 border border-white/10 rounded-xl"
                                                        >
                                                            <div className="w-8 h-8 rounded shrink-0 bg-white/5 flex items-center justify-center">
                                                                {getIcon(program.title)}
                                                            </div>
                                                            <span className="text-white font-bold">{program.title}</span>
                                                        </motion.div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <div className="flex items-center gap-6 mb-8 p-6 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
                                            <div className="w-16 h-16 bg-gradient-to-br from-white/10 to-transparent rounded-xl flex items-center justify-center border border-white/10 shrink-0 shadow-lg relative overflow-hidden">
                                                <div className="absolute inset-0 bg-sparta-gold/5" />
                                                {getIcon(program.title)}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-2xl font-russo text-white uppercase tracking-wider">{program.title}</h3>
                                                <div className="flex flex-col items-end w-full">
                                                    {appliedPromo && (
                                                        <span className="line-through text-red-400 font-mono text-sm opacity-80 decoration-2 decoration-red-500/50">
                                                            {(program?.prices?.[selectedDuration] || price).toLocaleString('ru-RU')} ₽
                                                        </span>
                                                    )}
                                                    <p className="text-sparta-gold font-bold text-2xl drop-shadow-md">
                                                        {selectedPrice.toLocaleString('ru-RU')} ₽ <span className="text-white/40 font-manrope font-normal text-sm">/ {selectedDuration} мес.</span>
                                                    </p>
                                                    {mode === 'upgrade' && unusedCredit > 0 && (
                                                        <span className="text-[10px] text-sparta-gold font-bold uppercase tracking-widest mt-1 bg-sparta-gold/10 px-2 py-0.5 rounded border border-sparta-gold/20">Кредит: -{unusedCredit.toLocaleString('ru-RU')} ₽</span>
                                                    )}
                                                    {hasFamilyDiscount && (
                                                        <span className="bg-sparta-gold/20 text-sparta-gold text-[10px] px-2 py-0.5 rounded-md font-bold border border-sparta-gold/30 whitespace-nowrap mt-1">СЕМЕЙНАЯ -10%</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6 mb-8">
                                            <h4 className="text-sm font-bold uppercase tracking-widest text-white/40">Что вы получите:</h4>
                                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {program.features.map((feat, i) => (
                                                    <li key={i} className="flex items-start gap-3 text-sm text-white/80">
                                                        <Check size={16} className="text-sparta-gold mt-0.5 shrink-0" />
                                                        <span>{feat}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="p-4 bg-sparta-gold/10 border border-sparta-gold/20 rounded-xl mb-8">
                                            <p className="text-xs text-sparta-gold leading-relaxed">
                                                * После оформления заявки, наш специалист поможет вам настроить профиль и подобрать оптимальное время тренировок.
                                            </p>
                                        </div>

                                        {/* Duration Selector */}
                                        <div className="mb-8">
                                            <label className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-3 block">Выберите срок продления</label>
                                            <div className="flex gap-2">
                                                {[3, 6, 12].map((d) => (
                                                    <button
                                                        key={d}
                                                        onClick={() => setSelectedDuration(d as 3 | 6 | 12)}
                                                        className={`flex-1 py-3 px-2 rounded-xl border font-bold transition-all text-sm ${selectedDuration === d ? 'border-sparta-gold bg-sparta-gold/10 text-white shadow-[0_0_15px_rgba(212,175,55,0.2)]' : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10'}`}
                                                    >
                                                        {d} мес.
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Promo Code System */}
                                        <div className="mb-10">
                                            {appliedPromo ? (
                                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between group">
                                                    <div className="flex items-center gap-3 text-green-400">
                                                        <div className="bg-green-500/20 p-2 rounded-lg">
                                                            <Check size={20} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-sm tracking-wide">Промокод <span className="font-mono text-green-300">{appliedPromo.code}</span> применен!</div>
                                                            <div className="text-xs text-green-500 flex items-center gap-1 mt-0.5"><Tag size={10} /> Скидка -{appliedPromo.value}%</div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setAppliedPromo(null)}
                                                        className="text-green-500/50 hover:text-green-400 hover:bg-green-500/20 p-2 rounded-lg transition-colors"
                                                        title="Отменить промокод"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            ) : showPromoInput ? (
                                                <div className="flex items-start gap-2">
                                                    <div className="flex-1">
                                                        <div className="relative">
                                                            <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                                                            <input
                                                                type="text"
                                                                value={promoCode}
                                                                onChange={e => setPromoCode(e.target.value.toUpperCase())}
                                                                placeholder="ВВЕДИТЕ ПРОМОКОД"
                                                                className={`w-full bg-black/50 border ${promoError ? 'border-red-500/50' : 'border-white/10'} rounded-xl p-3 pl-10 text-white uppercase font-mono tracking-widest text-sm focus:border-sparta-gold outline-none transition-colors`}
                                                            />
                                                        </div>
                                                        {promoError && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-[10px] mt-1.5 ml-1 font-bold tracking-wider uppercase">{promoError}</motion.p>}
                                                    </div>
                                                    <Button onClick={applyPromoCode} disabled={isApplyingPromo || !promoCode.trim()} className="px-6 h-[46px]">
                                                        {isApplyingPromo ? <Loader2 className="animate-spin" size={20} /> : 'Применить'}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setShowPromoInput(true)} className="text-white/40 text-xs font-bold uppercase tracking-widest hover:text-sparta-gold transition-colors flex items-center gap-2 group">
                                                    <Tag size={14} className="group-hover:-rotate-12 transition-transform" /> У меня есть промокод
                                                </button>
                                            )}
                                        </div>

                                        <Button onClick={handleNext} className="w-full h-14 text-lg">
                                            Продолжить к оплате
                                        </Button>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="payment"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                    >
                                        <div className="space-y-4 mb-8">
                                            <button
                                                onClick={() => setPaymentMethod('robokassa')}
                                                className={`w-full p-6 rounded-2xl border-2 transition-all flex items-center justify-between group ${paymentMethod === 'robokassa' ? 'border-sparta-gold bg-sparta-gold/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-xl transition-colors ${paymentMethod === 'robokassa' ? 'bg-sparta-gold text-black' : 'bg-white/5 text-white/60'}`}>
                                                        <CreditCard size={24} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="font-bold text-lg text-white">Банковская Карта (Robokassa)</div>
                                                        <div className="text-xs text-white/40 italic">Официальный и безопасный платеж</div>
                                                    </div>
                                                </div>
                                                {paymentMethod === 'robokassa' && <Check size={24} className="text-sparta-gold" />}
                                            </button>

                                            <button
                                                onClick={() => setPaymentMethod('balance')}
                                                className={`w-full p-6 rounded-2xl border-2 transition-all flex items-center justify-between group relative overflow-hidden ${paymentMethod === 'balance' ? 'border-sparta-gold bg-sparta-gold/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                                            >
                                                {paymentMethod === 'balance' && <div className="absolute top-0 right-0 w-32 h-32 bg-sparta-gold/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />}
                                                <div className="flex items-center gap-4 relative z-10">
                                                    <div className={`p-3 rounded-xl transition-colors ${paymentMethod === 'balance' ? 'bg-sparta-gold text-black' : 'bg-white/5 text-white/60'}`}>
                                                        <Wallet size={24} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="font-bold text-lg text-white">Внутренний Баланс</div>
                                                        <div className="text-xs text-sparta-gold font-bold">Доступно: {userProfile?.walletBalance || 0} ₽</div>
                                                    </div>
                                                </div>
                                                {paymentMethod === 'balance' && <Check size={24} className="text-sparta-gold relative z-10" />}
                                            </button>
                                        </div>

                                        <div className="flex gap-4">
                                            <Button variant="outline" onClick={handleBack} className="flex-1">
                                                Назад
                                            </Button>
                                            <Button
                                                onClick={handleConfirmPayment}
                                                disabled={!paymentMethod || isProcessing}
                                                className="flex-[2]"
                                            >
                                                {isProcessing ? 'Обработка...' : `Оплатить ${price} ₽`}
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default MembershipModal;
