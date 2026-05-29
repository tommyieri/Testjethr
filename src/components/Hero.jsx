import { ArrowRight, ChevronDown, CheckCircle2 } from 'lucide-react';

function DashboardMockup() {
  const items = [
    { label: 'DVR aggiornato', status: 'ok', date: 'Scad. 12 mar 2026' },
    { label: 'Formazione base', status: 'ok', date: 'Completata' },
    { label: 'Visita medica — M. Rossi', status: 'warn', date: 'Scad. 28 giu 2025' },
    { label: 'Nomina RSPP esterno', status: 'ok', date: 'Attivo' },
  ];

  return (
    <div
      className="relative w-full max-w-sm mx-auto lg:mx-0"
      aria-hidden="true"
    >
      {/* Glow */}
      <div className="absolute inset-0 -m-8 rounded-3xl bg-gradient-to-br from-brand/10 to-transparent blur-3xl pointer-events-none" />

      {/* Card */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-card-hover overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <span className="text-xs font-bold text-navy">Salute &amp; Sicurezza</span>
          <span className="ml-auto text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            Attivo
          </span>
        </div>

        {/* Items */}
        <ul className="divide-y divide-slate-50">
          {items.map((item) => (
            <li key={item.label} className="flex items-center gap-3 px-5 py-3.5">
              <span
                className={`flex-shrink-0 w-2 h-2 rounded-full ${
                  item.status === 'ok' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-navy truncate">{item.label}</p>
                <p className="text-[11px] text-slate-400">{item.date}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
          <span className="text-[11px] text-slate-500">4 adempimenti gestiti dal partner</span>
          <span className="ml-auto text-[11px] font-semibold text-brand cursor-pointer hover:underline">
            Dettagli →
          </span>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -bottom-4 -left-4 bg-white rounded-xl border border-slate-200 shadow-card px-3.5 py-2.5 flex items-center gap-2">
        <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
        <span className="text-[12px] font-semibold text-navy">Zero sanzioni</span>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section
      id="top"
      className="relative min-h-screen flex flex-col justify-center pt-16 overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 70% 20%, #DCE7FF 0%, transparent 55%), #FFFFFF',
      }}
    >
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(30,80,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(30,80,255,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
          {/* Text column */}
          <div className="text-center lg:text-left">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-tint rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              <span className="text-[11px] font-semibold tracking-widest uppercase text-brand">
                Nuovo · Salute e sicurezza sul lavoro
              </span>
            </div>

            {/* H1 */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-navy leading-[1.05] mb-6">
              La sicurezza sul lavoro,{' '}
              <span className="text-brand">finalmente senza pensieri.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-slate-600 leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0">
              Dalla valutazione dei rischi alla formazione, dal medico competente alla sorveglianza
              sanitaria: tutti gli adempimenti del{' '}
              <span className="font-semibold text-navy">D.Lgs. 81/2008</span> gestiti da un
              partner specializzato, dentro la piattaforma che usi già.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
              <a href="#cta" className="btn-primary">
                Prenota una call
                <ArrowRight size={17} />
              </a>
              <a href="#come-funziona" className="btn-secondary">
                Scopri come funziona
              </a>
            </div>

            {/* Trust line */}
            <div className="flex items-center justify-center lg:justify-start gap-3 text-sm text-slate-500">
              <div className="flex -space-x-1.5" aria-hidden="true">
                {['#1E50FF', '#0EA5E9', '#8B5CF6', '#10B981'].map((bg, i) => (
                  <span
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold"
                    style={{ backgroundColor: bg }}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                ))}
              </div>
              <span>
                Già scelta da <strong className="text-navy">più di 1.000 aziende italiane</strong>.
              </span>
            </div>
          </div>

          {/* Visual column */}
          <div className="flex justify-center lg:justify-end">
            <DashboardMockup />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <a
        href="#problema"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-400 hover:text-brand transition-colors"
        aria-label="Scorri verso il basso"
      >
        <span className="text-[11px] font-medium tracking-wide uppercase">Scopri</span>
        <ChevronDown size={18} className="animate-bounce" />
      </a>
    </section>
  );
}
