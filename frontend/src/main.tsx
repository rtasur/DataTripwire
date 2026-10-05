import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">CIPHER · Cybersecurity & Digital Trust</p>
        <h1>DataTripwire</h1>
        <p className="tagline">A valid login should never become unlimited trust.</p>
        <div className="cards">
          <article><h2>WorkSphere</h2><p>Business responsibility context.</p></article>
          <article><h2>DataTripwire</h2><p>Continuous trust and security decisions.</p></article>
          <article><h2>SOC</h2><p>Investigation and response console.</p></article>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
