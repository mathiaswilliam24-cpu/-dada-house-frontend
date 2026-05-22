import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-800 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏠</span>
            <span className="text-xl font-bold tracking-tight">DADA HOUSE</span>
            <span className="text-brand-200 text-sm font-medium">Admin Dashboard</span>
          </div>
          <nav className="flex gap-6 text-sm font-medium">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive ? 'text-white underline underline-offset-4' : 'text-brand-200 hover:text-white transition-colors'
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/appointments"
              className={({ isActive }) =>
                isActive ? 'text-white underline underline-offset-4' : 'text-brand-200 hover:text-white transition-colors'
              }
            >
              Appointments
            </NavLink>
            <NavLink
              to="/clients"
              className={({ isActive }) =>
                isActive ? 'text-white underline underline-offset-4' : 'text-brand-200 hover:text-white transition-colors'
              }
            >
              CRM
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {children}
      </main>

      <footer className="bg-white border-t text-center text-xs text-gray-400 py-4">
        DADA HOUSE AI Voice Agent System
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
