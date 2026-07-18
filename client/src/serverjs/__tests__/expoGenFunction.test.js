/**
 * Task 10.2 — Comprehensive unit tests for jsonfyInvoiceData
 *
 * Covers:
 *  - Each console.error return-null path
 *  - Credit note (CRN) and debit note (DRN) path tests
 *  - dateTimeInvoiceIssued formatting edge cases
 *  - Empty LineItems array
 *  - invoiceCounter edge cases
 *  - Enum default fallback (invalid value → default + console.warn)
 *
 * Requirements: 1.1, 1.2, 2.6–2.9, 3.1–3.4, 4.9, 5.8, 6.4, 8.3, 8.4, 9.2, 9.3, 12.1, 12.4
 */

import { jsonfyInvoiceData } from '../expoGenFunction.js';

// ─── Helper: build a complete valid Intermediate_Object ───────────────────────

function makeValidInput(overrides = {}) {
  return {
    transactionType:    'B2C',
    personType:         'VATR',
    invoiceTypeDesc:    'STD',
    salesTransactions:  'CASH',
    InvoiceID:          'INV-001',
    IssueDate:          '2024-03-15T10:40:30.000Z',
    invoiceCounter:     '5',
    previousNoteHash:   '0',
    IsCreditNote:       false,
    CreditDate:         '',
    Currency:           'MUR',
    TaxTotal:           150,
    TaxExclusiveAmount: 1000,
    TotalDiscount:      0,
    companyBizData: {
      name:            'Test Co Ltd',
      tan:             'TAN123',
      brn:             'BRN456',
      businessAddr:    '123 Test St',
      businessPhoneNo: '+2301234567',
      tradeName:       '',
      ebsCounterNo:    '',
    },
    customerData: {
      record_partyName:    '',
      record_tin:          '',
      record_brn:          '',
      record_businessDesc: '',
      buyerType:           '',
      record_nic:          '',
    },
    LineItems: [
      {
        ItemID:              'I1',
        ItemName:            'Widget',
        Quantity:            1,
        Price:               1000,
        Discount:            0,
        LineExtensionAmount: 1000,
        TaxTotal:            150,
        TaxCatCode:          'TC01',
        TaxCatPercentage:    15,
        isInventory:         false,
      },
    ],
    ...overrides,
  };
}

// ─── 1. console.error return-null paths ──────────────────────────────────────

