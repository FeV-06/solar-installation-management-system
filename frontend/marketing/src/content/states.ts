/** Indian states & UTs (ISO 3166-2:IN) */
export const STATES: [code: string, name: string][] = (
  'AN Andaman and Nicobar Islands|AP Andhra Pradesh|AR Arunachal Pradesh|AS Assam|BR Bihar|CH Chandigarh|' +
  'CG Chhattisgarh|DN Dadra and Nagar Haveli and Daman and Diu|DL Delhi|GA Goa|GJ Gujarat|HR Haryana|' +
  'HP Himachal Pradesh|JK Jammu and Kashmir|JH Jharkhand|KA Karnataka|KL Kerala|LA Ladakh|LD Lakshadweep|' +
  'MP Madhya Pradesh|MH Maharashtra|MN Manipur|ML Meghalaya|MZ Mizoram|NL Nagaland|OD Odisha|PY Puducherry|' +
  'PB Punjab|RJ Rajasthan|SK Sikkim|TN Tamil Nadu|TS Telangana|TR Tripura|UP Uttar Pradesh|UK Uttarakhand|' +
  'WB West Bengal'
)
  .split('|')
  .map(entry => [entry.slice(0, 2), entry.slice(3)]);

export const INDIAN_STATES = STATES;

const US_STATES: [code: string, name: string][] = (
  'AL Alabama|AK Alaska|AZ Arizona|AR Arkansas|CA California|CO Colorado|CT Connecticut|DE Delaware|' +
  'DC District of Columbia|FL Florida|GA Georgia|HI Hawaii|ID Idaho|IL Illinois|IN Indiana|IA Iowa|KS Kansas|' +
  'KY Kentucky|LA Louisiana|ME Maine|MD Maryland|MA Massachusetts|MI Michigan|MN Minnesota|MS Mississippi|' +
  'MO Missouri|MT Montana|NE Nebraska|NV Nevada|NH New Hampshire|NJ New Jersey|NM New Mexico|NY New York|' +
  'NC North Carolina|ND North Dakota|OH Ohio|OK Oklahoma|OR Oregon|PA Pennsylvania|RI Rhode Island|' +
  'SC South Carolina|SD South Dakota|TN Tennessee|TX Texas|UT Utah|VT Vermont|VA Virginia|WA Washington|' +
  'WV West Virginia|WI Wisconsin|WY Wyoming'
)
  .split('|')
  .map(entry => [entry.slice(0, 2), entry.slice(3)]);

export const STATE_CODES = new Set([...STATES.map(([code]) => code), ...US_STATES.map(([code]) => code)]);
