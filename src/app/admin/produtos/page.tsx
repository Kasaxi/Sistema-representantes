"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";
import { toast, Toaster } from "sonner";
import { Plus, Edit, Trash2, Search, Filter, ChevronLeft, ChevronRight, Tag, Store, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { getMarkupColor } from "@/lib/stockStatus";

interface Brand {
    id: string;
    name: string;
}

interface Product {
    id: string;
    name: string;
    sku: string;
    brand_id: string;
    category: 'lente' | 'armação' | 'receituário' | 'óculos solar';
    unit_cost: number;
    suggested_price: number;
    unit_type: string;
    is_active: boolean;
    attributes?: Record<string, any>;
    brands?: Brand;
}

interface ProductAttributes {
    esferico?: string;
    cilindrico?: string;
    eixo?: string;
    adicao?: string;
    indice?: string;
    cor?: string;
    tamanho?: string;
}

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBrand, setSelectedBrand] = useState("all");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");
    
    type SortKey = 'sku' | 'brand' | 'category' | 'unit_cost' | 'suggested_price' | 'markup' | 'is_active';
    const [sortConfig, setSortConfig] = useState<{ key: SortKey | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        brand_id: "",
        category: "armação" as Product['category'],
        unit_cost: 0,
        suggested_price: 0,
        unit_type: "unidade",
        is_active: true,
        attributes: {} as Record<string, any>
    });

    const [lensAttributes, setLensAttributes] = useState<ProductAttributes>({
        esferico: "",
        cilindrico: "",
        eixo: "",
        adicao: "",
        indice: ""
    });

    const [frameAttributes, setFrameAttributes] = useState<{ cor: string; tamanho: string }>({
        cor: "",
        tamanho: ""
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
                category: product.category,
                unit_cost: product.unit_cost,
                suggested_price: product.suggested_price,
                unit_type: product.unit_type,
                is_active: product.is_active,
                attributes: product.attributes || {}
            });
            
            if (product.category === 'lente') {
                setLensAttributes({
                    esferico: product.attributes?.esferico || "",
                    cilindrico: product.attributes?.cilindrico || "",
                    eixo: product.attributes?.eixo || "",
                    adicao: product.attributes?.adicao || "",
                    indice: product.attributes?.indice || ""
                });
            } else if (product.category === 'armação') {
                setFrameAttributes({
                    cor: product.attributes?.cor || "",
                    tamanho: product.attributes?.tamanho || ""
                });
            }
        } else {
            setEditingProduct(null);
            setFormData({
                name: "",
                sku: "",
                brand_id: brands[0]?.id || "",
                category: "armação",
                unit_cost: 0,
                suggested_price: 0,
                unit_type: "unidade",
                is_active: true,
                attributes: {}
            });
            setLensAttributes({ esferico: "", cilindrico: "", eixo: "", adicao: "", indice: "" });
            setFrameAttributes({ cor: "", tamanho: "" });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let attributes = {};
        
        if (formData.category === 'lente') {
            attributes = {
                esferico: lensAttributes.esferico || null,
                cilindrico: lensAttributes.cilindrico || null,
                eixo: lensAttributes.eixo || null,
                adicao: lensAttributes.adicao || null,
                indice: lensAttributes.indice || null
            };
        } else if (formData.category === 'armação') {
            attributes = {
                cor: frameAttributes.cor || null,
                tamanho: frameAttributes.tamanho || null
            };
        }

        const payload = { ...formData, attributes };

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

    const filteredProducts = products.filter(p => {
        const matchesSearch = searchTerm === "" ||
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesBrand = selectedBrand === "all" || p.brand_id === selectedBrand;
        const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
        const matchesStatus = selectedStatus === "all" ||
            (selectedStatus === "active" && p.is_active) ||
            (selectedStatus === "inactive" && !p.is_active);
        return matchesSearch && matchesBrand && matchesCategory && matchesStatus;
    });

    const sortedProducts = [...filteredProducts].sort((a, b) => {
        if (!sortConfig.key) return 0;
        
        let aVal: any = a[sortConfig.key as keyof Product];
        let bVal: any = b[sortConfig.key as keyof Product];
        
        if (sortConfig.key === 'brand') {
            aVal = a.brands?.name?.toLowerCase() || '';
            bVal = b.brands?.name?.toLowerCase() || '';
        } else if (sortConfig.key === 'markup') {
            aVal = a.unit_cost > 0 ? ((a.suggested_price - a.unit_cost) / a.unit_cost) * 100 : 0;
            bVal = b.unit_cost > 0 ? ((b.suggested_price - b.unit_cost) / b.unit_cost) * 100 : 0;
        } else if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = (bVal as string).toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = sortedProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset to page 1 when any filter changes
    const handleSearch = (value: string) => {
        setSearchTerm(value);
        setCurrentPage(1);
    };
    const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
        setter(value);
        setCurrentPage(1);
    };

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const renderSortIcon = (key: SortKey) => {
        if (sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
        return sortConfig.direction === 'asc' 
            ? <ArrowUp className="w-3 h-3 text-blue-600" />
            : <ArrowDown className="w-3 h-3 text-blue-600" />;
    };

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

                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar por nome ou SKU..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border border-gray-200 shadow-sm">
                            <Tag className="w-4 h-4 text-blue-600" />
                            <select
                                className="text-sm font-bold bg-transparent outline-none"
                                value={selectedBrand}
                                onChange={e => handleFilterChange(setSelectedBrand)(e.target.value)}
                            >
                                <option value="all">Todas Marcas</option>
                                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border border-gray-200 shadow-sm">
                            <Filter className="w-4 h-4 text-blue-600" />
                            <select
                                className="text-sm font-bold bg-transparent outline-none capitalize"
                                value={selectedCategory}
                                onChange={e => handleFilterChange(setSelectedCategory)(e.target.value)}
                            >
                                <option value="all">Todas Categorias</option>
                                <option value="armação">Armação</option>
                                <option value="lente">Lente</option>
                                <option value="receituário">Receituário</option>
                                <option value="óculos solar">Óculos Solar</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl border border-gray-200 shadow-sm">
                            <Store className="w-4 h-4 text-blue-600" />
                            <select
                                className="text-sm font-bold bg-transparent outline-none"
                                value={selectedStatus}
                                onChange={e => handleFilterChange(setSelectedStatus)(e.target.value)}
                            >
                                <option value="all">Todos Status</option>
                                <option value="active">Ativo</option>
                                <option value="inactive">Inativo</option>
                            </select>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">
                        Exibindo {paginatedProducts.length} de {filteredProducts.length} produtos
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors select-none" onClick={() => handleSort('sku')}>
                                        <div className="flex items-center gap-2">SKU / Modelo {renderSortIcon('sku')}</div>
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors select-none" onClick={() => handleSort('brand')}>
                                        <div className="flex items-center gap-2">Marca {renderSortIcon('brand')}</div>
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors select-none" onClick={() => handleSort('category')}>
                                        <div className="flex items-center gap-2">Categoria {renderSortIcon('category')}</div>
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors select-none text-right" onClick={() => handleSort('unit_cost')}>
                                        <div className="flex items-center justify-end gap-2">Custo Unit. {renderSortIcon('unit_cost')}</div>
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors select-none text-right" onClick={() => handleSort('suggested_price')}>
                                        <div className="flex items-center justify-end gap-2">Preço Sug. {renderSortIcon('suggested_price')}</div>
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors select-none text-right" onClick={() => handleSort('markup')}>
                                        <div className="flex items-center justify-end gap-2">Markup {renderSortIcon('markup')}</div>
                                    </th>
                                    <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors select-none text-center" onClick={() => handleSort('is_active')}>
                                        <div className="flex items-center justify-center gap-2">Status {renderSortIcon('is_active')}</div>
                                    </th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="p-12 text-center text-gray-400">Carregando produtos...</td>
                                    </tr>
                                ) : filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-12 text-center text-gray-400">Nenhum produto encontrado.</td>
                                    </tr>
                                ) : (
                                    paginatedProducts.map((product) => {
                                        const markup = product.unit_cost > 0
                                            ? ((product.suggested_price - product.unit_cost) / product.unit_cost) * 100
                                            : 0;
                                        return (
                                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-gray-900">{product.sku}</div>
                                                <div className="text-gray-500 text-xs">{product.name}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] w-fit font-semibold text-gray-600">
                                                    {product.brands?.name || "Sem marca"}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2 py-0.5 bg-blue-50 rounded text-[10px] w-fit font-semibold text-blue-600 capitalize">
                                                    {product.category}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-mono text-gray-600">
                                                R$ {product.unit_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            {/* Correção 7: same color as cost column */}
                                            <td className="p-4 text-right font-mono text-gray-600">
                                                R$ {product.suggested_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            {/* Correção 8: Markup % column */}
                                            <td className="p-4 text-right">
                                                {product.unit_cost > 0 ? (
                                                    <span className={`font-bold font-mono ${getMarkupColor(markup)}`}>
                                                        {markup.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
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
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Correção 9: Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-gray-500 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4" /> Anterior
                            </button>
                            <span className="text-sm font-bold text-gray-500">
                                Página {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-gray-500 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Próximo <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
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
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Categoria</label>
                                    <select
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white capitalize"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value as Product['category'] })}
                                        required
                                    >
                                        <option value="armação">Armação</option>
                                        <option value="lente">Lente</option>
                                        <option value="receituário">Receituário</option>
                                        <option value="óculos solar">Óculos Solar</option>
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

                                {/* Campos específicos para LENTES */}
                                {formData.category === 'lente' && (
                                    <>
                                        <div className="col-span-2 border-t border-gray-200 pt-4 mt-2">
                                            <h3 className="text-sm font-bold text-blue-600 mb-3">Especificações da Lente</h3>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 col-span-2">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">Esférico</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                                    placeholder="Ex: -2.00"
                                                    value={lensAttributes.esferico}
                                                    onChange={e => setLensAttributes({ ...lensAttributes, esferico: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">Cilíndrico</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                                    placeholder="Ex: -1.50"
                                                    value={lensAttributes.cilindrico}
                                                    onChange={e => setLensAttributes({ ...lensAttributes, cilindrico: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">Eixo</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                                    placeholder="0-180"
                                                    value={lensAttributes.eixo}
                                                    onChange={e => setLensAttributes({ ...lensAttributes, eixo: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">Adição</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                                    placeholder="Ex: 2.50"
                                                    value={lensAttributes.adicao}
                                                    onChange={e => setLensAttributes({ ...lensAttributes, adicao: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">Índice</label>
                                                <select
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                                                    value={lensAttributes.indice}
                                                    onChange={e => setLensAttributes({ ...lensAttributes, indice: e.target.value })}
                                                >
                                                    <option value="">Selecione</option>
                                                    <option value="1.50">1.50</option>
                                                    <option value="1.56">1.56</option>
                                                    <option value="1.60">1.60</option>
                                                    <option value="1.67">1.67</option>
                                                    <option value="1.74">1.74</option>
                                                </select>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Campos específicos para ARMAÇÕES */}
                                {formData.category === 'armação' && (
                                    <>
                                        <div className="col-span-2 border-t border-gray-200 pt-4 mt-2">
                                            <h3 className="text-sm font-bold text-blue-600 mb-3">Especificações da Armação</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 col-span-2">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">Cor</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                                    placeholder="Ex: Preto, Azul, Dourado"
                                                    value={frameAttributes.cor}
                                                    onChange={e => setFrameAttributes({ ...frameAttributes, cor: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1">Tamanho</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                                    placeholder="Ex: 52-18-140"
                                                    value={frameAttributes.tamanho}
                                                    onChange={e => setFrameAttributes({ ...frameAttributes, tamanho: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

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
