"use strict";
/* ============================================================================
 * SUITE DI VERIFICA — motore dalla RAL al netto
 *
 * Node puro, nessuna dipendenza: `node test/verifica-netto.js`.
 *
 * Questo è il test del deliverable della task: il calcolatore che da una
 * retribuzione annua lorda restituisce netto annuo, netto mensile e
 * trattenute.
 *
 * Il criterio che mi sono dato
 * ---------------------------------------------------------------------------
 * Un test che chiama la funzione e confronta il risultato con quello che la
 * funzione ha prodotto ieri verifica solo che nessuno l'abbia toccata. È
 * utile contro le regressioni e inutile contro gli errori di formula: se la
 * formula era sbagliata dall'inizio, il test la protegge invece di scoprirla.
 *
 * Quindi qui dentro ci sono due tipi di controllo, e servono a cose diverse:
 *
 *   · RICALCOLI INDIPENDENTI — l'IRPEF a scaglioni, i contributi, le
 *     detrazioni e le addizionali sono riscritti da zero in questo file, in
 *     una forma diversa da quella del motore, e confrontati con il suo
 *     output. Due implementazioni scritte in momenti diversi che convergono
 *     sullo stesso numero sono un'evidenza vera; una sola non lo è.
 *
 *   · INVARIANTI — proprietà che devono valere per qualunque input, non per
 *     quello scelto da me: il netto cresce sempre con il lordo, le trattenute
 *     quadrano con la differenza fra lordo e netto, l'IRPEF netta non è mai
 *     negativa. Sono i controlli che pescano i casi a cui non ho pensato.
 *
 * I valori di riferimento in cima restano come rete anti-regressione, ma da
 * soli non proverebbero granché.
 * ==========================================================================*/

require("../parametri-2026.js");
require("../calcolo.js");

const CALC = globalThis.CALC;
const P = globalThis.PARAMETRI_2026;

let passati = 0, falliti = 0;
const fallimenti = [];
let gruppoCorrente = "";

function gruppo(nome) {
  gruppoCorrente = nome;
  console.log("\n" + nome);
  console.log("-".repeat(nome.length));
}
function ok(nome, condizione, dettaglio) {
  if (condizione) { passati++; console.log("  ✓ " + nome); }
  else {
    falliti++;
    fallimenti.push(gruppoCorrente + " → " + nome + (dettaglio ? " · " + dettaglio : ""));
    console.log("  ✗ " + nome + (dettaglio ? "  [" + dettaglio + "]" : ""));
  }
}
function quasi(nome, atteso, ottenuto, tolleranza) {
  const t = tolleranza == null ? 0.02 : tolleranza;
  ok(nome, Math.abs(atteso - ottenuto) <= t, "atteso " + atteso + ", ottenuto " + ottenuto);
}

/* Il caso standard della task: impiegato a tempo indeterminato, Milano,
   nessuna agevolazione, nessun familiare a carico, anno intero. */
const STANDARD = { mensilita: 13 };
const netto = (ral, o) => CALC.calcolaNetto(ral, Object.assign({}, STANDARD, o || {}));

/* ==========================================================================
 * 1. CASI DI RIFERIMENTO
 * ========================================================================*/
gruppo("1. Casi di riferimento (rete anti-regressione)");
{
  const attesi = [
    [12000, 922.26], [20000, 1340.97], [30000, 1801.96],
    [45000, 2310.33], [60000, 2888.82], [130000, 5563.05]
  ];
  for (const [ral, mensile] of attesi) {
    quasi("RAL " + ral.toLocaleString("it-IT") + " € → netto mensile " + mensile + " €",
          mensile, netto(ral).nettoMensile);
  }
}

/* ==========================================================================
 * 2. CONTRIBUTI INPS — ricalcolo indipendente
 * ========================================================================*/
