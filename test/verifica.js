"use strict";
/* ============================================================================
 * SUITE DI VERIFICA
 *
 * Node puro, nessuna dipendenza: `node test/verifica.js`.
 *
 * Cosa verifica, e perché queste cose e non altre.
 *
 * In un motore fiscale i bug non si presentano come eccezioni: si presentano
 * come numeri plausibili. Un massimale mensile applicato come annuo, una
 * quota IVS tagliata al massimale insieme alle voci che non ci vanno, due
 * esoneri sommati quando erano alternativi: tutti producono un risultato che
 * sembra giusto. Quindi i test non guardano se il codice gira, guardano se i
 * comportamenti che distinguono questo motore da un foglio Excel sono ancora
 * lì.
 *
 * In particolare bloccano tre comportamenti che è facilissimo perdere in un
 * refactoring:
 *   · il massimale mensile si applica MESE PER MESE, e la tredicesima ne
 *     spreca una parte;
 *   · il massimale contributivo annuo si applica alla sola quota IVS;
 *   · gli esoneri sulla contribuzione datoriale non si sommano fra loro.
 * ==========================================================================*/

require("../parametri-2026.js");
require("../calcolo.js");
require("../parametri-datore-2026.js");
require("../costo-azienda.js");
require("../agevolazioni-2026.js");
require("../motore-agevolazioni.js");

const COSTO = globalThis.COSTO;
const AGEV = globalThis.AGEV;
const PD = globalThis.PARAMETRI_DATORE_2026;

let passati = 0, falliti = 0;
const fallimenti = [];
let gruppoCorrente = "";

function gruppo(nome) {
  gruppoCorrente = nome;
  console.log("\n" + nome);
  console.log("-".repeat(nome.length));
}
function ok(nome, condizione, dettaglio) {
  if (condizione) {
    passati++;
    console.log("  ✓ " + nome);
  } else {
    falliti++;
    fallimenti.push(gruppoCorrente + " → " + nome + (dettaglio ? " · " + dettaglio : ""));
    console.log("  ✗ " + nome + (dettaglio ? "  [" + dettaglio + "]" : ""));
  }
}
function quasi(nome, atteso, ottenuto, tolleranza) {
  const t = tolleranza == null ? 0.02 : tolleranza;
  ok(nome, Math.abs(atteso - ottenuto) <= t,
     "atteso " + atteso + ", ottenuto " + ottenuto);
}

/* --------------------------------------------------------------------------
 * Profilo di riferimento: un caso pulito, su cui si varia un pezzo per volta.
 * ------------------------------------------------------------------------*/
const BASE = {
  ral: 30000, mensilita: 13, settore: "commercio", aliquotaDatore: null,
  tassoInail: 0.005, dipendentiAzienda: 20, tipoContratto: "indeterminato",
  qualifica: "impiegato", partTime: false, dataAssunzione: "2026-09-15",
  regione: "Lombardia", eta: 28, sesso: "M", mesiSenzaImpiego: 26,
  titoloStudio: "terziario", disabilita: "no", percettoreAdiSfl: false,
  percettoreNaspi: false, naspiIndennitaMensile: 0, naspiMesiResidui: 0,
  figliMinori: 0, vittimaViolenza: false, categoriaTutelata: false,
  assunzioneDaObbligo: false, dirittoPrecedenzaAltrui: false,
  licenziamentiUltimi6Mesi: false, sospensioniInCorso: false,
  provenienzaDaCollegata: false, durcRegolare: true,
  imponibileCapiente: true, incrementoOccupazionaleNetto: true
};
const con = (p) => Object.assign({}, BASE, p);
const analizza = (p, mesi) => AGEV.analizza(con(p), { orizzonteMesi: mesi || 60 });
const misura = (r, id) => r.misure.find((m) => m.id === id);

/* ==========================================================================
 * 1. COSTO AZIENDA
 * ========================================================================*/
