import { Link } from 'react-router-dom'
import { FiShoppingCart } from 'react-icons/fi'
import { formatarPreco } from '../utils/formatarPreco'

// produto = { id, nome, preco (em centavos), imagem }
// onAdicionar: função chamada ao clicar no carrinho (vamos ligar ao carrinho depois)
export default function CardProduto({ produto, onAdicionar = () => {} }) {
  return (
    <article className="flex flex-col rounded border border-[#35dcee]/60 bg-[#0d0d0d] p-3 text-white">
      <Link to={`/produtos/${produto.id}`} className="block">
        <img
          src={produto.imagem}
          alt={produto.nome}
          loading="lazy"
          className="aspect-[3/4] w-full bg-neutral-900 object-contain"
        />
        <h3 className="mt-3 text-xs font-bold uppercase tracking-wide">
          {produto.nome}
        </h3>
      </Link>

      <p className="mt-1 text-lg font-bold text-[#35dcee]">
        {formatarPreco(produto.preco)}
      </p>

      <div className="mt-3 flex gap-2">
        <Link
          to={`/produtos/${produto.id}`}
          className="flex-1 rounded bg-[#2a909b] py-2 text-center text-xs font-bold uppercase tracking-wide transition hover:brightness-125"
        >
          Comprar
        </Link>
        <button
          type="button"
          aria-label={`Adicionar ${produto.nome} ao carrinho`}
          onClick={() => onAdicionar(produto)}
          className="rounded bg-[#2a909b] px-3 text-lg transition hover:brightness-125"
        >
          <FiShoppingCart />
        </button>
      </div>
    </article>
  )
}
