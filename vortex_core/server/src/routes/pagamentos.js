const express = require('express')
const db = require('../db')
const mp = require('../servicos/mercadopago')
const { aplicarPagamento } = require('../servicos/pagamentos')
const { exigirLogin } = require('../middleware/auth')

const router = express.Router()

// O Mercado Pago avisa aqui quando um pagamento muda de status.
// Não confiamos no que chega: sempre perguntamos o status real ao Mercado Pago.
// (Só respondemos depois de processar: em servidores como o Vercel, o que fica pendente depois da resposta pode ser cortado.)
router.post('/webhook', async (req, res) => {
  try {
    const tipo = req.body?.type || req.query.type || req.query.topic
    const id = req.body?.data?.id || req.query['data.id'] || req.query.id
    if (tipo === 'payment' && id && mp.configurado()) {
      await aplicarPagamento(await mp.buscarPagamento(id))
    }
    res.sendStatus(200)
  } catch (e) {
    console.error('Erro no webhook:', e?.message || e)
    res.sendStatus(500) // o Mercado Pago tenta de novo mais tarde
  }
})

// Chamado pela tela "Pedido confirmado" quando o cliente volta do Mercado Pago.
// Funciona mesmo sem webhook (por exemplo, rodando só no seu computador).
router.post('/sincronizar', exigirLogin, async (req, res) => {
  const idPedido = Number(req.body.id_pedido)
  const pedido = await db.get('SELECT * FROM pedidos WHERE id_pedido = ? AND id_usuario = ?', [idPedido, req.usuario.id_usuario])
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' })

  if (mp.configurado()) {
    try {
      const pg = req.body.payment_id
        ? await mp.buscarPagamento(req.body.payment_id)
        : await mp.buscarPagamentoPorPedido(idPedido)
      if (pg && String(pg.external_reference) === String(idPedido)) await aplicarPagamento(pg)
    } catch (e) {
      console.error('Erro ao sincronizar pagamento:', e?.message || e)
    }
  }
  const atual = await db.get('SELECT id_pedido, status, total FROM pedidos WHERE id_pedido = ?', [idPedido])
  const pagamento = await db.get(
    'SELECT metodo, status FROM pagamentos WHERE id_pedido = ? ORDER BY id_pagamento DESC LIMIT 1',
    [idPedido]
  )
  res.json({ pedido: atual, pagamento })
})

module.exports = router
