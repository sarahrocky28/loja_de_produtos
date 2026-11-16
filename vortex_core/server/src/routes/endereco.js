const express = require('express')
const db = require('../db')
const { exigirLogin } = require('../middleware/auth')

const router = express.Router()
router.use(exigirLogin)

const SELECT = `SELECT id_endereco, destinatario, cep, logradouro, numero, complemento, bairro, cidade, uf
                FROM enderecos WHERE id_usuario = ? AND padrao = 1`

router.get('/', async (req, res) => {
  res.json({ endereco: (await db.get(SELECT, [req.usuario.id_usuario])) || null })
})

// Cria ou atualiza o endereço principal do usuário
router.put('/', async (req, res) => {
  const b = req.body
  const dados = {
    destinatario: String(b.destinatario || '').trim(),
    cep: String(b.cep || '').replace(/\D/g, ''),
    logradouro: String(b.logradouro || '').trim(),
    numero: String(b.numero || '').trim(),
    complemento: String(b.complemento || '').trim() || null,
    bairro: String(b.bairro || '').trim(),
    cidade: String(b.cidade || '').trim(),
    uf: String(b.uf || '').trim().toUpperCase(),
  }
  if (!dados.destinatario || !dados.logradouro || !dados.numero || !dados.bairro || !dados.cidade) {
    return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios do endereço.' })
  }
  if (!/^\d{8}$/.test(dados.cep)) return res.status(400).json({ erro: 'CEP inválido (8 números).' })
  if (!/^[A-Z]{2}$/.test(dados.uf)) return res.status(400).json({ erro: 'Estado inválido (use a sigla, ex.: SP).' })

  const existente = await db.get(SELECT, [req.usuario.id_usuario])
  const valores = [dados.destinatario, dados.cep, dados.logradouro, dados.numero, dados.complemento, dados.bairro, dados.cidade, dados.uf]
  if (existente) {
    await db.run(
      `UPDATE enderecos SET destinatario=?, cep=?, logradouro=?, numero=?, complemento=?, bairro=?, cidade=?, uf=?
       WHERE id_endereco = ?`,
      [...valores, existente.id_endereco]
    )
  } else {
    await db.run(
      `INSERT INTO enderecos (id_usuario, destinatario, cep, logradouro, numero, complemento, bairro, cidade, uf, padrao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [req.usuario.id_usuario, ...valores]
    )
  }
  res.json({ endereco: await db.get(SELECT, [req.usuario.id_usuario]) })
})

module.exports = router
