import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import AdminLayout from './components/admin/AdminLayout';
import CustomerLayout from './components/customer/CustomerLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import ParkingZones from './pages/admin/ParkingZones';
import ActiveSessions from './pages/admin/ActiveSessions';
import SessionHistory from './pages/admin/SessionHistory';
import LiveMap from './pages/admin/LiveMap';
import CustomerViewAdmin from './pages/admin/CustomerViewAdmin';
import FindParking from './pages/customer/FindParking';
import ParkingMap from './pages/customer/ParkingMap';
import MySessions from './pages/customer/MySessions';
import CustomerHistory from './pages/customer/CustomerHistory';
import CustomerProfile from './pages/customer/CustomerProfile';

type AdminPage = 'dashboard' | 'zones' | 'sessions' | 'history' | 'livemap' | 'customer';
type CustomerPage = 'find' | 'map' | 'sessions' | 'history' | 'profile';

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [adminPage, setAdminPage] = useState<AdminPage>('dashboard');
  const [customerPage, setCustomerPage] = useState<CustomerPage>('find');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading SmartPark...</p>
        </div>
      </div>
    );
  }

  if (!session || !profile) return <AuthPage />;

  if (profile.role === 'admin') {
    return (
      <AdminLayout activePage={adminPage} onNavigate={setAdminPage}>
        {adminPage === 'dashboard' && <AdminDashboard />}
        {adminPage === 'zones' && <ParkingZones />}
        {adminPage === 'sessions' && <ActiveSessions />}
        {adminPage === 'history' && <SessionHistory />}
        {adminPage === 'livemap' && <LiveMap />}
        {adminPage === 'customer' && <CustomerViewAdmin />}
      </AdminLayout>
    );
  }

  return (
    <CustomerLayout activePage={customerPage} onNavigate={setCustomerPage}>
      {customerPage === 'find' && <FindParking onSessionBooked={() => setCustomerPage('sessions')} />}
      {customerPage === 'map' && <ParkingMap onSessionBooked={() => setCustomerPage('sessions')} />}
      {customerPage === 'sessions' && <MySessions />}
      {customerPage === 'history' && <CustomerHistory />}
      {customerPage === 'profile' && <CustomerProfile />}
    </CustomerLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