gruppo("2. Contributi previdenziali (ricalcolo indipendente)");
{
  const C = P.CONTRIBUTI;
  /* Riscrittura autonoma: aliquota sulla base entro massimale, più l'1%
     sulla quota di quella base che eccede la prima fascia pensionabile. */
  const contributiAttesi = (ral, aliquota) => {
    const base = Math.min(ral, C.massimaleAnnuo);
    return base * aliquota +
           Math.max(0, base - C.primaFasciaPensionabile) * C.aliquotaAggiuntiva;
  };

  for (const ral of [12000, 30000, 56224, 60000, 100000, 130000, 250000]) {
    quasi("RAL " + ral.toLocaleString("it-IT") + " €",
          contributiAttesi(ral, C.aliquotaDipendente), netto(ral).contributiInps, 0.02);
  }
  quasi("apprendista: aliquota ridotta al 5,84%",
        contributiAttesi(24000, C.aliquotaApprendista),
        netto(24000, { contratto: "apprendistato" }).contributiInps);

  ok("l'apprendista paga meno contributi del dipendente ordinario",
     netto(24000, { contratto: "apprendistato" }).contributiInps < netto(24000).contributiInps);

  /* Il massimale è un tetto sulla base, non sull'importo: oltre, i contributi
     restano fermi. */
  quasi("oltre il massimale i contributi non crescono più",
        netto(C.massimaleAnnuo).contributiInps, netto(400000).contributiInps, 0.02);

  /* Sotto la prima fascia l'aliquota aggiuntiva non deve comparire. */
  quasi("sotto i 56.224 € si applica la sola aliquota base",
        50000 * C.aliquotaDipendente, netto(50000).contributiInps);
}

/* ==========================================================================
 * 3. IRPEF LORDA — ricalcolo indipendente
 * ========================================================================*/
gruppo("3. IRPEF lorda a scaglioni (ricalcolo indipendente)");
{
  /* Implementazione alternativa: somma delle quote per scaglione, scritta
     come ciclo esplicito sui limiti invece che con il residuo decrescente
     usato dal motore. */
  const irpefAttesa = (imponibile) => {
    const s = P.SCAGLIONI_IRPEF;
    let tot = 0, precedente = 0;
    for (const sc of s) {
      const tetto = sc.limite == null ? Infinity : sc.limite;
      if (imponibile > precedente) {
        tot += (Math.min(imponibile, tetto) - precedente) * sc.aliquota;
      }
      precedente = tetto;
    }
    return tot;
  };

  for (const ral of [10000, 20000, 30000, 45000, 60000, 130000]) {
    const r = netto(ral);
    quasi("RAL " + ral.toLocaleString("it-IT") + " € (imponibile " +
          r.imponibileFiscale.toFixed(0) + " €)",
          irpefAttesa(r.imponibileFiscale), r.irpefLorda, 0.02);
  }

  /* Valori di controllo agli spigoli degli scaglioni, calcolati a mano. */
  quasi("imponibile 28.000 € → 6.440 €", 6440, irpefAttesa(28000), 0.01);
  quasi("imponibile 50.000 € → 13.700 €", 13700, irpefAttesa(50000), 0.01);
  quasi("imponibile 60.000 € → 18.000 €", 18000, irpefAttesa(60000), 0.01);
  ok("la seconda aliquota è il 33%", P.SCAGLIONI_IRPEF[1].aliquota === 0.33);
}

/* ==========================================================================
 * 4. DETRAZIONE PER LAVORO DIPENDENTE — art. 13 TUIR
 * ========================================================================*/
