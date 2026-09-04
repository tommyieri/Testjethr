"use strict";
/* ============================================================================
 * INTERFACCIA DELLA CONSOLE COST-SAVING
 *
 * Solo presentazione: legge i moduli, non calcola nulla. Se qui dentro
 * comparisse una formula fiscale sarebbe un bug, perché diventerebbe la
 * seconda copia di una regola che vive già altrove e prima o poi
 * divergerebbe.
 *
 * La scheda «Metodo e limiti» è generata dai dati del ruleset e non scritta a
 * mano, per lo stesso motivo: una pagina di documentazione compilata a mano
 * inizia a mentire il giorno in cui qualcuno cambia un parametro e si
 * dimentica di aggiornarla.
 * ==========================================================================*/

(() => {

  const PD = globalThis.PARAMETRI_DATORE_2026;
  const A  = globalThis.AGEVOLAZIONI_2026;
  const AGEV = globalThis.AGEV;
  const COSTO = globalThis.COSTO;

  /* ---------------- formattazione ---------------- */
  const nf0 = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const eur = (n) => nf0.format(Math.round(n || 0)) + " €";
  const eur2 = (n) => nf2.format(n || 0) + " €";
  const pc = (n, d) => (100 * (n || 0)).toFixed(d == null ? 1 : d).replace(".", ",") + "%";
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const el = (id) => document.getElementById(id);
  const val = (id) => el(id) ? el(id).value : "";
  const num = (id) => {
    const v = val(id);
    if (v === "" || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  /** I tre stati del menu «Sì / No / Non lo so» diventano true / false / null.
   *  È il ponte fra la tri-valenza dell'interfaccia e quella dei predicati. */
  const tri = (id) => {
    const v = val(id);
    if (v === "si") return true;
    if (v === "no") return false;
    return null;
  };

  const REGIONI = [
    "Abruzzo","Basilicata","Calabria","Campania","Emilia-Romagna",
    "Friuli-Venezia Giulia","Lazio","Liguria","Lombardia","Marche","Molise",
    "Piemonte","Puglia","Sardegna","Sicilia","Toscana","Trentino-Alto Adige",
    "Umbria","Valle d'Aosta","Veneto"
  ];

  const badgeConf = (c) =>
    '<span class="conf conf-' + esc(c) + '">' + esc(
      c === "certa" ? "parametro certo" :
      c === "alta" ? "confidenza alta" :
      c === "tipica" ? "valore tipico" :
      c === "media" ? "confidenza media" : "da verificare") + "</span>";

  /* ---------------- popolamento dei menu ---------------- */
  function popolaSettori(id) {
    const s = el(id);
    if (!s) return;
    s.innerHTML = Object.keys(PD.CONTRIBUTI_DATORE.settori).map((k) => {
      const v = PD.CONTRIBUTI_DATORE.settori[k];
      return '<option value="' + k + '"' + (k === "commercio" ? " selected" : "") +
             ">" + esc(v.label) + " — " + pc(v.aliquota, 2) + "</option>";
    }).join("");
  }
  function popolaRegioni(id, sel) {
    const s = el(id);
    if (!s) return;
    s.innerHTML = REGIONI.map((r) =>
      '<option value="' + esc(r) + '"' + (r === sel ? " selected" : "") + ">" +
      esc(r) + "</option>").join("");
  }

  /* ==========================================================================
   * LETTURA DEL PROFILO
   * ========================================================================*/
  function leggiProfilo() {
    const naspi = tri("f-naspi");
    return {
      ral: num("f-ral") || 0,
      mensilita: num("f-mensilita") || 13,
      settore: val("f-settore") || "commercio",
      aliquotaDatore: num("f-aliquota") != null ? num("f-aliquota") / 100 : null,
      tassoInail: (num("f-inail") || 0) / 100,
      dipendentiAzienda: num("f-dipendenti"),
      tipoContratto: val("f-contratto") || "indeterminato",
      qualifica: val("f-qualifica") || "impiegato",
      dataAssunzione: val("f-data") || null,
      partTime: val("f-parttime") === "si",
      regione: val("f-regione") || null,
      eta: num("f-eta"),
      sesso: val("f-sesso") || "ND",
      mesiSenzaImpiego: num("f-mesi"),
      titoloStudio: val("f-titolo") || null,
      disabilita: val("f-disabilita") || "no",
      percettoreAdiSfl: tri("f-adi"),
      percettoreNaspi: naspi,
      naspiIndennitaMensile: naspi ? (num("f-naspi-imp") || 0) : 0,
      naspiMesiResidui: naspi ? (num("f-naspi-mesi") || 0) : 0,
      figliMinori: num("f-figli") || 0,
      vittimaViolenza: false,
      categoriaTutelata: val("f-disabilita") !== "no" ||
                         ((num("f-figli") || 0) >= 2 && val("f-sesso") === "F"),
      assunzioneDaObbligo: tri("f-c-obbligo"),
      dirittoPrecedenzaAltrui: tri("f-c-precedenza"),
      licenziamentiUltimi6Mesi: tri("f-c-licenziamenti"),
      sospensioniInCorso: tri("f-c-sospensioni"),
      provenienzaDaCollegata: tri("f-c-collegata"),
      durcRegolare: tri("f-c-durc"),
      imponibileCapiente: tri("f-c-imponibile"),
      incrementoOccupazionaleNetto: tri("f-c-incremento")
    };
  }

  /* ==========================================================================
   * RENDER — UNA ASSUNZIONE
   * ========================================================================*/

  function bloccoComposizioneCosto(costo) {
    const colori = { 0: "var(--q-ral)", 1: "var(--q-contributi)", 2: "var(--q-inail)", 3: "var(--q-tfr)" };
    const stack = costo.voci.map((v, i) =>
      '<i style="width:' + (v.quota * 100).toFixed(3) + '%;background:' + colori[i] + '" ' +
      'title="' + esc(v.voce) + ': ' + eur(v.importo) + '"></i>').join("");
    const legenda = costo.voci.map((v, i) =>
      '<span><b style="background:' + colori[i] + '"></b>' + esc(v.voce) +
      ' <span class="amt">' + eur(v.importo) + " · " + pc(v.quota) + "</span></span>").join("");
    return '<div class="card"><h2>Da dove viene il costo</h2>' +
      '<p class="hint">Per ogni euro di retribuzione lorda l\'azienda ne spende ' +
      nf2.format(costo.moltiplicatore).replace(".", ",") + '. ' +
      'Il premio INAIL è la voce che nessun esonero 2026 tocca: è il pavimento.</p>' +
      '<div class="stack" role="img" aria-label="Composizione del costo aziendale">' + stack + "</div>" +
      '<div class="legend">' + legenda + "</div>" +
      '<div class="meta" style="margin-top:14px">' +
      "<span>Aliquota datore applicata: <b>" + pc(costo.aliquotaApplicata, 2) + "</b>" +
      " — quota IVS " + pc(costo.aliquotaIvs, 2) + " (soggetta al massimale di " +
      eur(PD.CONTRIBUTI_DATORE.massimaleAnnuo) + "), altre voci " +
      pc(costo.aliquotaAltre, 2) + " (non soggette)</span>" +
      "<span>Costo mensile medio: <b>" + eur2(costo.costoMensile) + "</b></span>" +
      "</div></div>";
  }

  function bloccoSequenza(r) {
    const max = Math.max.apply(null, r.piano.sequenza.map((s) => s.totale).concat([1]));
    const righe = r.piano.sequenza.map((s) => {
      const vuoto = s.totale <= 0;
      const w = vuoto ? 100 : (s.totale / max * 100);
      const durata = s.a - s.da + 1;
      return '<div class="seq-row"><div class="seq-head">' +
        '<span class="seq-what"><span class="seq-when">mesi ' + s.da + "–" + s.a +
        "</span> " + esc(s.etichetta) + "</span>" +
        '<span class="seq-amt">' + eur(s.totale) + "</span></div>" +
        '<div class="seq-bar' + (vuoto ? " empty" : "") + '"><i style="width:' +
        w.toFixed(2) + '%"></i></div>' +
        '<p class="hint">' + durata + (durata === 1 ? " mese" : " mesi") +
        (vuoto ? " senza copertura" : " · " + eur(s.totale / durata) + " al mese in media") +
        "</p></div>";
    }).join("");

    const perAnno = r.piano.perAnno.map((a) =>
      "<tr><td>Anno " + a.anno + '</td><td class="num">' + eur(a.totale) + "</td></tr>").join("");

    const scartate = r.piano.scartate.length
      ? '<div class="note note-info" style="margin-top:14px"><b>Alternative disponibili ma meno convenienti.</b> ' +
        r.piano.scartate.map((s) => esc(s.nome) + " (" + eur(s.valore) + ")").join(" · ") +
        ". Se il requisito della misura scelta non si riesce a documentare, " +
        "è qui che si ripiega senza ricominciare l'analisi.</div>"
      : "";

    return '<div class="card"><h2>La sequenza ottima sui prossimi ' +
      (r.orizzonteMesi / 12) + " anni</h2>" +
      '<p class="hint">Gli esoneri sulla contribuzione datoriale sono alternativi ' +
      'fra loro nello stesso mese, non nel tempo. Il motore sceglie mese per mese ' +
      'la combinazione che vale più in quel mese: è così che emergono le staffette ' +
      'fra una misura che scade e una che resta.</p>' +
      '<div class="seq">' + righe + "</div>" + scartate +
      '<div class="tw"><table><caption class="sr">Risparmio per anno</caption>' +
      '<thead><tr><th>Periodo</th><th class="num">Risparmio di cassa</th></tr></thead>' +
      "<tbody>" + perAnno +
      '<tr class="best"><td>Totale orizzonte</td><td class="num">' +
      eur(r.piano.totaleCassa) + "</td></tr></tbody></table></div></div>";
  }

  function bloccoMisure(r) {
    const ordine = { "eleggibile": 0, "da-chiarire": 1, "fuori-finestra": 2, "non-eleggibile": 3 };
    const icona = { "eleggibile": "✓", "da-chiarire": "?", "fuori-finestra": "✕", "non-eleggibile": "–" };
    const etichetta = {
      "eleggibile": "Spetta",
      "da-chiarire": "Manca un dato",
      "fuori-finestra": "Finestra chiusa",
      "non-eleggibile": "Non spetta"
    };
    const iconaReq = { "soddisfatto": "✓", "non-soddisfatto": "✕", "ignoto": "?" };

    const items = r.misure.slice()
      .sort((a, b) => (ordine[a.stato] - ordine[b.stato]) || (b.totaleOrizzonte - a.totaleOrizzonte))
      .map((m) => {
        const reqs = m.requisiti.map((q) =>
          "<li>" + '<span class="ic ic-' + q.esito + '">' + iconaReq[q.esito] + "</span>" +
          "<span>" + esc(q.label) +
          (q.spiegazione ? '<span class="why">' + esc(q.spiegazione) + "</span>" : "") +
          "</span></li>").join("");

        const importo = m.famiglia === "deduzione-fiscale"
          ? (m.beneficioFiscale ? eur(m.beneficioFiscale.risparmioImposta) + "/anno" : "")
          : (m.totaleOrizzonte > 0 ? eur(m.totaleOrizzonte) : "");

        return '<details class="misura"><summary>' +
          '<span class="st st-' + m.stato + '" aria-hidden="true">' + icona[m.stato] + "</span>" +
          '<span class="nm">' + esc(m.nome) +
          "<em>" + esc(etichetta[m.stato]) + " · " + esc(m.norma) + "</em></span>" +
          '<span class="amt">' + importo + "</span></summary>" +
          '<div class="body">' +
          "<p>" + esc(m.sintesi) + "</p>" +
          (m.motivoFinestra ? '<div class="note note-bad">' + esc(m.motivoFinestra) + "</div>" : "") +
          "<h4>Requisiti</h4><ul class=\"reqs\">" + reqs + "</ul>" +
          '<div class="meta">' +
          "<span>Norma: <b>" + esc(m.norma) + "</b></span>" +
          (m.prassi ? "<span>Prassi: <b>" + esc(m.prassi) + "</b></span>" : "") +
          "<span>Durata: <b>" + (m.durataMesi || 0) + " mesi</b> — " + esc(m.durataNota || "") + "</span>" +
          (m.massimaleNota ? "<span>Massimali: " + esc(m.massimaleNota) + "</span>" : "") +
          "<span>Cumulo: " + esc(m.cumulabilita ? m.cumulabilita.nota : "") + "</span>" +
          "<span>Aiuti di Stato: " + esc(m.aiutoDiStato || "n.d.") + "</span>" +
          "<span>" + badgeConf(m.confidenza) +
          (m.fonte ? ' <a href="' + esc(m.fonte) + '" rel="noopener">fonte consultata ↗</a>' : "") +
          "</span></div>" +
          (m.adempimenti && m.adempimenti.length
            ? "<h4>Cosa va fatto</h4><ul class=\"plain\">" +
              m.adempimenti.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>" : "") +
          (m.rischi && m.rischi.length
            ? "<h4>Dove si perde</h4><ul class=\"plain\">" +
              m.rischi.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>" : "") +
          "</div></details>";
      }).join("");

    return '<div class="card"><h2>Le dieci misure, una per una</h2>' +
      '<p class="hint">Per ogni misura è visibile non solo l\'esito ma il ' +
      'perché: quale requisito manca, quale dato non ho, quale norma lo dice. ' +
      'Un «non spetta» senza motivo non è una risposta utilizzabile.</p>' +
      '<div style="margin-top:14px">' + items + "</div></div>";
  }

  function bloccoDomande(r) {
    if (!r.domandeAperte.length) {
      return '<div class="card"><h2>Domande aperte</h2>' +
        '<div class="note note-ok">Nessuna. Tutti i requisiti delle misure ' +
        'considerate sono determinati dai dati inseriti.</div></div>';
    }
    const righe = r.domandeAperte.map((d) =>
      '<div class="ask"><div class="q"><b>' + esc(d.domanda) + "</b>" +
      (d.spiegazione ? "<em>" + esc(d.spiegazione) + "</em>" : "") +
      "<em>Serve per: " + esc(d.misure.join(", ")) +
      (d.bloccante ? " — condizione generale, blocca tutto" : "") + "</em></div>" +
      '<div class="v"><b>' + eur(d.valoreInGioco) + "</b><em>in gioco</em></div></div>").join("");

    return '<div class="card"><h2>Domande aperte, ordinate per valore</h2>' +
      '<p class="hint">Questa è la lista con cui si prende il telefono. Ogni riga ' +
      'è un dato che non ho, con accanto quanto vale recuperarlo. È l\'output ' +
      'operativo del motore: dice dove conviene spendere dieci minuti.</p>' +
      '<div style="margin-top:10px">' + righe + "</div></div>";
  }

  function renderAssunzione() {
    const out = el("out-assunzione");
    if (!out) return;
    const profilo = leggiProfilo();

    if (!profilo.ral || profilo.ral <= 0) {
      out.innerHTML = '<div class="card"><div class="note note-warn">' +
        "Inserisci una retribuzione annua lorda maggiore di zero.</div></div>";
      return;
    }

    let r;
    try {
      r = AGEV.analizza(profilo, { orizzonteMesi: 60 });
    } catch (e) {
      out.innerHTML = '<div class="card"><div class="note note-bad">' +
        esc(e.message) + "</div></div>";
      return;
    }

    const s = r.sintesi;
    const cg = r.condizioniGenerali;
    const classeAvviso = cg.esito === "bloccato" ? "note-bad"
                       : cg.esito === "da-verificare" ? "note-warn" : "note-ok";

    const kpis = '<div class="card"><h2>Il risultato</h2>' +
      '<div class="kpis" style="margin-top:14px">' +
      '<div class="kpi"><div class="lab">Costo azienda, anno 1</div>' +
      '<div class="val">' + eur(s.costoLordoAnnuo) + "</div>" +
      '<div class="cap">senza agevolazioni</div></div>' +
      '<div class="kpi good"><div class="lab">Risparmio anno 1</div>' +
      '<div class="val">' + eur(s.risparmioPrimoAnno) + "</div>" +
      '<div class="cap">' + pc(s.incidenzaRisparmioPrimoAnno) + " del costo</div></div>" +
      '<div class="kpi accent"><div class="lab">Costo netto, anno 1</div>' +
      '<div class="val">' + eur(s.costoNettoPrimoAnno) + "</div>" +
      '<div class="cap">è il numero da mettere a budget</div></div>' +
      '<div class="kpi"><div class="lab">Risparmio su 5 anni</div>' +
      '<div class="val">' + eur(s.risparmioTotaleOrizzonte) + "</div>" +
      '<div class="cap">cassa, esclusa la leva fiscale</div></div>' +
      "</div>" +
      (s.beneficioFiscaleAnnuo > 0
        ? '<div class="note note-info" style="margin-top:14px"><b>Più ' +
          eur(s.beneficioFiscaleAnnuo) + " l'anno di leva fiscale.</b> " +
          "La maxi-deduzione non è cassa e non arriva in cedolino: riduce " +
          "l'imposta in dichiarazione, quindi vale l'anno dopo e vale zero se " +
          "l'azienda è in perdita fiscale. Per questo è tenuta fuori dai numeri " +
          "sopra invece di essere sommata.</div>"
        : "") +
      '<div class="note ' + classeAvviso + '" style="margin-top:14px"><b>' +
      (cg.esito === "bloccato" ? "Attenzione: " : cg.esito === "da-verificare" ? "Da verificare: " : "") +
      "</b>" + esc(cg.messaggio) + " (" + esc(cg.norma) + ")</div>" +
      "</div>";

    out.innerHTML = kpis + bloccoSequenza(r) + bloccoComposizioneCosto(r.costo) +
                    bloccoDomande(r) + bloccoMisure(r);
    renderScenari(profilo);
  }

  /* ==========================================================================
   * RENDER — EFFICIENZA DELL'EURO
   * ========================================================================*/
  function renderCanali() {
    const out = el("out-canali");
    if (!out) return;
    const ral = num("c-ral") || 0;
    const budget = num("c-budget") || 0;
    const figli = num("c-figli") || 0;

    if (ral <= 0 || budget <= 0) {
      out.innerHTML = '<div class="card"><div class="note note-warn">' +
        "Servono una RAL e un budget maggiori di zero.</div></div>";
      return;
    }

    const r = COSTO.confrontaCanali(ral, budget, {
      mensilita: 13,
      settore: val("c-settore") || "commercio",
      tassoInail: (num("c-inail") || 0) / 100,
      figliACarico: figli > 0,
      opzioniNetto: { mensilita: 13, figli: figli }
    });

    const a = r.allocazione;
    const kpis = '<div class="card"><h2>Lo stesso costo, due risultati diversi</h2>' +
      '<div class="kpis" style="margin-top:14px">' +
      '<div class="kpi"><div class="lab">Tutto in aumento di RAL</div>' +
      '<div class="val">' + eur(a.baselineSoloAumento) + "</div>" +
      '<div class="cap">netto che arriva alla persona</div></div>' +
      '<div class="kpi good"><div class="lab">Con il mix ottimo</div>' +
      '<div class="val">' + eur(a.nettoTotale) + "</div>" +
      '<div class="cap">' + pc(a.efficienza) + " del budget arriva a destinazione</div></div>" +
      '<div class="kpi accent"><div class="lab">Differenza</div>' +
      '<div class="val">+' + eur(a.guadagnoVsBaseline) + "</div>" +
      '<div class="cap">' + nf2.format(a.rapportoVsBaseline).replace(".", ",") +
      "× a parità di costo azienda</div></div>" +
      "</div>" +
      '<p class="hint" style="margin-top:14px">' +
      "L'azienda spende " + eur(budget) + " in entrambi i casi. Cambia solo il " +
      "canale. Nessun requisito soggettivo, nessuna risorsa contingentata, " +
      "nessuna scadenza: e a differenza degli incentivi all'assunzione questa " +
      "leva si applica a tutto l'organico, non solo a chi entra.</p></div>";

    const mix = '<div class="card"><h3>Come spacchettare ' + eur(budget) + "</h3>" +
      '<p class="hint">Riempimento in ordine di efficienza, rispettando i tetti. ' +
      'Premio in denaro e premio convertito in welfare pescano dallo stesso ' +
      'plafond, il fringe benefit ha il suo: per questo i due si sommano davvero.</p>' +
      '<div class="tw"><table><thead><tr><th>Canale</th>' +
      '<th class="num">Costo azienda</th><th class="num">Netto alla persona</th>' +
      '</tr></thead><tbody>' +
      a.mix.map((m) => "<tr><td>" + esc(m.nome) + '</td><td class="num">' +
        eur(m.costoAzienda) + '</td><td class="num">' + eur(m.nettoLavoratore) +
        "</td></tr>").join("") +
      '<tr class="best"><td>Totale</td><td class="num">' + eur(budget) +
      '</td><td class="num">' + eur(a.nettoTotale) + "</td></tr>" +
      "</tbody></table></div></div>";

    const canali = '<div class="card"><h3>I quattro canali, in ordine di efficienza</h3>' +
      r.canali.map((c, i) => {
        const cls = i === 0 ? "chan top" : "chan";
        return '<div class="' + cls + '" style="margin-top:12px">' +
          '<div class="chan-head"><b>' + esc(c.nome) + "</b>" +
          '<span class="eff">' + pc(c.efficienza) + "</span></div>" +
          '<div class="bar"><i style="width:' + (c.efficienza * 100).toFixed(1) + '%"></i></div>' +
          "<dl>" +
          "<dt>Costo azienda</dt><dd>" + eur(c.costoAzienda) + "</dd>" +
          "<dt>Netto alla persona</dt><dd>" + eur(c.nettoLavoratore) + "</dd>" +
          (c.tetto ? "<dt>Tetto annuo</dt><dd>" + eur(c.tetto) + "</dd>" : "") +
          "<dt>Requisiti</dt><dd>" + esc(c.requisiti) + "</dd>" +
          "</dl>" +
          '<p class="txt">' + esc(c.nota) + "</p></div>";
      }).join("") + "</div>";

    out.innerHTML = kpis + mix + canali;
  }

  /* ==========================================================================
   * RENDER — CONFRONTO SCENARI
   *
   * Gli scenari non sono scritti a mano: si generano variando il profilo
   * corrente un pezzo per volta. Così il confronto resta agganciato ai dati
   * che l'utente ha appena inserito invece di essere una demo con numeri finti.
   * ========================================================================*/
  function renderScenari(base) {
    const out = el("out-scenari");
    if (!out) return;
    const clona = (p) => Object.assign({}, base, p);

    const scenari = [
      { etichetta: "Il caso come lo hai descritto", profilo: clona({}) },
      { etichetta: "Stessa persona, ma a tempo determinato", profilo: clona({ tipoContratto: "determinato" }) },
      { etichetta: "Stessa persona, in apprendistato professionalizzante", profilo: clona({ tipoContratto: "apprendistato" }) },
      { etichetta: "Profilo equivalente, ma donna", profilo: clona({ sesso: "F" }) },
      { etichetta: "Profilo equivalente, unità produttiva in Campania", profilo: clona({ regione: "Campania" }) },
      { etichetta: "Profilo equivalente, con NASpI residua da 8 mesi", profilo: clona({ percettoreNaspi: true, naspiIndennitaMensile: 1100, naspiMesiResidui: 8, partTime: false }) },
      { etichetta: "Profilo equivalente, percettore di ADI o SFL", profilo: clona({ percettoreAdiSfl: true }) }
    ];

    let r;
    try {
      r = AGEV.confrontaScenari(scenari, { orizzonteMesi: 60 });
    } catch (e) {
      out.innerHTML = '<div class="note note-bad">' + esc(e.message) + "</div>";
      return;
    }

    const righe = r.risultati.map((x, i) =>
      '<tr' + (i === 0 ? ' class="best"' : "") + "><td>" + esc(x.etichetta) + "</td>" +
      '<td class="num">' + eur(x.costoLordo) + "</td>" +
      '<td class="num">' + eur(x.risparmioPrimoAnno) + "</td>" +
      '<td class="num"><b>' + eur(x.costoNettoPrimoAnno) + "</b></td>" +
      '<td class="num">' + eur(x.risparmioOrizzonte) + "</td>" +
      "<td>" + esc(x.misuraPrincipale) + "</td></tr>").join("");

    out.innerHTML =
      '<div class="tw"><table><thead><tr><th>Scenario</th>' +
      '<th class="num">Costo lordo</th><th class="num">Risparmio anno 1</th>' +
      '<th class="num">Costo netto anno 1</th><th class="num">Risparmio 5 anni</th>' +
      "<th>Misura che vince</th></tr></thead><tbody>" + righe + "</tbody></table></div>" +
      '<div class="note note-info" style="margin-top:16px"><b>Divario fra la ' +
      "scelta migliore e la peggiore: " + eur(r.delta) + " nel solo primo anno.</b> " +
      "È la cifra che giustifica l'esistenza di questo strumento. Non nasce da " +
      "una trattativa sullo stipendio: nasce da come il rapporto viene " +
      "impostato il giorno in cui si firma, e da lì in avanti non si recupera più.</div>" +
      '<p class="hint" style="margin-top:14px">Gli scenari sono generati variando ' +
      "il profilo della scheda «Una assunzione» un elemento per volta: cambiando " +
      "i dati lì, questa tabella si aggiorna.</p>";
  }

  /* ==========================================================================
   * RENDER — SCAN DELL'ORGANICO
   * ========================================================================*/
  const ORGANICO_ESEMPIO = [
    "Sara Bianchi; 28000; 31; F; Campania; 30; 40",
    "Marco Ferro; 35000; 44; M; Campania; 8; 60",
    "Luca Verdi; 24000; 26; M; Campania; 14; 6",
    "Anna Russo; 31000; 52; F; Campania; 28; 18",
    "Paolo Neri; 45000; 38; M; Lombardia; 4; 72",
    "Elisa Conti; 27000; 29; F; Lombardia; 26; 3"
  ].join("\n");

  function parseOrganico(testo) {
    return testo.split(/\r?\n/).map((riga) => riga.trim())
      .filter((riga) => riga.length > 0 && riga.indexOf(";") !== -1)
      .map((riga, i) => {
        const c = riga.split(";").map((x) => x.trim());
        const n = (v) => { const x = Number(v); return Number.isFinite(x) && v !== "" ? x : null; };
        return {
          riga: i + 1,
          nome: c[0] || "riga " + (i + 1),
          ral: n(c[1]) || 0,
          eta: n(c[2]),
          sesso: (c[3] || "ND").toUpperCase() === "F" ? "F"
               : (c[3] || "ND").toUpperCase() === "M" ? "M" : "ND",
          regione: c[4] || null,
          mesiSenzaImpiego: n(c[5]),
          anzianitaMesi: n(c[6]) || 0
        };
      });
  }

  function renderOrganico() {
    const out = el("out-organico");
    if (!out) return;
    const persone = parseOrganico(val("o-dati"));

    if (!persone.length) {
      out.innerHTML = '<div class="card"><div class="note note-info">' +
        "Incolla l'organico nel riquadro a sinistra, oppure carica l'esempio. " +
        "Il formato è quello che esce da qualunque export paghe: una riga per " +
        "persona, campi separati da punto e virgola.</div></div>";
      return;
    }

    const settore = val("o-settore") || "commercio";
    const dipendenti = num("o-dipendenti");

    /* Sull'organico esistente l'analisi è diversa da quella di una nuova
       assunzione, e va detto: gli incentivi all'assunzione sono ormai
       impraticabili per chi è già dentro, perché la finestra si valuta alla
       data di assunzione. Quello che resta disponibile è la parte
       strutturale — Decontribuzione Sud in testa — e va cercata proprio lì. */
    const righe = persone.map((p) => {
      const profilo = {
        ral: p.ral, mensilita: 13, settore: settore,
        aliquotaDatore: null, tassoInail: PD.INAIL.tassoDefault,
        dipendentiAzienda: dipendenti, tipoContratto: "indeterminato",
        qualifica: "impiegato", partTime: false,
        dataAssunzione: null, regione: p.regione,
        eta: p.eta, sesso: p.sesso, mesiSenzaImpiego: p.mesiSenzaImpiego,
        titoloStudio: null, disabilita: "no",
        percettoreAdiSfl: false, percettoreNaspi: false,
        naspiIndennitaMensile: 0, naspiMesiResidui: 0, figliMinori: 0,
        vittimaViolenza: false, categoriaTutelata: false,
        assunzioneDaObbligo: false, dirittoPrecedenzaAltrui: false,
        licenziamentiUltimi6Mesi: false, sospensioniInCorso: false,
        provenienzaDaCollegata: false, durcRegolare: true,
        imponibileCapiente: null, incrementoOccupazionaleNetto: null
      };
      const r = AGEV.analizza(profilo, { orizzonteMesi: 12 });
      const strutturale = r.misure.find((m) => m.id === "decontribuzione-sud-pmi");
      return {
        p, r,
        strutturale: strutturale && strutturale.totaleOrizzonte > 0 ? strutturale : null,
        recuperabile: strutturale ? strutturale.totaleOrizzonte : 0
      };
    });

    const totale = righe.reduce((s, x) => s + x.recuperabile, 0);
    const costoTot = righe.reduce((s, x) => s + x.r.costo.costoTotale, 0);
    const conRecupero = righe.filter((x) => x.recuperabile > 0).length;

    const tabella = righe
      .slice().sort((a, b) => b.recuperabile - a.recuperabile)
      .map((x) => "<tr" + (x.recuperabile > 0 ? ' class="best"' : "") + "><td>" +
        esc(x.p.nome) + "</td>" +
        '<td class="num">' + eur(x.p.ral) + "</td>" +
        "<td>" + esc(x.p.regione || "—") + "</td>" +
        '<td class="num">' + eur(x.r.costo.costoTotale) + "</td>" +
        '<td class="num"><b>' + (x.recuperabile > 0 ? eur(x.recuperabile) : "—") + "</b></td>" +
        "<td>" + (x.strutturale ? esc(x.strutturale.nome) : "nessuna misura strutturale applicabile") +
        "</td></tr>").join("");

    out.innerHTML =
      '<div class="card"><h2>Quanto resta sul tavolo, oggi</h2>' +
      '<div class="kpis" style="margin-top:14px">' +
      '<div class="kpi"><div class="lab">Persone analizzate</div><div class="val">' +
      persone.length + '</div><div class="cap">costo aggregato ' + eur(costoTot) + "</div></div>" +
      '<div class="kpi good"><div class="lab">Recuperabile in 12 mesi</div><div class="val">' +
      eur(totale) + '</div><div class="cap">senza assumere nessuno</div></div>' +
      '<div class="kpi accent"><div class="lab">Persone interessate</div><div class="val">' +
      conRecupero + " su " + persone.length + '</div><div class="cap">su cui agire</div></div>' +
      "</div>" +
      '<div class="note note-warn" style="margin-top:14px"><b>Perché qui compaiono ' +
      "solo le misure strutturali.</b> Le finestre dei bonus assunzione si " +
      "valutano alla data di assunzione: per chi è già in azienda sono chiuse. " +
      "Quello che resta disponibile sullo stock è la parte non legata a un " +
      "evento, la Decontribuzione Sud in testa — ed è esattamente la misura che " +
      "resta più spesso non richiesta, proprio perché nessuno la va a cercare " +
      "quando non c'è un'assunzione da festeggiare.</div>" +
      '<div class="tw"><table><thead><tr><th>Persona</th><th class="num">RAL</th>' +
      '<th>Regione</th><th class="num">Costo azienda</th>' +
      '<th class="num">Recuperabile</th><th>Misura</th></tr></thead><tbody>' +
      tabella + "</tbody></table></div></div>";
  }

  /* ==========================================================================
   * RENDER — METODO E LIMITI, generato dai dati
   * ========================================================================*/
  function renderMetodo() {
    const out = el("out-metodo");
    if (!out) return;

    const misure = A.MISURE.map((m) =>
      "<tr><td><b>" + esc(m.nome) + "</b></td><td>" + esc(m.norma) + "</td>" +
      "<td>" + esc(m.prassi || "—") + "</td>" +
      "<td>" + (m.finestra ? esc(m.finestra.da + " → " + m.finestra.a) : "strutturale") + "</td>" +
      "<td>" + badgeConf(m.confidenza) + "</td></tr>").join("");

    const parametri = [
      ["Quota IVS a carico azienda", pc(PD.CONTRIBUTI_DATORE.ivs, 2), PD.CONTRIBUTI_DATORE.ivsConfidenza],
      ["Massimale contributivo annuo", eur(PD.CONTRIBUTI_DATORE.massimaleAnnuo), PD.CONTRIBUTI_DATORE.massimaleConfidenza],
      ["Addizionale tempo determinato", pc(PD.CONTRIBUTI_DATORE.addizionaleTempoDeterminato, 2), PD.CONTRIBUTI_DATORE.addizionaleTempoDeterminatoConfidenza],
      ["Quota TFR annua", pc(PD.TFR.quotaAnnua, 2), PD.TFR.confidenza],
      ["Tasso INAIL di default", pc(PD.INAIL.tassoDefault, 2), PD.INAIL.confidenza],
      ["Apprendistato, aliquota standard", pc(PD.APPRENDISTATO.aliquotaStandard, 2), PD.APPRENDISTATO.confidenza],
      ["Soglia fringe benefit", eur(PD.CANALI_RETRIBUZIONE.fringeBenefit.sogliaBase) + " / " + eur(PD.CANALI_RETRIBUZIONE.fringeBenefit.sogliaConFigli), PD.CANALI_RETRIBUZIONE.fringeBenefit.confidenza],
      ["Premio di risultato, imposta sostitutiva", pc(PD.CANALI_RETRIBUZIONE.premioRisultato.aliquotaSostitutiva, 0) + " su " + eur(PD.CANALI_RETRIBUZIONE.premioRisultato.tettoAnnuo), PD.CANALI_RETRIBUZIONE.premioRisultato.confidenza],
      ["Maxi-deduzione, maggiorazione", pc(PD.MAXI_DEDUZIONE.maggiorazioneBase, 0) + " / " + pc(PD.MAXI_DEDUZIONE.maggiorazioneCategorieTutelate, 0), PD.MAXI_DEDUZIONE.confidenza]
    ].map((p) => "<tr><td>" + esc(p[0]) + '</td><td class="num">' + p[1] +
      "</td><td>" + badgeConf(p[2]) + "</td></tr>").join("");

    const settori = Object.keys(PD.CONTRIBUTI_DATORE.settori).map((k) => {
      const s = PD.CONTRIBUTI_DATORE.settori[k];
      return "<tr><td>" + esc(s.label) + '</td><td class="num">' + pc(s.aliquota, 2) +
        "</td><td>" + badgeConf(s.confidenza) + "</td><td>" + esc(s.nota || "") + "</td></tr>";
    }).join("");

    out.innerHTML =
      '<div class="card"><h2>Come è fatto</h2>' +
      "<p>Sei file, nessuna dipendenza, nessun passo di build. " +
      "I parametri stanno separati dalla logica, e la logica del costo sta " +
      "separata da quella delle agevolazioni: cambiare anno significa toccare " +
      "i file di parametri, cambiare una norma significa toccare il ruleset, e " +
      "in nessuno dei due casi si rilegge una riga di motore.</p>" +
      '<div class="meta" style="margin-top:14px;font-family:var(--mono);font-size:12.5px">' +
      "<span>parametri-2026.js · parametri fiscali lato dipendente</span>" +
      "<span>calcolo.js · motore dalla RAL al netto</span>" +
      "<span>parametri-datore-2026.js · parametri di costo lato azienda</span>" +
      "<span>agevolazioni-2026.js · il ruleset normativo, come dati</span>" +
      "<span>costo-azienda.js · motore del costo e dei canali</span>" +
      "<span>motore-agevolazioni.js · eleggibilità, cumulo e sequenza ottima</span>" +
      "</div></div>" +

      '<div class="card"><h2>La legenda della confidenza</h2>' +
      "<p>Ogni parametro dichiara quanto è affidabile. Non è un vezzo: lato " +
      "azienda molti valori dipendono da CCNL, settore e posizione INPS, e non " +
      "esiste un numero unico corretto per tutti. Un motore che finge il " +
      "contrario produce risultati autorevoli e sbagliati, che è il modo " +
      "peggiore di sbagliare.</p>" +
      '<div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">' +
      badgeConf("certa") + badgeConf("tipica") + badgeConf("daVerificare") + "</div>" +
      '<ul class="plain" style="margin-top:12px">' +
      "<li><b>Parametro certo</b>: valore di legge, univoco.</li>" +
      "<li><b>Valore tipico</b>: ricorrente sul mercato, ma da confermare sul flusso UniEmens dell'azienda.</li>" +
      "<li><b>Da verificare</b>: ordine di grandezza, va sostituito con il dato reale prima di usarlo.</li>" +
      "</ul></div>" +

      '<div class="card"><h2>Le misure e le loro fonti</h2>' +
      '<div class="tw"><table><thead><tr><th>Misura</th><th>Norma</th>' +
      "<th>Prassi</th><th>Finestra</th><th>Confidenza</th></tr></thead><tbody>" +
      misure + "</tbody></table></div></div>" +

      '<div class="card"><h2>I parametri di costo</h2>' +
      '<div class="tw"><table><thead><tr><th>Parametro</th><th class="num">Valore</th>' +
      "<th>Confidenza</th></tr></thead><tbody>" + parametri + "</tbody></table></div>" +
      "<h3 style=\"margin-top:20px\">Preset per settore</h3>" +
      '<p class="hint">Sono punti di partenza modificabili, non valori di legge. ' +
      "L'aliquota vera si legge sul flusso contributivo dell'azienda.</p>" +
      '<div class="tw"><table><thead><tr><th>Settore</th><th class="num">Aliquota datore</th>' +
      "<th>Confidenza</th><th>Nota</th></tr></thead><tbody>" + settori +
      "</tbody></table></div></div>" +

      '<div class="card"><h2>Le regole di cumulo</h2>' +
      "<p>" + esc(A.REGOLE_CUMULO.principio) + "</p>" +
      '<ul class="plain" style="margin-top:10px">' +
      A.REGOLE_CUMULO.eccezioni.map((x) => "<li>" + esc(x.descrizione) + "</li>").join("") +
      "</ul>" +
      '<div class="note note-warn" style="margin-top:14px">' + esc(A.REGOLE_CUMULO.avvertenza) +
      "</div></div>" +

      '<div class="card"><h2>Cosa non copre</h2>' +
      "<p>Un limite dichiarato vale più di una copertura apparente.</p>" +
      '<ul class="plain" style="margin-top:10px">' +
      "<li><b>Contrattazione collettiva.</b> Nessun CCNL. Minimi tabellari, scatti " +
      "di anzianità, elementi di garanzia retributiva e imponibilità delle singole " +
      "voci non sono modellati: la retribuzione è un numero che si inserisce.</li>" +
      "<li><b>Incentivi regionali e camerali.</b> Il ruleset copre le misure " +
      "nazionali. Le misure regionali sono decine, hanno bandi con finestre " +
      "proprie e sportelli propri: è l'estensione naturale, ed è un lavoro di " +
      "raccolta continua più che di modellazione.</li>" +
      "<li><b>Capienza dei plafond.</b> Diverse misure hanno risorse " +
      "contingentate e funzionano a prenotazione. Il motore dice se il " +
      "requisito c'è, non se al momento della domanda ci saranno ancora fondi.</li>" +
      "<li><b>Cadenza reale del recupero.</b> Gli esoneri si espongono in " +
      "UniEmens mese per mese, gli incentivi economici arrivano in conguaglio " +
      "con tempi propri. Qui il beneficio è collocato nel mese di competenza, " +
      "non in quello di effettivo incasso.</li>" +
      "<li><b>Apprendistato di primo e terzo livello.</b> Modellato solo il " +
      "professionalizzante, che è il caso di gran lunga più frequente.</li>" +
      "<li><b>Interpretazioni sul cumulo.</b> Il motore adotta l'ipotesi " +
      "prudente e la dichiara. Su un caso reale va confermata con il consulente " +
      "del lavoro prima di firmare.</li>" +
      "</ul></div>";
  }

  /* ==========================================================================
   * SCHEDE
   * ========================================================================*/
  function attivaSchede() {
    const tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
    const mostra = (tab) => {
      tabs.forEach((t) => {
        const scelto = t === tab;
        t.setAttribute("aria-selected", scelto ? "true" : "false");
        const p = el(t.getAttribute("aria-controls"));
        if (p) p.hidden = !scelto;
      });
    };
    tabs.forEach((t) => {
      t.addEventListener("click", () => mostra(t));
      t.addEventListener("keydown", (e) => {
        const i = tabs.indexOf(t);
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const j = (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
          tabs[j].focus(); mostra(tabs[j]);
        }
      });
    });
    if (tabs.length) mostra(tabs[0]);
  }

  /* ==========================================================================
   * AVVIO
   * ========================================================================*/
  function sincronizzaAliquotaDaSettore() {
    const s = PD.CONTRIBUTI_DATORE.settori[val("f-settore")];
    if (!s) return;
    if (el("f-aliquota")) el("f-aliquota").value = (s.aliquota * 100).toFixed(2);
    if (el("hint-aliquota")) {
      el("hint-aliquota").innerHTML =
        badgeConf(s.confidenza) + " " + esc(s.nota || "") +
        " La quota IVS certa è " + pc(PD.CONTRIBUTI_DATORE.ivs, 2) +
        "; il resto varia con CCNL e dimensione, quindi il campo resta modificabile.";
    }
  }

  function avvia() {
    popolaSettori("f-settore");
    popolaSettori("c-settore");
    popolaSettori("o-settore");
    popolaRegioni("f-regione", "Lombardia");
    sincronizzaAliquotaDaSettore();

    const form = el("form-assunzione");
    if (form) {
      form.addEventListener("input", (e) => {
        if (e.target && e.target.id === "f-settore") sincronizzaAliquotaDaSettore();
        if (e.target && e.target.id === "f-naspi") {
          const box = el("box-naspi");
          if (box) box.hidden = val("f-naspi") !== "si";
        }
        renderAssunzione();
      });
      form.addEventListener("change", (e) => {
        if (e.target && e.target.id === "f-settore") sincronizzaAliquotaDaSettore();
        if (e.target && e.target.id === "f-naspi") {
          const box = el("box-naspi");
          if (box) box.hidden = val("f-naspi") !== "si";
        }
        renderAssunzione();
      });
      form.addEventListener("submit", (e) => e.preventDefault());
    }

    const formC = el("form-canali");
    if (formC) {
      formC.addEventListener("input", renderCanali);
      formC.addEventListener("change", renderCanali);
      formC.addEventListener("submit", (e) => e.preventDefault());
    }

    const formO = el("form-organico");
    if (formO) {
      formO.addEventListener("input", renderOrganico);
      formO.addEventListener("change", renderOrganico);
      formO.addEventListener("submit", (e) => e.preventDefault());
    }
    const btn = el("o-esempio");
    if (btn) btn.addEventListener("click", () => {
      el("o-dati").value = ORGANICO_ESEMPIO;
      renderOrganico();
    });

    attivaSchede();
    renderAssunzione();
    renderCanali();
    renderOrganico();
    renderMetodo();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", avvia);
  } else {
    avvia();
  }
})();
