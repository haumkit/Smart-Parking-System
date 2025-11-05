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
      
      navigate(data.user.role === 'admin' ? '/dashboard' : '/parking')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4">
      <span className="font-bold text-2xl text-blue-600">Smart Parking System</span>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="space-y-1">
          <label className="font-semibold text-sm block text-left">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="" />
        </div>
        <div className="space-y-1">
          <label className="font-semibold text-sm block text-left">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <button disabled={loading} className="w-full py-2 rounded bg-gray-900 text-white">{loading ? 'Signing in...' : 'Sign in'}</button>
        <p className="text-xs text-center text-gray-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </div>
  )
}