describe('null input guard — Requirement 12.1', () => {
  let errorSpy;
  beforeEach(() => { errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { errorSpy.mockRestore(); });

  test('null input returns null', () => {
    expect(jsonfyInvoiceData(null)).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  test('undefined input returns null', () => {
    expect(jsonfyInvoiceData(undefined)).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  test('number input returns null', () => {
    expect(jsonfyInvoiceData(42)).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  test('string input returns null', () => {
    expect(jsonfyInvoiceData('hello')).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  test('array input returns null', () => {
    expect(jsonfyInvoiceData([{ InvoiceID: 'X' }])).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});

// ─── 2. Mandatory seller fields — Requirement 4.9 ────────────────────────────

describe('mandatory seller fields — Requirement 4.9', () => {
  let errorSpy;
  beforeEach(() => { errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { errorSpy.mockRestore(); });

  test('missing seller name returns null', () => {
    const input = makeValidInput({ companyBizData: { ...makeValidInput().companyBizData, name: '' } });
    expect(jsonfyInvoiceData(input)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('name'));
  });

  test('missing seller tan returns null', () => {
    const input = makeValidInput({ companyBizData: { ...makeValidInput().companyBizData, tan: '' } });
    expect(jsonfyInvoiceData(input)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('tan'));
  });

  test('missing seller brn returns null', () => {
    const input = makeValidInput({ companyBizData: { ...makeValidInput().companyBizData, brn: '' } });
    expect(jsonfyInvoiceData(input)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('brn'));
  });

  test('missing seller businessAddr returns null', () => {
    const input = makeValidInput({ companyBizData: { ...makeValidInput().companyBizData, businessAddr: '' } });
    expect(jsonfyInvoiceData(input)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('businessAddr'));
  });

  test('missing seller businessPhoneNo returns null', () => {
    const input = makeValidInput({ companyBizData: { ...makeValidInput().companyBizData, businessPhoneNo: '' } });
    expect(jsonfyInvoiceData(input)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('businessPhoneNo'));
  });

  test('whitespace-only seller name returns null', () => {
    const input = makeValidInput({ companyBizData: { ...makeValidInput().companyBizData, name: '   ' } });
    expect(jsonfyInvoiceData(input)).toBeNull();
  });
});

// ─── 3. B2B buyer validation — Requirement 5.8 ───────────────────────────────

describe('B2B buyer field validation — Requirement 5.8', () => {
  let errorSpy;
  beforeEach(() => { errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { errorSpy.mockRestore(); });

  const b2bBase = () => makeValidInput({
    transactionType: 'B2B',
    customerData: {
      record_partyName:    'Acme Ltd',
      record_tin:          'TIN001',
      record_brn:          'BRNACME',
      record_businessDesc: '10 Company Ave',
      buyerType:           'VATR',
      record_nic:          '',
    },
  });

  test('B2B with missing buyer name returns null', () => {
    const input = b2bBase();
    input.customerData.record_partyName = '';
    expect(jsonfyInvoiceData(input)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('name'));
  });

  test('B2B with missing buyer tan returns null', () => {
    const input = b2bBase();
    input.customerData.record_tin = '';
    expect(jsonfyInvoiceData(input)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('tan'));
  });

  test('B2B with missing buyer brn returns null', () => {
    const input = b2bBase();
    input.customerData.record_brn = '';
    expect(jsonfyInvoiceData(input)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('brn'));
  });

  test('B2B with missing buyer buyerType returns null', () => {
    const input = b2bBase();
    input.customerData.buyerType = '';
    expect(jsonfyInvoiceData(input)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('buyerType'));
  });

  test('valid B2B with all buyer fields returns payload', () => {
    const input = b2bBase();
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── 4. CRN / DRN invoiceRefIdentifier validation — Requirement 3.3 ──────────

describe('CRN/DRN invoiceRefIdentifier validation — Requirement 3.3', () => {
  let errorSpy;
  beforeEach(() => { errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { errorSpy.mockRestore(); });

  test('CRN with missing invoiceRefIdentifier (no InvoiceID, no irnCode_Invoice) returns null', () => {
    const input = makeValidInput({
      invoiceTypeDesc:     'CRN',
      InvoiceID:           '',
      irnCode_Invoice:     '',
      CreditRemark:        'Overcharge',
    });
    expect(jsonfyInvoiceData(input)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('invoiceRefIdentifier'));
  });

  test('DRN with missing invoiceRefIdentifier returns null', () => {
    const input = makeValidInput({
      invoiceTypeDesc:     'DRN',
      InvoiceID:           '',
      irnCode_Invoice:     '',
      CreditRemark:        'Additional charge',
    });
    expect(jsonfyInvoiceData(input)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('invoiceRefIdentifier'));
  });
});

// ─── 5. Invalid tax code — Requirement 6.4 ───────────────────────────────────

describe('invalid tax code validation — Requirement 6.4', () => {
  let errorSpy;
  beforeEach(() => { errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { errorSpy.mockRestore(); });

  test('invalid tax code (e.g. "TC99") returns null', () => {
    const input = makeValidInput({
      LineItems: [{ ...makeValidInput().LineItems[0], TaxCatCode: 'TC99' }],
    });
    expect(jsonfyInvoiceData(input)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('TC99'));
  });

  test('empty string tax code returns null', () => {
    const input = makeValidInput({
      LineItems: [{ ...makeValidInput().LineItems[0], TaxCatCode: '' }],
    });
    expect(jsonfyInvoiceData(input)).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});

// ─── 6. Non-MUR currency missing TotalAmtWoVatMur — Requirement 1.6 ──────────

describe('non-MUR currency requires TotalAmtWoVatMur — Requirement 1.6', () => {
  let errorSpy;
  beforeEach(() => { errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { errorSpy.mockRestore(); });

  test('non-MUR currency without TotalAmtWoVatMur returns null', () => {
    const input = makeValidInput({ Currency: 'USD' });
    // TotalAmtWoVatMur not set in makeValidInput
    expect(jsonfyInvoiceData(input)).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('totalAmtWoVatMur'));
  });

  test('non-MUR currency with TotalAmtWoVatMur provided returns payload', () => {
    const input = makeValidInput({ Currency: 'USD', TotalAmtWoVatMur: 2500 });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].totalAmtWoVatMur).toBe('2500.00');
  });
});

// ─── 7. Invalid / missing IssueDate — Requirement 1.4, 9.x ──────────────────

describe('invalid IssueDate returns null — Requirement 1.4', () => {
  let errorSpy;
  beforeEach(() => { errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { errorSpy.mockRestore(); });

  test('missing IssueDate returns null', () => {
    const input = makeValidInput({ IssueDate: '' });
    expect(jsonfyInvoiceData(input)).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  test('invalid date string returns null', () => {
    const input = makeValidInput({ IssueDate: 'not-a-date' });
    expect(jsonfyInvoiceData(input)).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});

// ─── 8. Credit note path tests — Requirement 3.1, 3.2, 3.4 ──────────────────

describe('CRN path — invoiceTypeDesc, invoiceRefIdentifier, reasonStated — Requirement 3.1, 3.2', () => {
  test('CRN sets invoiceTypeDesc to "CRN"', () => {
    const input = makeValidInput({
      invoiceTypeDesc:  'CRN',
      InvoiceID:        'INV-ORIG-001',
      irnCode_Invoice:  '',
      CreditRemark:     'Pricing error corrected',
    });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].invoiceTypeDesc).toBe('CRN');
  });

  test('CRN uses InvoiceID as invoiceRefIdentifier when irnCode_Invoice is absent', () => {
    const input = makeValidInput({
      invoiceTypeDesc: 'CRN',
      InvoiceID:       'INV-ORIG-001',
      irnCode_Invoice: '',
      CreditRemark:    'Pricing error corrected',
    });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].invoiceRefIdentifier).toBe('INV-ORIG-001');
  });

  test('CRN uses irnCode_Invoice as invoiceRefIdentifier when present', () => {
    const input = makeValidInput({
      invoiceTypeDesc: 'CRN',
      InvoiceID:       'INV-ORIG-001',
      irnCode_Invoice: 'IRN-ORIG-XYZ',
      CreditRemark:    'Pricing error corrected',
    });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].invoiceRefIdentifier).toBe('IRN-ORIG-XYZ');
  });

  test('CRN sets reasonStated to CreditRemark', () => {
    const input = makeValidInput({
      invoiceTypeDesc: 'CRN',
      InvoiceID:       'INV-ORIG-001',
      irnCode_Invoice: '',
      CreditRemark:    'Pricing error corrected',
    });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].reasonStated).toBe('Pricing error corrected');
  });

  test('CRN with no CreditRemark defaults reasonStated to "No reason provided"', () => {
    const input = makeValidInput({
      invoiceTypeDesc: 'CRN',
      InvoiceID:       'INV-ORIG-001',
      irnCode_Invoice: '',
      CreditRemark:    '',
    });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].reasonStated).toBe('No reason provided');
  });
});

describe('DRN path — invoiceTypeDesc, invoiceRefIdentifier, reasonStated — Requirement 3.1, 3.2', () => {
  test('DRN sets invoiceTypeDesc to "DRN"', () => {
    const input = makeValidInput({
      invoiceTypeDesc:  'DRN',
      InvoiceID:        'INV-ORIG-002',
      irnCode_Invoice:  '',
      CreditRemark:     'Additional services charged',
    });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].invoiceTypeDesc).toBe('DRN');
  });

  test('DRN sets invoiceRefIdentifier and reasonStated correctly', () => {
    const input = makeValidInput({
      invoiceTypeDesc:  'DRN',
      InvoiceID:        'INV-ORIG-002',
      irnCode_Invoice:  '',
      CreditRemark:     'Additional services charged',
    });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].invoiceRefIdentifier).toBe('INV-ORIG-002');
    expect(result[0].reasonStated).toBe('Additional services charged');
  });
});

describe('STD invoice has empty invoiceRefIdentifier and reasonStated — Requirement 3.4', () => {
  test('STD invoice sets invoiceRefIdentifier to ""', () => {
    const result = jsonfyInvoiceData(makeValidInput());
    expect(result[0].invoiceRefIdentifier).toBe('');
  });

  test('STD invoice sets reasonStated to ""', () => {
    const result = jsonfyInvoiceData(makeValidInput());
    expect(result[0].reasonStated).toBe('');
  });
});

// ─── 9. dateTimeInvoiceIssued formatting — Requirement 9.2, 9.3 ──────────────

describe('dateTimeInvoiceIssued formatting — Requirement 9.2, 9.3', () => {
  test('full ISO timestamp with time formats to "yyyyMMdd HH:mm:ss"', () => {
    const input = makeValidInput({ IssueDate: '2024-03-15T10:40:30.000Z' });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].dateTimeInvoiceIssued).toBe('20240315 10:40:30');
  });

  test('date-only string "2024-03-15" formats with time "00:00:00"', () => {
    const input = makeValidInput({ IssueDate: '2024-03-15' });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].dateTimeInvoiceIssued).toBe('20240315 00:00:00');
  });

  test('output format matches /^\\d{8} \\d{2}:\\d{2}:\\d{2}$/', () => {
    const input = makeValidInput({ IssueDate: '2023-12-31T23:59:59.000Z' });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].dateTimeInvoiceIssued).toMatch(/^\d{8} \d{2}:\d{2}:\d{2}$/);
  });

  test('invalid date "not-a-date" returns null', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const input = makeValidInput({ IssueDate: 'not-a-date' });
    expect(jsonfyInvoiceData(input)).toBeNull();
    errorSpy.mockRestore();
  });
});

// ─── 10. Empty LineItems array — Requirement 12.4 ────────────────────────────

describe('empty LineItems array — Requirement 12.4', () => {
  test('empty LineItems returns payload with empty itemList', () => {
    const input = makeValidInput({ LineItems: [] });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(Array.isArray(result[0].itemList)).toBe(true);
    expect(result[0].itemList).toHaveLength(0);
  });

  test('absent LineItems returns payload with empty itemList', () => {
    const input = makeValidInput();
    delete input.LineItems;
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(Array.isArray(result[0].itemList)).toBe(true);
    expect(result[0].itemList).toHaveLength(0);
  });
});

// ─── 11. invoiceCounter edge cases — Requirement 8.3, 8.4 ───────────────────

describe('invoiceCounter edge cases — Requirement 8.3, 8.4', () => {
  let warnSpy;
  beforeEach(() => { warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warnSpy.mockRestore(); });

  test('absent invoiceCounter → "1" with console.warn', () => {
    const input = makeValidInput();
    delete input.invoiceCounter;
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].invoiceCounter).toBe('1');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invoiceCounter'));
  });

  test('invoiceCounter = 0 → "1" with console.warn', () => {
    const input = makeValidInput({ invoiceCounter: 0 });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].invoiceCounter).toBe('1');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invoiceCounter'));
  });

  test('invoiceCounter = "0" → "1" with console.warn', () => {
    const input = makeValidInput({ invoiceCounter: '0' });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].invoiceCounter).toBe('1');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invoiceCounter'));
  });

  test('negative invoiceCounter → "1" with console.warn', () => {
    const input = makeValidInput({ invoiceCounter: -3 });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].invoiceCounter).toBe('1');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invoiceCounter'));
  });

  test('valid integer invoiceCounter 5 → "5" (no warn)', () => {
    const input = makeValidInput({ invoiceCounter: 5 });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].invoiceCounter).toBe('5');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('valid string invoiceCounter "12" → "12" (no warn)', () => {
    const input = makeValidInput({ invoiceCounter: '12' });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].invoiceCounter).toBe('12');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

