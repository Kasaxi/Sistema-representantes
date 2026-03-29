'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export interface CartItem {
    product_id: string
    quantity: number
    unit_price: number
    product_name: string
    sku: string
    current_stock: number
}

export interface SaleResult {
    success: boolean
    sale_id?: string
    error?: string
}

interface InventoryWithProduct {
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

export async function searchProductsForPDV(query: string, opticId: string): Promise<InventoryWithProduct[]> {
    if (!query || query.length < 2) return []

    console.log("[PDV Search] Using RPC, Query:", query, "OpticId:", opticId)

    // Usar função RPC para evitar problemas de RLS
    const { data: products, error } = await supabase
        .rpc('search_pdv_products', {
            p_optic_id: opticId,
            p_query: query
        })

    console.log("[PDV Search] RPC Results:", products)
    console.log("[PDV Search] RPC Error:", error)

    if (!products || products.length === 0) {
        console.log("[PDV Search] No products found")
        return []
    }

    // Converter formato do RPC para formato esperado pelo frontend
    return products.map((p: any) => ({
        current_stock: p.current_stock,
        products: {
            id: p.product_id,
            name: p.product_name,
            sku: p.product_sku,
            category: p.product_category,
            suggested_price: p.product_price,
            attributes: {}
        }
    }))
}

export async function createShopSale(
    items: CartItem[],
    opticId: string,
    sellerId: string
): Promise<SaleResult> {
    console.log('[createShopSale] INIT via RPC with validation')
    
    try {
        // Converter items para JSONB
        const itemsJson = JSON.stringify(items.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price
        })))
        
        console.log('[createShopSale] Calling RPC with:', { opticId, sellerId, itemsJson })

        // Usar RPC para criar venda com validação de marca
        const { data: result, error: rpcError } = await supabase
            .rpc('create_pdv_sale_with_validation', {
                p_optic_id: opticId,
                p_seller_id: sellerId,
                p_items: itemsJson
            })

        console.log('[createShopSale] RPC result:', result)
        console.log('[createShopSale] RPC error:', rpcError)

        if (rpcError) {
            console.error('[createShopSale] RPC Error:', rpcError)
            throw new Error(rpcError.message)
        }

        if (!result) {
            throw new Error('Resultado não retornado')
        }

        const saleResult = result as { sale_id: string; direct_sales: number; pending_validation: number }
        
        let message = 'Venda realizada com sucesso!'
        if (saleResult.pending_validation > 0) {
            message += ` ${saleResult.pending_validation} item(s) aguardando validação do representante.`
        }

        revalidatePath('/lojista/pdv')
        revalidatePath('/lojista/estoque')
        revalidatePath('/lojista/financeiro')

        console.log('[createShopSale] SUCCESS - Sale ID:', saleResult.sale_id)
        return { 
            success: true, 
            sale_id: saleResult.sale_id,
            error: message 
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido'
        console.error('[createShopSale] ERRO FINAL:', message)
        return { success: false, error: message }
    }
}

export async function getTodaySales(opticId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: sales } = await supabase
        .from('shop_sales')
        .select(`
            *,
            shop_sale_items (
                *,
                products (name, sku)
            )
        `)
        .eq('optic_id', opticId)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })

    return sales || []
}
