"use client";

import Link from "next/link";

const stats = [
  { value: "$124.592", label: "Vendas Mensais", trend: "+12.5%", trendUp: true },
  { value: "48", label: "Faturas Pendentes", trend: "Requer Ação", trendUp: false },
  { value: "#4", label: "Ranking Atual", trend: "2 Posições acima", trendUp: true },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* SaaS Navigation */}
      <nav className="bg-white border-b border-gray-100 px-12 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center shadow-lg shadow-accent/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">OptiSales</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 px-6 py-3 rounded-lg transition-all">Entrar</Link>
          <Link href="/cadastro" className="text-sm font-bold text-white bg-accent px-6 py-3 rounded-lg shadow-lg shadow-accent/20 hover:bg-red-700 transition-all">Participar do Programa</Link>
        </div>
      </nav>

      {/* Hero / Landing Concept */}
      <main className="container mx-auto px-12 py-28 max-w-6xl">
        <header className="mb-24 text-center">
          <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-8 leading-tight">
            A plataforma inteligente para <br />
            <span className="text-accent underline decoration-accent/10 underline-offset-8 transition-all hover:decoration-accent/30">Incentivos Óticos.</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
            Registre suas vendas, acompanhe seu desempenho no ranking e reivindique suas recompensas em um ambiente unificado e profissional, projetado para os melhores vendedores.
          </p>
          <div className="mt-12 flex gap-5 justify-center">
            <Link href="/cadastro" className="px-10 py-5 bg-accent text-white font-bold rounded-xl shadow-xl shadow-accent/30 hover:scale-[1.02] active:scale-[0.98] transition-all">Começar Agora</Link>
            <Link href="/login" className="px-10 py-5 bg-white text-gray-700 font-bold border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">Acessar Painel</Link>
          </div>
        </header>

        {/* Feature Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {stats.map((stat, i) => (
            <div key={i} className="saas-card p-10">
              <div className="flex justify-between items-start mb-8">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</span>
                <div className={`p-3 rounded-lg ${stat.trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {stat.trendUp ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  )}
                </div>
              </div>
              <div className="text-5xl font-black text-gray-900 mb-3">{stat.value}</div>
              <div className={`text-sm font-bold ${stat.trendUp ? 'text-green-500' : 'text-red-500'}`}>
                {stat.trend} <span className="text-gray-400 font-medium ml-1">desempenho hoje</span>
              </div>
            </div>
          ))}
        </section>

        {/* Brand Alliance */}
        <footer className="mt-36 border-t border-gray-100 pt-20 text-center opacity-50">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.4em] mb-12">Marcas Parceiras Oficiais</p>
          <div className="flex flex-wrap justify-center gap-20 grayscale transition-all hover:grayscale-0">
            <span className="text-2xl font-black italic tracking-tighter text-gray-900 px-4 border-r border-gray-200">RAY-BAN</span>
            <span className="text-2xl font-black italic tracking-tighter text-gray-900 px-4 border-r border-gray-200">OAKLEY</span>
            <span className="text-2xl font-black italic tracking-tighter text-gray-900 px-4 border-r border-gray-200">VOGUE EYEWEAR</span>
            <span className="text-2xl font-black italic tracking-tighter text-gray-900">PRADA</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
