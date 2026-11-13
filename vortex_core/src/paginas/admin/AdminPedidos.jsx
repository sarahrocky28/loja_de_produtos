import { useEffect, useState } from 'react'
import { api } from '../../api'
import Erro500 from '../../componentes/Erro500'
import { botaoClasse, cartaoClasse, inputClasse } from '../../estilos'
import { formatarPreco } from '../../utils/formatarPreco'
import { urlImagem, aoFalharImagem } from '../../utils/imagem'
import { STATUS_PEDIDO, ROTULO_ENTREGA, formatarData } from '../../utils/status'

const ACOES = ['em_separacao', 'enviado', 'entregue', 'cancelado']

function CartaoPedido({ pedido, aoSalvar }) {
  const [status, setStatus] = useState(ACOES.includes(pedido.status) ? pedido.status : '')
  const [rastreio, setRastreio] = useState(pedido.codigo_rastreio || '')
  const [msg, setMsg] = useState('')
  const bloqueado = pedido.status === 'cancelado' || pedido.status === 'entregue'

  async function salvar() {
    setMsg('')
    try {
      await api(`/admin/pedidos/${pedido.id_pedido}`, { method: 'PATCH', corpo: { status, codigo_rastreio: rastreio } })
      aoSalvar()
    } catch (e) {
      setMsg(e.message)
    }
  }

  return (
    <article className={`${cartaoClasse} text-sm`}>
      <div className="flex flex-wrap justify-between gap-2">
        <p className="font-bold">Pedido #{pedido.id_pedido} · {formatarData(pedido.data_pedido)}</p>
        <span className="font-bold text-[#35dcee]">{STATUS_PEDIDO[pedido.status]}</span>
      </div>
      <p className="text-white/70">{pedido.cliente} · {pedido.email_cliente}</p>
      <p className="text-white/70">Entrega: {ROTULO_ENTREGA[pedido.entrega]}</p>
      <ul className="mt-3 space-y-2">
        {pedido.itens.map((i) => (
          <li key={i.id_produto} className="flex items-center gap-3">
            <img src={urlImagem(i.imagem)} onError={aoFalharImagem} alt="" className="h-12 w-10 rounded bg-neutral-900 object-contain" />
            <span className="flex-1 uppercase">{i.quantidade}x {i.nome}</span>
            <span>{formatarPreco(i.preco_unitario * i.quantidade)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 font-bold">
        Total: {formatarPreco(pedido.total)}
        {pedido.pagamento && <span className="ml-2 font-normal text-white/60">({pedido.pagamento.metodo} · {pedido.pagamento.status})</span>}
      </p>

      {pedido.status === 'aguardando_pagamento' && <p className="mt-2 text-white/60">Aguardando o pagamento do cliente.</p>}
      {!bloqueado && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClasse} !w-auto bg-black`}>
            <option value="" disabled>Alterar status...</option>
            {ACOES.map((a) => <option key={a} value={a}>{STATUS_PEDIDO[a]}</option>)}
          </select>
          {status === 'enviado' && (
            <input value={rastreio} onChange={(e) => setRastreio(e.target.value)} placeholder="Código de rastreio" className={`${inputClasse} !w-52`} />
          )}
          <button type="button" disabled={!status} onClick={salvar} className={botaoClasse}>Salvar</button>
        </div>
      )}
      {msg && <p className="mt-2 text-red-400">{msg}</p>}
    </article>
  )
}

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState(null)
  const [erro, setErro] = useState(false)

  function carregar() {
    api('/admin/pedidos').then((d) => setPedidos(d.pedidos)).catch(() => setErro(true))
  }
  useEffect(carregar, [])

  if (erro) return <Erro500 />
  if (!pedidos) return <p className="py-20 text-center text-white/70">Carregando...</p>

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-8">
      <h1 className="text-2xl font-extrabold uppercase">Pedidos</h1>
      {pedidos.length === 0 ? (
        <p className="py-16 text-center text-white/60">Nenhum pedido ainda.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {pedidos.map((p) => <CartaoPedido key={`${p.id_pedido}-${p.status}`} pedido={p} aoSalvar={carregar} />)}
        </div>
      )}
    </div>
  )
}
