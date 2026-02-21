import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface UploadReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    seller: any;
    onSuccess: (message: string) => void;
}

export default function UploadReceiptModal({ isOpen, onClose, seller, onSuccess }: UploadReceiptModalProps) {
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState<number | "">("");
    const [period, setPeriod] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [availableBalance, setAvailableBalance] = useState<number | null>(null);
    const [isLoadingBalance, setIsLoadingBalance] = useState(false);

    // Buscar Saldo ao Abrir o Modal
    useEffect(() => {
        if (isOpen && seller) {
            fetchBalance(seller.id);
        } else {
            setAvailableBalance(null);
        }
    }, [isOpen, seller]);

    const fetchBalance = async (sellerId: string) => {
        setIsLoadingBalance(true);
        try {
            // 1. Busca Ganhos (Vendas Aprovadas)
            const { data: sales } = await supabase
                .from("sales")
                .select("brands(commission_value)")
                .eq("seller_id", sellerId)
                .eq("status", "approved");

            let earned = 0;
            if (sales) {
                sales.forEach((s: any) => earned += (s.brands?.commission_value || 0));
            }

            // 2. Busca Pagamentos Feitos
            const { data: payments } = await supabase
                .from("commission_payments")
                .select("amount")
                .eq("seller_id", sellerId);

            let paid = 0;
            if (payments) {
                payments.forEach((p: any) => paid += p.amount);
            }

            setAvailableBalance(earned - paid);
        } catch (error) {
            console.error("Erro ao buscar saldo:", error);
        } finally {
            setIsLoadingBalance(false);
        }
    };

    if (!isOpen || !seller) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || Number(amount) <= 0) return alert("Preecha um valor válido.");
        if (!period) return alert("Preencha o período de referência (Ex: Janeiro/2026).");
        if (!file) return alert("Selecione um arquivo de comprovante.");

        // Bloqueio de saldo insuficiente
        if (availableBalance !== null && Number(amount) > availableBalance) {
            return alert("O valor pago não pode ser maior que o Saldo Disponível do vendedor.");
        }

        setLoading(true);

        try {
            // 1. Upload file to storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${seller.id}-${Date.now()}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from("receipts")
                .upload(fileName, file);

            if (uploadError) throw new Error("Erro no upload do comprovante.");

            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from("receipts")
                .getPublicUrl(fileName);

            const receiptUrl = publicUrlData.publicUrl;

            // 2. Insert into commission_payments
            const { error: insertError } = await supabase
                .from("commission_payments")
                .insert({
                    seller_id: seller.id,
                    period_reference: period,
                    amount: Number(amount),
                    receipt_url: receiptUrl,
                });

            if (insertError) throw new Error("Erro ao salvar dados do pagamento.");

            onSuccess("Comprovante enviado com sucesso!");
            onClose();
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Ocorreu um erro ao processar o upload.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        {seller.profile_image_url ? (
                            <img src={seller.profile_image_url} alt={seller.full_name} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl text-gray-600 font-bold shrink-0">
                                {seller.full_name?.charAt(0) || "U"}
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-0.5">Registrar Pagamento</h2>
                            <p className="text-sm text-gray-500">Para {seller.full_name}</p>
                            {seller.pix_key && (
                                <p className="text-xs font-medium text-blue-600 mt-0.5">
                                    <span className="text-gray-400 font-normal">Chave PIX:</span> {seller.pix_key}
                                </p>
                            )}
                        </div>
                    </div>
                    {/* Exibição do Saldo */}
                    <div className="text-right bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Saldo Disponível</p>
                        {isLoadingBalance ? (
                            <div className="h-5 w-5 border-2 border-[#C00000]/30 border-t-[#C00000] rounded-full animate-spin mx-auto"></div>
                        ) : availableBalance !== null ? (
                            <p className={`text-sm font-black ${availableBalance > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                R$ {availableBalance.toFixed(2).replace(".", ",")}
                            </p>
                        ) : (
                            <p className="text-sm font-bold text-gray-400">---</p>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor Pago (R$)</label>
                        <input
                            required
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#C00000] focus:border-[#C00000]"
                            value={amount}
                            onChange={(e) => setAmount(parseFloat(e.target.value))}
                            placeholder="0,00"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Período de Referência</label>
                        <input
                            required
                            type="month"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#C00000] focus:border-[#C00000]"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                        />
                        <p className="text-xs text-gray-400 mt-1">Ex: 2026-01 referente as vendas de Janeiro.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Upload do Comprovante</label>
                        <input
                            required
                            type="file"
                            accept="image/*,application/pdf"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#C00000] focus:border-[#C00000] file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#C00000]/10 file:text-[#C00000] hover:file:bg-[#C00000]/20"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-[#C00000] text-white rounded-lg hover:bg-[#A00000] font-bold shadow flex items-center justify-center transition-colors"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                "Enviar Comprovante"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
