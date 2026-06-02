/**
 * NACHA ACH file generator (PPD/CCD credit batches).
 *
 * Produces a spec-compliant 94-character fixed-width file body suitable
 * for upload to most US banks for ACH origination.
 *
 * Reference: NACHA Operating Rules, File Format Specifications.
 */

export interface NachaSettings {
  odfi_routing_number: string;          // 9 digits
  odfi_name: string;                    // <=23 chars
  originator_company_name: string;      // <=16 chars
  originator_company_id: string;        // 10 chars (typically "1" + 9-digit EIN)
  immediate_destination?: string | null; // 9 digits, defaults to ODFI
  immediate_origin?: string | null;      // 10 digits, defaults to company_id
  service_class_code: string;           // 220 = credits only
  sec_code: string;                     // PPD or CCD
  last_file_id_modifier?: string | null;
}

export interface NachaEntry {
  receiver_routing_number: string; // 9 digits (8 + check)
  receiver_account_number: string;
  amount_cents: number;            // amount in pennies
  receiver_name: string;           // landlord/payee name (<=22 chars)
  receiver_id?: string;            // individual ID (<=15 chars)
  account_type?: 'checking' | 'savings';
  trace_seed?: number;             // optional, otherwise auto
}

export interface NachaResult {
  fileContent: string;
  totalEntries: number;
  totalCreditCents: number;
  fileIdModifier: string;
  effectiveEntryDate: string; // YYMMDD
}

// Pad helpers
const padR = (s: string | number, n: number) => String(s ?? '').slice(0, n).padEnd(n, ' ');
const padL = (s: string | number, n: number) => String(s ?? '').slice(0, n).padStart(n, '0');
const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');
const alphaNum = (s: string) => (s || '').replace(/[^A-Za-z0-9 .,&\-/]/g, '').toUpperCase();

function nextFileIdModifier(prev?: string | null): string {
  const seq = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const idx = prev ? seq.indexOf(prev) : -1;
  return seq[(idx + 1) % seq.length];
}

