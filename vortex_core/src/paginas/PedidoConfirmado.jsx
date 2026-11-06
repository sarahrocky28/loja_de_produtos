import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { FiCheckCircle, FiClock, FiXCircle } from 'react-icons/fi'
import { api } from '../api'
import { botaoClasse, paginaClasse } from '../estilos'

// O Mercado Pago devolve o cliente para cá: /pedido-confirmado?pedido=12&payment_id=...&status=approved
export default function PedidoConfirmado() {
  const [params] = useSearchParams()
  const local = useLocation()
  const idPedido = params.get('pedido')
  const paymentId = params.get('payment_id') || params.get('collection_id')
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!idPedido) return
    api('/pagamentos/sincronizar', {
      method: 'POST',
      corpo: { id_pedido: Number(idPedido), payment_id: paymentId && paymentId !== 'null' ? paymentId : undefined },
    })
      .then(setDados)
      .catch((e) => setErro(e.message))
  }, [idPedido, paymentId])

  if (!idPedido) {
    return <div className={`${paginaClasse} py-24 text-center`}>Nenhum pedido informado.</div>
  }
  if (erro) return <div className={`${paginaClasse} py-24 text-center text-red-400`}>{erro}</div>
  if (!dados) return <div className={`${paginaClasse} py-24 text-center text-white/70`}>Confirmando seu pagamento...</div>

  const statusPedido = dados.pedido.status
  const statusPagamento = dados.pagamento?.status
  let Icone = FiClock
  let titulo = 'Aguardando pagamento'
  let texto = local.state?.aviso || 'Assim que o pagamento for confirmado, atualizamos seu pedido.'

  if (['pago', 'em_separacao', 'enviado', 'entregue'].includes(statusPedido)) {
    Icone = FiCheckCircle
    titulo = 'Pedido confirmado!'
    texto = 'Sua compra foi realizada com sucesso.'
  } else if (statusPagamento === 'recusado' || statusPagamento === 'cancelado' || statusPedido === 'cancelado') {
    Icone = FiXCircle
    titulo = 'Pagamento não aprovado'
    texto = 'O pagamento não foi concluído. Você pode tentar de novo pelo seu perfil.'
  }

  return (
    <div className={`${paginaClasse} px-4 py-20 text-center md:py-28`}>
      <Icone className="mx-auto text-6xl text-[#35dcee]" />
      <h1 className="mt-4 text-2xl font-extrabold uppercase">{titulo}</h1>
      <p className="mt-2 text-sm text-white/80">{texto}</p>
      <p className="mt-1 text-xs text-white/50">Pedido #{idPedido}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className={botaoClasse}>Voltar ao início</Link>
        <Link to="/perfil" className="rounded border border-white/30 px-5 py-2 text-sm font-bold uppercase hover:border-[#35dcee]">Meus pedidos</Link>
      </div>
    </div>
  )
}
