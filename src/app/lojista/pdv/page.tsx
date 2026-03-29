"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";
import { 
    Search, ShoppingCart, Trash2, Plus, Minus, 
    X, CheckCircle, Receipt, DollarSign
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { searchProductsForPDV, createShopSale, CartItem } from "@/app/actions/sales";

interface ProductResult {
    current_stock: number
    products: {
        id: string
        name: string
        sku: string
        suggested_price: number
        category: string
        attributes: Record<string, unknown>
    }
}

export default function PDVPage() {
    const router = useRouter()
    const searchRef = useRef<HTMLInputElement>(null)
    
    const [opticId, setOpticId] = useState<string | null>(null)
    const [sellerId, setSellerId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<ProductResult[]>([])
    const [cart, setCart] = useState<CartItem[]>([])
    const [loading, setLoading] = useState(false)
    const [processingSale, setProcessingSale] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [todayTotal, setTodayTotal] = useState(0)

    useEffect(() => {
        initializeUser()
        fetchTodayTotal()
    }, [])

    useEffect(() => {
        if (searchQuery.length >= 2 && opticId) {
            searchProducts()
        } else {
            setSearchResults([])
        }
    }, [searchQuery, opticId])

    useEffect(() => {
        searchRef.current?.focus()
    }, [])

    const initializeUser = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/login')
            return
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("id, cnpj, role")
            .eq("id", user.id)
            .single()

        if (!profile?.cnpj) {
            toast.error("CNPJ não vinculado ao perfil.")
            return
        }

        setSellerId(profile.id)

        const { data: optic } = await supabase
            .from("optics")
            .select("id, trade_name")
            .eq("cnpj", profile.cnpj)
            .single()
        
        if (optic) {
            setOpticId(optic.id)
        } else {
            toast.error("Ótica não encontrada para este CNPJ.")
        }
    }

    const fetchTodayTotal = async () => {
        if (!opticId) return

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const { data } = await supabase
            .from('shop_sales')
            .select('total_amount')
            .eq('optic_id', opticId)
            .gte('created_at', today.toISOString())
            .eq('status', 'completed')

        const total = data?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0
        setTodayTotal(total)
    }

    console.log('[PDV] PDV Page loaded!')
    
    const searchProducts = async () => {
        if (!opticId) {
            toast.error("Ótica não identificada. Faça login novamente.")
            return
        }
        setLoading(true)
        
        const results = await searchProductsForPDV(searchQuery, opticId)
        setSearchResults(results as ProductResult[])
        setLoading(false)
    }

    const addToCart = (product: ProductResult) => {
        const existingItem = cart.find(item => item.product_id === product.products.id)
        
        if (existingItem) {
            if (existingItem.quantity >= product.current_stock) {
                toast.error("Estoque insuficiente!")
                return
            }
            setCart(cart.map(item => 
                item.product_id === product.products.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ))
        } else {
            setCart([...cart, {
                product_id: product.products.id,
                quantity: 1,
                unit_price: product.products.suggested_price,
                product_name: product.products.name,
                sku: product.products.sku,
                current_stock: product.current_stock
            }])
        }
        setSearchQuery("")
        setSearchResults([])
        searchRef.current?.focus()
    }

    const updateQuantity = (productId: string, delta: number) => {
        setCart(cart.map(item => {
            if (item.product_id === productId) {
                const newQty = item.quantity + delta
                if (newQty < 1) return item
                if (newQty > item.current_stock) {
                    toast.error("Estoque insuficiente!")
                    return item
                }
                return { ...item, quantity: newQty }
            }
            return item
        }))
    }

    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.product_id !== productId))
        searchRef.current?.focus()
    }

    const cartTotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

    const handleFinishSale = async () => {
        console.log('[PDV Page] handleFinishSale - opticId:', opticId, 'sellerId:', sellerId)
        console.log('[PDV Page] Cart:', JSON.stringify(cart))
        
        if (!opticId || !sellerId || cart.length === 0) {
            console.log('[PDV Page] Validação falhou - opticId:', opticId, 'sellerId:', sellerId, 'cartLength:', cart.length)
            return
        }

        setProcessingSale(true)
        
        console.log('[PDV Page] Calling createShopSale...')
        const result = await createShopSale(cart, opticId, sellerId)
        console.log('[PDV Page] Result:', result)
        
        if (result.success) {
            setShowSuccess(true)
            setCart([])
            setTodayTotal(prev => prev + cartTotal)
            setTimeout(() => {
                setShowSuccess(false)
                searchRef.current?.focus()
            }, 2000)
        } else {
            toast.error(result.error || "Erro ao processar venda")
        }
        
        setProcessingSale(false)
    }

    const formatAttributes = (attributes: any) => {
        if (!attributes) return ""
        const parts = []
        if (attributes.esferico) parts.push(`E:${attributes.esferico}`)
        if (attributes.cilindrico) parts.push(`C:${attributes.cilindrico}`)
        if (attributes.adicao) parts.push(`Add:${attributes.adicao}`)
        if (attributes.indice) parts.push(`Idx:${attributes.indice}`)
        if (attributes.cor) parts.push(attributes.cor)
        if (attributes.tamanho) parts.push(attributes.tamanho)
        return parts.join(" | ")
    }

    if (showSuccess) {
        return (
            <DashboardShell userRole="shopkeeper">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center animate-in zoom-in duration-300">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-12 h-12 text-green-600" />
                        </div>
                        <h2 className="text-3xl font-black text-gray-900">Venda Concluída!</h2>
                        <p className="text-gray-500 mt-2">O estoque foi atualizado automaticamente.</p>
                    </div>
                </div>
            </DashboardShell>
        )
    }

    return (
        <DashboardShell userRole="shopkeeper">
            <Toaster position="top-right" />
            <div className="flex gap-6 h-[calc(100vh-8rem)]">
                {/* Área Principal - Busca e Produtos */}
                <div className="flex-1 flex flex-col gap-4">
                    {/* Header do PDV */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                                <ShoppingCart className="w-6 h-6 text-blue-600" />
                                PDV - Ponto de Venda
                            </h1>
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl">
                                <DollarSign className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-bold text-green-700">
                                    Hoje: R$ {todayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                        
                        {/* Input de Busca */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                ref={searchRef}
                                type="text"
                                placeholder="Digite o SKU ou nome do produto (ou use o leitor de código de barras)..."
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-lg font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        setSearchQuery("")
                                        setSearchResults([])
                                    }
                                }}
                            />
                        </div>

                        {/* Resultados da Busca */}
                        {searchResults.length > 0 && (
                            <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                                {searchResults.map((product, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => addToCart(product)}
                                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                                    >
                                        <div className="text-left">
                                            <div className="font-bold text-gray-900">{product.products.name}</div>
                                            <div className="text-xs text-gray-500">
                                                SKU: {product.products.sku} • {product.products.category}
                                                {formatAttributes(product.products.attributes) && (
                                                    <span className="ml-2 text-blue-600">
                                                        ({formatAttributes(product.products.attributes)})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-green-600">
                                                R$ {product.products.suggested_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Estoque: {product.current_stock}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {loading && (
                            <div className="mt-2 text-center text-gray-500 py-2">
                                Buscando produtos...
                            </div>
                        )}
                    </div>

                    {/* Mensagem de ajuda */}
                    {cart.length === 0 && searchQuery === "" && (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center text-gray-400">
                                <Receipt className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <p className="font-medium">Digite o SKU ou nome do produto para buscar</p>
                                <p className="text-sm mt-1">Use o leitor de código de barras para speed up</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Carrinho Lateral */}
                <div className="w-96 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5" />
                            Carrinho
                            {cartCount > 0 && (
                                <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                                    {cartCount}
                                </span>
                            )}
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {cart.length === 0 ? (
                            <div className="text-center text-gray-400 py-8">
                                <p className="text-sm">Nenhum item no carrinho</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.product_id} className="bg-gray-50 rounded-xl p-3">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <div className="font-bold text-gray-900 text-sm line-clamp-2">{item.product_name}</div>
                                            <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.product_id)}
                                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => updateQuantity(item.product_id, -1)}
                                                className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="w-8 text-center font-bold">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.product_id, 1)}
                                                className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-gray-900">
                                                R$ {(item.unit_price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                R$ {item.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} und
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Total e Finalizar */}
                    {cart.length > 0 && (
                        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-bold text-gray-600">Total</span>
                                <span className="text-2xl font-black text-gray-900">
                                    R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <button
                                onClick={handleFinishSale}
                                disabled={processingSale}
                                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {processingSale ? (
                                    <>Processando...</>
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        Finalizar Venda
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </DashboardShell>
    )
}