gruppo("1. Costo azienda");
{
  const r = COSTO.calcolaCostoAzienda(30000, {
    mensilita: 13, settore: "commercio", tassoInail: 0.005
  });
  quasi("contributi datore: 30.000 × 30,38%", 9114, r.contributiDatore);
  quasi("premio INAIL: 30.000 × 0,50%", 150, r.inail);
  quasi("TFR: 30.000 / 13,5", 2222.22, r.tfr);
  quasi("costo totale", 41486.22, r.costoTotale);
  quasi("moltiplicatore sulla RAL", 1.383, r.moltiplicatore, 0.001);
  ok("la somma delle voci coincide col totale",
     Math.abs(r.voci.reduce((s, v) => s + v.importo, 0) - r.costoTotale) < 0.05);
  ok("le quote delle voci sommano a 1",
     Math.abs(r.voci.reduce((s, v) => s + v.quota, 0) - 1) < 1e-9);
}
{
  /* Il massimale contributivo si applica alla sola quota IVS. Tagliare
     l'intera aliquota al massimale sottostimerebbe il costo delle
     retribuzioni alte, che è esattamente dove il tema si pone. */
  const r = COSTO.calcolaCostoAzienda(200000, {
    mensilita: 12, settore: "commercio", tassoInail: 0.005
  });
  const ivsAttesa = PD.CONTRIBUTI_DATORE.massimaleAnnuo * 0.2381;
  const altreAttese = 200000 * (0.3038 - 0.2381);
  quasi("il massimale taglia la sola quota IVS", ivsAttesa + altreAttese,
        r.contributiDatore, 1);
  ok("la quota IVS è ferma al massimale",
     Math.abs(r.profiloMensile.reduce((s, m) => s + m.quotaIvs, 0) - ivsAttesa) < 1,
     "somma IVS mensile");
  ok("le altre voci non sono tagliate",
     Math.abs(r.profiloMensile.reduce((s, m) => s + m.quotaAltre, 0) - altreAttese) < 1);
}
{
  const r = COSTO.calcolaCostoAzienda(26000, { mensilita: 13, settore: "commercio" });
  quasi("con 13 mensilità dicembre vale il doppio di gennaio",
        r.profiloMensile[0].lordo * 2, r.profiloMensile[11].lordo);
  ok("dicembre è marcato come mensilità aggiuntiva",
     r.profiloMensile[11].mensilitaAggiuntiva === true);
  const r14 = COSTO.calcolaCostoAzienda(28000, { mensilita: 14, settore: "commercio" });
  quasi("con 14 mensilità anche giugno vale il doppio",
        r14.profiloMensile[0].lordo * 2, r14.profiloMensile[5].lordo);
  ok("la distribuzione mensile somma sempre alla RAL",
     Math.abs(r14.profiloMensile.reduce((s, m) => s + m.lordo, 0) - 28000) < 0.05);
}
{
  const std = COSTO.calcolaCostoAzienda(24000, {
    tipoContratto: "apprendistato", dipendentiAzienda: 30
  });
  quasi("apprendistato, oltre 9 dipendenti: 11,61%", 0.1161, std.aliquotaApplicata, 1e-6);
  const micro1 = COSTO.calcolaCostoAzienda(24000, {
    tipoContratto: "apprendistato", dipendentiAzienda: 5, annoApprendistato: 1
  });
  quasi("apprendistato, micro impresa, primo anno: 3,11%", 0.0311, micro1.aliquotaApplicata, 1e-6);
  const micro3 = COSTO.calcolaCostoAzienda(24000, {
    tipoContratto: "apprendistato", dipendentiAzienda: 5, annoApprendistato: 3
  });
  quasi("apprendistato, micro impresa, terzo anno: 11,61%", 0.1161, micro3.aliquotaApplicata, 1e-6);
  ok("l'apprendistato costa meno del tempo indeterminato",
     micro1.costoTotale < COSTO.calcolaCostoAzienda(24000, {}).costoTotale);
}
{
  const ti = COSTO.calcolaCostoAzienda(30000, { settore: "commercio", tipoContratto: "indeterminato" });
  const td = COSTO.calcolaCostoAzienda(30000, { settore: "commercio", tipoContratto: "determinato" });
  quasi("il tempo determinato aggiunge l'addizionale dell'1,40%",
        ti.aliquotaApplicata + 0.014, td.aliquotaApplicata, 1e-6);
  const td2 = COSTO.calcolaCostoAzienda(30000, {
    settore: "commercio", tipoContratto: "determinato", rinnoviTempoDeterminato: 2
  });
  quasi("ogni rinnovo aggiunge lo 0,50%", td.aliquotaApplicata + 0.01,
        td2.aliquotaApplicata, 1e-6);
}
{
  const r = COSTO.calcolaCostoAzienda(0, {});
  ok("RAL zero non rompe il motore", r.costoTotale === 0);
  let errore = false;
  try { COSTO.calcolaCostoAzienda(-1, {}); } catch (e) { errore = true; }
  ok("una RAL negativa viene rifiutata", errore);
}

