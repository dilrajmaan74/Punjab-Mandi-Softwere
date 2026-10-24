import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bktiuuxunjadogposalb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FqksyHDXLoj0Tpf9UjESFg_sxbtujaR';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAllTables() {
  const tables = ['farmers', 'bags_entries', 'bardana_records', 'daily_purchases', 'farmer_payments', 'farmer_advances', 'lefting_records', 'recycle_bin', 'mandi_firms'];
  for (const t of tables) {
    const { data, count, error } = await supabase.from(t).select('*', { count: 'exact', head: false });
    console.log(`Table ${t}: count = ${data?.length || 0}, error = ${error?.message || 'none'}`);
  }
}

checkAllTables();