gruppo("4. Detrazione per lavoro dipendente (ricalcolo indipendente)");
{
  const D = P.DETRAZIONI_LAVORO_DIPENDENTE;
  const detrazioneAttesa = (reddito, giorni, contratto) => {
    if (reddito <= 0) return 0;
    let base;
    if (reddito <= D.sogliaBase) base = D.importoBase;
    else if (reddito <= D.fascia2.limite)
      base = D.fascia2.fisso + D.fascia2.variabile * ((D.fascia2.limite - reddito) / D.fascia2.ampiezza);
    else if (reddito <= D.fascia3.limite)
      base = D.fascia3.fisso * ((D.fascia3.limite - reddito) / D.fascia3.ampiezza);
    else return 0;
    let d = base * ((giorni == null ? 365 : giorni) / D.giorniAnno);
    if (reddito >= D.maggiorazione.da && reddito <= D.maggiorazione.a) d += D.maggiorazione.importo;
    /* Il minimo garantito è previsto dalla sola lettera a): non va applicato
       alle lettere b) e c). */
    if (reddito <= D.sogliaBase) {
      d = Math.max(d, contratto === "determinato" ? D.minimoDeterminato : D.minimoIndeterminato);
    }
    return d;
  };

  for (const ral of [12000, 18000, 27000, 30000, 45000, 55000]) {
    const r = netto(ral);
    quasi("RAL " + ral.toLocaleString("it-IT") + " €",
          detrazioneAttesa(r.imponibileFiscale, 365, "indeterminato"),
          r.detrazioneLavoroDipendente, 0.02);
  }

  ok("oltre 50.000 € di imponibile la detrazione si azzera",
     netto(80000).detrazioneLavoroDipendente === 0,
     String(netto(80000).detrazioneLavoroDipendente));
  ok("il minimo garantito di 690 € vale nel primo scaglione",
     netto(12000).detrazioneLavoroDipendente >= D.minimoIndeterminato);
  /* Il pavimento si vede solo quando il ragguaglio ai giorni porta l'importo
     sotto di esso: su un anno intero i 1.955 € del primo scaglione stanno già
     sopra entrambi i minimi. Con 100 giorni la base scende a 535,62 €. */
  ok("con pochi giorni il pavimento del primo scaglione entra in gioco: 690 €",
     netto(12000, { giorni: 100 }).detrazioneLavoroDipendente === D.minimoIndeterminato,
     String(netto(12000, { giorni: 100 }).detrazioneLavoroDipendente));
  ok("a tempo determinato lo stesso pavimento raddoppia a 1.380 €",
     netto(12000, { giorni: 100, contratto: "determinato" }).detrazioneLavoroDipendente
       === D.minimoDeterminato,
     String(netto(12000, { giorni: 100, contratto: "determinato" }).detrazioneLavoroDipendente));

  /* Il test che blocca il bug corretto: nella fascia alta della lettera c) la
     detrazione deve seguire la formula e scendere sotto i 690 €, non essere
     tenuta su dal pavimento del primo scaglione. */
  const alta = netto(55000);
  ok("nella fascia alta la detrazione scende sotto i 690 €, senza pavimento",
     alta.detrazioneLavoroDipendente < 100,
     "imponibile " + alta.imponibileFiscale.toFixed(0) + " → " + alta.detrazioneLavoroDipendente);
  quasi("e segue esattamente la formula della lettera c)",
        detrazioneAttesa(alta.imponibileFiscale, 365, "indeterminato"),
        alta.detrazioneLavoroDipendente, 0.02);
  ok("la detrazione decade in modo continuo fino a zero a 50.000 €",
     netto(55900).detrazioneLavoroDipendente < 5 &&
     netto(56100).detrazioneLavoroDipendente === 0);

  ok("la maggiorazione di 65 € vive solo fra 25.000 e 35.000 € di imponibile",
     detrazioneAttesa(35000, 365) - detrazioneAttesa(35001, 365) > 60 &&
     detrazioneAttesa(24999, 365) < detrazioneAttesa(25000, 365));

  /* Il ragguaglio ai giorni riduce la detrazione, ma il minimo fa da
     pavimento e non viene rapportato. */
  const mezzoAnno = netto(30000, { giorni: 182 });
  ok("mezzo anno riduce la detrazione",
     mezzoAnno.detrazioneLavoroDipendente < netto(30000).detrazioneLavoroDipendente);
  ok("nel primo scaglione il minimo tiene anche con dieci giorni di lavoro",
     netto(12000, { giorni: 10 }).detrazioneLavoroDipendente >= D.minimoIndeterminato,
     String(netto(12000, { giorni: 10 }).detrazioneLavoroDipendente));
  ok("negli scaglioni superiori invece il ragguaglio scende liberamente, " +
     "perché la norma non prevede pavimento",
     netto(30000, { giorni: 10 }).detrazioneLavoroDipendente < D.minimoIndeterminato,
     String(netto(30000, { giorni: 10 }).detrazioneLavoroDipendente));
}

