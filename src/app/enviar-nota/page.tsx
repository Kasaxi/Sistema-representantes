"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import imageCompression from "browser-image-compression";
import DashboardShell from "@/components/DashboardShell";

export default function UploadSalePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);

    // Novas variaveis de estado
    const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
    const [selectedBrand, setSelectedBrand] = useState<string>("");
    const [reference, setReference] = useState<string>("");
    const [taxCouponNumber, setTaxCouponNumber] = useState<string>("");

    useEffect(() => {
        async function fetchInitialData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from("profiles").select("brand_id").eq("id", user.id).single();
                if (profile?.brand_id) setSelectedBrand(profile.brand_id);
            }
            const { data: brandsData } = await supabase.from("brands").select("id, name").order("name");
            console.log("ALL BRANDS IN DB:", brandsData);
            if (brandsData) {
                const allowedBrands = ["nike", "náutica", "nautica", "donna karan", "donna"];
                const filtered = brandsData.filter(b => allowedBrands.some(allowed => b.name.toLowerCase().includes(allowed)));
                console.log("FILTERED BRANDS:", filtered);
                setBrands(filtered);
            }
        }
        fetchInitialData();
    }, []);

    const handleFile = (file: File) => {
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setError("Por favor, selecione apenas arquivos de imagem.");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!reference || reference.trim() === "") {
            setError("O campo 'Referência' é obrigatório.");
            setLoading(false);
            return;
        }

        if (!taxCouponNumber || taxCouponNumber.trim() === "") {
            setError("O 'Número do Cupom Fiscal' é obrigatório.");
            setLoading(false);
            return;
        }

        setUploadProgress("Otimizando imagem...");

        const form = e.currentTarget;
        const formData = new FormData(form);
        let file = formData.get("file") as File;

        if (!file || file.size === 0) {
            setError("Selecione uma imagem para continuar.");
            setLoading(false);
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado.");

            // Check for duplicate tax coupon number
            const { data: duplicateSale, error: duplicateError } = await supabase
                .from("sales")
                .select("id")
                .eq("tax_coupon_number", taxCouponNumber.trim())
                .maybeSingle();

            if (duplicateError) throw duplicateError;
            if (duplicateSale) {
                throw new Error("Este Número de Cupom Fiscal já foi cadastrado anteriormente.");
            }

            const { data: profile } = await supabase.from("profiles").select("brand_id").eq("id", user.id).single();
            if (!profile) throw new Error("Perfil não encontrado.");

            // 1. Compress
            const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true };
            const compressedFile = await imageCompression(file, options);
            setUploadProgress("Enviando para nuvem...");

            // 2. Upload
            const fileExt = file.name.split(".").pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from("notas-fiscais")
                .upload(fileName, compressedFile);

            if (uploadError) throw uploadError;

            // 3. Insert Record
            const { error: saleError } = await supabase.from("sales").insert({
                seller_id: user.id,
                brand_id: selectedBrand || profile.brand_id,
                reference: reference,
                tax_coupon_number: taxCouponNumber.trim(),
                invoice_photo_url: uploadData.path,
                status: "pending",
            });

            if (saleError) throw saleError;

            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Erro ao processar envio.");
            setUploadProgress(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardShell userRole="representative">
            <div className="max-w-3xl mx-auto">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Nova Venda</h1>
                    <p className="text-gray-500">Envie a foto da nota fiscal para contabilizar seus pontos.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-8">

                        {error && (
                            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-[#0066FF] text-blue-700 text-sm font-medium rounded-r">
                                {error}
                            </div>
                        )}

                        <div className="space-y-8">
                            {/* Upload Area */}
                            <div
                                className={`relative group border-2 border-dashed rounded-2xl transition-all h-80 flex flex-col items-center justify-center text-center
                                    ${dragActive ? 'border-[#0066FF] bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                                    ${preview ? 'border-solid border-gray-200 p-4' : 'p-12'}
                                `}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                <input
                                    type="file"
                                    name="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />

                                {preview ? (
                                    <div className="relative w-full h-full">
                                        <img src={preview} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg pointer-events-none">
                                            <p className="text-white font-medium bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">Clique para alterar</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 pointer-events-none">
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-colors ${dragActive ? 'bg-white text-[#0066FF]' : 'bg-gray-100 text-gray-400 group-hover:bg-white group-hover:shadow-md'}`}>
                                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-lg font-semibold text-gray-900">Toque para enviar foto</p>
                                            <p className="text-sm text-gray-500">ou arraste e solte o arquivo aqui</p>
                                        </div>
                                        <div className="pt-2">
                                            <span className="text-xs font-medium text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded border border-gray-100">JPG, PNG até 10MB</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* New Fields: Brand and Reference */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Marca Vendida</label>
                                    <select
                                        required
                                        value={selectedBrand}
                                        onChange={(e) => setSelectedBrand(e.target.value)}
                                        className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF] appearance-none bg-white transition-all text-gray-900"
                                    >
                                        <option value="" disabled>Selecione a marca</option>
                                        {brands.map(brand => (
                                            <option key={brand.id} value={brand.id}>{brand.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Número do Cupom Fiscal</label>
                                    <input
                                        type="text"
                                        required
                                        value={taxCouponNumber}
                                        onChange={(e) => setTaxCouponNumber(e.target.value)}
                                        placeholder="Ex: 000123"
                                        className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF] bg-white transition-all text-gray-900"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Referência</label>
                                    <input
                                        type="text"
                                        required
                                        value={reference}
                                        onChange={(e) => setReference(e.target.value)}
                                        placeholder="Ex: REF-12345"
                                        className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF] bg-white transition-all text-gray-900"
                                    />
                                </div>
                            </div>

                            {/* Guidelines */}
                            <div className="flex gap-4">
                                <div className="flex-1 p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
                                    <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <div>
                                        <h4 className="text-sm font-bold text-blue-900">Legibilidade é Crucial</h4>
                                        <p className="text-xs text-blue-700 mt-1">Certifique-se que o <strong>CNPJ</strong>, <strong>Data</strong> e <strong>Produtos</strong> estejam visíveis.</p>
                                    </div>
                                </div>
                                <div className="flex-1 p-4 bg-yellow-50 rounded-xl border border-yellow-100 flex gap-3">
                                    <svg className="w-5 h-5 text-yellow-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <div>
                                        <h4 className="text-sm font-bold text-yellow-900">Tempo de Análise</h4>
                                        <p className="text-xs text-yellow-700 mt-1">Notas legíveis são aprovadas em até 24 horas úteis.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Actions */}
                        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-end gap-4">
                            <Link href="/dashboard" className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                                Cancelar
                            </Link>
                            <button
                                type="submit"
                                disabled={loading || !preview}
                                className={`
                                    px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2
                                    ${loading || !preview ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-[#0066FF] hover:bg-[#0052CC] hover:shadow-blue-900/20 active:translate-y-0.5'}
                                `}
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        {uploadProgress}
                                    </>
                                ) : (
                                    <>Enviar Nota Fiscal <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardShell>
    );
}
