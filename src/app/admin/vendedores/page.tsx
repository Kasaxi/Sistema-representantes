"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import EditSellerModal from "@/components/EditSellerModal";
import UploadReceiptModal from "@/components/UploadReceiptModal";

const formatCPF = (value: string) => {
    if (!value) return '';
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

const formatCNPJ = (value: string) => {
    if (!value) return '';
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

export default function AdminSellersPage() {
    const router = useRouter();
    const [sellers, setSellers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [editingSeller, setEditingSeller] = useState<any>(null);
    const [receiptSeller, setReceiptSeller] = useState<any>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const fetchSellers = async () => {
        const { data } = await supabase
            .from("profiles")
            .select("*, brands(name)")
            .in("role", ["seller", "representative"])
            .order("created_at", { ascending: false });
        if (data) setSellers(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchSellers();
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleStatus = async (id: string, status: "approved" | "rejected" | "pending") => {
        setActionLoading(id);
        const { error } = await supabase
            .from("profiles")
            .update({ status })
            .eq("id", id);

        if (!error) {
            setSellers(sellers.map(s => s.id === id ? { ...s, status } : s));
        }
        setActionLoading(null);
    };

    const filteredSellers = sellers.filter(seller =>
        seller.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seller.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seller.optic_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <DashboardShell userRole="admin">
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        </DashboardShell>
    );

    return (
        <DashboardShell userRole="admin">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white text-sm animate-in fade-in slide-in-from-top-2 flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    <span>{toast.message}</span>
                </div>
            )}
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Vendedores</h1>
                        <p className="text-gray-500">Gerencie o acesso e status dos representantes.</p>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar por nome ou ótica..."
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-[#C00000]/20 focus:border-[#C00000] transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Representante</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vínculo</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSellers.map((seller) => (
                                    <tr key={seller.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold shrink-0">
                                                    {seller.full_name?.charAt(0) || "U"}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{seller.full_name}</div>
                                                    <div className="text-xs text-gray-500">{seller.email}</div>
                                                    <div className="text-[10px] text-gray-400 mt-0.5">{formatCPF(seller.cpf)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 font-medium">{seller.optic_name}</div>
                                            <div className="text-xs text-gray-400 mt-1">CNPJ: {formatCNPJ(seller.cnpj)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${seller.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                    seller.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {seller.status === 'approved' && 'Ativo'}
                                                {seller.status === 'rejected' && 'Recusado'}
                                                {seller.status === 'pending' && 'Pendente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setEditingSeller(seller)}
                                                    className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded hover:bg-gray-50 transition-colors"
                                                >
                                                    Editar
                                                </button>
                                                {seller.status === 'approved' && (
                                                    <button
                                                        onClick={() => setReceiptSeller(seller)}
                                                        className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-semibold rounded hover:bg-green-200 transition-colors"
                                                    >
                                                        Pagamento
                                                    </button>
                                                )}
                                                {seller.status === 'pending' && (
                                                    <>
                                                        <button
                                                            disabled={!!actionLoading}
                                                            onClick={() => handleStatus(seller.id, 'approved')}
                                                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                                                        >
                                                            Aprovar
                                                        </button>
                                                        <button
                                                            disabled={!!actionLoading}
                                                            onClick={() => handleStatus(seller.id, 'rejected')}
                                                            className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-semibold rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                                                        >
                                                            Recusar
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredSellers.length === 0 && (
                        <div className="p-12 text-center">
                            <p className="text-gray-500">Nenhum vendedor encontrado.</p>
                        </div>
                    )}
                </div>
            </div>

            <EditSellerModal
                isOpen={!!editingSeller}
                onClose={() => setEditingSeller(null)}
                seller={editingSeller}
                onSuccess={(msg) => {
                    fetchSellers();
                    setToast({ message: msg, type: 'success' });
                }}
            />

            <UploadReceiptModal
                isOpen={!!receiptSeller}
                onClose={() => setReceiptSeller(null)}
                seller={receiptSeller}
                onSuccess={(msg) => {
                    setToast({ message: msg, type: 'success' });
                }}
            />
        </DashboardShell>
    );
}
