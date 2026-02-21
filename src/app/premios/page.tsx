"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";
import UploadReceiptModal from "@/components/UploadReceiptModal";
import ViewReceiptModal from "@/components/ViewReceiptModal";

interface Brand {
    id: string;
    name: string;
    commission_value?: number;
    logo_url?: string;
}

interface Sale {
    id: string;
    created_at: string;
    brands?: { name: string, commission_value?: number };
    commission_earned?: number;
    profiles?: { full_name: string };
}

interface Payment {
    id: string;
    created_at: string;
    amount: number;
    period_reference: string;
    receipt_url: string;
    profiles?: { full_name: string; profile_image_url: string };
}

interface SellerProfile {
    id: string;
    full_name: string;
    cpf: string;
    profile_image_url?: string;
    pix_key?: string;
    optic_name?: string;
}

interface OpticRef {
    corporate_name: string;
    city: string;
    state: string;
}

export default function RewardsPage() {
    const [userRole, setUserRole] = useState<"admin" | "representative" | "seller" | null>(null);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [sellers, setSellers] = useState<SellerProfile[]>([]);
    const [opticsData, setOpticsData] = useState<OpticRef[]>([]);

    // Filtros e Estado Atual
    const [selectedState, setSelectedState] = useState("all");
    const [selectedCity, setSelectedCity] = useState("all");
    const [selectedOptic, setSelectedOptic] = useState("all");
    const [selectedSellerId, setSelectedSellerId] = useState<string>("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [loading, setLoading] = useState(true);
    const [receiptSeller, setReceiptSeller] = useState<any>(null);
    const [viewingPayment, setViewingPayment] = useState<any>(null);

    // Totais Calculados
    const [totalEarned, setTotalEarned] = useState(0);
    const [totalPaid, setTotalPaid] = useState(0);
    const [availableBalance, setAvailableBalance] = useState(0);

    useEffect(() => {
        initPage();
    }, []);

    const initPage = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        const role = profile?.role || "representative";
        setUserRole(role);

        if (role === 'admin') {
            const [{ data: sData }, { data: oData }] = await Promise.all([
                supabase.from("profiles").select("id, full_name, cpf, profile_image_url, pix_key, optic_name").in("role", ["seller", "representative"]).order("full_name"),
                supabase.from("optics").select("corporate_name, city, state")
            ]);

            if (oData) setOpticsData(oData);
            if (sData) setSellers(sData);

            setLoading(false);
        } else {
            setSelectedSellerId(user.id);
            setLoading(false);
        }
    };

    // --- Computed Filters for Admin ---
    const availableStates = useMemo(() => {
        return Array.from(new Set(opticsData.map(o => o.state).filter(Boolean))).sort();
    }, [opticsData]);

    const availableCities = useMemo(() => {
        let filtered = opticsData;
        if (selectedState !== "all") filtered = filtered.filter(o => o.state === selectedState);
        return Array.from(new Set(filtered.map(o => o.city).filter(Boolean))).sort();
    }, [opticsData, selectedState]);

    const availableOptics = useMemo(() => {
        let filtered = opticsData;
        if (selectedState !== "all") filtered = filtered.filter(o => o.state === selectedState);
        if (selectedCity !== "all") filtered = filtered.filter(o => o.city === selectedCity);
        return Array.from(new Set(filtered.map(o => o.corporate_name).filter(Boolean))).sort();
    }, [opticsData, selectedState, selectedCity]);

    const filteredSellers = useMemo(() => {
        return sellers.filter(s => {
            if (selectedOptic !== "all" && s.optic_name !== selectedOptic) return false;
            const sellerOptic = opticsData.find(o => o.corporate_name === s.optic_name);
            if (selectedState !== "all" && (!sellerOptic || sellerOptic.state !== selectedState)) return false;
            if (selectedCity !== "all" && (!sellerOptic || sellerOptic.city !== selectedCity)) return false;
            return true;
        });
    }, [sellers, opticsData, selectedState, selectedCity, selectedOptic]);

    // Cleanup cascateado de filtros
    useEffect(() => {
        if (selectedCity !== "all" && !availableCities.includes(selectedCity)) setSelectedCity("all");
    }, [availableCities]);

    useEffect(() => {
        if (selectedOptic !== "all" && !availableOptics.includes(selectedOptic)) setSelectedOptic("all");
    }, [availableOptics]);

    useEffect(() => {
        if (selectedSellerId !== "all" && !filteredSellers.find(s => s.id === selectedSellerId)) {
            setSelectedSellerId("all");
        }
    }, [filteredSellers]);

    // --- Fetch Logic ---
    useEffect(() => {
        if (userRole === "admin") {
            const targetIds = selectedSellerId === "all" ? filteredSellers.map(s => s.id) : [selectedSellerId];
            fetchDataForSellers(targetIds);
        } else if ((userRole === "representative" || userRole === "seller") && selectedSellerId !== "all") {
            fetchDataForSellers([selectedSellerId]);
        }
    }, [userRole, filteredSellers, selectedSellerId, startDate, endDate]);

    const fetchDataForSellers = async (targetSellerIds: string[]) => {
        if (targetSellerIds.length === 0) {
            setSales([]);
            setPayments([]);
            setTotalEarned(0);
            setTotalPaid(0);
            setAvailableBalance(0);
            return;
        }

        setLoading(true);

        const brandsRes = await supabase
            .from("brands")
            .select("*")
            .in("name", ["Nike", "Náutica", "Donna Karan"])
            .order("name");

        let salesQuery = supabase
            .from("sales")
            .select(`
                id,
                created_at,
                brands (name, commission_value),
                profiles:seller_id (full_name)
            `)
            .in("seller_id", targetSellerIds)
            .eq("status", "approved")
            .order("created_at", { ascending: false });

        let paymentsQuery = supabase
            .from("commission_payments")
            .select(`
                *,
                profiles:seller_id (full_name, profile_image_url)
            `)
            .in("seller_id", targetSellerIds)
            .order("created_at", { ascending: false });

        const globalSalesQuery = supabase
            .from("sales")
            .select("brands(commission_value)")
            .in("seller_id", targetSellerIds)
            .eq("status", "approved");

        const globalPaymentsQuery = supabase
            .from("commission_payments")
            .select("amount")
            .in("seller_id", targetSellerIds);

        if (startDate) {
            salesQuery = salesQuery.gte("created_at", startDate + "T00:00:00");
            paymentsQuery = paymentsQuery.gte("created_at", startDate + "T00:00:00");
        }
        if (endDate) {
            salesQuery = salesQuery.lte("created_at", endDate + "T23:59:59");
            paymentsQuery = paymentsQuery.lte("created_at", endDate + "T23:59:59");
        }

        const [salesRes, paymentsRes, globalSalesRes, globalPaymentsRes] = await Promise.all([salesQuery, paymentsQuery, globalSalesQuery, globalPaymentsQuery]);

        if (brandsRes.data) setBrands(brandsRes.data);

        let earned = 0;
        let processedSales: Sale[] = [];
        if (salesRes.data) {
            processedSales = salesRes.data.map((sale: any) => {
                const amount = sale.brands?.commission_value || 0;
                earned += amount;
                return { ...sale, commission_earned: amount };
            });
            setSales(processedSales);
        } else {
            setSales([]);
        }

        let paid = 0;
        if (paymentsRes.data) {
            paymentsRes.data.forEach((p: Payment) => paid += p.amount);
            setPayments(paymentsRes.data);
        } else {
            setPayments([]);
        }

        setTotalEarned(earned);
        setTotalPaid(paid);

        let globalEarned = 0;
        let globalPaid = 0;
        if (globalSalesRes.data) {
            globalSalesRes.data.forEach((s: any) => globalEarned += (s.brands?.commission_value || 0));
        }
        if (globalPaymentsRes.data) {
            globalPaymentsRes.data.forEach((p: any) => globalPaid += p.amount);
        }
        setAvailableBalance(globalEarned - globalPaid);

        setLoading(false);
    };

    const formatBRL = (val: number) => `R$ ${val.toFixed(2).replace(".", ",")}`;

    if (!userRole) return null;

    return (
        <DashboardShell userRole={userRole}>
            <div className="max-w-[1200px] mx-auto space-y-6">

                {/* CONTROLES / FILTROS */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 relative">
                    {loading && (
                        <div className="absolute top-4 right-4 animate-in fade-in">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 opacity-50"></div>
                        </div>
                    )}
                    <h2 className="text-xl font-black text-gray-900 leading-none">
                        {userRole === 'admin' ? "Visão Geral de Prêmios" : "Meus Prêmios"}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 items-end mt-2">
                        {userRole === 'admin' && (
                            <>
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Estado</label>
                                    <select
                                        className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-gray-900 focus:border-gray-900 bg-gray-50 text-sm font-medium text-gray-800 transition-colors h-[42px]"
                                        value={selectedState}
                                        onChange={(e) => setSelectedState(e.target.value)}
                                    >
                                        <option value="all">Todos</option>
                                        {availableStates.map(st => <option key={st} value={st}>{st}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col lg:col-span-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Cidade</label>
                                    <select
                                        className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-gray-900 focus:border-gray-900 bg-gray-50 text-sm font-medium text-gray-800 transition-colors h-[42px]"
                                        value={selectedCity}
                                        onChange={(e) => setSelectedCity(e.target.value)}
                                    >
                                        <option value="all">Todas</option>
                                        {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col lg:col-span-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Ótica</label>
                                    <select
                                        className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-gray-900 focus:border-gray-900 bg-gray-50 text-sm font-medium text-gray-800 transition-colors h-[42px]"
                                        value={selectedOptic}
                                        onChange={(e) => setSelectedOptic(e.target.value)}
                                    >
                                        <option value="all">Todas</option>
                                        {availableOptics.map(op => <option key={op} value={op}>{op}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col lg:col-span-3">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Vendedor</label>
                                    <select
                                        className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-gray-900 focus:border-gray-900 bg-gray-50 text-sm font-medium text-gray-800 transition-colors h-[42px]"
                                        value={selectedSellerId}
                                        onChange={(e) => setSelectedSellerId(e.target.value)}
                                    >
                                        <option value="all">Todos os vendedores</option>
                                        {filteredSellers.map(s => (
                                            <option key={s.id} value={s.id}>{s.full_name} ({s.cpf || 'S/N'})</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="flex flex-col lg:col-span-1">
                            {userRole !== 'admin' && <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Data Início</label>}
                            {userRole === 'admin' && <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Início</label>}
                            <input
                                type="date"
                                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-gray-900 focus:border-gray-900 bg-gray-50 text-sm font-medium text-gray-800 h-[42px]"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col lg:col-span-1">
                            {userRole !== 'admin' && <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Data Fim</label>}
                            {userRole === 'admin' && <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Fim</label>}
                            <input
                                type="date"
                                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-gray-900 focus:border-gray-900 bg-gray-50 text-sm font-medium text-gray-800 h-[42px]"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>

                        {userRole === 'admin' && (
                            <div className="flex flex-col mt-4 md:mt-0 col-span-full md:col-span-2 lg:col-span-5 flex-row-reverse">
                                <button
                                    onClick={() => setReceiptSeller(sellers.find(s => s.id === selectedSellerId))}
                                    disabled={selectedSellerId === "all" || availableBalance <= 0}
                                    className="px-6 py-2 h-[42px] bg-gray-900 text-white rounded-lg hover:bg-black font-bold shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Registrar Pagamento
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* HEADER COM SALDOS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Acumulado Histórico</h3>
                        <p className="text-3xl font-black text-gray-900 tracking-tight">{formatBRL(totalEarned)}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Já Pago</h3>
                        <p className="text-3xl font-black text-blue-600 tracking-tight">{formatBRL(totalPaid)}</p>
                    </div>
                    <div className={`rounded-2xl p-6 border shadow-sm text-center ${availableBalance > 0 ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100'}`}>
                        <h3 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${availableBalance > 0 ? 'text-green-700' : 'text-gray-400'}`}>Saldo Disponível</h3>
                        <p className={`text-4xl font-black tracking-tight ${availableBalance > 0 ? 'text-green-600' : 'text-gray-900'}`}>{formatBRL(availableBalance)}</p>
                    </div>
                </div>

                {/* VISUALIZAÇÃO DE MARCAS SOMENTE PRA VENDEDOR */}
                {userRole !== 'admin' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 pl-1">Oportunidades de Bônus</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {brands.map((brand) => (
                                <div key={brand.id} className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col items-center justify-center gap-3 hover:shadow-md transition-shadow group">
                                    <div className="h-12 w-full flex items-center justify-center relative grayscale group-hover:grayscale-0 transition-all opacity-70 group-hover:opacity-100 p-1">
                                        {brand.logo_url ? (
                                            <img src={brand.logo_url} alt={`${brand.name} Logo`} className="max-h-full max-w-full object-contain" />
                                        ) : brand.name.toLowerCase().includes('nike') ? (
                                            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg" alt="Nike Logo" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <span className="text-xl font-black italic tracking-tighter text-gray-900">{brand.name}</span>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Bônus por venda</p>
                                        <p className="text-lg font-bold text-green-600">
                                            {formatBRL(brand.commission_value || 0)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Extrato Detail */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[500px]">
                        <div className="px-5 py-4 border-b border-gray-100 shrink-0">
                            <h2 className="font-extrabold text-gray-900">Extrato de Recompensas (Ganhas)</h2>
                        </div>
                        <div className="divide-y divide-gray-50 overflow-y-auto custom-scrollbar flex-1 relative">
                            {sales.length === 0 && !loading && (
                                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-400">Nenhuma venda com bônus encontrada.</div>
                            )}
                            {sales.map((sale) => (
                                <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="font-bold text-gray-900 text-sm">
                                                {sale.brands?.name || "Marca Desconhecida"}
                                                {userRole === 'admin' && selectedSellerId === "all" && sale.profiles && (
                                                    <span className="text-gray-500 font-semibold text-[11px] ml-2 px-1.5 py-0.5 bg-gray-100 rounded-md">Vendedor: {sale.profiles.full_name.split(' ')[0]}</span>
                                                )}
                                            </p>
                                            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                                                {new Date(sale.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-green-600 text-sm">+ {formatBRL(sale.commission_earned || 0)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Histórico de Pagamentos / Comprovantes */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[500px]">
                        <div className="px-5 py-4 border-b border-gray-100 shrink-0 flex items-center justify-between">
                            <h2 className="font-extrabold text-gray-900">Histórico de Pagamentos</h2>
                        </div>
                        <div className="divide-y divide-gray-50 overflow-y-auto custom-scrollbar flex-1 relative">
                            {payments.length === 0 && !loading && (
                                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-400">Nenhum pagamento registrado.</div>
                            )}
                            {payments.map((payment) => (
                                <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {payment.profiles?.profile_image_url ? (
                                            <img src={payment.profiles.profile_image_url} alt="Vendedor" className="w-9 h-9 rounded-full object-cover shrink-0" />
                                        ) : (
                                            <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold shrink-0 text-sm">
                                                {payment.profiles?.full_name?.charAt(0) || <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                            </div>
                                        )}
                                        <div className="flex flex-col">
                                            <p className="font-bold text-gray-900 text-sm tracking-tight text-ellipsis whitespace-nowrap overflow-hidden max-w-[150px]">
                                                {userRole === 'admin' && selectedSellerId === "all" && payment.profiles ? payment.profiles.full_name : `Ref: ${payment.period_reference}`}
                                            </p>
                                            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                                                {userRole === 'admin' && selectedSellerId === "all" ? `Ref: ${payment.period_reference}` : new Date(payment.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 text-right">
                                        <p className="font-black text-blue-600 text-sm">- {formatBRL(payment.amount)}</p>
                                        <button
                                            onClick={() => setViewingPayment(payment)}
                                            className="px-2 py-0.5 text-[10px] font-bold text-gray-500 border border-gray-200 rounded hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                        >
                                            Ver Comprovante
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            <UploadReceiptModal
                isOpen={!!receiptSeller}
                onClose={() => setReceiptSeller(null)}
                seller={receiptSeller}
                onSuccess={(msg) => {
                    alert(msg);
                    if (selectedSellerId !== "all") {
                        fetchDataForSellers([selectedSellerId]);
                    } else {
                        fetchDataForSellers(filteredSellers.map(s => s.id));
                    }
                }}
            />

            <ViewReceiptModal
                isOpen={!!viewingPayment}
                onClose={() => setViewingPayment(null)}
                payment={viewingPayment}
            />
        </DashboardShell>
    );
}
