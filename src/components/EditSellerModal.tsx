"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const formatCPF = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

const formatCNPJ = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

interface EditSellerModalProps {
    isOpen: boolean;
    onClose: () => void;
    seller: any;
    onSuccess: (message: string) => void;
}

export default function EditSellerModal({ isOpen, onClose, seller, onSuccess }: EditSellerModalProps) {
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        cpf: "",
        cnpj: "",
        optic_name: "",
        brand_id: "",
        status: "",
        role: "seller" // Default, but will be overwritten
    });
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load seller data when modal opens
    useEffect(() => {
        if (seller) {
            setFormData({
                full_name: seller.full_name || "",
                email: seller.email || "",
                cpf: seller.cpf || "",
                cnpj: seller.cnpj || "",
                optic_name: seller.optic_name || "",
                brand_id: seller.brand_id || "",
                status: seller.status || "pending",
                role: seller.role || "seller"
            });
            setError(null);
        }
    }, [seller]);

    const handleDelete = async () => {
        setDeleteLoading(true);
        setError(null);

        try {
            const { error: deleteError } = await supabase
                .from("profiles")
                .delete()
                .eq("id", seller.id);

            if (deleteError) {
                if (deleteError.code === '23503') { // Foreign key violation
                    throw new Error("Não é possível excluir este vendedor pois ele possui vendas ou histórico registrado.");
                }
                throw deleteError;
            }

            onSuccess("Vendedor excluído com sucesso!");
            onClose();
        } catch (err: any) {
            console.error("Error deleting seller:", err);
            setError(err.message || "Erro ao excluir vendedor.");
        } finally {
            setDeleteLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from("profiles")
                .update({
                    full_name: formData.full_name,
                    // email is usually handled by auth, but updating profile record is fine. 
                    // Note: Changing email in profile doesn't change auth email.
                    // keeping email read-only might be safer to avoid confusion, but user requested edit.
                    // For now, let's keep it editable in profile table as requested.
                    email: formData.email,
                    cpf: formData.cpf,
                    cnpj: formData.cnpj,
                    optic_name: formData.optic_name,
                    status: formData.status
                })
                .eq("id", seller.id);

            if (updateError) throw updateError;

            if (updateError) throw updateError;

            onSuccess("Vendedor atualizado com sucesso!");
            onClose();
        } catch (err: any) {
            console.error("Error updating seller:", err);
            setError(err.message || "Erro ao atualizar dados.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !seller) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">

                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-900">
                        {showDeleteConfirm ? "Confirmar Exclusão" : "Editar Vendedor"}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {showDeleteConfirm ? (
                    <div className="p-6 space-y-4">
                        <div className="p-4 bg-red-50 rounded-lg border border-red-100 flex gap-3 text-red-900">
                            <svg className="w-6 h-6 flex-shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <div>
                                <h4 className="font-bold text-sm">Atenção! Esta ação é irreversível.</h4>
                                <p className="text-sm mt-1">Tem certeza que deseja excluir o vendedor <b>{seller.full_name}</b>? Isso pode afetar o histórico de vendas.</p>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-100 text-red-800 text-sm rounded-lg border border-red-200">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => { setShowDeleteConfirm(false); setError(null); }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={deleteLoading}
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center gap-2"
                            >
                                {deleteLoading && <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                Sim, Excluir
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C00000]/20 focus:border-[#C00000]"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    // readOnly // Making it readOnly as changing auth email is complex; changing profile email might be desync.
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                    value={formData.email}
                                    disabled
                                />
                                <p className="text-[10px] text-gray-400 mt-1">O email não pode ser alterado por aqui.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                                <input
                                    type="text"
                                    maxLength={14}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C00000]/20 focus:border-[#C00000]"
                                    value={formData.cpf}
                                    onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                                <input
                                    type="text"
                                    maxLength={18}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C00000]/20 focus:border-[#C00000]"
                                    value={formData.cnpj}
                                    onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Ótica</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C00000]/20 focus:border-[#C00000]"
                                    value={formData.optic_name}
                                    onChange={(e) => setFormData({ ...formData, optic_name: e.target.value })}
                                />
                            </div>

                            {/* Marca Representada e Tipo de Usuário foram removidos, pois todos são representantes gerais */}

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status da Conta</label>
                                <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-200">
                                    {['approved', 'pending', 'rejected'].map(status => (
                                        <button
                                            type="button"
                                            key={status}
                                            onClick={() => setFormData({ ...formData, status })}
                                            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all uppercase tracking-wide
                                            ${formData.status === status
                                                    ? status === 'approved' ? 'bg-green-100 text-green-700 shadow-sm'
                                                        : status === 'rejected' ? 'bg-red-100 text-red-700 shadow-sm'
                                                            : 'bg-yellow-100 text-yellow-700 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-900'}
                                        `}
                                        >
                                            {status === 'approved' ? 'Ativo' : status === 'rejected' ? 'Recusado' : 'Pendente'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-6">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                Excluir Vendedor
                            </button>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-[#C00000] text-white text-sm font-bold rounded-lg hover:bg-[#A00000] transition-colors shadow-lg shadow-[#C00000]/20 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loading && <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div >
    );
}
