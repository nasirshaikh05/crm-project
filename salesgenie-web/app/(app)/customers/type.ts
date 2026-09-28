export interface CustomerRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  avatarColor: string;
  customerSince: string;
}