/* ==========================================================================
 * 5. DETRAZIONI PER FAMILIARI A CARICO — art. 12 TUIR
 * ========================================================================*/
gruppo("5. Detrazioni per familiari a carico");
{
  const senza = netto(30000);
  const conConiuge = netto(30000, { coniugeACarico: true });
  ok("il coniuge a carico aumenta il netto", conConiuge.nettoAnnuo > senza.nettoAnnuo);
  quasi("fra 15.000 e 40.000 € la detrazione coniuge è fissa a 690 €",
        690, conConiuge.detrazioneConiuge);
  ok("oltre 80.000 € la detrazione coniuge si azzera",
     netto(100000, { coniugeACarico: true }).detrazioneConiuge === 0);

  const unFiglio = netto(30000, { figli: 1 });
  const dueFigli = netto(30000, { figli: 2 });
  ok("i figli 21-29 anni aumentano il netto", unFiglio.nettoAnnuo > senza.nettoAnnuo);
  ok("due figli valgono più di uno", dueFigli.detrazioneFigli > unFiglio.detrazioneFigli);
  ok("la ripartizione al 50% dimezza la detrazione",
     Math.abs(netto(30000, { figli: 1, percentualeFigli: 50 }).detrazioneFigli -
              unFiglio.detrazioneFigli / 2) < 0.02);
  ok("oltre la soglia di reddito la detrazione figli si azzera",
     netto(120000, { figli: 1 }).detrazioneFigli === 0);

  ok("gli altri familiari a carico aumentano il netto",
     netto(30000, { altriFamiliari: 1 }).nettoAnnuo > senza.nettoAnnuo);
  ok("oltre 80.000 € la detrazione per altri familiari si azzera",
     netto(90000, { altriFamiliari: 1 }).detrazioneAltriFamiliari === 0);
}

/* ==========================================================================
 * 6. ULTERIORE DETRAZIONE E MISURE INTEGRATIVE
 * ========================================================================*/
gruppo("6. Ulteriore detrazione e misure integrative");
{
  const U = P.ULTERIORE_DETRAZIONE;
  ok("sotto 20.000 € di imponibile l'ulteriore detrazione non spetta",
     netto(15000).ulterioreDetrazione === 0);
  ok("nella fascia piena vale 1.000 €",
     netto(28000).ulterioreDetrazione === U.importo,
     String(netto(28000).ulterioreDetrazione));
  ok("oltre 40.000 € di imponibile si azzera", netto(50000).ulterioreDetrazione === 0);
  /* Le soglie dell'ulteriore detrazione guardano l'imponibile, non la RAL:
     servono RAL più alte perché l'imponibile cada fra 32.000 e 40.000 €. */
  const decrescente = netto(41000);   // imponibile ≈ 37.234
  ok("fra 32.000 e 40.000 € di imponibile decresce",
     decrescente.ulterioreDetrazione > 0 && decrescente.ulterioreDetrazione < U.importo,
     "imponibile " + decrescente.imponibileFiscale.toFixed(0) +
     " → " + decrescente.ulterioreDetrazione);
  ok("e decresce in modo monotono",
     netto(43000).ulterioreDetrazione < decrescente.ulterioreDetrazione);

  /* Trattamento integrativo e somma integrativa sono misure distinte e
     cumulabili: alle fasce basse convivono. È il risultato controintuitivo
     documentato nel README, e va bloccato da un test perché sembra un bug. */
  const basso = netto(12000);
  ok("il trattamento integrativo spetta sotto i 15.000 €",
     basso.trattamentoIntegrativo === P.TRATTAMENTO_INTEGRATIVO.importo);
  ok("e convive con la somma integrativa", basso.sommaIntegrativa > 0);
  ok("insieme portano il netto oltre il 99% del lordo",
     basso.nettoAnnuo / 12000 > 0.99,
     (basso.nettoAnnuo / 12000 * 100).toFixed(2) + "%");
  ok("il trattamento integrativo si spegne oltre i 15.000 €",
     netto(20000).trattamentoIntegrativo === 0);
  ok("l'interruttore «bonus 100 €» lo disattiva",
     netto(12000, { bonus100: false }).trattamentoIntegrativo === 0);
  ok("la somma integrativa si azzera oltre i 20.000 €",
     netto(25000).sommaIntegrativa === 0);
}

