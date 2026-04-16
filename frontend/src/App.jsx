import { Routes, Route, Navigate } from 'react-router-dom'
import { isAuthenticated, getCurrentUser } from './services/api'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DriverDashboard from './pages/DriverDashboard'
import PassengerDashboard from './pages/PassengerDashboard'

function ProtectedRoute({ children, requiredRole }) {
  if (!isAuthenticated()) {
    return <Navigate to={`/${requiredRole === 'DRIVER' ? 'motorista' : 'passageiro'}`} replace />
  }
  const user = getCurrentUser()
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={user?.role === 'DRIVER' ? '/motorista/dashboard' : '/passageiro/dashboard'} replace />
  }
  return children
}

function RoleAutoRedirect() {
  if (isAuthenticated()) {
    const user = getCurrentUser()
    return <Navigate to={user?.role === 'DRIVER' ? '/motorista/dashboard' : '/passageiro/dashboard'} replace />
  }
  // If no auth and root visited, default direct to passenger app (could be a landing page later)
  return <Navigate to="/passageiro" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RoleAutoRedirect />} />

      {/* ==================================
          APP DO MOTORISTA
          ================================== */}
      <Route path="/motorista" element={<LoginPage forceRole="DRIVER" />} />
      <Route path="/motorista/cadastro" element={<RegisterPage forceRole="DRIVER" />} />
      <Route
        path="/motorista/dashboard"
        element={
          <ProtectedRoute requiredRole="DRIVER">
            <DriverDashboard />
          </ProtectedRoute>
        }
      />

      {/* ==================================
          APP DO PASSAGEIRO
          ================================== */}
      <Route path="/passageiro" element={<LoginPage forceRole="PASSENGER" />} />
      <Route path="/passageiro/cadastro" element={<RegisterPage forceRole="PASSENGER" />} />
      <Route
        path="/passageiro/dashboard"
        element={
          <ProtectedRoute requiredRole="PASSENGER">
            <PassengerDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
