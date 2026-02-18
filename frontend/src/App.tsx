import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Landing, EmployerDashboard, EmployerInvoices, EmployeeDashboard, InvoicesPage, Activity, CompanyProfilePage } from './pages';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/company-profile"
          element={
            <AppLayout>
              <CompanyProfilePage />
            </AppLayout>
          }
        />
        <Route
          path="/employer"
          element={
            <AppLayout>
              <EmployerDashboard />
            </AppLayout>
          }
        />
        <Route
          path="/invoices"
          element={
            <AppLayout>
              <InvoicesPage />
            </AppLayout>
          }
        />
        <Route
          path="/employer/invoices"
          element={
            <AppLayout>
              <EmployerInvoices />
            </AppLayout>
          }
        />
        <Route
          path="/employee"
          element={
            <AppLayout>
              <EmployeeDashboard />
            </AppLayout>
          }
        />
        <Route
          path="/activity"
          element={
            <AppLayout>
              <Activity />
            </AppLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
