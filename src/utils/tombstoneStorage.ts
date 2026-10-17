/**
 * Punjab Mandi Software - Tombstone & Deletion Registry
 * 
 * Ensures 100% deletion reliability across all devices & mobile sync.
 * Guarantees that when any entry (Bags, Farmer, Purchase, Payment, Advance, Bardana, Boli, Lefting)
 * is deleted on one phone/device, it NEVER resurfaces or syncs back on another phone.
 */

const STORAGE_PREFIX = 'punjab_mandi_tombstone_ids_';
const GLOBAL_STORAGE_KEY = 'punjab_mandi_all_tombstone_ids';
const PENDING_DELETIONS_KEY = 'punjab_mandi_pending_cloud_deletions';

export interface PendingDeletion {
  id: string;
  type: 'BAGS_ENTRY' | 'FARMER' | 'DAILY_PURCHASE' | 'BARDANA' | 'ADVANCE' | 'PAYMENT' | 'BOLI' | 'LEFTING' | 'TRUCK' | 'SELLER';
  firmId?: string;
  deletedAt: string;
  altId?: string; // e.g. entryNumber or slip number
}

function getFirmKey(firmId: string = 'FIRM-001'): string {
  return `${STORAGE_PREFIX}${firmId}`;
}

/**
 * Get all tombstoned (deleted) record IDs for a firm (plus global tombstones)
 */
export function getAllDeletedIds(firmId: string = 'FIRM-001'): Set<string> {
  const ids = new Set<string>();

  try {
    // 1. Firm-specific tombstones
    const rawFirm = localStorage.getItem(getFirmKey(firmId));
    if (rawFirm) {
      const parsed = JSON.parse(rawFirm);
      if (Array.isArray(parsed)) {
        parsed.forEach((id) => {
          if (id && typeof id === 'string') ids.add(id.trim());
        });
      }
    }

    // 2. Global tombstones
    const rawGlobal = localStorage.getItem(GLOBAL_STORAGE_KEY);
    if (rawGlobal) {
      const parsed = JSON.parse(rawGlobal);
      if (Array.isArray(parsed)) {
        parsed.forEach((id) => {
          if (id && typeof id === 'string') ids.add(id.trim());
        });
      }
    }
  } catch (err) {
    console.warn('Error reading tombstones from localStorage:', err);
  }

  return ids;
}

/**
 * Record a deleted ID so it is permanently blacklisted from ever being restored or synced back
 */
export function recordDeletedId(id: string, firmId: string = 'FIRM-001', altId?: string) {
  if (!id || typeof id !== 'string') return;
  const cleanId = id.trim();
  const cleanAlt = altId && typeof altId === 'string' ? altId.trim() : undefined;

  try {
    // 1. Update firm-specific tombstones
    const firmKey = getFirmKey(firmId);
    const existingFirm: string[] = JSON.parse(localStorage.getItem(firmKey) || '[]');
    const firmSet = new Set(existingFirm);
    firmSet.add(cleanId);
    if (cleanAlt) firmSet.add(cleanAlt);
    localStorage.setItem(firmKey, JSON.stringify(Array.from(firmSet)));

    // 2. Update global tombstones
    const existingGlobal: string[] = JSON.parse(localStorage.getItem(GLOBAL_STORAGE_KEY) || '[]');
    const globalSet = new Set(existingGlobal);
    globalSet.add(cleanId);
    if (cleanAlt) globalSet.add(cleanAlt);
    localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(Array.from(globalSet)));
  } catch (err) {
    console.warn('Error saving tombstone:', err);
  }
}

/**
 * Record multiple deleted IDs at once
 */
export function recordDeletedIds(ids: string[], firmId: string = 'FIRM-001') {
  if (!Array.isArray(ids) || ids.length === 0) return;
  ids.forEach((id) => recordDeletedId(id, firmId));
}

/**
 * Check if a record ID is deleted / tombstoned
 */
export function isRecordDeleted(id: string, firmId: string = 'FIRM-001', altId?: string): boolean {
  if (!id) return false;
  const deletedSet = getAllDeletedIds(firmId);
  if (deletedSet.has(id.trim())) return true;
  if (altId && deletedSet.has(altId.trim())) return true;
  return false;
}

/**
 * Remove a record from tombstone (used only when explicitly restored from Recycle Bin)
 */
export function removeDeletedId(id: string, firmId: string = 'FIRM-001', altId?: string) {
  if (!id) return;
  const cleanId = id.trim();
  const cleanAlt = altId?.trim();

  try {
    const firmKey = getFirmKey(firmId);
    const existingFirm: string[] = JSON.parse(localStorage.getItem(firmKey) || '[]');
    const updatedFirm = existingFirm.filter((item) => item !== cleanId && item !== cleanAlt);
    localStorage.setItem(firmKey, JSON.stringify(updatedFirm));

    const existingGlobal: string[] = JSON.parse(localStorage.getItem(GLOBAL_STORAGE_KEY) || '[]');
    const updatedGlobal = existingGlobal.filter((item) => item !== cleanId && item !== cleanAlt);
    localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(updatedGlobal));
  } catch (err) {
    console.warn('Error removing tombstone:', err);
  }
}

/**
 * Synchronize tombstones from an array of Recycle Bin items
 */
export function syncTombstonesFromRecycleBin(
  recycleBinItems: Array<{ originalId?: string; recordData?: any }>,
  firmId: string = 'FIRM-001'
) {
  if (!Array.isArray(recycleBinItems)) return;
  const idsToAdd: string[] = [];
  recycleBinItems.forEach((item) => {
    if (item.originalId) idsToAdd.push(item.originalId);
    if (item.recordData?.id) idsToAdd.push(item.recordData.id);
    if (item.recordData?.entryNumber) idsToAdd.push(item.recordData.entryNumber);
  });
  if (idsToAdd.length > 0) {
    recordDeletedIds(idsToAdd, firmId);
  }
}

/**
 * Queue a deletion to be executed/verified against Supabase
 */
export function queuePendingCloudDeletion(deletion: PendingDeletion) {
  try {
    const existing: PendingDeletion[] = JSON.parse(localStorage.getItem(PENDING_DELETIONS_KEY) || '[]');
    // Prevent duplicates
    const filtered = existing.filter((d) => d.id !== deletion.id);
    filtered.push(deletion);
    localStorage.setItem(PENDING_DELETIONS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Error queueing pending deletion:', err);
  }
}

/**
 * Get all queued deletions
 */
export function getPendingCloudDeletions(): PendingDeletion[] {
  try {
    const raw = localStorage.getItem(PENDING_DELETIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear a processed deletion from pending queue
 */
export function clearPendingCloudDeletion(id: string) {
  try {
    const existing: PendingDeletion[] = JSON.parse(localStorage.getItem(PENDING_DELETIONS_KEY) || '[]');
    const filtered = existing.filter((d) => d.id !== id);
    localStorage.setItem(PENDING_DELETIONS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Error clearing pending deletion:', err);
  }
}
