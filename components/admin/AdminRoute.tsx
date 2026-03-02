import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useAuth();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const location = useLocation();

    useEffect(() => {
        const checkAdmin = async () => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists() && userDoc.data()?.role === 'admin') {
                        setIsAdmin(true);
                    } else {
                        setIsAdmin(false);
                    }
                } catch (error) {
                    console.error("Error checking admin role:", error);
                    setIsAdmin(false);
                }
            } else if (!loading) {
                setIsAdmin(false);
            }
        };

        checkAdmin();
    }, [user, loading]);

    if (loading || isAdmin === null) {
        return <div className="min-h-screen bg-[#020202] text-white flex items-center justify-center">Загрузка прав доступа...</div>;
    }

    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    if (!isAdmin) {
        return <div className="min-h-screen bg-[#020202] text-white flex flex-col items-center justify-center gap-4">
            <h1 className="text-3xl font-russo text-red-500">Доступ запрещен</h1>
            <p className="text-white/50">У вас нет прав администратора.</p>
            <a href="/dashboard" className="px-6 py-2 bg-sparta-gold text-black rounded-lg font-bold">Вернуться в кабинет</a>
        </div>;
    }

    return <>{children}</>;
};

export default AdminRoute;
