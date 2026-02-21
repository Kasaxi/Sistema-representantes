

interface ViewReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: {
        amount: number;
        created_at: string;
        period_reference: string;
        receipt_url: string;
        profiles?: { full_name: string };
    } | null;
}

export default function ViewReceiptModal({ isOpen, onClose, payment }: ViewReceiptModalProps) {
    if (!isOpen || !payment) return null;

    const formatBRL = (val: number) => `R$ ${val.toFixed(2).replace(".", ",")}`;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Comprovante de Pagamento</h2>
                        <p className="text-sm text-gray-500 font-medium">Detalhes da transação realizada</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-900"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Info Section */}
                        <div className="space-y-6">
                            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100/50">
                                <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Valor Pago</label>
                                <p className="text-3xl font-black text-blue-600 tracking-tighter">{formatBRL(payment.amount)}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Data do Pagamento</label>
                                    <p className="font-bold text-gray-900">
                                        {new Date(payment.created_at).toLocaleString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        }).replace(',', ' às')}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Referência</label>
                                    <p className="font-bold text-gray-900">{payment.period_reference}</p>
                                </div>
                            </div>

                            {payment.profiles && (
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Vendedor</label>
                                    <p className="font-bold text-gray-900">{payment.profiles.full_name}</p>
                                </div>
                            )}

                            <div className="pt-4">
                                <a
                                    href={payment.receipt_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors group"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 14 14" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 1L13 4M13 4L10 7M13 4H1M1 13H13" />
                                    </svg>
                                    Abrir original em nova aba
                                </a>
                            </div>
                        </div>

                        {/* Image Section */}
                        <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden flex items-center justify-center min-h-[300px] group relative">
                            {payment.receipt_url.toLowerCase().endsWith('.pdf') ? (
                                <div className="text-center p-8">
                                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-sm font-bold text-gray-500">Este é um arquivo PDF</p>
                                    <a
                                        href={payment.receipt_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-4 inline-block px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-colors"
                                    >
                                        Baixar / Visualizar PDF
                                    </a>
                                </div>
                            ) : (
                                <img
                                    src={payment.receipt_url}
                                    alt="Comprovante"
                                    className="max-h-full max-w-full object-contain cursor-zoom-in hover:scale-105 transition-transform duration-500"
                                    onClick={() => window.open(payment.receipt_url, '_blank')}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 bg-gray-50/50 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black shadow-lg shadow-gray-200 transition-all active:scale-95"
                    >
                        Fechar Visualização
                    </button>
                </div>
            </div>
        </div>
    );
}
