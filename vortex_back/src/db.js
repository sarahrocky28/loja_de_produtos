const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const pastaDb = path.join(__dirname, '..', 'db')
const caminho = path.join(pastaDb, 'vortex.sqlite')
const scriptSql = path.join(pastaDb, 'vortex.sql')

const db = new Database(caminho)
db.pragma('foreign_keys = ON') // no SQLite as chaves estrangeiras vêm desligadas

// Se o banco estiver vazio (primeira execução), cria tudo a partir do script
const existe = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'").get()
if (!existe) {
  console.log('Banco vazio: criando tabelas e dados de teste...')
  db.exec(fs.readFileSync(scriptSql, 'utf8'))
  db.pragma('foreign_keys = ON')
}

module.exports = db
