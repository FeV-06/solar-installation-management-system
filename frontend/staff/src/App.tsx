import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { createQueryClient } from './api/queryClient';
import { ErrorPage } from './pages/ErrorPage';
import { LandingRedirect } from './pages/LandingRedirect';
import { NotFoundPage } from './pages/NotFoundPage';
import { SectionPage } from './pages/SectionPage';
import { RequireSession } from './session/RequireSession';
import { MY_WORK, OFFICE } from './shell/sections';
import type { RouteHandle } from './shell/Shell';
import { CustomerPage } from './customers/CustomerPage';
import { CustomersPage } from './customers/CustomersPage';
import { LeadPage } from './leads/LeadPage';
import { LeadsPage } from './leads/LeadsPage';
import { NotificationsPage } from './notifications/NotificationsPage';
import { SignInPage } from './signin/SignInPage';
import { UserPage } from './users/UserPage';
import { UsersPage } from './users/UsersPage';
import { SurveysPage } from './surveys/SurveysPage';
import { SurveyPage } from './surveys/SurveyPage';
import { InstallationPage } from './surveys/InstallationPage';
import { InstallationsPage } from './surveys/InstallationsPage';
import { CommissioningPage } from './surveys/CommissioningPage';

const handle = (title: string): RouteHandle => ({ title });

/** The screens built so far; the other sections show what they will hold. */
const BUILT: Record<string, ReactNode> = {
  '/leads': <LeadsPage />, '/customers': <CustomersPage />, '/notifications': <NotificationsPage />, '/users': <UsersPage />,
  '/surveys': <SurveysPage />, '/my-work': <SurveysPage />, '/installations': <InstallationsPage />,
};

export const STAFF_BASENAME = '/staff';

const routes: RouteObject[] = [
  { path: '/login', element: <SignInPage />, errorElement: <ErrorPage /> },
  {
    // Everything else needs a session; without one, the sign-in page opens and remembers the address.
    element: <RequireSession />,
    errorElement: <ErrorPage />,   // the frame itself failed
    children: [
      {
        errorElement: <ErrorPage />,   // a page failed: the frame stays
        children: [
          { index: true, element: <LandingRedirect /> },
          ...[...OFFICE, MY_WORK].map(s => ({ path: s.path, element: BUILT[s.path] ?? <SectionPage section={s} />, handle: handle(s.title) })),
          { path: '/leads/:id', element: <LeadPage />, handle: handle('Leads') },
          { path: '/customers/:id', element: <CustomerPage />, handle: handle('Customers') },
          { path: '/installations/:id', element: <InstallationPage />, handle: handle('Installation') },
          { path: '/installations/:id/commission', element: <CommissioningPage />, handle: handle('Commissioning') },
          { path: '/surveys/:id', element: <SurveyPage />, handle: handle('Survey') },
          { path: '/my-work/:id', element: <SurveyPage />, handle: handle('My work') },
          { path: '/my-work/:id/commission', element: <CommissioningPage />, handle: handle('Commissioning') },
          { path: '/users/:id', element: <UserPage />, handle: handle('Users') },
          { path: '*', element: <NotFoundPage />, handle: handle('Page not found') },
        ],
      },
    ],
  },
];

const router = createBrowserRouter(routes, { basename: STAFF_BASENAME });
const queryClient = createQueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