/* ==========================================================================
 * 2. CONDIZIONI GENERALI — art. 31 D.Lgs. 150/2015
 * ========================================================================*/
gruppo("2. Condizioni generali");
{
  ok("caso pulito: condizioni libere",
     analizza({}).condizioniGenerali.esito === "libero");

  const bloccato = analizza({ licenziamentiUltimi6Mesi: true });
  ok("i licenziamenti nei 6 mesi bloccano",
     bloccato.condizioniGenerali.esito === "bloccato");
  ok("il blocco identifica la voce violata",
     bloccato.condizioniGenerali.violate.some((v) => v.id === "licenziamenti-6-mesi"));

  ok("il DURC irregolare blocca",
     analizza({ durcRegolare: false }).condizioniGenerali.esito === "bloccato");
  ok("l'obbligo preesistente blocca",
     analizza({ assunzioneDaObbligo: true }).condizioniGenerali.esito === "bloccato");
  ok("il diritto di precedenza altrui blocca",
     analizza({ dirittoPrecedenzaAltrui: true }).condizioniGenerali.esito === "bloccato");

  const ignoto = analizza({ durcRegolare: null });
  ok("una condizione ignota non blocca ma mette in guardia",
     ignoto.condizioniGenerali.esito === "da-verificare");
  ok("una condizione ignota genera una domanda bloccante",
     ignoto.domandeAperte.some((d) => d.bloccante === true && d.id === "durc"));
}

/* ==========================================================================
 * 3. BONUS GIOVANI 2026
 * ========================================================================*/
gruppo("3. Bonus Giovani 2026");
{
  const r = analizza({});
  const m = misura(r, "bonus-giovani-2026");
  ok("spetta al caso di riferimento", m.stato === "eleggibile");
  ok("24 mesi con 26 mesi senza impiego", m.durataMesi === 24);
  quasi("massimale 500 €/mese fuori dalle aree maggiorate: 12.000 € in 24 mesi",
        12000, m.totaleOrizzonte, 0.5);

  const zes = analizza({ regione: "Campania" });
  quasi("in Campania il massimale sale a 650: 15.600 €",
        15600, misura(zes, "bonus-giovani-2026").totaleOrizzonte, 0.5);
  const marche = analizza({ regione: "Marche" });
  quasi("le Marche rientrano nel perimetro maggiorato",
        15600, misura(marche, "bonus-giovani-2026").totaleOrizzonte, 0.5);
  ok("la Lombardia non rientra nel perimetro maggiorato",
     misura(analizza({ regione: "Lombardia" }), "bonus-giovani-2026").totaleOrizzonte === 12000);

  ok("non spetta a 35 anni compiuti",
     misura(analizza({ eta: 35 }), "bonus-giovani-2026").stato === "non-eleggibile");
  ok("non spetta ai dirigenti",
     misura(analizza({ qualifica: "dirigente" }), "bonus-giovani-2026").stato === "non-eleggibile");
  ok("non spetta a tempo determinato",
     misura(analizza({ tipoContratto: "determinato" }), "bonus-giovani-2026").stato === "non-eleggibile");

  const breve = analizza({ mesiSenzaImpiego: 14 });
  ok("con 14 mesi senza impiego la durata scende a 12",
     misura(breve, "bonus-giovani-2026").durataMesi === 12);
  quasi("12 mesi valgono la metà", 6000,
        misura(breve, "bonus-giovani-2026").totaleOrizzonte, 0.5);

  const chiarire = analizza({ mesiSenzaImpiego: null, titoloStudio: null });
  ok("senza il dato sulla disoccupazione la misura è «da chiarire», non «non spetta»",
     misura(chiarire, "bonus-giovani-2026").stato === "da-chiarire");
  ok("e genera una domanda con il valore in gioco",
     chiarire.domandeAperte.some((d) => d.valoreInGioco > 0));

  const fuori = analizza({ dataAssunzione: "2027-03-01" });
  ok("un'assunzione nel 2027 cade fuori finestra",
     misura(fuori, "bonus-giovani-2026").stato === "fuori-finestra");
  ok("e la ragione è esplicita",
     /finestra si è chiusa/.test(misura(fuori, "bonus-giovani-2026").motivoFinestra || ""));
}

/* ==========================================================================
 * 4. IL MASSIMALE MENSILE E LA TREDICESIMA
 *
 * Il test che protegge la decisione strutturale del motore.
 * ========================================================================*/
