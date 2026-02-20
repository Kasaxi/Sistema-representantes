"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { Plus, Trash2, Edit2, ToggleLeft, ToggleRight, Calendar, AlertCircle } from "lucide-react";

interface Campaign {
    id: string;
    title: string;
    image_url: string;
    start_date: string;
    end_date: string;
    priority: number;
    is_active: boolean;
    created_at: string;
}

export default function AdminMarketingPage() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCampaign, setCurrentCampaign] = useState<Partial<Campaign> | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `banners/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('marketing_images')
            .upload(filePath, file);

        if (uploadError) {
            alert('Erro no upload da imagem: ' + uploadError.message);
            setUploading(false);
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('marketing_images')
            .getPublicUrl(filePath);

        setCurrentCampaign({ ...currentCampaign, image_url: publicUrl });
        setUploading(false);
    }

    useEffect(() => {
        fetchCampaigns();
    }, []);

    async function fetchCampaigns() {
        setLoading(true);
        const { data, error } = await supabase
            .from("marketing_campaigns")
            .select("*")
            .order("priority", { ascending: false });

        if (data) setCampaigns(data);
        setLoading(false);
    }

    async function handleToggleActive(id: string, currentStatus: boolean) {
        const { error } = await supabase
            .from("marketing_campaigns")
            .update({ is_active: !currentStatus })
            .eq("id", id);

        if (!error) fetchCampaigns();
    }

    async function handleDelete(id: string) {
        if (!confirm("Tem certeza que deseja excluir esta campanha?")) return;

        const { error } = await supabase
            .from("marketing_campaigns")
            .delete()
            .eq("id", id);

        if (!error) fetchCampaigns();
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        const payload = {
            title: currentCampaign?.title,
            image_url: currentCampaign?.image_url,
            start_date: currentCampaign?.start_date,
            end_date: currentCampaign?.end_date || null,
            priority: Number(currentCampaign?.priority) || 0,
            is_active: currentCampaign?.is_active ?? true,
        };

        let error;
        if (currentCampaign?.id) {
            const { error: err } = await supabase
                .from("marketing_campaigns")
                .update(payload)
                .eq("id", currentCampaign.id);
            error = err;
        } else {
            const { error: err } = await supabase
                .from("marketing_campaigns")
                .insert([payload]);
            error = err;
        }

        setSaving(false);
        if (!error) {
            setIsModalOpen(false);
            fetchCampaigns();
        } else {
            alert("Erro ao salvar: " + error.message);
        }
    }

    return (
        <DashboardShell userRole="admin">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Marketing & Campanhas</h1>
                        <p className="text-gray-500">Gerencie os banners e avisos exibidos para os vendedores.</p>
                    </div>
                    <button
                        onClick={() => {
                            setCurrentCampaign({ start_date: new Date().toISOString().split('T')[0], priority: 0, is_active: true });
                            setIsModalOpen(true);
                        }}
                        className="bg-[#C00000] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#A00000] transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Nova Campanha
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C00000]"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {campaigns.map(campaign => (
                            <div key={campaign.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group">
                                <div className="relative aspect-video bg-gray-100">
                                    <img
                                        src={campaign.image_url}
                                        alt={campaign.title}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <button
                                            onClick={() => handleToggleActive(campaign.id, campaign.is_active)}
                                            className={`p-1.5 rounded-lg border shadow-sm transition-colors ${campaign.is_active ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
                                            title={campaign.is_active ? "Desativar" : "Ativar"}
                                        >
                                            {campaign.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <div className="absolute top-2 left-2">
                                        <span className="bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-bold shadow-sm">
                                            Prio: {campaign.priority}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4 flex-1 flex flex-col">
                                    <h3 className="font-bold text-gray-900 mb-2">{campaign.title}</h3>
                                    <div className="text-xs text-gray-500 flex flex-col gap-1 mb-4">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> Início: {new Date(campaign.start_date).toLocaleDateString()}
                                        </div>
                                        {campaign.end_date && (
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> Término: {new Date(campaign.end_date).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-end gap-2 mt-auto pt-4 border-t border-gray-50">
                                        <button
                                            onClick={() => {
                                                setCurrentCampaign(campaign);
                                                setIsModalOpen(true);
                                            }}
                                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(campaign.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {campaigns.length === 0 && (
                            <div className="col-span-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
                                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-gray-900">Nenhuma campanha</h3>
                                <p className="text-gray-500">Comece criando sua primeira campanha de marketing.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de Cadastro/Edição */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="font-bold text-gray-900">{currentCampaign?.id ? "Editar Campanha" : "Nova Campanha"}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Título Interno</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full h-10 px-3 border border-gray-200 rounded-lg outline-none focus:border-[#C00000]"
                                    value={currentCampaign?.title || ""}
                                    onChange={e => setCurrentCampaign({ ...currentCampaign, title: e.target.value })}
                                    placeholder="Ex: Campanha Dia das Mães"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Imagem do Banner</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                        className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#C00000] file:text-white hover:file:bg-[#A00000] transition-all cursor-pointer"
                                    />
                                    {uploading && <span className="text-sm text-gray-500">Enviando...</span>}
                                </div>

                                <p className="text-xs text-blue-600 font-medium mt-2 mb-1">
                                    💡 Resolução Recomendada: 1280x720 pixels (Proporção 16:9)
                                </p>

                                <input
                                    type="url"
                                    className="w-full h-10 px-3 mt-2 border border-gray-200 rounded-lg outline-none focus:border-[#C00000] text-sm text-gray-400 bg-gray-50"
                                    value={currentCampaign?.image_url || ""}
                                    onChange={e => setCurrentCampaign({ ...currentCampaign, image_url: e.target.value })}
                                    placeholder="URL da imagem (Gerada automaticamente após upload)"
                                />
                                {currentCampaign?.image_url && (
                                    <div className="mt-2 text-[10px] text-gray-400 truncate">
                                        Preview: <img src={currentCampaign.image_url} className="h-20 object-contain rounded mt-1 border" alt="Preview" />
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Data Início</label>
                                    <input
                                        required
                                        type="date"
                                        className="w-full h-10 px-3 border border-gray-200 rounded-lg outline-none focus:border-[#C00000]"
                                        value={currentCampaign?.start_date?.split('T')[0] || ""}
                                        onChange={e => setCurrentCampaign({ ...currentCampaign, start_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Data Término (Opcional)</label>
                                    <input
                                        type="date"
                                        className="w-full h-10 px-3 border border-gray-200 rounded-lg outline-none focus:border-[#C00000]"
                                        value={currentCampaign?.end_date?.split('T')[0] || ""}
                                        onChange={e => setCurrentCampaign({ ...currentCampaign, end_date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Prioridade</label>
                                    <input
                                        type="number"
                                        className="w-full h-10 px-3 border border-gray-200 rounded-lg outline-none focus:border-[#C00000]"
                                        value={currentCampaign?.priority || 0}
                                        onChange={e => setCurrentCampaign({ ...currentCampaign, priority: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="flex items-end pb-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="accent-[#C00000]"
                                            checked={currentCampaign?.is_active ?? true}
                                            onChange={e => setCurrentCampaign({ ...currentCampaign, is_active: e.target.checked })}
                                        />
                                        <span className="text-sm font-bold text-gray-700">Ativo</span>
                                    </label>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 font-bold">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2 bg-[#C00000] text-white rounded-lg hover:bg-[#A00000] transition-colors disabled:opacity-50"
                                >
                                    {saving ? "Salvando..." : "Salvar Campanha"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardShell>
    );
}
