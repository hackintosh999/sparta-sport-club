import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden border border-white/10 shadow-2xl pointer-events-auto flex flex-col">
                            {/* Header */}
                            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#151515]">
                                <h2 className="font-russo text-2xl text-white">Условия использования</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-8 overflow-y-auto font-manrope text-white/80 space-y-6 custom-scrollbar">
                                <section>
                                    <h3 className="text-lg font-bold text-white mb-2">1. Общие положения</h3>
                                    <p>
                                        Посещая спортивный центр "SPARTA" и используя данный сайт, вы соглашаетесь с настоящими условиями.
                                        Мы оставляем за собой право изменять правила посещения и условия предоставления услуг в одностороннем порядке.
                                    </p>
                                </section>

                                <section>
                                    <h3 className="text-lg font-bold text-white mb-2">2. Абонементы и оплата</h3>
                                    <p>
                                        Все абонементы являются именными и не подлежат передаче третьим лицам.
                                        Оплата услуг производится в соответствии с действующим прайс-листом.
                                        Возврат средств осуществляется в соответствии с законодательством РФ.
                                    </p>
                                </section>

                                <section>
                                    <h3 className="text-lg font-bold text-white mb-2">3. Правила посещения</h3>
                                    <p>
                                        Посетители обязаны соблюдать технику безопасности, бережно относиться к оборудованию
                                        и уважать других гостей клуба. Наличие сменной обуви обязательно.
                                    </p>
                                </section>

                                <section>
                                    <h3 className="text-lg font-bold text-white mb-2">4. Ответственность</h3>
                                    <p>
                                        Администрация не несет ответственности за оставленные без присмотра ценные вещи
                                        (если они не сданы в сейф). Посетитель несет материальную ответственность за порчу имущества клуба.
                                    </p>
                                </section>

                                <section>
                                    <h3 className="text-lg font-bold text-white mb-2">5. Контакты</h3>
                                    <p>
                                        По всем вопросам вы можете связаться с нами по телефону: +7 (351) 230-12-69 или +7 (919) 339-33-99.
                                    </p>
                                </section>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-white/10 bg-[#151515] flex justify-end">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2 bg-sparta-gold text-black font-bold rounded-lg hover:bg-yellow-500 transition-colors"
                                >
                                    Понятно
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default TermsModal;
