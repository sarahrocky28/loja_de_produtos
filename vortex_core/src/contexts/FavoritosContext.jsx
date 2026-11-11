import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from './AuthContext'

const FavoritosContext = createContext(null)

export function FavoritosProvider({ children }) {
  const { usuario } = useAuth()
  const [ids, setIds] = useState([])

  useEffect(() => {
    if (!usuario) {
      setIds([])
      return
    }
    api('/favoritos/ids')
      .then((d) => setIds(d.ids))
      .catch(() => {})
  }, [usuario])

  async function alternar(idProduto) {
    if (!usuario) {
      const erro = new Error('Faça login para favoritar.')
      erro.status = 401
      throw erro
    }
    const d = await api(`/favoritos/${idProduto}`, { method: ids.includes(idProduto) ? 'DELETE' : 'POST' })
    setIds(d.ids)
  }

  return (
    <FavoritosContext.Provider value={{ ids, alternar, ehFavorito: (id) => ids.includes(id) }}>
      {children}
    </FavoritosContext.Provider>
  )
}

export function useFavoritos() {
  return useContext(FavoritosContext)
}
