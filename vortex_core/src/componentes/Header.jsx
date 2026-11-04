import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { FiUser, FiSearch, FiShoppingBag, FiMenu, FiX } from 'react-icons/fi'


const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/categorias', label: 'Categorias' },
  { to: '/contato', label: 'Contato' },
]

export default function Header() {
  const [menuAberto, setMenuAberto] = useState(false)
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [termo, setTermo] = useState('')
  const navigate = useNavigate()

  // Depois isso vai vir do carrinho de verdade
  const quantidadeNoCarrinho = 0

  function buscar(e) {
    e.preventDefault()
    const texto = termo.trim()
    if (texto) navigate(`/produtos?busca=${encodeURIComponent(texto)}`)
    setBuscaAberta(false)
    setTermo('')
  }

  const classeLink = ({ isActive }) =>
    `text-sm uppercase tracking-wider transition-colors hover:text-[#35dcee] ${
      isActive ? 'text-[#35dcee]' : 'text-white'
    }`

  const classeIcone =
    'relative p-2 text-white text-xl transition-colors hover:text-[#35dcee]'

  return (
    <>
      {/* Faixa de cima */}
      <div className="bg-[#35dcee] px-2 py-1 text-center text-xs font-bold uppercase tracking-wide text-black sm:text-sm">
        Frete grátis acima de {FRETE_GRATIS} • No centro da sua evolução
      </div>

      <header className="sticky top-0 z-50 bg-[#1a1a1a] text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center px-4 py-3 md:grid-cols-[1fr_auto_1fr] md:px-8">
          {/* Logo (clicável, leva para o início) */}
          <Link to="/" aria-label="Vortex Core - Início" className="justify-self-start">
            <img
              src="/logo.png"
              alt="Vortex Core"
              className="h-10 w-auto md:h-12"
            />
          </Link>

          {/* Menu central (só no computador) */}
          <nav className="hidden items-center gap-10 md:flex" aria-label="Principal">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={classeLink}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          {/* Ícones */}
          <div className="flex items-center justify-self-end gap-1">
            <Link to="/login" aria-label="Minha conta" className={classeIcone}>
              <FiUser />
            </Link>

            <button
              type="button"
              aria-label="Pesquisar"
              onClick={() => setBuscaAberta((aberta) => !aberta)}
              className={classeIcone}
            >
              <FiSearch />
            </button>

            <Link to="/carrinho" aria-label="Carrinho" className={classeIcone}>
              <FiShoppingBag />
              {quantidadeNoCarrinho > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#35dcee] px-1 text-[10px] font-bold text-black">
                  {quantidadeNoCarrinho}
                </span>
              )}
            </Link>

            {/* Botão do menu (só no celular) */}
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setMenuAberto((aberto) => !aberto)}
              className={`${classeIcone} md:hidden`}
            >
              {menuAberto ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>

        {/* Barra de pesquisa */}
        {buscaAberta && (
          <form
            onSubmit={buscar}
            className="mx-auto flex max-w-7xl gap-2 px-4 pb-3 md:px-8"
          >
            <input
              type="text"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Buscar produtos..."
              autoFocus
              className="w-full rounded border border-white/30 bg-transparent px-3 py-2 text-sm text-white placeholder-white/50 outline-none focus:border-[#35dcee]"
            />
            <button
              type="submit"
              className="rounded bg-[#35dcee] px-4 py-2 text-sm font-bold uppercase text-black hover:brightness-110"
            >
              Buscar
            </button>
          </form>
        )}

        {/* Menu do celular */}
        {menuAberto && (
          <nav
            className="flex flex-col gap-4 border-t border-white/10 px-4 py-4 md:hidden"
            aria-label="Menu do celular"
          >
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={classeLink}
                onClick={() => setMenuAberto(false)}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
    </>
  )
}
