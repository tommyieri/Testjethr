"use strict";
/* ============================================================================
 * PARAMETRI FISCALI — anno d'imposta 2026
 *
 * Questo file contiene SOLO dati: nessuna formula, nessuna decisione.
 * È deliberatamente separato da calcolo.js perché è la parte che cambia ogni
 * anno. A gennaio si aggiornano i numeri qui dentro e il motore resta intatto.
 *
 * Ogni valore porta accanto la fonte da cui viene. Se un numero non ha fonte,
 * è un bug.
 * ==========================================================================*/

globalThis.PARAMETRI_2026 = (() => {

  const ANNO_FISCALE = 2026;

  /* --------------------------------------------------------------------------
   * CONTRIBUTI PREVIDENZIALI
   * ------------------------------------------------------------------------*/
  const CONTRIBUTI = {
    /** IVS a carico del lavoratore dipendente, settore privato.
     *  L'aliquota complessiva è il 33%: il 23,81% a carico del datore è costo
     *  aziendale, non compare in busta paga e quindi non entra nel netto.
     *  Fonte: circolari INPS aliquote contributive 2026. */
    aliquotaDipendente: 0.0919,

    /** Apprendista: aliquota ridotta a carico del lavoratore.
     *  Fonte: disciplina dell'apprendistato, aliquote INPS 2026. */
    aliquotaApprendista: 0.0584,

    /** Massimale annuo della base contributiva e pensionabile. Si applica ai
     *  soli iscritti privi di anzianità contributiva al 31/12/1995, cioè al
     *  sistema contributivo puro. Oltre il massimale non si versa IVS.
     *  Fonte: circolare INPS minimali e massimali 2026. */
    massimaleAnnuo: 120607,

    /** Aliquota aggiuntiva dell'1% sulla quota eccedente la prima fascia di
     *  retribuzione pensionabile.
     *  Fonte: art. 3-ter DL 384/1992 conv. L. 438/1992; circolare INPS 2026. */
    aliquotaAggiuntiva: 0.01,
    primaFasciaPensionabile: 56224
  };

  /* --------------------------------------------------------------------------
   * IRPEF
   * ------------------------------------------------------------------------*/
  /** Scaglioni 2026. La seconda aliquota scende dal 35% al 33% con la Legge di
   *  Bilancio 2026. Fonte: MEF, principali misure della legge di bilancio 2026. */
  const SCAGLIONI_IRPEF = [
    { limite: 28e3, aliquota: 0.23 },
    { limite: 5e4,  aliquota: 0.33 },
    { limite: null, aliquota: 0.43 }
  ];

  /* --------------------------------------------------------------------------
   * DETRAZIONE PER LAVORO DIPENDENTE — art. 13 TUIR
   * ------------------------------------------------------------------------*/
  const DETRAZIONI_LAVORO_DIPENDENTE = {
    /** Fino a 15.000 € di reddito: importo fisso. */
    importoBase: 1955,
    sogliaBase: 15e3,

    /** Minimo garantito. Non è rapportato ai giorni: fa da pavimento al
     *  risultato finale. 1.380 € per i rapporti a termine. */
    minimoIndeterminato: 690,
    minimoDeterminato: 1380,

    /** 15.001 – 28.000: 1.910 + 1.190 × [(28.000 − reddito) / 13.000] */
    fascia2: { limite: 28e3, fisso: 1910, variabile: 1190, ampiezza: 13e3 },

    /** 28.001 – 50.000: 1.910 × [(50.000 − reddito) / 22.000]
     *  Oltre 50.000 € la detrazione si azzera. */
    fascia3: { limite: 5e4, fisso: 1910, ampiezza: 22e3 },

    /** Maggiorazione di 65 € per redditi fra 25.000 e 35.000 €.
     *  Fonte: art. 13 co. 1.1 TUIR. */
    maggiorazione: { importo: 65, da: 25e3, a: 35e3 },

    giorniAnno: 365
  };

  /* --------------------------------------------------------------------------
   * DETRAZIONI PER CARICHI DI FAMIGLIA — art. 12 TUIR
   * riscritto dal D.Lgs. 192/2024 e dalla L. 207/2024
   * ------------------------------------------------------------------------*/
  const DETRAZIONI_FAMILIARI = {
    /** Soglia di reddito proprio sotto la quale un familiare è a carico. */
    limiteRedditoFamiliare: 2840.51,

    /** Art. 12 co. 1 lett. a). Si azzera oltre 80.000 € di reddito. */
    coniuge: {
      fascia1: { limite: 15e3, base: 800, riduzione: 110 },
      fascia2: { limite: 4e4, importo: 690 },
      fascia3: { limite: 8e4, importo: 690, ampiezza: 4e4 }
    },

    /** Art. 12 co. 1 lett. c). Spetta solo per i figli dai 21 ai 29 anni:
     *  sotto i 21 c'è l'assegno unico INPS, dai 30 non spetta più.
     *  La soglia sale di 15.000 € per ogni figlio oltre il primo. */
    figli: { importo: 950, soglia: 95e3, incrementoPerFiglio: 15e3 },

    /** Art. 12 co. 1 lett. d). Dal 2025 solo ascendenti conviventi. */
    altri: { importo: 750, soglia: 8e4 }
  };

  /* --------------------------------------------------------------------------
   * MISURE INTEGRATIVE
   * ------------------------------------------------------------------------*/
  /** Ulteriore detrazione per redditi 20.000 – 40.000 €. Piena fino a 32.000,
   *  poi décalage lineare. Alternativa alla somma integrativa.
   *  Fonte: L. 207/2024 art. 1 co. 6, confermata per il 2026. */
  const ULTERIORE_DETRAZIONE = {
    importo: 1e3, da: 2e4, sogliaPiena: 32e3, a: 4e4
  };

  /** Somma integrativa non imponibile. Percentuale sul reddito di lavoro
   *  dipendente, riservata ai redditi complessivi fino a 20.000 €. Non concorre
   *  al reddito, quindi non è né tassata né soggetta a contributi.
   *  Fonte: L. 207/2024 art. 1 co. 4-5, confermata per il 2026. */
  const SOMMA_INTEGRATIVA = {
    fasce: [
      { limite: 8500, percentuale: 0.071 },
      { limite: 15e3, percentuale: 0.053 },
      { limite: 2e4,  percentuale: 0.048 }
    ]
  };

  /** Trattamento integrativo, il "bonus 100 €". Cumulabile con la somma
   *  integrativa: sono misure distinte, non alternative.
   *  Fonte: DL 3/2020 art. 1, disciplina confermata per il 2026. */
  const TRATTAMENTO_INTEGRATIVO = { importo: 1200, sogliaReddito: 15e3 };

  /* --------------------------------------------------------------------------
   * ADDIZIONALI
   * ------------------------------------------------------------------------*/
  /** Lombardia, aliquote a scaglioni. È l'unica regione precaricata: le venti
   *  tabelle regionali non erano verificabili su fonte primaria, e precaricare
   *  dati incerti avrebbe reso il risultato meno affidabile invece che più
   *  completo. Per le altre regioni l'aliquota si inserisce a mano.
   *  Fonte: Dipartimento delle Finanze (MEF), art. 72 L.R. Lombardia 10/2003. */
  const ADDIZIONALE_REGIONALE_LOMBARDIA = [
    { limite: 15e3, aliquota: 0.0123 },
    { limite: 28e3, aliquota: 0.0158 },
    { limite: 5e4,  aliquota: 0.0172 },
    { limite: null, aliquota: 0.0173 }
  ];

  /** Milano. È una soglia e non una franchigia: superata, si paga sull'intero
   *  imponibile e non sulla sola eccedenza.
   *  Fonte: delibera del Comune di Milano n. 46 del 28/09/2020. */
  const ADDIZIONALE_COMUNALE_DEFAULT = { aliquota: 8e-3, sogliaEsenzione: 23e3 };

  /* --------------------------------------------------------------------------
   * WELFARE E FRINGE BENEFIT
   * ------------------------------------------------------------------------*/
  /** Soglia di esenzione, elevata per chi ha figli a carico, per i periodi
   *  d'imposta 2025-2027. Superata anche di un solo euro diventa imponibile
   *  l'INTERO importo, non la sola eccedenza: è la ragione per cui un euro in
   *  più può costare decine di euro al mese. */
  const FRINGE_BENEFIT = { soglia: 1e3, sogliaConFigli: 2e3 };

  const MENSILITA_DEFAULT = 13;

  return {
    ANNO_FISCALE,
    CONTRIBUTI,
    SCAGLIONI_IRPEF,
    DETRAZIONI_LAVORO_DIPENDENTE,
    DETRAZIONI_FAMILIARI,
    ULTERIORE_DETRAZIONE,
    SOMMA_INTEGRATIVA,
    TRATTAMENTO_INTEGRATIVO,
    ADDIZIONALE_REGIONALE_LOMBARDIA,
    ADDIZIONALE_COMUNALE_DEFAULT,
    FRINGE_BENEFIT,
    MENSILITA_DEFAULT
  };
})();
