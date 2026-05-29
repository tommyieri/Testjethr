import { LayoutDashboard, Star, Database, Banknote } from 'lucide-react';
import { useInView } from '../hooks/useInView';

const reasons = [
  {
    icon: LayoutDashboard,
    title: 'Tutto nella piattaforma che già usi',
    body: 'Non apri un nuovo portale, non scarti un\'altra app. Salute & Sicurezza si aggiunge dove hai già paghe, ferie e cedolini.',
  },
  {
    icon: Star,
    title: 'Partner selezionato, qualità garantita',
    body: 'Jet HR ha scelto il partner dopo una selezione rigorosa. Se qualcosa non va, hai un unico interlocutore: noi.',
  },
  {
    icon: Database,
    title: 'I tuoi dati già nel sistema',
    body: 'Dipendenti, mansioni, sedi: il sistema conosce già la tua azienda. I promemoria sono automatici dal giorno uno, senza reinserire nulla.',
  },
  {
    icon: Banknote,
    title: 'Prezzo chiaro, niente preventivi opachi',
    body: 'Sai esattamente cosa paghi. Nessun preventivo su misura, nessuna sorpresa in fattura, nessuna ora extra da autorizzare.',
  },
];

export default function WhyJetHR() {
  const [headerRef, headerInView] = useInView();

  return (
    <section id="perche-jet-hr" className="section-pad bg-white">
      <div className="container-xl">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left — sticky-ish header */}
          <div
            ref={headerRef}
            className={`lg:sticky lg:top-32 ${headerInView ? 'animate-visible' : 'animate-hidden'}`}
            style={{ transition: 'opacity 0.65s ease-out, transform 0.65s ease-out' }}
          >
            <p className="eyebrow text-brand mb-4">Perché dentro Jet HR</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-navy mb-6 leading-tight">
              Non è solo un servizio esterno. È integrato nel tuo HR.
            </h2>
            <p className="text-lg text-slate-500 leading-relaxed">
              Ci sono decine di consulenti sicurezza sul mercato. La differenza è che con Jet HR
              hai tutto in un unico posto — e i dati parlano da soli.
            </p>

            {/* Mini divider */}
            <div className="mt-10 pt-10 border-t border-slate-100">
              <p className="text-sm font-semibold text-navy uppercase tracking-wider mb-4">
                Già integrato con
              </p>
              <div className="flex flex-wrap gap-3">
                {['Cedolini', 'Presenze', 'Scadenze', 'Documenti'].map((tag) => (
                  <span
                    key={tag}
                    className="text-sm font-medium text-slate-600 bg-slate-100 px-3.5 py-1.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right — reasons list */}
          <ReasonsList />
        </div>
      </div>
    </section>
  );
}

function ReasonsList() {
  return (
    <div className="flex flex-col gap-5">
      {reasons.map((r, i) => (
        <ReasonItem key={r.title} reason={r} index={i} />
      ))}
    </div>
  );
}

function ReasonItem({ reason, index }) {
  const [ref, inView] = useInView();

  return (
    <div
      ref={ref}
      className={`flex gap-5 p-6 rounded-2xl border border-slate-100 hover:border-brand/30 hover:shadow-card transition-all duration-300 group
                  ${inView ? 'animate-visible' : 'animate-hidden'}`}
      style={{
        transition: 'opacity 0.65s ease-out, transform 0.65s ease-out, border-color 0.3s, box-shadow 0.3s',
        transitionDelay: inView ? `${index * 100}ms` : '0ms',
      }}
    >
      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-brand-tint flex items-center justify-center group-hover:bg-brand transition-colors duration-300">
        <reason.icon size={20} className="text-brand group-hover:text-white transition-colors duration-300" />
      </div>
      <div>
        <h3 className="font-semibold text-navy mb-1.5">{reason.title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{reason.body}</p>
      </div>
    </div>
  );
}
