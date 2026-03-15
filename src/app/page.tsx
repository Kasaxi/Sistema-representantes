"use client";

import Link from "next/link";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Campaign {
  id: string;
  image_url: string;
  title: string;
}

export default function HomePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCampaigns() {
      const { data } = await supabase
        .from("marketing_campaigns")
        .select("id, image_url, title")
        .eq("is_active", true)
        .order("priority", { ascending: false });

      if (data) setCampaigns(data);
      setLoading(false);
    }
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (campaigns.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % campaigns.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [campaigns]);

  const next = () => setCurrentIndex((prev) => (prev + 1) % campaigns.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + campaigns.length) % campaigns.length);

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
          <Link href="/login" className="text-sm font-bold text-white bg-accent px-6 py-3 rounded-lg shadow-lg shadow-accent/20 hover:bg-blue-700 transition-all">Entrar</Link>
        </div>
      </nav>

      {/* Hero / Landing Concept */}
      <main className="container mx-auto px-12 py-20 max-w-6xl">
        <header className="mb-16 text-center">
          <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-8 leading-tight">
            A plataforma inteligente para <br />
            <span className="text-accent underline decoration-accent/10 underline-offset-8 transition-all hover:decoration-accent/30">Incentivos Óticos.</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
            Registre suas vendas, acompanhe seu desempenho no ranking e reivindique suas recompensas em um ambiente unificado e profissional.
          </p>
          <div className="mt-12 flex gap-5 justify-center">
            <Link href="/cadastro" className="px-10 py-5 bg-accent text-white font-bold rounded-xl shadow-xl shadow-accent/30 hover:scale-[1.02] active:scale-[0.98] transition-all">Começar Agora</Link>
          </div>
        </header>

        {/* Campaign Carousel replacement for Stats */}
        <section className="relative group w-full max-w-6xl mx-auto mb-20 overflow-hidden rounded-2xl shadow-2xl border border-gray-100">
          {loading ? (
            <div className="w-full aspect-video flex items-center justify-center bg-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            </div>
          ) : campaigns.length > 0 ? (
            <>
              <div
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="w-full flex-shrink-0 relative">
                    <img
                      src={campaign.image_url}
                      alt={campaign.title}
                      className="w-full h-auto block"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-8">
                      <h3 className="text-2xl font-bold text-white uppercase tracking-wider">{campaign.title}</h3>
                    </div>
                  </div>
                ))}
              </div>

              {campaigns.length > 1 && (
                <>
                  <button onClick={prev} className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all">
                    <ChevronLeft className="w-8 h-8" />
                  </button>
                  <button onClick={next} className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all">
                    <ChevronRight className="w-8 h-8" />
                  </button>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
                    {campaigns.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        className={`h-2 rounded-full transition-all ${i === currentIndex ? 'bg-white w-12' : 'bg-white/30 w-2'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full aspect-video flex flex-col items-center justify-center text-gray-400 p-12 text-center bg-white">
              <div className="w-20 h-20 mb-6 bg-gray-50 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </div>
              <p className="text-xl font-bold italic uppercase tracking-widest">Nenhuma campanha ativa no momento</p>
            </div>
          )}
        </section>

        {/* Brand Alliance */}
        <footer className="mt-20 border-t border-gray-100 pt-16 text-center opacity-60">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.4em] mb-12">Marcas Parceiras Oficiais</p>
          <div className="flex flex-wrap justify-center items-center gap-16 grayscale transition-all hover:grayscale-0">
            <div className="flex flex-col items-center group">
              <span className="text-3xl font-black italic tracking-tighter text-gray-900 group-hover:text-accent transition-colors">NIKE</span>
              <span className="text-[10px] font-bold text-gray-400 mt-1">OFFICIAL PARTNER</span>
            </div>
            <div className="flex flex-col items-center group">
              <img src="/brands/dkny.png" alt="Donna Karan" className="h-12 w-auto object-contain opacity-70 group-hover:opacity-100 transition-all" />
              <span className="text-[10px] font-bold text-gray-400 mt-2 tracking-widest">DONNA KARAN</span>
            </div>
            <div className="flex flex-col items-center group">
              <img src="/brands/nautica.png" alt="Náutica" className="h-10 w-auto object-contain opacity-70 group-hover:opacity-100 transition-all" />
              <span className="text-[10px] font-bold text-gray-400 mt-2 tracking-widest uppercase">Náutica</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
