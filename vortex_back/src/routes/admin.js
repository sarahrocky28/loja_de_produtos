const express = require('express')
const bcrypt = require('bcryptjs')
const multer = require('multer')
const cloudinary = require('cloudinary').v2
const db = require('../db')
const { exigirLogin, exigirAdmin } = require('../middleware/auth')
const { pedidoCompleto } = require('../servicos/pedidos')

const router = express.Router()
router.use(exigirLogin, exigirAdmin)

// ---------- Configuração do Cloudinary ----------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ---------- Upload de imagens dos produtos ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 8,
  },
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp']

    if (!tiposPermitidos.includes(file.mimetype)) {
      return cb(new Error('Formato inválido. Use JPG, PNG ou WEBP.'))
    }

    cb(null, true)
  },
})

// Envia a imagem para o Cloudinary
function enviarParaCloudinary(arquivo) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'vortex-core/produtos',
        resource_type: 'image',
      },
      (erro, resultado) => {
        if (erro) return reject(erro)
        resolve(resultado)
      }
    )

    stream.end(arquivo.buffer)
  })
}

// Recupera o identificador da imagem a partir da URL
function publicIdDaUrl(url) {
  if (!url || typeof url !== 'string') return null

  try {
    const partes = new URL(url)
    const marcador = '/upload/'
    const indice = partes.pathname.indexOf(marcador)

    if (indice === -1) return null

    let caminho = partes.pathname.slice(indice + marcador.length)
    caminho = caminho.replace(/^v\d+\//, '')
    caminho = caminho.replace(/\.[^/.]+$/, '')

    return decodeURIComponent(caminho) || null
  } catch {
    return null
  }
}

// Exclui imagem do Cloudinary
async function excluirDoCloudinary(url) {
  const publicId = publicIdDaUrl(url)

  if (!publicId) return

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    })
  } catch (erro) {
    console.error(
      'Não foi possível excluir imagem do Cloudinary:',
      erro.message
    )
  }
}

// Lista imagens de um produto
function listarImagens(idProduto) {
  return db.prepare(
    `SELECT id_imagem, arquivo
     FROM produto_imagens
     WHERE id_produto = ?
     ORDER BY ordem, id_imagem`
  ).all(idProduto)
}

// Retorna produto com suas imagens
function produtoComImagens(idProduto) {
  const produto = db.prepare(
    `${SELECT_PRODUTO} WHERE p.id_produto = ?`
  ).get(idProduto)

  if (!produto) return null

  return {
    ...produto,
    imagens: listarImagens(idProduto),
  }
}

// ---------- Resumo ----------
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
       FROM pedidos pe
       JOIN usuarios u ON u.id_usuario = pe.id_usuario
       ORDER BY pe.id_pedido DESC`
    )
    .all()

  res.json({
    pedidos: linhas.map(pedidoCompleto),
  })
})

const STATUS_ADMIN = [
  'em_separacao',
  'enviado',
  'entregue',
  'cancelado',
]

router.patch('/pedidos/:id', (req, res) => {
  const pedido = db.prepare(
    'SELECT * FROM pedidos WHERE id_pedido = ?'
  ).get(req.params.id)

  if (!pedido) {
    return res.status(404).json({
      erro: 'Pedido não encontrado.',
    })
  }

  const { status } = req.body
  const rastreio = String(req.body.codigo_rastreio || '').trim() || null

  if (!STATUS_ADMIN.includes(status)) {
    return res.status(400).json({
      erro: 'Status inválido.',
    })
  }

  if (pedido.status === 'cancelado') {
    return res.status(400).json({
      erro: 'Pedido cancelado não pode ser alterado.',
    })
  }

  if (
    pedido.status === 'aguardando_pagamento' &&
    status !== 'cancelado'
  ) {
    return res.status(400).json({
      erro: 'O pedido só pode avançar depois de pago.',
    })
  }

  db.transaction(() => {
    // Devolve o estoque ao cancelar um pedido que já havia baixado os itens
    if (
      status === 'cancelado' &&
      pedido.status !== 'aguardando_pagamento'
    ) {
      const itens = db.prepare(
        'SELECT id_produto, quantidade FROM itens_pedido WHERE id_pedido = ?'
      ).all(pedido.id_pedido)

      const devolve = db.prepare(
        'UPDATE produtos SET estoque = estoque + ? WHERE id_produto = ?'
      )

      for (const i of itens) {
        devolve.run(i.quantidade, i.id_produto)
      }
    }

    db.prepare(
      `UPDATE pedidos
       SET status = ?, codigo_rastreio = COALESCE(?, codigo_rastreio)
       WHERE id_pedido = ?`
    ).run(status, rastreio, pedido.id_pedido)
  })()

  res.json({
    pedido: db.prepare(
      'SELECT * FROM pedidos WHERE id_pedido = ?'
    ).get(pedido.id_pedido),
  })
})

// ---------- Produtos ----------
router.get('/categorias', (req, res) => {
  res.json({
    categorias: db.prepare(
      'SELECT id_categoria AS id, nome FROM categorias ORDER BY nome'
    ).all(),
  })
})

const SELECT_PRODUTO = `
  SELECT
    p.id_produto AS id,
    p.nome,
    p.descricao,
    p.preco,
    p.estoque,
    p.imagem,
    p.ativo,
    p.id_categoria,
    c.nome AS categoria
  FROM produtos p
  JOIN categorias c ON c.id_categoria = p.id_categoria