function yymmdd(d: Date): string {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Calculate the entry hash: sum of the first 8 digits of each entry's
 * receiving DFI routing number (transit/ABA without check digit), modulo 10^10.
 */
function entryHash(entries: NachaEntry[]): string {
  const sum = entries.reduce((acc, e) => {
    const aba8 = onlyDigits(e.receiver_routing_number).slice(0, 8);
    return acc + (parseInt(aba8, 10) || 0);
  }, 0);
  return padL(String(sum % 10_000_000_000), 10);
}

export function generateNachaFile(
  settings: NachaSettings,
  entries: NachaEntry[],
  effectiveDate: Date = new Date(Date.now() + 24 * 60 * 60 * 1000), // T+1 default
): NachaResult {
  if (!settings.odfi_routing_number || onlyDigits(settings.odfi_routing_number).length !== 9) {
    throw new Error('Invalid ODFI routing number (must be 9 digits)');
  }
  if (entries.length === 0) {
    throw new Error('No entries to include in NACHA file');
  }

  const now = new Date();
  const fileIdModifier = nextFileIdModifier(settings.last_file_id_modifier);
  const immediateDest = padL(onlyDigits(settings.immediate_destination || settings.odfi_routing_number), 9);
  const immediateOrigin = (settings.immediate_origin || settings.originator_company_id || '').padEnd(10, ' ').slice(0, 10);
  const odfiAba8 = onlyDigits(settings.odfi_routing_number).slice(0, 8);

  const effYYMMDD = yymmdd(effectiveDate);
  const createYYMMDD = yymmdd(now);
  const createHHMM = hhmm(now);

  // ===== File Header (1) =====
  const fileHeader =
    '1' +                                  // Record Type
    '01' +                                 // Priority Code
    ' ' + immediateDest +                  // Immediate Destination (10: blank + 9 digits)
    immediateOrigin +                      // Immediate Origin (10)
    createYYMMDD +                         // File Creation Date
    createHHMM +                           // File Creation Time
    fileIdModifier +                       // File ID Modifier (1)
    '094' +                                // Record Size
    '10' +                                 // Blocking Factor
    '1' +                                  // Format Code
    padR(settings.odfi_name, 23) +         // Immediate Destination Name
    padR(settings.originator_company_name, 23) + // Immediate Origin Name
    padR('', 8);                           // Reference Code

  // ===== Batch Header (5) =====
  const batchNumber = '0000001';
  const batchHeader =
    '5' +
    settings.service_class_code +          // 220 = credits only
    padR(alphaNum(settings.originator_company_name), 16) + // Company Name
    padR('', 20) +                         // Company Discretionary Data
    padR(settings.originator_company_id, 10) + // Company ID
    padR(settings.sec_code, 3) +           // SEC code (PPD/CCD)
    padR('HAP PMT', 10) +                  // Company Entry Description
    padR('', 6) +                          // Company Descriptive Date
    effYYMMDD +                            // Effective Entry Date
    '   ' +                                // Settlement Date (Julian) — bank fills
    '1' +                                  // Originator Status Code
    odfiAba8 +                             // Originating DFI ID (8 digits)
    batchNumber;                           // Batch Number

  // ===== Entry Detail records (6) =====
  const entryLines: string[] = [];
  let totalCreditCents = 0;
  entries.forEach((e, i) => {
    const aba = padL(onlyDigits(e.receiver_routing_number), 9);
    const amount = Math.max(0, Math.round(e.amount_cents));
    totalCreditCents += amount;
    const traceSeq = padL(String(i + 1), 7);
    const txnCode = e.account_type === 'savings' ? '32' : '22'; // checking credit / savings credit
    const detail =
      '6' +
      txnCode +                            // Transaction Code (2)
      aba.slice(0, 8) +                    // RDFI Routing (8 digits)
      aba.slice(8, 9) +                    // Check Digit (1)
      padR(e.receiver_account_number, 17) +// DFI Account Number
      padL(String(amount), 10) +           // Amount (cents, 10)
      padR(e.receiver_id || '', 15) +      // Individual ID
      padR(alphaNum(e.receiver_name), 22) +// Individual Name
      '  ' +                               // Discretionary Data
      '0' +                                // Addenda Indicator
      odfiAba8 + traceSeq;                 // Trace Number (15)
    entryLines.push(detail);
  });

  // ===== Batch Control (8) =====
  const hash = entryHash(entries);
  const batchControl =
    '8' +
    settings.service_class_code +
    padL(String(entries.length), 6) +      // Entry/Addenda Count
    hash +                                 // Entry Hash
    padL('0', 12) +                        // Total Debit Amount
    padL(String(totalCreditCents), 12) +   // Total Credit Amount
    padR(settings.originator_company_id, 10) +
    padR('', 19) +                         // Message Authentication Code (blank)
    padR('', 6) +                          // Reserved
    odfiAba8 +
    batchNumber;

  // ===== File Control (9) =====
  // blocks of 10 records (94 chars each); pad with all-9s lines to reach a 10-record boundary
  const dataRecords = [fileHeader, batchHeader, ...entryLines, batchControl];
  const blockCount = Math.ceil((dataRecords.length + 1) / 10);

  const fileControl =
    '9' +
    padL('1', 6) +                         // Batch Count
    padL(String(blockCount), 6) +          // Block Count
    padL(String(entries.length), 8) +      // Entry/Addenda Count
    hash +                                 // Entry Hash
    padL('0', 12) +                        // Total Debit
    padL(String(totalCreditCents), 12) +   // Total Credit
    padR('', 39);                          // Reserved

  const allRecords = [...dataRecords, fileControl];
  const totalRecords = allRecords.length;
  const recordsToPad = (10 - (totalRecords % 10)) % 10;
  for (let i = 0; i < recordsToPad; i++) {
    allRecords.push('9'.repeat(94));       // Filler line
  }

  const fileContent = allRecords.join('\n') + '\n';

  return {
    fileContent,
    totalEntries: entries.length,
    totalCreditCents,
    fileIdModifier,
    effectiveEntryDate: effYYMMDD,
  };
}

export function downloadNachaFile(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
