import { Routes, Route, Navigate } from 'react-router-dom'
import { isAuthenticated, getCurrentUser } from './services/api'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DriverDashboard from './pages/DriverDashboard'
import PassengerDashboard from './pages/PassengerDashboard'

function ProtectedRoute({ children, requiredRole }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  const user = getCurrentUser()
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={user?.role === 'DRIVER' ? '/driver' : '/passenger'} replace />
  }
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/driver"
        element={
          <ProtectedRoute requiredRole="DRIVER">
            <DriverDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/passenger"
        element={
          <ProtectedRoute requiredRole="PASSENGER">
            <PassengerDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
