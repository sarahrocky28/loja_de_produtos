const jwt = require('jsonwebtoken')
const db = require('../db')

function exigirLogin(req, res, next) {
  const cabecalho = req.headers.authorization || ''
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null
  if (!token) return res.status(401).json({ erro: 'Faça login para continuar.' })
  try {
    const dados = jwt.verify(token, process.env.JWT_SECRET)
    const usuario = db
      .prepare('SELECT id_usuario, nome, email, perfil, ativo FROM usuarios WHERE id_usuario = ?')
      .get(dados.id)
    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ erro: 'Conta não encontrada ou desativada.' })
    }
    req.usuario = usuario
    next()
  } catch {
    res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' })
  }
}

function exigirAdmin(req, res, next) {
  if (req.usuario?.perfil !== 'admin') {
    return res.status(403).json({ erro: 'Acesso restrito ao administrador.' })
  }
  next()
}

module.exports = { exigirLogin, exigirAdmin }
