import React from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, CheckCircle2, ShieldCheck, Calendar, CreditCard, User, Hash, ArrowRight } from 'lucide-react';
import { Button } from '../UIComponents';

interface MembershipReceiptProps {
    order: {
        id: string;
        date: any;
        planTitle: string;
        price: number;
        duration: number;
        paymentMethod: string;
        userName: string;
        email: string;
    };
    onClose: () => void;
}

const MembershipReceipt: React.FC<MembershipReceiptProps> = ({ order, onClose }) => {
    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Неизвестно';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleDownload = () => {
        window.print(); // Simple way to "download" as PDF via print dialog
    };

    return (
        <div className="bg-[#0a0a0a] rounded-3xl overflow-hidden border border-white/10 shadow-2xl max-w-lg w-full font-manrope">
            {/* Branded Header */}
            <div className="bg-sparta-gold p-8 text-black text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -mr-16 -mt-16" />
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative z-10 flex flex-col items-center"
                >
                    <h1 className="font-russo text-3xl mb-1 tracking-tighter">SPARTA</h1>
                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-60">Sports Center Receipt</p>
                    <div className="mt-4 bg-black/10 p-2 rounded-full">
                        <CheckCircle2 size={32} />
                    </div>
                </motion.div>
            </div>

            {/* Receipt Body */}
            <div className="p-8 print:p-4">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Номер заказа</p>
                        <p className="text-white font-mono text-sm">#{order.id.slice(0, 12).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Дата</p>
                        <p className="text-white text-sm">{formatDate(order.date)}</p>
                    </div>
                </div>

                <div className="space-y-6 mb-10">
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="w-12 h-12 bg-sparta-gold/10 rounded-xl flex items-center justify-center text-sparta-gold shrink-0">
                            <User size={20} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Покупатель</p>
                            <p className="text-white font-bold truncate">{order.userName}</p>
                            <p className="text-white/30 text-xs truncate">{order.email}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="w-12 h-12 bg-sparta-gold/10 rounded-xl flex items-center justify-center text-sparta-gold shrink-0">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Тарифный план</p>
                            <p className="text-white font-bold">{order.planTitle}</p>
                            <p className="text-white/30 text-xs">{order.duration} мес. подписки</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="w-12 h-12 bg-sparta-gold/10 rounded-xl flex items-center justify-center text-sparta-gold shrink-0">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <p className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Оплата</p>
                            <p className="text-white font-bold">{order.paymentMethod === 'tbank' ? 'Т-Банк (Тинькофф)' : 'Сбербанк'}</p>
                            <p className="text-white/30 text-xs">Статус: <span className="text-green-500 font-bold">Оплачено</span></p>
                        </div>
                    </div>
                </div>

                {/* Total */}
                <div className="pt-6 border-t border-white/10 flex justify-between items-end mb-10">
                    <div>
                        <p className="text-white/40 text-xs uppercase tracking-widest">ИТОГО К ОПЛАТЕ</p>
                        <p className="text-white/20 text-[10px]">НДС включен (20%)</p>
                    </div>
                    <p className="text-3xl font-russo text-sparta-gold">{order.price.toLocaleString('ru-RU')} ₽</p>
                </div>

                {/* Actions */}
                <div className="flex gap-4 print:hidden">
                    <Button onClick={handleDownload} variant="outline" className="flex-1 gap-2">
                        <Download size={18} />
                        Скачать PDF
                    </Button>
                    <Button onClick={onClose} className="flex-1">
                        Закрыть
                    </Button>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-white/[0.02] p-6 text-center border-t border-white/5">
                <div className="flex items-center justify-center gap-2 text-white/30 text-[10px] uppercase tracking-widest">
                    <ShieldCheck size={14} className="text-sparta-gold" />
                    <span>Sparta Sports Center - Certified Secure Transaction</span>
                </div>
            </div>
        </div>
    );
};

export default MembershipReceipt;
