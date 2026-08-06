/** 租户公司资料（打印单据等）字段约束与校验 */

export const COMPANY_ADDRESS_MAX = 200;
export const COMPANY_ADDRESS_EN_MAX = 200;
export const COMPANY_PHONE_MAX = 32;
export const COMPANY_PHONE_MAX_COUNT = 5;
export const COMPANY_CONTACT_PERSON_MAX = 50;
export const COMPANY_EMAIL_MAX = 100;

/** 允许数字、空格、常见分隔符（+ - ( ) / ·） */
const PHONE_PATTERN = /^[0-9+\-()/\s·.]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CompanyProfileField =
  | "address"
  | "addressEn"
  | "phones"
  | "contactPerson"
  | "email";

export type CompanyProfileErrors = Partial<
  Record<CompanyProfileField, string>
>;

export type CompanyProfileValues = {
  address: string;
  addressEn: string;
  phones: string[];
  contactPerson: string;
  email: string;
};

export type CompanyProfileErrorCode =
  | "addressTooLong"
  | "addressEnTooLong"
  | "phoneTooLong"
  | "phoneInvalid"
  | "phoneTooMany"
  | "contactPersonTooLong"
  | "emailTooLong"
  | "emailInvalid";

export type CompanyProfileFieldError = {
  field: CompanyProfileField;
  code: CompanyProfileErrorCode;
  /** 多条电话时指向具体下标 */
  phoneIndex?: number;
};

function trimPhones(phones: string[]) {
  return phones.map((p) => p.trim()).filter(Boolean);
}

export function normalizeCompanyPhones(phones: string[]) {
  return trimPhones(phones).slice(0, COMPANY_PHONE_MAX_COUNT);
}

export function validateCompanyProfile(
  values: CompanyProfileValues,
): CompanyProfileFieldError[] {
  const errors: CompanyProfileFieldError[] = [];
  const address = values.address.trim();
  const addressEn = values.addressEn.trim();
  const contactPerson = values.contactPerson.trim();
  const email = values.email.trim();
  const phones = values.phones.map((p) => p.trim());

  if (address.length > COMPANY_ADDRESS_MAX) {
    errors.push({ field: "address", code: "addressTooLong" });
  }
  if (addressEn.length > COMPANY_ADDRESS_EN_MAX) {
    errors.push({ field: "addressEn", code: "addressEnTooLong" });
  }
  if (contactPerson.length > COMPANY_CONTACT_PERSON_MAX) {
    errors.push({ field: "contactPerson", code: "contactPersonTooLong" });
  }
  if (email.length > COMPANY_EMAIL_MAX) {
    errors.push({ field: "email", code: "emailTooLong" });
  } else if (email && !EMAIL_PATTERN.test(email)) {
    errors.push({ field: "email", code: "emailInvalid" });
  }

  const nonEmptyPhones = phones.filter(Boolean);
  if (nonEmptyPhones.length > COMPANY_PHONE_MAX_COUNT) {
    errors.push({ field: "phones", code: "phoneTooMany" });
  }

  phones.forEach((phone, index) => {
    if (!phone) return;
    if (phone.length > COMPANY_PHONE_MAX) {
      errors.push({ field: "phones", code: "phoneTooLong", phoneIndex: index });
      return;
    }
    if (!PHONE_PATTERN.test(phone)) {
      errors.push({ field: "phones", code: "phoneInvalid", phoneIndex: index });
    }
  });

  return errors;
}

export function firstFieldError(
  errors: CompanyProfileFieldError[],
  field: CompanyProfileField,
): CompanyProfileFieldError | undefined {
  return errors.find((e) => e.field === field);
}
