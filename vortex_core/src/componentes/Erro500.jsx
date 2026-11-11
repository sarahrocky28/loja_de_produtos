import { botaoClasse } from '../estilos'

export default function Erro500({ onRetry = () => window.location.reload() }) {
  return (
    <div className="bg-black px-4 py-20 text-center text-white md:py-28">
      <p className="text-6xl font-extrabold text-[#35dcee] md:text-8xl">500</p>
      <h1 className="mt-6 text-xl font-extrabold md:text-2xl">Ops! Nosso vórtice saiu do eixo.</h1>
      <p className="mt-3 text-sm text-white/80">Estamos enfrentando uma instabilidade no servidor.</p>
      <p className="mt-2 text-sm font-bold text-[#35dcee]">Calma, sua evolução não para por aqui.</p>
      <button type="button" onClick={onRetry} className={`${botaoClasse} mt-8`}>
        Tente novamente
      </button>
    </div>
  )
}