gruppo("4. Massimale mensile e mensilità aggiuntive");
{
  /* Bonus Donne in ZES: massimale 800 €/mese. Su RAL 30.000 in commercio la
     contribuzione mensile ordinaria è 701,08 € (sotto il tetto), ma a dicembre
     raddoppia a 1.402,15 € e il tetto taglia a 800 €. Undici mesi pieni più
     un dicembre troncato: 8.511,88 € l'anno, non 9.114 €. */
  const donna13 = analizza({ sesso: "F", regione: "Campania", mensilita: 13 });
  quasi("con 13 mensilità la tredicesima spreca parte del massimale",
        17023.76, misura(donna13, "bonus-donne-2026").totaleOrizzonte, 1);

  /* Stessa RAL, stessa persona, 12 mensilità: la contribuzione è uniforme a
     759,50 € e resta sempre sotto gli 800 €. Nessuno spreco. */
  const donna12 = analizza({ sesso: "F", regione: "Campania", mensilita: 12 });
  quasi("con 12 mensilità il massimale non viene mai sfiorato",
        18228, misura(donna12, "bonus-donne-2026").totaleOrizzonte, 1);

  const delta = misura(donna12, "bonus-donne-2026").totaleOrizzonte -
                misura(donna13, "bonus-donne-2026").totaleOrizzonte;
  ok("a parità di RAL la sola ripartizione in mensilità sposta oltre 1.000 €",
     delta > 1000, "delta " + delta.toFixed(2));

  /* Il tetto annuo si comporta in modo opposto: non è sensibile alla
     distribuzione, perché guarda i dodici mesi nel loro insieme. */
  const adi13 = analizza({ percettoreAdiSfl: true, mensilita: 13 });
  const adi12 = analizza({ percettoreAdiSfl: true, mensilita: 12 });
  quasi("un massimale annuo è indifferente alla ripartizione",
        misura(adi12, "esonero-adi-sfl").totaleOrizzonte,
        misura(adi13, "esonero-adi-sfl").totaleOrizzonte, 1);
}

/* ==========================================================================
 * 5. LE ALTRE MISURE
 * ========================================================================*/
