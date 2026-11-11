const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const pastaDb = path.join(__dirname, '..', 'db')
const caminho = path.join(pastaDb, 'vortex.sqlite')
const scriptSql = path.join(pastaDb, 'vortex.sql')

const db = new Database(caminho)
db.pragma('foreign_keys = ON') 

const existe = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'").get()
if (!existe) {
  console.log('Banco vazio: criando tabelas e dados de teste...')
  db.exec(fs.readFileSync(scriptSql, 'utf8'))
  db.pragma('foreign_keys = ON')
}

function migrar() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS produto_imagens (
      id_imagem INTEGER PRIMARY KEY AUTOINCREMENT,
      id_produto INTEGER NOT NULL,
      arquivo TEXT NOT NULL,
      ordem INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (id_produto) REFERENCES produtos(id_produto) ON DELETE CASCADE
    ) STRICT;
    CREATE TABLE IF NOT EXISTS favoritos (
      id_usuario INTEGER NOT NULL,
      id_produto INTEGER NOT NULL,
      criado_em TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
      PRIMARY KEY (id_usuario, id_produto),
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
      FOREIGN KEY (id_produto) REFERENCES produtos(id_produto) ON DELETE CASCADE
    ) STRICT;
    CREATE TABLE IF NOT EXISTS redefinicoes_senha (
      id_redefinicao INTEGER PRIMARY KEY AUTOINCREMENT,
      id_usuario INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expira_em TEXT NOT NULL,
      usado INTEGER NOT NULL DEFAULT 0 CHECK (usado IN (0, 1)),
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
    ) STRICT;
  `)
  const colunas = db.prepare('PRAGMA table_info(pedidos)').all().map((c) => c.name)
  if (!colunas.includes('entrega')) {
    db.exec(
      "ALTER TABLE pedidos ADD COLUMN entrega TEXT NOT NULL DEFAULT 'padrao' CHECK (entrega IN ('padrao', 'expressa', 'retirada'))"
    )
  }

  db.exec(`
    INSERT INTO produto_imagens (id_produto, arquivo, ordem)
    SELECT id_produto, imagem, 0 FROM produtos
    WHERE imagem IS NOT NULL AND id_produto NOT IN (SELECT id_produto FROM produto_imagens)
  `)
}
migrar()

module.exports = db
