"use strict";
/* ============================================================================
 * MOTORE DELLE AGEVOLAZIONI
 *
 * Solo logica. Le misure arrivano da agevolazioni-2026.js, i parametri di
 * costo da parametri-datore-2026.js, il profilo mensile di contribuzione da
 * costo-azienda.js.
 *
 * Fa tre cose, in quest'ordine, e l'ordine è la parte importante.
 *
 * 1. VALUTA LE CONDIZIONI GENERALI PRIMA DI TUTTO
 *    L'art. 31 D.Lgs. 150/2015 è un cancello: se non passa, non c'è niente da
 *    calcolare. Un motore che mostra 12.000 € di risparmio e poi in fondo
 *    scrive «verifica i requisiti» ha già fatto il danno, perché quel numero
 *    è finito in una proposta commerciale.
 *
 * 2. SEPARA «NON SPETTA» DA «NON LO SO»
 *    Ogni requisito ha tre esiti, non due. Un requisito ignoto genera una
 *    domanda, non un rifiuto. Nel processo reale è la differenza fra
 *    scartare un candidato e fargli una telefonata.
 *
 * 3. OTTIMIZZA MESE PER MESE, NON UNA VOLTA SOLA
 *    Questa è la scelta algoritmica che dà il risultato che nessuno mostra.
 *
 *    Gli esoneri sulla contribuzione datoriale sono alternativi fra loro: sullo
 *    stesso lavoratore, nello stesso mese, se ne applica uno. Ma «uno per
 *    mese» non vuol dire «uno per sempre». Il Bonus Giovani copre 24 mesi
 *    dall'assunzione; la Decontribuzione Sud non è legata a un evento e resta
 *    disponibile dopo. La risposta ottima non è una misura, è una SEQUENZA.
 *
 *    Poiché ogni misura ha un calendario proprio e indipendente dalle altre,
 *    scegliere in ogni mese la misura che vale più in quel mese è ottimo anche
 *    globalmente: non esiste un sacrificio oggi che paghi domani. Questo
 *    rende il problema risolvibile con una scansione lineare sull'orizzonte
 *    invece che con una ricerca su 2^n combinazioni, e rende il risultato
 *    spiegabile riga per riga — che è ciò che serve per farlo firmare a un
 *    consulente del lavoro.
 *
 * Espone globalThis.AGEV.
 * ==========================================================================*/

