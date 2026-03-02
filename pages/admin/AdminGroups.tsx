import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp, getDocs, writeBatch, where, arrayUnion } from 'firebase/firestore';
import { Plus, Trash2, Edit2, X, Save, Search, Users, RefreshCw, Upload, Calendar, Check, AlertTriangle, Download, Trophy, ChevronRight, Clock } from 'lucide-react';
import { Group, User, AchievementDefinition, UserAchievement } from '../../types/shop';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Helper to calculate age from birthdate string (DD.MM.YYYY) or just use existing age
const calculateAge = (birthDateStr: string): number => {
    if (!birthDateStr) return 0;
    // Try to parse DD.MM.YYYY
    const parts = birthDateStr.split('.');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const birthDate = new Date(year, month, day);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }
    return 0;
};

const AdminGroups = () => {
    // --- State ---
    const [groups, setGroups] = useState<Group[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [coaches, setCoaches] = useState<any[]>([]);
    const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
    const [registry, setRegistry] = useState<any[]>([]); // New Registry State
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Editor State
    interface GroupFormData {
        name: string;
        minAge: string;
        maxAge: string;
        coachId: string;
        schedule: { day: string; time: string; activity: string }[];
    }

    const [formData, setFormData] = useState<GroupFormData>({
        name: '',
        minAge: '',
        maxAge: '',
        coachId: '',
        schedule: []
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    // Granting State
    const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [selectedAchievementId, setSelectedAchievementId] = useState<string>('');
    const [grantReason, setGrantReason] = useState('');

    // Add Student State
    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
    const [studentSearchQuery, setStudentSearchQuery] = useState('');

    // Remove Student State
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
    const [removeReason, setRemoveReason] = useState('');


    // Status Management State
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [statusData, setStatusData] = useState({
        status: 'normal' as 'normal' | 'cancelled' | 'substitute',
        message: '',
        substituteCoachId: ''
    });

    // --- Effects ---
    useEffect(() => {
        const unsubscribeGroups = onSnapshot(collection(db, "groups"), (snapshot) => {
            setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
        });

        const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
        });

        const unsubscribeCoaches = onSnapshot(collection(db, "coaches"), (snapshot) => {
            setCoaches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubscribeDefs = onSnapshot(collection(db, "achievement_definitions"), (snapshot) => {
            setDefinitions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AchievementDefinition)));
        });

        // Registry Listener
        const unsubscribeRegistry = onSnapshot(collection(db, "student_registry"), (snapshot) => {
            setRegistry(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        setLoading(false);

        return () => {
            unsubscribeGroups();
            unsubscribeUsers();
            unsubscribeCoaches();
            unsubscribeDefs();
            unsubscribeRegistry();
        };
    }, []);

    // --- Handlers ---

    const handleOpenStatusModal = (group: Group) => {
        setSelectedGroup(group);
        setStatusData({
            status: group.currentStatus || 'normal',
            message: group.statusMessage || '',
            substituteCoachId: group.substituteCoachId || ''
        });
        setIsStatusModalOpen(true);
    };

    const handleSaveStatus = async () => {
        if (!selectedGroup) return;
        setProcessing(true);
        try {
            const groupRef = doc(db, "groups", selectedGroup.id);
            await updateDoc(groupRef, {
                currentStatus: statusData.status,
                statusMessage: statusData.message,
                substituteCoachId: statusData.substituteCoachId,
                updatedAt: serverTimestamp()
            });

            setSuccessMessage("Статус группы обновлен");
            setIsStatusModalOpen(false);
        } catch (error: any) {
            setErrorMessage("Ошибка обновления статуса: " + error.message);
        } finally {
            setProcessing(false);
            setTimeout(() => setSuccessMessage(null), 2000);
        }
    };

    const handleOpenEditor = (group?: Group) => {
        if (group) {
            setEditingId(group.id);
            setFormData({
                name: group.name,
                minAge: group.ageRange.min.toString(),
                maxAge: group.ageRange.max.toString(),
                coachId: group.coachId,
                schedule: group.schedule || []
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                minAge: '',
                maxAge: '',
                coachId: '',
                schedule: []
            });
        }
        setIsEditorOpen(true);
        setErrorMessage(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const groupData = {
                name: formData.name,
                ageRange: {
                    min: parseInt(formData.minAge),
                    max: parseInt(formData.maxAge)
                },
                coachId: formData.coachId,
                schedule: formData.schedule,
                updatedAt: serverTimestamp()
            };

            if (editingId) {
                await updateDoc(doc(db, "groups", editingId), groupData);
                setSuccessMessage("Группа обновлена");
            } else {
                await addDoc(collection(db, "groups"), {
                    ...groupData,
                    createdAt: serverTimestamp()
                });
                setSuccessMessage("Группа создана");
            }
            setTimeout(() => {
                setIsEditorOpen(false);
                setSuccessMessage(null);
            }, 1000);
        } catch (error: any) {
            setErrorMessage(error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!editingId) return;
        if (!window.confirm("Удалить эту группу? \n\n⚠️ ВНИМАНИЕ: \n- Все ученики будут исключены из группы (статус 'Без группы').\n- Все ожидающие (импортированные) ученики будут УДАЛЕНЫ.")) return;

        setProcessing(true);
        try {
            const batch = writeBatch(db);

            // 1. Unlink Real Users
            const groupUsers = users.filter(u => u.groupId === editingId);
            groupUsers.forEach(u => {
                const userRef = doc(db, "users", u.id);
                batch.update(userRef, { groupId: null });
            });

            // 2. Delete Ghost Users (Registry)
            const ghostUsers = registry.filter(r => String(r.targetGroupId).trim() === editingId);
            ghostUsers.forEach(r => {
                const regRef = doc(db, "student_registry", r.id);
                batch.delete(regRef);
            });

            // 3. Delete Group
            const groupRef = doc(db, "groups", editingId);
            batch.delete(groupRef);

            await batch.commit();

            setSuccessMessage("Группа успешно удалена");
            setIsEditorOpen(false);
            setEditingId(null);

        } catch (error: any) {
            console.error("Delete Error:", error);
            setErrorMessage("Ошибка удаления: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    // Bulk Selection State
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

    const handleToggleSelectGroup = (groupId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedGroupIds(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    const handleBulkDeleteGroups = async () => {
        if (selectedGroupIds.length === 0) return;
        if (!window.confirm(`Удалить выбранные группы (${selectedGroupIds.length})? \n\n⚠️ ВНИМАНИЕ: \n- Все ученики в этих группах станут "Без группы".\n- Все импортированные (незарегистрированные) ученики будут УДАЛЕНЫ.`)) return;

        setProcessing(true);
        try {
            const batch = writeBatch(db);
            let deletedGroups = 0;

            for (const groupId of selectedGroupIds) {
                // 1. Unlink Real Users
                const groupUsers = users.filter(u => u.groupId === groupId);
                groupUsers.forEach(u => {
                    const userRef = doc(db, "users", u.id);
                    batch.update(userRef, { groupId: null });
                });

                // 2. Delete Ghost Users (Registry)
                const ghostUsers = registry.filter(r => String(r.targetGroupId).trim() === groupId);
                ghostUsers.forEach(r => {
                    const regRef = doc(db, "student_registry", r.id);
                    batch.delete(regRef);
                });

                // 3. Delete Group
                const groupRef = doc(db, "groups", groupId);
                batch.delete(groupRef);
                deletedGroups++;
            }

            await batch.commit();

            setSuccessMessage(`Успешно удалено групп: ${deletedGroups}`);
            setSelectedGroupIds([]);
        } catch (error: any) {
            console.error("Bulk Delete Error:", error);
            setErrorMessage("Ошибка массового удаления: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    // --- Logic: Auto-distribute ---
    const handleAutoDistribute = async () => {
        if (!window.confirm("Это действие распределит детей БЕЗ группы по подходящим возрастным группам. Продолжить?")) return;

        setProcessing(true);
        try {
            const batch = writeBatch(db);
            let updateCount = 0;

            users.forEach(user => {
                if (!user.groupId && user.childAge) {
                    // Find matching group
                    const group = groups.find(g =>
                        user.childAge >= g.ageRange.min &&
                        user.childAge <= g.ageRange.max
                    );
                    if (group) {
                        const userRef = doc(db, "users", user.id);
                        batch.update(userRef, { groupId: group.id });
                        updateCount++;
                    }
                }
            });

            if (updateCount > 0) {
                await batch.commit();
                setSuccessMessage(`Распределено детей: ${updateCount}`);
            } else {
                setSuccessMessage("Нет детей для распределения");
            }
        } catch (error: any) {
            setErrorMessage("Ошибка распределения: " + error.message);
        } finally {
            setProcessing(false);
            setTimeout(() => setSuccessMessage(null), 3000);
        }
    };

    // --- Logic: Smart Excel Import ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setProcessing(true);
        setSuccessMessage("Анализ файла...");
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

                const batch = writeBatch(db);
                let newGroupsCount = 0;
                let studentsProcessed = 0;

                // 1. Group data by "Group Name" to analyze structure
                const groupsMap: Record<string, {
                    coach: string,
                    students: any[],
                    ages: number[]
                }> = {};

                // Helper to normalize strings
                const normalize = (s: string) => s ? s.toString().trim() : '';

                for (const row of jsonData) {
                    const groupName = normalize(row['Группа'] || row['Group'] || 'Без группы');
                    const childName = normalize(row['Ребенок'] || row['ФИО'] || row['Name']);
                    const age = parseInt(row['Возраст'] || row['Age'] || '0');
                    const coachName = normalize(row['Тренер'] || row['Coach']);

                    if (!childName) continue;

                    if (!groupsMap[groupName]) {
                        groupsMap[groupName] = { coach: coachName, students: [], ages: [] };
                    }

                    groupsMap[groupName].students.push({ ...row, childName, age, coachName });
                    if (age > 0) groupsMap[groupName].ages.push(age);
                }

                // 2. Process Groups
                const groupNameIdMap: Record<string, string> = {};

                // Fetch existing groups to avoid duplicates
                const existingGroupsSnapshot = await getDocs(collection(db, "groups"));
                const existingGroups = existingGroupsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Group));

                for (const [name, data] of Object.entries(groupsMap)) {
                    if (name === 'Без группы') continue;

                    // Analyze Age Range
                    const minAge = data.ages.length ? Math.min(...data.ages) : 0;
                    const maxAge = data.ages.length ? Math.max(...data.ages) : 100;

                    // Check if group exists
                    let groupId = existingGroups.find(g => g.name.toLowerCase() === name.toLowerCase())?.id;

                    if (!groupId) {
                        // Create New Group
                        const newGroupRef = doc(collection(db, "groups"));
                        groupId = newGroupRef.id;

                        // Try to find coach ID by name (optional, or just save name)
                        // For now we assume we might not have the coach in DB, so we can't link ID securely without more info.
                        // We'll just save the name in a description or if we had a smart match.
                        // Let's assume we just create the group.

                        batch.set(newGroupRef, {
                            name: name,
                            ageRange: { min: minAge, max: maxAge },
                            coachId: 'pending', // TODO: Smart Coach Match
                            coachName: data.coach, // Extra field for CSV import compatibility
                            schedule: [],
                            createdAt: serverTimestamp(),
                            currentStatus: 'normal'
                        });
                        newGroupsCount++;
                    } else {
                        // Optional: Update existing group age range if needed?
                        // batch.update(doc(db, "groups", groupId), { 
                        //    ageRange: { min: Math.min(minAge, existingGroup.min), max: ... } 
                        // });
                    }
                    groupNameIdMap[name] = groupId;
                }

                // 3. Process Students & Registry
                for (const [groupName, data] of Object.entries(groupsMap)) {
                    const targetGroupId = groupNameIdMap[groupName]; // Might be undefined if 'Без группы'

                    for (const student of data.students) {
                        // Check if user exists in 'users' collection
                        // We match by childName + childAge (fuzzy) or ParentPhone
                        const existingUser = users.find(u =>
                            (u.childName && u.childName.toLowerCase() === student.childName.toLowerCase()) ||
                            (student.Telefon && u.parentPhone === student.Telefon)
                        );

                        if (existingUser) {
                            // Update existing user
                            const userRef = doc(db, "users", existingUser.id);
                            if (targetGroupId && existingUser.groupId !== targetGroupId) {
                                batch.update(userRef, { groupId: targetGroupId });
                            }
                        } else {
                            // Create Registry Entry (for Auto-Linking on Registration)
                            // Helper to normalize phone (digits only)
                            const normalizePhone = (p: string) => p ? p.replace(/\D/g, '') : '';
                            const cleanPhone = normalizePhone(student.Telefon || '');

                            const registryId = `reg_${student.childName.replace(/\s+/g, '_').toLowerCase()}_${student.age}`;
                            const registryRef = doc(db, "student_registry", registryId);

                            batch.set(registryRef, {
                                originalName: student.childName,
                                normalizedName: student.childName.toLowerCase().trim(),
                                age: student.age,
                                targetGroupId: targetGroupId || null,
                                assignedUid: null,
                                parentPhone: student.Telefon || '',
                                normalizedPhone: cleanPhone, // New field for robust matching
                                importedAt: serverTimestamp(),
                                coachName: student.coachName
                            });
                        }
                        studentsProcessed++;
                    }
                }

                await batch.commit();
                setSuccessMessage(`Импорт завершен! Создано групп: ${newGroupsCount}, Обработано учеников: ${studentsProcessed}`);

            } catch (error: any) {
                console.error("Import Error:", error);
                setErrorMessage("Ошибка импорта: " + error.message);
            } finally {
                setProcessing(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };



    // --- Logic: Granting ---
    const handleOpenGrantModal = (studentId: string) => {
        setSelectedStudentId(studentId);
        setSelectedAchievementId('');
        setGrantReason('');
        setIsGrantModalOpen(true);
    };

    const handleGrantAchievement = async () => {
        if (!selectedStudentId || !selectedAchievementId) return;

        setProcessing(true);
        try {
            const achievementDef = definitions.find(d => d.id === selectedAchievementId);
            if (!achievementDef) throw new Error("Achievement not found");

            const newAchievement: UserAchievement = {
                id: Date.now().toString(), // Simple ID generation
                definitionId: achievementDef.id,
                date: new Date().toISOString(),
                reason: grantReason,
                grantedBy: 'admin',
                isNew: true // Flag for badge
            };

            const batch = writeBatch(db);
            const userRef = doc(db, "users", selectedStudentId);

            // 1. Add Achievement
            batch.update(userRef, {
                achievements: arrayUnion(newAchievement)
            });

            // 2. Create Notification
            const student = users.find(u => u.id === selectedStudentId);

            if (student?.email) {
                const notifRef = doc(collection(db, "notifications"));
                batch.set(notifRef, {
                    userId: selectedStudentId,
                    email: student.email,
                    title: "Новая награда! 🏆",
                    message: `Вам выдана награда "${achievementDef.title}". Поздравляем!`,
                    isRead: false,
                    type: 'achievement',
                    link: '/dashboard?tab=achievements', // Deep link to achievements tab
                    createdAt: serverTimestamp()
                });
            }

            await batch.commit();

            setSuccessMessage(`Награда "${achievementDef.title}" выдана!`);
            setTimeout(() => {
                setIsGrantModalOpen(false);
                setSuccessMessage(null);
                setSelectedStudentId(null);
                setSelectedAchievementId('');
                setGrantReason('');
            }, 1000);
        } catch (error: any) {
            console.error("Grant Error:", error);
            setErrorMessage("Ошибка выдачи: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleAddStudentToGroup = async (userId: string) => {
        if (!editingId) return;
        setProcessing(true);
        try {
            await updateDoc(doc(db, "users", userId), { groupId: editingId });
            setSuccessMessage("Ученик добавлен в группу");
            setIsAddStudentModalOpen(false);
            setStudentSearchQuery('');
        } catch (error: any) {
            setErrorMessage("Ошибка добавления: " + error.message);
        } finally {
            setProcessing(false);
            setTimeout(() => setSuccessMessage(null), 2000);
        }
    };

    const handleRemoveUsers = async () => {
        if (selectedUserIds.length === 0) return;
        setProcessing(true);

        try {
            const batch = writeBatch(db);
            const currentGroup = groups.find(g => g.id === editingId);
            let removedCount = 0;

            selectedUserIds.forEach(userId => {
                const userObj = users.find(u => u.id === userId);

                if (userObj) {
                    // It's a Real User -> Remove from group
                    const userRef = doc(db, "users", userId);
                    batch.update(userRef, { groupId: null });

                    // Optional: Send Notification
                    if (removeReason.trim() && userObj.email) {
                        const notifRef = doc(collection(db, "notifications"));
                        batch.set(notifRef, {
                            userId: userId,
                            email: userObj.email,
                            title: "Исключение из группы",
                            message: `Вы были исключены из группы ${currentGroup?.name || 'Unknown'}. Причина: ${removeReason}`,
                            isRead: false,
                            type: 'alert',
                            createdAt: serverTimestamp()
                        });
                    }
                    removedCount++;
                } else {
                    // It's a Ghost User -> Delete from Registry
                    // We assume if it's not in 'users', it MUST be in registry (or is a ghost ID)
                    const regRef = doc(db, "student_registry", userId);
                    batch.delete(regRef);
                    removedCount++;
                }
            });

            await batch.commit();

            setSuccessMessage(`Исключено учеников: ${removedCount}`);
            setIsRemoveModalOpen(false);
            setRemoveReason('');
            setSelectedUserIds([]);
        } catch (error: any) {
            console.error("Remove Error:", error);
            setErrorMessage("Ошибка исключения: " + error.message);
        } finally {
            setProcessing(false);
        }
    };


    const daysOfWeek = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

    const updateSchedule = (index: number, field: string, value: string) => {
        const newSchedule = [...formData.schedule];
        newSchedule[index] = { ...newSchedule[index], [field]: value };
        setFormData({ ...formData, schedule: newSchedule });
    };

    const addScheduleItem = () => {
        setFormData({
            ...formData,
            schedule: [...formData.schedule, { day: 'Понедельник', time: '18:00', activity: 'Тренировка' }]
        });
    };

    const removeScheduleItem = (index: number) => {
        const newSchedule = formData.schedule.filter((_, i) => i !== index);
        setFormData({ ...formData, schedule: newSchedule });
    };

    if (loading) return <div className="text-white text-center p-10">Загрузка...</div>;

    return (
        <div className="flex h-screen bg-[#050505] overflow-hidden font-manrope relative">
            <div className={`flex-1 flex flex-col transition-all duration-500 ${(isEditorOpen) ? 'mr-[500px]' : ''}`}>
                {/* Header */}
                <div className="p-8 pb-4 border-b border-white/5 bg-[#050505]/95 backdrop-blur-xl z-20 sticky top-0">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-russo text-white mb-2">Группы</h1>
                            <p className="text-white/40 text-sm">Управление тренировочными группами</p>
                        </div>
                        <div className="flex gap-3">
                            {selectedGroupIds.length > 0 ? (
                                <button
                                    onClick={handleBulkDeleteGroups}
                                    disabled={processing}
                                    className="bg-red-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all flex items-center gap-2 animate-in fade-in slide-in-from-right-4"
                                >
                                    {processing ? <RefreshCw size={20} className="animate-spin" /> : <Trash2 size={20} />}
                                    Удалить выбранные ({selectedGroupIds.length})
                                </button>
                            ) : (
                                <>
                                    <label className="bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/30 cursor-pointer font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2">
                                        <Upload size={20} />
                                        Импорт Excel
                                        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
                                    </label>

                                    <button
                                        onClick={handleAutoDistribute}
                                        disabled={processing}
                                        className="bg-blue-600/20 text-blue-400 border border-blue-600/30 hover:bg-blue-600/30 font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2"
                                    >
                                        <RefreshCw size={20} className={processing ? "animate-spin" : ""} />
                                        Авто-распределение
                                    </button>

                                    <button
                                        onClick={() => handleOpenEditor()}
                                        className="bg-sparta-gold text-black font-bold py-3 px-6 rounded-xl hover:bg-[#ffd700] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center gap-2"
                                    >
                                        <Plus size={20} />
                                        Создать группу
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Groups Grid */}
                <div className="flex-1 overflow-y-auto p-8 overflow-x-hidden">
                    {successMessage && !isGrantModalOpen && (
                        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                            <Check size={20} />
                            {successMessage}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                        {groups.map(group => {
                            const groupUsers = users.filter(u => u.groupId === group.id);
                            // Relaxed verification: trim IDs and check if assignedUid is null/undefined or empty
                            const pendingStudents = registry.filter(r =>
                                String(r.targetGroupId).trim() === group.id &&
                                (!r.assignedUid || r.assignedUid === '')
                            );
                            const coach = coaches.find(c => c.id === group.coachId);

                            return (
                                <div
                                    key={group.id}
                                    onClick={() => handleOpenEditor(group)}
                                    className={`group relative bg-[#0F0F0F] hover:bg-[#141414] border rounded-3xl p-6 cursor-pointer transition-all duration-300 ${selectedGroupIds.includes(group.id)
                                        ? 'border-sparta-gold bg-[#141414] shadow-[0_0_20px_rgba(212,175,55,0.1)]'
                                        : editingId === group.id
                                            ? 'border-sparta-gold/50 ring-1 ring-sparta-gold/20'
                                            : 'border-white/5 hover:border-sparta-gold/30'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <div
                                                    onClick={(e) => handleToggleSelectGroup(group.id, e)}
                                                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedGroupIds.includes(group.id)
                                                        ? 'bg-sparta-gold border-sparta-gold text-black'
                                                        : 'border-white/20 hover:border-white/40 bg-transparent'
                                                        }`}
                                                >
                                                    {selectedGroupIds.includes(group.id) && <Check size={14} strokeWidth={4} />}
                                                </div>
                                                <h3 className="text-xl font-bold text-white group-hover:text-sparta-gold transition-colors font-russo">{group.name}</h3>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 pl-9">
                                                <span className="px-2 py-0.5 rounded bg-white/10 text-white/60 text-xs font-bold">
                                                    {group.ageRange.min}-{group.ageRange.max} лет
                                                </span>
                                                <div className="flex gap-1">
                                                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-bold flex items-center gap-1" title="Активные ученики">
                                                        <Users size={12} /> {groupUsers.length}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 ${pendingStudents.length > 0 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-white/5 text-white/20'}`} title="Ожидают регистрации">
                                                        <Calendar size={12} /> {pendingStudents.length}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                                            <ChevronRight size={16} className="text-white/20 group-hover:text-sparta-gold transition-colors" />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 mb-4 bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                                            {coach?.photoUrl ? (
                                                <img src={coach.photoUrl} alt={coach.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white/20"><Users size={16} /></div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-bold">{coach?.name || "Не назначен"}</p>
                                            <p className="text-white/40 text-xs">{coach?.role || "Тренер"}</p>
                                        </div>
                                    </div>

                                    {/* Schedule Preview */}
                                    <div className="space-y-1 mb-4">
                                        {group.schedule?.slice(0, 3).map((item, i) => (
                                            <div key={i} className="flex justify-between text-xs text-white/50 border-b border-white/5 pb-1 last:border-0">
                                                <span>{item.day}</span>
                                                <span className="text-sparta-gold">{item.time}</span>
                                            </div>
                                        ))}
                                        {group.schedule && group.schedule.length > 3 && (
                                            <p className="text-xs text-white/30 text-center pt-1">+ еще {group.schedule.length - 3}</p>
                                        )}
                                    </div>

                                    {/* Status Controls */}
                                    <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-white/30 font-bold uppercase tracking-wider mb-1">Статус</span>
                                            {group.currentStatus === 'cancelled' ? (
                                                <span className="text-red-500 font-bold flex items-center gap-1"><AlertTriangle size={14} /> Отмена</span>
                                            ) : group.currentStatus === 'substitute' ? (
                                                <span className="text-yellow-500 font-bold flex items-center gap-1"><RefreshCw size={14} /> Замена</span>
                                            ) : (
                                                <span className="text-green-500 font-bold flex items-center gap-1"><Check size={14} /> Активна</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenStatusModal(group); }}
                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg text-xs font-bold transition-colors"
                                        >
                                            Изменить
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Status Modal */}
                {isStatusModalOpen && selectedGroup && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsStatusModalOpen(false)}>
                        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white font-russo">Статус группы</h3>
                                <button onClick={() => setIsStatusModalOpen(false)} className="text-white/40 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-white/40 text-xs font-bold mb-2">Текущий статус</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={() => setStatusData({ ...statusData, status: 'normal' })}
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${statusData.status === 'normal'
                                                ? 'bg-green-500/20 border-green-500 text-green-500'
                                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                                }`}
                                        >
                                            <Check size={20} />
                                            <span className="text-xs font-bold">Активна</span>
                                        </button>
                                        <button
                                            onClick={() => setStatusData({ ...statusData, status: 'cancelled' })}
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${statusData.status === 'cancelled'
                                                ? 'bg-red-500/20 border-red-500 text-red-500'
                                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                                }`}
                                        >
                                            <AlertTriangle size={20} />
                                            <span className="text-xs font-bold">Отмена</span>
                                        </button>
                                        <button
                                            onClick={() => setStatusData({ ...statusData, status: 'substitute' })}
                                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${statusData.status === 'substitute'
                                                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500'
                                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                                }`}
                                        >
                                            <RefreshCw size={20} />
                                            <span className="text-xs font-bold">Замена</span>
                                        </button>
                                    </div>
                                </div>

                                {(statusData.status === 'cancelled' || statusData.status === 'substitute') && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-white/40 text-xs font-bold mb-2">
                                            {statusData.status === 'cancelled' ? 'Причина отмены' : 'Комментарий'}
                                        </label>
                                        <input
                                            type="text"
                                            value={statusData.message}
                                            onChange={(e) => setStatusData({ ...statusData, message: e.target.value })}
                                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold outline-none"
                                            placeholder="Например: Тренер заболел / Санитарный день"
                                        />
                                    </div>
                                )}

                                {statusData.status === 'substitute' && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-white/40 text-xs font-bold mb-2">Замена тренера</label>
                                        <select
                                            value={statusData.substituteCoachId}
                                            onChange={(e) => setStatusData({ ...statusData, substituteCoachId: e.target.value })}
                                            className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="">Выберите тренера...</option>
                                            {coaches.map(coach => (
                                                <option key={coach.id} value={coach.id}>{coach.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <button
                                    onClick={handleSaveStatus}
                                    className="w-full bg-sparta-gold text-black font-bold py-3 rounded-xl hover:bg-[#ffd700] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all mt-4"
                                >
                                    Сохранить
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Editor Sidebar */}
            < div className={`fixed inset-y-0 right-0 w-[500px] bg-[#111] border-l border-white/10 shadow-2xl transform transition-transform duration-500 ease-in-out z-50 flex flex-col ${isEditorOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#111]">
                    <h2 className="text-xl font-bold text-white font-russo">{editingId ? 'Редактировать группу' : 'Новая группа'}</h2>
                    <button onClick={() => setIsEditorOpen(false)} className="text-white/40 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-white/80 font-bold border-b border-white/10 pb-2">Основная информация</h3>
                        <div>
                            <label className="block text-white/40 text-xs font-bold mb-1">Название группы</label>
                            <input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold/50 outline-none"
                                placeholder="Например: Младшая лига"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-white/40 text-xs font-bold mb-1">Мин. возраст</label>
                                <input
                                    type="number"
                                    value={formData.minAge}
                                    onChange={e => setFormData({ ...formData, minAge: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold/50 outline-none"
                                    placeholder="3"
                                />
                            </div>
                            <div>
                                <label className="block text-white/40 text-xs font-bold mb-1">Макс. возраст</label>
                                <input
                                    type="number"
                                    value={formData.maxAge}
                                    onChange={e => setFormData({ ...formData, maxAge: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold/50 outline-none"
                                    placeholder="5"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-white/40 text-xs font-bold mb-1">Тренер</label>
                            <select
                                value={formData.coachId}
                                onChange={e => setFormData({ ...formData, coachId: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold/50 outline-none [&>option]:bg-black"
                            >
                                <option value="">Выберите тренера...</option>
                                {coaches.map(coach => (
                                    <option key={coach.id} value={coach.id}>{coach.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Schedule */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-2">
                            <h3 className="text-white/80 font-bold">Расписание</h3>
                            <button onClick={addScheduleItem} className="text-xs text-sparta-gold hover:text-white flex items-center gap-1">
                                <Plus size={14} /> Добавить
                            </button>
                        </div>
                        <div className="space-y-3">
                            {formData.schedule.map((item, index) => (
                                <div key={index} className="flex gap-2 items-start">
                                    <select
                                        value={item.day}
                                        onChange={e => updateSchedule(index, 'day', e.target.value)}
                                        className="w-32 bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-sparta-gold/50 outline-none [&>option]:bg-black"
                                    >
                                        {daysOfWeek.map(day => <option key={day} value={day}>{day}</option>)}
                                    </select>
                                    <input
                                        type="time"
                                        value={item.time}
                                        onChange={e => updateSchedule(index, 'time', e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-sparta-gold/50 outline-none"
                                    />
                                    <input
                                        type="text"
                                        value={item.activity}
                                        onChange={e => updateSchedule(index, 'activity', e.target.value)}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-sparta-gold/50 outline-none"
                                        placeholder="Занятие"
                                    />
                                    <button onClick={() => removeScheduleItem(index)} className="text-white/20 hover:text-red-500 p-2">
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                            {formData.schedule.length === 0 && (
                                <p className="text-white/30 text-sm italic text-center py-4">Расписание пусто</p>
                            )}
                        </div>
                    </div>

                    {/* Students List in Group (Read-only/Quick View) */}
                    {editingId && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                <div className="flex items-center gap-2">
                                    {/* Combine Users and Ghosts */}
                                    {(() => {
                                        const realUsers = users.filter(u => u.groupId === editingId);
                                        const ghostUsers = registry.filter(r => String(r.targetGroupId).trim() === editingId && (!r.assignedUid || r.assignedUid === ''));
                                        const allMembers = [
                                            ...realUsers.map(u => ({ ...u, _type: 'real' })),
                                            ...ghostUsers.map(r => ({
                                                id: r.id,
                                                childName: r.originalName,
                                                childAge: r.age,
                                                parentName: '', // User requested to hide phone/parent for ghosts
                                                _type: 'ghost'
                                            }))
                                        ];

                                        return (
                                            <>
                                                <h3 className="text-white/80 font-bold">Состав группы ({allMembers.length})</h3>
                                                {allMembers.length > 0 && (
                                                    <div className="flex items-center gap-2 ml-4 px-2 py-1 bg-white/5 rounded-lg">
                                                        <input
                                                            type="checkbox"
                                                            checked={allMembers.length > 0 && allMembers.every(u => selectedUserIds.includes(u.id))}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedUserIds(allMembers.map(u => u.id));
                                                                } else {
                                                                    setSelectedUserIds([]);
                                                                }
                                                            }}
                                                            className="w-4 h-4 rounded border-white/20 bg-black/50"
                                                        />
                                                        <span className="text-xs text-white/40">Все</span>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>

                                <div className="flex items-center gap-2">
                                    {selectedUserIds.length > 0 && (
                                        <button
                                            onClick={() => setIsRemoveModalOpen(true)}
                                            className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all animate-in fade-in"
                                        >
                                            <Trash2 size={14} /> Удалить ({selectedUserIds.length})
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsAddStudentModalOpen(true)}
                                        className="text-xs text-sparta-gold hover:text-white flex items-center gap-1 px-2 py-1"
                                    >
                                        <Plus size={14} /> Добавить
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {(() => {
                                    const realUsers = users.filter(u => u.groupId === editingId);
                                    const ghostUsers = registry.filter(r => String(r.targetGroupId).trim() === editingId && (!r.assignedUid || r.assignedUid === ''));
                                    const allMembers = [
                                        ...realUsers.map(u => ({ ...u, _type: 'real' })),
                                        ...ghostUsers.map(r => ({
                                            id: r.id,
                                            childName: r.originalName,
                                            childAge: r.age,
                                            parentName: '', // User requested to hide phone/parent for ghosts
                                            _type: 'ghost'
                                        }))
                                    ];

                                    if (allMembers.length === 0) {
                                        return <div className="text-center py-6 text-white/20 text-sm">В группе пока нет учеников</div>;
                                    }

                                    return allMembers.map(member => (
                                        <div key={member.id} className={`flex items-center justify-between bg-white/5 p-2 rounded-lg transition-colors ${selectedUserIds.includes(member.id) ? 'bg-sparta-gold/10 border border-sparta-gold/20' : ''}`}>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUserIds.includes(member.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedUserIds(prev => [...prev, member.id]);
                                                        } else {
                                                            setSelectedUserIds(prev => prev.filter(id => id !== member.id));
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-white/20 bg-black/50"
                                                />
                                                <div className={`${member._type === 'ghost' ? 'opacity-60' : ''}`}>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-white text-sm font-bold">{member.childName}</p>
                                                        {member._type === 'ghost' && (
                                                            <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 text-[10px] font-bold flex items-center gap-0.5" title="Ожидает регистрации">
                                                                <Clock size={10} /> Ожидает
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-white/40 text-xs">
                                                        {member.childAge} лет{member.parentName ? ` • ${member.parentName}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => member._type === 'real' && handleOpenGrantModal(member.id)}
                                                disabled={member._type === 'ghost'}
                                                className={`p-2 rounded-lg transition-colors ${member._type === 'ghost' ? 'text-white/10 cursor-not-allowed' : 'bg-sparta-gold/10 text-sparta-gold hover:bg-sparta-gold/20'}`}
                                                title={member._type === 'ghost' ? "Пользователь еще не зарегистрирован" : "Выдать награду"}
                                            >
                                                <Trophy size={16} />
                                            </button>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/10 bg-[#111] flex gap-4">
                    {editingId && (
                        <button
                            onClick={handleDeleteGroup}
                            disabled={processing}
                            className="bg-red-500/10 text-red-500 font-bold py-3 px-4 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                            title="Удалить группу"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={processing}
                        className="flex-1 bg-sparta-gold text-black font-bold py-3 px-6 rounded-xl hover:bg-[#ffd700] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {processing ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                        Сохранить
                    </button>
                </div>
            </div >

            {/* Grant Modal */}
            {
                isGrantModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        {/* ... (existing grant modal content) ... */}
                        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white font-russo">Выдать награду</h2>
                                <button onClick={() => setIsGrantModalOpen(false)} className="text-white/40 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-white/40 text-xs font-bold mb-1">Выберите награду</label>
                                    <select
                                        value={selectedAchievementId}
                                        onChange={(e) => setSelectedAchievementId(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold/50 outline-none"
                                    >
                                        <option value="">-- Не выбрано --</option>
                                        {definitions.map(def => (
                                            <option key={def.id} value={def.id}>{def.title} ({def.rarity})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-white/40 text-xs font-bold mb-1">Причина / Комментарий</label>
                                    <textarea
                                        value={grantReason}
                                        onChange={(e) => setGrantReason(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold/50 outline-none h-24 resize-none"
                                        placeholder="За отличную игру в защите..."
                                    />
                                </div>

                                {successMessage && isGrantModalOpen && (
                                    <div className="p-3 bg-green-500/10 text-green-400 rounded-lg text-sm flex items-center gap-2">
                                        <Check size={16} /> {successMessage}
                                    </div>
                                )}

                                <button
                                    onClick={handleGrantAchievement}
                                    disabled={processing || !selectedAchievementId}
                                    className="w-full bg-sparta-gold text-black font-bold py-3 px-6 rounded-xl hover:bg-[#ffd700] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                                >
                                    {processing ? <RefreshCw className="animate-spin" size={20} /> : <Trophy size={20} />}
                                    Наградить
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Add Student Modal */}
            {
                isAddStudentModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl h-[500px] flex flex-col">
                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <h2 className="text-xl font-bold text-white font-russo">Добавить ученика</h2>
                                <button onClick={() => setIsAddStudentModalOpen(false)} className="text-white/40 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="relative mb-4 shrink-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                                <input
                                    type="text"
                                    placeholder="Поиск по имени или фамилии..."
                                    value={studentSearchQuery}
                                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-sparta-gold outline-none"
                                    autoFocus
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {users
                                    .filter(u => !u.groupId || u.groupId !== editingId) // Not in this group
                                    .filter(u => u.childName?.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                                    .slice(0, 50)
                                    .map(user => (
                                        <div key={user.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors">
                                            <div>
                                                <p className="text-white font-bold">{user.childName}</p>
                                                <p className="text-white/40 text-xs">
                                                    {user.childAge} лет • {user.groupId ? 'В другой группе' : 'Без группы'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleAddStudentToGroup(user.id)}
                                                className="px-4 py-2 bg-sparta-gold/10 text-sparta-gold rounded-lg hover:bg-sparta-gold hover:text-black font-bold text-sm transition-all"
                                            >
                                                Добавить
                                            </button>
                                        </div>
                                    ))}
                                {users.filter(u => u.childName?.toLowerCase().includes(studentSearchQuery.toLowerCase())).length === 0 && (
                                    <p className="text-center text-white/30 py-8">Пользователи не найдены</p>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Grant Modal - omitted for brevity if unchanged */}

            {/* ... */}

            {/* Delete Group Confirmation Dialog could be added here if we wanted a custom one, but using window.confirm for now as per plan */}



            {/* Remove Confirmation Modal */}
            {
                isRemoveModalOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white font-russo">Исключение из группы</h2>
                                <button onClick={() => setIsRemoveModalOpen(false)} className="text-white/40 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-white text-sm">
                                        Вы собираетесь исключить <strong>{selectedUserIds.length}</strong> учеников из группы.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-white/40 text-xs font-bold mb-1">Причина исключения (опционально)</label>
                                    <textarea
                                        value={removeReason}
                                        onChange={(e) => setRemoveReason(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-red-500/50 outline-none h-24 resize-none"
                                        placeholder="Например: Нарушение дисциплины... (Оставьте пустым, если это ошибка)"
                                    />
                                    <p className="text-white/20 text-xs mt-1">
                                        ⚠️ Если указать причину, ученики получат уведомление. Если оставить пустым — исключение пройдет "тихо".
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setIsRemoveModalOpen(false)}
                                        className="flex-1 bg-white/5 text-white font-bold py-3 rounded-xl hover:bg-white/10 transition-colors"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        onClick={handleRemoveUsers}
                                        disabled={processing}
                                        className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all flex items-center justify-center gap-2"
                                    >
                                        {processing ? <RefreshCw className="animate-spin" size={20} /> : <Trash2 size={20} />}
                                        Исключить
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AdminGroups;
