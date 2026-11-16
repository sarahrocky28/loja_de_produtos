const express = require('express')
const bcrypt = require('bcryptjs')
const db = require('../db')
const { exigirLogin, exigirAdmin } = require('../middleware/auth')
const { pedidoCompleto } = require('../servicos/pedidos')

const router = express.Router()
router.use(exigirLogin, exigirAdmin)

// ---------- Resumo (tela inicial do admin) ----------
router.get('/resumo', async (req, res) => {
  const n = async (sql) => (await db.get(sql)).n
  res.json({
    pedidos: await n('SELECT COUNT(*) AS n FROM pedidos'),
    produtos: await n('SELECT COUNT(*) AS n FROM produtos WHERE ativo = 1'),
    clientes: await n("SELECT COUNT(*) AS n FROM usuarios WHERE perfil = 'cliente'"),
    total_vendido: await n(
      "SELECT COALESCE(SUM(total), 0) AS n FROM pedidos WHERE status IN ('pago','em_separacao','enviado','entregue')"
    ),
  })
})

// ---------- Pedidos ----------
router.get('/pedidos', async (req, res) => {
  const linhas = await db.all(
    `SELECT pe.*, u.nome AS cliente, u.email AS email_cliente
     FROM pedidos pe JOIN usuarios u ON u.id_usuario = pe.id_usuario ORDER BY pe.id_pedido DESC`
  )
  res.json({ pedidos: await Promise.all(linhas.map(pedidoCompleto)) })
})

const STATUS_ADMIN = ['em_separacao', 'enviado', 'entregue', 'cancelado']

router.patch('/pedidos/:id', async (req, res) => {
  const pedido = await db.get('SELECT * FROM pedidos WHERE id_pedido = ?', [req.params.id])
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' })

  const { status } = req.body
  const rastreio = String(req.body.codigo_rastreio || '').trim() || null
  if (!STATUS_ADMIN.includes(status)) return res.status(400).json({ erro: 'Status inválido.' })
  if (pedido.status === 'cancelado') return res.status(400).json({ erro: 'Pedido cancelado não pode ser alterado.' })
  if (pedido.status === 'aguardando_pagamento' && status !== 'cancelado') {
    return res.status(400).json({ erro: 'O pedido só pode avançar depois de pago.' })
  }

  await db.transaction(async (tx) => {
    // Cancelar um pedido que já tinha baixado o estoque devolve os itens
    if (status === 'cancelado' && pedido.status !== 'aguardando_pagamento') {
      const itens = await tx.all('SELECT id_produto, quantidade FROM itens_pedido WHERE id_pedido = ?', [pedido.id_pedido])
      for (const i of itens) {
        await tx.run('UPDATE produtos SET estoque = estoque + ? WHERE id_produto = ?', [i.quantidade, i.id_produto])
      }
    }
    await tx.run('UPDATE pedidos SET status = ?, codigo_rastreio = COALESCE(?, codigo_rastreio) WHERE id_pedido = ?', [
      status,
      rastreio,
      pedido.id_pedido,
    ])
  })
  res.json({ pedido: await db.get('SELECT * FROM pedidos WHERE id_pedido = ?', [pedido.id_pedido]) })
})

// ---------- Produtos ----------
router.get('/categorias', async (req, res) => {
  res.json({ categorias: await db.all('SELECT id_categoria AS id, nome FROM categorias ORDER BY nome') })
})

const SELECT_PRODUTO = `SELECT p.id_produto AS id, p.nome, p.descricao, p.preco, p.estoque, p.imagem, p.ativo,
                               p.id_categoria, c.nome AS categoria
                        FROM produtos p JOIN categorias c ON c.id_categoria = p.id_categoria`

// ----- imagens do produto -----
// As fotos são enviadas pelo navegador direto para o Cloudinary; aqui chegam só os endereços (https://...).
// A primeira (ordem 0) é a principal, e produtos.imagem guarda uma cópia dela.
const MAX_IMAGENS = 8
const URL_IMAGEM = /^https:\/\/\S{4,500}$/

const imagensDe = (idProduto) =>
  db.all('SELECT id_imagem, arquivo FROM produto_imagens WHERE id_produto = ? ORDER BY ordem, id_imagem', [idProduto])

const lerNovas = (body) =>
  (Array.isArray(body.imagens_novas) ? body.imagens_novas : []).filter((u) => typeof u === 'string' && URL_IMAGEM.test(u))

