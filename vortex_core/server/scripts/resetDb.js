// Apaga e recria o banco com os dados de teste.
//   npm run db:reset                    -> banco do seu computador
//   (com TURSO_DATABASE_URL definido)   -> banco ONLINE; exige:  npm run db:reset -- --confirmar
require('dotenv').config({ quiet: true })
const fs = require('fs')
const path = require('path')

const remoto = Boolean(process.env.TURSO_DATABASE_URL)
if (remoto && !process.argv.includes('--confirmar')) {
  console.log('ATENÇÃO: isto APAGA e recria o banco ONLINE (Turso).')
  console.log('Se é isso mesmo, rode:  npm run db:reset -- --confirmar')
  process.exit(1)
}
if (!remoto) {
  for (const sufixo of ['', '-wal', '-shm']) {
    const arquivo = path.join(__dirname, '..', 'db', 'vortex.sqlite' + sufixo)
    if (fs.existsSync(arquivo)) fs.unlinkSync(arquivo)
  }
}

const db = require('../src/db')
db.pronto
  .then(async () => {
    if (remoto) await db.exec(db.prepararScript(fs.readFileSync(db.caminhoScript, 'utf8'))) // o script já apaga as tabelas antes
    console.log('Banco pronto.')
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
