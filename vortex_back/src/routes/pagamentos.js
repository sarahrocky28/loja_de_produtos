const express = require('express')
const db = require('../db')
const mp = require('../servicos/mercadopago')
const { aplicarPagamento } = require('../servicos/pagamentos')
const { exigirLogin } = require('../middleware/auth')

const router = express.Router()


router.post('/webhook', async (req, res) => {
  res.sendStatus(200)
  try {
    const tipo = req.body?.type || req.query.type || req.query.topic
    const id = req.body?.data?.id || req.query['data.id'] || req.query.id
    if (tipo !== 'payment' || !id || !mp.configurado()) return
    aplicarPagamento(await mp.buscarPagamento(id))
  } catch (e) {
    console.error('Erro no webhook:', e?.message || e)
  }
})

router.post('/sincronizar', exigirLogin, async (req, res) => {
  const idPedido = Number(req.body.id_pedido)
  const pedido = db
    .prepare('SELECT * FROM pedidos WHERE id_pedido = ? AND id_usuario = ?')
    .get(idPedido, req.usuario.id_usuario)
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' })

  if (mp.configurado()) {
    try {
      const pg = req.body.payment_id
        ? await mp.buscarPagamento(req.body.payment_id)
        : await mp.buscarPagamentoPorPedido(idPedido)
      if (pg && String(pg.external_reference) === String(idPedido)) aplicarPagamento(pg)
    } catch (e) {
      console.error('Erro ao sincronizar pagamento:', e?.message || e)
    }
  }
  const atual = db.prepare('SELECT id_pedido, status, total FROM pedidos WHERE id_pedido = ?').get(idPedido)
  const pagamento = db
    .prepare('SELECT metodo, status FROM pagamentos WHERE id_pedido = ? ORDER BY id_pagamento DESC LIMIT 1')
    .get(idPedido)
  res.json({ pedido: atual, pagamento })
})

module.exports = router
