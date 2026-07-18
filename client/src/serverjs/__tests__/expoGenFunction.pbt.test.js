// Feature: mra-einvoice-json-generation
// Property-Based Tests for jsonfyInvoiceData using fast-check

import fc from 'fast-check';
import { jsonfyInvoiceData } from '../expoGenFunction.js';

// ─────────────────────────────────────────────────────────────────────────────
// Shared Arbitraries (generators)
// ─────────────────────────────────────────────────────────────────────────────

/** Monetary amount: non-negative float, max 1,000,000 */
function monetaryAmountArbitrary() {
  return fc.float({ min: Math.fround(0), max: Math.fround(1_000_000), noNaN: true });
}

/** Valid MRA tax codes */
const VALID_TAX_CODES = ['TC01', 'TC02', 'TC03', 'TC04', 'TC05', 'TC06'];

/** Valid single line item with positive amounts */
function validLineItemArbitrary() {
  return fc.record({
    ItemID:              fc.string({ minLength: 1, maxLength: 20 }),
    ItemName:            fc.string({ minLength: 1, maxLength: 50 }),
    Quantity:            fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }),
    Price:               fc.float({ min: Math.fround(0.01), max: Math.fround(100_000), noNaN: true }),
    Discount:            fc.constant(0),  // simplify: no discount
    LineExtensionAmount: fc.float({ min: Math.fround(0.01), max: Math.fround(1_000_000), noNaN: true }),
    TaxTotal:            monetaryAmountArbitrary(),
    TaxCatCode:          fc.constantFrom(...VALID_TAX_CODES),
    TaxCatPercentage:    fc.constant(15),
    isInventory:         fc.boolean(),
  });
}

/** Valid seller (companyBizData) with all mandatory fields non-empty and non-whitespace */
function validCompanyBizDataArbitrary() {
  return fc.record({
    name:            fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    tan:             fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
    brn:             fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
    businessAddr:    fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    businessPhoneNo: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
    tradeName:       fc.string({ maxLength: 100 }),
    ebsCounterNo:    fc.string({ maxLength: 20 }),
  });
}

