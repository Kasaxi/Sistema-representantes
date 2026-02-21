const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testFetch() {
    console.log("Testing fetch from server...");

    const { data: profiles, error: pError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("role", ["seller", "representative"]);

    if (pError) console.error("Profiles error:", pError);
    else console.log("Profiles found:", profiles.length);

    const { data: optics, error: oError } = await supabase
        .from("optics")
        .select("corporate_name, city, state");

    if (oError) console.error("Optics error:", oError);
    else console.log("Optics found:", optics.length);
}

testFetch();
