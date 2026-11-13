// Usa o SQLite que já vem dentro do Node (módulo "node:sqlite", Node 22.13 ou mais novo).
// Assim não precisa instalar nem compilar nenhuma biblioteca para o banco.
const emitirAviso = process.emitWarning
process.emitWarning = (aviso, ...resto) =>
  String(aviso).includes('SQLite') ? undefined : emitirAviso.call(process, aviso, ...resto)
const { DatabaseSync } = require('node:sqlite')
const fs = require('fs')
const path = require('path')

// Pequena camada que deixa o banco com os mesmos comandos usados no resto do projeto:
// db.prepare(sql).get() / .all() / .run(), db.exec(sql), db.pragma(texto) e db.transaction(funcao)
class Banco {
  constructor(caminhoDoArquivo) {
    this.bd = new DatabaseSync(caminhoDoArquivo)
  }

  prepare(sql) {
    return this.bd.prepare(sql)
  }

  exec(sql) {
    this.bd.exec(sql)
  }

  pragma(texto) {
    this.bd.exec(`PRAGMA ${texto}`)
  }

  // Executa tudo ou nada: se der erro no meio, desfaz tudo (ROLLBACK)
  transaction(funcao) {
    return (...argumentos) => {
      this.bd.exec('BEGIN')
      try {
        const resultado = funcao(...argumentos)
        this.bd.exec('COMMIT')
        return resultado
      } catch (erro) {
        this.bd.exec('ROLLBACK')
        throw erro
      }
    }
  }
}

const pastaDb = path.join(__dirname, '..', 'db')
const caminho = path.join(pastaDb, 'vortex.sqlite')
const scriptSql = path.join(pastaDb, 'vortex.sql')

const db = new Banco(caminho)
db.pragma('foreign_keys = ON') // no SQLite as chaves estrangeiras vêm desligadas

// Se o banco estiver vazio (primeira execução), cria tudo a partir do script
const existe = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'").get()
if (!existe) {
  console.log('Banco vazio: criando tabelas e dados de teste...')
  db.exec(fs.readFileSync(scriptSql, 'utf8'))
  db.pragma('foreign_keys = ON')
}

// Atualiza bancos que já existiam (criados antes das novidades), sem perder nenhum dado
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
  // produtos que já tinham foto: ela vira a imagem principal na nova tabela
  db.exec(`
    INSERT INTO produto_imagens (id_produto, arquivo, ordem)
    SELECT id_produto, imagem, 0 FROM produtos
    WHERE imagem IS NOT NULL AND id_produto NOT IN (SELECT id_produto FROM produto_imagens)
  `)
}
migrar()

module.exports = db