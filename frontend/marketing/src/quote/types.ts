// The quote form's values, as the visitor enters them.

export type PropertyType = 'House' | 'Apartment' | 'Commercial';
export type BillRange =
  | 'under2000'
  | '2000-5000'
  | '5000-10000'
  | '10000plus'
  | 'in-under1500'
  | 'in-1500-3000'
  | 'in-3000-5000'
  | 'in-5000plus'
  | 'under20000'
  | '20000-60000'
  | '60000-150000'
  | '150000plus'
  | 'under1500'
  | '1500-3500'
  | '3500-7000'
  | '7000plus'
  | 'under100'
  | '100-200'
  | '200-300'
  | '300plus';
export type ContactTime = 'Morning' | 'Afternoon' | 'Evening';

export type QuoteValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  zip: string;
  /** A two-letter code from the list of states */
  state: string;
  type: PropertyType | '';
  own: 'yes' | 'no' | '';
  bill: BillRange | '';
  time: ContactTime | '';
  notes: string;
};

export type FieldName = keyof QuoteValues;
export type FieldErrors = Partial<Record<FieldName, string>>;

/** The fields of each of the three steps: contact, property, last details */
export const STEP_FIELDS: FieldName[][] = [
  ['firstName', 'lastName', 'email', 'phone'],
  ['street', 'city', 'zip', 'state', 'type', 'own'],
  ['bill', 'time', 'notes'],
];

export const stepOf = (field: FieldName) => STEP_FIELDS.findIndex(fields => fields.includes(field));

export const EMPTY_VALUES: QuoteValues = {
  firstName: '', lastName: '', email: '', phone: '',
  street: '', city: '', zip: '', state: '', type: '', own: '',
  bill: '', time: '', notes: '',
};

/** An address picked from the suggestions, in the provider's standard form, with its coordinates */
export type PickedAddress = {
  street: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
};
