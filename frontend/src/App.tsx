import { BrowserRouter, Routes, Route } from 'react-router-dom'
import VigilanteSesion from './components/VigilanteSesion'
import BarraNavegacion from './components/BarraNavegacion'
import RutaPrivada from './components/RutaPrivada'
import Inicio from './pages/Inicio'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Admin from './pages/Admin'
import MisOfertas from './pages/MisOfertas'
import BuscarTutores from './pages/BuscarTutores'
import Disponibilidad from './pages/Disponibilidad'
import Calendario from './pages/Calendario'
import Suspendido from './pages/Suspendido'
import Politicas from './pages/Politicas'

function App() {
  return (
    <BrowserRouter>
      <VigilanteSesion />
      <BarraNavegacion />
      <Routes>
        <Route path="/" element={<RutaPrivada><Inicio /></RutaPrivada>} />
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/suspendido" element={<Suspendido />} />
        <Route path="/politicas" element={<Politicas />} />
        <Route path="/admin" element={<RutaPrivada roles={['admin']}><Admin /></RutaPrivada>} />
        <Route path="/ofertas" element={<RutaPrivada roles={['tutor', 'admin']}><MisOfertas /></RutaPrivada>} />
        <Route path="/disponibilidad" element={<RutaPrivada roles={['tutor', 'admin']}><Disponibilidad /></RutaPrivada>} />
        <Route path="/buscar" element={<RutaPrivada roles={['estudiante', 'admin']}><BuscarTutores /></RutaPrivada>} />
        <Route path="/calendario" element={<RutaPrivada><Calendario /></RutaPrivada>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App