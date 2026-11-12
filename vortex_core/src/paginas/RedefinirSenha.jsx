import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import CampoSenha from '../componentes/CampoSenha'
import { botaoClasse, cartaoClasse, paginaClasse } from '../estilos'

// Abre pelo link do e-mail: /redefinir-senha?token=...
export default function RedefinirSenha() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [pronto, setPronto] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    if (senha !== confirmar) return setErro('As senhas não são iguais.')
    try {
      await api('/auth/redefinir-senha', { method: 'POST', corpo: { token, senha } })
      setPronto(true)
    } catch (err) {
      setErro(err.message)
    }
  }

  return (
    <div className={`${paginaClasse} px-4 py-16`}>
      <div className={`${cartaoClasse} mx-auto max-w-sm`}>
        {pronto ? (
          <div className="space-y-4 text-center">
            <h1 className="text-lg font-bold">Senha alterada!</h1>
            <p className="text-sm text-white/70">Agora você já pode entrar com a nova senha.</p>
            <Link to="/login" className={`${botaoClasse} inline-block`}>Ir para o login</Link>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-4">
            <h1 className="text-center text-lg font-bold">Criar nova senha</h1>
            {!token && <p className="text-sm text-red-400">Link incompleto. Peça um novo em "Esqueci minha senha".</p>}
            <CampoSenha label="Nova senha" minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} required />
            <CampoSenha label="Confirmar nova senha" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />
            {erro && <p className="text-sm text-red-400">{erro}</p>}
            <button type="submit" disabled={!token} className={`${botaoClasse} w-full`}>Salvar nova senha</button>
          </form>
        )}
      </div>
    </div>
  )
}
