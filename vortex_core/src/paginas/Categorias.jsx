import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FiSearch } from 'react-icons/fi'
import { api } from '../api'
import CardProduto from '../componentes/CardProduto'
import Erro500 from '../componentes/Erro500'
import { inputClasse, paginaClasse } from '../estilos'

const ABAS = [
  { chave: 'todos', rotulo: 'Todos' },
  { chave: 'suplementos', rotulo: 'Suplementos' },
  { chave: 'acessorios', rotulo: 'Acessórios' },
  { chave: 'roupas', rotulo: 'Roupas' },
]

// Serve para /categorias e /produtos (com ?categoria=suplementos&busca=whey)
export default function Categorias() {
  const [params, setParams] = useSearchParams()
  const categoria = params.get('categoria') || 'todos'
  const busca = params.get('busca') || ''

  const [texto, setTexto] = useState(busca)
  const [estado, setEstado] = useState({ carregando: true, produtos: [], erro: false })
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => setTexto(busca), [busca])

  useEffect(() => {
    let ativo = true
    setEstado((e) => ({ ...e, carregando: true, erro: false }))
    const q = new URLSearchParams()
    if (categoria !== 'todos') q.set('categoria', categoria)
    if (busca) q.set('busca', busca)
    api(`/produtos?${q}`)
      .then((d) => ativo && setEstado({ carregando: false, produtos: d.produtos, erro: false }))
      .catch(() => ativo && setEstado({ carregando: false, produtos: [], erro: true }))
    return () => {
      ativo = false
    }
  }, [categoria, busca, tentativa])

  function linkDaAba(chave) {
    const q = new URLSearchParams()
    if (chave !== 'todos') q.set('categoria', chave)
    if (busca) q.set('busca', busca)
    return `/produtos?${q}`
  }

  function pesquisar(e) {
    e.preventDefault()
    const q = new URLSearchParams()
    if (categoria !== 'todos') q.set('categoria', categoria)
    if (texto.trim()) q.set('busca', texto.trim())
    setParams(q)
  }

  if (estado.erro) return <Erro500 onRetry={() => setTentativa((t) => t + 1)} />

  return (
    <div className={`${paginaClasse} min-h-[60vh]`}>
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <p className="text-sm uppercase">Vortex Core</p>
        <h1 className="mt-1 text-2xl font-extrabold uppercase md:text-3xl">
          No centro da sua <span className="text-[#35dcee]">evolução.</span>
        </h1>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <nav className="flex flex-wrap gap-2" aria-label="Categorias">
            {ABAS.map((aba) => (
              <Link
                key={aba.chave}
                to={linkDaAba(aba.chave)}
                className={`rounded px-4 py-1.5 text-xs font-bold uppercase transition ${
                  categoria === aba.chave ? 'bg-[#35dcee] text-black' : 'border border-white/30 hover:border-[#35dcee]'
                }`}
              >
                {aba.rotulo}
              </Link>
            ))}
          </nav>
          <form onSubmit={pesquisar} className="relative w-full md:w-64">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar produtos"
              className={`${inputClasse} pr-9`}
            />
            <button type="submit" aria-label="Buscar" className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-[#35dcee]">
              <FiSearch />
            </button>
          </form>
        </div>

        {estado.carregando ? (
          <p className="py-16 text-center text-white/70">Carregando produtos...</p>
        ) : estado.produtos.length === 0 ? (
          <p className="py-16 text-center text-white/70">Nenhum produto encontrado.</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {estado.produtos.map((p) => (
              <CardProduto key={p.id} produto={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
