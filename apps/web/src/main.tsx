import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import ExplorePage from './features/explore/ExplorePage'
import VenuePage from './features/explore/VenuePage'
import ShopPage from './features/explore/ShopPage'

function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <nav style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <Link to="/">Басты бет (Explore)</Link>
        </nav>
        <Routes>
          <Route path="/" element={<ExplorePage />} />
          <Route path="/venues/:slug" element={<VenuePage />} />
          <Route path="/shops/:slug" element={<ShopPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)