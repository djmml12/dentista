import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { PatientsListPage } from '@/features/patients/PatientsListPage';
import { PatientDetailPage } from '@/features/patients/PatientDetailPage';
import { PatientSummaryTab } from '@/features/patients/PatientSummaryTab';
import { PatientAppointmentsTab } from '@/features/patients/PatientAppointmentsTab';
import { ClinicalNotesTab } from '@/features/clinical-notes/ClinicalNotesTab';
import { OdontogramTab } from '@/features/odontogram/OdontogramTab';
import { RadiographsTab } from '@/features/radiographs/RadiographsTab';
import { PatientPhotosTab } from '@/features/patients/PatientPhotosTab';
import { Scans3DTab } from '@/features/scans-3d/Scans3DTab';
import { PrescriptionsTab } from '@/features/prescriptions/PrescriptionsTab';
import { PrescriptionPrint } from '@/features/prescriptions/PrescriptionPrint';
import { CalendarPage } from '@/features/appointments/CalendarPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { ReceiptsListPage } from '@/features/billing/ReceiptsListPage';
import { ReceiptBuilderPage } from '@/features/billing/ReceiptBuilderPage';
import { ReceiptPrint } from '@/features/billing/ReceiptPrint';
import { PatientReceiptsTab } from '@/features/billing/PatientReceiptsTab';
import { FinancesPage } from '@/features/finances/FinancesPage';
import { FinancesPrint } from '@/features/finances/FinancesPrint';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'pacientes', element: <PatientsListPage /> },
          {
            path: 'pacientes/:id',
            element: <PatientDetailPage />,
            children: [
              { index: true, element: <PatientSummaryTab /> },
              { path: 'odontograma', element: <OdontogramTab /> },
              { path: 'citas', element: <PatientAppointmentsTab /> },
              { path: 'notas', element: <ClinicalNotesTab /> },
              { path: 'recetas', element: <PrescriptionsTab /> },
              { path: 'cobros', element: <PatientReceiptsTab /> },
              { path: 'radiografias', element: <RadiographsTab /> },
              { path: 'fotografias', element: <PatientPhotosTab /> },
              { path: 'escaneos', element: <Scans3DTab /> },
            ],
          },
          { path: 'calendario', element: <CalendarPage /> },
          { path: 'cobros', element: <ReceiptsListPage /> },
          { path: 'cobros/nuevo', element: <ReceiptBuilderPage /> },
          { path: 'cobros/:id', element: <ReceiptBuilderPage /> },
          { path: 'finanzas', element: <FinancesPage /> },
          { path: 'configuracion', element: <SettingsPage /> },
        ],
      },
      // Vistas imprimibles (sin sidebar/topbar), se abren en pestaña nueva.
      { path: 'recetas/:id/imprimir', element: <PrescriptionPrint /> },
      { path: 'cobros/:id/imprimir', element: <ReceiptPrint /> },
      { path: 'finanzas/imprimir', element: <FinancesPrint /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