/* ==========================================================================
 * 7. ADDIZIONALI REGIONALE E COMUNALE
 * ========================================================================*/
gruppo("7. Addizionali (Lombardia e Milano)");
{
  /* Ricalcolo indipendente della regionale lombarda a scaglioni. */
  const regionaleAttesa = (imponibile) => {
    let tot = 0, precedente = 0;
    for (const s of P.ADDIZIONALE_REGIONALE_LOMBARDIA) {
      const tetto = s.limite == null ? Infinity : s.limite;
      if (imponibile > precedente) tot += (Math.min(imponibile, tetto) - precedente) * s.aliquota;
      precedente = tetto;
    }
    return tot;
  };
  for (const ral of [20000, 30000, 60000, 130000]) {
    const r = netto(ral);
    quasi("regionale su RAL " + ral.toLocaleString("it-IT") + " €",
          regionaleAttesa(r.imponibileFiscale), r.addizionaleRegionale, 0.02);
  }
  quasi("un'aliquota unica sostituisce gli scaglioni",
        netto(30000, { aliquotaRegionale: 0.0203 }).imponibileFiscale * 0.0203,
        netto(30000, { aliquotaRegionale: 0.0203 }).addizionaleRegionale, 0.02);

  /* La comunale di Milano è una soglia, non una franchigia: sotto i 23.000 €
     non si paga nulla, sopra si paga sull'intero imponibile. */
  const A = P.ADDIZIONALE_COMUNALE_DEFAULT;
  ok("sotto la soglia comunale non si paga nulla",
     netto(24000).addizionaleComunale === 0,
     "imponibile " + netto(24000).imponibileFiscale.toFixed(0));
  const sopra = netto(30000);
  quasi("sopra la soglia si paga sull'intero imponibile",
        sopra.imponibileFiscale * A.aliquota, sopra.addizionaleComunale, 0.02);
  ok("la comunale è una soglia e non una franchigia: c'è un salto",
     (() => {
       const sotto = netto(25300);   // imponibile 22.975, appena sotto
       const oltre = netto(25350);   // imponibile 23.020, appena sopra
       return sotto.imponibileFiscale < A.sogliaEsenzione &&
              oltre.imponibileFiscale > A.sogliaEsenzione &&
              sotto.addizionaleComunale === 0 &&
              oltre.addizionaleComunale > 180;
     })(),
     "sotto " + netto(25300).addizionaleComunale + " · sopra " + netto(25350).addizionaleComunale);
}

/* ==========================================================================
 * 8. IL CLIFF DEL WELFARE
 *
 * La soglia dei fringe benefit non è una franchigia: superata anche di un
 * euro, diventa imponibile l'intero importo. È la discontinuità che un
 * calcolatore che arrotonda nasconde.
 * ========================================================================*/
gruppo("8. Il cliff dei fringe benefit");
{
  const soglia = netto(30000, { welfare: 1000 });
  const oltre = netto(30000, { welfare: 1001 });
  ok("a 1.000 € il welfare è interamente esente", soglia.welfareEsente === 1000);
  ok("a 1.001 € diventa interamente imponibile", oltre.welfareImponibile === 1001);
  ok("un euro in più fa scendere il netto mensile",
     oltre.nettoMensile < soglia.nettoMensile);
  ok("il salto vale più di 25 € al mese",
     soglia.nettoMensile - oltre.nettoMensile > 25,
     (soglia.nettoMensile - oltre.nettoMensile).toFixed(2) + " €");
  ok("il prototipo lo segnala esplicitamente",
     oltre.avvertenze.some((a) => /soglia/i.test(a)));
  ok("con figli a carico la soglia raddoppia a 2.000 €",
     netto(30000, { figli: 1, welfare: 2000 }).welfareEsente === 2000);
  ok("e a 2.001 € il cliff si ripresenta",
     netto(30000, { figli: 1, welfare: 2001 }).welfareImponibile === 2001);
}

/* ==========================================================================
 * 9. INVARIANTI — devono valere per qualunque input
 * ========================================================================*/
