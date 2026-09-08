import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import {
  Farmer,
  BagsEntryRecord,
  BardanaReceivedRecord,
  DailyPurchaseRecord,
  FarmerPaymentRecord,
  FarmerAdvanceRecord,
  BoliRecord,
  LeftingRecord,
  RecycleBinItem,
  ProcurementAgency,
  PinCodeVillageMapping,
  MandiSettings,
  MandiFirm,
  SellerMaster,
  TruckMasterRecord
} from '../types/mandi';

export interface SupabaseLoadResult {
  success: boolean;
  tablesMissing?: boolean;
  error?: string;
  data?: {
    farmers: Farmer[];
    bagsEntries: BagsEntryRecord[];
    bardanaRecords: BardanaReceivedRecord[];
    dailyPurchaseRecords: DailyPurchaseRecord[];
    farmerPayments: FarmerPaymentRecord[];
    farmerAdvances: FarmerAdvanceRecord[];
    boliRecords: BoliRecord[];
    leftingRecords: LeftingRecord[];
    recycleBinItems: RecycleBinItem[];
    agencies: ProcurementAgency[];
    pinCodes: PinCodeVillageMapping[];
    settings?: MandiSettings;
    firms: MandiFirm[];
    activeFirmId?: string;
    fiscalYears: string[];
    activeFiscalYear?: string;
    sellers: SellerMaster[];
    trucks: TruckMasterRecord[];
  };
}

export interface SupabaseMigrationStats {
  farmers: number;
  bagsEntries: number;
  bardanaRecords: number;
  dailyPurchaseRecords: number;
  farmerPayments: number;
  farmerAdvances: number;
  boliRecords: number;
  leftingRecords: number;
  recycleBin: number;
  agencies: number;
  pinCodes: number;
  firms: number;
  sellers: number;
  trucks: number;
}

/**
 * Get currently authenticated Supabase user
 */
export async function getSupabaseAuthUser() {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return null;
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

/**
 * Check if the current authenticated user has access to the specified firm
 */
export async function checkUserFirmAccess(firmId: string = 'FIRM-001'): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return false;
  try {
    const { data, error } = await client.rpc('user_has_firm_access', { check_firm_id: firmId });
    if (error) {
      console.warn('user_has_firm_access RPC error:', error);
      return false;
    }
    return data === true;
  } catch {
    return false;
  }
}

/**
 * Ensure the currently authenticated user is linked to target firm (default: FIRM-001 Jammu Trading Co)
 * as owner/admin in firm_members table. Securely creates the firm_members record if missing.
 * Verifies user_has_firm_access('FIRM-001') = true.
 */
export async function ensureUserFirmAccess(targetFirmId: string = 'FIRM-001'): Promise<{
  success: boolean;
  hasAccess: boolean;
  userId?: string;
  userEmail?: string;
  role?: string;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) {
    return {
      success: false,
      hasAccess: false,
      error: 'Supabase client is not configured with a valid publishable key.'
    };
  }

  // 1. Check authenticated user
  const { data: userData, error: userError } = await client.auth.getUser();
  const user = userData?.user;
  if (!user || userError) {
    return {
      success: false,
      hasAccess: false,
      error: 'ਸੁਪਾਬੇਸ ਲੌਗਇਨ ਲੋੜੀਂਦਾ ਹੈ (Supabase Auth login required). Please sign in with your Supabase account.'
    };
  }

  try {
    // 2. Check if user already has verified firm access
    const { data: initialAccess, error: checkError } = await client.rpc('user_has_firm_access', {
      check_firm_id: targetFirmId
    });

    if (!checkError && initialAccess === true) {
      return {
        success: true,
        hasAccess: true,
        userId: user.id,
        userEmail: user.email,
        role: 'owner'
      };
    }

    // 3. User is not yet linked or record is missing.
    // Ensure target firm exists in public.mandi_firms table (ignore conflict if already present)
    const defaultFirmPayload = {
      id: targetFirmId,
      name: 'Jammu Trading Co',
      name_pa: 'ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ',
      address: 'Dana Mandi Kang Khurd, Teh. Shahkot, Distt. Jalandhar, Punjab - 144629',
      mobile: '98141-92345',
      licence_no: 'MC/KNG/2024/089',
      market_committee: 'Kang Khurd',
      is_default: true,
      data: {
        id: targetFirmId,
        name: 'Jammu Trading Co',
        namePa: 'ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ',
        isDefault: true
      },
      updated_at: new Date().toISOString()
    };

    try {
      await client
        .from('mandi_firms')
        .insert(defaultFirmPayload);
    } catch (firmErr: any) {
      // Row might already exist in mandi_firms, which is completely fine
    }

    // 4. Call claim_firm_ownership RPC (SECURITY DEFINER stored function)
    try {
      await client.rpc('claim_firm_ownership', { target_firm_id: targetFirmId });
    } catch (claimErr: any) {
      console.warn('claim_firm_ownership notice:', claimErr?.message);
    }

    // 5. Securely insert/upsert into firm_members to guarantee row existence
    // Authenticated users are permitted to insert their own user_id into firm_members per RLS policy
    try {
      await client
        .from('firm_members')
        .insert({
          user_id: user.id,
          firm_id: targetFirmId,
          role: 'owner',
          created_at: new Date().toISOString()
        });
    } catch (memberInsertErr: any) {
      // If already present, attempt upsert
      try {
        await client
          .from('firm_members')
          .upsert({
            user_id: user.id,
            firm_id: targetFirmId,
            role: 'owner',
            created_at: new Date().toISOString()
          }, { onConflict: 'user_id,firm_id' });
      } catch (upsertErr: any) {
        console.warn('firm_members insert notice:', upsertErr?.message);
      }
    }

    // 6. Verify access via user_has_firm_access RPC
    let isVerified = false;
    const { data: verifiedAccess, error: verifyError } = await client.rpc('user_has_firm_access', {
      check_firm_id: targetFirmId
    });

    if (!verifyError && verifiedAccess === true) {
      isVerified = true;
    }

    // Direct table fallback check in case RPC is pending or caching
    if (!isVerified) {
      const { data: memberRow } = await client
        .from('firm_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('firm_id', targetFirmId)
        .maybeSingle();

      if (memberRow) {
        isVerified = true;
      }
    }

    if (!isVerified) {
      return {
        success: false,
        hasAccess: false,
        userId: user.id,
        userEmail: user.email,
        error: verifyError?.message || `Access verification pending for firm ${targetFirmId}.`
      };
    }

    return {
      success: true,
      hasAccess: true,
      userId: user.id,
      userEmail: user.email,
      role: 'owner'
    };
  } catch (err: any) {
    return {
      success: false,
      hasAccess: false,
      userId: user.id,
      userEmail: user.email,
      error: err.message || 'Error occurred while linking firm membership.'
    };
  }
}

