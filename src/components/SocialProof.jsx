import { ShieldCheck, Lock } from 'lucide-react';
import { useInView } from '../hooks/useInView';

const stats = [
  {
    value: '61',
    label: 'NPS score',
    detail: 'Clienti che ci raccomanderebbero',
    suffix: '',
  },
  {
    value: '1h',
    label: 'Tempo medio di risposta',
    detail: 'Dal nostro team di supporto',
    suffix: '',
  },
  {
    value: '90%',
    label: 'Meno burocrazia',
    detail: 'Tempo risparmiato in adempimenti',
    suffix: '',
  },
];

const badges = [
  { icon: ShieldCheck, label: 'GDPR Compliant' },
  { icon: Lock, label: 'ISO 27001' },
];

export default function SocialProof() {
  const [ref, inView] = useInView();

  return (
    <section className="section-pad bg-brand">
      <div className="container-xl">
        <div
          ref={ref}
          className={`text-center mb-14 ${inView ? 'animate-visible' : 'animate-hidden'}`}
          style={{ transition: 'opacity 0.65s ease-out, transform 0.65s ease-out' }}
        >
          <p className="eyebrow text-brand-200 mb-4">I numeri parlano chiaro</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Non chiedeteci fiducia. Chiedetela ai nostri clienti.
          </h2>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {stats.map((s, i) => (
            <StatCard key={s.label} stat={s} index={i} />
          ))}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap justify-center gap-4">
          {badges.map((b) => (
            <div
              key={b.label}
              className="flex items-center gap-2.5 bg-white/10 border border-white/20 rounded-full px-5 py-2.5"
            >
              <b.icon size={16} className="text-white" />
              <span className="text-sm font-semibold text-white">{b.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2.5 bg-white/10 border border-white/20 rounded-full px-5 py-2.5">
            <span className="text-sm font-semibold text-white">🇮🇹 Made in Italy</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ stat, index }) {
  const [ref, inView] = useInView();

  return (
    <div
      ref={ref}
      className={`text-center p-8 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/15 transition-colors
                  ${inView ? 'animate-visible' : 'animate-hidden'}`}
      style={{
        transition: 'opacity 0.65s ease-out, transform 0.65s ease-out, background-color 0.3s',
        transitionDelay: inView ? `${index * 120}ms` : '0ms',
      }}
    >
      <p className="text-5xl font-black text-white mb-2 tracking-tight">
        {stat.value}
        {stat.suffix}
      </p>
      <p className="text-base font-semibold text-white/90 mb-1">{stat.label}</p>
      <p className="text-sm text-white/60">{stat.detail}</p>
    </div>
  );
}
