import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import PrivateRoute from './auth/PrivateRoute'

// Landing corporativa
import LandingPage   from './pages/LandingPage'

// Intranet
import Login         from './pages/intranet/Login'
import Dashboard     from './pages/intranet/Dashboard'
import DaasLayout    from './components/DaasLayout'

// DAAS módulo
import DaasDashboard      from './pages/daas/Dashboard'
import Equipos            from './pages/daas/Equipos'
import Componentes        from './pages/daas/Componentes'
import Movimientos        from './pages/daas/Movimientos'
import Reportes           from './pages/daas/Reportes'
import DetalleEquipo      from './pages/daas/DetalleEquipo'
import DetalleComponente  from './pages/daas/DetalleComponente'
import DetalleMovimiento  from './pages/daas/DetalleMovimiento'
import PartSurfer         from './pages/daas/PartSurfer'

export default function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        {/* Sitio corporativo */}
        <Route path="/" element={<LandingPage />} />

        {/* Intranet — auth */}
        <Route path="/intranet/login" element={<Login />} />
        <Route path="/intranet" element={<Navigate to="/intranet/dashboard" replace />} />

        {/* Intranet — dashboard */}
        <Route path="/intranet/dashboard" element={
          <PrivateRoute><Dashboard /></PrivateRoute>
        } />

        {/* Módulo DAAS */}
        <Route path="/intranet/daas" element={
          <PrivateRoute><DaasLayout /></PrivateRoute>
        }>
          <Route index          element={<DaasDashboard />} />
          <Route path="equipos"              element={<Equipos />} />
          <Route path="equipos/:id"          element={<DetalleEquipo />} />
          <Route path="componentes"          element={<Componentes />} />
          <Route path="componentes/:id"      element={<DetalleComponente />} />
          <Route path="movimientos"          element={<Movimientos />} />
          <Route path="movimientos/:id"      element={<DetalleMovimiento />} />
          <Route path="reportes"             element={<Reportes />} />
          <Route path="partsurfer"           element={<PartSurfer />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
