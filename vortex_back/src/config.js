// Lê as configurações do .env (valores em centavos)
function cfg() {
  return {
    freteFixo: Number(process.env.FRETE_FIXO ?? 1990),
    freteGratisAcima: Number(process.env.FRETE_GRATIS_ACIMA ?? 21500),
    prazoDias: Number(process.env.PRAZO_ENTREGA_DIAS ?? 7),
    frontUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    backUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  }
}

// Frete fixo; grátis quando o subtotal passa do valor definido
function calcularFrete(subtotal) {
  const c = cfg()
  return {
    frete: subtotal > c.freteGratisAcima ? 0 : c.freteFixo,
    prazoDias: c.prazoDias,
  }
}

module.exports = { cfg, calcularFrete }
