import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, updateDoc, doc, deleteDoc, setDoc, query, where, writeBatch, getDoc, runTransaction, serverTimestamp, orderBy, onSnapshot, Timestamp, addDoc } from 'firebase/firestore';
import { Trash2, Shield, Search, ArrowUpDown, MoreVertical, Ban, CheckCircle, User, Smartphone, Globe, X, Trophy, CreditCard, Calendar, Zap, MinusCircle, PlusCircle, Pause, Play, FileText, Sparkles, ShoppingBag, Gift } from 'lucide-react';
import { format } from 'date-fns';

const AdminUsers = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const [groups, setGroups] = useState<any[]>([]);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [selectedUserForGroup, setSelectedUserForGroup] = useState<any>(null);
    const [selectedGroupId, setSelectedGroupId] = useState('');

    const [directions, setDirections] = useState<any[]>([]);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [selectedUserForSub, setSelectedUserForSub] = useState<any>(null);
    const [subPlanId, setSubPlanId] = useState('');
    const [subEndDate, setSubEndDate] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [adminNotes, setAdminNotes] = useState('');
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [userOrders, setUserOrders] = useState<any[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // Spins State
    const [isSpinsModalOpen, setIsSpinsModalOpen] = useState(false);
    const [selectedUserForSpins, setSelectedUserForSpins] = useState<any>(null);
    const [userSpins, setUserSpins] = useState<number>(0);
    const [savingSpins, setSavingSpins] = useState(false);

    // Shop Orders State
    const [isShopOrdersModalOpen, setIsShopOrdersModalOpen] = useState(false);
    const [selectedUserForShopOrders, setSelectedUserForShopOrders] = useState<any>(null);
    const [shopOrders, setShopOrders] = useState<any[]>([]);
    const [loadingShopOrders, setLoadingShopOrders] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchGroups();
        fetchDirections();
    }, []);

    const fetchDirections = async () => {
        try {
            const snapshot = await getDocs(collection(db, "directions"));
            setDirections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching directions:", error);
        }
    };

    const fetchUsers = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "users"));
            const loadedUsers = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(loadedUsers);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const toggleAdminRole = async (userId: string, currentRole: string) => {
        try {
            const newRole = currentRole === 'admin' ? 'user' : 'admin';
            await updateDoc(doc(db, "users", userId), { role: newRole });

            // Optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error("Error updating role:", error);
            alert("Не удалось изменить роль");
        }
    };

    const toggleSoftDelete = async (userId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'deleted' ? 'active' : 'deleted';
            await updateDoc(doc(db, "users", userId), { status: newStatus });

            // Optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Не удалось изменить статус");
        }
    };

    // Filter & Sort
    const filteredUsers = users
        .filter(user =>
        (user.childName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.parentPhone?.includes(searchTerm))
        )
        .sort((a, b) => {
            if (!sortConfig) return 0;
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            // Handle timestamps
            if (sortConfig.key === 'createdAt') {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    const fetchGroups = async () => {
        try {
            const snapshot = await getDocs(collection(db, "groups"));
            setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching groups:", error);
        }
    };

    const handleAssignGroup = async () => {
        if (!selectedUserForGroup || !selectedGroupId) return;
        try {
            await updateDoc(doc(db, "users", selectedUserForGroup.id), { groupId: selectedGroupId });
            setUsers(users.map(u => u.id === selectedUserForGroup.id ? { ...u, groupId: selectedGroupId } : u));
            setIsGroupModalOpen(false);
            setSelectedUserForGroup(null);
            setSelectedGroupId('');
        } catch (error) {
            console.error("Error assigning group:", error);
            alert("Ошибка при назначении группы");
        }
    };

    const openGroupModal = (user: any) => {
        setSelectedUserForGroup(user);
        setSelectedGroupId(user.groupId || '');
        setIsGroupModalOpen(true);
    };

    // ... (rest of search/sort logic)

    // Helper to get group name
    const getGroupName = (groupId: string) => {
        return groups.find(g => g.id === groupId)?.name || 'Неизвестная группа';
    };

    const [isBanModalOpen, setIsBanModalOpen] = useState(false);
    const [selectedUserForBan, setSelectedUserForBan] = useState<any>(null);
    const [banType, setBanType] = useState<'account' | 'device' | 'ip'>('account');
    const [banDuration, setBanDuration] = useState<number | null>(3 * 24 * 60 * 60 * 1000); // Default 3 days
    const [banReason, setBanReason] = useState('');

    const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState(false);
    const [selectedUserForAchievements, setSelectedUserForAchievements] = useState<any>(null);
    const [availableAchievements, setAvailableAchievements] = useState<any[]>([]);
    const [selectedAchievementId, setSelectedAchievementId] = useState<string>('');
    const [grantingAchievement, setGrantingAchievement] = useState(false);

    // Fetch master achievements list once
    useEffect(() => {
        const fetchAchievementsList = async () => {
            try {
                const snap = await getDocs(collection(db, 'achievements'));
                setAvailableAchievements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error(e);
            }
        };
        fetchAchievementsList();
    }, []);

    // ... existing sort/filter logic ...

    const handleBanUser = async () => {
        if (!selectedUserForBan) return;

        const now = Date.now();
        const expiresAt = banDuration ? now + banDuration : null;

        const banDetails = {
            isBanned: true,
            type: banType,
            reason: banReason,
            expiresAt: expiresAt,
            bannedAt: now,
            bannedBy: 'admin',
        };

        try {
            // 1. Update the user document (Account Ban always applies)
            await updateDoc(doc(db, "users", selectedUserForBan.id), { ban: banDetails });

            // 2. Handle Device Ban
            if (banType === 'device') {
                if (selectedUserForBan.lastDeviceId) {
                    await setDoc(doc(db, "banned_devices", selectedUserForBan.lastDeviceId), banDetails);
                } else {
                    alert("Внимание: У этого пользователя нет сохраненного ID устройства. Бан будет действовать только на аккаунт.");
                }
            }

            // 3. Handle IP Ban
            if (banType === 'ip') {
                if (selectedUserForBan.lastIp) {
                    await setDoc(doc(db, "banned_ips", selectedUserForBan.lastIp.replace(/\./g, '_')), banDetails);
                } else {
                    alert("Внимание: У этого пользователя нет сохраненного IP. Бан будет действовать только на аккаунт.");
                }
            }

            setUsers(users.map(u => u.id === selectedUserForBan.id ? { ...u, ban: banDetails } : u));
            setIsBanModalOpen(false);
            setBanReason('');
            setBanDuration(3 * 24 * 60 * 60 * 1000);
        } catch (error) {
            console.error("Error banning user:", error);
            alert("Ошибка при бане пользователя");
        }
    };

    const handleUnbanUser = async (user: any) => {
        if (!confirm(`Разблокировать пользователя ${user.childName}? Это также удалит связанные баны по IP и устройству.`)) return;

        try {
            const batch = writeBatch(db);

            // 1. Unban User Account
            const userRef = doc(db, "users", user.id);
            batch.update(userRef, { ban: null });

            // 2. Find and Delete associated IP Bans (Chain Banned)
            const ipBansQuery = query(collection(db, "banned_ips"), where("originalUser", "==", user.id));
            const ipBansSnap = await getDocs(ipBansQuery);
            ipBansSnap.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // 3. Find and Delete associated Device Bans (Chain Banned)
            const deviceBansQuery = query(collection(db, "banned_devices"), where("originalUser", "==", user.id));
            const deviceBansSnap = await getDocs(deviceBansQuery);
            deviceBansSnap.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // 4. Also try to delete by current known IP/Device (Legacy/Direct bans)
            if (user.lastIp) {
                const legacyIpRef = doc(db, "banned_ips", user.lastIp.replace(/\./g, '_'));
                batch.delete(legacyIpRef);
            }
            if (user.lastDeviceId) {
                const legacyDeviceRef = doc(db, "banned_devices", user.lastDeviceId);
                batch.delete(legacyDeviceRef);
            }

            await batch.commit();

            setUsers(users.map(u => u.id === user.id ? { ...u, ban: null } : u));
            alert(`Пользователь ${user.childName} разблокирован. Связанные ограничения (IP/Устройство) сняты.`);
        } catch (error) {
            console.error("Error unbanning user:", error);
            alert("Ошибка при разблокировке");
        }
    };

    // --- SPINS LOGIC ---
    const openSpinsModal = async (user: any) => {
        setSelectedUserForSpins(user);
        setUserSpins(0);
        setIsSpinsModalOpen(true);
        try {
            const snap = await getDoc(doc(db, "users", user.id, "private", "bonus_state"));
            if (snap.exists()) {
                setUserSpins(snap.data().spinsAvailable || 0);
            }
        } catch (e) {
            console.error("Error fetching spins:", e);
        }
    };

    const handleSaveSpins = async () => {
        if (!selectedUserForSpins) return;
        setSavingSpins(true);
        try {
            const ref = doc(db, "users", selectedUserForSpins.id, "private", "bonus_state");
            await setDoc(ref, {
                spinsAvailable: userSpins,
                // Don't overwrite history if it exists, use merge
            }, { merge: true });

            // Notification
            if (selectedUserForSpins.email) {
                await addDoc(collection(db, "notifications"), {
                    userId: selectedUserForSpins.id,
                    email: selectedUserForSpins.email,
                    title: "Вам начислены вращения! 🎁",
                    message: `Администратор начислил вам ${userSpins} вращений в Колесе Фортуны. Заходите крутить!`,
                    isRead: false,
                    type: 'system',
                    createdAt: serverTimestamp()
                });
            }

            setIsSpinsModalOpen(false);
            alert('Вращения успешно сохранены!');
        } catch (e) {
            console.error(e);
            alert("Ошибка при сохранении вращений");
        }
        setSavingSpins(false);
    };

    // --- SHOP ORDERS LOGIC ---
    const openShopOrdersModal = async (user: any) => {
        setSelectedUserForShopOrders(user);
        setIsShopOrdersModalOpen(true);
        setLoadingShopOrders(true);
        try {
            // Check both userId and email just in case
            const q = query(collection(db, "shop_orders"), where("buyerEmail", "==", user.email), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            setShopOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error("Error fetching shop orders:", e);
            // Fallback try without orderBy if index is missing
            try {
                const q2 = query(collection(db, "shop_orders"), where("buyerEmail", "==", user.email));
                const snap2 = await getDocs(q2);
                setShopOrders(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e2) {
                console.error("Fallback failed:", e2);
            }
        }
        setLoadingShopOrders(false);
    };

    // --- ACHIEVEMENTS LOGIC EXTENDED ---
    const handleGrantAchievement = async () => {
        if (!selectedUserForAchievements || !selectedAchievementId) return;
        setGrantingAchievement(true);
        try {
            const achToGrant = availableAchievements.find(a => a.id === selectedAchievementId);
            if (!achToGrant) throw new Error("Achievement not found");

            const newAchievement = {
                id: achToGrant.id,
                title: achToGrant.title,
                description: achToGrant.description || '',
                date: new Date().toISOString()
            };

            const userRef = doc(db, "users", selectedUserForAchievements.id);
            const currentAchievements = selectedUserForAchievements.achievements || [];

            // Check if already has it
            if (currentAchievements.some((a: any) => a.id === newAchievement.id)) {
                alert("У пользователя уже есть эта награда!");
                setGrantingAchievement(false);
                return;
            }

            const updatedAchievements = [...currentAchievements, newAchievement];

            await updateDoc(userRef, { achievements: updatedAchievements });

            // Send notification
            if (selectedUserForAchievements.email) {
                await addDoc(collection(db, "notifications"), {
                    userId: selectedUserForAchievements.id,
                    email: selectedUserForAchievements.email,
                    title: "Новая награда! 🏆",
                    message: `Поздравляем! Администратор выдал вам новую награду: ${newAchievement.title}`,
                    isRead: false,
                    type: 'system',
                    createdAt: serverTimestamp()
                });
            }

            const updatedUser = { ...selectedUserForAchievements, achievements: updatedAchievements };
            setSelectedUserForAchievements(updatedUser);
            setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
            setSelectedAchievementId('');
            alert('Награда успешно выдана!');

        } catch (error) {
            console.error("Error granting:", error);
            alert("Ошибка при выдаче награды");
        }
        setGrantingAchievement(false);
    };

    // Revocation Logic
    const [isRevokeConfirmOpen, setIsRevokeConfirmOpen] = useState(false);
    const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null);
    const [revokeReason, setRevokeReason] = useState('');

    const confirmRevoke = (achievementId: string) => {
        setRevokeTargetId(achievementId);
        setRevokeReason('');
        setIsRevokeConfirmOpen(true);
    };

    const handleRevokeAchievement = async () => {
        if (!selectedUserForAchievements || !revokeTargetId) return;

        try {
            const batch = writeBatch(db);
            const userRef = doc(db, "users", selectedUserForAchievements.id);

            const currentAchievements = selectedUserForAchievements.achievements || [];
            const updatedAchievements = currentAchievements.filter((a: any) => a.id !== revokeTargetId);

            batch.update(userRef, { achievements: updatedAchievements });

            // Notification
            if (revokeReason.trim() && selectedUserForAchievements.email) {
                const notifRef = doc(collection(db, "notifications"));
                batch.set(notifRef, {
                    userId: selectedUserForAchievements.id,
                    email: selectedUserForAchievements.email,
                    title: "Награда отозвана 😔",
                    message: `Ваша награда была отозвана администратором. Причина: ${revokeReason}`,
                    isRead: false,
                    type: 'alert',
                    createdAt: serverTimestamp()
                });
            }

            await batch.commit();

            // Update UI
            const updatedUser = { ...selectedUserForAchievements, achievements: updatedAchievements };
            setSelectedUserForAchievements(updatedUser);
            setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));

            setIsRevokeConfirmOpen(false);
            setRevokeTargetId(null);
            setRevokeReason('');

        } catch (error) {
            console.error("Error revoking:", error);
            alert("Ошибка при отзыве награды");
        }
    };

    const openBanModal = (user: any) => {
        setSelectedUserForBan(user);
        setIsBanModalOpen(true);
    };

    const openAchievementsModal = (user: any) => {
        setSelectedUserForAchievements(user);
        setIsAchievementsModalOpen(true);
    };


    const openSubModal = (user: any) => {
        setSelectedUserForSub(user);
        setSubPlanId(user.subscription?.planId || '');
        setSubEndDate(user.subscription?.expiresAt ? format(new Date(user.subscription.expiresAt.seconds * 1000), 'yyyy-MM-dd') : '');
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
        setAdminNotes(user.adminNotes || '');
        setIsSubModalOpen(true);
    };

    const handleUpdateSubscription = async () => {
        if (!selectedUserForSub) return;
        if (subPlanId && !subEndDate) {
            alert("Пожалуйста, выберите дату окончания подписки");
            return;
        }

        try {
            const plan = directions.find(d => d.id === subPlanId);
            const userRef = doc(db, "users", selectedUserForSub.id);

            const expiresAt = subEndDate ? Timestamp.fromDate(new Date(subEndDate)) : null;

            const subscription = subPlanId ? {
                planId: subPlanId,
                title: plan?.title || 'Индивидуальный план',
                expiresAt: expiresAt,
                status: 'active'
            } : null;

            await updateDoc(userRef, {
                subscription,
                firstName,
                lastName,
                adminNotes
            });

            setUsers(users.map(u => u.id === selectedUserForSub.id ? { ...u, subscription, firstName, lastName, adminNotes } : u));
            setIsSubModalOpen(false);
            alert("Данные пользователя обновлены");
        } catch (error) {
            console.error("Error updating sub:", error);
            alert("Ошибка при обновлении данных");
        }
    };

    const handleRevokeSubscription = async () => {
        if (!selectedUserForSub) return;
        if (!confirm('Аннулировать план пользователя?')) return;

        try {
            const userRef = doc(db, "users", selectedUserForSub.id);
            await updateDoc(userRef, {
                subscription: null
            });

            setUsers(users.map(u => u.id === selectedUserForSub.id ? { ...u, subscription: null } : u));
            setSelectedUserForSub({ ...selectedUserForSub, subscription: null });
            setSubPlanId('');
            setSubEndDate('');
            alert("Подписка отозвана");
        } catch (error) {
            console.error("Error revoking sub:", error);
            alert("Ошибка при отзыве подписки");
        }
    };

    const handleToggleFreeze = async () => {
        if (!selectedUserForSub || !selectedUserForSub.subscription) return;

        try {
            const userRef = doc(db, "users", selectedUserForSub.id);
            const newStatus = selectedUserForSub.subscription.status === 'frozen' ? 'active' : 'frozen';

            const updateData: any = { "subscription.status": newStatus };
            if (newStatus === 'frozen') {
                const frozenUntil = new Date();
                frozenUntil.setDate(frozenUntil.getDate() + 7); // Default 7 days
                updateData["subscription.frozenUntil"] = Timestamp.fromDate(frozenUntil);
            } else {
                updateData["subscription.frozenUntil"] = null;
            }

            await updateDoc(userRef, updateData);

            const updatedSub = {
                ...selectedUserForSub.subscription,
                status: newStatus,
                frozenUntil: newStatus === 'frozen' ? updateData["subscription.frozenUntil"] : null
            };

            setUsers(users.map(u => u.id === selectedUserForSub.id ? { ...u, subscription: updatedSub } : u));
            setSelectedUserForSub({ ...selectedUserForSub, subscription: updatedSub });
            alert(newStatus === 'frozen' ? "Абонемент заморожен на 7 дней" : "Абонемент разморожен");
        } catch (error) {
            console.error("Error toggling freeze:", error);
        }
    };

    const fetchUserOrders = async (user: any) => {
        setSelectedUserForSub(user);
        setLoadingOrders(true);
        setIsHistoryModalOpen(true);
        try {
            const q = query(collection(db, "orders"), where("email", "==", user.email), orderBy("date", "desc"));
            const snapshot = await getDocs(q);
            setUserOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoadingOrders(false);
        }
    };

    return (
        <div>
            {/* ... Header ... */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-russo text-white">Пользователи ({users.length})</h1>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <input
                        type="text"
                        placeholder="Поиск..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-[#1a1a1a] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-sparta-gold transition-colors"
                    />
                </div>
            </div>

            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-white/50 text-xs uppercase font-bold">
                            <tr>
                                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('childName')}>
                                    <div className="flex items-center gap-2">Имя / Ребенок <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('email')}>
                                    <div className="flex items-center gap-2">Контакт <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="p-4">Группа</th>
                                <th className="p-4 cursor-pointer hover:text-white" onClick={() => handleSort('createdAt')}>
                                    <div className="flex items-center gap-2">Регистрация <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="p-4 text-center">Абонемент</th>
                                <th className="p-4">Инфо</th>
                                <th className="p-4">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className={`hover:bg-white/5 transition-colors ${user.status === 'deleted' ? 'opacity-50' : ''}`}>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/30 text-xs font-bold ring-1 ring-white/10 group-hover:ring-sparta-gold/30 transition-all">
                                                {(user.firstName?.[0] || user.childName?.[0] || '?').toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white flex items-center gap-2">
                                                    {user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.displayName || '—'}
                                                    {user.childName && <span className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/40 font-medium">Ребенок: {user.childName}</span>}
                                                </div>
                                                <div className="text-[10px] text-white/30 flex items-center gap-1">
                                                    ID: <span className="font-mono">{user.id.slice(0, 8)}</span>
                                                    {user.childAge && <span>• {user.childAge} лет</span>}
                                                </div>
                                            </div>
                                            {user.ban?.isBanned && (
                                                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-500 text-[10px] uppercase font-bold border border-red-500/20">
                                                    BAN
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-white/70 text-sm font-medium">{user.email}</div>
                                        <div className="text-white/30 text-[11px] flex items-center gap-1 mt-0.5">
                                            <Smartphone size={10} /> {user.parentPhone || '—'}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {user.groupId ? (
                                            <button onClick={() => openGroupModal(user)} className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold hover:bg-blue-500/20">
                                                {getGroupName(user.groupId)}
                                            </button>
                                        ) : (
                                            <button onClick={() => openGroupModal(user)} className="px-3 py-1 rounded-full bg-white/5 text-white/30 text-xs font-bold hover:bg-sparta-gold/10 hover:text-sparta-gold border border-white/5">
                                                Назначить
                                            </button>
                                        )}
                                    </td>
                                    <td className="p-4 text-white/50 text-sm">
                                        {user.createdAt?.seconds ? format(new Date(user.createdAt.seconds * 1000), 'dd.MM.yyyy') : '—'}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col items-center gap-1">
                                            {user.subscription?.status === 'active' ? (
                                                <>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${(user.subscription?.expiresAt?.seconds && (user.subscription.expiresAt.seconds * 1000 - Date.now()) < 7 * 24 * 60 * 60 * 1000)
                                                        ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                        : 'bg-green-500/10 text-green-500 border-green-500/20'
                                                        }`}>
                                                        Активен
                                                    </span>
                                                    <span className="text-[9px] text-white/30 truncate max-w-[80px]" title={user.subscription.title}>
                                                        {user.subscription.title}
                                                    </span>
                                                </>
                                            ) : user.subscription?.status === 'frozen' ? (
                                                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-bold uppercase">
                                                    Заморожен
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/20 border border-white/5 text-[10px] font-bold uppercase">
                                                    Нет плана
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {user.role === 'admin' && (
                                                <span title="Администратор" className="text-sparta-gold"><Shield size={14} /></span>
                                            )}
                                            {user.achievements?.length > 0 && (
                                                <span title={`Наград: ${user.achievements.length}`} className="text-yellow-500 flex items-center gap-1 text-xs">
                                                    <Trophy size={14} /> {user.achievements.length}
                                                </span>
                                            )}
                                            {user.adminNotes && (
                                                <span title={`Заметка: ${user.adminNotes}`} className="text-blue-400"><FileText size={14} /></span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {/* Manage Subscription */}
                                            <button
                                                onClick={() => openSubModal(user)}
                                                title="Управление абонементом"
                                                className="p-2 rounded-lg text-white/30 hover:text-sparta-gold hover:bg-sparta-gold/10 transition-colors"
                                            >
                                                <Zap size={16} />
                                            </button>

                                            {/* Manage Achievements */}
                                            <button
                                                onClick={() => openAchievementsModal(user)}
                                                title="Управление наградами"
                                                className="p-2 rounded-lg text-white/30 hover:text-yellow-500 hover:bg-yellow-500/10 transition-colors"
                                            >
                                                <Trophy size={16} />
                                            </button>

                                            {/* Manage Spins */}
                                            <button
                                                onClick={() => openSpinsModal(user)}
                                                title="Колесо Фортуны (Вращения)"
                                                className="p-2 rounded-lg text-white/30 hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                                            >
                                                <Sparkles size={16} />
                                            </button>

                                            {/* Shop Orders */}
                                            <button
                                                onClick={() => openShopOrdersModal(user)}
                                                title="Заказы в магазине"
                                                className="p-2 rounded-lg text-white/30 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                                            >
                                                <ShoppingBag size={16} />
                                            </button>

                                            {/* Ban/Unban */}
                                            {user.ban?.isBanned ? (
                                                <button
                                                    onClick={() => handleUnbanUser(user)}
                                                    title="Разблокировать"
                                                    className="p-2 rounded-lg text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                                                >
                                                    <Ban size={16} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => openBanModal(user)}
                                                    title="Забанить"
                                                    className="p-2 rounded-lg text-white/30 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                                >
                                                    <Ban size={16} />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => toggleAdminRole(user.id, user.role)}
                                                title="Назначить/Снять Админа"
                                                className={`p-2 rounded-lg transition-colors ${user.role === 'admin' ? 'text-sparta-gold bg-sparta-gold/10' : 'text-white/30 hover:text-sparta-gold hover:bg-white/10'}`}
                                            >
                                                <Shield size={16} />
                                            </button>
                                            <button
                                                onClick={() => toggleSoftDelete(user.id, user.status)}
                                                title={user.status === 'deleted' ? "Восстановить" : "Удалить"}
                                                className={`p-2 rounded-lg transition-colors ${user.status === 'deleted' ? 'text-green-500 hover:bg-green-500/10' : 'text-white/30 hover:text-red-500 hover:bg-red-500/10'}`}
                                            >
                                                {user.status === 'deleted' ? <CheckCircle size={16} /> : <Trash2 size={16} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Achievement Managment Modal */}
            {isAchievementsModalOpen && selectedUserForAchievements && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg border border-white/10 p-6 max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white font-russo">Награды пользователя</h3>
                                <p className="text-white/50 text-xs">{selectedUserForAchievements.childName}</p>
                            </div>
                            <button onClick={() => setIsAchievementsModalOpen(false)} className="text-white/30 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Grant New Achievement Section */}
                        <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-3">
                            <label className="text-xs font-bold text-white/40 uppercase">Выдать награду вручную</label>
                            <div className="flex gap-2">
                                <select
                                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500"
                                    value={selectedAchievementId}
                                    onChange={(e) => setSelectedAchievementId(e.target.value)}
                                >
                                    <option value="">-- Выберите награду --</option>
                                    {availableAchievements.map(ach => (
                                        <option key={ach.id} value={ach.id}>{ach.title}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleGrantAchievement}
                                    disabled={!selectedAchievementId || grantingAchievement}
                                    className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-yellow-400 transition-colors disabled:opacity-50"
                                >
                                    {grantingAchievement ? 'Выдача...' : 'Выдать'}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {!selectedUserForAchievements.achievements?.length ? (
                                <div className="text-center text-white/30 py-8">Нет наград</div>
                            ) : (
                                selectedUserForAchievements.achievements.map((ach: any) => (
                                    <div key={ach.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-yellow-500">
                                                <Trophy size={18} />
                                            </div>
                                            <div>
                                                <div className="text-white font-bold text-sm">Награда</div>
                                                <div className="text-white/40 text-xs">{new Date(ach.date).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => confirmRevoke(ach.id)}
                                            className="p-2 text-white/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Забрать награду"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Ban Modal */}
            {isBanModalOpen && selectedUserForBan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg border border-white/10 p-6">
                        <h3 className="text-xl font-bold text-red-500 font-russo mb-2">Блокировка доступа</h3>
                        <p className="text-white/60 mb-6 text-sm">
                            Пользователь: <span className="text-white">{selectedUserForBan.childName}</span>
                        </p>

                        <div className="space-y-6">
                            {/* Ban Type */}
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-3">Тип блокировки (Способ)</label>
                                <div className="grid grid-cols-1 gap-2">
                                    <div
                                        onClick={() => setBanType('account')}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${banType === 'account' ? 'bg-red-500/10 border-red-500' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white/10 p-2 rounded-lg"><User size={16} /></div>
                                            <div>
                                                <div className="text-white font-bold text-sm">Бан Аккаунта (Обычный)</div>
                                                <div className="text-white/40 text-xs">Пользователь не сможет войти в этот аккаунт.</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        onClick={() => setBanType('device')}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${banType === 'device' ? 'bg-red-500/10 border-red-500' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white/10 p-2 rounded-lg"><Smartphone size={16} /></div>
                                            <div>
                                                <div className="text-white font-bold text-sm">Бан Устройства (По железу)</div>
                                                <div className="text-white/40 text-xs">Блокировка браузера. Создание нового аккаунта не поможет.</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        onClick={() => setBanType('ip')}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${banType === 'ip' ? 'bg-red-500/10 border-red-500' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white/10 p-2 rounded-lg"><Globe size={16} /></div>
                                            <div>
                                                <div className="text-white font-bold text-sm">Бан по IP (Вся сеть)</div>
                                                <div className="text-white/40 text-xs">Блокирует всех пользователей с этого Wi-Fi/Интернета.</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-2">Срок действия</label>
                                <select
                                    value={banDuration === null ? 'null' : banDuration}
                                    onChange={(e) => setBanDuration(e.target.value === 'null' ? null : Number(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500"
                                >
                                    <option value={1 * 24 * 60 * 60 * 1000}>24 часа (1 день)</option>
                                    <option value={3 * 24 * 60 * 60 * 1000}>3 дня</option>
                                    <option value={7 * 24 * 60 * 60 * 1000}>7 дней (Неделя)</option>
                                    <option value={30 * 24 * 60 * 60 * 1000}>30 дней (Месяц)</option>
                                    <option value="null">Навсегда (Бессрочно)</option>
                                </select>
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-2">Причина (Будет видна пользователю)</label>
                                <textarea
                                    value={banReason}
                                    onChange={(e) => setBanReason(e.target.value)}
                                    placeholder="Например: Нарушение правил общения..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 min-h-[100px]"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setIsBanModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleBanUser}
                                disabled={!banReason}
                                className="px-6 py-2 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ЗАБАНИТЬ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Group Assignment Modal (Existing) */}
            {isGroupModalOpen && selectedUserForGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md border border-white/10 p-6">
                        <h3 className="text-xl font-bold text-white font-russo mb-4">Назначение группы</h3>
                        <p className="text-white/60 mb-6 text-sm">
                            Ученик: <span className="text-white">{selectedUserForGroup.childName}</span>
                        </p>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-2">Выберите группу</label>
                                <select
                                    value={selectedGroupId}
                                    onChange={(e) => setSelectedGroupId(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sparta-gold"
                                >
                                    <option value="">-- Без группы --</option>
                                    {groups.map(group => (
                                        <option key={group.id} value={group.id}>
                                            {group.name} ({group.ageRange.min}-{group.ageRange.max} лет)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsGroupModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleAssignGroup}
                                className="px-6 py-2 rounded-xl bg-sparta-gold text-black font-bold hover:bg-yellow-500 transition-colors"
                            >
                                Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Subscription Management Modal */}
            {isSubModalOpen && selectedUserForSub && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1a1a1a] rounded-3xl w-full max-w-xl border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-8 py-6 bg-gradient-to-r from-sparta-gold/20 to-transparent border-b border-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-bold text-white font-russo">Управление аккаунтом</h3>
                                <p className="text-white/40 text-xs mt-1">{selectedUserForSub.firstName} {selectedUserForSub.lastName} • {selectedUserForSub.email}</p>
                            </div>
                            <button onClick={() => setIsSubModalOpen(false)} className="p-2 rounded-full hover:bg-white/5 text-white/30 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Personal Data Selection */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Имя (Взрослого)</label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sparta-gold transition-colors"
                                        placeholder="Имя"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Фамилия</label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sparta-gold transition-colors"
                                        placeholder="Фамилия"
                                    />
                                </div>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                    <div className="text-[10px] text-white/30 font-bold uppercase mb-1">Статус</div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${selectedUserForSub.subscription?.status === 'active' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-white/20'}`} />
                                        <span className="text-white font-bold">
                                            {selectedUserForSub.subscription ? (
                                                selectedUserForSub.subscription.status === 'active' ? 'Активен' :
                                                    `Заморожен ${selectedUserForSub.subscription.frozenUntil ? `до ${format(new Date(selectedUserForSub.subscription.frozenUntil.seconds * 1000), 'dd.MM.yyyy')}` : ''}`
                                            ) : 'Без плана'}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => fetchUserOrders(selectedUserForSub)}>
                                    <div className="text-[10px] text-white/30 font-bold uppercase mb-1">История заказов</div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-white font-bold flex items-center gap-2"><CreditCard size={14} className="text-sparta-gold" /> Посмотреть</span>
                                        <ArrowUpDown size={12} className="text-white/20" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Plan Selection */}
                                <div>
                                    <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Назначить план</label>
                                    <div className="relative">
                                        <Zap className="absolute left-3 top-1/2 -translate-y-1/2 text-sparta-gold" size={16} />
                                        <select
                                            value={subPlanId}
                                            onChange={(e) => setSubPlanId(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white appearance-none focus:outline-none focus:border-sparta-gold transition-colors"
                                        >
                                            <option value="">-- Удалить план --</option>
                                            {directions.map(dir => (
                                                <option key={dir.id} value={dir.id}>{dir.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Expiry Date */}
                                <div>
                                    <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Действует до</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                                        <input
                                            type="date"
                                            value={subEndDate}
                                            onChange={(e) => setSubEndDate(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-sparta-gold transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Admin Notes */}
                            <div>
                                <label className="block text-[10px] font-bold text-white/40 uppercase mb-2">Заметки администратора (Для внутреннего пользования)</label>
                                <textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Особенности клиента, история оплат и т.д."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sparta-gold min-h-[100px] text-sm"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-4 pt-4">
                                {selectedUserForSub.subscription && (
                                    <>
                                        <button
                                            onClick={handleToggleFreeze}
                                            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${selectedUserForSub.subscription.status === 'frozen'
                                                ? 'bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20'
                                                : 'bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20'
                                                }`}
                                        >
                                            {selectedUserForSub.subscription.status === 'frozen' ? <Play size={18} /> : <Pause size={18} />}
                                            {selectedUserForSub.subscription.status === 'frozen' ? 'Разморозить' : 'Заморозить'}
                                        </button>
                                        <button
                                            onClick={handleRevokeSubscription}
                                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 font-bold transition-all"
                                        >
                                            <MinusCircle size={18} /> Отозвать план
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 bg-white/5 flex gap-4">
                            <button
                                onClick={() => setIsSubModalOpen(false)}
                                className="flex-1 px-6 py-4 rounded-xl text-white/50 font-bold hover:bg-white/5 transition-all"
                            >
                                Закрыть
                            </button>
                            <button
                                onClick={handleUpdateSubscription}
                                className="flex-1 px-6 py-4 rounded-xl bg-sparta-gold text-black font-bold hover:bg-yellow-500 shadow-lg shadow-sparta-gold/20 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={20} /> СОХРАНИТЬ ИЗМЕНЕНИЯ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Order History Modal */}
            {isHistoryModalOpen && selectedUserForSub && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#1a1a1a] rounded-3xl w-full max-w-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div>
                                <h3 className="text-xl font-bold text-white font-russo">История платежей</h3>
                                <p className="text-white/40 text-xs">{selectedUserForSub.email}</p>
                            </div>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 rounded-full hover:bg-white/10 text-white/30 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                            {loadingOrders ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <div className="w-10 h-10 border-4 border-sparta-gold/30 border-t-sparta-gold rounded-full animate-spin" />
                                    <p className="text-white/20 text-sm font-bold animate-pulse">Загружаем чеки...</p>
                                </div>
                            ) : userOrders.length === 0 ? (
                                <div className="text-center py-20 text-white/20">
                                    <CreditCard size={48} className="mx-auto mb-4 opacity-10" />
                                    <p className="font-russo">История платежей пуста</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {userOrders.map((order) => (
                                        <div key={order.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-sparta-gold/30 hover:bg-white/10 transition-all group">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-sparta-gold/10 flex items-center justify-center text-sparta-gold">
                                                        <CreditCard size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-white font-bold group-hover:text-sparta-gold transition-colors">{order.planTitle}</div>
                                                        <div className="text-[10px] text-white/30 mt-0.5 uppercase tracking-wider">
                                                            {order.date?.seconds ? format(new Date(order.date.seconds * 1000), 'dd MMM yyyy, HH:mm') : '—'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-white font-russo text-lg">{order.price.toLocaleString()} ₽</div>
                                                    <div className="text-[10px] text-white/40 uppercase font-bold">{order.paymentMethod === 'tbank' ? 'Т-Банк' : 'Сбер'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Spins Modal */}
            {isSpinsModalOpen && selectedUserForSpins && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#1a1a1a] rounded-3xl w-full max-w-sm border border-white/10 overflow-hidden shadow-2xl p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-yellow-500 font-russo flex items-center gap-2">
                                    <Sparkles size={20} /> Вращения Колеса
                                </h3>
                                <p className="text-white/50 text-xs mt-1">{selectedUserForSpins.childName} ({selectedUserForSpins.email})</p>
                            </div>
                            <button onClick={() => setIsSpinsModalOpen(false)} className="text-white/30 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-2">Доступные вращения</label>
                                <div className="flex items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setUserSpins(Math.max(0, userSpins - 1))}
                                        className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10"
                                    >
                                        <MinusCircle size={20} />
                                    </button>
                                    <input
                                        type="number"
                                        value={userSpins}
                                        onChange={(e) => setUserSpins(Number(e.target.value) || 0)}
                                        className="flex-1 w-full bg-[#2a2a2a] border border-white/10 rounded-xl px-4 py-3 text-white text-center font-russo text-2xl focus:outline-none focus:border-yellow-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setUserSpins(userSpins + 1)}
                                        className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10"
                                    >
                                        <PlusCircle size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={() => setIsSpinsModalOpen(false)}
                                className="flex-1 py-3 rounded-xl text-white/50 hover:bg-white/5 font-bold transition-colors"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleSaveSpins}
                                disabled={savingSpins}
                                className="flex-1 py-3 rounded-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50"
                            >
                                {savingSpins ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Shop Orders Modal */}
            {isShopOrdersModalOpen && selectedUserForShopOrders && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#1a1a1a] rounded-3xl w-full max-w-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div>
                                <h3 className="text-xl font-bold text-white font-russo flex items-center gap-2">
                                    <ShoppingBag size={20} className="text-emerald-400" /> Заказы в Магазине
                                </h3>
                                <p className="text-white/40 text-xs mt-1">{selectedUserForShopOrders.childName} ({selectedUserForShopOrders.email})</p>
                            </div>
                            <button onClick={() => setIsShopOrdersModalOpen(false)} className="p-2 rounded-full hover:bg-white/10 text-white/30 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                            {loadingShopOrders ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                                    <p className="text-white/20 text-sm font-bold animate-pulse">Загружаем заказы...</p>
                                </div>
                            ) : shopOrders.length === 0 ? (
                                <div className="text-center py-20 text-white/20">
                                    <ShoppingBag size={48} className="mx-auto mb-4 opacity-10" />
                                    <p className="font-russo">Пользователь ничего не покупал</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {shopOrders.map((order) => (
                                        <div key={order.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col gap-4">
                                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                                <div className="text-xs text-white/40 uppercase tracking-widest font-bold">
                                                    Заказ #{order.id.slice(0, 6)}
                                                </div>
                                                <div className="flex gap-2 items-center">
                                                    <div className="text-xs text-white/30">
                                                        {order.createdAt?.seconds ? format(new Date(order.createdAt.seconds * 1000), 'dd MMM yyyy, HH:mm') : '—'}
                                                    </div>
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${order.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        order.status === 'cancelled' ? 'bg-red-500/20 text-red-500' :
                                                            'bg-yellow-500/20 text-yellow-500'
                                                        }`}>
                                                        {order.status === 'completed' ? 'ВЫДАН' : order.status === 'cancelled' ? 'ОТМЕНЕН' : 'ОЖИДАЕТ'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                {order.items?.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            {item.image && <img src={item.image} alt={item.name} className="w-8 h-8 rounded object-cover border border-white/10" />}
                                                            <div>
                                                                <div className="text-sm font-bold text-white">{item.name}</div>
                                                                <div className="text-xs text-white/40 uppercase">
                                                                    {item.color && <span className="mr-2">Цвет: {item.color}</span>}
                                                                    {item.size && <span>Размер: {item.size}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm font-bold text-white">{item.price} ₽ x {item.quantity}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex justify-between items-center pt-2">
                                                <div className="text-xs text-white/40">Итоговая сумма:</div>
                                                <div className="text-lg font-russo text-emerald-400">{order.totalAmount} ₽</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
