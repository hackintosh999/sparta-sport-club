import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Trash2, Smartphone, Globe, Clock, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

const AdminBans = () => {
    const [bannedIps, setBannedIps] = useState<any[]>([]);
    const [bannedDevices, setBannedDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBans();
    }, []);

    const fetchBans = async () => {
        try {
            const ipsSnap = await getDocs(collection(db, "banned_ips"));
            const devicesSnap = await getDocs(collection(db, "banned_devices"));

            setBannedIps(ipsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setBannedDevices(devicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching bans:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUnbanIp = async (ipId: string) => {
        if (!confirm(`Разбанить IP ${ipId}?`)) return;
        try {
            await deleteDoc(doc(db, "banned_ips", ipId));
            setBannedIps(prev => prev.filter(item => item.id !== ipId));
        } catch (error) {
            console.error("Error unbanning IP:", error);
        }
    };

    const handleUnbanDevice = async (deviceId: string) => {
        if (!confirm("Разбанить это устройство?")) return;
        try {
            await deleteDoc(doc(db, "banned_devices", deviceId));
            setBannedDevices(prev => prev.filter(item => item.id !== deviceId));
        } catch (error) {
            console.error("Error unbanning device:", error);
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-russo text-white mb-8">Управление черным списком</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* IP Bans */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Globe className="text-blue-500" />
                        Забаненные IP ({bannedIps.length})
                    </h2>
                    <div className="bg-[#1a1a1a] rounded-xl border border-white/5 overflow-hidden">
                        {bannedIps.length === 0 ? (
                            <div className="p-8 text-center text-white/30">Список пуст</div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {bannedIps.map(ban => (
                                    <div key={ban.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                        <div>
                                            <div className="font-mono text-sparta-gold font-bold">{ban.id.replace(/_/g, '.')}</div>
                                            <div className="text-xs text-white/40 mt-1">{ban.reason}</div>
                                            <div className="flex items-center gap-2 text-[10px] text-white/30 mt-1">
                                                <Clock size={10} />
                                                {ban.bannedAt ? format(ban.bannedAt, 'dd.MM.yyyy HH:mm') : '—'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleUnbanIp(ban.id)}
                                            className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                                            title="Удалить бан"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Device Bans */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Smartphone className="text-purple-500" />
                        Забаненные устройства ({bannedDevices.length})
                    </h2>
                    <div className="bg-[#1a1a1a] rounded-xl border border-white/5 overflow-hidden">
                        {bannedDevices.length === 0 ? (
                            <div className="p-8 text-center text-white/30">Список пуст</div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {bannedDevices.map(ban => (
                                    <div key={ban.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                        <div>
                                            <div className="font-mono text-purple-400 font-bold text-xs" title={ban.id}>
                                                {ban.id.substring(0, 20)}...
                                            </div>
                                            <div className="text-xs text-white/40 mt-1">{ban.reason}</div>
                                            <div className="flex items-center gap-2 text-[10px] text-white/30 mt-1">
                                                <Clock size={10} />
                                                {ban.bannedAt ? format(ban.bannedAt, 'dd.MM.yyyy HH:mm') : '—'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleUnbanDevice(ban.id)}
                                            className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                                            title="Удалить бан"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminBans;
