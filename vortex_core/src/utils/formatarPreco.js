export function formatarPreco(centavos) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function reaisParaCentavos(texto) {
  const numero = parseFloat(String(texto).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(numero) ? Math.round(numero * 100) : NaN
}

export function centavosParaReais(centavos) {
  return (centavos / 100).toFixed(2).replace('.', ',')
}
