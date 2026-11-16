const db = require('../db')
const mp = require('./mercadopago')

const STATUS = {
  approved: 'aprovado',
  authorized: 'pendente',
  pending: 'pendente',
  in_process: 'pendente',
  in_mediation: 'pendente',
  rejected: 'recusado',
  cancelled: 'cancelado',
  refunded: 'cancelado',
  charged_back: 'cancelado',
}
const METODO = { bank_transfer: 'pix', credit_card: 'cartao', debit_card: 'cartao', ticket: 'boleto' }

// Recebe um pagamento do Mercado Pago e atualiza pagamento + pedido + estoque.
// Pode ser chamada várias vezes para o mesmo pagamento (webhook + retorno do cliente) sem duplicar a baixa.
async function aplicarPagamento(pg) {
  const idPedido = Number(pg.external_reference)
  const pedido = await db.get('SELECT * FROM pedidos WHERE id_pedido = ?', [idPedido])
  if (!pedido) return null

  const status = STATUS[pg.status] || 'pendente'
  const metodoNovo = METODO[pg.payment_type_id] || null
  const mpId = String(pg.id)

  await db.transaction(async (tx) => {
    const jaAprovado = await tx.get("SELECT 1 AS ok FROM pagamentos WHERE id_pedido = ? AND status = 'aprovado'", [idPedido])

    const registro =
      (await tx.get('SELECT * FROM pagamentos WHERE mp_payment_id = ?', [mpId])) ||
      (await tx.get(
        'SELECT * FROM pagamentos WHERE id_pedido = ? AND mp_payment_id IS NULL ORDER BY id_pagamento DESC',
        [idPedido]
      ))

    if (registro) {
      await tx.run(
        `UPDATE pagamentos
         SET mp_payment_id = ?, metodo = COALESCE(?, metodo), status = ?,
             data_aprovacao = CASE WHEN ? = 'aprovado' THEN COALESCE(data_aprovacao, DATETIME('now','localtime')) ELSE data_aprovacao END
         WHERE id_pagamento = ?`,
        [mpId, metodoNovo, status, status, registro.id_pagamento]
      )
    } else {
      await tx.run(
        `INSERT INTO pagamentos (id_pedido, mp_payment_id, metodo, status, valor, data_aprovacao)
         VALUES (?, ?, ?, ?, ?, CASE WHEN ? = 'aprovado' THEN DATETIME('now','localtime') END)`,
        [idPedido, mpId, metodoNovo || 'pix', status, pedido.total, status]
      )
    }

    // Pagamento aprovado pela primeira vez: pedido vira "pago" e o estoque é baixado
    if (status === 'aprovado' && !jaAprovado) {
      const atualizou = await tx.run(
        "UPDATE pedidos SET status = 'pago' WHERE id_pedido = ? AND status = 'aguardando_pagamento'",
        [idPedido]
      )
      if (atualizou.changes) {
        const itens = await tx.all('SELECT id_produto, quantidade FROM itens_pedido WHERE id_pedido = ?', [idPedido])
        for (const i of itens) {
          await tx.run('UPDATE produtos SET estoque = MAX(estoque - ?, 0) WHERE id_produto = ?', [i.quantidade, i.id_produto])
        }
      }
    }
  })

  return db.get('SELECT status FROM pedidos WHERE id_pedido = ?', [idPedido])
}

// Gera o link de pagamento de um pedido que está aguardando pagamento
async function iniciarPagamento(idPedido, usuario, metodo) {
  if (!mp.configurado()) {
    return { aviso: 'O Mercado Pago ainda não está configurado no servidor. O pedido foi criado e aguarda pagamento.' }
  }
  try {
    const pedido = await db.get('SELECT * FROM pedidos WHERE id_pedido = ?', [idPedido])
    const itens = await db.all(
      `SELECT ip.id_produto, p.nome, ip.quantidade, ip.preco_unitario
       FROM itens_pedido ip JOIN produtos p ON p.id_produto = ip.id_produto WHERE ip.id_pedido = ?`,
      [idPedido]
    )
    const link = await mp.criarPreferencia({ pedido, itens, metodo, email: usuario.email })
    return { init_point: link }
  } catch (e) {
    console.error('Erro ao criar pagamento no Mercado Pago:', e?.message || e)
    return { aviso: 'O pedido foi criado, mas não foi possível abrir o pagamento agora. Tente novamente pelo seu perfil.' }
  }
}

module.exports = { aplicarPagamento, iniciarPagamento }