gruppo("5. Le altre misure");
{
  const r = analizza({ sesso: "F", regione: "Campania" });
  const m = misura(r, "bonus-donne-2026");
  ok("Bonus Donne: spetta a una lavoratrice svantaggiata", m.stato === "eleggibile");
  ok("Bonus Donne: 24 mesi se molto svantaggiata", m.durataMesi === 24);
  ok("Bonus Donne: non spetta a un uomo",
     misura(analizza({ sesso: "M" }), "bonus-donne-2026").stato === "non-eleggibile");
  ok("Bonus Donne: senza incremento occupazionale netto non spetta",
     misura(analizza({ sesso: "F", incrementoOccupazionaleNetto: false }),
            "bonus-donne-2026").stato === "non-eleggibile");
}
{
  const r = analizza({ eta: 42, regione: "Campania", dipendentiAzienda: 8, mesiSenzaImpiego: 26 });
  const m = misura(r, "bonus-zes-2026");
  ok("Bonus ZES: spetta a over 35 disoccupato in micro impresa del Sud",
     m.stato === "eleggibile");
  quasi("Bonus ZES: 650 €/mese per 24 mesi", 15600, m.totaleOrizzonte, 0.5);
  ok("Bonus ZES: non spetta sopra i 10 dipendenti",
     misura(analizza({ eta: 42, regione: "Campania", dipendentiAzienda: 11, mesiSenzaImpiego: 26 }),
            "bonus-zes-2026").stato === "non-eleggibile");
  ok("Bonus ZES: non spetta fuori dalla ZES unica",
     misura(analizza({ eta: 42, regione: "Lombardia", dipendentiAzienda: 8, mesiSenzaImpiego: 26 }),
            "bonus-zes-2026").stato === "non-eleggibile");
}
{
  const r = analizza({ ral: 45000, eta: 40, disabilita: "riduzione>79", dipendentiAzienda: 60 });
  const m = misura(r, "incentivo-disabili-art13");
  ok("Disabili: spetta con riduzione oltre il 79%", m.stato === "eleggibile");
  ok("Disabili: 36 mesi", m.durataMesi === 36);
  quasi("Disabili: 70% di 45.000 per 3 anni", 94500, m.totaleOrizzonte, 1);

  const psi = analizza({ ral: 45000, eta: 40, disabilita: "intellettivaPsichica>45", dipendentiAzienda: 60 });
  ok("Disabili: 60 mesi per disabilità intellettiva o psichica",
     misura(psi, "incentivo-disabili-art13").durataMesi === 60);
  const medio = analizza({ ral: 45000, eta: 40, disabilita: "riduzione67-79", dipendentiAzienda: 60 });
  quasi("Disabili: 35% nella fascia 67-79%", 47250,
        misura(medio, "incentivo-disabili-art13").totaleOrizzonte, 1);
  ok("Disabili: coprire una quota di riserva scoperta azzera l'incentivo",
     misura(analizza({ ral: 45000, disabilita: "riduzione>79", assunzioneDaObbligo: true }),
            "incentivo-disabili-art13").stato === "non-eleggibile");
}
{
  const r = analizza({
    eta: 45, percettoreNaspi: true, naspiIndennitaMensile: 1100,
    naspiMesiResidui: 8, partTime: false, mesiSenzaImpiego: 8
  });
  const m = misura(r, "incentivo-naspi");
  ok("NASpI: spetta con indennità residua", m.stato === "eleggibile");
  quasi("NASpI: 20% di 1.100 € per 8 mesi", 1760, m.totaleOrizzonte, 1);
  ok("NASpI: non spetta in part-time",
     misura(analizza({ percettoreNaspi: true, naspiIndennitaMensile: 1100,
                       naspiMesiResidui: 8, partTime: true }),
            "incentivo-naspi").stato === "non-eleggibile");
  const lungo = analizza({ percettoreNaspi: true, naspiIndennitaMensile: 1000,
                           naspiMesiResidui: 40, partTime: false });
  ok("NASpI: la durata è troncata a 24 mesi",
     misura(lungo, "incentivo-naspi").durataMesi === 24);
}
{
  const over = analizza({ eta: 55, mesiSenzaImpiego: 18 });
  const m = misura(over, "riduzione-over50-donne");
  ok("Over 50: spetta con oltre 12 mesi di disoccupazione", m.stato === "eleggibile");
  ok("Over 50: 18 mesi a tempo indeterminato", m.durataMesi === 18);
  /* Senza massimale, la riduzione del 50% comprende anche l'INAIL.
     Attenzione al conto: 18 mesi NON valgono una volta e mezza un anno.
     Il primo anno contiene la tredicesima, i sei mesi successivi no, quindi
     il secondo tratto pesa meno del primo in proporzione. Il valore atteso
     va costruito mese per mese, ed è precisamente il tipo di errore che il
     modello annuale nasconde e quello mensile mostra. */
  const c = COSTO.calcolaCostoAzienda(30000, {
    mensilita: 13, settore: "commercio", tassoInail: 0.005
  });
  let attesa = 0;
  for (let i = 0; i < 18; i++) {
    const mm = c.profiloMensile[i % 12];
    attesa += (mm.contributiDatore + mm.inail) * 0.5;
  }
  quasi("Over 50: 50% di contributi e INAIL per 18 mesi", attesa, m.totaleOrizzonte, 2);
  ok("18 mesi valgono meno di una volta e mezza un anno, perché la seconda " +
     "tredicesima non c'è",
     m.totaleOrizzonte < (30000 * 0.3038 + 30000 * 0.005) * 0.5 * 1.5,
     m.totaleOrizzonte.toFixed(2));
  ok("Over 50: 12 mesi a tempo determinato",
     misura(analizza({ eta: 55, mesiSenzaImpiego: 18, tipoContratto: "determinato" }),
            "riduzione-over50-donne").durataMesi === 12);
  ok("Over 50: non spetta a 45 anni senza altri titoli",
     misura(analizza({ eta: 45, sesso: "M", mesiSenzaImpiego: 18 }),
            "riduzione-over50-donne").stato === "non-eleggibile");
}
{
  const r = analizza({ percettoreAdiSfl: true });
  const m = misura(r, "esonero-adi-sfl");
  ok("ADI/SFL: spetta", m.stato === "eleggibile");
  ok("ADI/SFL: 24 mesi a tempo indeterminato", m.durataMesi === 24);
  ok("ADI/SFL: il tetto annuo di 8.000 € non viene superato",
     m.serieMensile.slice(0, 12).reduce((a, b) => a + b, 0) <= 8000.01);
  const td = analizza({ percettoreAdiSfl: true, tipoContratto: "determinato" });
  ok("ADI/SFL: a termine scende al 50% per 12 mesi",
     misura(td, "esonero-adi-sfl").durataMesi === 12);
  ok("ADI/SFL: a termine il tetto è 4.000 €",
     misura(td, "esonero-adi-sfl").totaleOrizzonte <= 4000.01);
}
{
  const r = analizza({ regione: "Campania", dipendentiAzienda: 40 });
  const m = misura(r, "decontribuzione-sud-pmi");
  ok("Decontribuzione Sud: spetta a una PMI del Mezzogiorno", m.stato === "eleggibile");
  ok("Decontribuzione Sud: non spetta oltre 250 dipendenti",
     misura(analizza({ regione: "Campania", dipendentiAzienda: 300 }),
            "decontribuzione-sud-pmi").stato === "non-eleggibile");
  ok("Decontribuzione Sud: non spetta al Nord",
     misura(analizza({ regione: "Veneto" }), "decontribuzione-sud-pmi").stato === "non-eleggibile");
  /* 20% di 701,08 € fa 140,22 €, oltre il tetto di 125 €: si applica il tetto. */
  quasi("Decontribuzione Sud: il tetto di 125 €/mese morde", 125, m.serieMensile[0], 0.01);
  quasi("Decontribuzione Sud: 1.500 € l'anno", 1500,
        m.serieMensile.slice(0, 12).reduce((a, b) => a + b, 0), 1);
}
{
  const r = analizza({});
  const m = misura(r, "maxi-deduzione");
  ok("Maxi-deduzione: spetta con incremento e imponibile capiente", m.stato === "eleggibile");
  ok("Maxi-deduzione: non produce cassa", m.totaleOrizzonte === 0);
  ok("Maxi-deduzione: il beneficio è dichiarato a parte", r.fiscali.length === 1);
  quasi("Maxi-deduzione: 20% del costo del lavoro al 24% di IRES",
        41486.22 * 0.20 * 0.24, r.sintesi.beneficioFiscaleAnnuo, 1);
  ok("Maxi-deduzione: senza imponibile capiente non spetta",
     misura(analizza({ imponibileCapiente: false }), "maxi-deduzione").stato === "non-eleggibile");
  const tutelata = analizza({ disabilita: "riduzione>79", categoriaTutelata: true });
  quasi("Maxi-deduzione: 30% per le categorie tutelate",
        41486.22 * 0.30 * 0.24, tutelata.sintesi.beneficioFiscaleAnnuo, 1);
}

