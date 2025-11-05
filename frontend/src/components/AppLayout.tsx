import { Link, Outlet, useNavigate } from 'react-router-dom'

export default function AppLayout() {
  const navigate = useNavigate()
  const name = localStorage.getItem('name') || 'User'
  const role = localStorage.getItem('role') || 'user'

  function logout() {
    localStorage.clear()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <span className="font-bold text-4xl text-blue-600">Smart Parking System</span>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <nav className="flex items-center gap-6 text-sm">
                {role === 'admin' && (
                  <>
                    <Link to="/dashboard" className="hover:underline focus:bg-red-500 rounded-md px-3 py-2 bg-blue-600 text-white">Dashboard</Link>
                  </>
                )}
                <Link to="/parking" className="hover:underline focus:bg-red-500 rounded-md px-3 py-2 bg-blue-600 text-white">Parking</Link>
                <Link to="/history" className="hover:underline focus:bg-red-500 rounded-md px-3 py-2 bg-blue-600 text-white">History</Link>
                {role === 'admin' && (
                  <>
                    <Link to="/reports" className="hover:underline focus:bg-red-500 rounded-md px-3 py-2 bg-blue-600 text-white">Reports</Link>
                  </>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-600">{name} ({role})</span>
              <button onClick={logout} className="px-3 py-1 rounded bg-gray-900 text-white">Logout</button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}


