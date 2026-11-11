const express = require('express')
const db = require('../db')
const { exigirLogin } = require('../middleware/auth')

const router = express.Router()
router.use(exigirLogin)

function listar(idUsuario) {
  return db
    .prepare(
      `SELECT p.id_produto AS id, p.nome, p.preco, p.estoque, p.imagem, ci.quantidade
       FROM carrinho_itens ci JOIN produtos p ON p.id_produto = ci.id_produto
       WHERE ci.id_usuario = ? ORDER BY p.nome`
    )
    .all(idUsuario)
}

function validar(idProduto, quantidade) {
  const p = db.prepare('SELECT nome, estoque, ativo FROM produtos WHERE id_produto = ?').get(idProduto)
  if (!p || !p.ativo) return 'Produto indisponível.'
  if (quantidade > p.estoque) {
    return p.estoque === 0 ? 'Produto esgotado.' : `Estoque insuficiente (restam ${p.estoque}).`
  }
  return null
}

router.get('/', (req, res) => res.json({ itens: listar(req.usuario.id_usuario) }))

router.post('/', (req, res) => {
  const idProduto = Number(req.body.id_produto)
  const qtd = Math.floor(Number(req.body.quantidade) || 1)
  if (!idProduto || qtd < 1) return res.status(400).json({ erro: 'Dados inválidos.' })

  const atual = db
    .prepare('SELECT quantidade FROM carrinho_itens WHERE id_usuario = ? AND id_produto = ?')
    .get(req.usuario.id_usuario, idProduto)
  const novaQtd = (atual?.quantidade || 0) + qtd
  const erro = validar(idProduto, novaQtd)
  if (erro) return res.status(400).json({ erro })

  db.prepare(
    `INSERT INTO carrinho_itens (id_usuario, id_produto, quantidade) VALUES (?, ?, ?)
     ON CONFLICT (id_usuario, id_produto) DO UPDATE SET quantidade = excluded.quantidade`
  ).run(req.usuario.id_usuario, idProduto, novaQtd)
  res.json({ itens: listar(req.usuario.id_usuario) })
})

router.put('/:id', (req, res) => {
  const idProduto = Number(req.params.id)
  const qtd = Math.floor(Number(req.body.quantidade))
  if (!Number.isFinite(qtd) || qtd < 0) return res.status(400).json({ erro: 'Quantidade inválida.' })

  if (qtd === 0) {
    db.prepare('DELETE FROM carrinho_itens WHERE id_usuario = ? AND id_produto = ?')
      .run(req.usuario.id_usuario, idProduto)
  } else {
    const erro = validar(idProduto, qtd)
    if (erro) return res.status(400).json({ erro })
    db.prepare(
      `INSERT INTO carrinho_itens (id_usuario, id_produto, quantidade) VALUES (?, ?, ?)
       ON CONFLICT (id_usuario, id_produto) DO UPDATE SET quantidade = excluded.quantidade`
    ).run(req.usuario.id_usuario, idProduto, qtd)
  }
  res.json({ itens: listar(req.usuario.id_usuario) })
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM carrinho_itens WHERE id_usuario = ? AND id_produto = ?')
    .run(req.usuario.id_usuario, Number(req.params.id))
  res.json({ itens: listar(req.usuario.id_usuario) })
})

module.exports = router
