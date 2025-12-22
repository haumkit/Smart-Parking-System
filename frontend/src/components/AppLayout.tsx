import { NavLink, Outlet, useNavigate } from 'react-router-dom'

export default function AppLayout() {
  const navigate = useNavigate()
  const name = localStorage.getItem('name') || 'User'
  const role = localStorage.getItem('role') || 'user'

  function logout() {
    localStorage.clear()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="bg-gray-600 border-b">
          <div className="max-w-7xl mx-auto py-2 flex items-center justify-between">
            <div className="flex items-center">
              <nav className="flex items-center gap-4 text-lg font-bold">
                {role === 'admin' && (
                  <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                      `rounded-md px-5 py-2 text-white ${
                        isActive ? 'bg-gray-800' : 'bg-gray-600 hover:bg-gray-700'
                      }`
                    }
                  >
                    TRANG CHỦ
                  </NavLink>
                )}
                {role === 'user' && (
                  <NavLink
                    to="/parking-status"
                    className={({ isActive }) =>
                      `rounded-md px-5 py-2 text-white ${
                        isActive ? 'bg-gray-800' : 'bg-gray-600 hover:bg-gray-700'
                      }`
                    }
                  >
                    TRẠNG THÁI BÃI
                  </NavLink>
                )}
                <NavLink
                  to="/history"
                  className={({ isActive }) =>
                    `rounded-md px-5 py-2 text-white ${
                      isActive ? 'bg-gray-800' : 'bg-gray-600 hover:bg-gray-700'
                    }`
                  }
                >
                  LỊCH SỬ
                </NavLink>
                {role === 'admin' && (
                  <NavLink
                    to="/reports"
                    className={({ isActive }) =>
                      `rounded-md px-5 py-2 text-white ${
                        isActive ? 'bg-gray-800' : 'bg-gray-600 hover:bg-gray-700'
                      }`
                    }
                  >
                    BÁO CÁO
                  </NavLink>
                )}
                <NavLink
                  to={role === 'admin' ? '/vehicles' : '/my-vehicles'}
                  className={({ isActive }) =>
                    `rounded-md px-5 py-2 text-white ${
                      isActive ? 'bg-gray-800' : 'bg-gray-600 hover:bg-gray-700'
                    }`
                  }
                >
                  PHƯƠNG TIỆN
                </NavLink>
                <NavLink
                  to={role === 'admin' ? '/monthly-pass' : '/my-monthly-pass'}
                  className={({ isActive }) =>
                    `rounded-md px-5 py-2 text-white ${
                      isActive ? 'bg-gray-800' : 'bg-gray-600 hover:bg-gray-700'
                    }`
                  }
                >
                  VÉ THÁNG
                </NavLink>
              </nav>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-white">{name} ({role})</span>
              <button onClick={logout} className="px-3 py-2 rounded bg-gray-900 text-white">Đăng xuất</button>
            </div>
          </div>
      </header>
      <main className="max-w-7xl mx-auto py-3">
        <Outlet />
      </main>
    </div>
  )
}