/* ==========================================================================
 * 6. CUMULO E SEQUENZA
 *
 * Il cuore dell'ottimizzatore.
 * ========================================================================*/
gruppo("6. Cumulo e sequenza ottima");
{
  const r = analizza({ regione: "Campania" });
  ok("il primo blocco è il Bonus Giovani",
     r.piano.sequenza[0].etichetta === "Bonus Giovani 2026");
  ok("copre i primi 24 mesi",
     r.piano.sequenza[0].da === 1 && r.piano.sequenza[0].a === 24);
  ok("dal 25° mese subentra la Decontribuzione Sud",
     r.piano.sequenza[1].etichetta === "Decontribuzione Sud PMI" &&
     r.piano.sequenza[1].da === 25);
  quasi("la staffetta vale 20.100 € su 5 anni", 20100, r.piano.totaleCassa, 1);
  ok("la staffetta batte la migliore misura singola",
     r.piano.totaleCassa > Math.max.apply(null, r.misure.map((m) => m.totaleOrizzonte)),
     "piano " + r.piano.totaleCassa);
}
{
  /* Due esoneri non si sommano mai nello stesso mese. */
  const r = analizza({ sesso: "F", regione: "Campania" });
  const doppi = r.piano.mesi.filter((m) => m.esonero && m.incentivi.some(
    (x) => AGEV.MISURE.find((y) => y.id === x.id).famiglia === "esonero-contributivo"));
  ok("nessun mese applica due esoneri contemporaneamente", doppi.length === 0);
  ok("fra Bonus Donne e Bonus Giovani vince il più conveniente",
     r.piano.sequenza[0].etichetta === "Bonus Donne 2026");
  ok("l'alternativa scartata resta visibile",
     r.piano.scartate.some((s) => s.id === "bonus-giovani-2026"));
}
{
  /* Il Bonus ZES esclude tutto, incentivi economici compresi: il motore deve
     scegliere fra lui e la coppia esonero + incentivo, non sommarli. */
  const r = analizza({
    eta: 42, regione: "Campania", dipendentiAzienda: 8, mesiSenzaImpiego: 26,
    disabilita: "riduzione>79", assunzioneDaObbligo: false
  });
  const mesiZes = r.piano.mesi.filter((m) => m.esonero && m.esonero.id === "bonus-zes-2026");
  ok("quando il Bonus ZES è attivo non porta con sé incentivi economici",
     mesiZes.every((m) => m.incentivi.length === 0));
  ok("l'incentivo disabili, che vale più del Bonus ZES, viene preferito",
     r.piano.mesi[0].incentivi.some((x) => x.id === "incentivo-disabili-art13"),
     "mese 1: " + JSON.stringify(r.piano.mesi[0]));
}
{
  /* Un incentivo economico e un esonero hanno basi diverse: si sommano. */
  const r = analizza({
    eta: 30, ral: 45000, disabilita: "riduzione67-79",
    mesiSenzaImpiego: 26, dipendentiAzienda: 40, regione: "Lombardia"
  });
  const m1 = r.piano.mesi[0];
  ok("esonero contributivo e incentivo economico convivono",
     m1.esonero !== null && m1.incentivi.length > 0,
     JSON.stringify(m1));
  ok("il totale del mese è la somma dei due",
     Math.abs(m1.totale - (m1.esonero.importo +
       m1.incentivi.reduce((a, x) => a + x.importo, 0))) < 0.01);
}
{
  const r = analizza({});
  ok("nessun mese produce un valore negativo",
     r.piano.mesi.every((m) => m.totale >= 0));
  ok("il totale è la somma dei mesi",
     Math.abs(r.piano.totaleCassa -
       r.piano.mesi.reduce((s, m) => s + m.totale, 0)) < 0.05);
  ok("il totale per anno somma al totale complessivo",
     Math.abs(r.piano.totaleCassa -
       r.piano.perAnno.reduce((s, a) => s + a.totale, 0)) < 0.05);
  ok("il risparmio non supera mai il costo del lavoro del periodo",
     r.piano.perAnno[0].totale < r.costo.costoTotale);
  ok("la sequenza copre tutti i mesi dell'orizzonte senza buchi",
     r.piano.sequenza[0].da === 1 &&
     r.piano.sequenza[r.piano.sequenza.length - 1].a === 60);
}

