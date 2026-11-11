import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Carregando() {
  return <div className="bg-black px-4 py-24 text-center text-white/70">Carregando...</div>
}

export function RequireAuth() {
  const { usuario, carregando } = useAuth()
  const local = useLocation()
  if (carregando) return <Carregando />
  if (!usuario) return <Navigate to="/login" replace state={{ de: local.pathname + local.search }} />
  return <Outlet />
}

export function RequireAdmin() {
  const { usuario, carregando } = useAuth()
  if (carregando) return <Carregando />
  if (!usuario || usuario.perfil !== 'admin') return <Navigate to="/admin/login" replace />
  return <Outlet />
}