const lerRemover = (body) =>
  (Array.isArray(body.remover) ? body.remover : []).map(Number).filter(Number.isInteger)

// Devolve uma mensagem de erro se passar do limite de fotos
async function validarImagens(body, idProduto) {
  const novas = lerNovas(body)
  const atuais = idProduto ? await imagensDe(idProduto) : []
  const remover = lerRemover(body)
  const restantes = atuais.filter((i) => !remover.includes(i.id_imagem)).length
  return restantes + novas.length > MAX_IMAGENS ? `Cada produto pode ter no máximo ${MAX_IMAGENS} fotos.` : null
}

// Renumera a ordem e atualiza produtos.imagem. Se vier principalId, ela vai para o início.
async function reorganizar(idProduto, principalId) {
  const imgs = await imagensDe(idProduto)
  if (principalId) {
    const pos = imgs.findIndex((i) => i.id_imagem === principalId)
    if (pos > 0) imgs.unshift(...imgs.splice(pos, 1))
  }
  for (let i = 0; i < imgs.length; i++) {
    await db.run('UPDATE produto_imagens SET ordem = ? WHERE id_imagem = ?', [i, imgs[i].id_imagem])
  }
  await db.run('UPDATE produtos SET imagem = ? WHERE id_produto = ?', [imgs[0]?.arquivo || null, idProduto])
}

async function salvarImagens(body, idProduto) {
  for (const idImagem of lerRemover(body)) {
    await db.run('DELETE FROM produto_imagens WHERE id_imagem = ? AND id_produto = ?', [idImagem, idProduto])
  }
  const { m: maior } = await db.get('SELECT COALESCE(MAX(ordem), -1) AS m FROM produto_imagens WHERE id_produto = ?', [idProduto])
  const novas = lerNovas(body)
  for (let i = 0; i < novas.length; i++) {
    await db.run('INSERT INTO produto_imagens (id_produto, arquivo, ordem) VALUES (?, ?, ?)', [idProduto, novas[i], maior + 1 + i])
  }
  await reorganizar(idProduto, Number(body.principal) || null)
}

async function comImagens(produtos) {
  const todas = await db.all('SELECT id_imagem, id_produto, arquivo FROM produto_imagens ORDER BY ordem, id_imagem')
  const porProduto = {}
  for (const i of todas) (porProduto[i.id_produto] ||= []).push({ id_imagem: i.id_imagem, arquivo: i.arquivo })
  return produtos.map((p) => ({ ...p, imagens: porProduto[p.id] || [] }))
}

router.get('/produtos', async (req, res) => {
  const busca = String(req.query.busca || '').trim()
  const produtos = busca
    ? await db.all(`${SELECT_PRODUTO} WHERE p.nome LIKE ? ORDER BY p.id_produto DESC`, [`%${busca}%`])
    : await db.all(`${SELECT_PRODUTO} ORDER BY p.id_produto DESC`)
  res.json({ produtos: await comImagens(produtos) })
})

async function lerProduto(body) {
  const dados = {
    nome: String(body.nome || '').trim(),
    descricao: String(body.descricao || '').trim() || null,
    id_categoria: Number(body.id_categoria),
    preco: Math.round(Number(body.preco)),
    estoque: Math.floor(Number(body.estoque)),
    ativo: String(body.ativo) === '0' || body.ativo === false ? 0 : 1,
  }
  let erro = null
  if (dados.nome.length < 2) erro = 'Informe o nome do produto.'
  else if (!(await db.get('SELECT 1 AS ok FROM categorias WHERE id_categoria = ?', [dados.id_categoria]))) erro = 'Escolha uma categoria.'
  else if (!Number.isFinite(dados.preco) || dados.preco < 0) erro = 'Preço inválido.'
  else if (!Number.isFinite(dados.estoque) || dados.estoque < 0) erro = 'Estoque inválido.'
  return { dados, erro }
}

const detalhe = async (id) => (await comImagens([await db.get(`${SELECT_PRODUTO} WHERE p.id_produto = ?`, [id])]))[0]

