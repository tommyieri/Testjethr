import { Users, CalendarX2, AlertTriangle, Clock3 } from 'lucide-react';
import { useInView } from '../hooks/useInView';

const pains = [
  {
    icon: Users,
    title: 'Fornitori diversi e scollegati',
    body: "Il consulente sicurezza, il medico competente, il formatore. Ognuno per sé: nessuna visione d'insieme, nessun coordinamento.",
  },
  {
    icon: CalendarX2,
    title: 'Scadenze che ti rincorrono',
    body: 'Corsi da rinnovare, visite da prenotare, documenti da aggiornare. Scopri sempre troppo tardi — quando la multa è già arrivata.',
  },
  {
    icon: AlertTriangle,
    title: 'Rischio di sanzioni pesanti',
    body: 'Il D.Lgs. 81/2008 prevede sanzioni fino a 150.000€ e responsabilità penale per il datore. Non è un rischio che si può ignorare.',
  },
  {
    icon: Clock3,
    title: 'Ore perse in adempimenti',
    body: 'Raccogliere documenti, coordinare fornitori, archiviare verbali. Tempo sottratto al tuo business, senza creare nessun valore.',
  },
];

export default function Problem() {
  const [titleRef, titleInView] = useInView();
  const [gridRef, gridInView] = useInView();

  return (
    <section id="problema" className="bg-navy section-pad">
      <div className="container-xl">
        {/* Header */}
        <div
          ref={titleRef}
          className={`text-center mb-14 ${titleInView ? 'animate-visible' : 'animate-hidden'}`}
          style={{ transition: 'opacity 0.65s ease-out, transform 0.65s ease-out' }}
        >
          <p className="eyebrow text-brand mb-4">Odiamo la burocrazia</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight max-w-2xl mx-auto">
            La sicurezza è un obbligo di legge.{' '}
            <span className="text-brand-200">Gestirla, oggi, è un caos.</span>
          </h2>
        </div>

        {/* Pain points grid */}
        <div
          ref={gridRef}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {pains.map((p, i) => (
            <div
              key={p.title}
              className={`rounded-2xl border border-white/8 bg-navy-mid p-7 flex flex-col gap-4
                          hover:border-brand/30 hover:bg-navy-light transition-all duration-300 group
                          ${gridInView ? 'animate-visible' : 'animate-hidden'}`}
              style={{
                transition: 'opacity 0.65s ease-out, transform 0.65s ease-out',
                transitionDelay: gridInView ? `${i * 100}ms` : '0ms',
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-brand/15 flex items-center justify-center group-hover:bg-brand/25 transition-colors">
                <p.icon size={20} className="text-brand-200" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-2">{p.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
