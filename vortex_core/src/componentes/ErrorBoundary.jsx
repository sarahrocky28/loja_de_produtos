import { Component } from 'react'
import Erro500 from './Erro500'

export default class ErrorBoundary extends Component {
  state = { erro: false }

  static getDerivedStateFromError() {
    return { erro: true }
  }cidade

  componentDidCatch(erro) {
    console.error(erro)
  }

  render() {
    if (this.state.erro) return <Erro500 onRetry={() => (window.location.href = '/')} />
    return this.props.children
  }
}
