import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { FiShoppingCart, FiCheck } from 'react-icons/fi'
import { FaHeart, FaRegHeart } from 'react-icons/fa'
import { formatarPreco } from '../utils/formatarPreco'
import { urlImagem, aoFalharImagem } from '../utils/imagem'
import { useCart } from '../contexts/CartContext'
import { useFavoritos } from '../contexts/FavoritosContext'

export default function CardProduto({ produto }) {
  const { adicionar } = useCart()
  const { ehFavorito, alternar } = useFavoritos()
  const navigate = useNavigate()
  const local = useLocation()
  const [adicionado, setAdicionado] = useState(false)
  const esgotado = produto.estoque <= 0
  const favorito = ehFavorito(produto.id)

  function tratarErro(e) {
    if (e.status === 401) navigate('/login', { state: { de: local.pathname + local.search } })
    else alert(e.message)
  }

  async function aoClicarNoCarrinho() {
    try {
      await adicionar(produto.id, 1)
      setAdicionado(true)
      setTimeout(() => setAdicionado(false), 1500)
    } catch (e) {
      tratarErro(e)
    }
  }

  async function aoClicarNoCoracao() {
    try {
      await alternar(produto.id)
    } catch (e) {
      tratarErro(e)
    }
  }

  return (
    <article className="flex flex-col rounded border border-[#35dcee]/60 bg-[#0d0d0d] p-3 text-white">
      <div className="relative">
        <Link to={`/produtos/${produto.id}`} className="block">
          <img
            src={urlImagem(produto.imagem)}
            onError={aoFalharImagem}
            alt={produto.nome}
            loading="lazy"
            className="aspect-[3/4] w-full bg-neutral-900 object-contain"
          />
        </Link>
        <button
          type="button"
          onClick={aoClicarNoCoracao}
          aria-label={favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-lg text-[#35dcee] transition hover:scale-110"
        >
          {favorito ? <FaHeart /> : <FaRegHeart />}
        </button>
      </div>

      <Link to={`/produtos/${produto.id}`} className="block">
        <h3 className="mt-3 text-xs font-bold uppercase tracking-wide">{produto.nome}</h3>
      </Link>

      <p className="mt-1 text-lg font-bold text-[#35dcee]">{formatarPreco(produto.preco)}</p>

      <div className="mt-3 flex gap-2">
        <Link
          to={`/produtos/${produto.id}`}
          className="flex-1 rounded bg-[#2a909b] py-2 text-center text-xs font-bold uppercase tracking-wide transition hover:brightness-125"
        >
          {esgotado ? 'Esgotado' : 'Comprar'}
        </Link>
        <button
          type="button"
          disabled={esgotado}
          aria-label={`Adicionar ${produto.nome} ao carrinho`}
          onClick={aoClicarNoCarrinho}
          className="rounded bg-[#2a909b] px-3 text-lg transition hover:brightness-125 disabled:opacity-40"
        >
          {adicionado ? <FiCheck /> : <FiShoppingCart />}
        </button>
      </div>
    </article>
  )
}
