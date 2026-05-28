import type { ContactVisibility } from './types';

export interface ContactInfo {
  contactMethod?: string;
  contactValue?: string;
  phone?: string;
}

export function filterContactInfo(
  user: { contactVisibility?: ContactVisibility | string | null; contactMethod?: string | null; contactValue?: string | null; phone?: string | null },
  isConnected: boolean
): ContactInfo | null {
  const visibility = user.contactVisibility || 'hidden';
  if (visibility === 'public') {
    return { contactMethod: user.contactMethod ?? undefined, contactValue: user.contactValue ?? undefined, phone: user.phone ?? undefined };
  }
  if (visibility === 'on-request' && isConnected) {
    return { contactMethod: user.contactMethod ?? undefined, contactValue: user.contactValue ?? undefined, phone: user.phone ?? undefined };
  }
  return null;
}
