import { Link, Outlet, useNavigate } from 'react-router-dom'

export default function AppLayout() {
  const navigate = useNavigate()
  const name = localStorage.getItem('name') || 'User'
  const role = (localStorage.getItem('role') as 'admin' | 'user') || 'user'

  function logout() {
    localStorage.clear()
    navigate('/login')
  }

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', emoji: '📊', adminOnly: true },
    { to: '/parking', label: 'Parking', emoji: '🅿️', adminOnly: false },
    { to: '/history', label: 'History', emoji: '📜', adminOnly: false },
    { to: '/ai-test', label: 'AI Test', emoji: '🧠', adminOnly: true },
    { to: '/reports', label: 'Reports', emoji: '📈', adminOnly: true },
  ]

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="rounded-full bg-blue-600 text-white w-12 h-12 grid place-items-center text-2xl">🚗</div>
              <div>
                <div className="text-lg font-semibold">Smart Parking</div>
                <div className="text-xs text-gray-500">License Plate & Slot Detection</div>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-2 ml-6">
              {navItems.map((n) =>
                (!n.adminOnly || role === 'admin') ? (
                  <Link
                    key={n.to}
                    to={n.to}
                    className="px-3 py-2 rounded-md text-sm hover:bg-blue-50 hover:text-blue-600"
                  >
                    <span className="mr-2">{n.emoji}</span>{n.label}
                  </Link>
                ) : null
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600 hidden sm:block">{name} • <span className="font-medium">{role}</span></div>
            <button
              onClick={logout}
              className="px-3 py-2 rounded-md bg-gray-800 text-white text-sm hover:bg-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="mt-10 py-6 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 text-sm text-gray-500 text-center">
          © {new Date().getFullYear()} Smart Parking — Built with ❤️
        </div>
      </footer>
    </div>
  )
}


