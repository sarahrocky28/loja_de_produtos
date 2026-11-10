const express = require('express')
const db = require('../db')

const router = express.Router()

// As abas do layout (Suplementos, Acessórios, Roupas) agrupam categorias do banco
const GRUPOS = {
  suplementos: ['Proteínas', 'Creatinas', 'Pré-treinos e Energia', 'Aminoácidos', 'Vitaminas e Minerais'],
  acessorios: ['Acessórios'],
  roupas: ['Roupas'],
}
const NOME_GRUPO = { suplementos: 'Suplementos', acessorios: 'Acessórios', roupas: 'Roupas' }

function grupoDaCategoria(categoria) {
  return Object.keys(GRUPOS).find((g) => GRUPOS[g].includes(categoria)) || null
}

const COLUNAS = `p.id_produto AS id, p.nome, p.descricao, p.preco, p.estoque, p.imagem, c.nome AS categoria`

router.get('/', (req, res) => {
  const condicoes = ['p.ativo = 1']
  const valores = []

  const busca = String(req.query.busca || '').trim()
  if (busca) {
    condicoes.push('p.nome LIKE ?')
    valores.push(`%${busca}%`)
  }
  const grupo = String(req.query.categoria || '').toLowerCase()
  if (GRUPOS[grupo]) {
    condicoes.push(`c.nome IN (${GRUPOS[grupo].map(() => '?').join(',')})`)
    valores.push(...GRUPOS[grupo])
  }
  const limite = Math.min(Number(req.query.limite) || 100, 100)

  const produtos = db
    .prepare(
      `SELECT ${COLUNAS} FROM produtos p JOIN categorias c ON c.id_categoria = p.id_categoria
       WHERE ${condicoes.join(' AND ')} ORDER BY p.id_produto LIMIT ?`
    )
    .all(...valores, limite)
  res.json({ produtos })
})

router.get('/:id', (req, res) => {
  const produto = db
    .prepare(
      `SELECT ${COLUNAS} FROM produtos p JOIN categorias c ON c.id_categoria = p.id_categoria
       WHERE p.id_produto = ? AND p.ativo = 1`
    )
    .get(req.params.id)
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' })
  const grupo = grupoDaCategoria(produto.categoria)
  res.json({ produto: { ...produto, grupo: grupo ? NOME_GRUPO[grupo] : produto.categoria } })
})

module.exports = router