/* ==========================================================================
 * 7. EFFICIENZA DELL'EURO
 * ========================================================================*/
gruppo("7. Efficienza dell'euro");
{
  const r = COSTO.confrontaCanali(30000, 3000, {
    mensilita: 13, settore: "commercio", tassoInail: 0.005
  });
  const trova = (id) => r.canali.find((c) => c.id === id);
  quasi("il fringe benefit sotto soglia ha efficienza del 100%",
        1, trova("fringe-benefit").efficienza, 1e-9);
  quasi("il premio convertito in welfare ha efficienza del 100%",
        1, trova("premio-welfare").efficienza, 1e-9);
  ok("l'aumento in busta sta sotto il 50%",
     trova("aumento-ral").efficienza < 0.5,
     "efficienza " + trova("aumento-ral").efficienza.toFixed(3));
  ok("il premio detassato sta fra i due",
     trova("premio-risultato").efficienza > trova("aumento-ral").efficienza &&
     trova("premio-risultato").efficienza < 1);
  ok("i canali sono ordinati per efficienza decrescente",
     r.canali.every((c, i) => i === 0 || r.canali[i - 1].efficienza >= c.efficienza));

  ok("il mix ottimo batte l'aumento in busta di oltre il doppio",
     r.allocazione.rapportoVsBaseline > 2,
     "rapporto " + r.allocazione.rapportoVsBaseline);
  quasi("il mix impiega tutto il budget", 3000,
        r.allocazione.mix.reduce((s, m) => s + m.costoAzienda, 0), 1);
}
{
  /* Premio in denaro e premio convertito pescano dallo stesso plafond da
     5.000 €; il fringe benefit ha il suo da 1.000 €. Con un budget alto il
     mix non può superare 6.000 € di canali agevolati. */
  const r = COSTO.confrontaCanali(30000, 20000, {
    mensilita: 13, settore: "commercio", tassoInail: 0.005
  });
  const agevolati = r.allocazione.mix
    .filter((m) => m.id !== "aumento-ral")
    .reduce((s, m) => s + m.valoreLordo, 0);
  ok("i canali agevolati si fermano a 6.000 € complessivi",
     agevolati <= 6000.01, "agevolati " + agevolati.toFixed(2));
  ok("il residuo finisce in aumento di RAL",
     r.allocazione.mix.some((m) => m.id === "aumento-ral"));
  quasi("il budget resta interamente allocato", 20000,
        r.allocazione.mix.reduce((s, m) => s + m.costoAzienda, 0), 1);
}
{
  const senza = COSTO.confrontaCanali(30000, 2500, { mensilita: 13, settore: "commercio" });
  const conFigli = COSTO.confrontaCanali(30000, 2500, {
    mensilita: 13, settore: "commercio", figliACarico: true,
    opzioniNetto: { mensilita: 13, figli: 2 }
  });
  ok("con figli a carico la soglia del fringe benefit raddoppia",
     conFigli.canali.find((c) => c.id === "fringe-benefit").tetto === 2000 &&
     senza.canali.find((c) => c.id === "fringe-benefit").tetto === 1000);
}

