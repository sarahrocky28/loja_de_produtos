// Lê as configurações do .env (valores em centavos)
function cfg() {
  return {
    freteFixo: Number(process.env.FRETE_FIXO ?? 1990),
    freteGratisAcima: Number(process.env.FRETE_GRATIS_ACIMA ?? 21500),
    prazoDias: Number(process.env.PRAZO_ENTREGA_DIAS ?? 7),
    freteExpresso: Number(process.env.FRETE_EXPRESSO ?? 3490),
    prazoExpresso: Number(process.env.PRAZO_EXPRESSO ?? 3),
    frontUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    backUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  }
}

// Formas de entrega que o cliente pode escolher
function opcoesEntrega() {
  const c = cfg()
  return [
    { id: 'padrao', rotulo: 'Entrega padrão', valor: c.freteFixo, prazo_dias: c.prazoDias, gratis_acima: true },
    { id: 'expressa', rotulo: 'Entrega expressa', valor: c.freteExpresso, prazo_dias: c.prazoExpresso, gratis_acima: false },
    { id: 'retirada', rotulo: 'Retirar na loja', valor: 0, prazo_dias: 1, gratis_acima: false },
  ]
}

// Calcula o frete de um pedido. Só a entrega padrão fica grátis acima do valor definido.
function calcularFrete(subtotal, tipo = 'padrao') {
  const opcao = opcoesEntrega().find((o) => o.id === tipo)
  if (!opcao) return null
  const gratis = opcao.gratis_acima && subtotal > cfg().freteGratisAcima
  return { frete: gratis ? 0 : opcao.valor, prazoDias: opcao.prazo_dias }
}

module.exports = { cfg, opcoesEntrega, calcularFrete }