`

// Lista produtos e suas imagens
router.get('/produtos', (req, res) => {
  const busca = String(req.query.busca || '').trim()

  const produtos = busca
    ? db.prepare(
        `${SELECT_PRODUTO}
         WHERE p.nome LIKE ?
         ORDER BY p.id_produto DESC`
      ).all(`%${busca}%`)
    : db.prepare(
        `${SELECT_PRODUTO}
         ORDER BY p.id_produto DESC`
      ).all()

  res.json({
    produtos: produtos.map(produto => ({
      ...produto,
      imagens: listarImagens(produto.id),
    })),
  })
})

// Validação dos dados do produto
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

  if (dados.nome.length < 2) {
    erro = 'Informe o nome do produto.'
  } else if (
    !db.prepare(
      'SELECT 1 FROM categorias WHERE id_categoria = ?'
    ).get(dados.id_categoria)
  ) {
    erro = 'Escolha uma categoria.'
  } else if (
    !Number.isFinite(dados.preco) ||
    dados.preco < 0
  ) {
    erro = 'Preço inválido.'
  } else if (
    !Number.isFinite(dados.estoque) ||
    dados.estoque < 0
  ) {
    erro = 'Estoque inválido.'
  }

  return {
    dados,
    erro,
  }
}

// Lê os IDs das imagens que devem ser removidas
function idsParaRemover(valor) {
  try {
    const ids = JSON.parse(valor || '[]')

    if (!Array.isArray(ids)) return []

    return ids
      .map(Number)
      .filter(id => Number.isInteger(id) && id > 0)
  } catch {
    return []
  }
}

// Escolhe a imagem principal
function escolherImagemPrincipal(
  principal,
  imagens,
  novasImagens
) {
  const escolha = String(principal || '')

  // Imagem que já existia no banco
  if (escolha && /^\d+$/.test(escolha)) {
    const existente = imagens.find(
      img => String(img.id_imagem) === escolha
    )

    if (existente) return existente.arquivo
  }

  // Imagem recém-enviada
  const nova = escolha.match(/^nova-(\d+)$/)

  if (nova) {
    const indice = Number(nova[1])

    if (novasImagens[indice]) {
      return novasImagens[indice].secure_url
    }
  }

  // Escolha feita pela URL
  const porUrl = imagens.find(
    img => img.arquivo === escolha
  )

  return porUrl?.arquivo || imagens[0]?.arquivo || null
}

// Salva e organiza as imagens do produto
async function salvarImagensDoProduto(
  idProduto,
  arquivos,
  remover,
  principal
) {
  const atuais = listarImagens(idProduto)

  const idsRemover = remover.filter(
    id => atuais.some(img => img.id_imagem === id)
  )

  const restantes = atuais.filter(
    img => !idsRemover.includes(img.id_imagem)
  )

  if (restantes.length + arquivos.length > 8) {
    const erro = new Error(
      'Cada produto pode ter no máximo 8 imagens.'
    )

    erro.status = 400
    throw erro
  }

  // Envia as novas imagens para o Cloudinary
  const enviadas = []

  try {
    for (const arquivo of arquivos) {
      enviadas.push(
        await enviarParaCloudinary(arquivo)
      )
    }
  } catch (erro) {
    await Promise.all(
      enviadas.map(img => excluirDoCloudinary(img.secure_url))
    )

    throw erro
  }

  const imagensNovas = enviadas.map(img => ({
    secure_url: img.secure_url,
  }))

  try {
    db.transaction(() => {
      // Remove as imagens selecionadas do banco
      if (idsRemover.length) {
        const apagar = db.prepare(
          `DELETE FROM produto_imagens
           WHERE id_produto = ? AND id_imagem = ?`
        )

        for (const id of idsRemover) {
          apagar.run(idProduto, id)
        }
      }

      // Insere as imagens novas
      const inserir = db.prepare(
        `INSERT INTO produto_imagens
         (id_produto, arquivo, ordem)
         VALUES (?, ?, ?)`
      )

      for (const img of enviadas) {
        inserir.run(
          idProduto,
          img.secure_url,
          restantes.length + enviadas.indexOf(img)
        )
      }

      const imagensAtualizadas = listarImagens(idProduto)

      const imagemPrincipal = escolherImagemPrincipal(
        principal,
        imagensAtualizadas,
        imagensNovas
      )

      // Atualiza a imagem principal do produto
      db.prepare(
        'UPDATE produtos SET imagem = ? WHERE id_produto = ?'
      ).run(imagemPrincipal, idProduto)
    })()
  } catch (erro) {
    await Promise.all(
      enviadas.map(img => excluirDoCloudinary(img.secure_url))
    )

    throw erro
  }

  // Exclui do Cloudinary as imagens removidas
  await Promise.all(
    atuais
      .filter(img => idsRemover.includes(img.id_imagem))
      .map(img => excluirDoCloudinary(img.arquivo))
  )

  return produtoComImagens(idProduto)
}

// Cadastro de produto
router.post(
  '/produtos',
  upload.array('imagens', 8),
  async (req, res) => {
    const { dados, erro } = lerProduto(req)

    if (erro) {
      return res.status(400).json({ erro })
    }

    let produtoId

    try {
      const r = db.prepare(
        `INSERT INTO produtos
         (id_categoria, nome, descricao, preco, estoque, imagem, ativo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        dados.id_categoria,
        dados.nome,
        dados.descricao,
        dados.preco,
        dados.estoque,
        null,
        dados.ativo
      )

      produtoId = Number(r.lastInsertRowid)

      const produto = await salvarImagensDoProduto(
        produtoId,
        req.files || [],
        [],
        req.body.principal
      )

      res.status(201).json({ produto })
    } catch (erroUpload) {
      if (produtoId) {
        db.prepare(
          'DELETE FROM produtos WHERE id_produto = ?'
        ).run(produtoId)
      }

      console.error(
        'Erro ao cadastrar produto/imagens:',
        erroUpload
      )

      res.status(erroUpload.status || 500).json({
        erro: erroUpload.status
          ? erroUpload.message
          : 'Não foi possível salvar as imagens do produto.',
      })
    }
  }
)

