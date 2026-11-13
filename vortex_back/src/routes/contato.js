const express = require('express')
const db = require('../db')

const router = express.Router()
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

router.post('/', async (req, res) => {
  const nome = String(req.body.nome || '').trim()
  const email = String(req.body.email || '').trim()
  const mensagem = String(req.body.mensagem || '').trim()
  if (nome.length < 2 || !EMAIL.test(email) || mensagem.length < 5) {
    return res.status(400).json({ erro: 'Preencha nome, e-mail válido e a mensagem.' })
  }
  await db.run('INSERT INTO mensagens_contato (nome, email, mensagem) VALUES (?, ?, ?)', [nome, email, mensagem.slice(0, 2000)])
  res.status(201).json({ ok: true })
})

module.exports = router
