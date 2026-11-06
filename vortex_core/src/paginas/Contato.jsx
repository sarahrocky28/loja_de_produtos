import { useState } from 'react'
import { api } from '../api'
import Campo from '../componentes/Campo'
import { botaoTealClasse, inputClasse, labelClasse, paginaClasse } from '../estilos'

export default function Contato() {
  const [form, setForm] = useState({ nome: '', email: '', mensagem: '' })
  const [estado, setEstado] = useState({ enviando: false, ok: false, erro: '' })
  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setEstado({ enviando: true, ok: false, erro: '' })
    try {
      await api('/contato', { method: 'POST', corpo: form })
      setForm({ nome: '', email: '', mensagem: '' })
      setEstado({ enviando: false, ok: true, erro: '' })
    } catch (err) {
      setEstado({ enviando: false, ok: false, erro: err.message })
    }
  }

  return (
    <div className={paginaClasse}>
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <p className="text-xs uppercase text-white/70">Vortex Core / Contato</p>
        <div className="mt-4 grid gap-10 md:grid-cols-2">
          <form onSubmit={enviar} className="space-y-4">
            <h1 className="text-2xl font-extrabold uppercase">Fale conosco!</h1>
            <Campo label="Nome" value={form.nome} onChange={set('nome')} required />
            <Campo label="E-mail" type="email" value={form.email} onChange={set('email')} required />
            <label className="block">
              <span className={labelClasse}>Mensagem</span>
              <textarea rows={5} className={inputClasse} value={form.mensagem} onChange={set('mensagem')} required />
            </label>
            {estado.erro && <p className="text-sm text-red-400">{estado.erro}</p>}
            {estado.ok && <p className="text-sm text-[#35dcee]">Mensagem enviada! Responderemos em breve.</p>}
            <button type="submit" disabled={estado.enviando} className={botaoTealClasse}>
              {estado.enviando ? 'Enviando...' : 'Enviar'}
            </button>
          </form>

          <div>
            <iframe
              title="Mapa"
              className="h-64 w-full rounded border border-white/20 md:h-72"
              src="https://www.openstreetmap.org/export/embed.html?bbox=-46.66%2C-23.57%2C-46.63%2C-23.55&layer=mapnik"
            />
            <p className="mt-4 text-sm font-bold uppercase">R. Vortex, 000 - Core - SP</p>
          </div>
        </div>
      </div>
    </div>
  )
}
