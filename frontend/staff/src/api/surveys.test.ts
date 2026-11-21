import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchInstallation, fetchSurveys, fetchTechnicians, reviewSurvey, scheduleSurvey, submitReport } from './surveys';

const survey = {
  id: 7, installationId: 5, customerId: 3, customerName: 'Test Customer', customerPhone: '12345',
  address: { street: '1 Test St', city: 'Testville', state: 'TX', zipCode: '12345' },
  technicianId: 2, technicianName: 'Test Tech', status: 'Scheduled', scheduledAt: '2026-11-24T10:00:00Z',
  createdAt: '2026-11-21T10:00:00Z', createdById: 1, shadowFreeRoofAreaSquareMetres: null, monthlyBillRupees: null,
  gridSuitable: null, roofDirectionDegrees: null, roofTiltDegrees: null, cableDistanceMetres: null, notes: null,
  submittedById: null, submittedAt: null, reviewedById: null, reviewedAt: null, reviewNotes: null, version: 1,
};
const page = { items: [survey], page: 1, pageSize: 20, totalCount: 1 };
const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
afterEach(() => vi.unstubAllGlobals());

describe('survey API', () => {
  it('filters a page by installation and status', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => answer(page)); vi.stubGlobal('fetch', fetchMock);
    await expect(fetchSurveys({ installationId: 5, status: 'Submitted' })).resolves.toEqual(page);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/surveys?page=1&pageSize=20&status=Submitted&installationId=5');
  });
  it('sends schedule, report and review to the real API contract', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => answer(survey)); vi.stubGlobal('fetch', fetchMock);
    await scheduleSurvey(5, { technicianId: 2, scheduledAt: '2026-11-24T10:00:00Z' });
    await submitReport(7, { shadowFreeRoofAreaSquareMetres: 40, monthlyBillRupees: 0, gridSuitable: false, roofDirectionDegrees: 180, roofTiltDegrees: 20, cableDistanceMetres: 5, notes: null });
    await reviewSurvey(7, true, null);
    expect(fetchMock.mock.calls.map(([url, init]) => `${init?.method} ${String(url)}`)).toEqual(['POST /api/installations/5/surveys', 'PUT /api/surveys/7/report', 'POST /api/surveys/7/review']);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).gridSuitable).toBe(false);
  });
  it('rejects an unexpected survey response rather than showing invented data', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => answer({ ...page, items: [{ ...survey, status: 'Invented' }] })));
    await expect(fetchSurveys({})).rejects.toMatchObject({ kind: 'unexpected' });
  });
  it('returns server errors on installation lookup', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => answer({ code: 'installation.not_found' }, 404)));
    await expect(fetchInstallation(999)).rejects.toMatchObject({ kind: 'notFound' });
  });
  it('fetches every account page and keeps only active technicians', async () => {
    const account = (id: number, role: string, isActive: boolean) => ({ id, name: `Person ${id}`, email: `${id}@sol.test`, role, isActive, createdAt: '2026-11-21T10:00:00Z', lastLoginAt: null });
    const fetchMock = vi.fn<typeof fetch>(async url => String(url).includes('page=1&')
      ? answer({ items: [account(1, 'Admin', true), account(2, 'Technician', true)], page: 1, pageSize: 100, totalCount: 101 })
      : answer({ items: [account(3, 'Technician', true), account(4, 'Technician', false)], page: 2, pageSize: 100, totalCount: 101 }));
    vi.stubGlobal('fetch', fetchMock);
    expect((await fetchTechnicians()).map(person => person.id)).toEqual([2, 3]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
