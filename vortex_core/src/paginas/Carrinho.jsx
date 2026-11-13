import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiShoppingCart, FiMinus, FiPlus, FiTrash2 } from 'react-icons/fi'
import { api } from '../api'
import { useCart } from '../contexts/CartContext'
import EnderecoForm, { ENDERECO_VAZIO } from '../componentes/EnderecoForm'
import { botaoClasse, botaoTealClasse, cartaoClasse, paginaClasse } from '../estilos'
import { formatarPreco } from '../utils/formatarPreco'
import { urlImagem, aoFalharImagem } from '../utils/imagem'

const FORMAS = [
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'cartao', rotulo: 'Cartão de crédito ou débito' },
  { valor: 'boleto', rotulo: 'Boleto' },
]

export default function Carrinho() {
  const { itens, subtotal, alterar, remover } = useCart()
  const navigate = useNavigate()
  const [endereco, setEndereco] = useState(ENDERECO_VAZIO)
  const [metodo, setMetodo] = useState('pix')
  const [config, setConfig] = useState({ frete_gratis_acima: 0, opcoes_entrega: [] })
  const [entrega, setEntrega] = useState('padrao')
  const [erro, setErro] = useState('')
  const [finalizando, setFinalizando] = useState(false)

  useEffect(() => {
    api('/endereco').then((d) => d.endereco && setEndereco({ ...ENDERECO_VAZIO, ...d.endereco })).catch(() => {})
    api('/config').then(setConfig).catch(() => {})
  }, [])

  // Carrinho vazio
  if (itens.length === 0) {
    return (
      <div className={`${paginaClasse} px-4 py-24 text-center`}>
        <FiShoppingCart className="mx-auto text-5xl text-[#35dcee]" />
        <h1 className="mt-4 text-xl font-extrabold">Seu carrinho está vazio</h1>
        <p className="mt-2 text-sm text-white/70">Encontre produtos para a sua evolução.</p>
        <Link to="/produtos" className={`${botaoClasse} mt-6 inline-block`}>Explorar produtos</Link>
      </div>
    )
  }

  // Valor de cada forma de entrega (só a padrão fica grátis acima do valor definido)
  const valorEntrega = (op) => (op.gratis_acima && subtotal > config.frete_gratis_acima ? 0 : op.valor)
  const opcaoEscolhida = config.opcoes_entrega.find((o) => o.id === entrega)
  const frete = opcaoEscolhida ? valorEntrega(opcaoEscolhida) : 0
  const total = subtotal + frete

  async function tentar(acao) {
    setErro('')
    try {
      await acao()
    } catch (e) {
      setErro(e.message)
    }
  }

  async function finalizar(e) {
    e.preventDefault()
    setErro('')
    setFinalizando(true)
    try {
      await api('/endereco', { method: 'PUT', corpo: endereco })
      const d = await api('/pedidos', { method: 'POST', corpo: { metodo, entrega } })
      if (d.init_point) {
        window.location.href = d.init_point // vai para o pagamento no Mercado Pago
      } else {
        navigate(`/pedido-confirmado?pedido=${d.id_pedido}`, { state: { aviso: d.aviso } })
      }
    } catch (err) {
      setErro(err.message)
      setFinalizando(false)
    }
  }

  return (
    <div className={`${paginaClasse} px-4 py-10 md:px-8`}>
      <form onSubmit={finalizar} className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-extrabold uppercase">
          Seu <span className="text-[#35dcee]">carrinho</span>
        </h1>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            {/* Itens */}
            <div className="space-y-3">
              {itens.map((i) => (
                <article key={i.id} className={`${cartaoClasse} flex items-center gap-4 !p-3`}>
                  <img src={urlImagem(i.imagem)} onError={aoFalharImagem} alt="" className="h-20 w-16 rounded bg-neutral-900 object-contain" />
                  <div className="flex-1 text-sm">
                    <p className="font-bold uppercase">{i.nome}</p>
                    <p className="text-[#35dcee]">{formatarPreco(i.preco)}</p>
                  </div>
                  <div className="inline-flex items-center rounded border border-white/30">
                    <button type="button" aria-label="Diminuir" onClick={() => tentar(() => alterar(i.id, i.quantidade - 1))} className="px-2 py-1.5 hover:text-[#35dcee]"><FiMinus /></button>
                    <span className="w-8 text-center text-sm">{i.quantidade}</span>
                    <button type="button" aria-label="Aumentar" onClick={() => tentar(() => alterar(i.id, i.quantidade + 1))} className="px-2 py-1.5 hover:text-[#35dcee]"><FiPlus /></button>
                  </div>
                  <button type="button" aria-label={`Remover ${i.nome}`} onClick={() => tentar(() => remover(i.id))} className="p-2 text-white/70 hover:text-red-400"><FiTrash2 /></button>
                </article>
              ))}
            </div>

            {/* Endereço */}
            <div>
              <h2 className="mb-3 text-lg font-extrabold uppercase">Endereço</h2>
              <EnderecoForm valor={endereco} onChange={setEndereco} />
            </div>
          </div>

          {/* Pagamento e resumo */}
          <aside className="space-y-4">
            <div className={cartaoClasse}>
              <h2 className="mb-3 text-sm font-extrabold uppercase">Forma de entrega</h2>
              <div className="space-y-2 text-sm">
                {config.opcoes_entrega.map((op) => (
                  <label key={op.id} className="flex cursor-pointer items-start gap-2">
                    <input type="radio" name="entrega" value={op.id} checked={entrega === op.id} onChange={() => setEntrega(op.id)} className="mt-1 accent-[#35dcee]" />
                    <span className="flex-1">
                      {op.rotulo}
                      <span className="block text-xs text-white/60">
                        {op.id === 'retirada' ? 'Pronto em 1 dia' : `Chega em até ${op.prazo_dias} dias`}
                      </span>
                    </span>
                    <span className="font-bold">{valorEntrega(op) === 0 ? 'Grátis' : formatarPreco(valorEntrega(op))}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={cartaoClasse}>
              <h2 className="mb-3 text-sm font-extrabold uppercase">Formas de pagamento</h2>
              <div className="space-y-2 text-sm">
                {FORMAS.map((f) => (
                  <label key={f.valor} className="flex cursor-pointer items-center gap-2">
                    <input type="radio" name="metodo" value={f.valor} checked={metodo === f.valor} onChange={() => setMetodo(f.valor)} className="accent-[#35dcee]" />
                    {f.rotulo}
                  </label>
                ))}
              </div>
            </div>

            <div className={cartaoClasse}>
              <h2 className="mb-3 text-sm font-extrabold uppercase">Resumo do pedido</h2>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatarPreco(subtotal)}</dd></div>
                <div className="flex justify-between"><dt>Frete</dt><dd>{frete === 0 ? 'Grátis' : formatarPreco(frete)}</dd></div>
                <div className="flex justify-between border-t border-white/20 pt-2 text-base font-bold"><dt>Total</dt><dd className="text-[#35dcee]">{formatarPreco(total)}</dd></div>
              </dl>
              {erro && <p className="mt-3 text-sm text-red-400">{erro}</p>}
              <button type="submit" disabled={finalizando} className={`${botaoTealClasse} mt-4 w-full py-3`}>
                {finalizando ? 'Processando...' : 'Finalizar'}
              </button>
            </div>
          </aside>
        </div>
      </form>
    </div>
  )
}
