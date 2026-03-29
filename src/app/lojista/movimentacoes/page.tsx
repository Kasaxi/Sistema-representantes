"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";
import { 
    ArrowUpCircle, ArrowDownCircle, Info, Calendar, Search
} from "lucide-react";
import { toast, Toaster } from "sonner";

export default function ShopkeeperMovementsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [movements, setMovements] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchMovements();
    }, []);

    const fetchMovements = async () => {
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("cnpj")
            .eq("id", user.id)
            .single();

        if (!profile?.cnpj) {
            setLoading(false);
            return;
        }

        const { data: optic } = await supabase
            .from("optics")
            .select("id")
            .eq("cnpj", profile.cnpj)
            .single();

        if (!optic) {
            setLoading(false);
            return;
        }

        // Check Subscription status
        const { data: sub } = await supabase
            .from("shop_subscriptions")
            .select("plan, status")
            .eq("optic_id", optic.id)
            .maybeSingle();

        if (sub?.plan !== 'pro' || sub?.status !== 'active') {
            router.push('/lojista/estoque/upgrade');
            return;
        }

        const { data } = await supabase
            .from("inventory_movements")
            .select(`
                *,
                products (sku, name)
            `)
            .eq("optic_id", optic.id)
            .order("movement_date", { ascending: false });

        if (data) setMovements(data);
        setLoading(false);
    };

    const filteredMovements = movements.filter(m => 
        m.products.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.products.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.reason.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardShell userRole="shopkeeper">
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Histórico de Movimentações</h1>
                    <p className="text-gray-500 mt-1">Registre e acompanhe todas as entradas e saídas de produtos.</p>
                </div>

                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por produto, SKU ou motivo..."
                            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden text-sm">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="p-6">Data</th>
                                    <th className="p-6">Produto</th>
                                    <th className="p-6">Tipo</th>
                                    <th className="p-6 text-center">Quantidade</th>
                                    <th className="p-6">Motivo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-12 text-center text-gray-400">Carregando histórico...</td></tr>
                                ) : filteredMovements.length === 0 ? (
                                    <tr><td colSpan={5} className="p-12 text-center text-gray-400">Nenhuma movimentação registrada.</td></tr>
                                ) : (
                                    filteredMovements.map(m => (
                                        <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-6 text-gray-500 tabular-nums">
                                                {new Date(m.movement_date).toLocaleDateString("pt-BR")}
                                                <div className="text-[10px] opacity-60">{new Date(m.movement_date).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="p-6">
                                                <div className="font-bold text-gray-900">{m.products.sku}</div>
                                                <div className="text-[10px] text-gray-500">{m.products.name}</div>
                                            </td>
                                            <td className="p-6">
                                                {m.type === "entrada" ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 rounded-lg font-bold text-[10px] uppercase">
                                                        <ArrowUpCircle className="w-3 h-3" /> Entrada
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-700 rounded-lg font-bold text-[10px] uppercase">
                                                        <ArrowDownCircle className="w-3 h-3" /> Saída
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-6 text-center font-black text-base">
                                                {m.quantity}
                                            </td>
                                            <td className="p-6 text-gray-600 italic text-xs max-w-xs truncate">
                                                {m.reason || "Não informado"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}
