const db = require('../db')

// Monta um pedido com itens e último pagamento
async function pedidoCompleto(p) {
  const [itens, pagamento] = await Promise.all([
    db.all(
      `SELECT ip.id_produto, pr.nome, pr.imagem, ip.quantidade, ip.preco_unitario
       FROM itens_pedido ip JOIN produtos pr ON pr.id_produto = ip.id_produto WHERE ip.id_pedido = ?`,
      [p.id_pedido]
    ),
    db.get('SELECT metodo, status FROM pagamentos WHERE id_pedido = ? ORDER BY id_pagamento DESC LIMIT 1', [p.id_pedido]),
  ])
  return { ...p, itens, pagamento: pagamento || null }
}

module.exports = { pedidoCompleto }