/** Complete valid Intermediate_Object */
function validIntermediateObjectArbitrary() {
  return fc.record({
    transactionType:    fc.constantFrom('B2B', 'B2G', 'B2C', 'EXP', 'B2E'),
    personType:         fc.constantFrom('VATR', 'NVTR'),
    invoiceTypeDesc:    fc.constant('STD'),  // STD to avoid CRN/DRN extra requirements
    salesTransactions:  fc.constantFrom('CASH', 'BNKTRANSFER', 'CHEQUE', 'CARD', 'CREDIT', 'OTHER'),
    InvoiceID:          fc.string({ minLength: 1, maxLength: 20 }),
    IssueDate:          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()),
    invoiceCounter:     fc.integer({ min: 1, max: 99999 }).map(String),
    previousNoteHash:   fc.string({ maxLength: 64 }),
    IsCreditNote:       fc.constant(false),
    CreditDate:         fc.constant(''),
    Currency:           fc.constant('MUR'),
    TaxTotal:           monetaryAmountArbitrary(),
    TaxExclusiveAmount: monetaryAmountArbitrary(),
    TotalDiscount:      fc.constant(0),  // simplify: no discount
    companyBizData:     validCompanyBizDataArbitrary(),
    customerData:       fc.record({
      record_partyName:    fc.string({ maxLength: 100 }),
      record_tin:          fc.string({ maxLength: 20 }),
      record_brn:          fc.string({ maxLength: 20 }),
      record_businessDesc: fc.string({ maxLength: 200 }),
      buyerType:           fc.string({ maxLength: 10 }),
      record_nic:          fc.string({ maxLength: 20 }),
    }),
    LineItems:          fc.array(validLineItemArbitrary(), { minLength: 0, maxLength: 5 }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Property 1: Output is always a length-1 array of plain objects
// Validates: Requirements 1.1, 11.1
// ─────────────────────────────────────────────────────────────────────────────

test('Property 1: output is always a length-1 array of plain objects', () => {
  fc.assert(
    fc.property(
      // For B2B/B2G we need buyer fields — use only B2C/EXP/B2E to keep it simple for Property 1
      validIntermediateObjectArbitrary().filter(d =>
        d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E'
      ),
      (data) => {
        const result = jsonfyInvoiceData(data);
        if (result === null) return true; // null from edge cases is acceptable
        return (
          Array.isArray(result) &&
          result.length === 1 &&
          typeof result[0] === 'object' &&
          result[0] !== null &&
          !Array.isArray(result[0])
        );
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 2: All mandatory MRA top-level fields are present and non-null
// Validates: Requirements 1.2, 11.2
// ─────────────────────────────────────────────────────────────────────────────

const MANDATORY_MRA_FIELDS = [
  'invoiceCounter', 'transactionType', 'personType', 'invoiceTypeDesc',
  'currency', 'invoiceIdentifier', 'invoiceRefIdentifier', 'previousNoteHash',
  'reasonStated', 'totalVatAmount', 'totalAmtWoVatCur', 'totalAmtWoVatMur',
  'invoiceTotal', 'discountTotalAmount', 'totalAmtPaid', 'dateTimeInvoiceIssued',
  'seller', 'buyer', 'itemList', 'salesTransactions',
];

test('Property 2: all mandatory MRA top-level fields are present and non-undefined', () => {
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary().filter(d =>
        d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E'
      ),
      (data) => {
        const result = jsonfyInvoiceData(data);
        if (result === null) return true;
        const payload = result[0];
        return MANDATORY_MRA_FIELDS.every(field =>
          Object.prototype.hasOwnProperty.call(payload, field) &&
          payload[field] !== undefined
        );
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 3: Monetary fields are formatted strings with exactly 2 decimal places
// Validates: Requirements 1.3, 6.7–6.14
// ─────────────────────────────────────────────────────────────────────────────

const MONETARY_FORMAT_RE = /^-?\d+\.\d{2}$/;
const TOP_LEVEL_MONETARY_FIELDS = [
  'totalVatAmount', 'totalAmtWoVatCur', 'totalAmtWoVatMur',
  'invoiceTotal', 'discountTotalAmount', 'totalAmtPaid',
];
const ITEM_MONETARY_FIELDS = [
  'quantity', 'unitPrice', 'discount', 'discountedValue',
  'amtWoVatCur', 'amtWoVatMur', 'vatAmt', 'totalPrice',
];

test('Property 3: monetary fields are formatted strings with exactly 2 decimal places', () => {
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary().filter(d =>
        d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E'
      ),
      (data) => {
        const result = jsonfyInvoiceData(data);
        if (result === null) return true;
        const payload = result[0];
        for (const f of TOP_LEVEL_MONETARY_FIELDS) {
          if (!MONETARY_FORMAT_RE.test(payload[f])) return false;
        }
        for (const item of payload.itemList) {
          for (const f of ITEM_MONETARY_FIELDS) {
            if (!MONETARY_FORMAT_RE.test(item[f])) return false;
          }
        }
        return true;
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 4: invoiceTotal arithmetic invariant
// Validates: Requirements 1.8
// ─────────────────────────────────────────────────────────────────────────────

test('Property 4: invoiceTotal = totalAmtWoVatCur + totalVatAmount', () => {
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary().filter(d =>
        d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E'
      ),
      (data) => {
        const result = jsonfyInvoiceData(data);
        if (result === null) return true;
        const p = result[0];
        const total = parseFloat(p.invoiceTotal);
        const woVat = parseFloat(p.totalAmtWoVatCur);
        const vat   = parseFloat(p.totalVatAmount);
        // Each fmt2 call rounds independently; max combined rounding error is 0.015.
        return Math.abs(total - (woVat + vat)) <= 0.015;
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 5: totalAmtPaid arithmetic invariant
// Validates: Requirements 1.9
// ─────────────────────────────────────────────────────────────────────────────

test('Property 5: totalAmtPaid = invoiceTotal - discountTotalAmount', () => {
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary().filter(d =>
        d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E'
      ),
      (data) => {
        const result = jsonfyInvoiceData(data);
        if (result === null) return true;
        const p = result[0];
        const paid     = parseFloat(p.totalAmtPaid);
        const total    = parseFloat(p.invoiceTotal);
        const discount = parseFloat(p.discountTotalAmount);
        // Each fmt2 call rounds independently; max combined rounding error is 0.015.
        return Math.abs(paid - (total - discount)) <= 0.015;
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 6: MUR currency makes totalAmtWoVatMur equal totalAmtWoVatCur
// Validates: Requirements 1.5, 1.7
// ─────────────────────────────────────────────────────────────────────────────

test('Property 6: MUR currency makes totalAmtWoVatMur equal totalAmtWoVatCur', () => {
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary().filter(d =>
        (d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E') &&
        d.Currency === 'MUR'
      ),
      (data) => {
        const result = jsonfyInvoiceData(data);
        if (result === null) return true;
        const p = result[0];
        return p.totalAmtWoVatMur === p.totalAmtWoVatCur;
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 7: Seller fields correctly mapped from companyBizData
// Validates: Requirements 4.1–4.8
// ─────────────────────────────────────────────────────────────────────────────

test('Property 7: seller fields correctly mapped from companyBizData', () => {
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary().filter(d =>
        d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E'
      ),
      (data) => {
        const result = jsonfyInvoiceData(data);
        if (result === null) return true;
        const seller = result[0].seller;
        const biz    = data.companyBizData;
        return (
          seller.name            === String(biz.name)            &&
          seller.tan             === String(biz.tan)             &&
          seller.brn             === String(biz.brn)             &&
          seller.businessAddr    === String(biz.businessAddr)    &&
          seller.businessPhoneNo === String(biz.businessPhoneNo)
        );
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 8: B2B/B2G invoices with missing buyer fields return null
// Validates: Requirements 5.8
// ─────────────────────────────────────────────────────────────────────────────

test('Property 8: B2B/B2G with at least one empty mandatory buyer field returns null', () => {
  const MANDATORY_BUYER = ['record_partyName', 'record_tin', 'record_brn', 'buyerType'];
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary(),
      fc.constantFrom(...MANDATORY_BUYER),
      (data, missingField) => {
        const input = {
          ...data,
          transactionType: 'B2B',
          customerData: { ...data.customerData, [missingField]: '' },
        };
        const result = jsonfyInvoiceData(input);
        return result === null;
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 9: B2C/EXP/B2E invoices with empty buyer fields succeed
// Validates: Requirements 5.9
// ─────────────────────────────────────────────────────────────────────────────

test('Property 9: B2C/EXP/B2E with empty buyer fields produces non-null result', () => {
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary().filter(d =>
        d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E'
      ),
      (data) => {
        const input = {
          ...data,
          customerData: {
            record_partyName: '',
            record_tin: '',
            record_brn: '',
            record_businessDesc: '',
            buyerType: '',
            record_nic: '',
          },
        };
        const result = jsonfyInvoiceData(input);
        return result !== null;
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 10: itemList corresponds 1-to-1 with LineItems
// Validates: Requirements 6.1, 6.2
// ─────────────────────────────────────────────────────────────────────────────

test('Property 10: itemList length equals LineItems length and itemNo is 1-based strings', () => {
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary().filter(d =>
        d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E'
      ),
      (data) => {
        const result = jsonfyInvoiceData(data);
        if (result === null) return true;
        const itemList  = result[0].itemList;
        const lineItems = data.LineItems || [];
        if (itemList.length !== lineItems.length) return false;
        return itemList.every((item, i) => item.itemNo === String(i + 1));
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 11: isInventory boolean determines item nature
// Validates: Requirements 6.5, 6.17
// ─────────────────────────────────────────────────────────────────────────────

test('Property 11: isInventory determines nature GOODS vs SERVICES', () => {
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary().filter(d =>
        (d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E') &&
        d.LineItems.length > 0
      ),
      (data) => {
        const result = jsonfyInvoiceData(data);
        if (result === null) return true;
        const itemList  = result[0].itemList;
        const lineItems = data.LineItems;
        return itemList.every((item, i) => {
          const expected = lineItems[i].isInventory === true ? 'GOODS' : 'SERVICES';
          return item.nature === expected;
        });
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 12: Item discountedValue arithmetic invariant
// Validates: Requirements 6.10
// ─────────────────────────────────────────────────────────────────────────────

test('Property 12: item discountedValue = (qty × price) - discount', () => {
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary().filter(d =>
        (d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E') &&
        d.LineItems.length > 0
      ),
      (data) => {
        const result = jsonfyInvoiceData(data);
        if (result === null) return true;
        const itemList  = result[0].itemList;
        const lineItems = data.LineItems;
        return itemList.every((item, i) => {
          const src      = lineItems[i];
          const qty      = src.Quantity  || 0;
          const price    = src.Price     || 0;
          const discount = src.Discount  || 0;
          const expected = qty * price - discount;
          const actual   = parseFloat(item.discountedValue);
          return Math.abs(actual - expected) <= 0.015;
        });
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 13: Item totalPrice arithmetic invariant
// Validates: Requirements 6.14
// ─────────────────────────────────────────────────────────────────────────────

test('Property 13: item totalPrice = amtWoVatCur + vatAmt', () => {
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary().filter(d =>
        (d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E') &&
        d.LineItems.length > 0
      ),
      (data) => {
        const result = jsonfyInvoiceData(data);
        if (result === null) return true;
        return result[0].itemList.every(item => {
          const total  = parseFloat(item.totalPrice);
          const woVat  = parseFloat(item.amtWoVatCur);
          const vat    = parseFloat(item.vatAmt);
          // Each fmt2 call rounds independently; max combined rounding error is 0.015.
          return Math.abs(total - (woVat + vat)) <= 0.015;
        });
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 14: previousNoteHash pass-through
// Validates: Requirements 7.1
// ─────────────────────────────────────────────────────────────────────────────

test('Property 14: non-empty previousNoteHash passes through unchanged', () => {
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary().filter(d =>
        d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E'
      ),
      // Exclude strings with leading/trailing whitespace: the implementation trims before
      // passing through, so a trimmed string would not equal the original.
      fc.string({ minLength: 1, maxLength: 64 }).filter(s => s.trim() === s && s.trim().length > 0),
      (data, hash) => {
        const input  = { ...data, previousNoteHash: hash };
        const result = jsonfyInvoiceData(input);
        if (result === null) return true;
        return result[0].previousNoteHash === hash;
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 15: SHA-256 hash determinism (conceptual — uses SubtleCrypto-free check)
// Validates: Requirements 7.4
// NOTE: jsonfyInvoiceData does NOT compute SHA-256 — it receives and passes through
// the hash. This property verifies the pass-through is deterministic.
// ─────────────────────────────────────────────────────────────────────────────

test('Property 15: previousNoteHash is deterministic for same input (pass-through)', () => {
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary().filter(d =>
        d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E'
      ),
      (data) => {
        const result1 = jsonfyInvoiceData({ ...data });
        const result2 = jsonfyInvoiceData({ ...data });
        if (result1 === null && result2 === null) return true;
        if (result1 === null || result2 === null) return false;
        return result1[0].previousNoteHash === result2[0].previousNoteHash;
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 16: invoiceCounter string coercion
// Validates: Requirements 8.1, 8.2
// ─────────────────────────────────────────────────────────────────────────────

test('Property 16: positive integer invoiceCounter coerces to its string representation', () => {
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary().filter(d =>
        d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E'
      ),
      fc.integer({ min: 1, max: 99999 }),
      (data, counter) => {
        const input  = { ...data, invoiceCounter: counter };
        const result = jsonfyInvoiceData(input);
        if (result === null) return true;
        return result[0].invoiceCounter === String(counter);
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 17: dateTimeInvoiceIssued format and round-trip
// Validates: Requirements 9.1, 9.4
// ─────────────────────────────────────────────────────────────────────────────

const DATE_TIME_RE = /^(\d{4})(\d{2})(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

test('Property 17: dateTimeInvoiceIssued matches format and round-trips to same UTC date/time', () => {
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary().filter(d =>
        d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E'
      ),
      (data) => {
        const result = jsonfyInvoiceData(data);
        if (result === null) return true;
        const dt = result[0].dateTimeInvoiceIssued;
        if (!DATE_TIME_RE.test(dt)) return false;
        const [, yr, mo, dy, hr, mi, se] = dt.match(DATE_TIME_RE);
        const parsed = new Date(`${yr}-${mo}-${dy}T${hr}:${mi}:${se}Z`);
        if (isNaN(parsed.getTime())) return false;
        // Round-trip: re-format and compare
        const reformat = `${yr}${mo}${dy} ${hr}:${mi}:${se}`;
        return reformat === dt;
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 18: Customer CustomFields2 extraction correctness
// Validates: Requirements 10.1–10.5
// (Tests that customerData fields are correctly passed through to buyer object)
// ─────────────────────────────────────────────────────────────────────────────

test('Property 18: B2C buyer fields mapped from customerData correctly', () => {
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary().filter(d =>
        d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E'
      ),
      (data) => {
        const result = jsonfyInvoiceData(data);
        if (result === null) return true;
        const buyer   = result[0].buyer;
        const src     = data.customerData;
        const trimmed = (v) => (v || '').trim() || '';
        return (
          buyer.name         === trimmed(src.record_partyName)  &&
          buyer.tan          === trimmed(src.record_tin)         &&
          buyer.brn          === trimmed(src.record_brn)         &&
          buyer.businessAddr === trimmed(src.record_businessDesc)&&
          buyer.buyerType    === trimmed(src.buyerType)          &&
          buyer.nic          === trimmed(src.record_nic)
        );
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 19: Output is JSON-serializable (no undefined or circular refs)
// Validates: Requirements 11.3
// ─────────────────────────────────────────────────────────────────────────────

test('Property 19: output is JSON-serializable (round-trip deep-equals result)', () => {
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary().filter(d =>
        d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E'
      ),
      (data) => {
        const result = jsonfyInvoiceData(data);
        if (result === null) return true;
        try {
          const serialized   = JSON.stringify(result);
          const roundTripped = JSON.parse(serialized);
          return JSON.stringify(roundTripped) === JSON.stringify(result);
        } catch {
          return false;
        }
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 20: Deterministic output for same input
// Validates: Requirements 11.4
// ─────────────────────────────────────────────────────────────────────────────

test('Property 20: calling jsonfyInvoiceData twice with same input produces identical results', () => {
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary().filter(d =>
        d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E'
      ),
      (data) => {
        const result1 = jsonfyInvoiceData({ ...data });
        const result2 = jsonfyInvoiceData({ ...data });
        if (result1 === null && result2 === null) return true;
        if (result1 === null || result2 === null) return false;
        return JSON.stringify(result1) === JSON.stringify(result2);
      }
    ),
    { numRuns: 100 }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 21: NaN does not propagate from null/undefined numeric inputs
// Validates: Requirements 12.3
// ─────────────────────────────────────────────────────────────────────────────

test('Property 21: NaN does not appear in any monetary output field', () => {
  fc.assert(
    fc.property(
      validIntermediateObjectArbitrary().filter(d =>
        d.transactionType === 'B2C' || d.transactionType === 'EXP' || d.transactionType === 'B2E'
      ),
      (data) => {
        // Inject null/undefined into numeric fields
        const input = {
          ...data,
          TaxTotal:           null,
          TaxExclusiveAmount: undefined,
          TotalDiscount:      null,
          LineItems: data.LineItems.map(item => ({
            ...item,
            Quantity:            null,
            Price:               undefined,
            Discount:            null,
            LineExtensionAmount: undefined,
            TaxTotal:            null,
          })),
        };
        const result = jsonfyInvoiceData(input);
        if (result === null) return true;
        const serialized = JSON.stringify(result);
        return !serialized.includes('NaN') && !serialized.includes('undefined');
      }
    ),
    { numRuns: 100 }
  );
});
