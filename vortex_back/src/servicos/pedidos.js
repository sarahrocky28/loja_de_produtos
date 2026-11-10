const db = require('../db')

// Monta um pedido com itens e último pagamento
function pedidoCompleto(p) {
  const itens = db
    .prepare(
      `SELECT ip.id_produto, p.nome, p.imagem, ip.quantidade, ip.preco_unitario
       FROM itens_pedido ip JOIN produtos p ON p.id_produto = ip.id_produto WHERE ip.id_pedido = ?`
    )
    .all(p.id_pedido)
  const pagamento =
    db
      .prepare('SELECT metodo, status FROM pagamentos WHERE id_pedido = ? ORDER BY id_pagamento DESC LIMIT 1')
      .get(p.id_pedido) || null
  return { ...p, itens, pagamento }
}

module.exports = { pedidoCompleto }
