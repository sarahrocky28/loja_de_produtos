const express = require('express')
const db = require('../db')
const { exigirLogin } = require('../middleware/auth')

const router = express.Router()
router.use(exigirLogin)

const listar = (idUsuario) =>
  db.all(
    `SELECT p.id_produto AS id, p.nome, p.preco, p.estoque, p.imagem, ci.quantidade
     FROM carrinho_itens ci JOIN produtos p ON p.id_produto = ci.id_produto
     WHERE ci.id_usuario = ? ORDER BY p.nome`,
    [idUsuario]
  )

// Confere produto ativo e estoque; devolve mensagem de erro ou null
async function validar(idProduto, quantidade) {
  const p = await db.get('SELECT nome, estoque, ativo FROM produtos WHERE id_produto = ?', [idProduto])
  if (!p || !p.ativo) return 'Produto indisponível.'
  if (quantidade > p.estoque) {
    return p.estoque === 0 ? 'Produto esgotado.' : `Estoque insuficiente (restam ${p.estoque}).`
  }
  return null
}

const UPSERT = `INSERT INTO carrinho_itens (id_usuario, id_produto, quantidade) VALUES (?, ?, ?)
                ON CONFLICT (id_usuario, id_produto) DO UPDATE SET quantidade = excluded.quantidade`

router.get('/', async (req, res) => res.json({ itens: await listar(req.usuario.id_usuario) }))

// Adiciona (soma à quantidade que já existe)
router.post('/', async (req, res) => {
  const idProduto = Number(req.body.id_produto)
  const qtd = Math.floor(Number(req.body.quantidade) || 1)
  if (!idProduto || qtd < 1) return res.status(400).json({ erro: 'Dados inválidos.' })

  const atual = await db.get('SELECT quantidade FROM carrinho_itens WHERE id_usuario = ? AND id_produto = ?', [
    req.usuario.id_usuario,
    idProduto,
  ])
  const novaQtd = (atual?.quantidade || 0) + qtd
  const erro = await validar(idProduto, novaQtd)
  if (erro) return res.status(400).json({ erro })

  await db.run(UPSERT, [req.usuario.id_usuario, idProduto, novaQtd])
  res.json({ itens: await listar(req.usuario.id_usuario) })
})

// Define a quantidade exata (0 remove)
router.put('/:id', async (req, res) => {
  const idProduto = Number(req.params.id)
  const qtd = Math.floor(Number(req.body.quantidade))
  if (!Number.isFinite(qtd) || qtd < 0) return res.status(400).json({ erro: 'Quantidade inválida.' })

  if (qtd === 0) {
    await db.run('DELETE FROM carrinho_itens WHERE id_usuario = ? AND id_produto = ?', [req.usuario.id_usuario, idProduto])
  } else {
    const erro = await validar(idProduto, qtd)
    if (erro) return res.status(400).json({ erro })
    await db.run(UPSERT, [req.usuario.id_usuario, idProduto, qtd])
  }
  res.json({ itens: await listar(req.usuario.id_usuario) })
})

router.delete('/:id', async (req, res) => {
  await db.run('DELETE FROM carrinho_itens WHERE id_usuario = ? AND id_produto = ?', [
    req.usuario.id_usuario,
    Number(req.params.id),
  ])
  res.json({ itens: await listar(req.usuario.id_usuario) })
})

module.exports = router
