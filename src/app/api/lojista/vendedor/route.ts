import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { full_name, email, password } = body;

        if (!email || !password || !full_name) {
            return NextResponse.json(
                { error: 'Preencha todos os campos obrigatórios' },
                { status: 400 }
            );
        }

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

        // 2. Buscar o CNPJ do lojista logado
        // O CNPJ deve ser enviado no body da requisição
        const { cnpj } = body;
        if (!cnpj) {
            // Rollback usuário
            await adminClient.auth.admin.deleteUser(userId);
            return NextResponse.json(
                { error: 'CNPJ da ótica não encontrado' },
                { status: 400 }
            );
        }

        // 3. Criar perfil do vendedor
        const { error: profileError } = await adminClient
            .from('profiles')
            .insert({
                id: userId,
                full_name,
                email,
                cnpj,
                role: 'seller',
                status: 'approved'
            });

        if (profileError) {
            await adminClient.auth.admin.deleteUser(userId);
            return NextResponse.json(
                { error: profileError.message },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Vendedor criado com sucesso',
            seller_id: userId
        });

    } catch (error: any) {
        console.error('Erro ao criar vendedor:', error);
        return NextResponse.json(
            { error: error.message || 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
