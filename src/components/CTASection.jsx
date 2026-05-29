import { useState } from 'react';
import { Send, CheckCircle2, Calendar } from 'lucide-react';
import { useInView } from '../hooks/useInView';

// ─────────────────────────────────────────────────────────────
// TODO: sostituire con il tuo ID Formspree reale
const FORMSPREE_ID = 'YOUR_FORMSPREE_ID';
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// TODO: sostituire con il tuo URL Calendly reale
const CALENDLY_URL = 'https://calendly.com/YOUR_CALENDLY_URL';
// ─────────────────────────────────────────────────────────────

const sizeOptions = [
  '1–5 dipendenti',
  '6–15 dipendenti',
  '16–50 dipendenti',
  '51–200 dipendenti',
  '200+ dipendenti',
];

export default function CTASection() {
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [headerRef, headerInView] = useInView();

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    const data = new FormData(e.target);
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section id="cta" className="section-pad bg-brand-tint">
      <div className="container-xl">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center mb-14 ${headerInView ? 'animate-visible' : 'animate-hidden'}`}
          style={{ transition: 'opacity 0.65s ease-out, transform 0.65s ease-out' }}
        >
          <p className="eyebrow text-brand mb-4">Inizia oggi</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-navy">
            Ti interessa? Parliamone 15 minuti.
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-lg mx-auto">
            Nessun impegno, nessuna pressione. Capiamo la tua situazione e ti diciamo se il modulo
            fa per te.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-start max-w-4xl mx-auto">
          {/* Form */}
          <FormCard status={status} onSubmit={handleSubmit} />

          {/* Calendly placeholder */}
          <CalendlyCard />
        </div>
      </div>
    </section>
  );
}

function FormCard({ status, onSubmit }) {
  const [ref, inView] = useInView();

  return (
    <div
      ref={ref}
      className={`card ${inView ? 'animate-visible' : 'animate-hidden'}`}
      style={{ transition: 'opacity 0.65s ease-out, transform 0.65s ease-out' }}
    >
      {status === 'sent' ? (
        <div className="flex flex-col items-center text-center py-8 gap-4">
          <CheckCircle2 size={48} className="text-emerald-500" />
          <h3 className="text-xl font-bold text-navy">Richiesta ricevuta!</h3>
          <p className="text-slate-500">
            Ti contatteremo entro 1 ora lavorativa. Nel frattempo puoi prenotare direttamente una
            call qui a fianco.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
          <h3 className="text-lg font-bold text-navy">Lascia i tuoi dati</h3>

          <Field id="nome" label="Nome e cognome" type="text" name="nome" required />
          <Field id="azienda" label="Nome azienda" type="text" name="azienda" required />
          <Field id="email" label="Email aziendale" type="email" name="email" required />

          {/* Select */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dipendenti" className="text-sm font-medium text-navy">
              Numero di dipendenti
            </label>
            <select
              id="dipendenti"
              name="dipendenti"
              required
              defaultValue=""
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-navy
                         focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent
                         transition-shadow appearance-none cursor-pointer"
            >
              <option value="" disabled>
                Seleziona…
              </option>
              {sizeOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          {/* Privacy */}
          <p className="text-xs text-slate-400 leading-relaxed">
            Inviando il modulo accetti la nostra{' '}
            <span className="underline cursor-pointer hover:text-brand transition-colors">
              Privacy Policy
            </span>
            . I dati saranno trattati ai sensi del Reg. UE 2016/679 (GDPR).
          </p>

          <button
            type="submit"
            disabled={status === 'sending'}
            className="btn-primary justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === 'sending' ? (
              'Invio in corso…'
            ) : (
              <>
                Invia richiesta
                <Send size={16} />
              </>
            )}
          </button>

          {status === 'error' && (
            <p className="text-sm text-red-500 text-center">
              Qualcosa è andato storto. Prova di nuovo o scrivici direttamente.
            </p>
          )}
        </form>
      )}
    </div>
  );
}

function Field({ id, label, type, name, required }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-navy">
        {label}
        {required && <span className="text-brand ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        name={name}
        required={required}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-navy
                   placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand
                   focus:border-transparent transition-shadow"
        placeholder={label}
      />
    </div>
  );
}

function CalendlyCard() {
  const [ref, inView] = useInView();

  return (
    <div
      ref={ref}
      className={`card flex flex-col gap-5 ${inView ? 'animate-visible' : 'animate-hidden'}`}
      style={{
        transition: 'opacity 0.65s ease-out, transform 0.65s ease-out',
        transitionDelay: inView ? '150ms' : '0ms',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-tint flex items-center justify-center">
          <Calendar size={20} className="text-brand" />
        </div>
        <div>
          <h3 className="text-base font-bold text-navy leading-tight">Prenota una call</h3>
          <p className="text-xs text-slate-400">15 minuti, senza impegno</p>
        </div>
      </div>

      <p className="text-sm text-slate-500 leading-relaxed">
        Preferisci scegliere tu il momento? Prenota direttamente un slot nel calendario del nostro
        team.
      </p>

      {/* Calendly embed placeholder */}
      <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 min-h-[280px] flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Calendar size={32} className="text-slate-300" />
        <p className="text-sm font-semibold text-slate-400">Embed Calendly</p>
        <code className="text-xs text-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-mono break-all">
          {CALENDLY_URL}
        </code>
        <p className="text-xs text-slate-400">
          Sostituisci <strong>CALENDLY_URL</strong> in CTASection.jsx per attivare l'embed.
        </p>
      </div>
    </div>
  );
}
