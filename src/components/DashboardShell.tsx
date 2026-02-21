"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import MarketingPopup from "./MarketingPopup";

interface DashboardShellProps {
    children: React.ReactNode;
    userRole?: "admin" | "representative" | "seller";
}

export default function DashboardShell({ children, userRole = "representative" }: DashboardShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();

                // SECURITY: Redirect pending users
                if (data?.status === 'pending' && pathname !== '/aguardando-aprovacao') {
                    router.push('/aguardando-aprovacao');
                    return;
                }

                setUserProfile(data);
            } else {
                router.push('/login');
            }
        }
        getUser();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    // Correctly determine role based on fetched profile OR fallback to prop
    const effectiveRole = userProfile?.role || userRole;

    const navItems = effectiveRole === "admin" ? [
        { name: "Visão Geral", href: "/admin", icon: "LayoutDashboard" },
        { name: "Auditoria", href: "/admin/auditoria", icon: "FileCheck" },
        { name: "Ranking", href: "/admin/ranking", icon: "Trophy" },
        { name: "Prêmios", href: "/premios", icon: "Gem" },
        { name: "Marketing", href: "/admin/marketing", icon: "Megaphone" },
        { name: "Marcas", href: "/admin/marcas", icon: "Tag" },
        { name: "Relatórios", href: "/admin/relatorios", icon: "BarChart3" },
        { name: "Vendedores", href: "/admin/vendedores", icon: "Users" },
        { name: "Óticas", href: "/admin/oticas", icon: "Glasses" },
        { name: "Enviar Nota", href: "/enviar-nota", icon: "Upload" },
    ] : [
        { name: "Visão Geral", href: "/dashboard", icon: "LayoutDashboard" },
        { name: "Lançar Notas", href: "/enviar-nota", icon: "Upload" },
        { name: "Minhas Vendas", href: "/vendas", icon: "Receipt" },
        { name: "Ranking", href: "/ranking", icon: "Trophy" },
        { name: "Prêmios", href: "/premios", icon: "Gem" },
        { name: "Meu Perfil", href: "/dashboard/perfil", icon: "Users" },
    ];

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex text-gray-900 font-sans">

            {/* SIDEBAR (Desktop) */}
            <aside className={`hidden lg:flex flex-col bg-white border-r border-gray-100 h-screen sticky top-0 z-20 shadow-sm transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-72'}`}>
                <div className={`flex flex-col ${isCollapsed ? 'items-center p-4' : 'p-6'}`}>

                    {/* Header / Logo / Toggle */}
                    <div className={`flex items-center ${isCollapsed ? 'justify-center mb-8' : 'justify-between mb-8'}`}>
                        {/* Logo */}
                        <div className="flex items-center gap-2">
                            <div className={`bg-[#C00000] rounded-lg flex items-center justify-center transition-all ${isCollapsed ? 'w-10 h-10' : 'w-8 h-8'}`}>
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            </div>
                            {!isCollapsed && (
                                <span className="text-xl font-bold tracking-tight text-gray-900 animate-in fade-in duration-200">OptiSales<span className="text-[#C00000]">.</span></span>
                            )}
                        </div>

                        {/* Toggle Button (Only visible when expanded, positioned absolute or right aligned) */}
                        {!isCollapsed && (
                            <button onClick={() => setIsCollapsed(true)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-auto">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                            </button>
                        )}
                    </div>

                    {/* Collapsed Toggle (Centered) */}
                    {isCollapsed && (
                        <button onClick={() => setIsCollapsed(false)} className="mb-6 p-2 text-gray-400 hover:text-[#C00000] hover:bg-red-50 rounded-lg transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                        </button>
                    )}

                    {/* User Info */}
                    {!isCollapsed ? (
                        <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 mb-6 animate-in fade-in duration-200">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Logado como</p>
                            <p className="font-semibold text-sm truncate">{userProfile?.full_name || "Carregando..."}</p>
                            <p className="text-xs text-[#C00000] font-medium capitalize">{userRole === 'admin' ? 'Administrador' : 'Representante'}</p>
                        </div>
                    ) : (
                        <div className="mb-6 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[#C00000] font-bold text-xs border border-gray-200" title={userProfile?.full_name}>
                            {userProfile?.full_name?.charAt(0) || "U"}
                        </div>
                    )}
                </div>

                <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={isCollapsed ? item.name : ""}
                                className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive
                                    ? "bg-[#C00000] text-white shadow-md shadow-red-900/20"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                            >
                                {/* Icon */}
                                <div className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"}`}>
                                    {/* Simulating Icons based on name for now */}
                                    {item.icon === "LayoutDashboard" && <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                                    {item.icon === "Users" && <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                                    {item.icon === "Glasses" && <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                                    {item.icon === "Trophy" && <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>}
                                    {item.icon === "Gem" && <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                    {item.icon === "FileCheck" && <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                    {item.icon === "BarChart3" && <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                                    {item.icon === "Upload" && <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
                                    {item.icon === "Megaphone" && <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>}
                                    {item.icon === "Tag" && <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
                                    {item.icon === "Receipt" && <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
                                </div>
                                {!isCollapsed && <span className="animate-in fade-in duration-200">{item.name}</span>}
                                {isActive && !isCollapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-50" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleSignOut}
                        title={isCollapsed ? "Sair do Sistema" : ""}
                        className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 w-full rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors`}
                    >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        {!isCollapsed && <span className="animate-in fade-in duration-200">Sair do Sistema</span>}
                    </button>
                </div>
            </aside>

            {/* MOBILE HEADER */}
            <div className="lg:hidden w-full fixed top-0 bg-white border-b border-gray-100 z-50 px-4 py-3 flex items-center justify-between">
                <div className="w-8 h-8 bg-[#C00000] rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">O</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>
            </div>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 w-full overflow-y-auto">
                <div className="px-8 py-8 pb-12">
                    {children}
                </div>
            </main>

            {/* Marketing Popups for Representatives */}
            {effectiveRole === "representative" && <MarketingPopup />}
        </div>
    );
}
