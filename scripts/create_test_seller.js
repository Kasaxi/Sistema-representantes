
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yfdvsddvwrutmvnqipnd.supabase.co';
const supabaseKey = 'sb_publishable_XitbQszgS3c9bXAEkECO-Q_QrGgh-aM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestSeller() {
    const email = 'vendedor@teste.com';
    const password = 'vendedor123';

    console.log(`Creating user: ${email}...`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: 'Vendedor Teste',
                role: 'representative',
                status: 'pending', // Will need approval
                brand_id: null // Admin will assign brand? Or let's see. Usually registration has brand selection. Let's assume default or NULL for now.
            }
        }
    });

    if (error) {
        console.error('Error creating user:', error.message);
    } else {
        console.log('User created successfully:', data.user?.id);
        console.log('Provide these credentials to the user.');
    }
}

createTestSeller();