/**
 * Check if the relation does not exist error
 */
function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = err.code || '';
  return code === '42P01' || msg.includes('relation') || msg.includes('does not exist') || msg.includes('not found');
}

/**
 * Load all 17 datasets from Supabase PostgreSQL
 */
export async function loadAllDataFromSupabase(): Promise<SupabaseLoadResult> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) {
    return { success: false, error: 'Supabase client is not configured.' };
  }

  try {
    // 1. Mandi Settings
    const settingsRes = await client.from('mandi_settings').select('settings').eq('id', 'default').maybeSingle();
    if (settingsRes.error && isTableMissingError(settingsRes.error)) {
      return { success: false, tablesMissing: true, error: settingsRes.error.message };
    }

    // Run parallel queries across tables
    const [
      farmersRes,
      bagsRes,
      bardanaRes,
      purchasesRes,
      paymentsRes,
      advancesRes,
      boliRes,
      leftingRes,
      recycleRes,
      agenciesRes,
      pinCodesRes,
      firmsRes,
      activeFirmRes,
      fiscalYearsRes,
      activeFiscalRes,
      sellersRes,
      trucksRes
    ] = await Promise.all([
      client.from('farmers').select('data').order('created_at', { ascending: false }),
      client.from('bags_entries').select('data').order('created_at', { ascending: false }),
      client.from('bardana_records').select('data').order('created_at', { ascending: false }),
      client.from('daily_purchases').select('data').order('created_at', { ascending: false }),
      client.from('farmer_payments').select('data').order('created_at', { ascending: false }),
      client.from('farmer_advances').select('data').order('created_at', { ascending: false }),
      client.from('boli_records').select('data').order('created_at', { ascending: false }),
      client.from('lefting_records').select('data').order('created_at', { ascending: false }),
      client.from('recycle_bin').select('data').order('deleted_at', { ascending: false }),
      client.from('procurement_agencies').select('id, name, is_active'),
      client.from('pin_code_mappings').select('pin_code, district, state, villages'),
      client.from('mandi_firms').select('data').order('updated_at', { ascending: false }),
      client.from('active_firm_context').select('firm_id').eq('id', 'current').maybeSingle(),
      client.from('mandi_fiscal_years').select('year').order('year', { ascending: false }),
      client.from('active_fiscal_year_context').select('year').eq('id', 'current').maybeSingle(),
      client.from('seller_masters').select('data').order('updated_at', { ascending: false }),
      client.from('truck_masters').select('data').order('updated_at', { ascending: false })
    ]);

    // Check if any error indicates missing tables
    const anyTableMissing = [
      farmersRes.error,
      bagsRes.error,
      purchasesRes.error,
      leftingRes.error
    ].some((e) => isTableMissingError(e));

    if (anyTableMissing) {
      return { success: false, tablesMissing: true, error: 'One or more Supabase tables are missing.' };
    }

    // Extract records from jsonb data columns
    const farmers: Farmer[] = (farmersRes.data || []).map((r: any) => r.data).filter(Boolean);
    const bagsEntries: BagsEntryRecord[] = (bagsRes.data || []).map((r: any) => r.data).filter(Boolean);
    const bardanaRecords: BardanaReceivedRecord[] = (bardanaRes.data || []).map((r: any) => r.data).filter(Boolean);
    const dailyPurchaseRecords: DailyPurchaseRecord[] = (purchasesRes.data || []).map((r: any) => r.data).filter(Boolean);
    const farmerPayments: FarmerPaymentRecord[] = (paymentsRes.data || []).map((r: any) => r.data).filter(Boolean);
    const farmerAdvances: FarmerAdvanceRecord[] = (advancesRes.data || []).map((r: any) => r.data).filter(Boolean);
    const boliRecords: BoliRecord[] = (boliRes.data || []).map((r: any) => r.data).filter(Boolean);
    const leftingRecords: LeftingRecord[] = (leftingRes.data || []).map((r: any) => r.data).filter(Boolean);
    const recycleBinItems: RecycleBinItem[] = (recycleRes.data || []).map((r: any) => r.data).filter(Boolean);
    
    // Agencies
    const agencies: ProcurementAgency[] = (agenciesRes.data || []).map((r: any) => ({
      id: r.id,
      nameEn: r.name,
      namePa: r.name,
      isDefault: r.is_active
    }));

    // Pin Codes
    const pinCodes: PinCodeVillageMapping[] = (pinCodesRes.data || []).map((r: any) => ({
      pinCode: r.pin_code,
      districtEn: r.district_en || r.district || 'Jalandhar',
      districtPa: r.district_pa || 'ਜਲੰਧਰ',
      villages: r.villages || []
    }));

    // Multi-Firms
    const firms: MandiFirm[] = (firmsRes.data || []).map((r: any) => r.data).filter(Boolean);
    const activeFirmId: string | undefined = activeFirmRes.data?.firm_id;

    // Fiscal Years
    const fiscalYears: string[] = (fiscalYearsRes.data || []).map((r: any) => r.year).filter(Boolean);
    const activeFiscalYear: string | undefined = activeFiscalRes.data?.year;

    // Sellers & Trucks
    const sellers: SellerMaster[] = (sellersRes.data || []).map((r: any) => r.data).filter(Boolean);
    const trucks: TruckMasterRecord[] = (trucksRes.data || []).map((r: any) => r.data).filter(Boolean);

    const settings: MandiSettings | undefined = settingsRes.data?.settings;

    return {
      success: true,
      data: {
        farmers,
        bagsEntries,
        bardanaRecords,
        dailyPurchaseRecords,
        farmerPayments,
        farmerAdvances,
        boliRecords,
        leftingRecords,
        recycleBinItems,
        agencies,
        pinCodes,
        settings,
        firms,
        activeFirmId,
        fiscalYears,
        activeFiscalYear,
        sellers,
        trucks
      }
    };
  } catch (err: any) {
    console.error('Error loading data from Supabase:', err);
    return {
      success: false,
      error: err.message || 'Unknown network error occurred while connecting to Supabase.'
    };
  }
}

