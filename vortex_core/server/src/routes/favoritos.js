const express = require('express')
const db = require('../db')
const { exigirLogin } = require('../middleware/auth')

const router = express.Router()
router.use(exigirLogin)

const ids = async (idUsuario) =>
  (await db.all('SELECT id_produto FROM favoritos WHERE id_usuario = ?', [idUsuario])).map((f) => f.id_produto)

router.get('/', async (req, res) => {
  const produtos = await db.all(
    `SELECT p.id_produto AS id, p.nome, p.preco, p.estoque, p.imagem
     FROM favoritos f JOIN produtos p ON p.id_produto = f.id_produto
     WHERE f.id_usuario = ? AND p.ativo = 1 ORDER BY f.criado_em DESC`,
    [req.usuario.id_usuario]
  )
  res.json({ produtos })
})

router.get('/ids', async (req, res) => res.json({ ids: await ids(req.usuario.id_usuario) }))

router.post('/:id', async (req, res) => {
  const produto = await db.get('SELECT 1 AS ok FROM produtos WHERE id_produto = ? AND ativo = 1', [req.params.id])
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' })
  await db.run('INSERT OR IGNORE INTO favoritos (id_usuario, id_produto) VALUES (?, ?)', [req.usuario.id_usuario, req.params.id])
  res.json({ ids: await ids(req.usuario.id_usuario) })
})

router.delete('/:id', async (req, res) => {
  await db.run('DELETE FROM favoritos WHERE id_usuario = ? AND id_produto = ?', [req.usuario.id_usuario, req.params.id])
  res.json({ ids: await ids(req.usuario.id_usuario) })
})

module.exports = router
