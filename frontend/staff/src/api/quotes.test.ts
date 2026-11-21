import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchInstallationQuote, fetchPackingOrder, generateQuote, sendQuote, updatePackingItem } from './quotes';

const quote = {
  id: 1,
  installationId: 5,
  systemCapacityKw: 3.0,
  systemType: 'OnGrid',
  basePriceRupees: 165000,
  estimatedSubsidyRupees: 78000,
  totalAmountRupees: 87000,
  advancePercentage: 20,
  advanceRequiredRupees: 17400,
  amountPaidRupees: 0,
  status: 'Draft',
  paymentStatus: 'Pending',
  notes: null,
  paymentReference: null,
  createdAt: '2026-11-21T10:00:00Z',
  sentAt: null,
  acceptedAt: null,
  paidAt: null,
  items: [
    {
      id: 1,
      category: 'SolarPanels',
      itemName: 'Mono-PERC Solar Panels (550W)',
      specification: '6x 550W modules',
      quantity: 6,
      unit: 'nos',
      unitCostRupees: 11000,
      totalCostRupees: 66000,
    },
    {
      id: 2,
      category: 'Inverter',
      itemName: '3.3 kVA Solar Grid-Tie String Inverter',
      specification: 'MPPT efficiency >98%',
      quantity: 1,
      unit: 'nos',
      unitCostRupees: 32000,
      totalCostRupees: 32000,
    },
  ],
};

const packingOrder = {
  id: 10,
  installationId: 5,
  quoteId: 1,
  status: 'Pending',
  createdAt: '2026-11-21T10:00:00Z',
  packedAt: null,
  dispatchedAt: null,
  items: [
    {
      id: 101,
      itemName: '3.3 kVA Solar Grid-Tie String Inverter',
      category: 'Inverter',
      quantity: 1,
      unit: 'nos',
      isPacked: false,
      requiresSerialNumber: true,
      serialNumber: null,
    },
  ],
};

const answer = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('quotes API', () => {
  it('fetches installation quote with BOM items', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => answer(quote));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchInstallationQuote(5)).resolves.toEqual(quote);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/installations/5/quote');
  });

  it('generates or updates quote with system capacity and type', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => answer(quote));
    vi.stubGlobal('fetch', fetchMock);

    await generateQuote(5, { systemCapacityKw: 4.0, systemType: 'OffGrid' });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/installations/5/quote');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      systemCapacityKw: 4.0,
      systemType: 'OffGrid',
    });
  });

  it('sends quote to customer', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => answer({ ...quote, status: 'Sent' }));
    vi.stubGlobal('fetch', fetchMock);

    await sendQuote(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/quotes/1/send');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PUT');
  });

  it('fetches packing order and updates item packing state with serial number', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => answer(packingOrder));
    vi.stubGlobal('fetch', fetchMock);

    await fetchPackingOrder(5);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/installations/5/packing-order');

    await updatePackingItem(10, 101, true, 'INV-2026-9988');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/packing-orders/10/items/101');
    expect(fetchMock.mock.calls[1][1]?.method).toBe('PUT');
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      isPacked: true,
      serialNumber: 'INV-2026-9988',
    });
  });
});
