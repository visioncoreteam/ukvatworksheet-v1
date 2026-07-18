/**
 * Checkpoint 9 — Smoke test for the rewritten expoGenFunction.js
 * 
 * Verifies the jsonfyInvoiceData function:
 *  1. Returns [MRA_Payload] array of length 1
 *  2. Contains all 20 mandatory MRA fields
 *  3. Does NOT include any forbidden Intermediate_Object fields
 *  4. Has no try/catch wrapper (structure verification via behaviour)
 */

import { jsonfyInvoiceData } from '../expoGenFunction.js';

/** Minimal valid Intermediate_Object for smoke testing */
const MINIMAL_VALID_INPUT = {
  // Enum classification fields
  transactionType:   'B2C',
  personType:        'VATR',
  invoiceTypeDesc:   'STD',
  salesTransactions: 'CASH',

  // Invoice identity
  InvoiceID: 'INV-001',
  IssueDate: '2024-03-15T10:40:30.000Z',

  // Invoice chain
  invoiceCounter:   '5',
  previousNoteHash: 'abc123hash',

  // Not a credit note
  IsCreditNote: false,
  CreditDate:   '',

  // Monetary totals
  Currency:           'MUR',
  TaxTotal:           150.00,
  TaxExclusiveAmount: 1000.00,
  TotalDiscount:      0,

  // Seller (company) data
  companyBizData: {
    name:            'Test Company Ltd',
    tan:             'TAN123456',
    brn:             'BRN789012',
    businessAddr:    '123 Test Street, Port Louis, Mauritius',
    businessPhoneNo: '+23012345678',
    tradeName:       'Test Co',
    ebsCounterNo:    'CTR-01',
  },

  // Buyer (customer) data
  customerData: {
    record_partyName:    'John Doe',
    record_tin:          '',
    record_brn:          '',
    record_businessDesc: '',
    buyerType:           '',
    record_nic:          '',
  },

  // Line items
  LineItems: [
    {
      ItemID:              'ITEM-001',
      ItemName:            'Widget',
      Quantity:            2,
      Price:               500.00,
      Discount:            0,
      LineExtensionAmount: 1000.00,
      TaxTotal:            150.00,
      TaxCatCode:          'TC01',
      TaxCatPercentage:    15,
      isInventory:         true,
    },
  ],
};

const MANDATORY_MRA_FIELDS = [
  'invoiceCounter',
  'transactionType',
  'personType',
  'invoiceTypeDesc',
  'currency',
  'invoiceIdentifier',
  'invoiceRefIdentifier',
  'previousNoteHash',
  'reasonStated',
  'totalVatAmount',
  'totalAmtWoVatCur',
  'totalAmtWoVatMur',
  'invoiceTotal',
  'discountTotalAmount',
  'totalAmtPaid',
  'dateTimeInvoiceIssued',
  'seller',
  'buyer',
  'itemList',
  'salesTransactions',
];

const FORBIDDEN_FIELDS = [
  'irn',
  'irnCode',
  'irnCode_Invoice',
  'irnCode_IssueDate',
  'business_id',
  'accounting_supplier_party',
  'accounting_customer_party',
  'invoice_line',
  'tax_total',
  'legal_monetary_total',
  'billing_reference',
  'InvoiceUID',
  'CreditUID',
  'CreditID',
  'CreditDate',
  'IsCreditNote',
  'CompanyData',
  'companyBizData',
  'customerData',
  'LineItems',
  'TaxSubtotal',
  'payment_means',
  'payment_status',
];

