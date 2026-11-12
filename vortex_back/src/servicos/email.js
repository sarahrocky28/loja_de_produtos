const nodemailer = require('nodemailer')

function configurado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

async function enviarEmail({ para, assunto, texto }) {
  if (!configurado()) {
    console.log(`\n[E-MAIL NÃO CONFIGURADO - aparece só aqui]\nPara: ${para}\nAssunto: ${assunto}\n${texto}\n`)
    return false
  }
  const porta = Number(process.env.SMTP_PORT || 465)
  const transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: porta,
    secure: porta === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  await transporte.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: para,
    subject: assunto,
    text: texto,
  })
  return true
}

module.exports = { enviarEmail }
