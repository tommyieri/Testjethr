"use strict";
/* ============================================================================
 * MOTORE DEL COSTO AZIENDA
 *
 * Solo logica: i numeri arrivano da parametri-datore-2026.js.
 *
 * Due cose che questo motore fa e i calcolatori di costo aziendale in giro
 * non fanno.
 *
 * 1. Ragiona per MESE, non per anno.
 *    Sembra un dettaglio implementativo, è invece la scelta che rende
 *    corretto tutto il resto. I massimali degli esoneri 2026 sono mensili:
 *    500 € a dicembre non diventano 1.000 € perché c'è la tredicesima. Chi
 *    calcola l'esonero come «minimo fra contributi annui e 500 × 12» sbaglia
 *    per eccesso, e sbaglia proprio nei mesi che pesano di più. Le mensilità
 *    aggiuntive vanno collocate nel loro mese e lì il tetto va applicato.
 *
 * 2. Distingue la quota IVS dal resto della contribuzione.
 *    Il massimale contributivo annuo si applica all'IVS e non alle altre
 *    voci. Trattare l'aliquota datore come un blocco unico da tagliare al
 *    massimale sottostima il costo delle retribuzioni alte.
 *
 * Espone globalThis.COSTO.
 * ==========================================================================*/

(() => {

  const PD = globalThis.PARAMETRI_DATORE_2026;
  if (!PD) throw new Error("parametri-datore-2026.js deve essere caricato prima di costo-azienda.js");

  const { CONTRIBUTI_DATORE, APPRENDISTATO, INAIL, TFR, CANALI_RETRIBUZIONE } = PD;

  const arrotonda = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  /* --------------------------------------------------------------------------
   * DISTRIBUZIONE DELLA RETRIBUZIONE SUI DODICI MESI
   *
   * Con 13 mensilità dicembre vale doppio; con 14, anche giugno. Collocare le
   * mensilità aggiuntive nel mese giusto non è pedanteria: è ciò che fa
   * emergere l'erosione del massimale mensile dell'esonero, che è denaro vero
   * e che nessuno mostra.
   * ------------------------------------------------------------------------*/
  function distribuzioneMensile(ral, mensilita) {
    const m = mensilita && mensilita > 0 ? mensilita : 12;
    const rata = ral / m;
    const mesi = new Array(12).fill(rata);
    if (m >= 13) mesi[11] += rata;              // tredicesima, dicembre
    if (m >= 14) mesi[5] += rata;               // quattordicesima, giugno
    if (m > 14) {                                // casi oltre le 14: si spalma
      const extra = (m - 14) * rata;
      for (let i = 0; i < 12; i++) mesi[i] += extra / 12;
    }
    // Con mensilità frazionarie la somma può discostarsi: si riallinea.
    const somma = mesi.reduce((a, b) => a + b, 0);
    if (somma > 0 && Math.abs(somma - ral) > 0.005) {
      const k = ral / somma;
      for (let i = 0; i < 12; i++) mesi[i] *= k;
    }
    return mesi;
  }

  /* --------------------------------------------------------------------------
   * ALIQUOTA DATORIALE APPLICABILE
   * ------------------------------------------------------------------------*/
  function aliquotaDatore(o) {
    if (o.tipoContratto === "apprendistato") {
      const micro = o.dipendentiAzienda != null &&
                    o.dipendentiAzienda <= APPRENDISTATO.microImprese.sogliaDipendenti;
      if (!micro) return APPRENDISTATO.aliquotaStandard;
      const anno = o.annoApprendistato || 1;
      if (anno === 1) return APPRENDISTATO.microImprese.anno1;
      if (anno === 2) return APPRENDISTATO.microImprese.anno2;
      return APPRENDISTATO.microImprese.dalTerzoAnno;
    }

    let base = o.aliquotaDatore;
    if (base == null) {
      const preset = CONTRIBUTI_DATORE.settori[o.settore] ||
                     CONTRIBUTI_DATORE.settori.commercio;
      base = preset.aliquota;
    }

    if (o.tipoContratto === "determinato") {
      base += CONTRIBUTI_DATORE.addizionaleTempoDeterminato;
      const rinnovi = o.rinnoviTempoDeterminato || 0;
      base += rinnovi * CONTRIBUTI_DATORE.incrementoPerRinnovo;
    }
    return base;
  }

  /* --------------------------------------------------------------------------
   * COSTO AZIENDA
   *
   * Struttura del risultato: un totale annuo, la scomposizione in voci e — la
   * parte che serve al motore delle agevolazioni — il profilo mensile della
   * contribuzione, che è la base su cui gli esoneri vengono poi applicati con
   * i loro tetti.
   * ------------------------------------------------------------------------*/
  function calcolaCostoAzienda(ral, opzioni) {
    const o = Object.assign({
      mensilita: 13,
      settore: "commercio",
      aliquotaDatore: null,
      tassoInail: INAIL.tassoDefault,
      tipoContratto: "indeterminato",
      annoApprendistato: 1,
      dipendentiAzienda: null,
      rinnoviTempoDeterminato: 0
    }, opzioni || {});

    if (!Number.isFinite(ral) || ral < 0) {
      throw new Error("La RAL deve essere un numero positivo.");
    }

    const aliquota = aliquotaDatore(o);
    const mesi = distribuzioneMensile(ral, o.mensilita);

    /* L'IVS si ferma al massimale annuo, le altre voci no. Con l'apprendistato
       l'aliquota complessiva è già sotto la quota IVS ordinaria, quindi il
       massimale non morde mai e la distinzione non si applica. */
    const eApprendistato = o.tipoContratto === "apprendistato";
    const aliquotaIvs = eApprendistato ? aliquota
                                       : Math.min(CONTRIBUTI_DATORE.ivs, aliquota);
    const aliquotaAltre = arrotondaAliquota(aliquota - aliquotaIvs);

    const profilo = [];
    let baseIvsCumulata = 0;
    let contributiTotali = 0, inailTotale = 0, tfrTotale = 0;

    for (let i = 0; i < 12; i++) {
      const lordo = mesi[i];

      const spazioIvs = Math.max(0, CONTRIBUTI_DATORE.massimaleAnnuo - baseIvsCumulata);
      const baseIvsMese = Math.min(lordo, spazioIvs);
      baseIvsCumulata += baseIvsMese;

      const ivs = baseIvsMese * aliquotaIvs;
      const altre = lordo * aliquotaAltre;
      const contributi = ivs + altre;
      const inail = lordo * o.tassoInail;
      const tfr = lordo * TFR.quotaAnnua;

      contributiTotali += contributi;
      inailTotale += inail;
      tfrTotale += tfr;

      profilo.push({
        mese: i + 1,
        lordo: arrotonda(lordo),
        contributiDatore: arrotonda(contributi),
        quotaIvs: arrotonda(ivs),
        quotaAltre: arrotonda(altre),
        inail: arrotonda(inail),
        tfr: arrotonda(tfr),
        costo: arrotonda(lordo + contributi + inail + tfr),
        mensilitaAggiuntiva: (o.mensilita >= 13 && i === 11) ||
                             (o.mensilita >= 14 && i === 5)
      });
    }

    const costoTotale = ral + contributiTotali + inailTotale + tfrTotale;

    return {
      ral: arrotonda(ral),
      mensilita: o.mensilita,
      aliquotaApplicata: aliquota,
      aliquotaIvs, aliquotaAltre,
      tipoContratto: o.tipoContratto,
      contributiDatore: arrotonda(contributiTotali),
      inail: arrotonda(inailTotale),
      tfr: arrotonda(tfrTotale),
      costoTotale: arrotonda(costoTotale),
      costoMensile: arrotonda(costoTotale / 12),
      moltiplicatore: ral > 0 ? Math.round(costoTotale / ral * 1000) / 1000 : null,
      profiloMensile: profilo,
      voci: [
        { voce: "Retribuzione annua lorda", importo: arrotonda(ral), quota: ral / costoTotale },
        { voce: "Contributi previdenziali a carico azienda", importo: arrotonda(contributiTotali), quota: contributiTotali / costoTotale },
        { voce: "Premio INAIL", importo: arrotonda(inailTotale), quota: inailTotale / costoTotale },
        { voce: "Accantonamento TFR", importo: arrotonda(tfrTotale), quota: tfrTotale / costoTotale }
      ],
      opzioni: o
    };
  }

  /** Le aliquote arrivano da moltiplicazioni in virgola mobile: si tengono a
   *  sei decimali per evitare che 0.30 − 0.2381 diventi 0.06190000000000002 e
   *  si porti dietro il rumore fino al totale. */
  function arrotondaAliquota(a) {
    return Math.round(a * 1e6) / 1e6;
  }

  /* ==========================================================================
   * L'EFFICIENZA DELL'EURO
   *
   * La domanda che questo pezzo risponde è diversa da tutte le altre, ed è la
   * più sottovalutata del cost saving:
   *
   *   «Ho un budget da destinare a questa persona. Qual è il canale che le
   *    fa arrivare più soldi in tasca a parità di costo per me?»
   *
   * Le agevolazioni all'assunzione riducono il costo di una retribuzione
   * data. Questo blocco fa l'operazione opposta: a costo dato, massimizza il
   * valore percepito. È una leva che non richiede requisiti soggettivi, non
   * ha risorse contingentate, non scade il 31 dicembre, e si applica a
   * TUTTO l'organico invece che alle sole nuove assunzioni.
   *
   * L'aumento in busta è il canale meno efficiente che esista, e la maggior
   * parte delle aziende usa solo quello.
   * ========================================================================*/

  /** Costo azienda per un euro di retribuzione lorda aggiuntiva. */
  function moltiplicatoreCosto(o, includeTfr) {
    const aliquota = aliquotaDatore(o);
    const tfr = includeTfr === false ? 0 : TFR.quotaAnnua;
    return 1 + aliquota + (o.tassoInail == null ? INAIL.tassoDefault : o.tassoInail) + tfr;
  }

  /**
   * Confronta i canali con cui l'azienda può destinare un budget a una
   * persona, e restituisce per ciascuno quanto ne arriva netto.
   *
   * Richiede il motore lato dipendente (globalThis.CALC) per il canale
   * «aumento in busta»: il netto marginale di un aumento dipende dallo
   * scaglione IRPEF, dalle detrazioni e dalle addizionali, e replicare quel
   * calcolo qui significherebbe duplicarlo e vederlo divergere. Si riusa.
   */
  function confrontaCanali(ral, budget, opzioni) {
    const o = opzioni || {};
    const CALC = globalThis.CALC;
    if (!CALC) throw new Error("calcolo.js deve essere caricato per confrontare i canali.");

    const opzioniNetto = Object.assign({ mensilita: o.mensilita || 13 }, o.opzioniNetto || {});
    const nettoBase = CALC.calcolaNetto(ral, opzioniNetto).nettoAnnuo;
    const canali = [];

    /* --- 1. Aumento della retribuzione lorda ------------------------------ */
    const molt = moltiplicatoreCosto(o, true);
    const lordoAggiuntivo = budget / molt;
    const nettoConAumento = CALC.calcolaNetto(ral + lordoAggiuntivo, opzioniNetto).nettoAnnuo;
    const nettoAumento = nettoConAumento - nettoBase;
    canali.push({
      id: "aumento-ral",
      nome: "Aumento della retribuzione lorda",
      gruppoTetto: null,
      costoAzienda: arrotonda(budget),
      valoreLordo: arrotonda(lordoAggiuntivo),
      nettoLavoratore: arrotonda(nettoAumento),
      efficienza: nettoAumento / budget,
      tetto: null,
      requisiti: "Nessuno.",
      nota: "Il canale che tutti usano per default. Su ogni euro speso " +
            "dall'azienda, contributi e IRPEF si prendono la maggior parte " +
            "prima che arrivi in tasca. È anche l'unico che aumenta la base " +
            "di TFR e mensilità aggiuntive, quindi si trascina dietro un " +
            "costo ricorrente."
    });

    /* --- 2. Fringe benefit sotto soglia ----------------------------------- */
    const conFigli = (o.opzioniNetto && o.opzioniNetto.figli > 0) || o.figliACarico;
    const sogliaFringe = conFigli
      ? CANALI_RETRIBUZIONE.fringeBenefit.sogliaConFigli
      : CANALI_RETRIBUZIONE.fringeBenefit.sogliaBase;
    const fringeUtilizzabile = Math.min(budget, sogliaFringe);
    canali.push({
      id: "fringe-benefit",
      nome: "Fringe benefit sotto soglia",
      gruppoTetto: "fringe",
      costoAzienda: arrotonda(fringeUtilizzabile),
      valoreLordo: arrotonda(fringeUtilizzabile),
      nettoLavoratore: arrotonda(fringeUtilizzabile),
      efficienza: fringeUtilizzabile > 0 ? 1 : 0,
      tetto: sogliaFringe,
      budgetNonAllocato: arrotonda(Math.max(0, budget - fringeUtilizzabile)),
      requisiti: "Nessun accordo sindacale. Serve la dichiarazione dei codici " +
                 "fiscali dei figli per accedere alla soglia da 2.000 €.",
      nota: "Efficienza del 100%: nessun contributo, nessuna IRPEF, da " +
            "nessuna delle due parti. Attenzione al cliff: superata la soglia " +
            "anche di un euro diventa imponibile l'intero importo, non " +
            "l'eccedenza. È l'unico canale dove sforare costa più che non dare " +
            "nulla."
    });

    /* --- 3. Premio di risultato con imposta sostitutiva ------------------- */
    const PR = CANALI_RETRIBUZIONE.premioRisultato;
    const moltPremio = moltiplicatoreCosto(o, true);
    const premioLordo = Math.min(budget / moltPremio, PR.tettoAnnuo);
    const costoPremio = premioLordo * moltPremio;
    const aliquotaDipendente = 0.0919;
    const nettoPremio = premioLordo * (1 - aliquotaDipendente) * (1 - PR.aliquotaSostitutiva);
    canali.push({
      id: "premio-risultato",
      nome: "Premio di risultato detassato",
      gruppoTetto: "premio",
      costoAzienda: arrotonda(costoPremio),
      valoreLordo: arrotonda(premioLordo),
      nettoLavoratore: arrotonda(nettoPremio),
      efficienza: costoPremio > 0 ? nettoPremio / costoPremio : 0,
      tetto: PR.tettoAnnuo,
      budgetNonAllocato: arrotonda(Math.max(0, budget - costoPremio)),
      requisiti: "Contratto collettivo di secondo livello depositato, con " +
                 "obiettivi misurabili e verificabili. Reddito da lavoro " +
                 "dipendente dell'anno precedente non oltre 80.000 €.",
      nota: "I contributi restano dovuti, l'IRPEF ordinaria no: si paga l'1% " +
            "secco al posto dello scaglione. Sui redditi in seconda o terza " +
            "aliquota il salto è enorme. Il vero ostacolo non è il calcolo, è " +
            "l'accordo di secondo livello: è lì che si perde tempo, ed è lì " +
            "che si può standardizzare."
    });

    /* --- 4. Premio convertito in welfare ---------------------------------- */
    const PW = CANALI_RETRIBUZIONE.premioConvertitoWelfare;
    const welfareUtilizzabile = Math.min(budget, PW.tettoAnnuo);
    canali.push({
      id: "premio-welfare",
      nome: "Premio di risultato convertito in welfare",
      gruppoTetto: "premio",
      costoAzienda: arrotonda(welfareUtilizzabile),
      valoreLordo: arrotonda(welfareUtilizzabile),
      nettoLavoratore: arrotonda(welfareUtilizzabile),
      efficienza: welfareUtilizzabile > 0 ? 1 : 0,
      tetto: PW.tettoAnnuo,
      budgetNonAllocato: arrotonda(Math.max(0, budget - welfareUtilizzabile)),
      requisiti: "Stesso accordo di secondo livello del premio, più un piano " +
                 "welfare con beni e servizi dell'art. 51 co. 2 TUIR. " +
                 "La scelta fra denaro e welfare resta del lavoratore.",
      nota: "Efficienza del 100% su un tetto cinque volte più alto di quello " +
            "del fringe benefit. L'azienda risparmia anche i contributi che " +
            "avrebbe pagato sul premio in denaro. È il canale più efficiente " +
            "del sistema, ed è anche quello che richiede più lavoro a monte: " +
            "esattamente il profilo di un problema da prodotto."
    });

    canali.sort((a, b) => b.efficienza - a.efficienza);

    /* ------------------------------------------------------------------
     * ALLOCAZIONE DEL BUDGET
     *
     * Il confronto canale per canale risponde a «quale è il più
     * efficiente», che è la domanda sbagliata: nessun canale da solo
     * assorbe un budget qualsiasi, perché tutti tranne l'aumento in busta
     * hanno un tetto. La domanda giusta è «come lo spacchetto».
     *
     * Si riempie in ordine di efficienza decrescente, rispettando i tetti,
     * e ciò che avanza finisce dove finisce sempre: in aumento di RAL.
     *
     * Un vincolo che va rispettato: premio in denaro e premio convertito in
     * welfare pescano dallo stesso plafond, perché sono lo stesso premio
     * erogato in due forme. Il fringe benefit ha invece un plafond suo,
     * quindi i due si sommano davvero. Trattarli tutti come indipendenti
     * gonfierebbe il risultato di qualche migliaio di euro.
     * ----------------------------------------------------------------*/
    const tettiGruppo = { fringe: sogliaFringe, premio: PR.tettoAnnuo };
    const usatoGruppo = { fringe: 0, premio: 0 };
    let residuo = budget;
    const mix = [];

    for (const c of canali) {
      if (residuo <= 0.01) break;
      if (c.id === "aumento-ral") continue;   // è il contenitore di riserva
      const tettoResiduo = c.gruppoTetto
        ? Math.max(0, tettiGruppo[c.gruppoTetto] - usatoGruppo[c.gruppoTetto])
        : Infinity;
      if (tettoResiduo <= 0.01) continue;

      /* Per i canali a efficienza piena il costo azienda coincide con il
         valore erogato; per il premio in denaro no, quindi si converte. */
      const costoPerEuroErogato = c.valoreLordo > 0
        ? c.costoAzienda / c.valoreLordo : 1;
      const erogabile = Math.min(tettoResiduo, residuo / costoPerEuroErogato);
      if (erogabile <= 0.01) continue;

      const costo = erogabile * costoPerEuroErogato;
      const netto = erogabile * (c.nettoLavoratore / (c.valoreLordo || 1));

      mix.push({
        id: c.id, nome: c.nome,
        valoreLordo: arrotonda(erogabile),
        costoAzienda: arrotonda(costo),
        nettoLavoratore: arrotonda(netto)
      });
      if (c.gruppoTetto) usatoGruppo[c.gruppoTetto] += erogabile;
      residuo -= costo;
    }

    if (residuo > 0.01) {
      const lordoResiduo = residuo / molt;
      const nettoResiduo =
        CALC.calcolaNetto(ral + lordoResiduo, opzioniNetto).nettoAnnuo - nettoBase;
      mix.push({
        id: "aumento-ral", nome: "Aumento della retribuzione lorda",
        valoreLordo: arrotonda(lordoResiduo),
        costoAzienda: arrotonda(residuo),
        nettoLavoratore: arrotonda(nettoResiduo)
      });
      residuo = 0;
    }

    const nettoMix = mix.reduce((a, v) => a + v.nettoLavoratore, 0);
    const soloAumento = canali.find((c) => c.id === "aumento-ral");

    const migliore = canali[0];
    const peggiore = canali[canali.length - 1];
    return {
      ral, budget: arrotonda(budget),
      nettoBase: arrotonda(nettoBase),
      canali,
      allocazione: {
        mix,
        nettoTotale: arrotonda(nettoMix),
        efficienza: budget > 0 ? nettoMix / budget : 0,
        baselineSoloAumento: arrotonda(soloAumento.nettoLavoratore),
        guadagnoVsBaseline: arrotonda(nettoMix - soloAumento.nettoLavoratore),
        rapportoVsBaseline: soloAumento.nettoLavoratore > 0
          ? Math.round(nettoMix / soloAumento.nettoLavoratore * 100) / 100
          : null
      },
      divario: {
        migliore: migliore.id,
        peggiore: peggiore.id,
        rapporto: peggiore.efficienza > 0
          ? Math.round(migliore.efficienza / peggiore.efficienza * 100) / 100
          : null
      }
    };
  }

  globalThis.COSTO = {
    distribuzioneMensile,
    aliquotaDatore,
    calcolaCostoAzienda,
    confrontaCanali,
    moltiplicatoreCosto,
    PARAMETRI: PD
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.COSTO;
}
