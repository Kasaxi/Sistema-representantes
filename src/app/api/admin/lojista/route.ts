import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { full_name, email, password, corporate_name, trade_name, cnpj, city, state } = body;

        if (!email || !password || !full_name || !cnpj || !corporate_name) {
            return NextResponse.json(
                { error: 'Preencha todos os campos obrigatórios' },
                { status: 400 }
            );
        }

        // Criar cliente admin no servidor
        const adminClient = createServerClient();

        // 1. Criar usuário no Auth
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name }
        });

        if (authError) {
            if (authError.message.includes('already been registered')) {
                return NextResponse.json(
                    { error: 'Este email já está cadastrado' },
                    { status: 400 }
                );
            }
            return NextResponse.json(
                { error: authError.message },
                { status: 400 }
            );
        }

        const userId = authData.user?.id;
        if (!userId) {
            return NextResponse.json(
                { error: 'Erro ao criar usuário' },
                { status: 500 }
            );
        }

        // 2. Criar optics
        const { data: optic, error: opticError } = await adminClient
            .from('optics')
            .insert({
                cnpj,
                corporate_name,
                trade_name: trade_name || null,
                city: city || null,
                state: state || null,
                active: true
            })
            .select()
            .single();

        if (opticError) {
            // Rollback usuário
            await adminClient.auth.admin.deleteUser(userId);
            return NextResponse.json(
                { error: opticError.message },
                { status: 400 }
            );
        }

        // 3. Criar perfil
        const { error: profileError } = await adminClient
            .from('profiles')
            .insert({
                id: userId,
                full_name,
                email,
                cnpj,
                role: 'shopkeeper',
                status: 'approved'
            });

        if (profileError) {
            return NextResponse.json(
                { error: profileError.message },
                { status: 400 }
            );
        }

        // 4. Criar assinatura FREE
        await adminClient
            .from('shop_subscriptions')
            .insert({
                optic_id: optic.id,
                plan: 'free',
                status: 'active'
            });

        return NextResponse.json({
            success: true,
            message: 'Lojista criado com sucesso',
            optic_id: optic.id
        });

    } catch (error: any) {
        console.error('Erro ao criar lojista:', error);
        return NextResponse.json(
            { error: error.message || 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
