"use strict";
/* ============================================================================
 * MOTORE DI CALCOLO — dalla RAL al netto
 *
 * Questo file contiene SOLO logica: nessun numero fiscale è scritto qui dentro.
 * Tutti i parametri arrivano da parametri-2026.js. La separazione è voluta:
 * cambiare anno d'imposta significa toccare un solo file, e leggere una formula
 * significa vedere il ragionamento senza costanti magiche in mezzo.
 *
 * Espone globalThis.CALC = { calcolaNetto, calcolaRalDaNetto, PARAMETRI }.
 * ==========================================================================*/

(() => {

  const P = globalThis.PARAMETRI_2026;
  if (!P) throw new Error("parametri-2026.js deve essere caricato prima di calcolo.js");

  const {
    ANNO_FISCALE, CONTRIBUTI, SCAGLIONI_IRPEF, DETRAZIONI_LAVORO_DIPENDENTE,
    DETRAZIONI_FAMILIARI, ULTERIORE_DETRAZIONE, SOMMA_INTEGRATIVA,
    TRATTAMENTO_INTEGRATIVO, ADDIZIONALE_REGIONALE_LOMBARDIA,
    ADDIZIONALE_COMUNALE_DEFAULT, FRINGE_BENEFIT, MENSILITA_DEFAULT
  } = P;

  /* ---------- utilità ---------- */
  function arrotonda(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
  const euro = (n) =>
    arrotonda(n).toLocaleString("it-IT", { minimumFractionDigits: 2 });
  const perc = (n) => (n * 100).toFixed(2).replace(".", ",");

  /** Applica una scala a scaglioni progressivi e restituisce anche il dettaglio
   *  riga per riga, che serve a mostrare la formula in pagina. */
  function applicaScaglioni(imponibile, scaglioni) {
    let residuo = imponibile, precedente = 0, totale = 0;
    const dettaglio = [];
    for (const s of scaglioni) {
      if (residuo <= 0) break;
      const tetto = s.limite ?? Infinity;
      const quota = Math.min(residuo, tetto - precedente);
      const imposta = quota * s.aliquota;
      totale += imposta;
      dettaglio.push(`${euro(quota)} € × ${perc(s.aliquota)}% = ${euro(imposta)} €`);
      residuo -= quota;
      precedente = tetto;
    }
    return { totale: arrotonda(totale), dettaglio };
  }

  /* ---------- contributi ---------- */
  function aliquotaContributiva(contratto) {
    return contratto === "apprendistato"
      ? CONTRIBUTI.aliquotaApprendista
      : CONTRIBUTI.aliquotaDipendente;
  }

  function calcolaContributi(imponibilePrevidenziale, contratto) {
    const base = Math.min(imponibilePrevidenziale, CONTRIBUTI.massimaleAnnuo);
    const ivs = base * aliquotaContributiva(contratto);
    const eccedenza = Math.max(0, base - CONTRIBUTI.primaFasciaPensionabile);
    return arrotonda(ivs + eccedenza * CONTRIBUTI.aliquotaAggiuntiva);
  }

  /* ---------- detrazioni ---------- */
  /** Art. 13 TUIR. Rapportata ai giorni di lavoro nell'anno; il minimo
   *  garantito fa da pavimento e non è rapportato. */
  function calcolaDetrazioneLavoroDipendente(reddito, giorni, contratto) {
    const D = DETRAZIONI_LAVORO_DIPENDENTE;
    if (reddito <= 0) return 0;
    let base;
    if (reddito <= D.sogliaBase) {
      base = D.importoBase;
    } else if (reddito <= D.fascia2.limite) {
      base = D.fascia2.fisso +
        D.fascia2.variabile * ((D.fascia2.limite - reddito) / D.fascia2.ampiezza);
    } else if (reddito <= D.fascia3.limite) {
      base = D.fascia3.fisso * ((D.fascia3.limite - reddito) / D.fascia3.ampiezza);
    } else {
      return 0;
    }
    let ragguagliata = base * (giorni / D.giorniAnno);
    const m = D.maggiorazione;
    if (reddito >= m.da && reddito <= m.a) ragguagliata += m.importo;
    const minimo = contratto === "determinato"
      ? D.minimoDeterminato : D.minimoIndeterminato;
    return arrotonda(Math.max(ragguagliata, minimo));
  }

  function calcolaDetrazioneConiuge(reddito, presente) {
    if (!presente || reddito <= 0) return 0;
    const C = DETRAZIONI_FAMILIARI.coniuge;
    if (reddito <= C.fascia1.limite) {
      return arrotonda(C.fascia1.base - C.fascia1.riduzione * (reddito / C.fascia1.limite));
    }
    if (reddito <= C.fascia2.limite) return C.fascia2.importo;
    if (reddito <= C.fascia3.limite) {
      return arrotonda(C.fascia3.importo * ((C.fascia3.limite - reddito) / C.fascia3.ampiezza));
    }
    return 0;
  }

  function calcolaDetrazioneFigli(reddito, numero, percentuale) {
    const F = DETRAZIONI_FAMILIARI.figli;
    if (numero <= 0 || reddito <= 0) return 0;
    const soglia = F.soglia + F.incrementoPerFiglio * (numero - 1);
    if (reddito >= soglia) return 0;
    return arrotonda(F.importo * numero * ((soglia - reddito) / soglia) * (percentuale / 100));
  }

  function calcolaDetrazioneAltriFamiliari(reddito, numero) {
    const A = DETRAZIONI_FAMILIARI.altri;
    if (numero <= 0 || reddito <= 0 || reddito >= A.soglia) return 0;
    return arrotonda(A.importo * numero * ((A.soglia - reddito) / A.soglia));
  }

  function calcolaUlterioreDetrazione(reddito) {
    const u = ULTERIORE_DETRAZIONE;
    if (reddito < u.da || reddito > u.a) return 0;
    if (reddito <= u.sogliaPiena) return u.importo;
    return arrotonda(u.importo * ((u.a - reddito) / (u.a - u.sogliaPiena)));
  }

  /* ---------- addizionali ---------- */
  function calcolaAddizionaleRegionale(imponibile, aliquotaUnica) {
    if (imponibile <= 0) return 0;
    if (aliquotaUnica == null) {
      return applicaScaglioni(imponibile, ADDIZIONALE_REGIONALE_LOMBARDIA).totale;
    }
    return arrotonda(imponibile * aliquotaUnica);
  }

  function calcolaAddizionaleComunale(imponibile, aliquota, soglia) {
    if (imponibile <= soglia) return 0;
    return arrotonda(imponibile * aliquota);
  }

  /* ---------- misure integrative ---------- */
  function calcolaTrattamentoIntegrativo(reddito, irpefLorda, detrazioneLavoro, attivo) {
    const t = TRATTAMENTO_INTEGRATIVO;
    if (!attivo || reddito > t.sogliaReddito) return 0;
    if (irpefLorda <= detrazioneLavoro) return 0;
    return t.importo;
  }

  function calcolaSommaIntegrativa(reddito) {
    if (reddito <= 0) return 0;
    const f = SOMMA_INTEGRATIVA.fasce.find((x) => reddito <= x.limite);
    return f ? arrotonda(reddito * f.percentuale) : 0;
  }

  function sogliaFringe(figli) {
    return figli > 0 ? FRINGE_BENEFIT.sogliaConFigli : FRINGE_BENEFIT.soglia;
  }

  /* ========================================================================
   * CALCOLO PRINCIPALE
   * ======================================================================*/
  function calcolaNetto(ral, opzioni) {
    const o = Object.assign({
      mensilita: MENSILITA_DEFAULT,
      contratto: "indeterminato",
      giorni: 365,
      coniugeACarico: false,
      figli: 0,
      percentualeFigli: 100,
      altriFamiliari: 0,
      bonus100: true,
      welfare: 0,
      aliquotaRegionale: null,
      aliquotaComunale: ADDIZIONALE_COMUNALE_DEFAULT.aliquota,
      sogliaComunale: ADDIZIONALE_COMUNALE_DEFAULT.sogliaEsenzione
    }, opzioni || {});

    if (!Number.isFinite(ral) || ral < 0) {
      throw new Error("La RAL deve essere un numero positivo.");
    }
    if (!Number.isFinite(o.mensilita) || o.mensilita <= 0) {
      throw new Error("Il numero di mensilità deve essere maggiore di zero.");
    }
    if (!Number.isFinite(o.giorni) || o.giorni <= 0 || o.giorni > 365) {
      throw new Error("I giorni di lavoro devono essere compresi fra 1 e 365.");
    }

    /* Welfare: sotto soglia è esente e si somma al netto; superata la soglia
       anche di un euro diventa imponibile l'intero importo, che quindi entra
       nella base contributiva e fiscale. */
    const soglia = sogliaFringe(o.figli);
    const welfareEsente = o.welfare > 0 && o.welfare <= soglia;
    const welfareImponibile = o.welfare > soglia ? o.welfare : 0;
    const baseLorda = arrotonda(ral + welfareImponibile);

    const contributiInps = calcolaContributi(baseLorda, o.contratto);
    const imponibileFiscale = arrotonda(baseLorda - contributiInps);

    const scagl = applicaScaglioni(imponibileFiscale, SCAGLIONI_IRPEF);
    const irpefLorda = scagl.totale;

    const detrazioneLavoroDipendente =
      calcolaDetrazioneLavoroDipendente(imponibileFiscale, o.giorni, o.contratto);
    const detrazioneConiuge =
      calcolaDetrazioneConiuge(imponibileFiscale, o.coniugeACarico);
    const detrazioneFigli =
      calcolaDetrazioneFigli(imponibileFiscale, o.figli, o.percentualeFigli);
    const detrazioneAltriFamiliari =
      calcolaDetrazioneAltriFamiliari(imponibileFiscale, o.altriFamiliari);
    const detrazioniFamiliari =
      arrotonda(detrazioneConiuge + detrazioneFigli + detrazioneAltriFamiliari);
    const ulterioreDetrazione = calcolaUlterioreDetrazione(imponibileFiscale);

    const detrazioniTotali = arrotonda(
      detrazioneLavoroDipendente + detrazioniFamiliari + ulterioreDetrazione
    );
    const irpefNetta = arrotonda(Math.max(0, irpefLorda - detrazioniTotali));

    const addizionaleRegionale =
      calcolaAddizionaleRegionale(imponibileFiscale, o.aliquotaRegionale);
    const addizionaleComunale =
      calcolaAddizionaleComunale(imponibileFiscale, o.aliquotaComunale, o.sogliaComunale);

    const trattamentoIntegrativo = calcolaTrattamentoIntegrativo(
      imponibileFiscale, irpefLorda, detrazioneLavoroDipendente, o.bonus100
    );
    const sommaIntegrativa = calcolaSommaIntegrativa(imponibileFiscale);
    const welfareNetto = welfareEsente ? o.welfare : 0;
    const sommeAggiuntive =
      arrotonda(trattamentoIntegrativo + sommaIntegrativa + welfareNetto);

    const totaleTrattenute = arrotonda(
      contributiInps + irpefNetta + addizionaleRegionale + addizionaleComunale
    );
    const nettoAnnuo = arrotonda(baseLorda - totaleTrattenute + sommeAggiuntive);
    const nettoMensile = arrotonda(nettoAnnuo / o.mensilita);
    const incidenza = baseLorda > 0
      ? arrotonda((totaleTrattenute / baseLorda) * 100) : 0;
    const aliquotaEffettiva = baseLorda > 0
      ? arrotonda((nettoAnnuo / baseLorda) * 100) : 0;

    /* ---------- dettaglio per la pagina ---------- */
    const dettaglio = [];
    const riga = (r) => dettaglio.push(r);

    riga({
      id: "ral", etichetta: "Retribuzione annua lorda", importo: ral,
      segno: "neutro", formula: "Valore inserito", fonte: "Dato di partenza."
    });

    if (welfareImponibile > 0) {
      riga({
        id: "welfare-imponibile",
        etichetta: "Welfare e fringe benefit (oltre soglia, imponibili)",
        importo: welfareImponibile, segno: "neutro",
        formula: `${euro(o.welfare)} € > soglia di ${euro(soglia)} € → imponibile per intero`,
        fonte: `La soglia di esenzione è ${euro(FRINGE_BENEFIT.soglia)} €, elevata a ${euro(FRINGE_BENEFIT.sogliaConFigli)} € per chi ha figli a carico (periodi d'imposta 2025-2027). Superata anche di un solo euro, diventa imponibile l'intero importo e non la sola eccedenza: per questo qui rientra nella base contributiva e fiscale.`
      });
    }

    riga({
      id: "contributi",
      etichetta: o.contratto === "apprendistato"
        ? "Contributi INPS (apprendista)" : "Contributi INPS (carico dipendente)",
      importo: contributiInps, segno: "negativo",
      formula: formulaContributi(baseLorda, contributiInps, o.contratto),
      fonte: `Aliquota IVS ${perc(aliquotaContributiva(o.contratto))}% a carico del lavoratore${o.contratto === "apprendistato" ? ", ridotta per il contratto di apprendistato" : " nel settore privato"}. Il 23,81% a carico del datore è costo aziendale e non compare in busta paga. Massimale ${euro(CONTRIBUTI.massimaleAnnuo)} €; sulla quota oltre ${euro(CONTRIBUTI.primaFasciaPensionabile)} € si applica l'aliquota aggiuntiva dell'1% (art. 3-ter L. 438/1992). Fonte: circolari INPS 2026.`
    });

    riga({
      id: "imponibile", etichetta: "Imponibile fiscale",
      importo: imponibileFiscale, segno: "neutro",
      formula: `${euro(baseLorda)} € − ${euro(contributiInps)} € = ${euro(imponibileFiscale)} €`,
      fonte: "I contributi previdenziali obbligatori sono deducibili, quindi non concorrono a formare il reddito di lavoro dipendente (art. 51 co. 2 lett. a TUIR)."
    });

    riga({
      id: "irpef-lorda", etichetta: "IRPEF lorda",
      importo: irpefLorda, segno: "negativo",
      formula: componiFormula(scagl.dettaglio, irpefLorda),
      fonte: "Scaglioni 2026: 23% fino a 28.000 €, 33% da 28.001 a 50.000 €, 43% oltre. La seconda aliquota è scesa dal 35% al 33% con la Legge di Bilancio 2026. Fonte: MEF."
    });

    riga({
      id: "detrazione-lavoro", etichetta: "Detrazione per lavoro dipendente",
      importo: detrazioneLavoroDipendente, segno: "positivo",
      formula: formulaDetrazioneLavoro(imponibileFiscale, detrazioneLavoroDipendente, o),
      fonte: `Art. 13 TUIR. Include la maggiorazione di 65 € fra 25.000 e 35.000 € di reddito. È rapportata ai giorni di lavoro nell'anno (${o.giorni}/365) e non può comunque scendere sotto ${o.contratto === "determinato" ? "1.380 € per i rapporti a termine" : "690 € per i rapporti a tempo indeterminato"}.`
    });

    if (o.coniugeACarico) {
      riga({
        id: "detr-coniuge", etichetta: "Detrazione per coniuge a carico",
        importo: detrazioneConiuge, segno: "positivo",
        formula: formulaConiuge(imponibileFiscale, detrazioneConiuge),
        fonte: `Art. 12 co. 1 lett. a) TUIR. Il coniuge è a carico se il suo reddito proprio non supera ${euro(DETRAZIONI_FAMILIARI.limiteRedditoFamiliare)} €. La detrazione si azzera oltre 80.000 € di reddito del dichiarante.`
      });
    }

    if (o.figli > 0) {
      const sogliaFigli = DETRAZIONI_FAMILIARI.figli.soglia +
        DETRAZIONI_FAMILIARI.figli.incrementoPerFiglio * (o.figli - 1);
      riga({
        id: "detr-figli",
        etichetta: `Detrazione per ${o.figli} figl${o.figli === 1 ? "io" : "i"} a carico (21-29 anni)`,
        importo: detrazioneFigli, segno: "positivo",
        formula: detrazioneFigli > 0
          ? `${o.figli} × 950 € × [(${euro(sogliaFigli)} − ${euro(imponibileFiscale)}) / ${euro(sogliaFigli)}] × ${o.percentualeFigli}% = ${euro(detrazioneFigli)} €`
          : `Reddito oltre la soglia di ${euro(sogliaFigli)} € → detrazione azzerata`,
        fonte: `Art. 12 co. 1 lett. c) TUIR, come riscritto dal D.Lgs. 192/2024 e dalla L. 207/2024. Spetta solo per i figli dai 21 ai 29 anni: sotto i 21 anni è sostituita dall'assegno unico INPS, dai 30 anni non spetta più. La soglia di 95.000 € sale di 15.000 € per ogni figlio oltre il primo. Ripartizione applicata: ${o.percentualeFigli}%.`
      });
    }

    if (o.altriFamiliari > 0) {
      riga({
        id: "detr-altri",
        etichetta: `Detrazione per ${o.altriFamiliari} altro/i familiare/i a carico`,
        importo: detrazioneAltriFamiliari, segno: "positivo",
        formula: detrazioneAltriFamiliari > 0
          ? `${o.altriFamiliari} × 750 € × [(80.000 − ${euro(imponibileFiscale)}) / 80.000] = ${euro(detrazioneAltriFamiliari)} €`
          : "Reddito oltre 80.000 € → detrazione azzerata",
        fonte: "Art. 12 co. 1 lett. d) TUIR. Dal 2025 spetta ai soli ascendenti conviventi con il contribuente."
      });
    }

    riga({
      id: "ulteriore-detrazione",
      etichetta: "Ulteriore detrazione (redditi 20.000 – 40.000 €)",
      importo: ulterioreDetrazione, segno: "positivo",
      formula: ulterioreDetrazione > 0
        ? (imponibileFiscale <= ULTERIORE_DETRAZIONE.sogliaPiena
            ? `Importo pieno: ${euro(ULTERIORE_DETRAZIONE.importo)} €`
            : `1.000 × [(40.000 − ${euro(imponibileFiscale)}) / 8.000] = ${euro(ulterioreDetrazione)} €`)
        : "Non spettante per questa fascia di reddito",
      fonte: "L. 207/2024 art. 1 co. 6, confermata per il 2026. Piena fino a 32.000 €, poi si riduce linearmente fino ad azzerarsi a 40.000 €. È alternativa alla somma integrativa, che spetta sotto i 20.000 €."
    });

    riga({
      id: "irpef-netta", etichetta: "IRPEF netta", importo: irpefNetta,
      segno: "negativo",
      formula: `max(0; ${euro(irpefLorda)} € − ${euro(detrazioniTotali)} € di detrazioni) = ${euro(irpefNetta)} €`,
      fonte: "L'imposta netta non può essere negativa: le detrazioni eccedenti si perdono e non generano un credito."
    });

    riga({
      id: "add-regionale",
      etichetta: o.aliquotaRegionale == null
        ? "Addizionale regionale Lombardia" : "Addizionale regionale",
      importo: addizionaleRegionale, segno: "negativo",
      formula: o.aliquotaRegionale == null
        ? componiFormula(applicaScaglioni(imponibileFiscale, ADDIZIONALE_REGIONALE_LOMBARDIA).dettaglio, addizionaleRegionale)
        : `${euro(imponibileFiscale)} € × ${perc(o.aliquotaRegionale)}% = ${euro(addizionaleRegionale)} €`,
      fonte: o.aliquotaRegionale == null
        ? "Lombardia, aliquote a scaglioni dall'1,23% all'1,73%. Fonte: Dipartimento delle Finanze (MEF), art. 72 L.R. Lombardia 10/2003. Semplificazione: calcolata sul reddito dell'anno corrente, mentre nella realtà si trattiene a rate nell'anno successivo."
        : "Aliquota unica inserita manualmente. Le aliquote regionali 2026 vanno dallo 0,70% a oltre il 2%, con strutture a scaglioni diverse regione per regione: non essendo state verificabili su fonte primaria, il prototipo non le precarica."
    });

    riga({
      id: "add-comunale", etichetta: "Addizionale comunale",
      importo: addizionaleComunale, segno: "negativo",
      formula: addizionaleComunale > 0
        ? `${euro(imponibileFiscale)} € × ${perc(o.aliquotaComunale)}% = ${euro(addizionaleComunale)} €`
        : `Imponibile sotto la soglia di esenzione di ${euro(o.sogliaComunale)} € → esente`,
      fonte: `Aliquota ${perc(o.aliquotaComunale)}% con esenzione fino a ${euro(o.sogliaComunale)} €, precompilate sui valori di Milano (delibera n. 46 del 28/09/2020). È una soglia e non una franchigia: superata, si paga sull'intero imponibile e non sulla sola eccedenza.`
    });

    if (trattamentoIntegrativo > 0) {
      riga({
        id: "trattamento-integrativo",
        etichetta: "Trattamento integrativo (bonus 100 €)",
        importo: trattamentoIntegrativo, segno: "positivo",
        formula: `Reddito ≤ ${euro(TRATTAMENTO_INTEGRATIVO.sogliaReddito)} € e imposta lorda capiente → ${euro(trattamentoIntegrativo)} €`,
        fonte: "DL 3/2020 art. 1, disciplina confermata per il 2026. Spetta per intero fino a 15.000 € di reddito, se l'imposta lorda supera la detrazione per lavoro dipendente. Fra 15.000 e 28.000 € spetta solo per la parte in cui le detrazioni complessive eccedono l'imposta lorda: dipende anche da spese mediche e bonus edilizi, che questo calcolatore non conosce, quindi quella fascia non è modellata. È cumulabile con la somma integrativa."
      });
    }

    if (sommaIntegrativa > 0) {
      riga({
        id: "somma-integrativa",
        etichetta: "Somma integrativa non imponibile",
        importo: sommaIntegrativa, segno: "positivo",
        formula: `${euro(imponibileFiscale)} € × percentuale di fascia = ${euro(sommaIntegrativa)} €`,
        fonte: "L. 207/2024 art. 1 co. 4-5, confermata per il 2026. Percentuale sul reddito di lavoro dipendente: 7,1% fino a 8.500 €, 5,3% fino a 15.000 €, 4,8% oltre, riservata ai redditi complessivi fino a 20.000 €. Non concorre a formare il reddito, quindi non è né tassata né soggetta a contributi."
      });
    }

    if (welfareNetto > 0) {
      riga({
        id: "welfare-esente",
        etichetta: "Welfare e fringe benefit (esenti)",
        importo: welfareNetto, segno: "positivo",
        formula: `${euro(welfareNetto)} € ≤ soglia di ${euro(soglia)} € → esenti da IRPEF e contributi`,
        fonte: `Soglia di ${euro(FRINGE_BENEFIT.soglia)} €, elevata a ${euro(FRINGE_BENEFIT.sogliaConFigli)} € per chi ha figli a carico, per i periodi d'imposta 2025-2027. Qui la soglia applicata è ${euro(soglia)} € perché ${o.figli > 0 ? "sono stati indicati figli a carico" : "non sono stati indicati figli a carico"}.`
      });
    }

    riga({
      id: "netto-annuo", etichetta: "Netto annuo", importo: nettoAnnuo,
      segno: "neutro",
      formula: `${euro(baseLorda)} € − ${euro(totaleTrattenute)} € di trattenute${sommeAggiuntive > 0 ? ` + ${euro(sommeAggiuntive)} € di somme non imponibili` : ""} = ${euro(nettoAnnuo)} €`,
      fonte: "Somma algebrica delle voci precedenti."
    });

    /* ---------- avvertenze legate al singolo risultato ---------- */
    const avvertenze = [];
    if (baseLorda > CONTRIBUTI.massimaleAnnuo) {
      avvertenze.push(`Lordo oltre il massimale contributivo di ${euro(CONTRIBUTI.massimaleAnnuo)} €: sulla quota eccedente non si versa IVS. Il massimale vale per i soli iscritti privi di anzianità contributiva al 31/12/1995, assunzione che il prototipo adotta per tutti.`);
    }
    if (welfareImponibile > 0) {
      avvertenze.push(`I ${euro(o.welfare)} € di welfare superano la soglia di ${euro(soglia)} €, quindi sono interamente imponibili: concorrono al lordo e sono tassati come retribuzione. Restando sotto soglia sarebbero stati esenti per intero.`);
    }
    if (o.giorni < 365) {
      avvertenze.push(`Le detrazioni sono rapportate a ${o.giorni} giorni su 365. Il risultato rappresenta quindi un anno parziale: il netto mensile è il netto di periodo diviso per le mensilità indicate.`);
    }

    return {
      annoFiscale: ANNO_FISCALE, ral, baseLorda, opzioni: o,
      mensilita: o.mensilita, contributiInps, imponibileFiscale, irpefLorda,
      detrazioneLavoroDipendente, detrazioneConiuge, detrazioneFigli,
      detrazioneAltriFamiliari, detrazioniFamiliari, ulterioreDetrazione,
      detrazioniTotali, irpefNetta, addizionaleRegionale, addizionaleComunale,
      trattamentoIntegrativo, sommaIntegrativa, welfareEsente: welfareNetto,
      welfareImponibile, sommeAggiuntive, totaleTrattenute, nettoAnnuo,
      nettoMensile, incidenza, aliquotaEffettiva, dettaglio, avvertenze
    };
  }

  /* ---------- composizione delle formule mostrate in pagina ---------- */
  function componiFormula(righe, totale) {
    if (righe.length === 0) return "Imponibile nullo → nessuna imposta";
    if (righe.length === 1) return righe[0];
    return righe.join("  +  ") + `  =  ${euro(totale)} €`;
  }

  function formulaContributi(base, totale, contratto) {
    const b = Math.min(base, CONTRIBUTI.massimaleAnnuo);
    const al = aliquotaContributiva(contratto);
    const ecc = Math.max(0, b - CONTRIBUTI.primaFasciaPensionabile);
    const testa = `${euro(b)} € × ${perc(al)}% = ${euro(b * al)} €`;
    if (ecc <= 0) return testa;
    return `${testa}  +  quota oltre ${euro(CONTRIBUTI.primaFasciaPensionabile)} €: ${euro(ecc)} € × ${perc(CONTRIBUTI.aliquotaAggiuntiva)}% = ${euro(ecc * CONTRIBUTI.aliquotaAggiuntiva)} €  =  ${euro(totale)} €`;
  }

  function formulaDetrazioneLavoro(reddito, risultato, o) {
    const D = DETRAZIONI_LAVORO_DIPENDENTE;
    const rag = o.giorni < 365 ? ` × ${o.giorni}/365` : "";
    let base;
    if (reddito <= D.sogliaBase) base = `importo fisso 1.955 €${rag}`;
    else if (reddito <= D.fascia2.limite) base = `1.910 + 1.190 × [(28.000 − ${euro(reddito)}) / 13.000]${rag}`;
    else if (reddito <= D.fascia3.limite) base = `1.910 × [(50.000 − ${euro(reddito)}) / 22.000]${rag}`;
    else return "Reddito oltre 50.000 € → detrazione azzerata";
    const magg = (reddito >= D.maggiorazione.da && reddito <= D.maggiorazione.a)
      ? "  +  65 € di maggiorazione" : "";
    return `${base}${magg}  =  ${euro(risultato)} €`;
  }

  function formulaConiuge(reddito, risultato) {
    const C = DETRAZIONI_FAMILIARI.coniuge;
    if (reddito <= C.fascia1.limite)
      return `800 − 110 × (${euro(reddito)} / 15.000) = ${euro(risultato)} €`;
    if (reddito <= C.fascia2.limite)
      return "Reddito fra 15.000 e 40.000 € → importo fisso 690 €";
    if (reddito <= C.fascia3.limite)
      return `690 × [(80.000 − ${euro(reddito)}) / 40.000] = ${euro(risultato)} €`;
    return "Reddito oltre 80.000 € → detrazione azzerata";
  }

  /* ========================================================================
   * CALCOLO INVERSO — dal netto desiderato alla RAL
   * Il netto è monotono crescente nella RAL, quindi la bisezione converge
   * sempre. Cento iterazioni sono abbondanti: si dimezza l'intervallo ogni
   * giro, quindi bastano una quarantina per esaurire la precisione dei float.
   * ======================================================================*/
  function calcolaRalDaNetto(nettoMensileDesiderato, opzioni, tolleranza) {
    const o = opzioni || {};
    const mens = o.mensilita || MENSILITA_DEFAULT;
    const toll = tolleranza == null ? 0.5 : tolleranza;
    const obiettivo = nettoMensileDesiderato * mens;
    let basso = 0, alto = Math.max(obiettivo * 3, 2e4);
    for (let i = 0; i < 100; i++) {
      const medio = (basso + alto) / 2;
      const r = calcolaNetto(medio, o).nettoAnnuo;
      if (Math.abs(r - obiettivo) < toll) return arrotonda(medio);
      if (r < obiettivo) basso = medio; else alto = medio;
    }
    return arrotonda((basso + alto) / 2);
  }

  globalThis.CALC = { calcolaNetto, calcolaRalDaNetto, PARAMETRI: P };
})();
