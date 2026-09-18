/**
 * Farmer Audit Log & ID Sequence Safety Utility
 * Tracks who deleted, restored, or permanently deleted farmers.
 * Ensures farmer IDs are never reused after deletion.
 */

export interface FarmerAuditLogEntry {
  id: string;
  action: 'FARMER_DELETED' | 'FARMER_RESTORED' | 'FARMER_PERMANENTLY_DELETED';
  farmerId: string;
  farmerName: string;
  farmerNamePa: string;
  village?: string;
  mobile?: string;
  performedBy: string; // e.g. "Admin / Software Owner", "Firm Operator"
  timestamp: string;
  details?: string;
}

const STORAGE_KEY_AUDIT_LOG = 'mandi_farmer_audit_logs';
const STORAGE_KEY_MAX_FARMER_SEQ = 'mandi_max_farmer_seq';

/**
 * Retrieve all farmer audit log entries
 */
export function getFarmerAuditLogs(): FarmerAuditLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT_LOG);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load farmer audit logs:', err);
    return [];
  }
}

/**
 * Record a farmer audit log entry
 */
export function addFarmerAuditLog(
  entry: Omit<FarmerAuditLogEntry, 'id' | 'timestamp'> & { timestamp?: string }
): FarmerAuditLogEntry {
  try {
    const logs = getFarmerAuditLogs();
    const newEntry: FarmerAuditLogEntry = {
      id: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: entry.timestamp || new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }),
      ...entry
    };

    const updated = [newEntry, ...logs];
    localStorage.setItem(STORAGE_KEY_AUDIT_LOG, JSON.stringify(updated));

    // Also record farmer sequence to prevent ID reuse
    const match = entry.farmerId.match(/^FRM(\d+)$/);
    if (match) {
      recordFarmerSequence(parseInt(match[1], 10));
    }

    return newEntry;
  } catch (err) {
    console.error('Failed to save farmer audit log:', err);
    return {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toLocaleString('en-IN'),
      ...entry
    };
  }
}

/**
 * Records the highest Farmer sequence number seen to ensure
 * old IDs are never reused even after deletion or permanent deletion.
 */
export function recordFarmerSequence(num: number): void {
  try {
    const currentMax = getMaxFarmerSequence();
    if (num > currentMax) {
      localStorage.setItem(STORAGE_KEY_MAX_FARMER_SEQ, String(num));
    }
  } catch (err) {
    console.warn('Failed to record max farmer sequence:', err);
  }
}

/**
 * Returns the highest Farmer sequence number ever allocated.
 */
export function getMaxFarmerSequence(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MAX_FARMER_SEQ);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}
