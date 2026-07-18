// Function to convert invoice data to the required format
// This function extracts customer fields (CustomerCompanyName, Postal, City, Phone, TaxScheme_Type, TIN_Customer)

import { generateIRN } from "./genIRN.js";

// Payment means mapping from value to code
const PAYMENT_MEANS_MAP = {
  "Cash": "10",
  "Cheque": "20",
  "Credit Transfer": "30",
  "Debit Transfer": "31",
  "ACH Credit": "42",
  "ACH Debit": "43",
  "Bank Card": "48",
  "Direct Debit": "49",
  "Credit Card": "50",
  "Banker's Draft": "58",
  "Other": "97",
  "Mutually Defined": "ZZZ"
};

// Helper function to get payment means code from value
const getPaymentMeansCode = (paymentMeansValue) => {
  if (!paymentMeansValue) return '';
  return PAYMENT_MEANS_MAP[paymentMeansValue] || '';
};

// Custom field UID for HSN Code on inventory/non-inventory items
const HSN_CODE_FIELD_UID = 'a0c2d11f-9e12-4g8h-9i10-j11k12l13m14';

// Helper: format a raw HSN code string to required "0000.00" format.
// Accepts "000000", "0000.00", "0000.0", etc. Returns empty string if invalid.
const formatHsnCode = (raw) => {
  if (!raw) return '';
  const cleaned = raw.replace(/\./g, '').trim();
  if (cleaned.length < 4) return '';
  const major = cleaned.slice(0, 4).padStart(4, '0');
  const minor = cleaned.slice(4, 6).padEnd(2, '0');
  return `${major}.${minor}`;
};

