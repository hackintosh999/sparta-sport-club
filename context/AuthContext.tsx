import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase';
import { doc, onSnapshot, updateDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
    user: User | null;
    userProfile: any | null;
    banDetails: any | null;
    loading: boolean;
    logout: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    banDetails: null,
    loading: true,
    logout: async () => { },
    signInWithGoogle: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [banDetails, setBanDetails] = useState<any | null>(null);
    const initialIpRef = React.useRef<string | null>(null);

    // Deterministic Browser Fingerprinting
    const getBrowserFingerprint = () => {
        try {
            const components = [
                navigator.userAgent, // Browser & OS
                navigator.language, // Language
                window.screen.colorDepth,
                window.screen.width + 'x' + window.screen.height, // Resolution
                new Date().getTimezoneOffset(), // Timezone
                (navigator as any).hardwareConcurrency || 'unknown', // CPU Cores
                (navigator as any).deviceMemory || 'unknown', // RAM (approx)
            ];

            const str = components.join('###');

            // Simple Hash Function (DJB2 variant)
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }

            return 'fp_' + Math.abs(hash).toString(36);
        } catch (e) {
            // Fallback for very old browsers or errors
            console.error("Fingerprint error", e);
            let fallback = localStorage.getItem('sparta_device_id');
            if (!fallback) {
                fallback = 'dev_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('sparta_device_id', fallback);
            }
            return fallback;
        }
    };

    useEffect(() => {
        let isMounted = true;
        let unsubscribeProfile: () => void;
        let unsubscribeAction: () => void;
        let unsubscribeDeviceBan: () => void;
        let unsubscribeIpBan: () => void;

        // 1. Global Ban Check (IP & Device) - Runs for EVERYONE (Auth or Guest)
        const setupGlobalBans = async () => {
            try {
                const deviceId = getBrowserFingerprint();
                const ipRes = await fetch('https://api.ipify.org?format=json').catch(() => ({ json: () => ({ ip: 'unknown' }) }));
                const { ip } = await ipRes.json();

                if (!isMounted) return; // Stop if unmounted during await

                // Set for polling reference
                initialIpRef.current = ip;

                // EMERGENCY WHITELIST
                const isImmune = (ip === '176.226.225.210');

                if (isImmune) {
                    console.log("🛡️ Admin Immunity Active: Whitelisted IP detected. Skipping ban checks.");
                    if (isMounted) setBanDetails(null);
                } else {
                    // Listen for Device Ban
                    unsubscribeDeviceBan = onSnapshot(doc(db, "banned_devices", deviceId), (docSnap) => {
                        if (!isMounted) return;
                        if (docSnap.exists()) {
                            const ban = docSnap.data();
                            if (!ban.expiresAt || ban.expiresAt > Date.now()) {
                                setBanDetails({ ...ban, type: 'device', isBanned: true });
                            }
                        }
                    });

                    // Listen for IP Ban
                    unsubscribeIpBan = onSnapshot(doc(db, "banned_ips", ip.replace(/\./g, '_')), (docSnap) => {
                        if (!isMounted) return;
                        if (docSnap.exists()) {
                            const ban = docSnap.data();
                            if (!ban.expiresAt || ban.expiresAt > Date.now()) {
                                setBanDetails({ ...ban, type: 'ip', isBanned: true });
                            }
                        }
                    });
                }

                // 2. Auth Logic
                unsubscribeAction = onAuthStateChanged(auth, async (authUser) => {
                    if (!isMounted) return;

                    // Ensure we clean up previous profile listener if auth state changes
                    if (unsubscribeProfile) unsubscribeProfile();

                    setUser(authUser);

                    if (authUser) {
                        // Update user info (Fire & Forget)
                        updateDoc(doc(db, "users", authUser.uid), {
                            lastDeviceId: deviceId,
                            lastIp: ip,
                            lastLogin: new Date()
                        }).catch(err => console.log("Error updating user info", err));

                        if (isImmune) {
                            unsubscribeProfile = onSnapshot(doc(db, "users", authUser.uid), (docSnap) => {
                                if (isMounted) setUserProfile(docSnap.data());
                            });
                        } else {
                            // Listen for Account Ban & Chain Banning
                            unsubscribeProfile = onSnapshot(doc(db, "users", authUser.uid), async (docSnap) => {
                                if (!isMounted) return;
                                const data = docSnap.data();
                                setUserProfile(data); // Always update profile

                                console.log("👤 Profile Update Detected:", data?.ban); // Debug Log

                                if (data?.ban?.isBanned) {
                                    if (data.ban.expiresAt && data.ban.expiresAt < Date.now()) {
                                        console.log("🕒 Ban Expired. Auto-unbanning locally.");
                                        updateDoc(doc(db, "users", authUser.uid), { ban: null });
                                    } else {
                                        console.log("🚫 Ban Detected via Snapshot. Applying...");
                                        setBanDetails(data.ban);

                                        // --- CHAIN BAN LOGIC ---
                                        // Only run chain ban if we have a valid ban on record
                                        const ipKey = ip.replace(/\./g, '_');
                                        const ipBanRef = doc(db, "banned_ips", ipKey);
                                        const ipBanSnap = await getDoc(ipBanRef);

                                        if (!ipBanSnap.exists() && ip !== 'unknown') {
                                            console.log("🛡️ Chain Ban: Blocking new IP", ip);
                                            await setDoc(ipBanRef, {
                                                ...data.ban,
                                                type: 'ip',
                                                reason: `[Auto-Ban] Access from banned account (${data.childName})`,
                                                originalUser: authUser.uid,
                                                detectedAt: Date.now()
                                            });
                                        }

                                        const deviceBanRef = doc(db, "banned_devices", deviceId);
                                        const deviceBanSnap = await getDoc(deviceBanRef);
                                        if (!deviceBanSnap.exists()) {
                                            console.log("🛡️ Chain Ban: Blocking new Device", deviceId);
                                            await setDoc(deviceBanRef, {
                                                ...data.ban,
                                                type: 'device',
                                                reason: `[Auto-Ban] Access from banned account (${data.childName})`,
                                                originalUser: authUser.uid,
                                                detectedAt: Date.now()
                                            });
                                        }
                                    }
                                } else {
                                    // If account is NOT banned, we must respect the Global Ban state
                                    console.log("✅ No Account Ban in Snapshot.");
                                    setBanDetails((current: any) => {
                                        if (current?.type === 'account') return null;
                                        return current;
                                    });
                                }
                            });
                        }
                    } else {
                        setUserProfile(null);
                        setBanDetails((current: any) => {
                            if (current?.type === 'account') return null;
                            return current;
                        });
                    }
                    if (isMounted) setLoading(false);
                });

            } catch (err) {
                console.error("Auth Init Error", err);
                if (isMounted) setLoading(false);
            }
        };

        setupGlobalBans();

        return () => {
            isMounted = false;
            if (unsubscribeAction) unsubscribeAction();
            if (unsubscribeProfile) unsubscribeProfile();
            if (unsubscribeDeviceBan) unsubscribeDeviceBan();
            if (unsubscribeIpBan) unsubscribeIpBan();
        };
    }, []);

    // 3. Auto-Check IP Change (Polling)
    // Goal:
    // - If Admin (Immune) changes IP to immune one -> Unban immediately.
    // - If Banned User changes IP -> Force Reload -> Chain Ban Logic bans the NEW IP.

    useEffect(() => {
        if (!banDetails?.isBanned) return;

        let interval = setInterval(async () => {
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json').catch(() => ({ json: () => ({ ip: 'unknown' }) }));
                const { ip: currentIp } = await ipRes.json();

                // Initialize ref if empty (should happen via setupGlobalBans, but purely purely safe)
                if (!initialIpRef.current) {
                    initialIpRef.current = currentIp;
                }

                // A. Check for Immunity FIRST (Fast Exit)
                if (currentIp === '176.226.225.210') {
                    console.log("🛡️ Immunity Detected during poll");
                    window.location.reload(); // Reload to activate immunity cleanly
                    return;
                }

                // B. Detect IP Change
                if (initialIpRef.current && currentIp !== initialIpRef.current) {
                    console.log("🛡️ IP Changed while banned. Force reloading to re-evaluate bans.");
                    // This reload is Critical.
                    // It forces the app to restart with the NEW IP.
                    // 1. If User is Logged In (Account Banned) -> App starts -> Sees Account Ban -> Bans NEW IP (Chain Ban).
                    // 2. If User is Guest (Device Banned) -> App starts -> Sees Device Ban -> Stays Banned.
                    window.location.reload();
                }

            } catch (e) {
                // ignore network errors
            }
        }, 3000); // Check every 3 seconds

        return () => clearInterval(interval);
    }, [banDetails]);


    const logout = () => signOut(auth);

    const signInWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Check if user document exists, if not create one
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                await setDoc(userDocRef, {
                    email: user.email,
                    role: 'user',
                    status: 'active',
                    parentName: user.displayName || '',
                    childName: '', // Will need to be filled later
                    childAge: 0,
                    parentPhone: '',
                    balance: 0,
                    bonuses: 0,
                    createdAt: serverTimestamp()
                });
            }
        } catch (error) {
            console.error("Google verify error", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, logout, signInWithGoogle, banDetails }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
