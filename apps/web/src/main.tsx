import React from 'react'
import ReactDOM from 'react-dom/client'
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ExplorePage from './features/explore/ExplorePage'
import VenuePage from './features/explore/VenuePage'
import ShopPage from './features/explore/ShopPage'
import { useT } from './features/explore/i18n'

function App() {
  const { lang } = useT()

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ExplorePage />} />
        <Route path="/venues/:slug" element={<VenuePage />} />
        <Route path="/shops/:slug" element={<ShopPage />} />
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)