// from customer.CustomFields2.Strings based on the uids mapping and includes them in the result object.
export function convertInvoiceData(data, companyApiDetz, bizDetails) {
  // Initialize variables
  let defaultItemCounter = 1;
  
  if (!data) return null;

  //console.log(JSON.stringify(data, null, 2));
  //const { salesData, customerData, invData, taxData, nonInvData, creditData } = data;
  // const recData = JSON.stringify(data, null, 2);
  // console.log(JSON.stringify(data, null, 2));

  const invoice = data.salesData;
  const customer = data.customerData;
  const inventoryItems = data.inventory;
  const taxes = data.taxData;
  const nonInvoiceItems = data.nonInventoryData || [];
  const creditNotes = data.creditData || null;

  //console.log(invoice, customer, inventoryItems, taxes, nonInvoiceItems, creditNotes);
  // Helper functions

  

  const findInventoryItem = (key) => 
    inventoryItems.find(item => item.Key === key);

  const findNonInventoryItem = (key) => 
    nonInvoiceItems.find(item => item.Key === key);

  const findTax = (key) => 
    taxes.find(tax => tax.Key === key);

  // If it's a Credit Note we should take credit note line item
  const proLines = creditNotes ? creditNotes.Lines : invoice.Lines;

  // Calculate line items
  const lineItems = proLines.map((line) => {
    const inventoryItem = line.Item ? findInventoryItem(line.Item) : null;
    const nonInventoryItem = findNonInventoryItem(line.Item);
    const tax = findTax(line.TaxCode);
    
    const taxSchemaKey = '';// 'fef53ae2-6427-4a49-b4c6-33f653ebd06b';
    const taxSchemaCode = '';// line.CustomFields2?.StringArrays?.[taxSchemaKey]?.[0] || '';

    const price = line.SalesUnitPrice;
    const quantity = line.Qty;

    const discP = line.DiscountPercentage || 0;
    const discValue = line.DiscountAmount || 0;
    const discount = (discValue > 0 ? discValue : ((price * quantity * discP) / 100));
    
    const lineExtensionAmount = (price * quantity) - discount;
    const taxPercentage = tax?.Rate || 0;
    const taxAmount = lineExtensionAmount * (taxPercentage / 100);
    const TaxRounding = lineExtensionAmount + taxAmount;

    // Create ItemID Section
    let itemId = inventoryItem?.Key || nonInventoryItem?.Key || line.Account;
    if (!itemId) {
      itemId = `DEFAULT_${defaultItemCounter}`;
      defaultItemCounter++;
    }

    // Read HSN code from the item's custom field (CustomFields2.Strings)
    const rawHsn = inventoryItem?.CustomFields2?.Strings?.[HSN_CODE_FIELD_UID]
      || nonInventoryItem?.CustomFields2?.Strings?.[HSN_CODE_FIELD_UID]
      || '';
    const hsnCode = formatHsnCode(rawHsn);
    
    return {
      ItemID: itemId,
      HsnCode: hsnCode,
      ItemName: inventoryItem?.ItemName || nonInventoryItem?.Name || 'Service',
      Quantity: quantity,
      Price: price,
      Discount: discount,
      LineExtensionAmount: lineExtensionAmount,
      TaxTotal: taxAmount,
      TaxRounding: TaxRounding,
      TaxCatPercentage: taxPercentage,
      TaxCatCode: tax?.Name || '',
      TaxSubAmount: taxAmount,
      TaxSchemaCode: taxSchemaCode,
    };
  });

  // If it's a Credit Note we should calculate invoice line items total
  const invoicelineItems = invoice.Lines.map((line) => {
    const inventoryItem = line.Item ? findInventoryItem(line.Item) : null;
    const nonInventoryItem = findNonInventoryItem(line.Item);
    const tax = findTax(line.TaxCode);

    const price = line.SalesUnitPrice;
    const quantity = line.Qty;
    
    const discP = line.DiscountPercentage || 0;
    const discValue = line.DiscountAmount || 0;
    
    const discount = (discValue > 0 ? discValue : ((price * quantity * discP) / 100));
    
    const lineExtensionAmount = (price * quantity) - discount;
    const taxPercentage = tax?.Rate || 0;
    const taxAmount = lineExtensionAmount * (taxPercentage / 100);
    const TaxRounding = lineExtensionAmount + taxAmount;

    let itemId = inventoryItem?.Key || nonInventoryItem?.Key || line.Account;
    if (!itemId) {
      itemId = `DEFAULT_${defaultItemCounter}`;
      defaultItemCounter++;
    }

    const rawHsn2 = inventoryItem?.CustomFields2?.Strings?.[HSN_CODE_FIELD_UID]
      || nonInventoryItem?.CustomFields2?.Strings?.[HSN_CODE_FIELD_UID]
      || '';
    const hsnCode2 = formatHsnCode(rawHsn2);
    
    return {
      ItemID: itemId,
      HsnCode: hsnCode2,
      ItemName: inventoryItem?.ItemName || nonInventoryItem?.Name || 'Service',
      Quantity: quantity,
      Price: price,
      Discount: discount,
      LineExtensionAmount: lineExtensionAmount,
      TaxTotal: taxAmount,
      TaxRounding: TaxRounding,
      TaxCatPercentage: taxPercentage,
      TaxCatCode: tax?.Name || '',
      TaxSubAmount: taxAmount,
    };
  });

  // Calculate totals
  /* IF WE USE CREDIT NOTE WE NEED THIS TOTAL */
  const invtaxExclusiveAmount = invoicelineItems.reduce((sum, item) => sum + item.LineExtensionAmount, 0);
  const invtaxTotal = invoicelineItems.reduce((sum, item) => sum + item.TaxTotal, 0);
  const invtaxInclusiveAmount = invtaxExclusiveAmount + invtaxTotal;

  // Calculate totals for invoice/creditnote
  const taxExclusiveAmount = lineItems.reduce((sum, item) => sum + item.LineExtensionAmount, 0);
  const taxTotal = lineItems.reduce((sum, item) => sum + item.TaxTotal, 0);
  const taxInclusiveAmount = taxExclusiveAmount + taxTotal;
  const totalDiscount = lineItems.reduce((sum, item) => sum + item.Discount, 0);

  // Group taxes for TaxSubtotal
  const taxGroups = {};
  lineItems.forEach(item => {
    const key = item.TaxCatCode;
    if (!taxGroups[key]) {
      taxGroups[key] = {
        TaxableAmount: 0,
        TaxAmount: 0,
        TaxPercentage: item.TaxCatPercentage,
      };
    }
    taxGroups[key].TaxableAmount += item.LineExtensionAmount;
    taxGroups[key].TaxAmount += item.TaxTotal;
  });

  const taxSubtotal = Object.values(taxGroups);

  // Create the transformed data object
  const companyData = companyApiDetz.reduce((acc, field) => {
    acc[field.key] = field.value;
    return acc;
  }, {});

  const companyBizData = Object.entries(bizDetails).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});

  // Extract customer custom fields
  // Mapping of field names to their corresponding UUIDs in CustomFields2
  const uids = {
  record_partyName: "a1f3c820-3b72-4e9d-bc14-d9e2a057f301",
  record_tin: "b2e4d931-4c83-5fa0-cd25-e0f3b168a412",
  record_email: "c3f5ea42-5d94-4ab1-de36-f1a4c279b523",
  record_telephone: "d4a6fb53-6ea5-4bc2-ef47-a2b5d380c634",
  record_businessDesc: "e5b7ac64-7fb6-4cd3-fa58-b3c6e491d745",
  record_streetName: "f6c8bd75-8ac7-4de4-ab69-c4d7f502e856",
  record_cityName: "a7d9ce86-9bd8-4ef5-bc70-d5e8a613f967",
  record_postalZone: "b8e0df97-0ce9-4fa6-cd81-e6f9b724a078",
  record_country: "c9f1ea08-1df0-4ab7-de92-f7a0c835b189",
  taxSchemeType: "d9280c0b-25a8-4b83-a060-59098e68b233",
  invoiceTypeCode: "e6c0244e-a232-4316-a76a-943f2f72611b",
  salesInvoiceType: "87b33f2d-ff43-424d-a540-a8f3cd443581"
};
  
  const { Strings = {}, StringArrays = {} } = customer[0]?.CustomFields2 ?? {};

  const CustomerNewData = {
    record_partyName: Strings[uids.record_partyName] || '',
    record_tin: Strings[uids.record_tin] || '',
    record_email: Strings[uids.record_email] || '',
    record_telephone: Strings[uids.record_telephone] || '',
    record_businessDesc: Strings[uids.record_businessDesc] || '',
    record_streetName: Strings[uids.record_streetName] || '',
    record_cityName: (StringArrays[uids.record_cityName] && StringArrays[uids.record_cityName][0]) || '',
    record_postalZone: Strings[uids.record_postalZone] || '',
    record_country: Strings[uids.record_country] || '',
    taxSchemeType: (StringArrays[uids.taxSchemeType] && StringArrays[uids.taxSchemeType][0]) || ''
  };
  
  // const CustomerNewData = {
  //     CustomerCompanyName: Strings[uids.CustomerCompanyName] || '',
  //     TIN_Customer: Strings[uids.TIN_Customer] || '',
  //     Email: Strings[uids.Email] || '',
  //     Phone: Strings[uids.Phone] || '',
  //     BusinessDescription: Strings[uids.BusinessDescription] || '',
  //     StreetName: Strings[uids.StreetName] || '',
  //     City: (StringArrays[uids.City] && StringArrays[uids.City][0]) || '',
  //     Postal: Strings[uids.Postal] || '',
  //     Country: Strings[uids.Country] || '',
  //     TaxScheme_Type: (StringArrays[uids.TaxScheme_Type] && StringArrays[uids.TaxScheme_Type][0]) || ''
  // };

  //console.log('Customer Fields:', JSON.stringify(customerFields, null, 2));
  // Extract invoice custom fields
  
  const uidPaymentMean = '3c7bb125-0fa4-4d6e-83e1-7d2a4e59f841';
  
  const invoiceFields = {};
  let InvoiceTypeCodeName = '';
  let InvoiceTypeCodeValue = '';

  

  if (invoice?.CustomFields2) {
       
    // const invStrings = invoice.CustomFields2.Strings || {};
    // const invStringArrays = invoice.CustomFields2.StringArrays || {};
    // //console.log(invStringArrays);

    // const invoiceNewData = {
    //   InvoiceTypeCode: (invStringArrays[uids.InvoiceTypeCode] && invStringArrays[uids.InvoiceTypeCode][0]) || '',
    //   PaymentMeans: (invStringArrays[uidPaymentMean] && invStringArrays[uidPaymentMean][0]) || ''
    // }

    // invoiceFields.InvoiceTypeCode = invoiceNewData.InvoiceTypeCode;
    // invoiceFields.PaymentMeans = invoiceNewData.SalesInvoiceType;

   
    // //console.log('SalesInvoiceType' + StringArrays[uids.SalesInvoiceType]);

    // // Special handling for InvoiceTypeCode
    // if (invoiceFields.InvoiceTypeCode && invoiceFields.SalesInvoiceType) {
    //   const code = invoiceFields.InvoiceTypeCode;
    //   const stype = invoiceFields.SalesInvoiceType;
      
    //   if (code === 'CASH' && stype === 'Income Invoice') {
    //     InvoiceTypeCodeValue = creditNotes ? '381' : '388';
    //     InvoiceTypeCodeName = '011';
    //   } else if (code === 'RECEIVABLE' && stype === 'Income Invoice') {
    //     InvoiceTypeCodeName = '021';
    //     InvoiceTypeCodeValue = creditNotes ? '381' : '388';
    //   } else if (code === 'CASH' && stype === 'General Invoice') {
    //     InvoiceTypeCodeName = '012';
    //     InvoiceTypeCodeValue = creditNotes ? '381' : '388';
    //   } else if (code === 'RECEIVABLE' && stype === 'General Invoice') {
    //     InvoiceTypeCodeName = '022';
    //     InvoiceTypeCodeValue = creditNotes ? '381' : '388';
    //   } else if (code === 'CASH' && stype === 'Special Invoice') {
    //     InvoiceTypeCodeName = '013';
    //     InvoiceTypeCodeValue = creditNotes ? '381' : '388';
    //   } else if (code === 'RECEIVABLE' && stype === 'Special Invoice') {
    //     InvoiceTypeCodeName = '023';
    //     InvoiceTypeCodeValue = creditNotes ? '381' : '388';
    //   }
    // }
  }


  const result = {
    // Invoice details
    InvoiceUID: invoice.Key,
    InvoiceID: invoice.Reference,
    IssueDate: invoice.IssueDate ? (invoice.IssueDate).split('T')[0] : '',
    InvoiceRemark: invoice.Description,
    InvoiceTotalValue: creditNotes ? invtaxInclusiveAmount : taxInclusiveAmount,
    DocUUID: crypto.randomUUID(),
    payment_status: creditNotes ? creditNotes.CustomFields2?.StringArrays?.['5a6ff714-65c4-4f8d-8862-611d1bdfe738']?.[0] : invoice.CustomFields2?.StringArrays?.['5a6ff714-65c4-4f8d-8862-611d1bdfe738']?.[0] || 'PENDING', // This can be dynamic based on your data, hardcoded for now

    payment_means: getPaymentMeansCode(
      creditNotes ? creditNotes.CustomFields2?.StringArrays?.['3c7bb125-0fa4-4d6e-83e1-7d2a4e59f841']?.[0] : invoice.CustomFields2?.StringArrays?.['3c7bb125-0fa4-4d6e-83e1-7d2a4e59f841']?.[0] || ''
    ),
    // Credit Invoice
    CreditUID: creditNotes ? creditNotes.Key : '',
    CreditID: creditNotes ? creditNotes.Reference : '',
    CreditDate: creditNotes ? (creditNotes.IssueDate).split('T')[0] : '', 
    CreditRemark: creditNotes ? creditNotes.Description : '',
    creditTotalValue: taxInclusiveAmount,
    IsCreditNote: creditNotes ? true : false,
    
    // Generate IRN Code.
    //irnCode: generateIRN(invoice.Reference, companyData.irnCode, invoice.IssueDate ? (invoice.IssueDate).split('T')[0] : ''),
    irnCode: generateIRN(
      creditNotes ? creditNotes.Reference : invoice.Reference, 
      companyData.irnCode, 
      creditNotes ? (creditNotes.IssueDate).split('T')[0] : (invoice.IssueDate ? (invoice.IssueDate).split('T')[0] : '')
    ),

    //irnCode_Invoice: creditNotes ? invoice.CustomFields2?.Strings?.['65c011b6-98e6-4cf5-a8ac-d429ffd3bfed']  : '',
    irnCode_Invoice: creditNotes ? invoice.CustomFields?.['65c011b6-98e6-4cf5-a8ac-d429ffd3bfed'] || '' : '',
    irnCode_IssueDate: creditNotes ? (invoice.IssueDate).split('T')[0] : '' ,
    // Company details
    // CompanyID: companyData.CompanyID || '',
    // TIN: companyData.TIN || '',
    // CompanyName: companyData.CompanyName || CustomerNewData.CustomerCompanyName || '',
    // SeqIncomeSource: companyData.SeqIncomeSource || '',
    // ClientID: companyData.clientID || '',
    // ClientSecretKey: companyData.clientSecretKey || '',
    CompanyData : companyData,
    companyBizData: companyBizData,
    // Customer details
        // CustomerCompanyName: CustomerNewData.CustomerCompanyName || '',
        // TIN_Customer: CustomerNewData.TIN_Customer || '',
        // Email: CustomerNewData.Email || '',
        // Phone: CustomerNewData.Phone || '',
        // BusinessDescription: CustomerNewData.BusinessDescription || '',
        // StreetName: CustomerNewData.StreetName || '',
        // City: CustomerNewData.City || '',
        // Postal: CustomerNewData.Postal || '',
        // Country: CustomerNewData.Country || '',
        // TaxScheme_Type: CustomerNewData.TaxScheme_Type || '',

    customerData: CustomerNewData,
    // Sales Invoice Related
    //InvoiceTypeCode: invoiceFields.InvoiceTypeCode || '',
    //SalesInvoiceType: invoiceFields.SalesInvoiceType || '',

    // These fields come according to above result
    InvoiceTypeCode: creditNotes?.Key ? '380' : '381',
    //Paymentmeans: InvoiceTypeCodeValue,
    
    // Discount Calculation
    TotalDiscount: totalDiscount,
    TaxExclusiveAmount: (taxExclusiveAmount + totalDiscount),
    TaxInclusiveAmount: taxInclusiveAmount,
    AllowanceTotalAmount: totalDiscount,
    PayableAmount: taxInclusiveAmount,

    // Tax Calculation
    TaxTotal: taxTotal,
    TaxSubtotal: taxSubtotal,

    // Line Items
    LineItems: lineItems,
  };

  return result;
}


