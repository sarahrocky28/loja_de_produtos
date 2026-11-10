const express = require('express')
const bcrypt = require('bcryptjs')
const multer = require('multer')
const path = require('path')
const crypto = require('crypto')
const db = require('../db')
const { exigirLogin, exigirAdmin } = require('../middleware/auth')
const { pedidoCompleto } = require('../servicos/pedidos')

const router = express.Router()
router.use(exigirLogin, exigirAdmin)

// ---------- Upload de imagens dos produtos ----------
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', '..', 'uploads'),
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)),
})

// ---------- Resumo (tela inicial do admin) ----------
router.get('/resumo', (req, res) => {
  const n = (sql) => db.prepare(sql).get().n
  res.json({
    pedidos: n('SELECT COUNT(*) AS n FROM pedidos'),
    produtos: n('SELECT COUNT(*) AS n FROM produtos WHERE ativo = 1'),
    clientes: n("SELECT COUNT(*) AS n FROM usuarios WHERE perfil = 'cliente'"),
    total_vendido: n(
      "SELECT COALESCE(SUM(total), 0) AS n FROM pedidos WHERE status IN ('pago','em_separacao','enviado','entregue')"
    ),
  })
})

// ---------- Pedidos ----------
router.get('/pedidos', (req, res) => {
  const linhas = db
    .prepare(
      `SELECT pe.*, u.nome AS cliente, u.email AS email_cliente
       FROM pedidos pe JOIN usuarios u ON u.id_usuario = pe.id_usuario ORDER BY pe.id_pedido DESC`
    )
    .all()
  res.json({ pedidos: linhas.map(pedidoCompleto) })
})

const STATUS_ADMIN = ['em_separacao', 'enviado', 'entregue', 'cancelado']

router.patch('/pedidos/:id', (req, res) => {
  const pedido = db.prepare('SELECT * FROM pedidos WHERE id_pedido = ?').get(req.params.id)
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' })

  const { status } = req.body
  const rastreio = String(req.body.codigo_rastreio || '').trim() || null
  if (!STATUS_ADMIN.includes(status)) return res.status(400).json({ erro: 'Status inválido.' })
  if (pedido.status === 'cancelado') return res.status(400).json({ erro: 'Pedido cancelado não pode ser alterado.' })
  if (pedido.status === 'aguardando_pagamento' && status !== 'cancelado') {
    return res.status(400).json({ erro: 'O pedido só pode avançar depois de pago.' })
  }

  db.transaction(() => {
    // Cancelar um pedido que já tinha baixado o estoque devolve os itens
    if (status === 'cancelado' && pedido.status !== 'aguardando_pagamento') {
      const itens = db.prepare('SELECT id_produto, quantidade FROM itens_pedido WHERE id_pedido = ?').all(pedido.id_pedido)
      const devolve = db.prepare('UPDATE produtos SET estoque = estoque + ? WHERE id_produto = ?')
      for (const i of itens) devolve.run(i.quantidade, i.id_produto)
    }
    db.prepare('UPDATE pedidos SET status = ?, codigo_rastreio = COALESCE(?, codigo_rastreio) WHERE id_pedido = ?')
      .run(status, rastreio, pedido.id_pedido)
  })()
  res.json({ pedido: db.prepare('SELECT * FROM pedidos WHERE id_pedido = ?').get(pedido.id_pedido) })
})

// ---------- Produtos ----------
router.get('/categorias', (req, res) => {
  res.json({ categorias: db.prepare('SELECT id_categoria AS id, nome FROM categorias ORDER BY nome').all() })
})

const SELECT_PRODUTO = `SELECT p.id_produto AS id, p.nome, p.descricao, p.preco, p.estoque, p.imagem, p.ativo,
                               p.id_categoria, c.nome AS categoria
                        FROM produtos p JOIN categorias c ON c.id_categoria = p.id_categoria`

router.get('/produtos', (req, res) => {
  const busca = String(req.query.busca || '').trim()
  const produtos = busca
    ? db.prepare(`${SELECT_PRODUTO} WHERE p.nome LIKE ? ORDER BY p.id_produto DESC`).all(`%${busca}%`)
    : db.prepare(`${SELECT_PRODUTO} ORDER BY p.id_produto DESC`).all()
  res.json({ produtos })
})

