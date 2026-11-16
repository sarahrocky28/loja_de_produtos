const jwt = require('jsonwebtoken')
const db = require('../db')

// Exige um usuário logado (header Authorization: Bearer <token>)
async function exigirLogin(req, res, next) {
  const cabecalho = req.headers.authorization || ''
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null
  if (!token) return res.status(401).json({ erro: 'Faça login para continuar.' })

  let dados
  try {
    dados = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' })
  }

  const usuario = await db.get('SELECT id_usuario, nome, email, perfil, ativo FROM usuarios WHERE id_usuario = ?', [dados.id])
  if (!usuario || !usuario.ativo) {
    return res.status(401).json({ erro: 'Conta não encontrada ou desativada.' })
  }
  req.usuario = usuario
  next()
}

// Exige perfil de administrador (usar depois do exigirLogin)
function exigirAdmin(req, res, next) {
  if (req.usuario?.perfil !== 'admin') {
    return res.status(403).json({ erro: 'Acesso restrito ao administrador.' })
  }
  next()
}

module.exports = { exigirLogin, exigirAdmin }
