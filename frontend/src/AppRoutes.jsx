import { Routes, Route } from 'react-router-dom'
import App from './App'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ProtectedRoute from './components/ProtectedRoute'
import AuthLayout from './components/AuthLayout'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <App />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
