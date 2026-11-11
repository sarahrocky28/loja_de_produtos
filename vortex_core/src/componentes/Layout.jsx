import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import ErrorBoundary from './ErrorBoundary'
import RolarParaTopo from './RolarParaTopo'

export default function Layout() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900">
      <RolarParaTopo />
      <Header />
      <main className="flex-1 bg-black">
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}
