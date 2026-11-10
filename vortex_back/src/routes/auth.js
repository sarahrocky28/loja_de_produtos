const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../db')
const { exigirLogin } = require('../middleware/auth')

const router = express.Router()
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const gerarToken = (u) =>
  jwt.sign({ id: u.id_usuario }, process.env.JWT_SECRET, { expiresIn: '7d' })
const publico = (u) => ({ id: u.id_usuario, nome: u.nome, email: u.email, perfil: u.perfil })

router.post('/cadastro', (req, res) => {
  const nome = String(req.body.nome || '').trim()
  const email = String(req.body.email || '').trim().toLowerCase()
  const senha = String(req.body.senha || '')

  if (nome.length < 2) return res.status(400).json({ erro: 'Informe seu nome.' })
  if (!EMAIL.test(email)) return res.status(400).json({ erro: 'E-mail inválido.' })
  if (senha.length < 6) return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' })
  if (db.prepare('SELECT 1 FROM usuarios WHERE email = ?').get(email)) {
    return res.status(409).json({ erro: 'Já existe uma conta com esse e-mail.' })
  }

  const hash = bcrypt.hashSync(senha, 10)
  const r = db
    .prepare("INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, 'cliente')")
    .run(nome, email, hash)
  const usuario = db.prepare('SELECT * FROM usuarios WHERE id_usuario = ?').get(r.lastInsertRowid)
  res.status(201).json({ token: gerarToken(usuario), usuario: publico(usuario) })
})

router.post('/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const senha = String(req.body.senha || '')
  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email)

  if (!usuario || !bcrypt.compareSync(senha, usuario.senha_hash)) {
    return res.status(401).json({ erro: 'E-mail ou senha incorretos.' })
  }
  if (!usuario.ativo) return res.status(403).json({ erro: 'Esta conta está desativada.' })
  res.json({ token: gerarToken(usuario), usuario: publico(usuario) })
})

router.get('/me', exigirLogin, (req, res) => {
  res.json({ usuario: publico(req.usuario) })
})

// Editar perfil: nome, e-mail e (opcional) nova senha
router.put('/me', exigirLogin, (req, res) => {
  const nome = String(req.body.nome || '').trim()
  const email = String(req.body.email || '').trim().toLowerCase()
  const novaSenha = String(req.body.novaSenha || '')
  const senhaAtual = String(req.body.senhaAtual || '')

  if (nome.length < 2) return res.status(400).json({ erro: 'Informe seu nome.' })
  if (!EMAIL.test(email)) return res.status(400).json({ erro: 'E-mail inválido.' })
  const outro = db
    .prepare('SELECT 1 FROM usuarios WHERE email = ? AND id_usuario <> ?')
    .get(email, req.usuario.id_usuario)
  if (outro) return res.status(409).json({ erro: 'Esse e-mail já está em uso.' })

  if (novaSenha) {
    if (novaSenha.length < 6) return res.status(400).json({ erro: 'A nova senha precisa ter pelo menos 6 caracteres.' })
    const atual = db.prepare('SELECT senha_hash FROM usuarios WHERE id_usuario = ?').get(req.usuario.id_usuario)
    if (!bcrypt.compareSync(senhaAtual, atual.senha_hash)) {
      return res.status(400).json({ erro: 'Senha atual incorreta.' })
    }
    db.prepare('UPDATE usuarios SET senha_hash = ? WHERE id_usuario = ?')
      .run(bcrypt.hashSync(novaSenha, 10), req.usuario.id_usuario)
  }
  db.prepare('UPDATE usuarios SET nome = ?, email = ? WHERE id_usuario = ?')
    .run(nome, email, req.usuario.id_usuario)

  const usuario = db.prepare('SELECT * FROM usuarios WHERE id_usuario = ?').get(req.usuario.id_usuario)
  res.json({ usuario: publico(usuario) })
})

module.exports = router
