import { useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { PokemonPage } from './pages/PokemonPage';
import { SearchPage } from './pages/SearchPage';

/** Remember the search-page hash so the detail page's Back link restores the same search. */
function RememberSearchHash() {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname === '/') {
      try {
        sessionStorage.setItem('lastSearchHash', window.location.hash);
      } catch {
        /* storage unavailable: Back link falls back to a fresh search */
      }
    }
  });
  return null;
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <RememberSearchHash />
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="ball" aria-hidden="true" /> Pokédex Search
        </Link>
        <span className="powered">powered by Coveo</span>
      </header>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/pokemon/:slug" element={<PokemonPage />} />
        <Route path="*" element={<SearchPage />} />
      </Routes>
    </BrowserRouter>
  );
}
