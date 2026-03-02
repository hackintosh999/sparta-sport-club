import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Calendar, LogOut, Settings, Phone, Hash, Mail, Trophy, ArrowRight, Bell, LayoutDashboard, MessageSquare, Heart, Shield, Clock, Receipt, RefreshCw, Zap, Download, X, Star, Tag, Loader2, PartyPopper } from 'lucide-react';
import { Container, GlassCard, Button } from './UIComponents';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, updateDoc, addDoc, Timestamp, or } from 'firebase/firestore';
import ProfileViewModal from './ProfileViewModal';
import NotificationsModal from './NotificationsModal';
import UserRequests from './profile/UserRequests';
import RequestDetailsModal from './RequestDetailsModal';
import AchievementsList from './profile/AchievementsList';
import SmartEnrollmentWizard from './SmartEnrollmentWizard';
import MembershipReceipt from './profile/MembershipReceipt';
import MembershipModal from './MembershipModal';

const Dashboard = () => {
    const { user, loading, logout } = useAuth();
    const navigate = useNavigate();
    const [requests, setRequests] = useState<any[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [activeTab, setActiveTab] = useState<'profile' | 'requests' | 'messages' | 'favorites' | 'achievements' | 'orders'>('requests');
    const [showWizard, setShowWizard] = useState(false);
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isReceiptOpen, setIsReceiptOpen] = useState(false);
    const [isMembershipOpen, setIsMembershipOpen] = useState(false);
    const [membershipMode, setMembershipMode] = useState<'purchase' | 'renew' | 'upgrade'>('renew');
    const [membershipDuration, setMembershipDuration] = useState<number>(3);
    const [membershipPrice, setMembershipPrice] = useState(0);
    const [selectedProgram, setSelectedProgram] = useState<any>(null);
    const [allPrograms, setAllPrograms] = useState<any[]>([]);
    const [isUpgradeSelectionOpen, setIsUpgradeSelectionOpen] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    const [notifications, setNotifications] = useState<any[]>([]);

    // Promo Activation State
    const [promoCode, setPromoCode] = useState('');
    const [promoError, setPromoError] = useState('');
    const [promoSuccess, setPromoSuccess] = useState('');
    const [isActivatingPromo, setIsActivatingPromo] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        const paymentStatus = searchParams.get('payment');
        if (paymentStatus === 'success' && user && !isVerifying) {
            handleVerifyPayment();
        }
    }, [searchParams, user]);

    const handleVerifyPayment = async () => {
        if (!user) return;
        setIsVerifying(true);

        try {
            // 1. Find the latest pending order for this user (YooKassa or Robokassa)
            const qOrders = query(
                collection(db, "orders"),
                where("email", "==", user.email)
            );
            const snap = await getDocs(qOrders);

            // Filter for pending statuses in JS to avoid complex Firestore query issues
            const pendingOrders = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                .filter(o => o.status === 'pending_yookassa' || o.status === 'pending_robokassa')
                .sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));

            if (pendingOrders.length === 0) {
                console.log("No pending orders found for verification");
                setIsVerifying(false);
                return;
            }

            const order = pendingOrders[0];

            if (!order.paymentId) {
                console.error("Order missing paymentId");
                setIsVerifying(false);
                return;
            }

            // 2. Check status via Netlify Function
            let verifyUrl = '';
            if (order.status === 'pending_yookassa') {
                verifyUrl = `/.netlify/functions/check-payment/${order.paymentId}`;
            } else if (order.status === 'pending_robokassa') {
                verifyUrl = `/.netlify/functions/robokassa-check/${order.paymentId}`;
            } else {
                setIsVerifying(false);
                return;
            }

            const res = await fetch(verifyUrl);
            if (!res.ok) throw new Error("Failed to verify payment status");

            const data = await res.json();
            console.log("Payment status check result:", data);

            if (data.status === 'succeeded' || data.status === 'waiting_for_capture') {
                // 3. Grant the product/subscription
                const userRef = doc(db, "users", user.uid);

                if (order.type === 'subscription') {
                    // Calculate expiry
                    const duration = order.duration || 3;
                    let expiresAtDate = new Date();

                    const userSnap = await getDoc(userRef);
                    const currentProfile = userSnap.data();

                    if (currentProfile?.subscription?.expiresAt && currentProfile.subscription.status === 'active') {
                        const currentExpiry = currentProfile.subscription.expiresAt.toDate();
                        if (currentExpiry > new Date()) {
                            expiresAtDate = new Date(currentExpiry);
                        }
                    }
                    expiresAtDate.setMonth(expiresAtDate.getMonth() + duration);

                    await updateDoc(userRef, {
                        subscription: {
                            planId: order.planId,
                            title: order.planTitle,
                            expiresAt: Timestamp.fromDate(expiresAtDate),
                            status: 'active',
                            startedAt: Timestamp.now(),
                            purchasePrice: order.price
                        }
                    });
                }

                // 4. Update order status
                await updateDoc(doc(db, "orders", order.id), {
                    status: 'completed',
                    verifiedAt: Timestamp.now()
                });

                // 5. Notify user
                await addDoc(collection(db, "notifications"), {
                    email: user.email,
                    title: "Оплата подтверждена! ✅",
                    message: `Ваш заказ "${order.planTitle || order.planId}" успешно оплачен и активирован.`,
                    type: 'order',
                    isRead: false,
                    createdAt: Timestamp.now()
                });

                alert('Оплата успешно подтверждена! Ваш профиль обновлен.');
            } else {
                console.log("Payment not yet succeeded:", data.status);
            }

        } catch (error) {
            console.error("Verification error:", error);
        } finally {
            setIsVerifying(false);
            // Clear search params
            searchParams.delete('payment');
            searchParams.delete('type');
            setSearchParams(searchParams);
        }
    }

    // Handle Tab Change & Clear Badges
    const handleTabChange = async (tab: 'profile' | 'requests' | 'messages' | 'favorites' | 'achievements' | 'orders') => {
        setActiveTab(tab);

        if (tab === 'achievements' && userProfile?.achievements) {
            const newAchievements = userProfile.achievements.filter((a: any) => a.isNew);
            if (newAchievements.length > 0) {
                // Clear isNew flag
                const updatedAchievements = userProfile.achievements.map((a: any) => ({ ...a, isNew: false }));
                try {
                    await updateDoc(doc(db, "users", user.uid), {
                        achievements: updatedAchievements
                    });
                    // Local update to remove badge instantly (snapshot will follow)
                    setUserProfile((prev: any) => ({ ...prev, achievements: updatedAchievements }));
                } catch (error) {
                    console.error("Error clearing badges:", error);
                }
            }
        }
    };

    // Mark as read
    const markNotificationAsRead = async (id: string) => {
        try {
            await updateDoc(doc(db, "notifications", id), {
                isRead: true
            });
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    // Navigation fallback
    useEffect(() => {
        if (!loading && !user) navigate('/');
    }, [user, loading, navigate]);

    // Promo Activation
    const handleActivatePromo = async () => {
        if (!promoCode.trim() || !user) return;
        setIsActivatingPromo(true);
        setPromoError('');
        setPromoSuccess('');

        try {
            const q = query(collection(db, 'promo_codes'), where('code', '==', promoCode.toUpperCase()));
            const snap = await getDocs(q);

            if (snap.empty) {
                setPromoError('Промокод не найден');
                setIsActivatingPromo(false);
                return;
            }

            const promoDoc = snap.docs[0];
            const promoData = promoDoc.data();

            if (promoData.expiresAt && promoData.expiresAt.toDate() < new Date()) {
                setPromoError('Срок действия промокода истек');
                setIsActivatingPromo(false);
                return;
            }
            if (promoData.maxUses !== -1 && promoData.currentUses >= promoData.maxUses) {
                setPromoError('Промокод больше не действителен (лимит исчерпан)');
                setIsActivatingPromo(false);
                return;
            }
            if (promoData.usersUsed && promoData.usersUsed.includes(user.uid)) {
                setPromoError('Вы уже использовали этот промокод');
                setIsActivatingPromo(false);
                return;
            }

            const userRef = doc(db, 'users', user.uid);

            if (promoData.type === 'discount') {
                await updateDoc(userRef, {
                    activePromoCode: promoData.code,
                    activePromoDiscount: promoData.value,
                    activePromoApplicableTo: promoData.applicableTo || 'all'
                });
                // Note: We don't increment currentUses here for discount codes, we do it at checkout!
                setPromoSuccess(`Скидка ${promoData.value}% активирована! Она будет автоматически применена при оплате.`);
                setIsActivatingPromo(false);
                setPromoCode('');
                return;
            }

            if (promoData.type === 'balance') {
                const currentBalance = userProfile?.walletBalance || 0;
                await updateDoc(userRef, {
                    walletBalance: currentBalance + promoData.value
                });
                setPromoSuccess(`Вам зачислено ${promoData.value} ₽ на баланс!`);
            } else if (promoData.type === 'spins') {
                const currentSpins = userProfile?.wheelSpins || 0;
                await updateDoc(userRef, {
                    wheelSpins: currentSpins + promoData.value
                });
                setPromoSuccess(`Вам зачислено ${promoData.value} вращений Колеса Фортуны!`);
            }

            // Mark used
            await updateDoc(doc(db, 'promo_codes', promoDoc.id), {
                currentUses: promoData.currentUses + 1,
                usersUsed: [...(promoData.usersUsed || []), user.uid]
            });

            setPromoCode('');
        } catch (error) {
            console.error(error);
            setPromoError('Ошибка активации. Попробуйте позже.');
        } finally {
            setIsActivatingPromo(false);
        }
    };

    // Sound Ref
    const audioRef = React.useRef(new Audio('/sounds/notification.mp3'));
    const isFirstLoad = React.useRef(true);

    // Data Fetching & Notifications
    useEffect(() => {
        if (!user) return;

        let unsubscribeRequests = () => { };
        let unsubscribeProfile = () => { };
        let unsubscribeMessages = () => { };
        let unsubscribeNotifications = () => { };
        let unsubscribeOrders = () => { };

        // 1. Fetch Requests
        if (user.email) {
            const q = query(collection(db, "requests"), where("email", "==", user.email));
            unsubscribeRequests = onSnapshot(q, (snapshot) => {
                const loadedRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setRequests(loadedRequests);
            });

            // 4. Fetch Notifications
            const qNotifs = query(collection(db, "notifications"), where("email", "==", user.email));
            unsubscribeNotifications = onSnapshot(qNotifs, (snapshot) => {
                const loadedNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Sort by date (newest first) - assuming 'createdAt' exists
                loadedNotifications.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

                setNotifications(loadedNotifications);

                const unread = loadedNotifications.filter((n: any) => !n.isRead).length;
                setUnreadNotifications(unread);

                // Play sound for NEW notifications (skip initial load)
                if (!isFirstLoad.current) {
                    const hasNew = snapshot.docChanges().some(change => change.type === 'added');
                    if (hasNew) {
                        audioRef.current.play().catch(e => console.log("Audio play error (interaction needed?):", e));
                    }
                } else {
                    isFirstLoad.current = false;
                }
            });

            // 5. Fetch Orders
            const qOrders = query(collection(db, "orders"), where("email", "==", user.email));
            unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
                const loadedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                loadedOrders.sort((a: any, b: any) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
                setOrders(loadedOrders);
            });

            // 6. Fetch All Programs (for upgrade)
            const qProgs = collection(db, "directions");
            getDocs(qProgs).then((snap) => {
                setAllPrograms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
        }

        // 2. Fetch Profile
        unsubscribeProfile = onSnapshot(doc(db, "users", user.uid), async (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                setUserProfile(data);

                // Subscription Expiry Alert
                if (data.subscription?.expiresAt && data.subscription?.status === 'active') {
                    const expiryDate = data.subscription.expiresAt.toDate();
                    const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                    if (daysLeft > 0 && daysLeft <= 3) {
                        // Check if alert already sent (simple localStorage or flag in DB, here we'll use a local check vs notifications)
                        // Actually, better to check against the 'notifications' state we already have
                        // or just rely on the frequency of login.
                        // Let's check the notifications collection to avoid spam
                        const alreadyAlerted = notifications.some(n =>
                            n.type === 'subscription_expiry' &&
                            n.relatedId === data.subscription.expiresAt?.seconds?.toString()
                        );

                        if (!alreadyAlerted) {
                            try {
                                await addDoc(collection(db, "notifications"), {
                                    email: user.email,
                                    title: "Подписка истекает",
                                    message: `Ваш абонемент "${data.subscription.title}" истекает через ${daysLeft} ${daysLeft === 1 ? 'день' : 'дня'}. Продлите его сейчас, чтобы получить бонус!`,
                                    type: 'subscription_expiry',
                                    isRead: false,
                                    createdAt: Timestamp.now(),
                                    relatedId: data.subscription.expiresAt?.seconds?.toString() || ''
                                });
                            } catch (e) {
                                console.error("Error creating expiry notification:", e);
                            }
                        }
                    }
                }

                // Show wizard if no group and no experience level set (new user or incomplete profile)
                // AND user is not an admin or coach
                if (data.groupId) {
                    setShowWizard(false);
                } else if (!data.experienceLevel && data.role !== 'admin' && data.role !== 'coach') {
                    setShowWizard(true);
                }
            }
        });

        // 3. Listen for unread messages (from Admin) - Keep this for Messages Tab badge if needed
        if (user.uid && user.email) {
            const qMsgs = query(
                collection(db, "messages"),
                or(
                    where("userId", "==", user.uid),
                    where("email", "==", user.email)
                )
            );
            unsubscribeMessages = onSnapshot(qMsgs, (snapshot) => {
                let count = 0;
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const thread = data.thread || [];
                    if (thread.length > 0) {
                        const lastMsg = thread[thread.length - 1];
                        // Count as unread if last message is from admin AND it hasn't been read by user
                        // We check !== true to include undefined (legacy messages) as unread
                        if (lastMsg.sender === 'admin' && data.isReadByUser !== true) {
                            count++;
                        }
                    }
                });
                setUnreadMessages(count);
            });
        }

        return () => {
            unsubscribeRequests();
            unsubscribeProfile();
            unsubscribeMessages();
            unsubscribeNotifications();
            unsubscribeOrders();
        };
    }, [user]);

    // Handle Deep Linking / Notifications Click
    useEffect(() => {
        const ticketId = searchParams.get('ticketId');
        if (ticketId) {
            setActiveTab('messages');
        }
    }, [searchParams]);

    // YooKassa Payment Polling
    useEffect(() => {
        if (!user || orders.length === 0 || !userProfile) return;

        const pendingOrders = orders.filter(o => o.status === 'pending_yookassa' && o.paymentId);

        if (pendingOrders.length === 0) return;

        const checkPayments = async () => {
            for (const order of pendingOrders) {
                try {
                    const res = await fetch(`/api/check-payment/${order.paymentId}`);
                    if (!res.ok) continue;

                    const data = await res.json();

                    if (data.status === 'succeeded') {
                        // 1. Update order status
                        await updateDoc(doc(db, 'orders', order.id), {
                            status: 'completed',
                            paidAt: Timestamp.now()
                        });

                        // 2. Grant Subscription
                        let expiresAtDate = new Date();
                        let isEarlyRenewal = false;

                        // Upgrade/Renew logic based on order.discountApplied or just extending
                        if (userProfile?.subscription?.expiresAt) {
                            try {
                                const currentExpiry = (typeof userProfile.subscription.expiresAt.toDate === 'function' ? userProfile.subscription.expiresAt.toDate() : new Date(userProfile.subscription.expiresAt.seconds * 1000));
                                if (currentExpiry > new Date()) {
                                    expiresAtDate = new Date(currentExpiry);

                                    const daysToExpiry = (currentExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                                    if (daysToExpiry > 5) {
                                        isEarlyRenewal = true;
                                    }
                                }
                            } catch (e) {
                                console.error("Error parsing current expiry for webhook:", e);
                            }
                        }

                        expiresAtDate.setMonth(expiresAtDate.getMonth() + (order.duration || 1));

                        const userRef = doc(db, "users", user.uid);
                        await updateDoc(userRef, {
                            subscription: {
                                planId: order.planId,
                                title: order.planTitle,
                                expiresAt: Timestamp.fromDate(expiresAtDate),
                                status: 'active',
                                startedAt: Timestamp.now(),
                                purchasePrice: order.price
                            }
                        });

                        // Early renewal bonus
                        if (isEarlyRenewal) {
                            const bonusRef = doc(db, 'users', user.uid, 'private', 'bonus_state');
                            const bonusSnap = await getDoc(bonusRef);
                            const currentSpins = bonusSnap.exists() ? (bonusSnap.data().spinsAvailable || 0) : 0;

                            await updateDoc(bonusRef, {
                                spinsAvailable: currentSpins + 1,
                                lastBonusReason: 'early_renewal_yookassa',
                                lastBonusAt: Timestamp.now()
                            }).catch(async () => {
                                // Provide fallback if document doesn't exist yet
                                import('firebase/firestore').then(async ({ setDoc }) => {
                                    await setDoc(bonusRef, {
                                        spinsAvailable: currentSpins + 1,
                                        lastBonusReason: 'early_renewal_yookassa',
                                        lastBonusAt: Timestamp.now()
                                    }, { merge: true });
                                })
                            });

                            await addDoc(collection(db, "notifications"), {
                                email: user.email,
                                title: "Бонус за лояльность! 🎁",
                                message: `Спасибо за раннее продление через ЮKassa! Вам начислено +1 вращение в Колесе Фортуны.`,
                                type: 'bonus',
                                isRead: false,
                                createdAt: Timestamp.now()
                            });
                        }

                        // Also notify about successful payment
                        await addDoc(collection(db, "notifications"), {
                            email: user.email,
                            title: "Оплата прошла успешно! 🎉",
                            message: `Ваш абонемент "${order.planTitle}" успешно оплачен и активирован!`,
                            type: 'payment_success',
                            isRead: false,
                            createdAt: Timestamp.now()
                        });
                    } else if (data.status === 'canceled') {
                        // Update order as failed
                        await updateDoc(doc(db, 'orders', order.id), {
                            status: 'failed_yookassa'
                        });
                    }
                } catch (err) {
                    console.error("Error polling payment status:", err);
                }
            }
        };

        // Poll every 5 seconds if there are pending orders
        const intervalId = setInterval(checkPayments, 5000);

        // Initial check
        checkPayments();

        return () => clearInterval(intervalId);
    }, [orders, user, userProfile]);

    const handleRenew = async () => {
        if (!userProfile?.subscription?.planId) return;

        // Fetch program details to get prices
        try {
            const planRef = doc(db, "directions", userProfile.subscription.planId);
            const planSnap = await getDoc(planRef);
            if (planSnap.exists()) {
                const planData = { id: planSnap.id, ...planSnap.data() };
                setSelectedProgram(planData);
                setMembershipMode('renew');

                // Set default 3 months price
                const duration = 3;
                const price = (planData as any).prices?.[duration] || 0;
                setMembershipDuration(duration);
                setMembershipPrice(price);
                setIsMembershipOpen(true);
            } else {
                // Fallback if direction not found (maybe it was deleted)
                window.location.href = '/#programs';
            }
        } catch (error) {
            console.error("Error fetching plan for renewal:", error);
        }
    };

    const handleUpgrade = () => {
        setIsUpgradeSelectionOpen(true);
    };

    const handleFreeze = async () => {
        if (!user || !userProfile?.subscription) return;

        try {
            const userRef = doc(db, "users", user.uid);
            const currentStatus = userProfile.subscription.status;
            const newStatus = currentStatus === 'frozen' ? 'active' : 'frozen';

            // If freezing, set a default date or handle logic
            const updateData: any = {
                "subscription.status": newStatus
            };

            if (newStatus === 'frozen') {
                const frozenUntil = new Date();
                frozenUntil.setDate(frozenUntil.getDate() + 7); // Default 7 days
                updateData["subscription.frozenUntil"] = Timestamp.fromDate(frozenUntil);
            } else {
                updateData["subscription.frozenUntil"] = null;
            }

            await updateDoc(userRef, updateData);
            alert(newStatus === 'frozen' ? "Абонемент заморожен на 7 дней" : "Абонемент разморожен");
        } catch (error) {
            console.error("Error toggling freeze:", error);
            alert("Ошибка при изменении статуса подписки");
        }
    };

    if (loading || !user) return <div className="min-h-screen bg-[#020202] flex items-center justify-center text-white">Загрузка...</div>;

    return (
        <div className="min-h-screen bg-[#020202] pt-32 pb-20 font-manrope">
            {/* Background Elements */}
            <div className="fixed inset-0 bg-hero-pattern opacity-10 pointer-events-none" />
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-sparta-gold/5 blur-[100px] rounded-full pointer-events-none" />

            <Container>
                <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                    {/* Sidebar */}
                    <div className="w-full md:w-1/3 lg:w-1/4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm sticky top-24">
                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sparta-gold to-yellow-600 p-1 mb-4">
                                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                                        {(userProfile?.photoURL || user.photoURL) ? (
                                            <img
                                                src={userProfile?.photoURL || user.photoURL}
                                                alt={user.displayName || "User"}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User size={40} className="text-sparta-gold" />
                                        )}
                                    </div>
                                </div>
                                <h2 className="text-xl font-bold text-white font-russo">{user.displayName || "Спортсмен"}</h2>
                                <p className="text-white/50 text-sm font-manrope">{user.email}</p>
                            </div>

                            <nav className="space-y-2">
                                <button
                                    onClick={() => handleTabChange('requests')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'requests' ? 'bg-sparta-gold text-black font-bold' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                >
                                    <LayoutDashboard size={18} />
                                    <span>Мои тренировки</span>
                                </button>

                                <button
                                    onClick={() => handleTabChange('messages')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'messages' ? 'bg-sparta-gold text-black font-bold' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                >
                                    <MessageSquare size={18} />
                                    <span>Поддержка</span>
                                    {unreadMessages > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{unreadMessages}</span>}
                                </button>

                                <button
                                    onClick={() => handleTabChange('achievements')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'achievements' ? 'bg-sparta-gold text-black font-bold' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                >
                                    <Trophy size={18} />
                                    <span>Мои награды</span>
                                    {userProfile?.achievements?.filter((a: any) => a.isNew).length > 0 && (
                                        <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-bounce">
                                            {userProfile.achievements.filter((a: any) => a.isNew).length}
                                        </span>
                                    )}
                                </button>

                                <button
                                    onClick={() => handleTabChange('orders')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'orders' ? 'bg-sparta-gold text-black font-bold' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                >
                                    <Receipt size={18} />
                                    <span>История заказов</span>
                                </button>

                                <div className="h-px bg-white/10 my-2" />

                                <button
                                    onClick={() => handleTabChange('profile')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-sparta-gold text-black font-bold' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                >
                                    <User size={18} />
                                    <span>Мой профиль</span>
                                </button>

                                {((userProfile?.role === 'admin') || (user.email === 'sofiatzbpo121@gmail.com')) && (
                                    <button
                                        onClick={() => navigate('/admin')}
                                        className="w-full flex items-center gap-3 px-4 py-3 mt-2 bg-sparta-gold/10 text-sparta-gold hover:bg-sparta-gold/20 rounded-xl transition-all border border-sparta-gold/20"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-sparta-gold animate-pulse" />
                                        <span>Админ панель</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => { logout(); navigate('/'); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl transition-all mt-8"
                                >
                                    <LogOut size={18} />
                                    <span>Выйти</span>
                                </button>
                            </nav>

                            {/* Active Plan Widget */}
                            {userProfile?.subscription?.status === 'active' && (
                                <div className="mt-8 p-4 bg-sparta-gold/10 border border-sparta-gold/20 rounded-2xl">
                                    <div className="flex items-center gap-2 mb-2 text-sparta-gold">
                                        <Shield size={14} />
                                        <span className="text-[10px] uppercase font-bold tracking-widest">Активный план</span>
                                    </div>
                                    <h4 className="text-white font-russo text-sm mb-1">{userProfile.subscription.title}</h4>
                                    <div className="flex justify-between items-end">
                                        <p className="text-white/40 text-[10px]">
                                            Осталось: <span className="text-white font-bold">{userProfile.subscription.expiresAt ? Math.max(0, Math.ceil(((typeof userProfile.subscription.expiresAt.toDate === 'function' ? userProfile.subscription.expiresAt.toDate() : userProfile.subscription.expiresAt) - new Date().getTime()) / (1000 * 60 * 60 * 24))) : '0'} дн.</span>
                                        </p>
                                        <button
                                            onClick={() => setActiveTab('requests')} // Redirect to management area (we'll add it there)
                                            className="text-sparta-gold text-[10px] font-bold hover:underline"
                                        >
                                            Управлять
                                        </button>
                                    </div>
                                    <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${userProfile.subscription.expiresAt ? Math.min(100, (Math.max(0, ((typeof userProfile.subscription.expiresAt.toDate === 'function' ? userProfile.subscription.expiresAt.toDate() : userProfile.subscription.expiresAt) - new Date().getTime()) / (1000 * 60 * 60 * 24))) / 30) * 100 : 0}%` }}
                                            className="h-full bg-sparta-gold"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Freeze Status */}
                            {userProfile?.subscription?.status === 'frozen' && (
                                <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                                    <div className="flex items-center gap-2 mb-2 text-blue-400">
                                        <Clock size={14} />
                                        <span className="text-[10px] uppercase font-bold tracking-widest">Заморожен</span>
                                    </div>
                                    <h4 className="text-white font-russo text-sm mb-1">{userProfile.subscription.title}</h4>
                                    <p className="text-white/40 text-[10px]">
                                        До: <span className="text-white font-bold">{userProfile.subscription.frozenUntil ? (typeof userProfile.subscription.frozenUntil.toDate === 'function' ? userProfile.subscription.frozenUntil.toDate() : userProfile.subscription.frozenUntil).toLocaleDateString() : '-'}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="w-full md:w-2/3 lg:w-3/4">




                        {/* Header with Bell */}
                        <div className="flex items-center justify-between mb-8">
                            <h1 className="text-3xl font-russo text-white">
                                {activeTab === 'requests' && 'Мои тренировки и подписка'}
                                {activeTab === 'profile' && 'Мой профиль'}
                                {activeTab === 'messages' && 'Сообщения'}
                                {activeTab === 'achievements' && 'Мои достижения'}
                                {activeTab === 'orders' && 'История заказов'}
                            </h1>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsNotificationsOpen(true)}
                                    className="relative p-3 rounded-full hover:bg-white/5 text-white/60 hover:text-sparta-gold transition-colors border border-transparent hover:border-white/10"
                                >
                                    <Bell size={24} />
                                    {unreadNotifications > 0 && (
                                        <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-[#020202]" />
                                    )}
                                </button>
                                {/* ... user name ... */}
                            </div>
                        </div>

                        {userProfile && (
                            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                                <Trophy size={16} className="text-sparta-gold" />
                                <span className="text-sm font-bold text-white/80">{userProfile.childName}</span>
                            </div>
                        )}

                        {/* Tab Content */}
                        <div className="mt-8">
                            {activeTab === 'profile' && (
                                <div className="space-y-6">
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-bold text-white font-russo">Личные данные</h3>
                                            <button
                                                onClick={() => setIsProfileModalOpen(true)}
                                                className="p-2 hover:bg-white/5 rounded-lg text-sparta-gold transition-colors"
                                            >
                                                <Settings size={20} />
                                            </button>
                                        </div>

                                        {/* Active Discount Banner */}
                                        {userProfile?.activePromoCode && (
                                            <div className="mb-6 p-4 bg-sparta-gold/10 border border-sparta-gold/20 rounded-xl flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-sparta-gold/20 text-sparta-gold flex items-center justify-center">
                                                        <Tag size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold text-sm">Активная скидка {userProfile.activePromoDiscount}%</p>
                                                        <p className="text-white/50 text-[10px] uppercase font-bold tracking-wider mb-0.5">
                                                            Промокод: <span className="text-sparta-gold">{userProfile.activePromoCode}</span>
                                                        </p>
                                                        <p className="text-white/40 text-[10px]">
                                                            Действует на: {userProfile.activePromoApplicableTo === 'shop' ? 'Товары магазина' : userProfile.activePromoApplicableTo === 'subscriptions' ? 'Подписки' : 'Все покупки'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3 text-white/60">
                                                    <User size={18} className="text-sparta-gold" />
                                                    <div>
                                                        <p className="text-xs uppercase tracking-widest opacity-50">Имя ребенка</p>
                                                        <p className="text-white font-bold">{userProfile?.childName || 'Не указано'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 text-white/60">
                                                    <Calendar size={18} className="text-sparta-gold" />
                                                    <div>
                                                        <p className="text-xs uppercase tracking-widest opacity-50">Возраст</p>
                                                        <p className="text-white font-bold">{userProfile?.age || 'Не указано'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3 text-white/60">
                                                    <Phone size={18} className="text-sparta-gold" />
                                                    <div>
                                                        <p className="text-xs uppercase tracking-widest opacity-50">Телефон</p>
                                                        <p className="text-white font-bold">{userProfile?.phone || 'Не указано'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 text-white/60">
                                                    <Mail size={18} className="text-sparta-gold" />
                                                    <div>
                                                        <p className="text-xs uppercase tracking-widest opacity-50">Email</p>
                                                        <p className="text-white font-bold">{user.email}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Promo Code UI */}
                                    <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-48 h-48 bg-sparta-gold/5 rounded-full blur-3xl pointer-events-none" />
                                        <h3 className="text-xl font-bold text-white font-russo mb-4 flex items-center gap-2">
                                            <Tag className="text-sparta-gold" size={24} />
                                            Активация промокода
                                        </h3>
                                        <p className="text-white/50 text-sm mb-6 max-w-md">
                                            Введите промокод для зачисления средств на баланс или получения вращений Колеса Фортуны.
                                        </p>

                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <div className="relative flex-1">
                                                <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                                <input
                                                    type="text"
                                                    value={promoCode}
                                                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                                    placeholder="ВВЕДИТЕ КОД"
                                                    className={`w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-white uppercase font-mono tracking-widest focus:border-sparta-gold outline-none transition-all ${promoError ? 'border-red-500/50 focus:border-red-500' : ''}`}
                                                />
                                                {promoError && (
                                                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-xs mt-2 font-bold tracking-wider absolute -bottom-6 left-0">
                                                        {promoError}
                                                    </motion.p>
                                                )}
                                            </div>
                                            <Button
                                                onClick={handleActivatePromo}
                                                disabled={isActivatingPromo || !promoCode.trim()}
                                                className="px-8 shrink-0 h-[58px]"
                                            >
                                                {isActivatingPromo ? <Loader2 className="animate-spin" size={20} /> : 'Активировать'}
                                            </Button>
                                        </div>

                                        <AnimatePresence>
                                            {promoSuccess && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mt-8 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                                                        <PartyPopper size={20} />
                                                    </div>
                                                    <p className="font-bold text-sm tracking-wide">{promoSuccess}</p>
                                                    <button onClick={() => setPromoSuccess('')} className="ml-auto text-green-500/50 hover:text-green-400 p-2">
                                                        <X size={16} />
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'favorites' && (
                                <div className="text-center py-10">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Heart className="text-red-500" size={40} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Избранные товары</h3>
                                    <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                                        Все товары, которые вы отметили сердечком, хранятся здесь.
                                    </p>
                                    <button
                                        onClick={() => navigate('/shop/favorites')}
                                        className="px-8 py-3 bg-[#1a1a1a] hover:bg-[#252525] text-white rounded-xl border border-white/10 font-bold transition-all flex items-center gap-2 mx-auto"
                                    >
                                        Перейти к избранному <ArrowRight size={16} />
                                    </button>
                                </div>
                            )}

                            {activeTab === 'requests' && (
                                <div className="space-y-6">
                                    {/* Active Subscription Management */}
                                    {userProfile?.subscription && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-white/10 rounded-3xl p-8 overflow-hidden relative group"
                                        >
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-sparta-gold/5 rounded-full blur-3xl -mr-32 -mt-32 transition-colors group-hover:bg-sparta-gold/10" />

                                            <div className="relative z-10">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-12 h-12 bg-sparta-gold/20 rounded-2xl flex items-center justify-center text-sparta-gold">
                                                        <Shield size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-russo text-white uppercase tracking-wider">{userProfile.subscription.title}</h3>
                                                        <p className="text-white/40 text-xs flex items-center gap-2">
                                                            <Calendar size={12} />
                                                            Статус:
                                                            <span className={`font-bold ${userProfile.subscription.status === 'active' ? 'text-green-500' : 'text-blue-400'}`}>
                                                                {userProfile.subscription.status === 'active' ? 'Активен' : 'Заморожен'}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                                        <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest mb-1">Осталось дней</p>
                                                        <p className="text-2xl font-russo text-white">
                                                            {userProfile.subscription.expiresAt ? Math.max(0, Math.ceil(((typeof userProfile.subscription.expiresAt.toDate === 'function' ? userProfile.subscription.expiresAt.toDate() : userProfile.subscription.expiresAt) - new Date().getTime()) / (1000 * 60 * 60 * 24))) : '0'}
                                                        </p>
                                                    </div>
                                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                                        <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest mb-1">Истекает</p>
                                                        <p className="text-lg font-bold text-white">
                                                            {userProfile.subscription.expiresAt ? (typeof userProfile.subscription.expiresAt.toDate === 'function' ? userProfile.subscription.expiresAt.toDate() : userProfile.subscription.expiresAt).toLocaleDateString('ru-RU') : '-'}
                                                        </p>
                                                    </div>
                                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                                        <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest mb-1">Тип плана</p>
                                                        <p className="text-lg font-bold text-white">Индивидуальный</p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-4">
                                                    <button
                                                        onClick={handleRenew}
                                                        className="flex items-center gap-2 px-6 py-3 bg-sparta-gold text-black font-bold rounded-xl hover:bg-yellow-500 transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                                                    >
                                                        <RefreshCw size={18} />
                                                        Продлить
                                                    </button>
                                                    <button
                                                        onClick={handleUpgrade}
                                                        className="flex items-center gap-2 px-6 py-3 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all border border-white/10"
                                                    >
                                                        <Zap size={18} className="text-sparta-gold" />
                                                        Апгрейд
                                                    </button>
                                                    <button
                                                        onClick={handleFreeze}
                                                        className={`flex items-center gap-2 px-6 py-3 bg-white/5 font-bold rounded-xl transition-all border ${userProfile.subscription.status === 'frozen' ? 'text-green-400 border-green-400/20 hover:bg-green-400/10' : 'text-blue-400 border-blue-400/20 hover:bg-blue-400/10'}`}
                                                    >
                                                        {userProfile.subscription.status === 'frozen' ? (
                                                            <>
                                                                <RefreshCw size={18} />
                                                                Разморозить
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Clock size={18} />
                                                                Заморозить
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="grid gap-4">
                                        {requests.length > 0 ? (
                                            requests.map((req) => (
                                                <motion.div
                                                    key={req.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    onClick={() => setSelectedRequest(req)}
                                                    className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-white/10 transition-colors group cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-sparta-gold/10 flex items-center justify-center text-sparta-gold group-hover:bg-sparta-gold group-hover:text-black transition-colors">
                                                            <Calendar size={24} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <h4 className="text-white font-bold text-lg group-hover:text-sparta-gold transition-colors">
                                                                    {req.programType || 'Пробная тренировка'}
                                                                </h4>
                                                                <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-white/50">
                                                                    {req.createdAt?.seconds ? new Date(req.createdAt.seconds * 1000).toLocaleDateString() : 'Дата не указана'}
                                                                </span>
                                                            </div>
                                                            <p className="text-white/50 text-sm">
                                                                Спортсмен: <span className="text-white/70">{req.name}</span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <div className={`px-4 py-2 rounded-full text-sm font-bold border shadow-[0_0_10px_rgba(0,0,0,0.1)] ${req.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                            req.status === 'contacted' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                                req.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                            }`}>
                                                            {req.status === 'completed' ? 'Завершено' :
                                                                req.status === 'contacted' ? 'В работе' :
                                                                    req.status === 'rejected' ? 'Отклонено' :
                                                                        'На рассмотрении'}
                                                        </div>
                                                        <ArrowRight className="text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                                    </div>
                                                </motion.div>
                                            ))
                                        ) : (
                                            <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20 mb-4">
                                                    <Calendar size={32} />
                                                </div>
                                                <h3 className="text-xl text-white font-russo mb-2">Нет активных заявок</h3>
                                                <p className="text-white/50 max-w-sm">
                                                    Запишитесь на первое бесплатное занятие, чтобы начать свой путь в Спарте.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'orders' && (
                                <div className="grid gap-4">
                                    {orders.length > 0 ? (
                                        orders.map((order) => (
                                            <motion.div
                                                key={order.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-white/5 border border-white/10 rounded-2xl p-6 flex justify-between items-center group hover:bg-white/10 transition-all"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-sparta-gold/10 flex items-center justify-center text-sparta-gold group-hover:bg-sparta-gold group-hover:text-black transition-colors">
                                                        <Receipt size={24} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-bold">{order.planTitle}</h4>
                                                        <p className="text-white/30 text-xs">
                                                            {order.date?.seconds ? new Date(order.date.seconds * 1000).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Дата не указана'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <p className="text-white font-bold">{order.price.toLocaleString('ru-RU')} ₽</p>
                                                    <button
                                                        onClick={() => { setSelectedOrder(order); setIsReceiptOpen(true); }}
                                                        className="p-2 bg-white/5 rounded-lg text-white/40 hover:text-sparta-gold hover:bg-sparta-gold/10 transition-all"
                                                        title="Посмотреть чек"
                                                    >
                                                        <Download size={18} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))
                                    ) : (
                                        <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20 mb-4">
                                                <Receipt size={32} />
                                            </div>
                                            <h3 className="text-xl text-white font-russo mb-2">История заказов пуста</h3>
                                            <p className="text-white/50 max-w-sm">
                                                Здесь будут отображаться ваши покупки абонементов и товаров из магазина.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'messages' && (
                                <UserRequests ticketId={searchParams.get('ticketId')} />
                            )}

                            {activeTab === 'achievements' && (
                                <AchievementsList userAchievements={userProfile?.achievements} />
                            )}
                        </div>
                    </div>
                </div>
            </Container >

            {
                userProfile && (
                    <ProfileViewModal
                        isOpen={isProfileModalOpen}
                        onClose={() => setIsProfileModalOpen(false)}
                        userData={userProfile}
                    />
                )
            }



            <NotificationsModal
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                notifications={notifications}
                onMarkAsRead={markNotificationAsRead}
            />

            <RequestDetailsModal
                isOpen={!!selectedRequest}
                onClose={() => setSelectedRequest(null)}
                request={selectedRequest}
                onContactSupport={() => setActiveTab('messages')}
            />
            {/* Smart Enrollment Wizard */}
            {
                showWizard && userProfile && (
                    <SmartEnrollmentWizard
                        user={{ ...userProfile, id: user.uid }}
                        onComplete={() => setShowWizard(false)}
                    />
                )
            }
            {/* Receipt Modal */}
            {
                isReceiptOpen && selectedOrder && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md"
                            onClick={() => setIsReceiptOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative z-10 w-full flex justify-center"
                        >
                            <MembershipReceipt
                                order={{
                                    id: selectedOrder.id,
                                    date: selectedOrder.date,
                                    planTitle: selectedOrder.planTitle,
                                    price: selectedOrder.price,
                                    duration: selectedOrder.duration,
                                    paymentMethod: selectedOrder.paymentMethod,
                                    userName: user.displayName || 'Спортсмен',
                                    email: user.email || ''
                                }}
                                onClose={() => setIsReceiptOpen(false)}
                            />
                        </motion.div>
                    </div>
                )
            }
            {/* Upgrade Plan Selection Modal */}
            <AnimatePresence>
                {isUpgradeSelectionOpen && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md"
                            onClick={() => setIsUpgradeSelectionOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative z-10 w-full max-w-4xl bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <div>
                                    <h2 className="text-xl font-russo text-white uppercase tracking-wider">Выберите новый план</h2>
                                    <p className="text-xs text-white/40 font-manrope">Стоимость неиспользованных дней вашего текущего плана будет зачтена</p>
                                </div>
                                <button onClick={() => setIsUpgradeSelectionOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                    <X className="text-white/50" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {allPrograms
                                        .filter(p => p.id !== userProfile?.subscription?.planId)
                                        .map((program) => (
                                            <GlassCard
                                                key={program.id}
                                                className="p-6 border-white/5 hover:border-sparta-gold/30 transition-all cursor-pointer group flex flex-col h-full"
                                                onClick={() => {
                                                    setSelectedProgram(program);
                                                    setMembershipMode('upgrade');
                                                    setMembershipDuration(3); // Default
                                                    setMembershipPrice(program.prices?.[3] || 0);
                                                    setIsMembershipOpen(true);
                                                    setIsUpgradeSelectionOpen(false);
                                                }}
                                            >
                                                <div className="mb-4">
                                                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 group-hover:border-sparta-gold/30 transition-colors">
                                                        {program.title.toLowerCase().includes('новичок') ? <Zap className="text-blue-400" /> :
                                                            program.title.toLowerCase().includes('профессионал') ? <Star className="text-sparta-gold" /> :
                                                                <Trophy className="text-red-500" />}
                                                    </div>
                                                </div>
                                                <h3 className="text-lg font-russo text-white mb-2">{program.title}</h3>
                                                <p className="text-xs text-white/40 mb-4 line-clamp-2">{program.features[0]}</p>
                                                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                                    <span className="text-sparta-gold font-bold">от {Math.min(...Object.values(program.prices as number[])).toLocaleString('ru-RU')} ₽</span>
                                                    <ArrowRight size={16} className="text-white/20 group-hover:text-sparta-gold transform group-hover:translate-x-1 transition-all" />
                                                </div>
                                            </GlassCard>
                                        ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Membership & Renewal Modal */}
            <MembershipModal
                isOpen={isMembershipOpen}
                onClose={() => setIsMembershipOpen(false)}
                program={selectedProgram}
                duration={membershipDuration}
                price={membershipPrice}
                mode={membershipMode}
            />
        </div >
    );
};

export default Dashboard;
