const express = require('express')
const db = require('../db')
const { exigirLogin } = require('../middleware/auth')
const { calcularFrete } = require('../config')
const { iniciarPagamento } = require('../servicos/pagamentos')
const { pedidoCompleto } = require('../servicos/pedidos')

const router = express.Router()
router.use(exigirLogin)

const METODOS = ['pix', 'cartao', 'boleto']

router.get('/', (req, res) => {
  const linhas = db
    .prepare('SELECT * FROM pedidos WHERE id_usuario = ? ORDER BY id_pedido DESC')
    .all(req.usuario.id_usuario)
  res.json({ pedidos: linhas.map(pedidoCompleto) })
})

router.get('/:id', (req, res) => {
  const p = db
    .prepare('SELECT * FROM pedidos WHERE id_pedido = ? AND id_usuario = ?')
    .get(req.params.id, req.usuario.id_usuario)
  if (!p) return res.status(404).json({ erro: 'Pedido não encontrado.' })
  res.json({ pedido: pedidoCompleto(p) })
})

router.post('/', async (req, res) => {
  const metodo = req.body.metodo
  if (!METODOS.includes(metodo)) return res.status(400).json({ erro: 'Escolha uma forma de pagamento.' })
  const u = req.usuario

  const itens = db
    .prepare(
      `SELECT p.id_produto, p.nome, p.preco, p.estoque, p.ativo, ci.quantidade
       FROM carrinho_itens ci JOIN produtos p ON p.id_produto = ci.id_produto WHERE ci.id_usuario = ?`
    )
    .all(u.id_usuario)
  if (!itens.length) return res.status(400).json({ erro: 'Seu carrinho está vazio.' })

  for (const i of itens) {
    if (!i.ativo) return res.status(400).json({ erro: `"${i.nome}" não está mais disponível.` })
    if (i.quantidade > i.estoque) {
      return res.status(400).json({ erro: `Estoque insuficiente para "${i.nome}" (restam ${i.estoque}).` })
    }
  }
  const endereco = db
    .prepare('SELECT id_endereco FROM enderecos WHERE id_usuario = ? AND padrao = 1')
    .get(u.id_usuario)
  if (!endereco) return res.status(400).json({ erro: 'Cadastre o endereço de entrega.' })

  const subtotal = itens.reduce((s, i) => s + i.quantidade * i.preco, 0)
  const entrega = req.body.entrega || 'padrao'
  const calculo = calcularFrete(subtotal, entrega)
  if (!calculo) return res.status(400).json({ erro: 'Forma de entrega inválida.' })
  const { frete, prazoDias } = calculo
  const total = subtotal + frete

  const criar = db.transaction(() => {
    const r = db
      .prepare(
        `INSERT INTO pedidos (id_usuario, id_endereco, subtotal, desconto, frete, entrega, total, previsao_entrega)
         VALUES (?, ?, ?, 0, ?, ?, ?, DATE('now', 'localtime', ?))`
      )
      .run(u.id_usuario, endereco.id_endereco, subtotal, frete, entrega, total, `+${prazoDias} days`)
    const idPedido = Number(r.lastInsertRowid)
    const inserirItem = db.prepare(
      'INSERT INTO itens_pedido (id_pedido, id_produto, quantidade, preco_unitario) VALUES (?, ?, ?, ?)'
    )
    for (const i of itens) inserirItem.run(idPedido, i.id_produto, i.quantidade, i.preco)
    db.prepare('INSERT INTO pagamentos (id_pedido, metodo, valor) VALUES (?, ?, ?)').run(idPedido, metodo, total)
    db.prepare('DELETE FROM carrinho_itens WHERE id_usuario = ?').run(u.id_usuario)
    return idPedido
  })
  const idPedido = criar()

  res.status(201).json({ id_pedido: idPedido, ...(await iniciarPagamento(idPedido, u, metodo)) })
})

router.post('/:id/pagar', async (req, res) => {
  const p = db
    .prepare('SELECT * FROM pedidos WHERE id_pedido = ? AND id_usuario = ?')
    .get(req.params.id, req.usuario.id_usuario)
  if (!p) return res.status(404).json({ erro: 'Pedido não encontrado.' })
  if (p.status !== 'aguardando_pagamento') {
    return res.status(400).json({ erro: 'Este pedido não está aguardando pagamento.' })
  }
  const ultimo = db
    .prepare('SELECT id_pagamento, metodo FROM pagamentos WHERE id_pedido = ? ORDER BY id_pagamento DESC LIMIT 1')
    .get(p.id_pedido)
  const metodo = METODOS.includes(req.body.metodo) ? req.body.metodo : ultimo?.metodo || 'pix'
  if (ultimo) db.prepare("UPDATE pagamentos SET metodo = ? WHERE id_pagamento = ? AND status = 'pendente'").run(metodo, ultimo.id_pagamento)
  res.json({ id_pedido: p.id_pedido, ...(await iniciarPagamento(p.id_pedido, req.usuario, metodo)) })
})

module.exports = router
