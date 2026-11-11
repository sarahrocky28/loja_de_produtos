import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { FiUser, FiLogOut } from 'react-icons/fi'
import { useAuth } from '../../contexts/AuthContext'
import ErrorBoundary from '../../componentes/ErrorBoundary'

const links = [
  { to: '/admin/pedidos', label: 'Pedidos' },
  { to: '/admin/produtos', label: 'Produtos' },
  { to: '/admin/clientes', label: 'Clientes' },
]

export default function AdminLayout() {
  const { usuario, sair } = useAuth()
  const navigate = useNavigate()
  const logado = usuario?.perfil === 'admin'

  const classeLink = ({ isActive }) =>
    `text-sm uppercase tracking-wider hover:text-[#35dcee] ${isActive ? 'text-[#35dcee]' : 'text-white'}`

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <div className="bg-[#35dcee] px-2 py-1 text-center text-xs font-bold uppercase text-black">
        Painel do administrador
      </div>
      <header className="border-b border-white/10 bg-[#1a1a1a]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <Link to="/admin" aria-label="Início do painel">
            <img src="/logo.png" alt="Vortex Core" className="h-10 w-auto" />
          </Link>
          {logado && (
            <nav className="flex items-center gap-6" aria-label="Painel">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} className={classeLink}>{l.label}</NavLink>
              ))}
            </nav>
          )}
          {logado && (
            <div className="flex items-center gap-1 text-xl">
              <Link to="/admin/perfil" aria-label="Meu perfil" className="p-2 hover:text-[#35dcee]"><FiUser /></Link>
              <button type="button" aria-label="Sair" onClick={() => { sair(); navigate('/admin/login') }} className="p-2 hover:text-[#35dcee]"><FiLogOut /></button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        <ErrorBoundary><Outlet /></ErrorBoundary>
      </main>

      <footer className="bg-[#2a909b] px-4 py-3 text-center text-xs font-bold uppercase text-white md:flex md:justify-between md:px-8">
        <span>© {new Date().getFullYear()} Vortex Core Ltda</span>
        <span>R. Vortex, 000 - Core - SP</span>
      </footer>
    </div>
  )
}