router.post('/produtos', async (req, res) => {
  const { dados, erro } = await lerProduto(req.body)
  if (erro) return res.status(400).json({ erro })
  const erroImagens = await validarImagens(req.body, null)
  if (erroImagens) return res.status(400).json({ erro: erroImagens })

  const r = await db.run('INSERT INTO produtos (id_categoria, nome, descricao, preco, estoque, ativo) VALUES (?, ?, ?, ?, ?, ?)', [
    dados.id_categoria,
    dados.nome,
    dados.descricao,
    dados.preco,
    dados.estoque,
    dados.ativo,
  ])
  await salvarImagens(req.body, r.lastInsertRowid)
  res.status(201).json({ produto: await detalhe(r.lastInsertRowid) })
})

router.put('/produtos/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!(await db.get('SELECT 1 AS ok FROM produtos WHERE id_produto = ?', [id]))) {
    return res.status(404).json({ erro: 'Produto não encontrado.' })
  }
  const { dados, erro } = await lerProduto(req.body)
  if (erro) return res.status(400).json({ erro })
  const erroImagens = await validarImagens(req.body, id)
  if (erroImagens) return res.status(400).json({ erro: erroImagens })

  await db.run('UPDATE produtos SET id_categoria=?, nome=?, descricao=?, preco=?, estoque=?, ativo=? WHERE id_produto = ?', [
    dados.id_categoria,
    dados.nome,
    dados.descricao,
    dados.preco,
    dados.estoque,
    dados.ativo,
    id,
  ])
  await salvarImagens(req.body, id)
  res.json({ produto: await detalhe(id) })
})

// Botão rápido: ativar / desativar um produto
router.patch('/produtos/:id', async (req, res) => {
  const r = await db.run('UPDATE produtos SET ativo = ? WHERE id_produto = ?', [req.body.ativo ? 1 : 0, req.params.id])
  if (!r.changes) return res.status(404).json({ erro: 'Produto não encontrado.' })
  res.json({ produto: await detalhe(req.params.id) })
})

// ---------- Clientes ----------
router.get('/clientes', async (req, res) => {
  const busca = String(req.query.busca || '').trim()
  const base = "SELECT id_usuario AS id, nome, email, ativo, criado_em FROM usuarios WHERE perfil = 'cliente'"
  const clientes = busca
    ? await db.all(`${base} AND (nome LIKE ? OR email LIKE ?) ORDER BY id_usuario DESC`, [`%${busca}%`, `%${busca}%`])
    : await db.all(`${base} ORDER BY id_usuario DESC`)
  res.json({ clientes })
})

router.post('/clientes', async (req, res) => {
  const nome = String(req.body.nome || '').trim()
  const email = String(req.body.email || '').trim().toLowerCase()
  const senha = String(req.body.senha || '')
  if (nome.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ erro: 'Informe nome e e-mail válidos.' })
  }
  if (senha.length < 6) return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' })
  if (await db.get('SELECT 1 AS ok FROM usuarios WHERE email = ?', [email])) {
    return res.status(409).json({ erro: 'Já existe uma conta com esse e-mail.' })
  }
  const r = await db.run("INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, 'cliente')", [
    nome,
    email,
    bcrypt.hashSync(senha, 10),
  ])
  res.status(201).json({
    cliente: await db.get('SELECT id_usuario AS id, nome, email, ativo, criado_em FROM usuarios WHERE id_usuario = ?', [r.lastInsertRowid]),
  })
})

router.put('/clientes/:id', async (req, res) => {
  const nome = String(req.body.nome || '').trim()
  const email = String(req.body.email || '').trim().toLowerCase()
  if (nome.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ erro: 'Informe nome e e-mail válidos.' })
  }
  if (await db.get('SELECT 1 AS ok FROM usuarios WHERE email = ? AND id_usuario <> ?', [email, req.params.id])) {
    return res.status(409).json({ erro: 'Esse e-mail já está em uso.' })
  }
  const r = await db.run("UPDATE usuarios SET nome = ?, email = ? WHERE id_usuario = ? AND perfil = 'cliente'", [
    nome,
    email,
    req.params.id,
  ])
  if (!r.changes) return res.status(404).json({ erro: 'Cliente não encontrado.' })
  res.json({ ok: true })
})

router.patch('/clientes/:id', async (req, res) => {
  const r = await db.run("UPDATE usuarios SET ativo = ? WHERE id_usuario = ? AND perfil = 'cliente'", [
    req.body.ativo ? 1 : 0,
    req.params.id,
  ])
  if (!r.changes) return res.status(404).json({ erro: 'Cliente não encontrado.' })
  res.json({ ok: true })
})

module.exports = router
