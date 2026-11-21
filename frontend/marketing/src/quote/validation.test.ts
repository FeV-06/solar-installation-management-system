import { describe, expect, it } from 'vitest';
import { EMPTY_VALUES, type QuoteValues } from './types';
import { firstError, OWNER_RULE, validateStep } from './validation';

const complete: QuoteValues = {
  firstName: 'Jane', lastName: 'Doe', email: 'jane.doe@example.com', phone: '(512) 555-0134',
  street: '2104 Oak Hollow Dr', city: 'Austin', zip: '110001', state: 'DL',
  type: 'House', own: 'yes', bill: 'in-1500-3000', time: 'Morning', notes: '',
};

describe('validateStep', () => {
  it.each([0, 1, 2])('passes a complete step %i', step => {
    expect(validateStep(step, complete)).toEqual({});
  });

  it('asks for every contact detail on an empty first step', () => {
    expect(validateStep(0, EMPTY_VALUES)).toEqual({
      firstName: 'Enter your first name.',
      lastName: 'Enter your last name.',
      email: 'Enter an email address, like name@example.com.',
      phone: 'Enter a phone number, like +91 98765 43210.',
    });
  });

  it.each(['11000', '011000', 'ABCDE', '110001-12'])('refuses the PIN code %s', zip => {
    expect(validateStep(1, { ...complete, zip }).zip).toBe('Enter a 6-digit PIN code, like 110001.');
  });

  it.each(['110001', '160001'])('accepts the PIN code %s', zip => {
    expect(validateStep(1, { ...complete, zip }).zip).toBeUndefined();
  });

  it('refuses a state that is not on the list (FR-L1)', () => {
    expect(validateStep(1, { ...complete, state: 'PR' }).state).toBe('Choose the state.');
  });

  it.each(['House', 'Apartment'] as const)('tells the renter of a %s that the owner has to ask', type => {
    expect(validateStep(1, { ...complete, type, own: 'no' }).own).toBe(OWNER_RULE);
  });

  it('lets a business that leases its premises ask', () => {
    expect(validateStep(1, { ...complete, type: 'Commercial', own: 'no' })).toEqual({});
  });

  it('leaves the notes optional', () => {
    expect(validateStep(2, { ...complete, notes: '' })).toEqual({});
  });

  it('names the first field to fix in the order the step shows them', () => {
    expect(firstError(1, validateStep(1, { ...complete, city: '', type: '' }))).toBe('city');
  });
});
