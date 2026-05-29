import { LayoutDashboard, UserCheck, Bell } from 'lucide-react';
import { useInView } from '../hooks/useInView';

const steps = [
  {
    number: '01',
    icon: LayoutDashboard,
    title: 'Attivi il modulo dalla tua dashboard Jet HR',
    body: 'Un click, zero burocrazia. Il modulo Salute & Sicurezza appare subito nella tua piattaforma, pronto all\'uso.',
  },
  {
    number: '02',
    icon: UserCheck,
    title: 'Un partner specializzato prende in carico tutto',
    body: 'RSPP esterno, medico competente, formatori certificati: professionisti selezionati da Jet HR che gestiscono ogni adempimento per te.',
  },
  {
    number: '03',
    icon: Bell,
    title: 'Documenti, scadenze e promemoria restano dentro Jet HR',
    body: 'DVR, verbali, attestati, calendari delle visite: tutto centralizzato dove sei già ogni giorno. Zero dimenticanze.',
  },
];

export default function HowItWorks() {
  const [headerRef, headerInView] = useInView();

  return (
    <section id="come-funziona" className="section-pad bg-white">
      <div className="container-xl">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center mb-16 ${headerInView ? 'animate-visible' : 'animate-hidden'}`}
          style={{ transition: 'opacity 0.65s ease-out, transform 0.65s ease-out' }}
        >
          <p className="eyebrow text-brand mb-4">Come funziona</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-navy">
            Tre passi. Poi ci pensiamo noi.
          </h2>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line — desktop only */}
          <div
            className="hidden lg:block absolute top-[52px] left-[calc(16.66%+48px)] right-[calc(16.66%+48px)] h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            aria-hidden="true"
          />

          <div className="grid md:grid-cols-3 gap-10 lg:gap-8">
            {steps.map((step, i) => (
              <StepCard key={step.number} step={step} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCard({ step, index }) {
  const [ref, inView] = useInView();

  return (
    <div
      ref={ref}
      className={`flex flex-col items-center text-center md:items-start md:text-left
                  ${inView ? 'animate-visible' : 'animate-hidden'}`}
      style={{
        transition: 'opacity 0.65s ease-out, transform 0.65s ease-out',
        transitionDelay: inView ? `${index * 150}ms` : '0ms',
      }}
    >
      {/* Number circle + icon */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-2xl bg-brand-tint flex items-center justify-center">
          <step.icon size={32} className="text-brand" />
        </div>
        <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-brand text-white text-xs font-black flex items-center justify-center shadow-brand">
          {step.number.replace('0', '')}
        </span>
      </div>

      {/* Text */}
      <h3 className="text-lg font-bold text-navy mb-3 leading-snug">{step.title}</h3>
      <p className="text-slate-500 leading-relaxed text-[15px]">{step.body}</p>
    </div>
  );
}
