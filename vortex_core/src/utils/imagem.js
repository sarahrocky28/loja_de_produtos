import { API_URL } from '../api'

// Imagem exibida quando o produto não tem foto (ou a foto não carrega)
export const IMAGEM_PADRAO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
       <rect width="300" height="400" fill="#171717"/>
       <text x="150" y="205" font-family="Arial" font-size="22" font-weight="bold" fill="#35dcee" text-anchor="middle">VORTEX</text>
     </svg>`
  )

// As fotos enviadas pelo admin ficam no Cloudinary e chegam como endereço completo (https://...).
// Nomes antigos (sem https) ficavam numa pasta do servidor e hoje caem na imagem padrão.
export function urlImagem(nome) {
  if (!nome) return IMAGEM_PADRAO
  if (/^https?:\/\//.test(nome)) return nome
  return `${API_URL}/uploads/${nome}`
}

// Use no onError de um <img> para trocar por IMAGEM_PADRAO se a foto falhar
export function aoFalharImagem(e) {
  e.currentTarget.onerror = null
  e.currentTarget.src = IMAGEM_PADRAO
}
