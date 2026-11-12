import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaRegHeart } from 'react-icons/fa'
import { api } from '../api'
import { useFavoritos } from '../contexts/FavoritosContext'
import CardProduto from '../componentes/CardProduto'
import Erro500 from '../componentes/Erro500'
import { botaoClasse, paginaClasse } from '../estilos'

export default function Favoritos() {
  const { ids } = useFavoritos()
  const [produtos, setProdutos] = useState(null)
  const [erro, setErro] = useState(false)

  // recarrega a lista sempre que um coração é clicado (ids muda)
  useEffect(() => {
    api('/favoritos')
      .then((d) => setProdutos(d.produtos))
      .catch(() => setErro(true))
  }, [ids])

  if (erro) return <Erro500 />
  if (!produtos) return <div className={`${paginaClasse} py-24 text-center text-white/70`}>Carregando...</div>

  return (
    <div className={`${paginaClasse} min-h-[60vh]`}>
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <h1 className="text-2xl font-extrabold uppercase">
          Seus <span className="text-[#35dcee]">favoritos</span>
        </h1>
        {produtos.length === 0 ? (
          <div className="py-20 text-center">
            <FaRegHeart className="mx-auto text-5xl text-[#35dcee]" />
            <p className="mt-4 font-bold">Você ainda não favoritou nada</p>
            <p className="mt-1 text-sm text-white/70">Toque no coração de um produto para guardá-lo aqui.</p>
            <Link to="/produtos" className={`${botaoClasse} mt-6 inline-block`}>Explorar produtos</Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {produtos.map((p) => <CardProduto key={p.id} produto={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
