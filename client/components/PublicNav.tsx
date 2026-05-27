"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const NAV_CSS = `
  .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 0 56px; height: 68px; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.97); transition: box-shadow 0.25s; }
  .nav.scrolled { box-shadow: 0 1px 0 #DCE8E8, 0 4px 24px rgba(0,179,169,0.07); }
  .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.4px; color: #1B2A4A; text-decoration: none; display: flex; align-items: center; gap: 9px; }
  .mark { width: 32px; height: 32px; border-radius: 9px; background: #00B3A9; display: flex; align-items: center; justify-content: center; color: white; font-size: 15px; font-weight: 800; flex-shrink: 0; }
  .nav-links { display: flex; align-items: center; gap: 36px; list-style: none; }
  .nav-links a { font-size: 14px; font-weight: 500; color: #4A6A6A; text-decoration: none; transition: color 0.15s; }
  .nav-links a:hover { color: #00B3A9; }
  .nav-end { display: flex; align-items: center; gap: 10px; }
  .btn-o { padding: 9px 20px; background: transparent; border: 1.5px solid #DCE8E8; border-radius: 12px; color: #1B2A4A; font-size: 14px; font-weight: 500; cursor: pointer; text-decoration: none; transition: border-color .15s, color .15s; }
  .btn-o:hover { border-color: #00B3A9; color: #00B3A9; }
  .btn-t { padding: 9px 20px; background: #00B3A9; border: none; border-radius: 12px; color: white; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; transition: background .15s; }
  .btn-t:hover { background: #009991; }
  @media (max-width: 900px) { .nav { padding: 0 20px; } .nav-links { display: none; } }
`;

export default function PublicNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style>{NAV_CSS}</style>
      <nav className={`nav${scrolled ? " scrolled" : ""}`}>
        <Link href="/" className="brand">
          <div className="mark">C</div>contrats_qc
        </Link>
        <ul className="nav-links">
          <li><Link href="/register">Explorateur</Link></li>
          <li><Link href="/pricing">Tarifs</Link></li>
          <li><Link href="/about">À propos</Link></li>
        </ul>
        <div className="nav-end">
          <Link href="/login" className="btn-o">Se connecter</Link>
          <Link href="/register" className="btn-t">S'inscrire gratuitement</Link>
        </div>
      </nav>
    </>
  );
}