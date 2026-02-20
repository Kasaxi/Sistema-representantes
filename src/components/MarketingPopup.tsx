"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Campaign {
    id: string;
    image_url: string;
    priority: number;
}

export default function MarketingPopup() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCampaigns() {
            // Se já viu na sessão de navegação atual, não mostra de novo (a menos que seja admin testando, mas deixaremos assim por enquanto)
            if (sessionStorage.getItem('marketing_seen') === 'true') {
                setLoading(false);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get active campaigns within date range
            const now = new Date().toISOString();
            const { data: active } = await supabase
                .from("marketing_campaigns")
                .select("id, image_url, priority")
                .eq("is_active", true)
                .lte("start_date", now)
                .or(`end_date.is.null,end_date.gte.${now}`)
                .order("priority", { ascending: false });

            if (!active || active.length === 0) {
                setLoading(false);
                return;
            }

            // 2. Filter out dismissed ones
            const { data: dismissed } = await supabase
                .from("user_campaign_dismissals")
                .select("campaign_id")
                .eq("user_id", user.id);

            const dismissedIds = new Set(dismissed?.map(d => d.campaign_id) || []);
            const filtered = active.filter(c => !dismissedIds.has(c.id));

            if (filtered.length > 0) {
                setCampaigns(filtered);
                setIsOpen(true);
            }
            setLoading(false);
        }

        fetchCampaigns();
    }, []);

    const handleClose = async () => {
        // Marca na sessão atual que já viu o popup
        sessionStorage.setItem('marketing_seen', 'true');

        if (dontShowAgain) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Register dismissal for all currently shown campaigns (or just the active carousel)
                // User requirement: "não mostrar mais" usually applies to the session or the specific campaign.
                // We'll mark the current one as dismissed in DB.
                const currentCampaign = campaigns[currentIndex];
                await supabase.from("user_campaign_dismissals").insert([{
                    user_id: user.id,
                    campaign_id: currentCampaign.id
                }]);
            }
        }
        setIsOpen(false);
    };

    const next = () => setCurrentIndex((prev) => (prev + 1) % campaigns.length);
    const prev = () => setCurrentIndex((prev) => (prev - 1 + campaigns.length) % campaigns.length);

    if (!isOpen || campaigns.length === 0) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[999] flex items-center justify-center p-4">
            <div className="relative bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-2xl animate-in zoom-in duration-300">

                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Carousel */}
                <div className="relative group bg-gray-50 flex items-center justify-center min-h-[200px]">
                    <img
                        src={campaigns[currentIndex].image_url}
                        alt="Marketing Campaign"
                        className="w-full max-h-[70vh] object-contain"
                    />

                    {campaigns.length > 1 && (
                        <>
                            <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronRight className="w-6 h-6" />
                            </button>

                            {/* Dots */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 p-2 bg-black/20 rounded-full backdrop-blur-sm">
                                {campaigns.map((_, i) => (
                                    <div key={i} className={`h-2 rounded-full transition-all ${i === currentIndex ? 'bg-white w-6' : 'bg-white/50 w-2'}`} />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer / Controls */}
                <div className="p-6 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={dontShowAgain}
                                onChange={e => setDontShowAgain(e.target.checked)}
                            />
                            <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-[#C00000] peer-checked:border-[#C00000] transition-all" />
                            <div className="absolute inset-0 flex items-center justify-center text-white scale-0 peer-checked:scale-100 transition-transform">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                            </div>
                        </div>
                        <span className="text-sm font-bold text-gray-500 group-hover:text-gray-900 transition-colors">Não mostrar novamente</span>
                    </label>

                    <button
                        onClick={handleClose}
                        className="px-8 py-3 bg-[#C00000] text-white font-bold rounded-xl hover:bg-[#A00000] shadow-lg shadow-red-900/10 transition-all active:scale-95"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}