/* ==========================================================================
 * 8. CONFRONTO SCENARI
 * ========================================================================*/
gruppo("8. Confronto scenari");
{
  const r = AGEV.confrontaScenari([
    { etichetta: "indeterminato", profilo: con({}) },
    { etichetta: "determinato", profilo: con({ tipoContratto: "determinato" }) },
    { etichetta: "apprendistato", profilo: con({ tipoContratto: "apprendistato" }) },
    { etichetta: "donna in Campania", profilo: con({ sesso: "F", regione: "Campania" }) }
  ], { orizzonteMesi: 60 });

  ok("gli scenari sono ordinati per costo netto crescente",
     r.risultati.every((x, i) => i === 0 || r.risultati[i - 1].costoNettoPrimoAnno <= x.costoNettoPrimoAnno));
  ok("il divario fra migliore e peggiore è positivo", r.delta > 0);
  ok("ogni scenario riporta la misura che vince",
     r.risultati.every((x) => typeof x.misuraPrincipale === "string" && x.misuraPrincipale.length > 0));
  const appr = r.risultati.find((x) => x.etichetta === "apprendistato");
  ok("l'apprendistato ha il costo lordo più basso",
     appr.costoLordo === Math.min.apply(null, r.risultati.map((x) => x.costoLordo)));
}

/* ==========================================================================
 * 9. COERENZA DEL RULESET
 *
 * Test strutturali: non verificano un numero, verificano che il catasto
 * normativo resti ben formato quando ci si aggiungono misure.
 * ========================================================================*/
gruppo("9. Coerenza del ruleset");
{
  const M = AGEV.MISURE;
  ok("ogni misura ha un id univoco",
     new Set(M.map((m) => m.id)).size === M.length);
  ok("ogni misura cita una norma",
     M.every((m) => typeof m.norma === "string" && m.norma.length > 3));
  ok("ogni misura dichiara un livello di confidenza",
     M.every((m) => ["certa", "alta", "media", "tipica", "daVerificare"].indexOf(m.confidenza) !== -1));
  ok("ogni misura dichiara le regole di cumulo",
     M.every((m) => m.cumulabilita && m.cumulabilita.nota));
  ok("ogni misura elenca gli adempimenti",
     M.every((m) => Array.isArray(m.adempimenti) && m.adempimenti.length > 0));
  ok("ogni requisito ha un predicato eseguibile",
     M.every((m) => m.requisiti.every((q) => typeof q.test === "function")));
  ok("ogni predicato restituisce true, false o null",
     M.every((m) => m.requisiti.every((q) => {
       const v = q.test({});
       return v === true || v === false || v === null;
     })));
  ok("ogni misura dichiara una durata",
     M.every((m) => typeof m.durataMesi === "function" || Number.isFinite(m.durataMesi)));
  ok("ogni misura appartiene a una famiglia nota",
     M.every((m) => ["esonero-contributivo", "incentivo-economico", "deduzione-fiscale"]
       .indexOf(m.famiglia) !== -1));
  ok("un profilo vuoto non fa esplodere il motore",
     (() => { try { AGEV.analizza({ ral: 25000 }, { orizzonteMesi: 12 }); return true; }
              catch (e) { return false; } })());
  ok("un profilo vuoto non produce eleggibilità false positive",
     AGEV.analizza({ ral: 25000 }, { orizzonteMesi: 12 })
       .misure.every((m) => m.stato !== "eleggibile"));
}

/* ==========================================================================
 * ESITO
 * ========================================================================*/
console.log("\n" + "=".repeat(58));
console.log("  " + passati + " controlli superati, " + falliti + " falliti");
console.log("=".repeat(58));
if (falliti > 0) {
  console.log("\nFallimenti:");
  fallimenti.forEach((f) => console.log("  · " + f));
  process.exit(1);
}