/**
 * Upload all current application data to Supabase (Full Initial Migration)
 */
export async function migrateAllDataToSupabase(allData: {
  farmers: Farmer[];
  bagsEntries: BagsEntryRecord[];
  bardanaRecords: BardanaReceivedRecord[];
  dailyPurchaseRecords: DailyPurchaseRecord[];
  farmerPayments: FarmerPaymentRecord[];
  farmerAdvances: FarmerAdvanceRecord[];
  boliRecords: BoliRecord[];
  leftingRecords: LeftingRecord[];
  recycleBinItems: RecycleBinItem[];
  agencies: ProcurementAgency[];
  pinCodes: PinCodeVillageMapping[];
  settings: MandiSettings;
  firms: MandiFirm[];
  activeFirmId: string;
  fiscalYears: string[];
  activeFiscalYear: string;
  sellers: SellerMaster[];
  trucks: TruckMasterRecord[];
}): Promise<{ success: boolean; stats: SupabaseMigrationStats; error?: string }> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) {
    return {
      success: false,
      stats: {
        farmers: 0,
        bagsEntries: 0,
        bardanaRecords: 0,
        dailyPurchaseRecords: 0,
        farmerPayments: 0,
        farmerAdvances: 0,
        boliRecords: 0,
        leftingRecords: 0,
        recycleBin: 0,
        agencies: 0,
        pinCodes: 0,
        firms: 0,
        sellers: 0,
        trucks: 0
      },
      error: 'Supabase client is not configured with a valid publishable key.'
    };
  }

  const stats: SupabaseMigrationStats = {
    farmers: 0,
    bagsEntries: 0,
    bardanaRecords: 0,
    dailyPurchaseRecords: 0,
    farmerPayments: 0,
    farmerAdvances: 0,
    boliRecords: 0,
    leftingRecords: 0,
    recycleBin: 0,
    agencies: 0,
    pinCodes: 0,
    firms: 0,
    sellers: 0,
    trucks: 0
  };

  try {
    // 0. Ensure user is authenticated and linked to the active firm before starting migration
    const firmAccess = await ensureUserFirmAccess(allData.activeFirmId || 'FIRM-001');
    if (!firmAccess.hasAccess) {
      return {
        success: false,
        stats,
        error: firmAccess.error || 'ਸੁਪਾਬੇਸ ਲੌਗਇਨ ਤੇ ਫਰਮ ਐਕਸੈਸ ਲਾਜ਼ਮੀ ਹੈ (Supabase Auth login & FIRM-001 access required).'
      };
    }

    // 1. Settings
    if (allData.settings) {
      const { error: settingsError } = await client.from('mandi_settings').upsert({
        id: 'default',
        settings: allData.settings,
        updated_at: new Date().toISOString()
      });
      if (settingsError) {
        throw new Error(`ਸੈਟਿੰਗਜ਼ ਸਿੰਕ ਅਸਫਲ (Settings sync failed): ${settingsError.message}`);
      }
    }

    // 2. Active contexts
    if (allData.activeFirmId) {
      const { error: firmCtxError } = await client.from('active_firm_context').upsert({
        id: 'current',
        firm_id: allData.activeFirmId,
        updated_at: new Date().toISOString()
      });
      if (firmCtxError) {
        console.warn('active_firm_context sync notice:', firmCtxError.message);
      }
    }

    if (allData.activeFiscalYear) {
      const { error: yearCtxError } = await client.from('active_fiscal_year_context').upsert({
        id: 'current',
        year: allData.activeFiscalYear,
        updated_at: new Date().toISOString()
      });
      if (yearCtxError) {
        console.warn('active_fiscal_year_context sync notice:', yearCtxError.message);
      }
    }

    // 3. Firms
    if (allData.firms.length > 0) {
      const rows = allData.firms.map((f) => ({
        id: f.id,
        name: f.name,
        name_pa: f.namePa || null,
        address: f.address || null,
        mobile: f.mobile || null,
        licence_no: f.licenceNo || null,
        market_committee: f.marketCommittee || null,
        is_default: Boolean(f.isDefault),
        data: f,
        updated_at: new Date().toISOString()
      }));
      const { error: firmError } = await client.from('mandi_firms').upsert(rows);
      if (firmError) {
        throw new Error(`ਫਰਮ ਸਿੰਕ ਅਸਫਲ (Firm sync failed): ${firmError.message}`);
      }
      stats.firms = rows.length;
    }

    // 4. Fiscal Years
    if (allData.fiscalYears.length > 0) {
      const rows = allData.fiscalYears.map((y) => ({
        id: y,
        year: y,
        is_active: y === allData.activeFiscalYear,
        updated_at: new Date().toISOString()
      }));
      const { error: fyError } = await client.from('mandi_fiscal_years').upsert(rows);
      if (fyError) {
        throw new Error(`ਵਿੱਤੀ ਸਾਲ ਸਿੰਕ ਅਸਫਲ (Fiscal years sync failed): ${fyError.message}`);
      }
    }

    // 5. Agencies
    if (allData.agencies.length > 0) {
      const rows = allData.agencies.map((a) => ({
        id: a.id || a.nameEn,
        name: a.nameEn,
        is_active: a.isDefault ?? true,
        updated_at: new Date().toISOString()
      }));
      const { error: agencyError } = await client.from('procurement_agencies').upsert(rows);
      if (agencyError) {
        throw new Error(`ਏਜੰਸੀਆਂ ਸਿੰਕ ਅਸਫਲ (Agencies sync failed): ${agencyError.message}`);
      }
      stats.agencies = rows.length;
    }

    // 6. Pin Codes
    if (allData.pinCodes.length > 0) {
      const rows = allData.pinCodes.map((p) => ({
        id: p.pinCode,
        pin_code: p.pinCode,
        district: p.districtEn || 'Jalandhar',
        district_en: p.districtEn || 'Jalandhar',
        district_pa: p.districtPa || 'ਜਲੰਧਰ',
        villages: p.villages || [],
        updated_at: new Date().toISOString()
      }));
      const { error: pinError } = await client.from('pin_code_mappings').upsert(rows);
      if (pinError) {
        throw new Error(`ਪਿੰਨ ਕੋਡ ਸਿੰਕ ਅਸਫਲ (Pin code sync failed): ${pinError.message}`);
      }
      stats.pinCodes = rows.length;
    }

    // 7. Trucks
    if (allData.trucks.length > 0) {
      const rows = allData.trucks.map((t) => ({
        id: t.id,
        truck_no: t.truckNo,
        driver_name: t.driverName || null,
        driver_mobile: t.driverMobile || t.driverPhone || null,
        truck_union: t.truckUnion || null,
        capacity_bags: t.capacityBags || null,
        notes: t.notes || null,
        data: t,
        updated_at: new Date().toISOString()
      }));
      const { error: truckError } = await client.from('truck_masters').upsert(rows);
      if (truckError) {
        throw new Error(`ਟਰੱਕ ਮਾਸਟਰ ਸਿੰਕ ਅਸਫਲ (Trucks sync failed): ${truckError.message}`);
      }
      stats.trucks = rows.length;
    }

    // 8. Sellers
    if (allData.sellers.length > 0) {
      const targetFirm = allData.activeFirmId || 'FIRM-001';
      const rows = allData.sellers.map((s) => ({
        id: s.id,
        firm_id: s.firmId || targetFirm,
        name: s.name,
        contact_person: s.contactPerson || null,
        mobile: s.mobile || null,
        address: s.address || null,
        gst_no: s.gstin || s.gstinOrLicence || null,
        data: {
          ...s,
          firmId: s.firmId || targetFirm
        },
        updated_at: new Date().toISOString()
      }));
      const { error: sellerError } = await client.from('seller_masters').upsert(rows);
      if (sellerError) {
        throw new Error(`ਸੈਲਰ ਮਾਸਟਰ ਸਿੰਕ ਅਸਫਲ (Sellers sync failed): ${sellerError.message}`);
      }
      stats.sellers = rows.length;
    }

    // 9. Farmers
    if (allData.farmers.length > 0) {
      const rows = allData.farmers.map((f) => ({
        id: f.id,
        firm_id: allData.activeFirmId || 'FIRM-001',
        name: f.farmerName,
        name_pa: f.farmerNamePa || null,
        father_name: f.fatherName || null,
        mobile: f.mobile || null,
        village: f.village || null,
        aadhaar_no: f.aadhaar || null,
        bank_account_no: f.bankDetails?.accountNumber || null,
        ifsc_code: f.bankDetails?.ifscCode || null,
        data: f,
        created_at: f.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      const { error: farmerError } = await client.from('farmers').upsert(rows);
      if (farmerError) {
        throw new Error(`ਕਿਸਾਨ ਡਾਟਾ ਸਿੰਕ ਅਸਫਲ (Farmers sync failed): ${farmerError.message}`);
      }
      stats.farmers = rows.length;
    }

    // 10. Bags Entries
    if (allData.bagsEntries.length > 0) {
      const rows = allData.bagsEntries.map((b) => ({
        id: b.id,
        firm_id: allData.activeFirmId || 'FIRM-001',
        fiscal_year: allData.activeFiscalYear || null,
        farmer_id: b.farmerId,
        entry_no: b.entryNumber,
        date: b.date,
        bag_count: b.bags,
        net_weight_kg: b.totalBagsWeightKg,
        gross_weight_kg: b.grandTotalKg,
        tota_weight_kg: b.totaKg || 0,
        status: 'COMPLETED',
        data: b,
        created_at: b.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      const { error: bagError } = await client.from('bags_entries').upsert(rows);
      if (bagError) {
        throw new Error(`ਬੋਰੀਆਂ ਐਂਟਰੀ ਸਿੰਕ ਅਸਫਲ (Bags entries sync failed): ${bagError.message}`);
      }
      stats.bagsEntries = rows.length;
    }

    // 11. Bardana Records
    if (allData.bardanaRecords.length > 0) {
      const rows = allData.bardanaRecords.map((br) => ({
        id: br.id,
        firm_id: br.firmId || allData.activeFirmId || 'FIRM-001',
        fiscal_year: br.fiscalYear || allData.activeFiscalYear || null,
        farmer_id: null,
        bag_type: br.bardanaType,
        quantity: br.bags,
        issue_date: br.date,
        return_date: null,
        status: br.actionType || null,
        data: br,
        created_at: br.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      const { error: bardanaError } = await client.from('bardana_records').upsert(rows);
      if (bardanaError) {
        throw new Error(`ਬਾਰਦਾਨਾ ਸਿੰਕ ਅਸਫਲ (Bardana records sync failed): ${bardanaError.message}`);
      }
      stats.bardanaRecords = rows.length;
    }

    // 12. Daily Purchases
    if (allData.dailyPurchaseRecords.length > 0) {
      const rows = allData.dailyPurchaseRecords.map((dp) => ({
        id: dp.id,
        firm_id: allData.activeFirmId || 'FIRM-001',
        fiscal_year: allData.activeFiscalYear || null,
        farmer_id: dp.farmerId,
        agency: dp.agency,
        purchase_date: dp.date,
        bags_count: dp.bags,
        total_quintals: dp.qul,
        rate_per_qtl: dp.rate,
        total_amount: dp.totalAmount,
        data: dp,
        created_at: dp.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      const { error: purchaseError } = await client.from('daily_purchases').upsert(rows);
      if (purchaseError) {
        throw new Error(`ਖਰੀਦ ਰਿਕਾਰਡ ਸਿੰਕ ਅਸਫਲ (Purchases sync failed): ${purchaseError.message}`);
      }
      stats.dailyPurchaseRecords = rows.length;
    }

    // 13. Farmer Payments
    if (allData.farmerPayments.length > 0) {
      const rows = allData.farmerPayments.map((p) => ({
        id: p.id,
        firm_id: allData.activeFirmId || 'FIRM-001',
        fiscal_year: allData.activeFiscalYear || null,
        farmer_id: p.farmerId,
        payment_date: p.date,
        amount: p.amount,
        payment_mode: p.paymentMode,
        ref_no: p.referenceNumber || null,
        data: p,
        created_at: p.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      const { error: paymentError } = await client.from('farmer_payments').upsert(rows);
      if (paymentError) {
        throw new Error(`ਭੁਗਤਾਨ ਸਿੰਕ ਅਸਫਲ (Payments sync failed): ${paymentError.message}`);
      }
      stats.farmerPayments = rows.length;
    }

    // 14. Farmer Advances
    if (allData.farmerAdvances.length > 0) {
      const rows = allData.farmerAdvances.map((adv) => ({
        id: adv.id,
        firm_id: allData.activeFirmId || 'FIRM-001',
        fiscal_year: allData.activeFiscalYear || null,
        farmer_id: adv.farmerId,
        advance_date: adv.date,
        amount: adv.amount,
        interest_rate: adv.monthlyInterestRate,
        data: adv,
        created_at: adv.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      const { error: advanceError } = await client.from('farmer_advances').upsert(rows);
      if (advanceError) {
        throw new Error(`ਐਡਵਾਂਸ ਸਿੰਕ ਅਸਫਲ (Advances sync failed): ${advanceError.message}`);
      }
      stats.farmerAdvances = rows.length;
    }

    // 15. Boli Records
    if (allData.boliRecords.length > 0) {
      const rows = allData.boliRecords.map((bo) => ({
        id: bo.id,
        firm_id: allData.activeFirmId || 'FIRM-001',
        fiscal_year: allData.activeFiscalYear || null,
        lot_no: bo.boliNumber || null,
        auction_date: bo.date,
        buyer_name: bo.agency || null,
        winning_bid_rate: bo.rate,
        total_bags: bo.bags,
        data: bo,
        created_at: bo.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      const { error: boliError } = await client.from('boli_records').upsert(rows);
      if (boliError) {
        throw new Error(`ਬੋਲੀ ਸਿੰਕ ਅਸਫਲ (Boli records sync failed): ${boliError.message}`);
      }
      stats.boliRecords = rows.length;
    }

    // 16. Lefting Records
    if (allData.leftingRecords.length > 0) {
      const rows = allData.leftingRecords.map((l) => ({
        id: l.id,
        firm_id: l.firmId || allData.activeFirmId || 'FIRM-001',
        fiscal_year: l.fiscalYear || allData.activeFiscalYear || null,
        gate_pass_no: l.gatePassNo || null,
        dispatch_date: l.dispatchDate || l.date,
        agency: l.agency || null,
        destination: l.destination || null,
        truck_no: l.truckNo,
        driver_name: l.driverName || null,
        driver_phone: l.driverPhone || null,
        bags_count: l.bags,
        total_quintals: l.qul,
        status: l.status,
        data: l,
        created_at: l.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      const { error: leftingError } = await client.from('lefting_records').upsert(rows);
      if (leftingError) {
        throw new Error(`ਲਿਫਟਿੰਗ ਸਿੰਕ ਅਸਫਲ (Lefting records sync failed): ${leftingError.message}`);
      }
      stats.leftingRecords = rows.length;
    }

    // 17. Recycle Bin
    if (allData.recycleBinItems.length > 0) {
      const rows = allData.recycleBinItems.map((r) => ({
        id: r.id,
        firm_id: allData.activeFirmId || 'FIRM-001',
        item_type: r.type,
        original_id: r.originalId,
        deleted_at: r.deletedAt || new Date().toISOString(),
        data: r
      }));
      const { error: recycleError } = await client.from('recycle_bin').upsert(rows);
      if (recycleError) {
        throw new Error(`ਰੀਸਾਈਕਲ ਬਿਨ ਸਿੰਕ ਅਸਫਲ (Recycle bin sync failed): ${recycleError.message}`);
      }
      stats.recycleBin = rows.length;
    }

    return { success: true, stats };
  } catch (err: any) {
    console.error('Error migrating data to Supabase:', err);
    return { success: false, stats, error: err.message || 'Error occurred during migration to Supabase.' };
  }
}

// -----------------------------------------------------------------------------
// GRANULAR REAL-TIME SUPABASE CRUD OPERATIONS
// -----------------------------------------------------------------------------

export async function supabaseUpsertFarmer(farmer: Farmer, firmId?: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    const finalFirmId = (farmer as any).firmId || firmId || null;
    await client.from('farmers').upsert({
      id: farmer.id,
      firm_id: finalFirmId,
      name: farmer.farmerName,
      name_pa: farmer.farmerNamePa || null,
      father_name: farmer.fatherName || null,
      mobile: farmer.mobile || null,
      village: farmer.village || null,
      aadhaar_no: farmer.aadhaar || null,
      bank_account_no: farmer.bankDetails?.accountNumber || null,
      ifsc_code: farmer.bankDetails?.ifscCode || null,
      data: {
        ...farmer,
        firmId: finalFirmId
      },
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Supabase farmer sync error:', err);
  }
}

export async function supabaseDeleteFarmer(farmerId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    await client.from('farmers').delete().eq('id', farmerId);
  } catch (err) {
    console.warn('Supabase farmer delete error:', err);
  }
}

export async function supabaseUpsertBagsEntry(entry: BagsEntryRecord, firmId?: string, fiscalYear?: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    const finalFirmId = entry.firmId || firmId || null;
    const finalFiscalYear = entry.fiscalYear || fiscalYear || null;
    await client.from('bags_entries').upsert({
      id: entry.id,
      firm_id: finalFirmId,
      fiscal_year: finalFiscalYear,
      farmer_id: entry.farmerId,
      entry_no: entry.entryNumber,
      date: entry.date,
      bag_count: entry.bags,
      net_weight_kg: entry.totalBagsWeightKg,
      gross_weight_kg: entry.grandTotalKg,
      tota_weight_kg: entry.totaKg || 0,
      status: 'COMPLETED',
      data: {
        ...entry,
        firmId: finalFirmId,
        fiscalYear: finalFiscalYear
      },
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Supabase bags entry sync error:', err);
  }
}

export async function supabaseDeleteBagsEntry(entryId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    await client.from('bags_entries').delete().eq('id', entryId);
  } catch (err) {
    console.warn('Supabase bags entry delete error:', err);
  }
}

export async function supabaseUpsertBardana(record: BardanaReceivedRecord, firmId?: string, fiscalYear?: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    const finalFirmId = record.firmId || firmId || null;
    const finalFiscalYear = record.fiscalYear || fiscalYear || null;
    await client.from('bardana_records').upsert({
      id: record.id,
      firm_id: finalFirmId,
      fiscal_year: finalFiscalYear,
      bag_type: record.bardanaType,
      quantity: record.bags,
      issue_date: record.date,
      status: record.actionType || null,
      data: {
        ...record,
        firmId: finalFirmId,
        fiscalYear: finalFiscalYear
      },
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Supabase bardana sync error:', err);
  }
}

export async function supabaseDeleteBardana(recordId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    await client.from('bardana_records').delete().eq('id', recordId);
  } catch (err) {
    console.warn('Supabase bardana delete error:', err);
  }
}

export async function supabaseUpsertDailyPurchase(purchase: DailyPurchaseRecord, firmId?: string, fiscalYear?: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    const finalFirmId = purchase.firmId || firmId || null;
    const finalFiscalYear = purchase.fiscalYear || fiscalYear || null;
    await client.from('daily_purchases').upsert({
      id: purchase.id,
      firm_id: finalFirmId,
      fiscal_year: finalFiscalYear,
      farmer_id: purchase.farmerId,
      agency: purchase.agency,
      purchase_date: purchase.date,
      bags_count: purchase.bags,
      total_quintals: purchase.qul,
      rate_per_qtl: purchase.rate,
      total_amount: purchase.totalAmount,
      data: {
        ...purchase,
        firmId: finalFirmId,
        fiscalYear: finalFiscalYear
      },
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Supabase purchase sync error:', err);
  }
}

export async function supabaseDeleteDailyPurchase(purchaseId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    await client.from('daily_purchases').delete().eq('id', purchaseId);
  } catch (err) {
    console.warn('Supabase purchase delete error:', err);
  }
}

export async function supabaseUpsertPayment(payment: FarmerPaymentRecord, firmId?: string, fiscalYear?: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    const finalFirmId = payment.firmId || firmId || null;
    const finalFiscalYear = payment.fiscalYear || fiscalYear || null;
    await client.from('farmer_payments').upsert({
      id: payment.id,
      firm_id: finalFirmId,
      fiscal_year: finalFiscalYear,
      farmer_id: payment.farmerId,
      payment_date: payment.date,
      amount: payment.amount,
      payment_mode: payment.paymentMode,
      ref_no: payment.referenceNumber || null,
      data: {
        ...payment,
        firmId: finalFirmId,
        fiscalYear: finalFiscalYear
      },
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Supabase payment sync error:', err);
  }
}

export async function supabaseDeletePayment(paymentId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    await client.from('farmer_payments').delete().eq('id', paymentId);
  } catch (err) {
    console.warn('Supabase payment delete error:', err);
  }
}

export async function supabaseUpsertAdvance(advance: FarmerAdvanceRecord, firmId?: string, fiscalYear?: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    const finalFirmId = advance.firmId || firmId || null;
    const finalFiscalYear = advance.fiscalYear || fiscalYear || null;
    await client.from('farmer_advances').upsert({
      id: advance.id,
      firm_id: finalFirmId,
      fiscal_year: finalFiscalYear,
      farmer_id: advance.farmerId,
      advance_date: advance.date,
      amount: advance.amount,
      interest_rate: advance.monthlyInterestRate,
      data: {
        ...advance,
        firmId: finalFirmId,
        fiscalYear: finalFiscalYear
      },
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Supabase advance sync error:', err);
  }
}

export async function supabaseDeleteAdvance(advanceId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    await client.from('farmer_advances').delete().eq('id', advanceId);
  } catch (err) {
    console.warn('Supabase advance delete error:', err);
  }
}

export async function supabaseUpsertBoli(boli: BoliRecord, firmId?: string, fiscalYear?: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    const finalFirmId = boli.firmId || firmId || null;
    const finalFiscalYear = boli.fiscalYear || fiscalYear || null;
    await client.from('boli_records').upsert({
      id: boli.id,
      firm_id: finalFirmId,
      fiscal_year: finalFiscalYear,
      lot_no: boli.boliNumber || null,
      auction_date: boli.date,
      buyer_name: boli.agency || null,
      winning_bid_rate: boli.rate,
      total_bags: boli.bags,
      data: {
        ...boli,
        firmId: finalFirmId,
        fiscalYear: finalFiscalYear
      },
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Supabase boli sync error:', err);
  }
}

export async function supabaseDeleteBoli(boliId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    await client.from('boli_records').delete().eq('id', boliId);
  } catch (err) {
    console.warn('Supabase boli delete error:', err);
  }
}

export async function supabaseUpsertLefting(lefting: LeftingRecord, firmId?: string, fiscalYear?: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    const finalFirmId = lefting.firmId || firmId || null;
    const finalFiscalYear = lefting.fiscalYear || fiscalYear || null;
    await client.from('lefting_records').upsert({
      id: lefting.id,
      firm_id: finalFirmId,
      fiscal_year: finalFiscalYear,
      gate_pass_no: lefting.gatePassNo || null,
      dispatch_date: lefting.dispatchDate || lefting.date,
      agency: lefting.agency || null,
      destination: lefting.destination || null,
      truck_no: lefting.truckNo,
      driver_name: lefting.driverName || null,
      driver_phone: lefting.driverPhone || null,
      bags_count: lefting.bags,
      total_quintals: lefting.qul,
      status: lefting.status,
      data: {
        ...lefting,
        firmId: finalFirmId,
        fiscalYear: finalFiscalYear
      },
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Supabase lefting sync error:', err);
  }
}

export async function supabaseDeleteLefting(leftingId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    await client.from('lefting_records').delete().eq('id', leftingId);
  } catch (err) {
    console.warn('Supabase lefting delete error:', err);
  }
}

export async function supabaseUpsertTruck(truck: TruckMasterRecord): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    await client.from('truck_masters').upsert({
      id: truck.id,
      truck_no: truck.truckNo,
      driver_name: truck.driverName || null,
      driver_mobile: truck.driverMobile || truck.driverPhone || null,
      truck_union: truck.truckUnion || null,
      capacity_bags: truck.capacityBags || null,
      notes: truck.notes || null,
      data: truck,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Supabase truck sync error:', err);
  }
}

export async function supabaseDeleteTruck(truckId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    await client.from('truck_masters').delete().eq('id', truckId);
  } catch (err) {
    console.warn('Supabase truck delete error:', err);
  }
}

export async function supabaseUpsertSeller(seller: SellerMaster, firmId?: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    const finalFirmId = seller.firmId || firmId || 'FIRM-001';
    await client.from('seller_masters').upsert({
      id: seller.id,
      firm_id: finalFirmId,
      name: seller.name,
      contact_person: seller.contactPerson || null,
      mobile: seller.mobile || null,
      address: seller.address || null,
      gst_no: seller.gstin || seller.gstinOrLicence || null,
      data: {
        ...seller,
        firmId: finalFirmId
      },
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Supabase seller sync error:', err);
  }
}

export async function supabaseDeleteSeller(sellerId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    await client.from('seller_masters').delete().eq('id', sellerId);
  } catch (err) {
    console.warn('Supabase seller delete error:', err);
  }
}

export async function supabaseUpsertFirm(firm: MandiFirm): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    await client.from('mandi_firms').upsert({
      id: firm.id,
      name: firm.name,
      name_pa: firm.namePa || null,
      address: firm.address || null,
      mobile: firm.mobile || null,
      licence_no: firm.licenceNo || null,
      market_committee: firm.marketCommittee || null,
      is_default: Boolean(firm.isDefault),
      data: firm,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Supabase firm sync error:', err);
  }
}

export async function supabaseDeleteFirm(firmId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    await client.from('mandi_firms').delete().eq('id', firmId);
  } catch (err) {
    console.warn('Supabase firm delete error:', err);
  }
}

export async function supabaseSaveActiveFirmContext(firmId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    await client.from('active_firm_context').upsert({
      id: 'current',
      firm_id: firmId,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Supabase active firm context error:', err);
  }
}

export async function supabaseSaveFiscalYears(years: string[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    const rows = years.map((y) => ({
      id: y,
      year: y,
      updated_at: new Date().toISOString()
    }));
    await client.from('mandi_fiscal_years').upsert(rows);
  } catch (err) {
    console.warn('Supabase fiscal years error:', err);
  }
}

export async function supabaseSaveActiveFiscalYearContext(year: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    await client.from('active_fiscal_year_context').upsert({
      id: 'current',
      year: year,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Supabase active year error:', err);
  }
}

export async function supabaseSaveAgencies(agencies: ProcurementAgency[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    const rows = agencies.map((a) => ({
      id: a.id || a.nameEn,
      name: a.nameEn,
      is_active: a.isDefault ?? true,
      updated_at: new Date().toISOString()
    }));
    await client.from('procurement_agencies').upsert(rows);
  } catch (err) {
    console.warn('Supabase agencies save error:', err);
  }
}

export async function supabaseSaveSettings(settings: MandiSettings): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    await client.from('mandi_settings').upsert({
      id: 'default',
      settings,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Supabase settings save error:', err);
  }
}

export async function supabaseSavePinCodes(pinCodes: PinCodeVillageMapping[]): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    const rows = pinCodes.map((p) => ({
      id: p.pinCode,
      pin_code: p.pinCode,
      district: p.districtEn || 'Jalandhar',
      district_en: p.districtEn || 'Jalandhar',
      district_pa: p.districtPa || 'ਜਲੰਧਰ',
      villages: p.villages || [],
      updated_at: new Date().toISOString()
    }));
    await client.from('pin_code_mappings').upsert(rows);
  } catch (err) {
    console.warn('Supabase pin codes save error:', err);
  }
}

export async function supabaseUpsertRecycleItem(item: RecycleBinItem, firmId?: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    const finalFirmId = (item as any).firmId || firmId || null;
    await client.from('recycle_bin').upsert({
      id: item.id,
      firm_id: finalFirmId,
      item_type: item.type,
      original_id: item.originalId,
      deleted_at: item.deletedAt || new Date().toISOString(),
      data: {
        ...item,
        firmId: finalFirmId
      }
    });
  } catch (err) {
    console.warn('Supabase recycle bin upsert error:', err);
  }
}

export async function supabaseDeleteRecycleItem(itemId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    await client.from('recycle_bin').delete().eq('id', itemId);
  } catch (err) {
    console.warn('Supabase recycle bin delete error:', err);
  }
}

export async function supabaseClearRecycleBin(): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) return;
  try {
    await client.from('recycle_bin').delete().neq('id', '');
  } catch (err) {
    console.warn('Supabase recycle bin clear error:', err);
  }
}
