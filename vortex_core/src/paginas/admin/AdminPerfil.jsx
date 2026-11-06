import { useNavigate } from 'react-router-dom'
import { FiUser } from 'react-icons/fi'
import { useAuth } from '../../contexts/AuthContext'
import { cartaoClasse } from '../../estilos'

export default function AdminPerfil() {
  const { usuario, sair } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <h1 className="text-2xl font-extrabold uppercase">Seu perfil</h1>
      <div className={`${cartaoClasse} mt-4 flex items-start gap-4`}>
        <FiUser className="mt-1 text-4xl text-[#35dcee]" />
        <div className="text-sm">
          <p className="text-lg font-extrabold uppercase">{usuario.nome}</p>
          <p className="mt-2 text-white/60">E-mail</p>
          <p>{usuario.email}</p>
          <p className="mt-2 text-white/60">Senha</p>
          <p>••••••••</p>
          <p className="mt-2 text-white/60">Privilégios</p>
          <p>Administrador</p>
          <button type="button" onClick={() => { sair(); navigate('/admin/login') }} className="mt-4 rounded border border-white/30 px-4 py-2 text-xs font-bold uppercase hover:border-[#35dcee]">Sair</button>
        </div>
      </div>
    </div>
  )
}
