const express = require('express')
const db = require('../db')
const router = express.Router()

router.get('/', async (req, res) => {
  res.json({ categorias: await db.all('SELECT id_categoria AS id, nome FROM categorias ORDER BY nome') })
})

module.exports = router