gruppo("9. Invarianti su tutto il dominio");
{
  const campione = [];
  for (let ral = 1000; ral <= 300000; ral += 1000) campione.push(ral);

  let quadratura = true, irpefNegativa = false, nettoNegativo = false;
  for (const ral of campione) {
    const r = netto(ral);
    if (Math.abs((r.baseLorda - r.totaleTrattenute + r.sommeAggiuntive) - r.nettoAnnuo) > 0.05) {
      quadratura = false;
    }
    if (r.irpefNetta < 0) irpefNegativa = true;
    if (r.nettoAnnuo < 0) nettoNegativo = true;
  }
  ok("lordo − trattenute + somme aggiuntive = netto, sempre (300 casi)", quadratura);
  ok("l'IRPEF netta non è mai negativa", !irpefNegativa);
  ok("il netto non è mai negativo", !nettoNegativo);

  /* ------------------------------------------------------------------
   * Monotonia: NON è vera, e non deve esserlo.
   *
   * Il primo invariante che avevo scritto era «il netto cresce sempre al
   * crescere del lordo». È falso, e scoprire perché è stata la parte più
   * istruttiva di tutta la task.
   *
   * L'IRPEF italiana è progressiva a scaglioni e quindi continua: da lì
   * nessun salto. Ma sopra l'IRPEF ci sono misure che funzionano a SOGLIA e
   * non a franchigia, e ognuna introduce un gradino. Il netto è quindi
   * monotono a tratti, con un numero finito di discontinuità, e ciascuna sta
   * su una soglia di legge precisa.
   *
   * Il test giusto non è «non ci sono salti». È: i salti sono esattamente
   * tre, e sono esattamente dove la norma dice. Così il test documenta il
   * dominio invece di negarlo, e se un domani ne comparisse un quarto
   * — o ne sparisse uno — se ne accorgerebbe subito.
   * ----------------------------------------------------------------*/
  const fine = [];
  for (let ral = 200; ral <= 300000; ral += 50) fine.push(ral);
  const salti = [];
  let prec = -1, precRal = 0;
  for (const ral of fine) {
    const r = netto(ral);
    if (r.nettoAnnuo < prec - 0.005) {
      salti.push({ ral, imponibile: r.imponibileFiscale, perdita: prec - r.nettoAnnuo });
    }
    prec = r.nettoAnnuo; precRal = ral;
  }

  ok("le discontinuità sono esattamente tre (su 5.997 campioni)",
     salti.length === 3,
     salti.map((s) => "RAL " + s.ral).join(", "));

  const attraversa = (s, soglia) =>
    s && Math.abs(s.imponibile - soglia) < 60;

  ok("la prima cade sulla soglia del trattamento integrativo, 15.000 € di reddito",
     attraversa(salti[0], P.TRATTAMENTO_INTEGRATIVO.sogliaReddito),
     salti[0] ? "imponibile " + salti[0].imponibile.toFixed(0) : "assente");
  ok("la seconda sulla soglia di esenzione dell'addizionale comunale, 23.000 €",
     attraversa(salti[1], P.ADDIZIONALE_COMUNALE_DEFAULT.sogliaEsenzione),
     salti[1] ? "imponibile " + salti[1].imponibile.toFixed(0) : "assente");
  ok("la terza dove finisce la maggiorazione di 65 € della detrazione, 35.000 €",
     attraversa(salti[2], P.DETRAZIONI_LAVORO_DIPENDENTE.maggiorazione.a),
     salti[2] ? "imponibile " + salti[2].imponibile.toFixed(0) : "assente");

  ok("nessun salto costa più di 200 € di netto annuo",
     salti.every((s) => s.perdita < 200),
     salti.map((s) => s.perdita.toFixed(2)).join(", "));

  /* Fra una soglia e l'altra la crescita deve essere rigorosa: se qui
     comparisse un salto sarebbe un bug e non una scelta del legislatore.
     È il test che ha scoperto il pavimento della detrazione applicato a
     tutti gli scaglioni, che creava un quarto gradino a 50.000 € — quello
     sì un bug, e da 190 €. */
  const tratti = [[39000, 300000], [26000, 38000], [17000, 25000], [200, 16000]];
  let monotonoATratti = true, doveRotto = null;
  for (const [da, a] of tratti) {
    let p = -1;
    for (let ral = da; ral <= a; ral += 50) {
      const v = netto(ral).nettoAnnuo;
      if (v < p - 0.005) { monotonoATratti = false; doveRotto = doveRotto || ral; }
      p = v;
    }
  }
  ok("fra una soglia e l'altra il netto cresce in modo rigoroso",
     monotonoATratti, doveRotto ? "rotto a RAL " + doveRotto : "");

  const r30 = netto(30000);
  quasi("l'incidenza delle trattenute è coerente col netto (in percentuale)",
        r30.totaleTrattenute / r30.baseLorda * 100, r30.incidenza, 0.01);
  quasi("netto mensile × mensilità = netto annuo",
        r30.nettoAnnuo, r30.nettoMensile * 13, 0.15);

  ok("le mensilità cambiano solo la ripartizione, non il totale",
     Math.abs(netto(30000, { mensilita: 12 }).nettoAnnuo -
              netto(30000, { mensilita: 14 }).nettoAnnuo) < 0.01);
  ok("con 14 mensilità il mensile è più basso che con 12",
     netto(30000, { mensilita: 14 }).nettoMensile < netto(30000, { mensilita: 12 }).nettoMensile);
}

