import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Come funziona', href: '#come-funziona' },
  { label: 'Cosa include', href: '#cosa-include' },
  { label: 'Perché Jet HR', href: '#perche-jet-hr' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleNavClick = () => setOpen(false);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-sm shadow-[0_1px_12px_rgba(10,22,40,0.08)]'
          : 'bg-white/0'
      }`}
    >
      <nav className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <a href="#top" className="flex items-center select-none" aria-label="Jet HR">
          <span className="text-xl font-black tracking-tight text-brand">Jet</span>
          <span className="text-xl font-black tracking-tight text-navy ml-[2px]">HR</span>
          <span className="ml-2.5 text-[10px] font-semibold tracking-widest uppercase text-brand bg-brand-tint px-2 py-0.5 rounded-full">
            Beta
          </span>
        </a>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-sm font-medium text-slate-600 hover:text-navy transition-colors"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-4">
          <a href="#cta" className="btn-primary text-sm px-5 py-2.5">
            Prenota una call
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-navy hover:bg-slate-100 transition-colors"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Chiudi menu' : 'Apri menu'}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 pb-6 pt-4 shadow-lg">
          <ul className="flex flex-col gap-1 mb-5">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={handleNavClick}
                  className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:text-brand hover:bg-brand-tint rounded-lg transition-colors"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <a href="#cta" onClick={handleNavClick} className="btn-primary w-full justify-center text-sm">
            Prenota una call
          </a>
        </div>
      )}
    </header>
  );
}
