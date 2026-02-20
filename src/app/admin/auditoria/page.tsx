"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";

export default function AdminAuditPage() {
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [correctionModal, setCorrectionModal] = useState<{ isOpen: boolean; saleId: string | null; feedback: string }>({
        isOpen: false,
        saleId: null,
        feedback: ""
    });

    const fetchSales = async () => {
        const { data, error } = await supabase
            .from("sales")
            .select("*, profiles!sales_seller_id_fkey(full_name, optic_name), brands(name), reference")
            .eq("status", "pending")
            .order("created_at", { ascending: true });

        if (error) console.error("Error fetching sales:", error);
        if (data) setSales(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchSales();
    }, []);

    const handleAudit = async (id: string, status: "approved" | "rejected" | "needs_correction", feedback?: string) => {
        setActionLoading(id);
        const { data: { user } } = await supabase.auth.getUser();

        const updateData: any = {
            status,
            reviewed_at: new Date().toISOString(),
            reviewer_id: user?.id
        };

        if (status === "needs_correction" && feedback) {
            updateData.admin_feedback = feedback;
        }

        const { error } = await supabase
            .from("sales")
            .update(updateData)
            .eq("id", id);

        if (!error) {
            setSales(sales.filter(s => s.id !== id));
            if (status === "needs_correction") {
                setCorrectionModal({ isOpen: false, saleId: null, feedback: "" });
            }
        } else {
            console.error("Erro Supabase:", error);
            alert("Erro ao enviar solicitação: " + error.message);
        }
        setActionLoading(null);
    };

    const submitCorrection = () => {
        if (correctionModal.saleId && correctionModal.feedback.trim()) {
            handleAudit(correctionModal.saleId, 'needs_correction', correctionModal.feedback);
        }
    };

    if (loading) return (
        <DashboardShell userRole="admin">
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        </DashboardShell>
    );

    return (
        <DashboardShell userRole="admin">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Auditoria</h1>
                        <p className="text-gray-500">Valide as notas fiscais enviadas pelos representantes.</p>
                    </div>
                    <div className="bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium text-gray-600">
                        {sales.length} {sales.length === 1 ? 'pendência' : 'pendências'}
                    </div>
                </div>

                {sales.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Tudo Limpo!</h2>
                        <p className="text-gray-500">Não há notas pendentes de auditoria no momento.</p>
                        <div className="mt-8">
                            <Link href="/admin" className="text-[#C00000] font-medium hover:underline">Voltar ao painel</Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sales.map((sale) => (
                            <div key={sale.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                                {/* Header / User Info */}
                                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                                    <h3 className="font-bold text-gray-900 truncate">{sale.profiles?.full_name}</h3>
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{sale.profiles?.optic_name}</p>
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{sale.brands?.name}</span>
                                    </div>
                                    {sale.reference && (
                                        <div className="mt-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded px-2 py-1 truncate">
                                            Ref: {sale.reference}
                                        </div>
                                    )}
                                </div>

                                {/* Image Area - Click to Expand (concept) */}
                                <div className="relative group aspect-[3/4] bg-gray-100 overflow-hidden cursor-zoom-in">
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/notas-fiscais/${sale.invoice_photo_url}`}
                                        alt="Nota Fiscal"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                        <p className="text-white text-xs font-mono opacity-80">
                                            Enviado em: {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    <a
                                        href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/notas-fiscais/${sale.invoice_photo_url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                    >
                                        <div className="bg-white/90 p-2 rounded-full shadow-lg">
                                            <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                        </div>
                                    </a>
                                </div>

                                {/* Actions */}
                                <div className="p-4 grid grid-cols-3 gap-2 mt-auto border-t border-gray-100">
                                    <button
                                        disabled={!!actionLoading}
                                        onClick={() => handleAudit(sale.id, 'rejected')}
                                        className="py-2.5 rounded-lg border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
                                        title="Recusar definitivamente"
                                    >
                                        Recusar
                                    </button>
                                    <button
                                        disabled={!!actionLoading}
                                        onClick={() => setCorrectionModal({ isOpen: true, saleId: sale.id, feedback: "" })}
                                        className="py-2.5 rounded-lg border border-yellow-400 text-yellow-700 bg-yellow-50 text-xs font-bold hover:bg-yellow-100 transition-colors disabled:opacity-50"
                                        title="Pedir para arrumar e reenviar"
                                    >
                                        Corrigir
                                    </button>
                                    <button
                                        disabled={!!actionLoading}
                                        onClick={() => handleAudit(sale.id, 'approved')}
                                        className="py-2.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 shadow-md shadow-green-900/10 transition-colors disabled:opacity-50"
                                        title="Aprovar nota"
                                    >
                                        {actionLoading === sale.id ? '...' : 'Aprovar'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Correction Modal */}
            {correctionModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">Solicitar Correção</h3>
                            <button
                                onClick={() => setCorrectionModal({ isOpen: false, saleId: null, feedback: "" })}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                O que precisa ser arrumado?
                            </label>
                            <textarea
                                className="w-full text-gray-900 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C00000]/20 focus:border-[#C00000] resize-none"
                                rows={4}
                                placeholder="Ex: Data da nota não está legível. Por favor, envie uma foto mais nítida."
                                value={correctionModal.feedback}
                                onChange={(e) => setCorrectionModal({ ...correctionModal, feedback: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Esta mensagem será enviada ao vendedor junto com a opção de reenviar a nota.
                            </p>
                        </div>
                        <div className="p-6 pt-0 flex justify-end gap-3">
                            <button
                                onClick={() => setCorrectionModal({ isOpen: false, saleId: null, feedback: "" })}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={!correctionModal.feedback.trim() || !!actionLoading}
                                onClick={submitCorrection}
                                className="px-4 py-2 text-sm font-bold text-white bg-[#C00000] rounded-lg hover:bg-[#A00000] disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                {actionLoading === correctionModal.saleId ? 'Enviando...' : 'Enviar Solicitação'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardShell>
    );
}
