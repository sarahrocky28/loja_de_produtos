// Camada do banco. Os dois "modos" têm os mesmos comandos, então o resto do projeto não muda:
//   - no seu computador (sem TURSO_DATABASE_URL): usa o SQLite que vem dentro do Node (arquivo db/vortex.sqlite)
//   - online (com TURSO_DATABASE_URL): usa o Turso (SQLite na nuvem)
//
// Comandos disponíveis (todos assíncronos, use com await):
//   await db.get(sql, [valores])   -> uma linha (ou undefined)
//   await db.all(sql, [valores])   -> lista de linhas
//   await db.run(sql, [valores])   -> { changes, lastInsertRowid }
//   await db.exec(sql)             -> vários comandos de uma vez
//   await db.transaction(async (tx) => { ... tx.get / tx.all / tx.run ... })  -> tudo ou nada
const fs = require('fs')
const path = require('path')

const pastaDb = path.join(__dirname, '..', 'db')
const caminho = path.join(pastaDb, 'vortex.sqlite')
const scriptSql = path.join(pastaDb, 'vortex.sql')
const urlRemota = process.env.TURSO_DATABASE_URL

// ---------- Modo 1: SQLite do Node (no seu computador) ----------
class BancoLocal {
  constructor(arquivo) {
    // esconde o aviso "SQLite is an experimental feature" do Node
    const emitir = process.emitWarning
    process.emitWarning = (aviso, ...resto) =>
      String(aviso).includes('SQLite') ? undefined : emitir.call(process, aviso, ...resto)
    const { DatabaseSync } = require('node:sqlite')
    this.bd = new DatabaseSync(arquivo)
    this.bd.exec('PRAGMA foreign_keys = ON') // no SQLite as chaves estrangeiras vêm desligadas
    this.fila = Promise.resolve()
  }

  async get(sql, args = []) {
    const linha = this.bd.prepare(sql).get(...args)
    return linha ? { ...linha } : undefined
  }

  async all(sql, args = []) {
    return this.bd.prepare(sql).all(...args).map((l) => ({ ...l }))
  }

  async run(sql, args = []) {
    const r = this.bd.prepare(sql).run(...args)
    return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) }
  }

  async exec(sql) {
    this.bd.exec(sql)
  }

  // Uma transação por vez (a fila evita que duas se misturem)
  transaction(funcao) {
    const executar = async () => {
      this.bd.exec('BEGIN')
      try {
        const resultado = await funcao(this)
        this.bd.exec('COMMIT')
        return resultado
      } catch (erro) {
        this.bd.exec('ROLLBACK')
        throw erro
      }
    }
    const andamento = this.fila.then(executar)
    this.fila = andamento.catch(() => {})
    return andamento
  }
}

// ---------- Modo 2: Turso (online) ----------
function linhasDe(resultado) {
  return resultado.rows.map((linha) => Object.fromEntries(resultado.columns.map((coluna, i) => [coluna, linha[i]])))
}

// Funciona com "cliente" (o banco) ou com uma transação aberta: os dois têm .execute()
class ExecutorLibsql {
  constructor(executor) {
    this.executor = executor
  }

  async get(sql, args = []) {
    return linhasDe(await this.executor.execute({ sql, args }))[0]
  }

  async all(sql, args = []) {
    return linhasDe(await this.executor.execute({ sql, args }))
  }

  async run(sql, args = []) {
    const r = await this.executor.execute({ sql, args })
    return {
      changes: r.rowsAffected,
      lastInsertRowid: r.lastInsertRowid == null ? undefined : Number(r.lastInsertRowid),
    }
  }
}

class BancoLibsql extends ExecutorLibsql {
  constructor(url, token) {
    // "file:" só existe para testes no computador; online usamos a versão leve, sem nada nativo
    const { createClient } = url.startsWith('file:') ? require('@libsql/client') : require('@libsql/client/web')
    const cliente = createClient({ url, authToken: token })
    super(cliente)
    this.cliente = cliente
  }

  async exec(sql) {
    await this.cliente.executeMultiple(sql)
  }

  // Uma transação por vez neste servidor (fila), com nova tentativa se o banco disser que está ocupado
  transaction(funcao) {
    this.fila = this.fila || Promise.resolve()
    const executar = async () => {
      let tx
      for (let tentativa = 1; ; tentativa++) {
        try {
          tx = await this.cliente.transaction('write')
          break
        } catch (erro) {
          const ocupado = /BUSY|locked/i.test(String(erro?.message || erro?.code))
          if (!ocupado || tentativa >= 6) throw erro
          await new Promise((ok) => setTimeout(ok, 50 * tentativa))
        }
      }
      try {
        const resultado = await funcao(new ExecutorLibsql(tx))
        await tx.commit()
        return resultado
      } catch (erro) {
        try {
          await tx.rollback()
        } catch {
          /* já foi desfeita */
        }
        throw erro
      } finally {
        tx.close()
      }
    }
    const andamento = this.fila.then(executar)
    this.fila = andamento.catch(() => {})
    return andamento
  }
}

// ---------- Criação e atualização do banco ----------
// Tira do script SQL o que não faz sentido rodar no servidor (consultas de teste do DBeaver)
function prepararScript(sql) {
  return sql
    .split('-- 4. CONSULTAS DE TESTE')[0]
    .replace(/^PRAGMA[^\n]*\n/gm, '')
    .replace(/^SELECT sqlite_version\(\);\n/m, '')
}

// Atualiza bancos que já existiam (criados antes das novidades), sem perder nenhum dado
async function migrar(db) {
  await db.exec(`
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
  const colunas = (await db.all('PRAGMA table_info(pedidos)')).map((c) => c.name)
  if (!colunas.includes('entrega')) {
    await db.exec(
      "ALTER TABLE pedidos ADD COLUMN entrega TEXT NOT NULL DEFAULT 'padrao' CHECK (entrega IN ('padrao', 'expressa', 'retirada'))"
    )
  }
  // produtos que já tinham foto: ela vira a imagem principal na nova tabela
  await db.exec(`
    INSERT INTO produto_imagens (id_produto, arquivo, ordem)
    SELECT id_produto, imagem, 0 FROM produtos
    WHERE imagem IS NOT NULL AND id_produto NOT IN (SELECT id_produto FROM produto_imagens)
  `)
}

async function iniciar(db) {
  const existe = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'")
  if (!existe) {
    let sql
    try {
      sql = fs.readFileSync(scriptSql, 'utf8')
    } catch {
      throw new Error('Banco vazio e o arquivo db/vortex.sql não foi encontrado. Rode: npm run db:reset')
    }
    console.log('Banco vazio: criando tabelas e dados de teste...')
    await db.exec(prepararScript(sql))
  }
  await migrar(db)
}

const db = urlRemota ? new BancoLibsql(urlRemota, process.env.TURSO_AUTH_TOKEN) : new BancoLocal(caminho)

// "pronto" é uma promessa que termina quando o banco está criado e atualizado
db.pronto = iniciar(db)
db.pronto.catch((e) => console.error('Erro ao preparar o banco:', e.message))

db.remoto = Boolean(urlRemota)
db.prepararScript = prepararScript
db.caminhoScript = scriptSql

module.exports = db
