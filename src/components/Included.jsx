import {
  FileText,
  ShieldCheck,
  GraduationCap,
  HeartPulse,
  CalendarCheck,
  Receipt,
} from 'lucide-react';
import { useInView } from '../hooks/useInView';

const features = [
  {
    icon: FileText,
    title: 'Documento di Valutazione dei Rischi (DVR)',
    body: 'Redazione, aggiornamento e conservazione del DVR, obbligatorio per tutte le aziende.',
  },
  {
    icon: ShieldCheck,
    title: 'RSPP Esterno',
    body: 'Responsabile del Servizio di Prevenzione e Protezione qualificato, nominato e operativo da subito.',
  },
  {
    icon: GraduationCap,
    title: 'Formazione obbligatoria',
    body: 'Tutti i livelli di rischio: formazione generale, specifica e per preposti/dirigenti conforme all\'Accordo Stato-Regioni.',
  },
  {
    icon: HeartPulse,
    title: 'Medico Competente e sorveglianza sanitaria',
    body: 'Visite mediche periodiche, idoneità alla mansione, cartelle sanitarie in piena conformità.',
  },
  {
    icon: CalendarCheck,
    title: 'Scadenze e promemoria automatici',
    body: 'Nessuna scadenza dimenticata: il sistema ti avvisa in anticipo per ogni rinnovo, visita o aggiornamento.',
  },
  {
    icon: Receipt,
    title: 'Un unico referente, un\'unica fattura',
    body: 'Niente fornitori multipli da coordinare. Un interlocutore, una rendicontazione chiara, zero sorprese.',
  },
];

function FeatureCard({ feature, index }) {
  const [ref, inView] = useInView();

  return (
    <div
      ref={ref}
      className={`card group ${inView ? 'animate-visible' : 'animate-hidden'}`}
      style={{
        transition: 'opacity 0.65s ease-out, transform 0.65s ease-out, box-shadow 0.3s ease',
        transitionDelay: inView ? `${index * 80}ms` : '0ms',
      }}
    >
      <div className="w-12 h-12 rounded-xl bg-brand-tint flex items-center justify-center mb-5 group-hover:bg-brand group-hover:scale-105 transition-all duration-300">
        <feature.icon size={22} className="text-brand group-hover:text-white transition-colors duration-300" />
      </div>
      <h3 className="text-base font-semibold text-navy mb-2 leading-snug">{feature.title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{feature.body}</p>
    </div>
  );
}

export default function Included() {
  const [headerRef, headerInView] = useInView();

  return (
    <section id="cosa-include" className="section-pad bg-slate-50">
      <div className="container-xl">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center mb-14 ${headerInView ? 'animate-visible' : 'animate-hidden'}`}
          style={{ transition: 'opacity 0.65s ease-out, transform 0.65s ease-out' }}
        >
          <p className="eyebrow text-brand mb-4">Tutto incluso</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-navy">
            Cosa è compreso nel modulo
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
            Nessun extra nascosto. Ogni adempimento previsto dal D.Lgs. 81/2008 è coperto.
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