(() => {

  const A = globalThis.AGEVOLAZIONI_2026;
  const PD = globalThis.PARAMETRI_DATORE_2026;
  const COSTO = globalThis.COSTO;
  if (!A) throw new Error("agevolazioni-2026.js deve essere caricato prima di motore-agevolazioni.js");
  if (!PD || !COSTO) throw new Error("parametri-datore-2026.js e costo-azienda.js devono essere caricati prima.");

  const arrotonda = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const valore = (v, p) => (typeof v === "function" ? v(p) : v);

  /* ==========================================================================
   * CONDIZIONI GENERALI
   * ========================================================================*/
  function valutaCondizioniGenerali(profilo) {
    const voci = A.CONDIZIONI_GENERALI.voci.map((v) => {
      const esito = v.test(profilo);
      return {
        id: v.id, label: v.label, spiegazione: v.spiegazione,
        esito: esito === null ? "ignoto" : (esito ? "rispettata" : "violata")
      };
    });
    const violate = voci.filter((v) => v.esito === "violata");
    const ignote = voci.filter((v) => v.esito === "ignoto");
    return {
      norma: A.CONDIZIONI_GENERALI.norma,
      fonte: A.CONDIZIONI_GENERALI.fonte,
      voci, violate, ignote,
      esito: violate.length > 0 ? "bloccato"
           : ignote.length > 0 ? "da-verificare" : "libero",
      messaggio: violate.length > 0
        ? "Almeno una condizione generale non è rispettata: nessun incentivo " +
          "all'assunzione spetta, e quelli eventualmente fruiti sono soggetti " +
          "a recupero. Il risparmio calcolato qui sotto va considerato non " +
          "acquisibile fino a rimozione dell'ostacolo."
        : ignote.length > 0
        ? "Le condizioni generali non sono tutte verificate. Il risparmio è " +
          "una stima condizionata: va confermato prima di metterlo a budget."
        : "Condizioni generali rispettate."
    };
  }

  /* ==========================================================================
   * VALUTAZIONE DI UNA SINGOLA MISURA
   * ========================================================================*/

  function dentroFinestra(misura, dataAssunzione) {
    if (!misura.finestra) return { dentro: true };
    if (!dataAssunzione) return { dentro: null };
    const d = dataAssunzione;
    if (misura.finestra.da && d < misura.finestra.da) {
      return { dentro: false, motivo: "La misura non è ancora aperta alla data indicata: apre il " + misura.finestra.da + "." };
    }
    if (misura.finestra.a && d > misura.finestra.a) {
      return { dentro: false, motivo: "La finestra si è chiusa il " + misura.finestra.a + ": per questa data di assunzione la misura non è più utilizzabile." };
    }
    return { dentro: true };
  }

  function valutaRequisiti(misura, profilo) {
    return misura.requisiti.map((r) => {
      const esito = r.test(profilo);
      return {
        id: r.id, label: r.label, spiegazione: r.spiegazione,
        esito: esito === null ? "ignoto" : (esito ? "soddisfatto" : "non-soddisfatto")
      };
    });
  }

  /**
   * Serie mensile del beneficio di una misura, sull'orizzonte richiesto.
   *
   * Ogni misura calcola sulla propria base:
   *   - esoneri            → contribuzione datoriale del mese, con tetto mensile o annuo
   *   - contributo su retribuzione → retribuzione imponibile del mese (disabili)
   *   - contributo su indennità    → indennità NASpI residua
   *   - deduzione fiscale  → non genera cassa, si tiene fuori dalla serie
   */
  function serieMensile(misura, profilo, costo, orizzonteMesi) {
    const b = misura.beneficio;
    const serie = new Array(orizzonteMesi).fill(0);
    if (b.tipo === "deduzione-maggiorata") return serie;

    const durata = Math.min(valore(misura.durataMesi, profilo) || 0, orizzonteMesi);
    if (durata <= 0) return serie;

    const percentuale = valore(b.percentuale, profilo) || 0;
    const tettoMensile = b.massimaleMensile ? valore(b.massimaleMensile, profilo) : null;
    const tettoAnnuo = b.massimaleAnnuo ? valore(b.massimaleAnnuo, profilo) : null;

    /* La Decontribuzione Sud non parte dall'assunzione: è disponibile in
       qualunque mese in cui l'azienda ha i requisiti, e si rinnova di anno in
       anno. Le altre misure decorrono dall'assunzione. Il flag governa questa
       differenza, che è ciò che rende possibile la sequenza «prima il bonus,
       poi la decontribuzione». */
    const strutturale = misura.id === "decontribuzione-sud-pmi";
    const mesiAttivi = strutturale ? orizzonteMesi : durata;

    let usatoNellAnno = 0;
    for (let i = 0; i < mesiAttivi; i++) {
      if (i % 12 === 0) usatoNellAnno = 0;

      const mese = costo.profiloMensile[i % 12];
      let importo = 0;

      if (b.tipo === "esonero-contributi-datore") {
        const base = b.escludeInail === false
          ? mese.contributiDatore + mese.inail
          : mese.contributiDatore;
        importo = base * percentuale;
      } else if (b.tipo === "contributo-su-retribuzione") {
        importo = mese.lordo * percentuale;
      } else if (b.tipo === "contributo-su-indennita") {
        const indennita = profilo.naspiIndennitaMensile || 0;
        importo = indennita * percentuale;
      }

      if (tettoMensile != null) importo = Math.min(importo, tettoMensile);
      if (tettoAnnuo != null) {
        importo = Math.min(importo, Math.max(0, tettoAnnuo - usatoNellAnno));
        usatoNellAnno += importo;
      }
      serie[i] = arrotonda(importo);
    }
    return serie;
  }

  /** Beneficio fiscale annuo della maxi-deduzione: non è cassa, sta a parte. */
  function beneficioFiscale(misura, profilo, costo) {
    if (misura.beneficio.tipo !== "deduzione-maggiorata") return null;
    const magg = valore(misura.beneficio.maggiorazione, profilo);
    const aliquota = misura.beneficio.aliquotaImposta;
    const risparmio = costo.costoTotale * magg * aliquota;
    return {
      baseImponibileAggiuntiva: arrotonda(costo.costoTotale * magg),
      risparmioImposta: arrotonda(risparmio),
      maggiorazione: magg,
      aliquotaImposta: aliquota
    };
  }

  function valutaMisura(misura, profilo, costo, orizzonteMesi) {
    const finestra = dentroFinestra(misura, profilo.dataAssunzione);
    const requisiti = valutaRequisiti(misura, profilo);
    const mancanti = requisiti.filter((r) => r.esito === "non-soddisfatto");
    const ignoti = requisiti.filter((r) => r.esito === "ignoto");

    let stato;
    if (finestra.dentro === false) stato = "fuori-finestra";
    else if (mancanti.length > 0) stato = "non-eleggibile";
    else if (ignoti.length > 0 || finestra.dentro === null) stato = "da-chiarire";
    else stato = "eleggibile";

    /* La serie si calcola anche per le misure da chiarire: serve a rispondere
       a «quanto vale sapere questo dato», che è l'informazione che fa decidere
       se vale la pena inseguire un documento. */
    const calcolabile = stato === "eleggibile" || stato === "da-chiarire";
    const serie = calcolabile ? serieMensile(misura, profilo, costo, orizzonteMesi)
                              : new Array(orizzonteMesi).fill(0);
    const fiscale = calcolabile ? beneficioFiscale(misura, profilo, costo) : null;

    return {
      id: misura.id,
      nome: misura.nome,
      famiglia: misura.famiglia,
      norma: misura.norma,
      prassi: misura.prassi,
      fonte: misura.fonte,
      confidenza: misura.confidenza,
      sintesi: misura.sintesi,
      finestra: misura.finestra,
      motivoFinestra: finestra.motivo,
      stato, requisiti,
      requisitiMancanti: mancanti,
      requisitiIgnoti: ignoti,
      durataMesi: valore(misura.durataMesi, profilo),
      durataNota: misura.durataNota,
      massimaleNota: misura.beneficio.massimaleNota,
      cumulabilita: misura.cumulabilita,
      adempimenti: misura.adempimenti,
      aiutoDiStato: misura.aiutoDiStato,
      rischi: misura.rischi,
      serieMensile: serie,
      totaleOrizzonte: arrotonda(serie.reduce((a, b) => a + b, 0)),
      beneficioFiscale: fiscale
    };
  }

  /* ==========================================================================
   * IL PIANO OTTIMO
   * ========================================================================*/

  const eEsonero = (m) => m.famiglia === "esonero-contributivo";
  const eEconomico = (m) => m.famiglia === "incentivo-economico";
  const eFiscale = (m) => m.famiglia === "deduzione-fiscale";

  /** Una misura è esclusiva anche verso gli incentivi economici? */
  const escludeTutto = (m) => m.cumulabilita && m.cumulabilita.incompatibiliCon === "*tutti";

  function costruisciPiano(valutazioni, orizzonteMesi) {
    const utilizzabili = valutazioni.filter(
      (v) => v.stato === "eleggibile" || v.stato === "da-chiarire"
    );
    const esoneri = utilizzabili.filter(eEsonero);
    const economici = utilizzabili.filter(eEconomico);

    const mesi = [];
    for (let i = 0; i < orizzonteMesi; i++) {

      /* Opzione per opzione: scelgo un esonero e, se quell'esonero lo
         consente, aggiungo tutti gli incentivi economici attivi nel mese.
         Poi prendo il massimo. Poiché i calendari delle misure sono fissi e
         indipendenti, il massimo mese per mese è anche il massimo complessivo. */
      let migliore = { esonero: null, economici: [], totale: 0 };

      const opzioniEsonero = esoneri.filter((e) => e.serieMensile[i] > 0);
      opzioniEsonero.push(null);   // anche «nessun esonero» è un'opzione

      for (const e of opzioniEsonero) {
        const bloccaEconomici = e && escludeTutto(e);
        const eco = bloccaEconomici ? [] : economici.filter((x) => x.serieMensile[i] > 0);
        const totale = (e ? e.serieMensile[i] : 0) +
                       eco.reduce((a, x) => a + x.serieMensile[i], 0);
        if (totale > migliore.totale + 1e-9) {
          migliore = { esonero: e, economici: eco, totale };
        }
      }

      mesi.push({
        mese: i + 1,
        anno: Math.floor(i / 12) + 1,
        esonero: migliore.esonero ? {
          id: migliore.esonero.id, nome: migliore.esonero.nome,
          importo: arrotonda(migliore.esonero.serieMensile[i])
        } : null,
        incentivi: migliore.economici.map((x) => ({
          id: x.id, nome: x.nome, importo: arrotonda(x.serieMensile[i])
        })),
        totale: arrotonda(migliore.totale)
      });
    }

    /* Le misure scartate non vanno perse: sapere che una misura era eleggibile
       ma è stata battuta da un'altra è informazione utile — se il requisito
       della vincente non si documenta, si sa già dove ripiegare. */
    const usate = new Set();
    mesi.forEach((m) => {
      if (m.esonero) usate.add(m.esonero.id);
      m.incentivi.forEach((x) => usate.add(x.id));
    });
    const scartate = utilizzabili
      .filter((v) => !usate.has(v.id) && v.totaleOrizzonte > 0)
      .map((v) => ({
        id: v.id, nome: v.nome, valore: v.totaleOrizzonte,
        motivo: "Eleggibile ma meno conveniente della misura scelta negli stessi mesi."
      }))
      .sort((a, b) => b.valore - a.valore);

    /* Sequenza leggibile: comprime i 60 mesi in blocchi omogenei. Nessuno
       legge sessanta righe; tutti leggono «mesi 1-24 bonus giovani, mesi
       25-60 decontribuzione Sud». */
    const sequenza = [];
    for (const m of mesi) {
      const pezzi = [];
      if (m.esonero) pezzi.push(m.esonero.nome);
      m.incentivi.forEach((x) => pezzi.push(x.nome));
      const etichetta = pezzi.length ? pezzi.join(" + ") : "nessuna agevolazione";
      const ultimo = sequenza[sequenza.length - 1];
      if (ultimo && ultimo.etichetta === etichetta) {
        ultimo.a = m.mese;
        ultimo.totale = arrotonda(ultimo.totale + m.totale);
      } else {
        sequenza.push({ da: m.mese, a: m.mese, etichetta, totale: arrotonda(m.totale) });
      }
    }

    const perAnno = [];
    for (let a = 0; a * 12 < orizzonteMesi; a++) {
      const fetta = mesi.slice(a * 12, (a + 1) * 12);
      perAnno.push({
        anno: a + 1,
        totale: arrotonda(fetta.reduce((s, m) => s + m.totale, 0))
      });
    }

    return {
      mesi, sequenza, perAnno, scartate,
      totaleCassa: arrotonda(mesi.reduce((s, m) => s + m.totale, 0))
    };
  }

  /* ==========================================================================
   * API PUBBLICA
   * ========================================================================*/

  /**
   * Analisi completa di un profilo di assunzione.
   *
   * @param profilo  dati del lavoratore, dell'azienda e delle condizioni
   * @param opzioni  { orizzonteMesi, opzioniCosto }
   */
  function analizza(profilo, opzioni) {
    const o = Object.assign({ orizzonteMesi: PD.CONVENZIONI.orizzonteProiezioneMesi },
                            opzioni || {});
    const orizzonte = o.orizzonteMesi;

    const opzioniCosto = Object.assign({
      mensilita: profilo.mensilita || 13,
      settore: profilo.settore || "commercio",
      aliquotaDatore: profilo.aliquotaDatore != null ? profilo.aliquotaDatore : null,
      tassoInail: profilo.tassoInail != null ? profilo.tassoInail : PD.INAIL.tassoDefault,
      tipoContratto: profilo.tipoContratto || "indeterminato",
      dipendentiAzienda: profilo.dipendentiAzienda,
      annoApprendistato: profilo.annoApprendistato || 1,
      rinnoviTempoDeterminato: profilo.rinnoviTempoDeterminato || 0
    }, o.opzioniCosto || {});

    const costo = COSTO.calcolaCostoAzienda(profilo.ral, opzioniCosto);
    const condizioni = valutaCondizioniGenerali(profilo);

    const valutazioni = A.MISURE.map((m) => valutaMisura(m, profilo, costo, orizzonte));
    const piano = costruisciPiano(valutazioni, orizzonte);

    const fiscali = valutazioni
      .filter((v) => eFiscale(v) && (v.stato === "eleggibile" || v.stato === "da-chiarire"))
      .map((v) => ({
        id: v.id, nome: v.nome, stato: v.stato, norma: v.norma,
        beneficio: v.beneficioFiscale, nota: v.massimaleNota
      }));

    /* Le domande aperte sono il vero output operativo per chi lavora la
       pratica: ogni riga è un dato da recuperare, con accanto quanto vale
       recuperarlo. È la lista con cui si prende il telefono. */
    const domandeAperte = [];
    const visti = new Set();
    for (const v of valutazioni) {
      if (v.stato !== "da-chiarire") continue;
      for (const r of v.requisitiIgnoti) {
        const chiave = r.id + "|" + r.label;
        const esistente = visti.has(chiave)
          ? domandeAperte.find((d) => d.chiave === chiave) : null;
        if (esistente) {
          esistente.valoreInGioco = arrotonda(esistente.valoreInGioco + v.totaleOrizzonte);
          esistente.misure.push(v.nome);
        } else {
          visti.add(chiave);
          domandeAperte.push({
            chiave, id: r.id, domanda: r.label, spiegazione: r.spiegazione,
            valoreInGioco: v.totaleOrizzonte, misure: [v.nome]
          });
        }
      }
    }
    for (const c of condizioni.ignote) {
      domandeAperte.push({
        chiave: "generale|" + c.id, id: c.id, domanda: c.label,
        spiegazione: c.spiegazione,
        valoreInGioco: piano.totaleCassa, misure: ["tutte le misure"],
        bloccante: true
      });
    }
    domandeAperte.sort((a, b) => b.valoreInGioco - a.valoreInGioco);

    const costoNetto = arrotonda(costo.costoTotale - (piano.perAnno[0] ? piano.perAnno[0].totale : 0));

    return {
      profilo, orizzonteMesi: orizzonte,
      costo,
      condizioniGenerali: condizioni,
      misure: valutazioni,
      piano,
      fiscali,
      domandeAperte,
      sintesi: {
        costoLordoAnnuo: costo.costoTotale,
        risparmioPrimoAnno: piano.perAnno[0] ? piano.perAnno[0].totale : 0,
        risparmioTotaleOrizzonte: piano.totaleCassa,
        costoNettoPrimoAnno: costoNetto,
        incidenzaRisparmioPrimoAnno: costo.costoTotale > 0
          ? (piano.perAnno[0] ? piano.perAnno[0].totale : 0) / costo.costoTotale : 0,
        beneficioFiscaleAnnuo: fiscali.reduce(
          (s, f) => s + (f.beneficio ? f.beneficio.risparmioImposta : 0), 0),
        misureEleggibili: valutazioni.filter((v) => v.stato === "eleggibile").length,
        misureDaChiarire: valutazioni.filter((v) => v.stato === "da-chiarire").length,
        condizioniGeneraliOk: condizioni.esito
      }
    };
  }

  /**
   * Confronta più scenari di assunzione per lo stesso ruolo.
   *
   * È la funzione che risponde alla domanda di chi deve decidere, e non a
   * quella di chi deve solo calcolare: «a parità di ruolo, quale profilo o
   * quale forma contrattuale mi costa meno?». Ordina per costo netto, non per
   * risparmio: un risparmio grande su un costo grande resta un costo grande,
   * ed è l'errore di lettura più comune davanti a una tabella di incentivi.
   */
  function confrontaScenari(scenari, opzioni) {
    const risultati = scenari.map((s) => {
      const a = analizza(s.profilo, opzioni);
      return {
        etichetta: s.etichetta,
        costoLordo: a.costo.costoTotale,
        risparmioPrimoAnno: a.sintesi.risparmioPrimoAnno,
        costoNettoPrimoAnno: a.sintesi.costoNettoPrimoAnno,
        risparmioOrizzonte: a.sintesi.risparmioTotaleOrizzonte,
        misuraPrincipale: a.piano.sequenza[0] ? a.piano.sequenza[0].etichetta : "nessuna",
        condizioni: a.condizioniGenerali.esito,
        analisi: a
      };
    });
    risultati.sort((x, y) => x.costoNettoPrimoAnno - y.costoNettoPrimoAnno);
    const migliore = risultati[0];
    const peggiore = risultati[risultati.length - 1];
    return {
      risultati,
      migliore: migliore ? migliore.etichetta : null,
      delta: migliore && peggiore
        ? arrotonda(peggiore.costoNettoPrimoAnno - migliore.costoNettoPrimoAnno) : 0
    };
  }

  globalThis.AGEV = {
    analizza,
    confrontaScenari,
    valutaCondizioniGenerali,
    valutaMisura,
    MISURE: A.MISURE,
    REGOLE_CUMULO: A.REGOLE_CUMULO
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.AGEV;
}