export function jsonfyInvoiceData(data) {
  try {
    if (!data) return null;

    // Helper: generate a new GUID
    const generateGuid = () => {
      return crypto.randomUUID();
    };

    // Helper: get current time as HH:MM:SS
    const getCurrentTime = () => {
      const now = new Date();
      return now.toTimeString().split(' ')[0];
    };

    // Helper: round to 2 decimal places
    const roundTo2Decimals = (value) => {
      if (typeof value !== 'number') return value;
      return Math.round(value * 100) / 100;
    };

    // Map accounting_supplier_party from companyBizData
    const supplierParty = {
      id: data.companyBizData?.id || generateGuid(),
      party_name: data.companyBizData?.partyName || data.companyBizData?.CompanyName || '',
      tin: data.companyBizData?.tin || data.CompanyData?.tin || '',
      email: data.companyBizData?.email || '',
      telephone: data.companyBizData?.telephone || '+2340000000000',
      business_description: data.companyBizData?.businessDescription || null,
      postal_address: {
        id: data.companyBizData?.postalAddress?.id || generateGuid(),
        street_name: data.companyBizData?.streetName || data.companyBizData?.postalAddress?.street_name || '',
        city_name: data.companyBizData?.cityName || data.companyBizData?.postalAddress?.city_name || '',
        postal_zone: data.companyBizData?.postalZone || data.companyBizData?.postalAddress?.postal_zone || '',
        lga: data.companyBizData?.lga || null,
        state: data.companyBizData?.state || null,
        country: data.companyBizData?.country || 'NG',
      },
    };

    // Map accounting_customer_party from customerData
    const customerParty = {
      id: data.customerData?.id || generateGuid(),
      party_name: data.customerData?.record_partyName || '',
      tin: data.customerData?.record_tin || '',
      email: data.customerData?.record_email || '',
      telephone: data.customerData?.record_telephone || '+2340000000000',
      business_description: data.customerData?.record_businessDesc || null,
      postal_address: {
        id: data.customerData?.postalAddressId || generateGuid(),
        street_name: data.customerData?.record_streetName || '',
        city_name: data.customerData?.record_cityName || '',
        postal_zone: data.customerData?.record_postalZone || '',
        lga: null,
        state: data.customerData?.record_country || '',
        country: data.customerData?.record_country || 'NG',
      },
    };

    // Map tax_total from LineItems array
    const taxGroupsMap = {};
    
    (data.LineItems || []).forEach((item) => {
      const taxCode = item.TaxCatCode || 'ZERO_GST';
      
      if (!taxGroupsMap[taxCode]) {
        taxGroupsMap[taxCode] = {
          taxable_amount: 0,
          tax_amount: 0,
          tax_percentage: item.TaxCatPercentage || 0,
        };
      }
      
      taxGroupsMap[taxCode].taxable_amount += item.LineExtensionAmount || 0;
      taxGroupsMap[taxCode].tax_amount += item.TaxTotal || 0;
    });

    const taxSubtotalMapped = Object.entries(taxGroupsMap).map(([taxCode, values]) => ({
      taxable_amount: roundTo2Decimals(values.taxable_amount),
      tax_amount: roundTo2Decimals(values.tax_amount),
      tax_category: {
        id: taxCode,
        percent: roundTo2Decimals(values.tax_percentage),
      },
      TaxCategoryPercent: roundTo2Decimals(values.tax_percentage),
    }));

    const taxTotal = [
      {
        tax_amount: roundTo2Decimals(data.TaxTotal || 0),
        tax_subtotal: taxSubtotalMapped,
      },
    ];

    // Map legal_monetary_total
    const legalMonetaryTotal = {
      line_extension_amount: roundTo2Decimals(data.TaxExclusiveAmount || 0),
      tax_exclusive_amount: roundTo2Decimals(data.TaxExclusiveAmount || 0),
      tax_inclusive_amount: roundTo2Decimals(data.TaxInclusiveAmount || 0),
      payable_amount: roundTo2Decimals(data.PayableAmount || 0),
    };

    // Map invoice_line from LineItems
    const invoiceLines = (data.LineItems || []).map((item) => ({
      invoiced_quantity: roundTo2Decimals(item.Quantity || 0),
      line_extension_amount: roundTo2Decimals(item.LineExtensionAmount || 0),
      item: {
        name: item.ItemName || '',
        description: item.ItemName || '',
        sellers_item_identification: null,
      },
      price: {
        price_amount: roundTo2Decimals(item.Price || 0),
        base_quantity: 1,
        price_unit: 'NGN per 1',
      },
      hsn_code: item.HsnCode || '0000.00',
      product_category: 'Item',
      isic_code: '',
      service_category: '',
      discount_rate: (item.Discount > 0 && item.Price > 0 && item.Quantity > 0)
        ? roundTo2Decimals((item.Discount / (item.Price * item.Quantity)) * 100)
        : 0,
      discount_amount: roundTo2Decimals(item.Discount || 0),
      fee_rate: 0,
      fee_amount: 0,
    }));

    const invoiceDetz = {
      irn: data.irnCode_Invoice || '',
      issue_date: data.irnCode_IssueDate || ''
    }

    const paymentMeansCode = {
      payment_means_code: data.payment_means || '',
      payment_due_date: data.IsCreditNote ? data.CreditDate : data.IssueDate,
    };

    // Build the final JSON object
    const jsonResult = {
      business_id: data.CompanyData?.businessID || generateGuid(),
      irn: data.irnCode || '',
      issue_date: data.IsCreditNote ? data.CreditDate : data.IssueDate, // data.IssueDate || '',
      billing_reference: data.IsCreditNote ? [invoiceDetz]  : [],
      issue_time: getCurrentTime(),                                 // TODO: extract from original IssueDate timestamp in next phase
      invoice_type_code: data.InvoiceTypeCode || '',
      document_currency_code: 'NGN',                               // TODO: make dynamic in next phase
      tax_currency_code: 'NGN',                                    // TODO: make dynamic in next phase
      accounting_supplier_party: supplierParty,
      accounting_customer_party: customerParty,
      payment_status: data.payment_status,                                       // TODO: map from invoice data in next phase
      payment_means: [paymentMeansCode] || [],
      tax_total: taxTotal,
      legal_monetary_total: legalMonetaryTotal,
      invoice_line: invoiceLines,
    };

    return jsonResult;

  } catch (error) {
    console.error("Error stringifying invoice data:", error);
    return null;
  }
}