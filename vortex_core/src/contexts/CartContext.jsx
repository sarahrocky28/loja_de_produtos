import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from '../api'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { usuario } = useAuth()
  const [itens, setItens] = useState([])

  const recarregar = useCallback(async () => {
    if (!usuario) {
      setItens([])
      return
    }
    try {
      setItens((await api('/carrinho')).itens)
    } catch {
    }
  }, [usuario])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  async function adicionar(idProduto, quantidade = 1) {
    if (!usuario) {
      const erro = new Error('Faça login para adicionar ao carrinho.')
      erro.status = 401
      throw erro
    }
    const d = await api('/carrinho', { method: 'POST', corpo: { id_produto: idProduto, quantidade } })
    setItens(d.itens)
  }

  async function alterar(idProduto, quantidade) {
    const d = await api(`/carrinho/${idProduto}`, { method: 'PUT', corpo: { quantidade } })
    setItens(d.itens)
  }

  async function remover(idProduto) {
    const d = await api(`/carrinho/${idProduto}`, { method: 'DELETE' })
    setItens(d.itens)
  }

  const quantidade = itens.reduce((soma, i) => soma + i.quantidade, 0)
  const subtotal = itens.reduce((soma, i) => soma + i.quantidade * i.preco, 0)

  return (
    <CartContext.Provider value={{ itens, quantidade, subtotal, adicionar, alterar, remover, recarregar }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