/* ==========================================================================
 * 10. CALCOLO INVERSO — dal netto desiderato alla RAL
 * ========================================================================*/
gruppo("10. Calcolo inverso");
{
  for (const obiettivo of [1200, 1500, 1800, 2500, 4000]) {
    const ral = CALC.calcolaRalDaNetto(obiettivo, STANDARD);
    const verifica = netto(ral).nettoMensile;
    quasi("netto richiesto " + obiettivo + " € → RAL " + ral.toFixed(0) +
          " € → netto ottenuto " + verifica.toFixed(2) + " €",
          obiettivo, verifica, 0.6);
  }
  ok("il calcolo inverso è crescente",
     CALC.calcolaRalDaNetto(2500, STANDARD) > CALC.calcolaRalDaNetto(1500, STANDARD));
  ok("tiene conto delle opzioni: con coniuge a carico serve meno RAL",
     CALC.calcolaRalDaNetto(1800, Object.assign({ coniugeACarico: true }, STANDARD)) <
     CALC.calcolaRalDaNetto(1800, STANDARD));
}

/* ==========================================================================
 * 11. CASI LIMITE E VALIDAZIONE
 * ========================================================================*/
gruppo("11. Casi limite e validazione degli input");
{
  const zero = netto(0);
  ok("RAL zero produce netto zero senza esplodere", zero.nettoAnnuo === 0);
  ok("e nessuna imposta", zero.irpefLorda === 0 && zero.contributiInps === 0);

  const rifiuta = (fn) => { try { fn(); return false; } catch (e) { return true; } };
  ok("una RAL negativa viene rifiutata", rifiuta(() => CALC.calcolaNetto(-1000, STANDARD)));
  ok("una RAL non numerica viene rifiutata", rifiuta(() => CALC.calcolaNetto("trentamila", STANDARD)));
  ok("mensilità pari a zero vengono rifiutate", rifiuta(() => netto(30000, { mensilita: 0 })));
  ok("giorni fuori dall'intervallo 1-365 vengono rifiutati",
     rifiuta(() => netto(30000, { giorni: 400 })) && rifiuta(() => netto(30000, { giorni: 0 })));

  const r = netto(30000);
  ok("il risultato espone il dettaglio riga per riga",
     Array.isArray(r.dettaglio) && r.dettaglio.length > 0);
  ok("ogni riga del dettaglio porta la propria formula",
     r.dettaglio.every((v) => typeof v.formula === "string" && v.formula.length > 0));
  ok("ogni riga del dettaglio porta la propria fonte normativa",
     r.dettaglio.every((v) => typeof v.fonte === "string" && v.fonte.length > 0));
  ok("il risultato dichiara l'anno d'imposta", r.annoFiscale === 2026);
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
