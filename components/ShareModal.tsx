import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Mail, Smartphone } from 'lucide-react';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    title: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, url, title }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Copy failed", err);
        }
    };

    const shareLinks = [
        {
            id: 'telegram',
            name: 'Telegram',
            color: 'bg-[#229ED9]',
            icon: (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0Zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635Z" />
                </svg>
            ),
            link: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
        },
        {
            id: 'whatsapp',
            name: 'WhatsApp',
            color: 'bg-[#25D366]',
            icon: (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                </svg>
            ),
            link: `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`
        },
        {
            id: 'vk',
            name: 'ВКонтакте',
            color: 'bg-[#0077FF]',
            icon: (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M15.073 2H8.937C3.332 2 2 3.333 2 8.937v6.126C2 20.667 3.332 22 8.937 22h6.136C20.668 22 22 20.667 22 15.063V8.937C22 3.333 20.668 2 15.073 2Zm3.475 14.584c-.218.328-.888.665-1.996.685h-.024c-.588 0-.895-.295-1.325-.566-.465-.291-1.097-.768-1.597.051-.545.89-.982 1.2-2.14 1.2-2.455 0-4.665-2.222-6.19-5.787-1.926-4.321-.497-6.225 1.947-6.225.568 0 1.258.077 1.488.163.486.182.525.688.525.688s.169 2.028.708 3.284c.594 1.385 1.056 1.493 1.373 1.32.748-.41.44-3.32-.486-4.095-.316-.264-.092-.816.598-.992.427-.109 1.15-.205 1.97-.132.705.063.856.28.986.966.19 1.01.077 2.376.549 2.768.172.143.435.034 1.166-1.127.46-.72.673-1.638.673-1.638s.198-.535.845-.59c.563-.047 1.285-.04 1.285-.04s.924-.09 1.075.602c.11.503-.68 2.053-1.603 3.366-.827 1.178-.962 1.246-.036 2.094 1.093 1.002 1.33 1.635 1.468 1.967.14.333-.11.838-.76.84Z" />
                </svg>
            ),
            link: `https://vk.com/share.php?url=${encodeURIComponent(url)}`
        },
        {
            id: 'ok',
            name: 'Одноклассники',
            color: 'bg-[#EE8208]',
            icon: (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M12 12.7c-1.3 0-2.6 0-4-.9-.9-1-1.3-2.1-1-3.2.3-1.3 1.8-2 2.8-2 1.5 0 2.1 1 2.2 1.2.2-.3.7-1.2 2.2-1.2 1 0 2.5.7 2.8 2 .2 1-.1 2.1-1 3.2-1.4.9-3.2 1-3.9 1-.1 0-.1 0-.2-.1h.2zm0-7.8c1.7 0 3 1.2 3 3 0 1.8-1.4 2.9-3 2.9-1.7 0-3-1.2-3-2.9 0-1.8 1.3-3 3-3zm-5.1 18c.6 0 1.1-.1 1.6-.4.3-.2.4-.5.3-.8-.2-.3-.5-.4-.8-.3-.3.2-.7.3-1.1.3-1.4 0-2.5-1.1-2.5-2.5 0-.2 0-.3-.1-.5-.1-.3-.5-.5-.8-.4-.3.1-.5.5-.4.8.1.2.1.5.1.7 0 1.7 1.4 3 3 3.1.2.1.4 0 .7 0zM12 14.8c4.2 0 6.6 2.3 6.6 5.2h-2c0-1.8-1.8-3.2-4.6-3.2-2.8 0-4.6 1.4-4.6 3.2h-2c0-2.9 2.4-5.2 6.6-5.2z" />
                </svg>
            ),
            link: `https://connect.ok.ru/dk?st.cmd=WidgetSharePreview&st.shareUrl=${encodeURIComponent(url)}`
        }
    ];

    const emailProviders = [
        {
            id: 'gmail',
            name: 'Gmail',
            link: `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
            color: 'text-red-500'
        },
        {
            id: 'mailru',
            name: 'Mail.ru',
            link: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`, // Mail.ru handles mailto well usually or web intent difficult
            color: 'text-blue-600'
        },
        {
            id: 'yandex',
            name: 'Яндекс',
            link: `https://mail.yandex.ru/compose?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
            color: 'text-red-600'
        }
    ];


    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-[#121212] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl relative"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-russo text-white">Поделиться</h3>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Copy Link Section */}
                        <div className="mb-8">
                            <p className="text-xs text-white/40 mb-2 font-bold uppercase tracking-wider">Ссылка на новость</p>
                            <div className="flex items-center gap-2 bg-white/5 p-2 pr-2.5 rounded-xl border border-white/10">
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm text-white/90 truncate px-2">{url}</p>
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className={`p-2 rounded-lg transition-all ${copied ? 'bg-green-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                >
                                    {copied ? <Check size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Socials Grid */}
                        <div className="grid grid-cols-4 gap-4 mb-8">
                            {shareLinks.map(social => (
                                <a
                                    key={social.id}
                                    href={social.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center gap-2 group cursor-pointer"
                                >
                                    <div className={`w-14 h-14 ${social.color} rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 group-hover:shadow-xl`}>
                                        {social.icon}
                                    </div>
                                    <span className="text-xs text-white/50 group-hover:text-white transition-colors font-medium">
                                        {social.name}
                                    </span>
                                </a>
                            ))}
                        </div>

                        {/* Email Section */}
                        <div>
                            <p className="text-xs text-white/40 mb-3 font-bold uppercase tracking-wider flex items-center gap-2">
                                <Mail size={12} />
                                Отправить на почту
                            </p>
                            <div className="grid grid-cols-3 gap-3">
                                {emailProviders.map(provider => (
                                    <a
                                        key={provider.id}
                                        href={provider.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all"
                                    >
                                        <span className={`text-sm font-bold ${provider.color}`}>{provider.name}</span>
                                    </a>
                                ))}
                            </div>
                        </div>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ShareModal;
