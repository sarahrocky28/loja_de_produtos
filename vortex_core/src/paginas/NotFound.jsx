import { Link } from 'react-router-dom'
import { botaoClasse } from '../estilos'

export default function NotFound({ mensagem = 'Página não encontrada' }) {
  return (
    <div className="bg-black px-4 py-20 text-center text-white md:py-28">
      <p className="font-title text-6xl text-[#35dcee] md:text-8xl">404</p>
      <h1 className="mt-6 text-xl font-extrabold uppercase md:text-2xl">{mensagem}</h1>
      <Link to="/" className={`${botaoClasse} mt-8 inline-block`}>
        Voltar ao início
      </Link>
    </div>
  )
}
