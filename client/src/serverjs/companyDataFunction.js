import { managerApi } from './jofotaraFuncs.js';

// ── API / Credentials field UUIDs (must match customFieldsNew.js) ─────────────
const FIELD_UUIDS = {
  username:     "dc355341-2cc4-4259-8b2a-e93e4212e74d",
  password:     "041724b7-aeae-42ad-8ed7-7b037478866b",
  ebsMraId:     "33029888-08a5-466b-be48-c2a6e95a818e",
  areaCode:     "c53a62e0-1d45-449d-b84c-12b138e440c7",
  mraPublicKey: "9b6782bb-4b1f-4037-8ac4-6953082ff996",
  //irnCode:      "6e5e516f-619b-4d5b-a3f0-bec09a47801d"
};

// ── Company (Supplier) record field UUIDs ────────────────────────────────────
const BIZ_FIELD_UUIDS = {
  name:             "a1f3c820-3b72-4e9d-bc14-d9e2a057f301",
  tan:              "b2e4d931-4c83-5fa0-cd25-e0f3b168a412",
  tradeName:        "c3f5ea42-5d94-4ab1-de36-f1a4c279b523",
  businessPhoneNo:  "d4a6fb53-6ea5-4bc2-ef47-a2b5d380c634",
  businessAddr:     "e5b7ac64-7fb6-4cd3-fa58-b3c6e491d745",
  brn:              "f6c8bd75-8ac7-4de4-ab69-c4d7f502e856",
  ebsCounterNo:     "a7d9ce86-9bd8-4ef5-bc70-d5e8a613f967",
  cashierId:        "5dcac13b-3114-4312-be29-ddedd21c4ce6"
};

// ── Mandatory seller (supplier) fields per MRA e-Invoicing spec ──────────────
// tradeName, ebsCounterNo, cashierId are optional
const MANDATORY_SELLER_FIELDS = ['name', 'tan', 'brn', 'businessAddr', 'businessPhoneNo'];

// Human-readable labels for error messages
const SELLER_FIELD_LABELS = {
  name:            'Seller Legal Name',
  tan:             'Seller VAT Number (TAN)',
  brn:             'Business Registration Number (BRN)',
  businessAddr:    'Business Address',
  businessPhoneNo: 'Business Phone Number',
};

/**
 * Fetches business details, validates required API credential fields,
 * and validates mandatory seller (supplier) fields per MRA e-Invoicing spec.
 *
 * Mandatory seller fields: name, tan, brn, businessAddr, businessPhoneNo
 * Optional seller fields:  tradeName, ebsCounterNo, cashierId
 *
 * @returns {{
 *   matchedFields: Array<{key: string, value: string}>,
 *   missingFields: string[],
 *   missingSellerFields: Array<{key: string, label: string}>,
 *   bizDetails: object
 * }}
 */
export async function getCompanyDetails() {
  try {
    const response = await managerApi('GET', '/api3/business-details-form', null);
    const data = response.body;

    const matchedFields = [];
    const missingFields = [];
    const missingSellerFields = [];
    const bizDetails = {};

    if (data?.customFields2?.strings) {
      const strings = data.customFields2.strings;

      // Validate required API credential fields
      for (const [key, uuid] of Object.entries(FIELD_UUIDS)) {
        if (!strings[uuid] || strings[uuid] === '') {
          missingFields.push(key);
        } else {
          matchedFields.push({ key, value: strings[uuid] });
        }
      }

      // Collect all company/seller record fields
      for (const [key, uuid] of Object.entries(BIZ_FIELD_UUIDS)) {
        bizDetails[key] = strings[uuid] || '';
      }

      // Validate mandatory seller fields per MRA spec
      for (const key of MANDATORY_SELLER_FIELDS) {
        if (!bizDetails[key] || bizDetails[key].trim() === '') {
          missingSellerFields.push({ key, label: SELLER_FIELD_LABELS[key] });
        }
      }

    } else {
      console.log('Invalid data structure from business-details-form endpoint');
      Object.keys(FIELD_UUIDS).forEach(key => missingFields.push(key));
      for (const key of Object.keys(BIZ_FIELD_UUIDS)) {
        bizDetails[key] = '';
      }
      // All mandatory seller fields are missing
      MANDATORY_SELLER_FIELDS.forEach(key => {
        missingSellerFields.push({ key, label: SELLER_FIELD_LABELS[key] });
      });
    }

    return { matchedFields, missingFields, missingSellerFields, bizDetails };
  } catch (error) {
    console.log('Business details validation failed:', error);
    const missingFields = Object.keys(FIELD_UUIDS);
    const missingSellerFields = MANDATORY_SELLER_FIELDS.map(key => ({
      key,
      label: SELLER_FIELD_LABELS[key]
    }));
    const bizDetails = {};
    Object.keys(BIZ_FIELD_UUIDS).forEach(key => (bizDetails[key] = ''));
    return { matchedFields: [], missingFields, missingSellerFields, bizDetails };
  }
}
