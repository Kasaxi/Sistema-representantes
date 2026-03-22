"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";
import { toast, Toaster } from "sonner";
import { Plus, Edit, Trash2, Search, Filter } from "lucide-react";

interface Brand {
    id: string;
    name: string;
}

interface Product {
    id: string;
    name: string;
    sku: string;
    brand_id: string;
    unit_cost: number;
    suggested_price: number;
    unit_type: string;
    is_active: boolean;
    brands?: Brand;
}

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        brand_id: "",
        unit_cost: 0,
        suggested_price: 0,
        unit_type: "unidade",
        is_active: true
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [productsRes, brandsRes] = await Promise.all([
            supabase.from("products").select("*, brands(id, name)").order("created_at", { ascending: false }),
            supabase.from("brands").select("id, name").order("name")
        ]);

        if (productsRes.data) setProducts(productsRes.data);
        if (brandsRes.data) setBrands(brandsRes.data);
        setLoading(false);
    };

    const handleOpenModal = (product: Product | null = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                sku: product.sku,
                brand_id: product.brand_id,
                unit_cost: product.unit_cost,
                suggested_price: product.suggested_price,
                unit_type: product.unit_type,
                is_active: product.is_active
            });
        } else {
            setEditingProduct(null);
            setFormData({
                name: "",
                sku: "",
                brand_id: brands[0]?.id || "",
                unit_cost: 0,
                suggested_price: 0,
                unit_type: "unidade",
                is_active: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const payload = { ...formData };

        if (editingProduct) {
            const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
            if (error) {
                toast.error("Erro ao atualizar produto.");
            } else {
                toast.success("Produto atualizado com sucesso!");
                setIsModalOpen(false);
                fetchData();
            }
        } else {
            const { error } = await supabase.from("products").insert([payload]);
            if (error) {
                if (error.code === '23505') toast.error("SKU já cadastrado.");
                else toast.error("Erro ao criar produto.");
            } else {
                toast.success("Produto criado com sucesso!");
                setIsModalOpen(false);
                fetchData();
            }
        }
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardShell userRole="admin">
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestão de Produtos</h1>
                        <p className="text-gray-500 mt-1">Cadastre e gerencie os modelos e SKUs disponíveis.</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 bg-[#0066FF] text-white px-4 py-2.5 rounded-xl font-bold hover:bg-[#0052CC] transition-all shadow-lg shadow-blue-900/10"
                    >
                        <Plus className="w-5 h-5" />
                        Novo Produto
                    </button>
                </div>

                <div className="flex gap-4 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou SKU..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="p-4">SKU / Modelo</th>
                                    <th className="p-4">Marca</th>
                                    <th className="p-4 text-right">Custo Unit.</th>
                                    <th className="p-4 text-right">Preço Sug.</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-gray-400">Carregando produtos...</td>
                                    </tr>
                                ) : filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-gray-400">Nenhum produto encontrado.</td>
                                    </tr>
                                ) : (
                                    filteredProducts.map((product) => (
                                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-gray-900">{product.sku}</div>
                                                <div className="text-gray-500 text-xs">{product.name}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-semibold text-gray-600">
                                                    {product.brands?.name || "Sem marca"}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-mono text-gray-600">
                                                R$ {product.unit_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-4 text-right font-mono text-blue-600 font-bold">
                                                R$ {product.suggested_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 rounded text-[10px] uppercase font-black ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {product.is_active ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => handleOpenModal(product)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                                >
                                                    <Edit className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-8 animate-in zoom-in-95 duration-200">
                            <h2 className="text-2xl font-black text-gray-900 mb-6">
                                {editingProduct ? "Editar Produto" : "Novo Produto"}
                            </h2>
                            <form onSubmit={handleSave} className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Nome do Modelo</label>
                                    <input
                                        type="text" required
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ex: Ray-Ban Aviator Classic"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">SKU / Referência</label>
                                    <input
                                        type="text" required
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        value={formData.sku}
                                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                        placeholder="Ex: RB3025-01"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Marca</label>
                                    <select
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white"
                                        value={formData.brand_id}
                                        onChange={e => setFormData({ ...formData, brand_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Selecione uma marca</option>
                                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Custo Unitário (R$)</label>
                                    <input
                                        type="number" step="0.01" min="0" required
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        value={formData.unit_cost}
                                        onChange={e => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Preço Sugerido (R$)</label>
                                    <input
                                        type="number" step="0.01" min="0" required
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        value={formData.suggested_price}
                                        onChange={e => setFormData({ ...formData, suggested_price: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Unidade</label>
                                    <select
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white"
                                        value={formData.unit_type}
                                        onChange={e => setFormData({ ...formData, unit_type: e.target.value })}
                                    >
                                        <option value="unidade">Peça / Unidade</option>
                                        <option value="par">Par</option>
                                        <option value="caixa">Caixa</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 pt-8">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={formData.is_active}
                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                    />
                                    <label htmlFor="is_active" className="text-sm font-bold text-gray-700">Produto Ativo</label>
                                </div>

                                <div className="col-span-2 flex gap-4 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 rounded-2xl hover:bg-gray-50 font-bold transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-[#0066FF] text-white rounded-2xl hover:bg-[#0052CC] font-bold shadow-lg shadow-blue-900/20 transition-all"
                                    >
                                        {editingProduct ? "Salvar Alterações" : "Cadastrar Produto"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
