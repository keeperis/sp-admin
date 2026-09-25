export type ContactDetails = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
};

export function normalizeContactDetails(values: ContactDetails): ContactDetails {
  return {
    customerName: values.customerName.trim(),
    customerEmail: values.customerEmail.trim().toLowerCase(),
    customerPhone: values.customerPhone.trim(),
  };
}

export function validateContactDetails(values: ContactDetails, emailRequired = false) {
  const normalized = normalizeContactDetails(values);
  const errors: Partial<Record<keyof ContactDetails, string>> = {};
  if (!normalized.customerName || normalized.customerName.length > 200) {
    errors.customerName = 'Įrašykite vardą ir pavardę (iki 200 simbolių).';
  }
  if (
    (emailRequired && !normalized.customerEmail) ||
    (normalized.customerEmail &&
      (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.customerEmail) ||
        normalized.customerEmail.length > 254))
  ) {
    errors.customerEmail = 'Įrašykite galiojantį el. pašto adresą.';
  }
  if (normalized.customerPhone.length > 50)
    errors.customerPhone = 'Telefonas per ilgas (iki 50 simbolių).';
  return errors;
}
