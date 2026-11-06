
export async function buscarCep(cep) {
  const limpo = String(cep).replace(/\D/g, '')
  if (limpo.length !== 8) return null
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${limpo}/json/`)
    const dados = await resposta.json()
    if (dados.erro) return null
    return { logradouro: dados.logradouro, bairro: dados.bairro, cidade: dados.localidade, uf: dados.uf }
  } catch {
    return null
  }
}