// Edição de produto
router.put(
  '/produtos/:id',
  upload.array('imagens', 8),
  async (req, res) => {
    const atual = db.prepare(
      'SELECT id_produto FROM produtos WHERE id_produto = ?'
    ).get(req.params.id)

    if (!atual) {
      return res.status(404).json({
        erro: 'Produto não encontrado.',
      })
    }

    const { dados, erro } = lerProduto(req)

    if (erro) {
      return res.status(400).json({ erro })
    }

    try {
      db.prepare(
        `UPDATE produtos
         SET id_categoria = ?,
             nome = ?,
             descricao = ?,
             preco = ?,
             estoque = ?,
             ativo = ?
         WHERE id_produto = ?`
      ).run(
        dados.id_categoria,
        dados.nome,
        dados.descricao,
        dados.preco,
        dados.estoque,
        dados.ativo,
        req.params.id
      )

      const produto = await salvarImagensDoProduto(
        Number(req.params.id),
        req.files || [],
        idsParaRemover(req.body.remover),
        req.body.principal
      )

      res.json({ produto })
    } catch (erroUpload) {
      console.error(
        'Erro ao atualizar produto/imagens:',
        erroUpload
      )

      res.status(erroUpload.status || 500).json({
        erro: erroUpload.status
          ? erroUpload.message
          : 'Não foi possível atualizar as imagens do produto.',
      })
    }
  }
)

// ---------- Clientes ----------
router.get('/clientes', (req, res) => {
  const busca = String(req.query.busca || '').trim()

  const base = `
    SELECT
      id_usuario AS id,
      nome,
      email,
      ativo,
      criado_em
    FROM usuarios
    WHERE perfil = 'cliente'
  `

  const clientes = busca
    ? db.prepare(
        `${base}
         AND (nome LIKE ? OR email LIKE ?)
         ORDER BY id_usuario DESC`
      ).all(`%${busca}%`, `%${busca}%`)
    : db.prepare(
        `${base} ORDER BY id_usuario DESC`
      ).all()

  res.json({ clientes })
})

router.post('/clientes', (req, res) => {
  const nome = String(req.body.nome || '').trim()
  const email = String(req.body.email || '').trim().toLowerCase()
  const senha = String(req.body.senha || '')

  if (
    nome.length < 2 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return res.status(400).json({
      erro: 'Informe nome e e-mail válidos.',
    })
  }

  if (senha.length < 6) {
    return res.status(400).json({
      erro: 'A senha precisa ter pelo menos 6 caracteres.',
    })
  }

  if (
    db.prepare(
      'SELECT 1 FROM usuarios WHERE email = ?'
    ).get(email)
  ) {
    return res.status(409).json({
      erro: 'Já existe uma conta com esse e-mail.',
    })
  }

  const r = db.prepare(
    `INSERT INTO usuarios
     (nome, email, senha_hash, perfil)
     VALUES (?, ?, ?, 'cliente')`
  ).run(
    nome,
    email,
    bcrypt.hashSync(senha, 10)
  )

  res.status(201).json({
    cliente: db.prepare(
      `SELECT
         id_usuario AS id,
         nome,
         email,
         ativo,
         criado_em
       FROM usuarios
       WHERE id_usuario = ?`
    ).get(r.lastInsertRowid),
  })
})

router.patch('/clientes/:id', (req, res) => {
  const ativo = req.body.ativo ? 1 : 0

  const r = db.prepare(
    `UPDATE usuarios
     SET ativo = ?
     WHERE id_usuario = ? AND perfil = 'cliente'`
  ).run(ativo, req.params.id)

  if (!r.changes) {
    return res.status(404).json({
      erro: 'Cliente não encontrado.',
    })
  }

  res.json({ ok: true })
})

module.exports = router