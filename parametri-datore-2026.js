"use strict";
/* ============================================================================
 * PARAMETRI DEL COSTO DEL LAVORO LATO AZIENDA — anno 2026
 *
 * Stesso patto di parametri-2026.js: qui dentro ci sono SOLO dati, nessuna
 * formula e nessuna decisione. Ogni valore porta la sua fonte e, novità
 * rispetto al file lato dipendente, il proprio LIVELLO DI CONFIDENZA.
 *
 * Perché la confidenza è un campo di prima classe.
 * ---------------------------------------------------------------------------
 * Lato dipendente i parametri stanno quasi tutti nel TUIR e nelle circolari
 * INPS: un numero, una norma, fine. Lato datore no. L'aliquota contributiva
 * complessiva a carico dell'azienda dipende da CCNL, settore, dimensione,
 * inquadramento e persino dalla singola posizione INPS; il tasso INAIL dipende
 * dalla lavorazione. Non esiste "l'aliquota datore 2026": esiste l'aliquota di
 * quella azienda.
 *
 * Un motore di cost saving che finge il contrario produce numeri autorevoli e
 * sbagliati. Quindi ogni parametro dichiara se è:
 *   'certa'      — valore di legge, univoco, non negoziabile
 *   'tipica'     — valore di mercato ricorrente, ma da confermare sul DM10/UniEmens
 *   'daVerificare' — ordine di grandezza, va sempre sostituito col dato reale
 *
 * L'interfaccia mostra questo campo. Chi legge un risultato sa quanto fidarsi
 * di ogni pezzo, e sa esattamente quale dato chiedere al consulente del lavoro
 * per passare da stima a certezza.
 * ==========================================================================*/

