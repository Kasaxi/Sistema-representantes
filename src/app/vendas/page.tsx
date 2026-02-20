"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import Link from "next/link";
import imageCompression from "browser-image-compression";

interface Sale {
    id: string;
    seller_id: string;
    brand_id: string;
    reference: string | null;
    invoice_photo_url: string;
    status: 'pending' | 'approved' | 'rejected' | 'needs_correction' | 'paid';
    admin_feedback: string | null;
    created_at: string;
    brands?: { name: string };
    profiles?: { optic_name: string };
}

export default function MySalesPage() {
    const router = useRouter();
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Correction Modal State
    const [correctionModal, setCorrectionModal] = useState<{
        isOpen: boolean;
        sale: Sale | null;
        newReference: string;
        newFile: File | null;
        previewUrl: string | null;
        submitting: boolean;
        error: string | null;
    }>({
        isOpen: false, sale: null, newReference: "", newFile: null, previewUrl: null, submitting: false, error: null
    });

    const fetchSales = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push("/login");
            return;
        }

        const { data, error } = await supabase
            .from("sales")
            .select("*, brands(name), profiles!sales_seller_id_fkey(optic_name)")
            .eq("seller_id", user.id)
            .order("created_at", { ascending: false });

        if (data) setSales(data as Sale[]);
        setLoading(false);
    };

    useEffect(() => {
        fetchSales();
    }, []);

    const filteredSales = sales.filter(sale =>
        (sale.reference && sale.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.brands?.name && sale.brands.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith("image/")) {
            setCorrectionModal(prev => ({ ...prev, newFile: file, error: null }));
            const reader = new FileReader();
            reader.onloadend = () => setCorrectionModal(prev => ({ ...prev, previewUrl: reader.result as string }));
            reader.readAsDataURL(file);
        }
    };

    const submitCorrection = async () => {
        const { sale, newFile, newReference } = correctionModal;
        if (!sale || !newFile) {
            setCorrectionModal(prev => ({ ...prev, error: "Por favor, selecione uma nova imagem da nota." }));
            return;
        }

        setCorrectionModal(prev => ({ ...prev, submitting: true, error: null }));

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado.");

            const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true };
            const compressedFile = await imageCompression(newFile, options);

            const fileExt = newFile.name.split(".").pop();
            const fileName = `${user.id}/${Date.now()}_correction.${fileExt}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from("notas-fiscais")
                .upload(fileName, compressedFile);

            if (uploadError) throw uploadError;

            // Atualiza a venda existente
            const { data: updatedData, error: updateError } = await supabase.from("sales").update({
                reference: newReference || sale.reference,
                invoice_photo_url: uploadData.path,
                status: "pending",
                admin_feedback: null // limpa o feedback após reenvio
            }).eq("id", sale.id).select();

            if (updateError) throw updateError;

            if (!updatedData || updatedData.length === 0) {
                throw new Error("A atualização foi recusada pelo banco de dados (provável falta de permissão UPDATE no RLS).");
            }

            // Recarrega a lista
            await fetchSales();
            setCorrectionModal({ isOpen: false, sale: null, newReference: "", newFile: null, previewUrl: null, submitting: false, error: null });

        } catch (err: any) {
            console.error("Submission Error:", err);
            setCorrectionModal(prev => ({ ...prev, submitting: false, error: err.message || "Erro ao reenviar nota." }));
            alert("Falha no reenvio: " + (err.message || "Ocorreu um erro inesperado."));
        }
    };

    const openCorrectionModal = (sale: Sale) => {
        setCorrectionModal({
            isOpen: true,
            sale: sale,
            newReference: sale.reference || "",
            newFile: null,
            previewUrl: null,
            submitting: false,
            error: null
        });
    };

    if (loading) return (
        <DashboardShell userRole="representative">
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        </DashboardShell>
    );

    return (
        <DashboardShell userRole="representative">
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Minhas Vendas</h1>
                        <p className="text-gray-500">Acompanhe o status e as correções dos seus envios de notas.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar marca ou referência..."
                                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-[#C00000]/20 focus:border-[#C00000] transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <Link
                            href="/enviar-nota"
                            className="bg-[#C00000] hover:bg-[#A00000] text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-red-900/10 flex items-center gap-2 transition-all hover:-translate-y-0.5"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            Nova Nota
                        </Link>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Imagem</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Marca</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Referência</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Enviado em</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSales.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/notas-fiscais/${sale.invoice_photo_url}`} target="_blank" rel="noopener noreferrer">
                                                <div className="w-12 h-16 bg-gray-100 rounded flex items-center justify-center overflow-hidden border border-gray-200 hover:border-[#C00000] transition-colors">
                                                    <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/notas-fiscais/${sale.invoice_photo_url}`} className="w-full h-full object-cover" alt="Nota Fiscal" />
                                                </div>
                                            </a>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                                {sale.brands?.name || "Desconhecida"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                            {sale.reference || <span className="text-gray-400 font-normal">N/A</span>}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {formatDate(sale.created_at)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                                ${sale.status === 'approved' ? 'bg-green-50 text-green-700 border-green-100' :
                                                    sale.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                                                        sale.status === 'needs_correction' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm' :
                                                            sale.status === 'paid' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                                'bg-gray-50 text-gray-600 border-gray-200'
                                                }`}>
                                                {sale.status === 'approved' && 'Aprovado'}
                                                {sale.status === 'rejected' && 'Recusado'}
                                                {sale.status === 'needs_correction' && 'Requer Correção'}
                                                {sale.status === 'pending' && 'Em Análise'}
                                                {sale.status === 'paid' && 'Pago'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {sale.status === 'needs_correction' && (
                                                <button
                                                    onClick={() => openCorrectionModal(sale)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs font-bold rounded-lg transition-colors border border-yellow-300"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    Corrigir Nota
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredSales.length === 0 && (
                        <div className="p-12 text-center flex flex-col items-center justify-center">
                            <p className="text-gray-500 mb-6 max-w-sm">Você ainda não enviou nenhuma nota fiscal. Comece enviando sua primeira venda para o sistema.</p>
                            <Link
                                href="/enviar-nota"
                                className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold transition-all hover:-translate-y-0.5"
                            >
                                Enviar Primeira Nota
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Correção */}
            {correctionModal.isOpen && correctionModal.sale && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900">Corrigir Nota</h3>
                            <button
                                onClick={() => setCorrectionModal(prev => ({ ...prev, isOpen: false }))}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {/* Feedback do Admin */}
                            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
                                <h4 className="text-sm font-bold text-yellow-800 flex items-center gap-2 mb-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    Motivo da Correção
                                </h4>
                                <p className="text-sm text-yellow-700 whitespace-pre-wrap">
                                    {correctionModal.sale.admin_feedback || "Nenhum feedback fornecido."}
                                </p>
                            </div>

                            {/* Editar Referência */}
                            {/* Editar Referência */}
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Nova Referência</label>
                                <input
                                    type="text"
                                    value={correctionModal.newReference}
                                    onChange={(e) => setCorrectionModal(prev => ({ ...prev, newReference: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-[#C00000] focus:border-[#C00000] outline-none shadow-sm transition-all"
                                    placeholder="Digite a nova referência (ou deixe igual)"
                                />
                                <p className="text-xs text-gray-500 mt-2">Altere apenas se estiver incorreta.</p>
                            </div>

                            {/* Foto Atual / Nova Foto */}
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Enviar Nova Foto da Nota</label>

                                <label className={`block w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${correctionModal.previewUrl
                                    ? 'border-[#C00000] bg-red-50/50 hover:bg-red-50'
                                    : 'border-gray-300 hover:bg-gray-50'
                                    }`}>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                    {correctionModal.previewUrl ? (
                                        <div className="space-y-4">
                                            <div className="bg-white p-2 rounded-xl shadow-sm mx-auto max-w-[200px] border border-gray-100">
                                                <img src={correctionModal.previewUrl} alt="Preview" className="w-full h-auto object-contain rounded-lg" />
                                            </div>
                                            <p className="text-sm text-[#C00000] font-bold">✓ Imagem confirmada. Clique para trocar.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 py-4">
                                            <div className="w-12 h-12 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-[#C00000] font-bold">Clique para selecionar</span> a nova nota
                                            </div>
                                            <p className="text-xs text-gray-500">Apenas arquivos de imagem</p>
                                        </div>
                                    )}
                                </label>
                            </div>

                            {/* Error */}
                            {correctionModal.error && (
                                <div className="p-3 mb-6 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                                    {correctionModal.error}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                            <button
                                onClick={() => setCorrectionModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={submitCorrection}
                                disabled={correctionModal.submitting || !correctionModal.newFile}
                                className="px-5 py-2.5 bg-[#C00000] hover:bg-[#A00000] text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                {correctionModal.submitting ? 'Enviando...' : 'Reenviar Nota'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardShell>
    );
}
