import { Routes, Route, Navigate } from 'react-router-dom'
import { isAuthenticated, getCurrentUser } from './services/api'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DriverDashboard from './pages/DriverDashboard'
import PassengerDashboard from './pages/PassengerDashboard'
import LandingDriver from './pages/LandingDriver'
import DriverOnboarding from './pages/DriverOnboarding'
import LandingPage from './pages/LandingPage'
import AdminPanel from './pages/AdminPanel'
import ErrorBoundary from './components/ErrorBoundary'

function ProtectedRoute({ children, requiredRole }) {
  if (!isAuthenticated()) {
    if (requiredRole === 'ADMIN') return <Navigate to="/admin/login" replace />
    return <Navigate to={`/${requiredRole === 'DRIVER' ? 'motorista' : 'passageiro'}`} replace />
  }
  const user = getCurrentUser()
  if (requiredRole && user?.role !== requiredRole) {
    if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />
    return <Navigate to={user?.role === 'DRIVER' ? '/motorista/dashboard' : '/passageiro/dashboard'} replace />
  }
  return children
}

function MobileLayout({ children }) {
  return <div className="app-container">{children}</div>
}

function RoleAutoRedirect() {
  if (isAuthenticated()) {
    const user = getCurrentUser()
    if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />
    return <Navigate to={user?.role === 'DRIVER' ? '/motorista/dashboard' : '/passageiro/dashboard'} replace />
  }
  return <LandingPage />
}

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<RoleAutoRedirect />} />

        {/* ==================================
            ADMIN
            ================================== */}
        <Route path="/admin/login" element={<MobileLayout><LoginPage forceRole="ADMIN" /></MobileLayout>} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* ==================================
            APP DO MOTORISTA
            ================================== */}
        <Route path="/motorista" element={<MobileLayout><LoginPage forceRole="DRIVER" /></MobileLayout>} />
        <Route path="/motorista/cadastro" element={<MobileLayout><RegisterPage forceRole="DRIVER" /></MobileLayout>} />
        <Route
          path="/motorista/onboarding"
          element={
            <ProtectedRoute requiredRole="DRIVER">
              <MobileLayout><DriverOnboarding /></MobileLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/motorista/dashboard"
          element={
            <ProtectedRoute requiredRole="DRIVER">
              <MobileLayout><DriverDashboard /></MobileLayout>
            </ProtectedRoute>
          }
        />

        {/* ==================================
            APP DO PASSAGEIRO
            ================================== */}
        <Route path="/passageiro" element={<MobileLayout><LoginPage forceRole="PASSENGER" /></MobileLayout>} />
        <Route path="/passageiro/cadastro" element={<MobileLayout><RegisterPage forceRole="PASSENGER" /></MobileLayout>} />
        <Route
          path="/passageiro/dashboard"
          element={
            <ProtectedRoute requiredRole="PASSENGER">
              <MobileLayout><PassengerDashboard /></MobileLayout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App
