const express = require('express')
const bcrypt = require('bcryptjs')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const db = require('../db')
const { exigirLogin, exigirAdmin } = require('../middleware/auth')
const { pedidoCompleto } = require('../servicos/pedidos')

const router = express.Router()
router.use(exigirLogin, exigirAdmin)

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

const SELECT_PRODUTO = `SELECT p.id_produto AS id, p.nome, p.descricao, p.preco, p.estoque, p.imagem, p.ativo,
                               p.id_categoria, c.nome AS categoria
                        FROM produtos p JOIN categorias c ON c.id_categoria = p.id_categoria`

const imagensDe = (idProduto) =>
  db.prepare('SELECT id_imagem, arquivo FROM produto_imagens WHERE id_produto = ? ORDER BY ordem, id_imagem').all(idProduto)

function apagarArquivo(nome) {
  try {
    fs.unlinkSync(path.join(__dirname, '..', '..', 'uploads', path.basename(nome)))
  } catch {
  }
}

function reorganizar(idProduto, principalId) {
  const imgs = imagensDe(idProduto)
  if (principalId) {
    const pos = imgs.findIndex((i) => i.id_imagem === principalId)
    if (pos > 0) imgs.unshift(...imgs.splice(pos, 1))
  }
  const atualizar = db.prepare('UPDATE produto_imagens SET ordem = ? WHERE id_imagem = ?')
  imgs.forEach((img, i) => atualizar.run(i, img.id_imagem))
  db.prepare('UPDATE produtos SET imagem = ? WHERE id_produto = ?').run(imgs[0]?.arquivo || null, idProduto)
}

function salvarImagens(req, idProduto) {
  let remover = []
  try {
    remover = JSON.parse(req.body.remover || '[]').map(Number)
  } catch {
  }
  for (const idImagem of remover) {
    const img = db.prepare('SELECT arquivo FROM produto_imagens WHERE id_imagem = ? AND id_produto = ?').get(idImagem, idProduto)
    if (img) {
      db.prepare('DELETE FROM produto_imagens WHERE id_imagem = ?').run(idImagem)
      apagarArquivo(img.arquivo)
    }
  }
  const maior = db.prepare('SELECT COALESCE(MAX(ordem), -1) AS m FROM produto_imagens WHERE id_produto = ?').get(idProduto).m
  const inserir = db.prepare('INSERT INTO produto_imagens (id_produto, arquivo, ordem) VALUES (?, ?, ?)')
  ;(req.files || []).forEach((f, i) => inserir.run(idProduto, f.filename, maior + 1 + i))
  reorganizar(idProduto, Number(req.body.principal) || null)
}

function comImagens(produtos) {
  const todas = db.prepare('SELECT id_imagem, id_produto, arquivo FROM produto_imagens ORDER BY ordem, id_imagem').all()
  const porProduto = {}
  for (const i of todas) (porProduto[i.id_produto] ||= []).push({ id_imagem: i.id_imagem, arquivo: i.arquivo })
  return produtos.map((p) => ({ ...p, imagens: porProduto[p.id] || [] }))
}

router.get('/categorias', (req, res) => {
  res.json({ categorias: db.prepare('SELECT id_categoria AS id, nome FROM categorias ORDER BY nome').all() })
})

router.get('/produtos', (req, res) => {
  const busca = String(req.query.busca || '').trim()
  const produtos = busca
    ? db.prepare(`${SELECT_PRODUTO} WHERE p.nome LIKE ? ORDER BY p.id_produto DESC`).all(`%${busca}%`)
    : db.prepare(`${SELECT_PRODUTO} ORDER BY p.id_produto DESC`).all()
  res.json({ produtos: comImagens(produtos) })
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

const detalhe = (id) => comImagens([db.prepare(`${SELECT_PRODUTO} WHERE p.id_produto = ?`).get(id)])[0]

router.post('/produtos', upload.array('imagens', 8), (req, res) => {
  const { dados, erro } = lerProduto(req)
  if (erro) return res.status(400).json({ erro })
  const r = db
    .prepare('INSERT INTO produtos (id_categoria, nome, descricao, preco, estoque, ativo) VALUES (?, ?, ?, ?, ?, ?)')
    .run(dados.id_categoria, dados.nome, dados.descricao, dados.preco, dados.estoque, dados.ativo)
  salvarImagens(req, r.lastInsertRowid)
  res.status(201).json({ produto: detalhe(r.lastInsertRowid) })
})

router.put('/produtos/:id', upload.array('imagens', 8), (req, res) => {
  if (!db.prepare('SELECT 1 FROM produtos WHERE id_produto = ?').get(req.params.id)) {
    return res.status(404).json({ erro: 'Produto não encontrado.' })
  }
  const { dados, erro } = lerProduto(req)
  if (erro) return res.status(400).json({ erro })
  db.prepare('UPDATE produtos SET id_categoria=?, nome=?, descricao=?, preco=?, estoque=?, ativo=? WHERE id_produto = ?')
    .run(dados.id_categoria, dados.nome, dados.descricao, dados.preco, dados.estoque, dados.ativo, req.params.id)
  salvarImagens(req, Number(req.params.id))
  res.json({ produto: detalhe(req.params.id) })
})

router.patch('/produtos/:id', (req, res) => {
  const r = db.prepare('UPDATE produtos SET ativo = ? WHERE id_produto = ?').run(req.body.ativo ? 1 : 0, req.params.id)
  if (!r.changes) return res.status(404).json({ erro: 'Produto não encontrado.' })
  res.json({ produto: detalhe(req.params.id) })
})

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

router.put('/clientes/:id', (req, res) => {
  const nome = String(req.body.nome || '').trim()
  const email = String(req.body.email || '').trim().toLowerCase()
  if (nome.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ erro: 'Informe nome e e-mail válidos.' })
  }
  if (db.prepare('SELECT 1 FROM usuarios WHERE email = ? AND id_usuario <> ?').get(email, req.params.id)) {
    return res.status(409).json({ erro: 'Esse e-mail já está em uso.' })
  }
  const r = db.prepare("UPDATE usuarios SET nome = ?, email = ? WHERE id_usuario = ? AND perfil = 'cliente'").run(nome, email, req.params.id)
  if (!r.changes) return res.status(404).json({ erro: 'Cliente não encontrado.' })
  res.json({ ok: true })
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
