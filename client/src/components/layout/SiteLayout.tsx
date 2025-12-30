import { Outlet } from 'react-router-dom'
import NavBar from '../navigation/NavBar'
import Footer from './Footer'

const SiteLayout = () => (
  <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1f2937_0%,#05060a_55%)] text-white">
    <NavBar />
    <main className="mx-auto min-h-[70vh] max-w-6xl px-6 py-12">
      <Outlet />
    </main>
    <Footer />
  </div>
)

export default SiteLayout

