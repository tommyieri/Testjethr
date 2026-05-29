export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy section-pad" role="contentinfo">
      <div className="container-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-10 border-b border-white/10">
          {/* Wordmark + tagline */}
          <div>
            <div className="flex items-center mb-2">
              <span className="text-2xl font-black tracking-tight text-brand">Jet</span>
              <span className="text-2xl font-black tracking-tight text-white ml-[2px]">HR</span>
            </div>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
              Software HR + payroll con un Consulente del Lavoro Partner dedicato. Tutto in un unico
              posto.
            </p>
          </div>

          {/* Links */}
          <nav aria-label="Link footer" className="flex flex-wrap gap-6">
            {[
              { label: 'Come funziona', href: '#come-funziona' },
              { label: 'Cosa include', href: '#cosa-include' },
              { label: 'Perché Jet HR', href: '#perche-jet-hr' },
              { label: 'Prenota una call', href: '#cta' },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex flex-wrap gap-4">
            <span>© {year} Jet HR S.r.l.</span>
            <span>P.IVA IT12345678901</span>
          </div>
          <p className="italic">Prototipo a scopo dimostrativo — non rappresenta un'offerta commerciale definitiva.</p>
        </div>
      </div>
    </footer>
  );
}
