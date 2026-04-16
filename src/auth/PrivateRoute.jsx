import { Navigate, useLocation } from 'react-router-dom'

export default function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  const location = useLocation()
  if (!token) return <Navigate to="/intranet/login" replace state={{ from: location }} />
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      return <Navigate to="/intranet/login" replace state={{ sessionExpired: true }} />
    }
  } catch {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    return <Navigate to="/intranet/login" replace />
  }
  return children
}
