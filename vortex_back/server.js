require('dotenv').config()

if (!process.env.JWT_SECRET) {
  console.error('Faltou o JWT_SECRET. Copie o arquivo .env.example para .env e preencha.')
  process.exit(1)
}

const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const { cfg, opcoesEntrega } = require('./src/config')

require('./src/db')

const app = express()
const front = cfg().frontUrl

app.use(cors({ origin: [front, front.replace('localhost', '127.0.0.1')] }))
app.use(express.json())

const pastaUploads = path.join(__dirname, 'uploads')
fs.mkdirSync(pastaUploads, { recursive: true })
app.use('/uploads', express.static(pastaUploads))

app.get('/api/config', (req, res) => {
  const c = cfg()
  res.json({
    frete_fixo: c.freteFixo,
    frete_gratis_acima: c.freteGratisAcima,
    prazo_dias: c.prazoDias,
    opcoes_entrega: opcoesEntrega(),
  })
})

app.use('/api/auth', require('./src/routes/auth'))
app.use('/api/produtos', require('./src/routes/produtos'))
app.use('/api/categorias', require('./src/routes/categorias'))
app.use('/api/carrinho', require('./src/routes/carrinho'))
app.use('/api/favoritos', require('./src/routes/favoritos'))
app.use('/api/endereco', require('./src/routes/endereco'))
app.use('/api/pedidos', require('./src/routes/pedidos'))
app.use('/api/pagamentos', require('./src/routes/pagamentos'))
app.use('/api/contato', require('./src/routes/contato'))
app.use('/api/admin', require('./src/routes/admin'))

app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }))

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ erro: 'Erro interno do servidor.' })
})

const porta = process.env.PORT || 3001
app.listen(porta, () => console.log(`API da Vortex rodando em http://localhost:${porta}`))
