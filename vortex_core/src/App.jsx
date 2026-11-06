import { Routes, Route } from 'react-router-dom'
import Layout from './componentes/Layout'
import Home from './paginas/Home'

// Página provisória. Conforme você for criando as páginas de verdade,
// troque cada <Pagina titulo="..."/> pelo componente real (ex.: <Home />).
function Pagina({ titulo }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-bold">{titulo}</h1>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="categorias" element={<Pagina titulo="Categorias" />} />
        <Route path="contato" element={<Pagina titulo="Contato" />} />
        <Route path="produtos" element={<Pagina titulo="Produtos" />} />
        <Route path="carrinho" element={<Pagina titulo="Carrinho" />} />
        <Route path="login" element={<Pagina titulo="Entrar" />} />
        <Route path="*" element={<Pagina titulo="Página não encontrada" />} />
      </Route>
    </Routes>
  )
}
