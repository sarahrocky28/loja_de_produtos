import { useEffect, useState } from 'react'
import { api } from '../../api'
import Erro500 from '../../componentes/Erro500'
import { cartaoClasse } from '../../estilos'
import { formatarPreco } from '../../utils/formatarPreco'

export default function AdminInicio() {
  const [resumo, setResumo] = useState(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    api('/admin/resumo').then(setResumo).catch(() => setErro(true))
  }, [])

  if (erro) return <Erro500 />
  if (!resumo) return <p className="py-20 text-center text-white/70">Carregando...</p>

  const cards = [
    { rotulo: 'Pedidos', valor: resumo.pedidos },
    { rotulo: 'Produtos', valor: resumo.produtos },
    { rotulo: 'Clientes', valor: resumo.clientes },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <h1 className="text-2xl font-extrabold uppercase">
        Gestão da <span className="text-[#35dcee]">loja</span>
      </h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.rotulo} className={cartaoClasse}>
            <p className="text-xs font-bold uppercase text-white/70">{c.rotulo}</p>
            <p className="mt-2 text-4xl font-extrabold text-[#35dcee]">{c.valor}</p>
          </div>
        ))}
      </div>
      <div className={`${cartaoClasse} mt-4`}>
        <p className="text-xs font-bold uppercase text-white/70">Total vendido</p>
        <p className="mt-2 text-3xl font-extrabold text-[#35dcee]">{formatarPreco(resumo.total_vendido)}</p>
        <p className="mt-1 text-xs text-white/50">Soma dos pedidos já pagos (exceto cancelados).</p>
      </div>
    </div>
  )
}
