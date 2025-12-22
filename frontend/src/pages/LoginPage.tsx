import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../services/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await login(email, password)
      
      localStorage.setItem('token', data.token)
      localStorage.setItem('role', data.user.role)
      localStorage.setItem('name', data.user.name)
      localStorage.setItem('id', data.user.id)
      
      navigate(data.user.role === 'admin' ? '/dashboard' : '/parking-status')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4">
      <span className="font-semibold text-4xl text-blue-600 text-center">Hệ Thống Bãi Xe Thông Minh</span>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="space-y-1">
          <label className="font-semibold text-s block text-left">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="" />
        </div>
        <div className="space-y-1">
          <label className="font-semibold text-s block text-left">Mật khẩu</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <button disabled={loading} className="w-full py-2 rounded bg-gray-900 text-white">{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
        <p className="text-xs text-center text-gray-500">
          Không có tài khoản?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Tạo tài khoản
          </Link>
        </p>
      </form>
    </div>
  )
}


