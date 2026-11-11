const { MercadoPagoConfig, Preference, Payment } = require('mercadopago')
const { cfg } = require('../config')

function configurado() {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN)
}

function cliente() {
  return new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN })
}

const EXCLUIR = {
  pix: [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }, { id: 'atm' }],
  cartao: [{ id: 'ticket' }, { id: 'bank_transfer' }, { id: 'atm' }],
  boleto: [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'bank_transfer' }, { id: 'atm' }],
}

async function criarPreferencia({ pedido, itens, metodo, email }) {
  const { frontUrl, backUrl } = cfg()
  const lista = itens.map((i) => ({
    id: String(i.id_produto),
    title: i.nome,
    quantity: i.quantidade,
    unit_price: i.preco_unitario / 100,
    currency_id: 'BRL',
  }))
  if (pedido.frete > 0) {
    lista.push({ id: 'frete', title: 'Frete', quantity: 1, unit_price: pedido.frete / 100, currency_id: 'BRL' })
  }

  const retorno = `${frontUrl}/pedido-confirmado?pedido=${pedido.id_pedido}`
  const corpo = {
    items: lista,
    payer: { email },
    external_reference: String(pedido.id_pedido),
    back_urls: { success: retorno, failure: retorno, pending: retorno },
    payment_methods: { excluded_payment_types: EXCLUIR[metodo] || [] },
    statement_descriptor: 'VORTEX CORE',
  }
  if (frontUrl.startsWith('https://')) corpo.auto_return = 'approved'
  if (backUrl.startsWith('https://')) corpo.notification_url = `${backUrl}/api/pagamentos/webhook`

  const resposta = await new Preference(cliente()).create({ body: corpo })
  return resposta.init_point
}

async function buscarPagamento(id) {
  return new Payment(cliente()).get({ id })
}

async function buscarPagamentoPorPedido(idPedido) {
  const r = await new Payment(cliente()).search({
    options: { external_reference: String(idPedido), sort: 'date_created', criteria: 'desc' },
  })
  return r.results?.[0] || null
}

module.exports = { configurado, criarPreferencia, buscarPagamento, buscarPagamentoPorPedido }