globalThis.PARAMETRI_DATORE_2026 = (() => {

  const ANNO = 2026;

  /* --------------------------------------------------------------------------
   * CONTRIBUZIONE A CARICO DEL DATORE
   *
   * La quota IVS (invalidità, vecchiaia, superstiti) è il pezzo grande e
   * certo: l'aliquota complessiva è il 33%, di cui 9,19% trattenuto al
   * lavoratore e 23,81% a carico dell'azienda.
   *
   * Sopra l'IVS si stratificano le "altre voci": NASpI, CIG/CIGS, malattia,
   * maternità, ANF/CUAF, fondo di garanzia TFR. Il loro totale è ciò che fa
   * variare l'aliquota datore fra un settore e l'altro, ed è la parte che va
   * confermata sul cedolino reale.
   * ------------------------------------------------------------------------*/
  const CONTRIBUTI_DATORE = {
    /** Quota IVS a carico azienda. Speculare al 9,19% del lavoratore.
     *  Fonte: aliquote contributive INPS 2026 — aliquota complessiva 33%. */
    ivs: 0.2381,
    ivsConfidenza: "certa",

    /** Massimale annuo della base pensionabile: oltre non si versa IVS.
     *  Vale per gli iscritti privi di anzianità contributiva al 31/12/1995.
     *  Speculare al massimale usato lato dipendente in parametri-2026.js.
     *  Fonte: circolare INPS minimali e massimali 2026. */
    massimaleAnnuo: 120607,
    massimaleConfidenza: "certa",

    /** Preset di aliquota datore COMPLESSIVA per settore, IVS inclusa.
     *  Sono valori tipici, non di legge: l'aliquota vera si legge sul flusso
     *  UniEmens dell'azienda. L'interfaccia li propone come punto di partenza
     *  e lascia sempre il campo modificabile.
     *  Fonte: aliquote contributive INPS 2026, valori di settore ricorrenti. */
    settori: {
      industria: {
        label: "Industria",
        aliquota: 0.3000,
        confidenza: "tipica",
        nota: "Include CIGO/CIGS. Sopra i 15 dipendenti la CIGS pesa di più."
      },
      commercio: {
        label: "Commercio e terziario",
        aliquota: 0.3038,
        confidenza: "tipica",
        nota: "Aliquota tipica del terziario, leggermente sopra l'industria."
      },
      artigianato: {
        label: "Artigianato",
        aliquota: 0.2870,
        confidenza: "daVerificare",
        nota: "Assenza di CIGO ordinaria: aliquota generalmente più bassa."
      },
      studiProfessionali: {
        label: "Studi professionali e servizi",
        aliquota: 0.2940,
        confidenza: "daVerificare",
        nota: "Molto sensibile al fondo di integrazione salariale applicato."
      }
    },

    /** Composizione indicativa della differenza fra aliquota complessiva e
     *  IVS. Serve a spiegare in pagina da dove viene il numero, non a
     *  calcolarlo: il calcolo usa l'aliquota complessiva.
     *  Fonte: voci contributive standard del settore privato. */
    composizioneAltreVoci: [
      { voce: "NASpI (assicurazione sociale per l'impiego)", aliquota: 0.0161 },
      { voce: "CIG / CIGS / fondi di integrazione salariale", aliquota: 0.0090 },
      { voce: "Malattia e maternità", aliquota: 0.0268 },
      { voce: "Fondo di garanzia TFR", aliquota: 0.0020 },
      { voce: "Altre minori (CUAF e assimilate)", aliquota: 0.0080 }
    ],
    composizioneConfidenza: "daVerificare",

    /** Contributo addizionale sui rapporti a tempo determinato, a carico del
     *  datore. Si aggiunge all'aliquota ordinaria e viene restituito in caso
     *  di trasformazione a tempo indeterminato.
     *  Fonte: art. 2 co. 28 L. 92/2012, come modificato. */
    addizionaleTempoDeterminato: 0.0140,
    addizionaleTempoDeterminatoConfidenza: "certa",

    /** Incremento dell'addizionale a ogni rinnovo del contratto a termine.
     *  Fonte: art. 3 co. 2 DL 87/2018 (decreto dignità). */
    incrementoPerRinnovo: 0.0050,
    incrementoPerRinnovoConfidenza: "certa"
  };

  /* --------------------------------------------------------------------------
   * APPRENDISTATO PROFESSIONALIZZANTE
   *
   * Non è un'agevolazione che si somma: è un regime contributivo sostitutivo.
   * Per questo sta qui fra i parametri di costo e non nel ruleset delle
   * agevolazioni — modellarlo come "sconto" porterebbe a sommarlo per errore
   * agli esoneri, che invece si applicano su una base già ridotta o non si
   * applicano affatto.
   * ------------------------------------------------------------------------*/
  const APPRENDISTATO = {
    /** Aliquota a carico del datore per aziende oltre i 9 dipendenti:
     *  10% + 1,61% di contributo NASpI.
     *  Fonte: disciplina dell'apprendistato professionalizzante; L. 92/2012. */
    aliquotaStandard: 0.1161,
    confidenza: "tipica",

    /** Aziende fino a 9 dipendenti: aliquota ridotta nei primi due anni.
     *  1,5% il primo anno, 3% il secondo, 10% dal terzo — sempre +1,61%.
     *  Fonte: art. 1 co. 773 L. 296/2006; prassi INPS. */
    microImprese: {
      sogliaDipendenti: 9,
      anno1: 0.0311,
      anno2: 0.0461,
      dalTerzoAnno: 0.1161
    },

    /** Aliquota a carico dell'apprendista: 5,84% anziché 9,19%.
     *  Coerente con CONTRIBUTI.aliquotaApprendista di parametri-2026.js. */
    aliquotaLavoratore: 0.0584,

    /** Alla conferma in servizio il regime agevolato prosegue per 12 mesi.
     *  È la coda che quasi nessun calcolatore modella, e vale un anno intero
     *  di risparmio già maturato.
     *  Fonte: art. 47 co. 7 D.Lgs. 81/2015. */
    mesiCodaDopoConferma: 12,

    /** Durata massima ordinaria dell'apprendistato professionalizzante.
     *  Fonte: art. 44 D.Lgs. 81/2015; rinvio alla contrattazione collettiva. */
    durataMassimaMesi: 36
  };

  /* --------------------------------------------------------------------------
   * INAIL
   *
   * Il tasso dipende dalla lavorazione svolta, non dal contratto. Va da poche
   * unità per mille per il lavoro d'ufficio a oltre il 10% per le lavorazioni
   * più rischiose. Nessun default può essere corretto per tutti: si offre una
   * scala di esempi e si lascia il campo aperto.
   * Fonte: tariffe dei premi INAIL.
   * ------------------------------------------------------------------------*/
  const INAIL = {
    tassoDefault: 0.0050,
    confidenza: "daVerificare",
    esempi: [
      { label: "Uffici e attività amministrative", tasso: 0.0040 },
      { label: "Commercio e servizi", tasso: 0.0070 },
      { label: "Informatica e consulenza", tasso: 0.0050 },
      { label: "Industria manifatturiera leggera", tasso: 0.0250 },
      { label: "Edilizia e lavorazioni pesanti", tasso: 0.0800 }
    ],
    nota: "Il premio INAIL non è quasi mai oggetto di esonero: gli esoneri " +
          "contributivi 2026 lo escludono espressamente. È quindi il pavimento " +
          "sotto cui il costo del lavoro non scende."
  };

  /* --------------------------------------------------------------------------
   * TFR
   *
   * La quota annua è la retribuzione utile divisa 13,5 (7,4074%). Di questa,
   * lo 0,50% della retribuzione va all'INPS come contributo aggiuntivo IVS e
   * viene detratto dall'accantonamento: al lavoratore restano 6,91%.
   *
   * Per l'azienda il costo è comunque il 7,41%: cambia solo dove finiscono i
   * soldi, non quanti ne escono. È una distinzione che sposta la cassa e non
   * il conto economico, ed è il tipo di dettaglio su cui i calcolatori
   * generalisti sbagliano.
   * Fonte: art. 2120 c.c.; art. 3 co. 15 L. 297/1982.
   * ------------------------------------------------------------------------*/
  const TFR = {
    divisore: 13.5,
    quotaAnnua: 1 / 13.5,
    contributoFondoPensioni: 0.0050,
    confidenza: "certa",
    sogliaFondoTesoreria: 50,
    nota: "Dai 50 dipendenti in su il TFR maturando va al Fondo di Tesoreria " +
          "INPS: esce di cassa ogni mese invece di restare in azienda. Il " +
          "costo è identico, la liquidità no."
  };

  /* --------------------------------------------------------------------------
   * CANALI DI RETRIBUZIONE ALTERNATIVI ALLA RAL
   *
   * Il cuore del ragionamento di cost saving, e la parte che la letteratura
   * sugli "incentivi all'assunzione" ignora del tutto.
   *
   * Dare valore a una persona costa all'azienda in modo molto diverso a
   * seconda del canale. Un euro di aumento in busta arriva al lavoratore
   * decurtato di contributi e IRPEF; un euro di fringe benefit sotto soglia
   * arriva intero. A parità di euro spesi dall'azienda, il valore percepito
   * cambia anche del doppio.
   *
   * Questi parametri servono a misurare quel divario.
   * ------------------------------------------------------------------------*/
  const CANALI_RETRIBUZIONE = {
    /** Fringe benefit: soglia di esenzione, con la nota regola del cliff.
     *  Superata anche di un euro, diventa imponibile l'intero importo.
     *  Confermata dalla legge di bilancio 2026 per il triennio 2025-2027.
     *  Fonte: art. 51 co. 3 TUIR; L. 207/2024. */
    fringeBenefit: {
      sogliaBase: 1000,
      sogliaConFigli: 2000,
      confidenza: "certa",
      contributi: false,
      irpef: false,
      nota: "Sotto soglia: nessun contributo, nessuna IRPEF, né per l'azienda " +
            "né per il lavoratore. È il canale a efficienza massima. Sopra " +
            "soglia diventa imponibile per intero, non per l'eccedenza."
    },

    /** Premio di risultato con imposta sostitutiva.
     *  La legge di bilancio 2026 porta l'aliquota all'1% e il tetto a 5.000 €
     *  per il biennio 2026-2027. Prima era 5% su 3.000 €.
     *  Resta la condizione di accesso: reddito di lavoro dipendente dell'anno
     *  precedente non superiore a 80.000 €, e premio erogato in esecuzione di
     *  contrattazione collettiva di secondo livello con obiettivi misurabili.
     *  Fonte: L. 208/2015 art. 1 co. 182-189; legge di bilancio 2026. */
    premioRisultato: {
      aliquotaSostitutiva: 0.01,
      tettoAnnuo: 5000,
      limiteRedditoAnnoPrecedente: 80000,
      confidenza: "tipica",
      contributi: true,
      nota: "I contributi restano dovuti, l'IRPEF ordinaria no: si paga l'1% " +
            "secco. Richiede un accordo di secondo livello depositato: è il " +
            "prerequisito che blocca più aziende, non il calcolo."
    },

    /** Conversione del premio di risultato in welfare aziendale.
     *  Se il lavoratore sceglie i beni e servizi dell'art. 51 co. 2 TUIR al
     *  posto del denaro, l'importo esce sia dalla base contributiva sia da
     *  quella fiscale. È il canale a efficienza teorica del 100%.
     *  Fonte: art. 1 co. 184 L. 208/2015; art. 51 co. 2 TUIR. */
    premioConvertitoWelfare: {
      tettoAnnuo: 5000,
      confidenza: "tipica",
      contributi: false,
      irpef: false,
      nota: "Converte un premio tassato in welfare esente. L'azienda risparmia " +
            "anche i propri contributi sul premio convertito."
    },

    /** Detassazione di indennità e maggiorazioni retributive introdotta per
     *  il 2026: imposta sostitutiva del 15% fino a 1.500 € annui.
     *  Fonte: legge di bilancio 2026. */
    maggiorazioniDetassate: {
      aliquotaSostitutiva: 0.15,
      tettoAnnuo: 1500,
      confidenza: "daVerificare",
      contributi: true,
      nota: "Misura nuova del 2026, perimetro applicativo ancora in " +
            "assestamento: da confermare prima di metterla a budget."
    }
  };

  /* --------------------------------------------------------------------------
   * MAXI-DEDUZIONE DELLE NUOVE ASSUNZIONI
   *
   * Non è un esonero contributivo: è una maggiorazione della deduzione ai fini
   * IRES/IRPEF del costo del lavoro incrementale. Sta qui e non fra gli
   * esoneri perché il beneficio non tocca il cedolino, arriva in dichiarazione
   * ed è proporzionale all'aliquota d'imposta dell'azienda — quindi vale zero
   * per chi è in perdita fiscale.
   *
   * È la ragione per cui va tenuta separata: sommarla agli esoneri come se
   * fosse cassa immediata sovrastima il risparmio e sbaglia l'anno.
   * Fonte: art. 4 D.Lgs. 216/2023; L. 207/2024 (estensione al triennio).
   * ------------------------------------------------------------------------*/
  const MAXI_DEDUZIONE = {
    maggiorazioneBase: 0.20,
    maggiorazioneCategorieTutelate: 0.30,
    aliquotaIres: 0.24,
    confidenza: "tipica",
    attivaFinoAllAnno: 2027,
    categorieTutelate: [
      "persone con disabilità",
      "donne con almeno due figli minori di 18 anni",
      "donne vittime di violenza inserite in percorsi di protezione",
      "giovani ammessi agli incentivi all'occupazione giovanile",
      "ex percettori di reddito di cittadinanza"
    ],
    nota: "Richiede incremento occupazionale netto sia dei rapporti a tempo " +
          "indeterminato sia dell'organico complessivo. Il beneficio si " +
          "monetizza solo se c'è reddito imponibile capiente."
  };

  /* --------------------------------------------------------------------------
   * MENSILITÀ E CONVENZIONI DI CALCOLO
   * ------------------------------------------------------------------------*/
  const CONVENZIONI = {
    mesiAnno: 12,
    orizzonteProiezioneMesi: 60,
    nota: "I massimali mensili degli esoneri sono per definizione mensili: " +
          "vanno applicati mese per mese e non annualizzati, altrimenti una " +
          "mensilità aggiuntiva erosa dal tetto sparisce dal conto."
  };

  return {
    ANNO, CONTRIBUTI_DATORE, APPRENDISTATO, INAIL, TFR,
    CANALI_RETRIBUZIONE, MAXI_DEDUZIONE, CONVENZIONI
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.PARAMETRI_DATORE_2026;
}
