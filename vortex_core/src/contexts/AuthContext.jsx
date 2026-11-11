import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(Boolean(localStorage.getItem('vortex_token')))

  useEffect(() => {
    if (!localStorage.getItem('vortex_token')) return
    api('/auth/me')
      .then((d) => setUsuario(d.usuario))
      .catch(() => localStorage.removeItem('vortex_token'))
      .finally(() => setCarregando(false))
  }, [])

  async function entrar(email, senha) {
    const d = await api('/auth/login', { method: 'POST', corpo: { email, senha } })
    localStorage.setItem('vortex_token', d.token)
    setUsuario(d.usuario)
    return d.usuario
  }

  async function cadastrar(dados) {
    const d = await api('/auth/cadastro', { method: 'POST', corpo: dados })
    localStorage.setItem('vortex_token', d.token)
    setUsuario(d.usuario)
    return d.usuario
  }

  function sair() {
    localStorage.removeItem('vortex_token')
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, setUsuario, carregando, entrar, cadastrar, sair }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
