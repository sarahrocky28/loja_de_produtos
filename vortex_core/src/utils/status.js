export const STATUS_PEDIDO = {
  aguardando_pagamento: 'Aguardando pagamento',
  pago: 'Pago',
  em_separacao: 'Em separação',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

export function formatarData(texto) {
  if (!texto) return ''
  return new Date(texto.replace(' ', 'T')).toLocaleDateString('pt-BR')
}
