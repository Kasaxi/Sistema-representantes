"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";

export default function AdminReportsPage() {
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    const fetchFullReport = async () => {
        const { data } = await supabase
            .from("sales")
            .select("*, profiles!sales_seller_id_fkey(full_name, optic_name, cpf), brands(name)")
            .order("created_at", { ascending: false });
        if (data) setSales(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchFullReport();
    }, []);

    const exportCSV = () => {
        const headers = ["Data", "Vendedor", "Marca", "Ótica", "Status"];
        const rows = sales.map(s => [
            new Date(s.created_at).toLocaleDateString("pt-BR"),
            s.profiles?.full_name || "N/A",
            s.brands?.name || "N/A",
            s.profiles?.optic_name || "N/A",
            s.status
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `relatorio_optisales_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredSales = sales.filter(sale => {
        const matchesStatus = filterStatus === "all" || sale.status === filterStatus;
        const matchesSearch =
            sale.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sale.profiles?.optic_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sale.brands?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const stats = {
        total: sales.length,
        approved: sales.filter(s => s.status === 'approved').length,
        pending: sales.filter(s => s.status === 'pending').length,
        rejected: sales.filter(s => s.status === 'rejected').length,
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
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Relatórios Gerenciais</h1>
                        <p className="text-gray-500">Acompanhe o desempenho geral das vendas e validações.</p>
                    </div>
                    <button
                        onClick={exportCSV}
                        className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Exportar CSV
                    </button>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-sm font-medium text-gray-500">Volume Total</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                    </div>
                    <div className="bg-green-50 p-6 rounded-xl border border-green-100 shadow-sm">
                        <p className="text-sm font-medium text-green-600">Aprovadas</p>
                        <p className="text-3xl font-bold text-green-700 mt-2">{stats.approved}</p>
                    </div>
                    <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-100 shadow-sm">
                        <p className="text-sm font-medium text-yellow-600">Em Análise</p>
                        <p className="text-3xl font-bold text-yellow-700 mt-2">{stats.pending}</p>
                    </div>
                    <div className="bg-red-50 p-6 rounded-xl border border-red-100 shadow-sm">
                        <p className="text-sm font-medium text-red-600">Recusadas</p>
                        <p className="text-3xl font-bold text-red-700 mt-2">{stats.rejected}</p>
                    </div>
                </div>

                {/* Filters & Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

                    {/* Toolbar */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                            {['all', 'approved', 'pending', 'rejected'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`
                                        px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap
                                        ${filterStatus === status
                                            ? 'bg-gray-800 text-white shadow-md'
                                            : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700'}
                                    `}
                                >
                                    {status === 'all' ? 'Todos' :
                                        status === 'approved' ? 'Aprovados' :
                                            status === 'pending' ? 'Pendentes' : 'Recusados'}
                                </button>
                            ))}
                        </div>
                        <div className="relative w-full md:w-64">
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Representante</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ótica</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Marca</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Caminho da Nota</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredSales.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                                            {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                                            <span className="block text-[10px] text-gray-400">
                                                {new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-gray-900">{sale.profiles?.full_name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {sale.profiles?.optic_name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800 uppercase tracking-wide">
                                                {sale.brands?.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <a
                                                href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/notas-fiscais/${sale.invoice_photo_url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity"
                                            >
                                                Visualizar <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                            </a>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide
                                                ${sale.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                    sale.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {sale.status === 'approved' ? 'Aprovado' :
                                                    sale.status === 'rejected' ? 'Recusado' : 'Pendente'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredSales.length === 0 && (
                        <div className="p-16 text-center text-gray-400">
                            Nenhum registro encontrado.
                        </div>
                    )}
                </div>
            </div>
        </DashboardShell>
    );
}
