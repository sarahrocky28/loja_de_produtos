import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom'
import { FiMinus, FiPlus } from 'react-icons/fi'
import { FaHeart, FaRegHeart } from 'react-icons/fa'
import { api } from '../api'
import { useCart } from '../contexts/CartContext'
import { useFavoritos } from '../contexts/FavoritosContext'
import { formatarPreco } from '../utils/formatarPreco'
import { urlImagem, aoFalharImagem } from '../utils/imagem'
import NotFound from './NotFound'
import Erro500 from '../componentes/Erro500'
import { botaoTealClasse, labelClasse, paginaClasse } from '../estilos'

export default function Produto() {
  const { id } = useParams()
  const { adicionar } = useCart()
  const { ehFavorito, alternar } = useFavoritos()
  const navigate = useNavigate()
  const local = useLocation()

  const [produto, setProduto] = useState(null)
  const [estado, setEstado] = useState('carregando') // carregando | ok | naoEncontrado | erro
  const [qtd, setQtd] = useState(1)
  const [fotoAtual, setFotoAtual] = useState(0)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    setEstado('carregando')
    setFotoAtual(0)
    setQtd(1)
    api(`/produtos/${id}`)
      .then((d) => {
        setProduto(d.produto)
        setEstado('ok')
      })
      .catch((e) => setEstado(e.status === 404 ? 'naoEncontrado' : 'erro'))
  }, [id])

  if (estado === 'naoEncontrado') return <NotFound mensagem="Produto não encontrado" />
  if (estado === 'erro') return <Erro500 />
  if (estado === 'carregando') return <div className={`${paginaClasse} py-24 text-center text-white/70`}>Carregando...</div>

  const esgotado = produto.estoque <= 0
  const fotos = produto.imagens.length > 0 ? produto.imagens : [null] // [null] mostra a imagem padrão
  const favorito = ehFavorito(produto.id)

  function tratarErro(e) {
    if (e.status === 401) navigate('/login', { state: { de: local.pathname } })
    else setMensagem(e.message)
  }

  async function adicionarAoCarrinho() {
    setMensagem('')
    try {
      await adicionar(produto.id, qtd)
      setMensagem('Produto adicionado ao carrinho!')
    } catch (e) {
      tratarErro(e)
    }
  }

  async function favoritar() {
    try {
      await alternar(produto.id)
    } catch (e) {
      tratarErro(e)
    }
  }

  return (
    <div className={paginaClasse}>
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <p className="text-xs uppercase text-white/70">
          <Link to="/" className="hover:text-[#35dcee]">Vortex Core</Link> /{' '}
          <Link to={`/produtos?categoria=${produto.grupo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`} className="hover:text-[#35dcee]">
            {produto.grupo}
          </Link>
        </p>

        <div className="mt-6 grid gap-8 md:grid-cols-2">
          {/* Galeria: foto grande + miniaturas */}
          <div>
            <img
              src={urlImagem(fotos[fotoAtual])}
              onError={aoFalharImagem}
              alt={produto.nome}
              className="aspect-[3/4] w-full rounded border border-white/20 bg-neutral-900 object-contain"
            />
            {fotos.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {fotos.map((foto, i) => (
                  <button
                    key={foto}
                    type="button"
                    onClick={() => setFotoAtual(i)}
                    aria-label={`Ver foto ${i + 1}`}
                    className={`h-20 w-16 shrink-0 rounded border bg-neutral-900 p-0.5 ${i === fotoAtual ? 'border-[#35dcee]' : 'border-white/20'}`}
                  >
                    <img src={urlImagem(foto)} onError={aoFalharImagem} alt="" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-extrabold uppercase md:text-3xl">{produto.nome}</h1>
            {produto.descricao && <p className="mt-3 text-sm text-white/80">{produto.descricao}</p>}
            <p className="mt-5 text-2xl font-bold text-[#35dcee]">{formatarPreco(produto.preco)}</p>

            <div className="mt-6">
              <span className={labelClasse}>Quantidade</span>
              <div className="inline-flex items-center rounded border border-white/30">
                <button type="button" aria-label="Diminuir" onClick={() => setQtd((q) => Math.max(1, q - 1))} className="px-3 py-2 hover:text-[#35dcee]">
                  <FiMinus />
                </button>
                <span className="w-10 text-center text-sm">{qtd}</span>
                <button type="button" aria-label="Aumentar" onClick={() => setQtd((q) => Math.min(produto.estoque, q + 1))} className="px-3 py-2 hover:text-[#35dcee]">
                  <FiPlus />
                </button>
              </div>
              <p className="mt-2 text-xs text-white/60">
                {esgotado ? 'Produto esgotado' : `${produto.estoque} em estoque`}
              </p>
            </div>

            <div className="mt-6 flex gap-2">
              <button type="button" disabled={esgotado} onClick={adicionarAoCarrinho} className={`${botaoTealClasse} flex-1 py-3`}>
                {esgotado ? 'Esgotado' : 'Adicionar ao carrinho'}
              </button>
              <button
                type="button"
                onClick={favoritar}
                aria-label={favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                className="rounded border border-white/30 px-4 text-xl text-[#35dcee] hover:border-[#35dcee]"
              >
                {favorito ? <FaHeart /> : <FaRegHeart />}
              </button>
            </div>
            {mensagem && (
              <p className="mt-3 text-sm text-[#35dcee]">
                {mensagem} {mensagem.includes('adicionado') && <Link to="/carrinho" className="underline">Ver carrinho</Link>}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
