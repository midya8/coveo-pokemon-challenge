import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { SearchPage } from './pages/SearchPage';

const PokemonPage = lazy(() => import('./pages/PokemonPage').then((module) => ({ default: module.PokemonPage })));

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
      <a className="skip" href="#results">
        Skip to results
      </a>
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="ball" aria-hidden="true" /> Pokédex Search
        </Link>
        <span className="powered">powered by Coveo</span>
      </header>
      <Suspense fallback={<p className="notice search-page">Loading…</p>}>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/pokemon/:slug" element={<PokemonPage />} />
          <Route path="*" element={<SearchPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