describe('Checkpoint 9 — jsonfyInvoiceData smoke tests', () => {
  let result;
  let payload;

  beforeAll(() => {
    result  = jsonfyInvoiceData(MINIMAL_VALID_INPUT);
    payload = result ? result[0] : null;
  });

  // ── Structure ──────────────────────────────────────────────────────────────

  test('returns an array', () => {
    expect(Array.isArray(result)).toBe(true);
  });

  test('returns an array of length 1', () => {
    expect(result).toHaveLength(1);
  });

  test('first element is a plain object', () => {
    expect(typeof payload).toBe('object');
    expect(payload).not.toBeNull();
    expect(Array.isArray(payload)).toBe(false);
  });

  // ── All 20 mandatory fields present ───────────────────────────────────────

  test.each(MANDATORY_MRA_FIELDS)(
    'mandatory field "%s" is present and not undefined',
    (field) => {
      expect(payload).toHaveProperty(field);
      expect(payload[field]).not.toBeUndefined();
    }
  );

  // ── No forbidden fields ────────────────────────────────────────────────────

  test.each(FORBIDDEN_FIELDS)(
    'forbidden field "%s" is NOT in MRA_Payload',
    (field) => {
      expect(payload).not.toHaveProperty(field);
    }
  );

  // ── Specific field values ──────────────────────────────────────────────────

  test('invoiceCounter is "5"', () => {
    expect(payload.invoiceCounter).toBe('5');
  });

  test('transactionType is "B2C"', () => {
    expect(payload.transactionType).toBe('B2C');
  });

  test('personType is "VATR"', () => {
    expect(payload.personType).toBe('VATR');
  });

  test('invoiceTypeDesc is "STD"', () => {
    expect(payload.invoiceTypeDesc).toBe('STD');
  });

  test('currency defaults to "MUR"', () => {
    expect(payload.currency).toBe('MUR');
  });

  test('invoiceIdentifier is "INV-001"', () => {
    expect(payload.invoiceIdentifier).toBe('INV-001');
  });

  test('invoiceRefIdentifier is "" for STD invoice', () => {
    expect(payload.invoiceRefIdentifier).toBe('');
  });

  test('previousNoteHash passes through unchanged', () => {
    expect(payload.previousNoteHash).toBe('abc123hash');
  });

  test('reasonStated is "" for STD invoice', () => {
    expect(payload.reasonStated).toBe('');
  });

  test('totalVatAmount is "150.00"', () => {
    expect(payload.totalVatAmount).toBe('150.00');
  });

  test('totalAmtWoVatCur is "1000.00"', () => {
    expect(payload.totalAmtWoVatCur).toBe('1000.00');
  });

  test('totalAmtWoVatMur equals totalAmtWoVatCur for MUR currency', () => {
    expect(payload.totalAmtWoVatMur).toBe(payload.totalAmtWoVatCur);
  });

  test('invoiceTotal = totalAmtWoVatCur + totalVatAmount = "1150.00"', () => {
    expect(payload.invoiceTotal).toBe('1150.00');
  });

  test('discountTotalAmount is "0.00"', () => {
    expect(payload.discountTotalAmount).toBe('0.00');
  });

  test('totalAmtPaid = invoiceTotal - discountTotalAmount = "1150.00"', () => {
    expect(payload.totalAmtPaid).toBe('1150.00');
  });

  test('dateTimeInvoiceIssued matches format yyyyMMdd HH:mm:ss', () => {
    expect(payload.dateTimeInvoiceIssued).toMatch(/^\d{8} \d{2}:\d{2}:\d{2}$/);
  });

  test('dateTimeInvoiceIssued is "20240315 10:40:30"', () => {
    expect(payload.dateTimeInvoiceIssued).toBe('20240315 10:40:30');
  });

  test('salesTransactions is "CASH"', () => {
    expect(payload.salesTransactions).toBe('CASH');
  });

  // ── Seller object ──────────────────────────────────────────────────────────

  test('seller has all required fields', () => {
    expect(payload.seller).toMatchObject({
      name:            'Test Company Ltd',
      tan:             'TAN123456',
      brn:             'BRN789012',
      businessAddr:    '123 Test Street, Port Louis, Mauritius',
      businessPhoneNo: '+23012345678',
      tradeName:       'Test Co',
      ebsCounterNo:    'CTR-01',
    });
  });

  // ── Buyer object ───────────────────────────────────────────────────────────

  test('buyer has all required fields (empty for B2C)', () => {
    expect(payload.buyer).toMatchObject({
      name:         'John Doe',
      tan:          '',
      brn:          '',
      businessAddr: '',
      buyerType:    '',
      nic:          '',
    });
  });

  // ── itemList ───────────────────────────────────────────────────────────────

  test('itemList has length 1', () => {
    expect(payload.itemList).toHaveLength(1);
  });

  test('itemList[0] has all required MRA item fields', () => {
    const item = payload.itemList[0];
    expect(item).toMatchObject({
      itemNo:          '1',
      taxCode:         'TC01',
      nature:          'GOODS',
      productCodeMra:  '',
      productCodeOwn:  'ITEM-001',
      itemDesc:        'Widget',
      quantity:        '2.00',
      unitPrice:       '500.00',
      discount:        '0.00',
      discountedValue: '1000.00',
      amtWoVatCur:     '1000.00',
      amtWoVatMur:     '1000.00',
      vatAmt:          '150.00',
      totalPrice:      '1150.00',
    });
  });

  // ── JSON-serializable ──────────────────────────────────────────────────────

  test('output is JSON-serializable (no undefined, functions, or circular refs)', () => {
    const serialized = JSON.stringify(result);
    const roundTripped = JSON.parse(serialized);
    expect(roundTripped).toEqual(result);
  });

  // ── No MRA_Payload only contains explicitly named fields ────────────────────

  test('MRA_Payload has exactly 20 top-level keys', () => {
    expect(Object.keys(payload)).toHaveLength(20);
  });
});
