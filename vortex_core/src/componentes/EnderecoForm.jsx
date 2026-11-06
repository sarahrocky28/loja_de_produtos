import Campo from './Campo'
import { buscarCep } from '../utils/cep'

export const ENDERECO_VAZIO = {
  destinatario: '', logradouro: '', cep: '', bairro: '', numero: '', cidade: '', uf: '', complemento: '',
}

const mascaraCep = (c) => c.replace(/^(\d{5})(\d)/, '$1-$2')

// Formulário de endereço (usado no perfil e no carrinho). Ao sair do CEP, preenche o resto pelo ViaCEP.
export default function EnderecoForm({ valor, onChange }) {
  const set = (campo) => (e) => onChange({ ...valor, [campo]: e.target.value })

  async function aoSairDoCep() {
    const achou = await buscarCep(valor.cep)
    if (achou) onChange({ ...valor, ...achou })
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Campo label="Nome" value={valor.destinatario} onChange={set('destinatario')} required />
      <Campo label="Rua" value={valor.logradouro} onChange={set('logradouro')} required />
      <Campo
        label="CEP"
        inputMode="numeric"
        placeholder="00000-000"
        value={mascaraCep(valor.cep)}
        onChange={(e) => onChange({ ...valor, cep: e.target.value.replace(/\D/g, '').slice(0, 8) })}
        onBlur={aoSairDoCep}
        required
      />
      <Campo label="Bairro" value={valor.bairro} onChange={set('bairro')} required />
      <Campo label="Número" value={valor.numero} onChange={set('numero')} required />
      <Campo label="Cidade" value={valor.cidade} onChange={set('cidade')} required />
      <Campo
        label="Estado"
        maxLength={2}
        placeholder="SP"
        value={valor.uf}
        onChange={(e) => onChange({ ...valor, uf: e.target.value.toUpperCase() })}
        required
      />
      <Campo label="Complemento (opcional)" value={valor.complemento || ''} onChange={set('complemento')} />
    </div>
  )
}
