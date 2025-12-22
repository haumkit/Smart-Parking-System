import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../services/auth'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)
    try {
      const data = await register(name, email, password, 'user')
      

      localStorage.setItem('token', data.token)
      localStorage.setItem('role', data.user.role)
      localStorage.setItem('name', data.user.name)
      localStorage.setItem('id', data.user.id)
      
      setSuccess(true)

      const redirectPath = data.user.role === 'admin' ? '/dashboard' : '/parking-status'
      setTimeout(() => navigate(redirectPath), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Tạo tài khoản</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">✅ Đăng ký thành công! Đang chuyển hướng...</p>}
        
        <div className="space-y-1">
          <label className="font-semibold text-s block text-left">Tên</label>
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="w-full border rounded px-3 py-2" 
            placeholder="Tên của bạn"
            required
          />
        </div>
        
        <div className="space-y-1">
          <label className="font-semibold text-s block text-left">Email</label>
          <input 
            type="email"
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="w-full border rounded px-3 py-2" 
            placeholder="you@example.com"
            required
          />
        </div>
        
        <div className="space-y-1">
          <label className="font-semibold text-s block text-left">Mật khẩu</label>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        
        <button disabled={loading} className="w-full py-2 rounded bg-gray-900 text-white">
          {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
        </button>
        
        <p className="text-xs text-center text-gray-500">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </form>
    </div>
  )
}

