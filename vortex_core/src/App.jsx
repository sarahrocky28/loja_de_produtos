import { Routes, Route } from 'react-router-dom'
import Layout from './componentes/Layout'
import { RequireAuth, RequireAdmin } from './componentes/RotaProtegida'

import Home from './paginas/Home'
import Categorias from './paginas/Categorias'
import Produto from './paginas/Produto'
import Contato from './paginas/Contato'
import Login from './paginas/Login'
import Cadastro from './paginas/Cadastro'
import Perfil from './paginas/Perfil'
import Carrinho from './paginas/Carrinho'
import PedidoConfirmado from './paginas/PedidoConfirmado'
import NotFound from './paginas/NotFound'
import Erro500 from './componentes/Erro500'

import AdminLayout from './paginas/admin/AdminLayout'
import AdminLogin from './paginas/admin/AdminLogin'
import AdminInicio from './paginas/admin/AdminInicio'
import AdminPedidos from './paginas/admin/AdminPedidos'
import AdminProdutos from './paginas/admin/AdminProdutos'
import AdminClientes from './paginas/admin/AdminClientes'
import AdminPerfil from './paginas/admin/AdminPerfil'


export default function App() {
  return (
    <Routes>
      
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="categorias" element={<Categorias />} />
        <Route path="produtos" element={<Categorias />} />
        <Route path="produtos/:id" element={<Produto />} />
        <Route path="contato" element={<Contato />} />
        <Route path="login" element={<Login />} />
        <Route path="cadastro" element={<Cadastro />} />
        <Route path="erro" element={<Erro500 />} />

        
        <Route element={<RequireAuth />}>
          <Route path="perfil" element={<Perfil />} />
          <Route path="carrinho" element={<Carrinho />} />
          <Route path="pedido-confirmado" element={<PedidoConfirmado />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>

      {/*Adminastro*/}
      <Route path="admin" element={<AdminLayout />}>
        <Route path="login" element={<AdminLogin />} />
        <Route element={<RequireAdmin />}>
          <Route index element={<AdminInicio />} />
          <Route path="pedidos" element={<AdminPedidos />} />
          <Route path="produtos" element={<AdminProdutos />} />
          <Route path="clientes" element={<AdminClientes />} />
          <Route path="perfil" element={<AdminPerfil />} />
        </Route>
      </Route>
    </Routes>
  )
}