function lerProduto(req) {
  const b = req.body
  const dados = {
    nome: String(b.nome || '').trim(),
    descricao: String(b.descricao || '').trim() || null,
    id_categoria: Number(b.id_categoria),
    preco: Math.round(Number(b.preco)),
    estoque: Math.floor(Number(b.estoque)),
    ativo: String(b.ativo) === '0' ? 0 : 1,
  }
  let erro = null
  if (dados.nome.length < 2) erro = 'Informe o nome do produto.'
  else if (!db.prepare('SELECT 1 FROM categorias WHERE id_categoria = ?').get(dados.id_categoria)) erro = 'Escolha uma categoria.'
  else if (!Number.isFinite(dados.preco) || dados.preco < 0) erro = 'Preço inválido.'
  else if (!Number.isFinite(dados.estoque) || dados.estoque < 0) erro = 'Estoque inválido.'
  return { dados, erro }
}

router.post('/produtos', upload.single('imagem'), (req, res) => {
  const { dados, erro } = lerProduto(req)
  if (erro) return res.status(400).json({ erro })
  const r = db
    .prepare(
      `INSERT INTO produtos (id_categoria, nome, descricao, preco, estoque, imagem, ativo) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(dados.id_categoria, dados.nome, dados.descricao, dados.preco, dados.estoque, req.file?.filename || null, dados.ativo)
  res.status(201).json({ produto: db.prepare(`${SELECT_PRODUTO} WHERE p.id_produto = ?`).get(r.lastInsertRowid) })
})

router.put('/produtos/:id', upload.single('imagem'), (req, res) => {
  const atual = db.prepare('SELECT imagem FROM produtos WHERE id_produto = ?').get(req.params.id)
  if (!atual) return res.status(404).json({ erro: 'Produto não encontrado.' })
  const { dados, erro } = lerProduto(req)
  if (erro) return res.status(400).json({ erro })
  db.prepare(
    `UPDATE produtos SET id_categoria=?, nome=?, descricao=?, preco=?, estoque=?, imagem=?, ativo=? WHERE id_produto = ?`
  ).run(dados.id_categoria, dados.nome, dados.descricao, dados.preco, dados.estoque,
    req.file?.filename || atual.imagem, dados.ativo, req.params.id)
  res.json({ produto: db.prepare(`${SELECT_PRODUTO} WHERE p.id_produto = ?`).get(req.params.id) })
})

// ---------- Clientes ----------
router.get('/clientes', (req, res) => {
  const busca = String(req.query.busca || '').trim()
  const base = "SELECT id_usuario AS id, nome, email, ativo, criado_em FROM usuarios WHERE perfil = 'cliente'"
  const clientes = busca
    ? db.prepare(`${base} AND (nome LIKE ? OR email LIKE ?) ORDER BY id_usuario DESC`).all(`%${busca}%`, `%${busca}%`)
    : db.prepare(`${base} ORDER BY id_usuario DESC`).all()
  res.json({ clientes })
})

router.post('/clientes', (req, res) => {
  const nome = String(req.body.nome || '').trim()
  const email = String(req.body.email || '').trim().toLowerCase()
  const senha = String(req.body.senha || '')
  if (nome.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ erro: 'Informe nome e e-mail válidos.' })
  }
  if (senha.length < 6) return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' })
  if (db.prepare('SELECT 1 FROM usuarios WHERE email = ?').get(email)) {
    return res.status(409).json({ erro: 'Já existe uma conta com esse e-mail.' })
  }
  const r = db
    .prepare("INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, 'cliente')")
    .run(nome, email, bcrypt.hashSync(senha, 10))
  res.status(201).json({
    cliente: db.prepare('SELECT id_usuario AS id, nome, email, ativo, criado_em FROM usuarios WHERE id_usuario = ?').get(r.lastInsertRowid),
  })
})

router.patch('/clientes/:id', (req, res) => {
  const ativo = req.body.ativo ? 1 : 0
  const r = db
    .prepare("UPDATE usuarios SET ativo = ? WHERE id_usuario = ? AND perfil = 'cliente'")
    .run(ativo, req.params.id)
  if (!r.changes) return res.status(404).json({ erro: 'Cliente não encontrado.' })
  res.json({ ok: true })
})

module.exports = router