// ─── 12. Enum default fallback — Requirement 2.6–2.9 ─────────────────────────

describe('enum default fallback — Requirement 2.6, 2.7, 2.8, 2.9', () => {
  let warnSpy;
  beforeEach(() => { warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warnSpy.mockRestore(); });

  test('invalid transactionType → "B2C" with console.warn', () => {
    const input = makeValidInput({ transactionType: 'INVALID_TX' });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].transactionType).toBe('B2C');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('transactionType'));
  });

  test('invalid personType → "VATR" with console.warn', () => {
    const input = makeValidInput({ personType: 'BADTYPE' });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].personType).toBe('VATR');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('personType'));
  });

  test('invalid invoiceTypeDesc → "STD" with console.warn', () => {
    const input = makeValidInput({ invoiceTypeDesc: 'UNKNOWN' });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].invoiceTypeDesc).toBe('STD');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invoiceTypeDesc'));
  });

  test('invalid salesTransactions → "CASH" with console.warn', () => {
    const input = makeValidInput({ salesTransactions: 'BITCOIN' });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(result[0].salesTransactions).toBe('CASH');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('salesTransactions'));
  });

  test('valid enum values pass through without warn', () => {
    const input = makeValidInput({
      transactionType:   'B2B',
      personType:        'NVTR',
      invoiceTypeDesc:   'PRF',
      salesTransactions: 'CHEQUE',
      // Provide complete B2B buyer fields to avoid null from buyer validation
      customerData: {
        record_partyName:    'Corp Ltd',
        record_tin:          'TIN999',
        record_brn:          'BRN999',
        record_businessDesc: '99 Corp St',
        buyerType:           'VATR',
        record_nic:          '',
      },
    });
    const result = jsonfyInvoiceData(input);
    expect(result).not.toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(result[0].transactionType).toBe('B2B');
    expect(result[0].personType).toBe('NVTR');
    expect(result[0].invoiceTypeDesc).toBe('PRF');
    expect(result[0].salesTransactions).toBe('CHEQUE');
  });
});

// ─── 13. Sanity: valid input produces correct output ─────────────────────────

describe('basic happy path sanity check', () => {
  test('valid input produces a length-1 array with all 20 MRA fields', () => {
    const result = jsonfyInvoiceData(makeValidInput());
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    const mandatory = [
      'invoiceCounter', 'transactionType', 'personType', 'invoiceTypeDesc',
      'currency', 'invoiceIdentifier', 'invoiceRefIdentifier', 'previousNoteHash',
      'reasonStated', 'totalVatAmount', 'totalAmtWoVatCur', 'totalAmtWoVatMur',
      'invoiceTotal', 'discountTotalAmount', 'totalAmtPaid', 'dateTimeInvoiceIssued',
      'seller', 'buyer', 'itemList', 'salesTransactions',
    ];
    for (const field of mandatory) {
      expect(result[0]).toHaveProperty(field);
    }
  });
});
