
import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import HistoryPage from './pages/HistoryPage'
import ReportsPage from './pages/ReportsPage'
import VehiclesPage from './pages/VehiclesPage'
import MonthlyPassPage from './pages/MonthlyPassPage'
import ParkingStatusPage from './pages/ParkingStatusPage'
import MyVehiclesPage from './pages/MyVehiclesPage'
import MyMonthlyPassPage from './pages/MyMonthlyPassPage'
import AppLayout from './components/AppLayout'

function RequireAuth({ children, role }: { children: React.ReactNode; role?: 'admin' | 'user' }) {
  const token = localStorage.getItem('token')
  const userRole = (localStorage.getItem('role') as 'admin' | 'user' | null) || undefined
  if (!token) return <Navigate to="/login" replace />
  if (role && userRole !== role) {
    return <Navigate to={userRole === 'admin' ? '/dashboard' : '/parking'} replace />
  }
  return children
}

function HomeRedirect() {
  const role = localStorage.getItem('role')
  if (role === 'admin') {
    return <Navigate to="/dashboard" replace />
  }
  return <Navigate to="/parking-status" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<HomeRedirect />} />
          <Route
            path="dashboard"
            element={
              <RequireAuth role="admin">
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route path="history" element={<HistoryPage />} />
          <Route
            path="reports"
            element={
              <RequireAuth role="admin">
                <ReportsPage />
              </RequireAuth>
            }
          />
          <Route
            path="vehicles"
            element={
              <RequireAuth role="admin">
                <VehiclesPage />
              </RequireAuth>
            }
          />
          <Route
            path="monthly-pass"
            element={
              <RequireAuth role="admin">
                <MonthlyPassPage />
              </RequireAuth>
            }
          />
          <Route
            path="parking-status"
            element={
              <RequireAuth role="user">
                <ParkingStatusPage />
              </RequireAuth>
            }
          />
          <Route
            path="my-vehicles"
            element={
              <RequireAuth role="user">
                <MyVehiclesPage />
              </RequireAuth>
            }
          />
          <Route
            path="my-monthly-pass"
            element={
              <RequireAuth role="user">
                <MyMonthlyPassPage />
              </RequireAuth>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
