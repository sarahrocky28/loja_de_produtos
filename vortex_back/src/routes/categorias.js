const express = require('express')
const db = require('../db')
const router = express.Router()

router.get('/', (req, res) => {
  res.json({ categorias: db.prepare('SELECT id_categoria AS id, nome FROM categorias ORDER BY nome').all() })
})

module.exports = router
