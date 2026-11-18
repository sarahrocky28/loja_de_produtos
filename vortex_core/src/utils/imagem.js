
import { API_URL } from '../api'

export const IMAGEM_PADRAO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
      <rect width="300" height="400" fill="#171717"/>
      <text x="150" y="205" font-family="Arial" font-size="22" font-weight="bold" fill="#35dcee" text-anchor="middle">VORTEX</text>
    </svg>`
  )

export function urlImagem(nome) {
  if (!nome) return IMAGEM_PADRAO

  // Se já for uma URL completa, usa diretamente (Cloudinary)
  if (/^https?:\/\//i.test(nome)) {
    return nome
  }

  // Mantém compatibilidade com imagens antigas armazenadas localmente
  return `${API_URL}/uploads/${nome}`
}

export function aoFalharImagem(e) {
  e.currentTarget.onerror = null
  e.currentTarget.src = IMAGEM_PADRAO
}
