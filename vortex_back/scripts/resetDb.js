const fs = require('fs')
const path = require('path')
for (const sufixo of ['', '-wal', '-shm']) {
  const arq = path.join(__dirname, '..', 'db', 'vortex.sqlite' + sufixo)
  if (fs.existsSync(arq)) fs.unlinkSync(arq)
}
require('../src/db')
console.log('Banco recriado com sucesso.')
