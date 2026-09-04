"use strict";
/* ============================================================================
 * RULESET DELLE AGEVOLAZIONI SUL COSTO DEL LAVORO — 2026
 *
 * Questo file è il catasto normativo del progetto. Contiene le agevolazioni
 * come DATI INTERROGABILI, non come prosa: ogni misura dichiara i propri
 * requisiti come predicati eseguibili, il proprio beneficio come formula, la
 * propria durata, i propri tetti, con chi è cumulabile e cosa va depositato
 * dove entro quando.
 *
 * La scelta di fondo
 * ---------------------------------------------------------------------------
 * Oggi questa conoscenza vive in tre posti: la testa di un consulente del
 * lavoro, un articolo di blog che invecchia in tre mesi, e un foglio Excel che
 * qualcuno aggiorna a mano. Tutti e tre hanno lo stesso difetto: non sono
 * interrogabili da una macchina. Non puoi chiedere a un articolo "per questa
 * persona quali misure scattano e quale conviene".
 *
 * Trasformare la normativa in dati con predicati eseguibili è quello che
 * rende automatizzabile il resto. È la decisione più importante del progetto,
 * più di qualunque riga del motore.
 *
 * Tre convenzioni che contano
 * ---------------------------------------------------------------------------
 * 1. Un predicato restituisce true, false oppure NULL. Null significa "con i
 *    dati che mi hai dato non lo so". Un requisito ignoto non è un requisito
 *    mancante: il motore lo tiene distinto e l'interfaccia lo trasforma nella
 *    domanda da fare al candidato. È la differenza fra "non hai diritto" e
 *    "mi serve un dato in più", e nella pratica è la differenza fra un lead
 *    perso e una pratica chiusa.
 *
 * 2. Ogni misura porta un livello di confidenza. Il 2026 è un anno con tre
 *    stratificazioni normative sovrapposte (DL Coesione prorogato, DL 62/2026,
 *    legge di bilancio) e alcune misure sono ancora in assestamento. Dichiararlo
 *    è più utile che nasconderlo.
 *
 * 3. Le finestre temporali sono dati, non commenti. Quasi tutte le misure 2026
 *    hanno una data di apertura e una di chiusura, e il motore le usa per dire
 *    "questa misura è scaduta il 30 aprile" invece di offrirla ancora.
 * ==========================================================================*/

globalThis.AGEVOLAZIONI_2026 = (() => {

  /* --------------------------------------------------------------------------
   * PERIMETRI GEOGRAFICI
   * ------------------------------------------------------------------------*/

  /** ZES unica Mezzogiorno: le otto regioni del perimetro proprio. */
  const ZES_UNICA = [
    "Abruzzo", "Basilicata", "Calabria", "Campania",
    "Molise", "Puglia", "Sardegna", "Sicilia"
  ];

  /** Perimetro allargato usato dai bonus assunzione 2026 per la
   *  maggiorazione del massimale: le otto della ZES più Marche e Umbria.
   *  Fonte: art. 2 DL 62/2026; INPS circ. 55/2026. */
  const ZES_MAGGIORAZIONE_BONUS = ZES_UNICA.concat(["Marche", "Umbria"]);

  /** Perimetro della decontribuzione Sud: le otto regioni del Mezzogiorno.
   *  Fonte: L. 207/2024 co. 406 e seguenti. */
  const MEZZOGIORNO_DECONTRIBUZIONE = ZES_UNICA.slice();

  /* --------------------------------------------------------------------------
   * CONDIZIONI GENERALI — art. 31 D.Lgs. 150/2015
   *
   * Non sono un'agevolazione: sono il cancello davanti a tutte. Se una di
   * queste cade, cadono gli incentivi, tutti insieme, anche quelli già
   * fruiti — con recupero.
   *
   * Le tratto come oggetto separato perché nel processo reale sono la causa
   * più frequente di perdita del beneficio, e perché sono l'unica parte del
   * sistema che nessun calcolatore online verifica. Vengono valutate PRIMA
   * di qualunque conto: un risparmio calcolato su un incentivo che non spetta
   * non è una stima ottimistica, è un danno.
   * Fonte: art. 31 D.Lgs. 150/2015; art. 1 co. 1175 L. 296/2006 (DURC).
   * ------------------------------------------------------------------------*/
  const CONDIZIONI_GENERALI = {
    norma: "art. 31 D.Lgs. 150/2015",
    fonte: "https://www.confindustria.pu.it/wp-content/uploads/2025/05/Art31_DLgs150_2015.pdf",
    confidenza: "certa",
    voci: [
      {
        id: "obbligo-preesistente",
        label: "L'assunzione non attua un obbligo preesistente di legge o di contratto collettivo",
        spiegazione: "Se stai assumendo perché una norma o il CCNL ti obbligano, " +
                     "l'incentivo non spetta. Il caso tipico è la quota di riserva " +
                     "della L. 68/1999 già scoperta.",
        test: (p) => p.assunzioneDaObbligo == null ? null : !p.assunzioneDaObbligo
      },
      {
        id: "diritto-precedenza",
        label: "L'assunzione non viola un diritto di precedenza altrui",
        spiegazione: "Un ex dipendente con diritto di precedenza alla riassunzione " +
                     "brucia l'incentivo su quella posizione, anche se non lo esercita: " +
                     "va invitato per iscritto e la rinuncia va documentata.",
        test: (p) => p.dirittoPrecedenzaAltrui == null ? null : !p.dirittoPrecedenzaAltrui
      },
      {
        id: "licenziamenti-6-mesi",
        label: "Nessun licenziamento per GMO o collettivo nei 6 mesi precedenti, stessa unità e stessa qualifica",
        spiegazione: "È la condizione che salta più spesso, e quasi sempre per " +
                     "distrazione: si guarda l'assunzione e non i sei mesi prima.",
        test: (p) => p.licenziamentiUltimi6Mesi == null ? null : !p.licenziamentiUltimi6Mesi
      },
      {
        id: "sospensioni",
        label: "Nessuna sospensione in corso per crisi o riorganizzazione con lavoratori di pari livello",
        spiegazione: "Assumere agevolato mentre si tengono sospesi lavoratori " +
                     "equivalenti è esattamente ciò che la norma vuole impedire.",
        test: (p) => p.sospensioniInCorso == null ? null : !p.sospensioniInCorso
      },
      {
        id: "assetti-coincidenti",
        label: "Il lavoratore non è stato licenziato negli ultimi 6 mesi da un'azienda collegata o con assetti coincidenti",
        spiegazione: "Regola antielusiva: non si può licenziare da una società " +
                     "del gruppo e riassumere agevolato da un'altra.",
        test: (p) => p.provenienzaDaCollegata == null ? null : !p.provenienzaDaCollegata
      },
      {
        id: "durc",
        label: "DURC regolare e rispetto degli obblighi di sicurezza e dei contratti collettivi",
        spiegazione: "Il DURC irregolare sospende la fruizione: non è una " +
                     "formalità, è un interruttore. Va verificato prima di " +
                     "mettere il risparmio a budget, non dopo.",
        test: (p) => p.durcRegolare == null ? null : !!p.durcRegolare
      }
    ]
  };

  /* --------------------------------------------------------------------------
   * UTILITÀ PER I PREDICATI
   * ------------------------------------------------------------------------*/

  /** Confronto a tre valori: se il dato non c'è, la risposta è "non lo so".
   *  Evita di scrivere venti volte lo stesso controllo di null. */
  const seNoto = (valore, predicato) =>
    valore == null ? null : !!predicato(valore);

  const inArea = (regione, elenco) =>
    regione == null || regione === "" ? null : elenco.indexOf(regione) !== -1;

  /** Criteri di svantaggio del Reg. UE 651/2014 art. 2 punto 4 DIVERSI dalla
   *  disoccupazione.
   *
   *  La separazione non è cosmetica, è necessaria. La definizione di "molto
   *  svantaggiato" è «privo di impiego da 24 mesi, oppure da 12 mesi e
   *  appartenente a una categoria svantaggiata». Se fra le categorie
   *  svantaggiate si conta anche «privo di impiego da almeno 6 mesi», la
   *  condizione diventa circolare: chiunque superi i 12 mesi soddisfa
   *  automaticamente anche la seconda gamba, e la soglia dei 24 mesi non
   *  discrimina più nulla. Il risultato pratico sarebbe raddoppiare la durata
   *  di ogni bonus, cioè sovrastimare il beneficio del 100%.
   *
   *  Le categorie di svantaggio ulteriore vanno quindi valutate a parte. */
  const criteriSvantaggioUlteriore = (p) => {
    if (p.eta != null && p.eta < 25) return true;
    if (p.titoloStudio === "nessuno" || p.titoloStudio === "secondariaInferiore") return true;
    if (p.eta != null && p.eta >= 50) return true;
    if (p.adultoConFamiliareACarico) return true;
    if (p.settoreConDisparitaGenere) return true;
    if (p.minoranza) return true;
    if (p.eta == null || p.titoloStudio == null) return null;
    return false;
  };

  /** Lavoratore "svantaggiato": privo di impiego da almeno 6 mesi, oppure in
   *  una delle categorie ulteriori. */
  const svantaggiatoUE = (p) => {
    if (p.mesiSenzaImpiego != null && p.mesiSenzaImpiego >= 6) return true;
    const c = criteriSvantaggioUlteriore(p);
    if (c === true) return true;
    if (p.mesiSenzaImpiego == null || c === null) return null;
    return false;
  };

  /** "Molto svantaggiato": privo di impiego da almeno 24 mesi, oppure da
   *  almeno 12 mesi e appartenente a una categoria di svantaggio ulteriore.
   *  È la distinzione che raddoppia la durata dei bonus 2026, e per questo
   *  vale la pena che sia esatta. */
  const moltoSvantaggiatoUE = (p) => {
    if (p.mesiSenzaImpiego == null) return null;
    if (p.mesiSenzaImpiego >= 24) return true;
    if (p.mesiSenzaImpiego >= 12) return criteriSvantaggioUlteriore(p);
    return false;
  };

  /* --------------------------------------------------------------------------
   * LE MISURE
   *
   * Ordine di lettura: prima gli esoneri contributivi (cassa immediata, si
   * escludono a vicenda), poi gli incentivi economici, poi le misure fiscali.
   * ------------------------------------------------------------------------*/

  const MISURE = [

    /* ====================================================================
     * 1. BONUS GIOVANI 2026
     * ==================================================================*/
    {
      id: "bonus-giovani-2026",
      nome: "Bonus Giovani 2026",
      famiglia: "esonero-contributivo",
      norma: "art. 2 DL 62/2026",
      prassi: "INPS circolare n. 55 del 14/05/2026",
      fonte: "https://www.mysolution.it/fisco/approfondimenti/prima-lettura/2026/05/bonus-giovani-le-istruzioni-inps-per-lesonero-previsto-dal-decreto-lavoro/",
      confidenza: "media",
      finestra: { da: "2026-01-01", a: "2026-12-31" },
      sintesi: "Esonero totale dei contributi previdenziali a carico azienda, " +
               "premi INAIL esclusi, per assunzioni a tempo indeterminato di " +
               "under 35 non dirigenti privi di impiego regolarmente retribuito.",
      requisiti: [
        {
          id: "eta",
          label: "Meno di 35 anni compiuti alla data di assunzione",
          test: (p) => seNoto(p.eta, (e) => e < 35)
        },
        {
          id: "contratto",
          label: "Contratto a tempo indeterminato, anche part-time",
          test: (p) => p.tipoContratto == null ? null : p.tipoContratto === "indeterminato"
        },
        {
          id: "non-dirigente",
          label: "Personale non dirigenziale",
          test: (p) => p.qualifica == null ? null : p.qualifica !== "dirigente"
        },
        {
          id: "svantaggio",
          label: "Privo di impiego regolarmente retribuito da almeno 12 mesi, o svantaggiato ai sensi UE",
          spiegazione: "Da 24 mesi senza impiego la durata raddoppia da 12 a 24 mesi. " +
                       "È il singolo dato che vale più soldi in tutta la scheda: " +
                       "vale la pena ricostruirlo con precisione dall'estratto contributivo.",
          test: (p) => {
            if (p.mesiSenzaImpiego == null) return null;
            if (p.mesiSenzaImpiego >= 24) return true;
            if (p.mesiSenzaImpiego >= 12) return true;
            const s = svantaggiatoUE(p);
            return s === null ? null : s;
          }
        }
      ],
      beneficio: {
        tipo: "esonero-contributi-datore",
        percentuale: 1.00,
        escludeInail: true,
        massimaleMensile: (p) => {
          const zes = inArea(p.regione, ZES_MAGGIORAZIONE_BONUS);
          return zes === true ? 650 : 500;
        },
        massimaleNota: "500 € al mese, elevati a 650 € se l'unità produttiva è in " +
                       "Abruzzo, Basilicata, Calabria, Campania, Molise, Puglia, " +
                       "Sardegna, Sicilia, Marche o Umbria."
      },
      durataMesi: (p) => {
        const molto = moltoSvantaggiatoUE(p);
        if (molto === true) return 24;
        if (molto === null) return 12;
        return 12;
      },
      durataNota: "24 mesi per i molto svantaggiati (24 mesi senza impiego, o 12 " +
                  "mesi più una condizione di svantaggio), 12 mesi negli altri casi.",
      cumulabilita: {
        tipo: "esclusivo",
        incompatibiliCon: "*esoneri",
        nota: "Come tutti gli esoneri sulla contribuzione datoriale, insiste sulla " +
              "stessa base: non si somma agli altri esoneri, si scelgono."
      },
      adempimenti: [
        "Domanda telematica sul Portale Incentivi INPS, con prenotazione delle risorse",
        "Attendere l'esito della prenotazione prima di esporre l'esonero in UniEmens",
        "Conservare la documentazione sullo stato di disoccupazione del lavoratore"
      ],
      aiutoDiStato: "Reg. UE 651/2014 artt. 32-33 (aiuti all'assunzione di lavoratori svantaggiati)",
      rischi: [
        "Le risorse sono contingentate: la prenotazione è first come first served",
        "Il requisito di svantaggio va documentato, non dichiarato"
      ]
    },

    /* ====================================================================
     * 2. BONUS DONNE 2026
     * ==================================================================*/
    {
      id: "bonus-donne-2026",
      nome: "Bonus Donne 2026",
      famiglia: "esonero-contributivo",
      norma: "DL 62/2026",
      prassi: "INPS circolare n. 57 del 14/05/2026",
      fonte: "https://www.commercialistatelematico.com/articoli/2026/05/bonus-donne-2026-istruzioni-inps.html",
      confidenza: "media",
      finestra: { da: "2026-01-01", a: "2026-12-31" },
      sintesi: "Esonero totale dei contributi previdenziali a carico azienda, " +
               "premi INAIL esclusi, per assunzioni a tempo indeterminato di " +
               "lavoratrici svantaggiate o molto svantaggiate.",
      requisiti: [
        {
          id: "genere",
          label: "Lavoratrice",
          test: (p) => p.sesso == null || p.sesso === "ND" ? null : p.sesso === "F"
        },
        {
          id: "contratto",
          label: "Contratto a tempo indeterminato",
          test: (p) => p.tipoContratto == null ? null : p.tipoContratto === "indeterminato"
        },
        {
          id: "svantaggio",
          label: "Svantaggiata o molto svantaggiata ai sensi del Reg. UE 651/2014",
          test: (p) => {
            const molto = moltoSvantaggiatoUE(p);
            if (molto === true) return true;
            return svantaggiatoUE(p);
          }
        },
        {
          id: "incremento-netto",
          label: "L'assunzione determina incremento occupazionale netto",
          spiegazione: "Si confronta l'organico del mese con la media dei dodici " +
                       "mesi precedenti. Una sostituzione non basta: serve un " +
                       "aumento vero. È il requisito che fa cadere più domande.",
          test: (p) => p.incrementoOccupazionaleNetto == null
            ? null : !!p.incrementoOccupazionaleNetto
        }
      ],
      beneficio: {
        tipo: "esonero-contributi-datore",
        percentuale: 1.00,
        escludeInail: true,
        massimaleMensile: (p) => {
          const zes = inArea(p.regione, ZES_UNICA);
          return zes === true ? 800 : 650;
        },
        massimaleNota: "650 € al mese, elevati a 800 € nella ZES unica. È il " +
                       "massimale più alto fra i bonus assunzione 2026."
      },
      durataMesi: (p) => {
        const molto = moltoSvantaggiatoUE(p);
        if (molto === true) return 24;
        return 12;
      },
      durataNota: "24 mesi per le molto svantaggiate (24 mesi senza impiego, o 12 " +
                  "mesi più una categoria UE), 12 mesi per le svantaggiate.",
      cumulabilita: {
        tipo: "esclusivo",
        incompatibiliCon: "*esoneri",
        nota: "Alternativo agli altri esoneri sulla contribuzione datoriale."
      },
      adempimenti: [
        "Domanda telematica sul Portale Incentivi INPS con prenotazione risorse",
        "Verifica dell'incremento occupazionale netto mese per mese, non una volta sola",
        "Documentazione dello stato di disoccupazione e della categoria di svantaggio"
      ],
      aiutoDiStato: "Reg. UE 651/2014 artt. 32-33",
      rischi: [
        "L'incremento occupazionale netto va mantenuto: se l'organico scende, l'esonero si interrompe",
        "Il massimale a 800 € vale per la ZES unica in senso proprio, non per il perimetro allargato del bonus giovani"
      ]
    },

    /* ====================================================================
     * 3. BONUS ZES 2026
     * ==================================================================*/
    {
      id: "bonus-zes-2026",
      nome: "Bonus ZES 2026",
      famiglia: "esonero-contributivo",
      norma: "DL 62/2026",
      prassi: "INPS circolare n. 56 del 14/05/2026",
      fonte: "https://www.ecnews.it/lavoro/imposte-contributi-e-premi/agevolazioni/bonus-zes-2026-prime-istruzioni-inps/",
      confidenza: "media",
      finestra: { da: "2026-01-01", a: "2026-12-31" },
      sintesi: "Esonero totale della contribuzione previdenziale datoriale per " +
               "piccolissime imprese della ZES unica che assumono over 35 " +
               "disoccupati di lungo periodo. Copre la fascia d'età che il " +
               "bonus giovani lascia fuori.",
      requisiti: [
        {
          id: "eta",
          label: "Lavoratore che ha compiuto 35 anni",
          test: (p) => seNoto(p.eta, (e) => e >= 35)
        },
        {
          id: "disoccupazione",
          label: "Privo di impiego da almeno 24 mesi",
          test: (p) => seNoto(p.mesiSenzaImpiego, (m) => m >= 24)
        },
        {
          id: "dimensione",
          label: "Datore di lavoro privato fino a 10 dipendenti",
          test: (p) => seNoto(p.dipendentiAzienda, (d) => d <= 10)
        },
        {
          id: "sede-zes",
          label: "Unità produttiva situata nella ZES unica Mezzogiorno",
          test: (p) => inArea(p.regione, ZES_UNICA)
        },
        {
          id: "contratto",
          label: "Contratto a tempo indeterminato",
          test: (p) => p.tipoContratto == null ? null : p.tipoContratto === "indeterminato"
        }
      ],
      beneficio: {
        tipo: "esonero-contributi-datore",
        percentuale: 1.00,
        escludeInail: true,
        massimaleMensile: () => 650,
        massimaleNota: "650 € al mese, senza maggiorazioni."
      },
      durataMesi: () => 24,
      durataNota: "24 mesi fissi.",
      cumulabilita: {
        tipo: "esclusivo",
        incompatibiliCon: "*tutti",
        nota: "La circolare INPS lo dichiara espressamente non cumulabile con " +
              "altri esoneri o riduzioni contributive, decontribuzione Sud " +
              "inclusa, né con gli incentivi per disabili e percettori di NASpI. " +
              "È l'unica misura del ruleset che esclude anche gli incentivi " +
              "economici, e per questo il motore la tratta a parte."
      },
      adempimenti: [
        "Domanda sul Portale Incentivi INPS: si può presentare anche prima dell'assunzione, con prenotazione",
        "Verifica della soglia dei 10 dipendenti alla data di assunzione",
        "Nessun licenziamento individuale o collettivo nella stessa unità produttiva nei 6 mesi precedenti"
      ],
      aiutoDiStato: "Reg. UE 651/2014 artt. 32-33",
      rischi: [
        "La soglia dei 10 dipendenti è stretta: una singola assunzione può farla superare e chiudere l'accesso per le successive",
        "Esclusività totale: va confrontato con l'alternativa prima di prenotare"
      ]
    },

    /* ====================================================================
     * 4. ESONERO PERCETTORI DI ADI O SFL
     * ==================================================================*/
    {
      id: "esonero-adi-sfl",
      nome: "Esonero assunzione percettori ADI o SFL",
      famiglia: "esonero-contributivo",
      norma: "art. 10 DL 48/2023",
      prassi: "circolari INPS in materia di Assegno di inclusione",
      fonte: "https://www.fiscoetasse.com/approfondimenti/17188-esoneri-contributivi-2026-i-nuovi-bonus-assunzioni-al-100.html",
      confidenza: "media",
      finestra: null,
      sintesi: "Esonero della contribuzione datoriale per l'assunzione di " +
               "percettori di Assegno di inclusione o di Supporto per la " +
               "formazione e il lavoro. È l'unico esonero del gruppo con " +
               "massimale annuo anziché mensile: 8.000 € l'anno lasciano " +
               "molto più spazio dei 500 € al mese del bonus giovani.",
      requisiti: [
        {
          id: "percettore",
          label: "Lavoratore percettore di Assegno di inclusione o di Supporto per la formazione e il lavoro",
          test: (p) => p.percettoreAdiSfl == null ? null : !!p.percettoreAdiSfl
        },
        {
          id: "contratto",
          label: "Contratto a tempo indeterminato o a termine",
          test: (p) => p.tipoContratto == null ? null
            : (p.tipoContratto === "indeterminato" || p.tipoContratto === "determinato")
        }
      ],
      beneficio: {
        tipo: "esonero-contributi-datore",
        percentuale: (p) => p.tipoContratto === "indeterminato" ? 1.00 : 0.50,
        escludeInail: true,
        massimaleAnnuo: (p) => p.tipoContratto === "indeterminato" ? 8000 : 4000,
        massimaleNota: "Tempo indeterminato: 100% con tetto di 8.000 € l'anno. " +
                       "Tempo determinato o stagionale: 50% con tetto di 4.000 € " +
                       "l'anno. Il tetto è annuo, quindi le mensilità aggiuntive " +
                       "non lo erodono come farebbe un massimale mensile."
      },
      durataMesi: (p) => p.tipoContratto === "indeterminato" ? 24 : 12,
      durataNota: "24 mesi a tempo indeterminato, 12 mesi a termine.",
      cumulabilita: {
        tipo: "esclusivo",
        incompatibiliCon: "*esoneri",
        nota: "Alternativo agli altri esoneri contributivi."
      },
      adempimenti: [
        "Verifica della qualità di percettore alla data di assunzione tramite la piattaforma dedicata",
        "Comunicazione della disponibilità del posto sul SIISL",
        "Nessun licenziamento del lavoratore nei 24 mesi, salvo giusta causa: il licenziamento anticipato comporta la restituzione"
      ],
      aiutoDiStato: "verificare l'inquadramento nel regime applicabile",
      rischi: [
        "Il vincolo di mantenimento in servizio per 24 mesi è un impegno vero, con recupero del beneficio in caso di licenziamento anticipato",
        "Il tetto annuo di 8.000 € è alto: su RAL medio-basse copre spesso l'intera contribuzione datoriale"
      ]
    },

    /* ====================================================================
     * 5. DECONTRIBUZIONE SUD PMI
     * ==================================================================*/
    {
      id: "decontribuzione-sud-pmi",
      nome: "Decontribuzione Sud PMI",
      famiglia: "esonero-contributivo",
      norma: "L. 207/2024 co. 406 e seguenti",
      prassi: "circolari INPS Decontribuzione Sud PMI",
      fonte: "https://www.quotidianopiu.it/dettaglio/14832863/decontribuzione-sud-come-applicarla-nel-2026",
      confidenza: "media",
      finestra: { da: "2025-01-01", a: "2029-12-31" },
      sintesi: "Sconto strutturale sulla contribuzione datoriale per le PMI del " +
               "Mezzogiorno. Non è un incentivo all'assunzione: si applica allo " +
               "stock di rapporti a tempo indeterminato in essere, quindi vale " +
               "anche su chi è già in azienda. È la misura che più spesso resta " +
               "sul tavolo, proprio perché non è legata a un evento.",
      requisiti: [
        {
          id: "sede",
          label: "Sede operativa nelle regioni del Mezzogiorno",
          test: (p) => inArea(p.regione, MEZZOGIORNO_DECONTRIBUZIONE)
        },
        {
          id: "dimensione",
          label: "Micro, piccola o media impresa: fino a 250 dipendenti",
          spiegazione: "Sopra i 250 dipendenti la misura resta accessibile ma " +
                       "richiede un incremento occupazionale dei rapporti a tempo " +
                       "indeterminato rispetto all'anno precedente.",
          test: (p) => seNoto(p.dipendentiAzienda, (d) => d <= 250)
        },
        {
          id: "contratto",
          label: "Rapporto a tempo indeterminato",
          test: (p) => p.tipoContratto == null ? null : p.tipoContratto === "indeterminato"
        },
        {
          id: "settore",
          label: "Settore diverso da agricoltura e lavoro domestico",
          test: (p) => p.settore == null ? null
            : (p.settore !== "agricoltura" && p.settore !== "domestico")
        }
      ],
      beneficio: {
        tipo: "esonero-contributi-datore",
        percentuale: 0.20,
        escludeInail: true,
        massimaleMensile: () => 125,
        mensilitaAgevolate: 12,
        massimaleNota: "Nel 2026 l'esonero è il 20% della contribuzione " +
                       "previdenziale con massimale di 125 € al mese per 12 " +
                       "mensilità. Il décalage previsto porta la misura al 20% " +
                       "anche nel 2027 e la riduce negli anni successivi."
      },
      durataMesi: () => 12,
      durataNota: "Annuale e rinnovabile finché la misura resta in vigore, con " +
                  "percentuale decrescente di anno in anno.",
      decalage: [
        { anno: 2025, percentuale: 0.25, massimaleMensile: 145 },
        { anno: 2026, percentuale: 0.20, massimaleMensile: 125 },
        { anno: 2027, percentuale: 0.20, massimaleMensile: 125 },
        { anno: 2028, percentuale: 0.10, massimaleMensile: null },
        { anno: 2029, percentuale: 0.10, massimaleMensile: null }
      ],
      decalageConfidenza: "daVerificare",
      cumulabilita: {
        tipo: "esclusivo",
        incompatibiliCon: "*esoneri",
        nota: "Non si cumula con gli altri esoneri sulla stessa quota di " +
              "contribuzione. Sul singolo lavoratore si scelgono: quasi sempre " +
              "conviene il bonus assunzione nei suoi 12 o 24 mesi, e la " +
              "decontribuzione Sud dopo, quando il bonus finisce. Questa " +
              "sequenza vale migliaia di euro e il motore la calcola."
      },
      adempimenti: [
        "Esposizione in UniEmens con i codici dedicati",
        "Autorizzazione preventiva e verifica del rispetto del massimale di aiuto",
        "Verifica annuale dei requisiti dimensionali"
      ],
      aiutoDiStato: "regime autorizzato dalla Commissione europea",
      rischi: [
        "Il décalage negli anni finali è il parametro meno consolidato del ruleset: da confermare prima di costruirci un budget pluriennale"
      ]
    },

    /* ====================================================================
     * 6. INCENTIVO ASSUNZIONE PERSONE CON DISABILITÀ
     * ==================================================================*/
    {
      id: "incentivo-disabili-art13",
      nome: "Incentivo assunzione persone con disabilità",
      famiglia: "incentivo-economico",
      norma: "art. 13 L. 68/1999",
      prassi: "istruzioni INPS sull'incentivo art. 13",
      fonte: "https://www.cliclavoro.gov.it/focus-on/incentivi/persone-diversamente-abili",
      confidenza: "alta",
      finestra: null,
      sintesi: "Contributo commisurato alla retribuzione lorda imponibile ai " +
               "fini previdenziali, riconosciuto in conguaglio contributivo. " +
               "È di gran lunga l'agevolazione più ricca del sistema: fino al " +
               "70% della retribuzione per cinque anni.",
      requisiti: [
        {
          id: "disabilita",
          label: "Lavoratore con disabilità nelle percentuali previste dall'art. 13",
          test: (p) => p.disabilita == null ? null : p.disabilita !== "no"
        },
        {
          id: "contratto",
          label: "Assunzione a tempo indeterminato",
          test: (p) => p.tipoContratto == null ? null : p.tipoContratto === "indeterminato"
        },
        {
          id: "incremento-netto",
          label: "L'assunzione determina incremento occupazionale netto",
          test: (p) => p.incrementoOccupazionaleNetto == null
            ? null : !!p.incrementoOccupazionaleNetto
        },
        {
          id: "non-obbligo",
          label: "L'assunzione non copre una quota di riserva già scoperta",
          spiegazione: "Se stai coprendo un obbligo della L. 68/1999 già " +
                       "inadempiuto, l'art. 31 D.Lgs. 150/2015 blocca " +
                       "l'incentivo: è attuazione di un obbligo preesistente.",
          test: (p) => p.assunzioneDaObbligo == null ? null : !p.assunzioneDaObbligo
        }
      ],
      beneficio: {
        tipo: "contributo-su-retribuzione",
        percentuale: (p) => {
          if (p.disabilita === "riduzione>79") return 0.70;
          if (p.disabilita === "intellettivaPsichica>45") return 0.70;
          if (p.disabilita === "riduzione67-79") return 0.35;
          return 0;
        },
        baseDiCalcolo: "retribuzione lorda mensile imponibile ai fini previdenziali",
        massimaleMensile: null,
        massimaleNota: "Nessun massimale mensile: la percentuale si applica " +
                       "all'intera retribuzione imponibile. È la ragione per cui " +
                       "su RAL alte questa misura vale multipli di qualunque " +
                       "esonero a massimale."
      },
      durataMesi: (p) => {
        if (p.disabilita === "intellettivaPsichica>45") return 60;
        if (p.disabilita === "riduzione>79") return 36;
        if (p.disabilita === "riduzione67-79") return 36;
        return 0;
      },
      durataNota: "60 mesi per disabilità intellettiva e psichica oltre il 45%, " +
                  "36 mesi negli altri casi.",
      cumulabilita: {
        tipo: "cumulabile",
        incompatibiliCon: ["bonus-zes-2026"],
        nota: "È un contributo sulla retribuzione, non uno sconto sulla " +
              "contribuzione: non insiste sulla stessa base degli esoneri e in " +
              "linea di principio può coesistere. Va però verificato caso per " +
              "caso, e il bonus ZES 2026 lo esclude espressamente."
      },
      adempimenti: [
        "Domanda telematica all'INPS con prenotazione delle risorse sul fondo dedicato",
        "Verbale di accertamento della disabilità e relativa percentuale",
        "Comunicazione al servizio provinciale per il collocamento mirato"
      ],
      aiutoDiStato: "Reg. UE 651/2014 art. 33 (lavoratori con disabilità)",
      rischi: [
        "Le risorse sono contingentate e la prenotazione conta",
        "Il confine fra assunzione volontaria e copertura di un obbligo scoperto è il punto su cui l'incentivo si perde più spesso"
      ]
    },

    /* ====================================================================
     * 7. INCENTIVO ASSUNZIONE PERCETTORI DI NASpI
     * ==================================================================*/
    {
      id: "incentivo-naspi",
      nome: "Incentivo assunzione percettori di NASpI",
      famiglia: "incentivo-economico",
      norma: "art. 2 co. 10-bis L. 92/2012",
      prassi: "istruzioni INPS per la richiesta tramite Cassetto previdenziale",
      fonte: "https://www.cliclavoro.gov.it/focus-on/tutele-e-sostegno-al-reddito/naspi/incentivi-assunzione-e-autoimprenditoria",
      confidenza: "alta",
      finestra: null,
      sintesi: "Contributo mensile pari al 20% dell'indennità NASpI residua che " +
               "sarebbe spettata al lavoratore. Il beneficio non dipende dalla " +
               "RAL ma dall'indennità che il lavoratore stava percependo: è " +
               "l'unica misura del ruleset con questa logica, e per questo va " +
               "sempre calcolata a parte.",
      requisiti: [
        {
          id: "percettore",
          label: "Lavoratore percettore di NASpI alla data di assunzione",
          test: (p) => p.percettoreNaspi == null ? null : !!p.percettoreNaspi
        },
        {
          id: "contratto",
          label: "Assunzione a tempo pieno e indeterminato, o trasformazione a tempo pieno e indeterminato",
          test: (p) => {
            if (p.tipoContratto == null) return null;
            if (p.tipoContratto !== "indeterminato") return false;
            if (p.partTime == null) return null;
            return !p.partTime;
          }
        },
        {
          id: "residuo",
          label: "Indennità NASpI ancora da percepire",
          test: (p) => seNoto(p.naspiMesiResidui, (m) => m > 0)
        }
      ],
      beneficio: {
        tipo: "contributo-su-indennita",
        percentuale: 0.20,
        baseDiCalcolo: "indennità NASpI mensile residua del lavoratore",
        massimaleMensile: null,
        massimaleNota: "20% dell'indennità mensile residua, per la durata residua " +
                       "della NASpI e comunque non oltre 24 mesi."
      },
      durataMesi: (p) => Math.min(p.naspiMesiResidui == null ? 0 : p.naspiMesiResidui, 24),
      durataNota: "Pari alla durata residua della NASpI, massimo 24 mesi.",
      cumulabilita: {
        tipo: "cumulabile",
        incompatibiliCon: ["bonus-zes-2026"],
        nota: "Non incide sulla contribuzione dovuta: arriva come contributo in " +
              "conguaglio. Il bonus ZES 2026 lo esclude espressamente."
      },
      adempimenti: [
        "Istanza tramite Cassetto previdenziale aziende, voce «L. 92/2012 art. 2 c. 10-bis»",
        "Recupero in conguaglio nei flussi UniEmens successivi all'accoglimento"
      ],
      aiutoDiStato: "non configura aiuto di Stato secondo l'inquadramento prevalente",
      rischi: [
        "Il valore dipende da un dato che l'azienda non possiede: quanta NASpI resta al candidato. Va chiesto in fase di colloquio, non dopo l'assunzione."
      ]
    },

    /* ====================================================================
     * 8. RIDUZIONE CONTRIBUTIVA OVER 50 E DONNE
     * ==================================================================*/
    {
      id: "riduzione-over50-donne",
      nome: "Riduzione contributiva over 50 e donne",
      famiglia: "esonero-contributivo",
      norma: "art. 4 co. 8-11 L. 92/2012",
      prassi: "istruzioni INPS sulla riduzione ex L. 92/2012",
      fonte: "https://www.cliclavoro.gov.it/focus-on/incentivi/over-50-e-lavoratori-svantaggiati",
      confidenza: "alta",
      finestra: null,
      sintesi: "Riduzione del 50% della contribuzione a carico del datore, premi " +
               "INAIL inclusi. Misura strutturale e senza massimale: sulle RAL " +
               "alte batte i bonus 2026, che si fermano a 500 o 650 € al mese.",
      requisiti: [
        {
          id: "profilo",
          label: "Over 50 disoccupato da oltre 12 mesi, oppure donna priva di impiego da almeno 24 mesi (6 mesi in aree svantaggiate)",
          test: (p) => {
            const over50 = p.eta != null && p.eta >= 50;
            const mesi = p.mesiSenzaImpiego;
            if (over50) {
              if (mesi == null) return null;
              return mesi > 12;
            }
            if (p.sesso === "F") {
              if (mesi == null) return null;
              const inAreaSvantaggiata = inArea(p.regione, ZES_UNICA);
              if (inAreaSvantaggiata === true) return mesi >= 6;
              return mesi >= 24;
            }
            if (p.eta == null || p.sesso == null) return null;
            return false;
          }
        },
        {
          id: "contratto",
          label: "Assunzione a termine, a tempo indeterminato o trasformazione",
          test: (p) => p.tipoContratto == null ? null : p.tipoContratto !== "apprendistato"
        }
      ],
      beneficio: {
        tipo: "esonero-contributi-datore",
        percentuale: 0.50,
        escludeInail: false,
        massimaleMensile: null,
        massimaleNota: "Nessun massimale. La riduzione è del 50% e comprende i " +
                       "premi INAIL, che gli esoneri 2026 invece escludono."
      },
      durataMesi: (p) => p.tipoContratto === "determinato" ? 12 : 18,
      durataNota: "12 mesi per le assunzioni a termine, 18 mesi a tempo " +
                  "indeterminato o in caso di trasformazione.",
      cumulabilita: {
        tipo: "esclusivo",
        incompatibiliCon: "*esoneri",
        nota: "Alternativo agli altri esoneri contributivi."
      },
      adempimenti: [
        "Esposizione in UniEmens con i codici dedicati",
        "Documentazione dello stato di disoccupazione per la durata richiesta"
      ],
      aiutoDiStato: "Reg. UE 651/2014 artt. 32-33",
      rischi: [
        "Spesso ignorata perché meno pubblicizzata dei bonus dell'anno, ma su retribuzioni sopra i 35.000 € è frequentemente la scelta migliore"
      ]
    },

    /* ====================================================================
     * 9. ESONERO ASSUNZIONE DONNE VITTIME DI VIOLENZA
     * ==================================================================*/
    {
      id: "esonero-vittime-violenza",
      nome: "Esonero assunzione donne vittime di violenza",
      famiglia: "esonero-contributivo",
      norma: "art. 1 co. 191 L. 213/2023",
      prassi: "circolari INPS in materia",
      fonte: "https://www.jethr.com/risorse/agevolazioni-assunzioni-2026/",
      confidenza: "media",
      finestra: null,
      sintesi: "Esonero totale della contribuzione datoriale per l'assunzione di " +
               "donne inserite nei percorsi di protezione certificati.",
      requisiti: [
        {
          id: "vittima-violenza",
          label: "Lavoratrice inserita in percorso di protezione certificato",
          test: (p) => p.vittimaViolenza == null ? null : !!p.vittimaViolenza
        },
        {
          id: "genere",
          label: "Lavoratrice",
          test: (p) => p.sesso == null || p.sesso === "ND" ? null : p.sesso === "F"
        }
      ],
      beneficio: {
        tipo: "esonero-contributi-datore",
        percentuale: 1.00,
        escludeInail: true,
        massimaleAnnuo: () => 8000,
        massimaleNota: "100% della contribuzione datoriale con tetto di 8.000 € " +
                       "l'anno. Tetto annuo, non mensile."
      },
      durataMesi: (p) => p.tipoContratto === "determinato" ? 12 : 24,
      durataNota: "24 mesi a tempo indeterminato, 12 mesi a termine.",
      cumulabilita: {
        tipo: "esclusivo",
        incompatibiliCon: "*esoneri",
        nota: "Alternativo agli altri esoneri contributivi."
      },
      adempimenti: [
        "Certificazione dell'inserimento nel percorso di protezione",
        "Esposizione in UniEmens con i codici dedicati",
        "Trattamento del dato con la riservatezza che la fattispecie impone"
      ],
      aiutoDiStato: "verificare l'inquadramento nel regime applicabile",
      rischi: [
        "Il dato è particolarmente sensibile: va raccolto solo se la lavoratrice lo comunica spontaneamente, mai richiesto in selezione"
      ]
    },

    /* ====================================================================
     * 10. MAXI-DEDUZIONE NUOVE ASSUNZIONI
     *
     * Famiglia diversa: è un beneficio fiscale, non contributivo. Non entra
     * in cedolino, arriva in dichiarazione, e vale solo se c'è imponibile
     * capiente. Il motore la tiene separata e non la somma alla cassa.
     * ==================================================================*/
    {
      id: "maxi-deduzione",
      nome: "Maxi-deduzione nuove assunzioni",
      famiglia: "deduzione-fiscale",
      norma: "art. 4 D.Lgs. 216/2023",
      prassi: "estensione al triennio 2025-2027 ad opera della L. 207/2024",
      fonte: "https://www.consulentidellavoro.it/home/storico-articoli/18338-maxi-deduzioni-per-nuove-assunzioni-ecco-come-funziona",
      confidenza: "media",
      finestra: { da: "2024-01-01", a: "2027-12-31" },
      sintesi: "Maggiorazione del 20% della deduzione del costo del lavoro " +
               "incrementale, elevata al 30% per le categorie meritevoli di " +
               "maggiore tutela. Beneficio fiscale, non contributivo: si " +
               "monetizza in dichiarazione e solo con reddito imponibile capiente.",
      requisiti: [
        {
          id: "contratto",
          label: "Nuova assunzione a tempo indeterminato",
          test: (p) => p.tipoContratto == null ? null : p.tipoContratto === "indeterminato"
        },
        {
          id: "incremento-netto",
          label: "Incremento occupazionale netto dei rapporti a tempo indeterminato e dell'organico complessivo",
          test: (p) => p.incrementoOccupazionaleNetto == null
            ? null : !!p.incrementoOccupazionaleNetto
        },
        {
          id: "imponibile-capiente",
          label: "L'impresa ha reddito imponibile sufficiente ad assorbire la deduzione",
          spiegazione: "È il requisito che nessuna guida menziona e che azzera " +
                       "il beneficio per le aziende in perdita fiscale, cioè per " +
                       "buona parte delle startup. Vale la pena chiederlo prima " +
                       "di metterlo in una proposta commerciale.",
          test: (p) => p.imponibileCapiente == null ? null : !!p.imponibileCapiente
        }
      ],
      beneficio: {
        tipo: "deduzione-maggiorata",
        maggiorazione: (p) => p.categoriaTutelata ? 0.30 : 0.20,
        aliquotaImposta: 0.24,
        massimaleMensile: null,
        massimaleNota: "Il risparmio effettivo è: costo del lavoro × maggiorazione " +
                       "× aliquota IRES. Con IRES al 24% e maggiorazione al 20%, " +
                       "sono circa 4,8 centesimi per ogni euro di costo del lavoro."
      },
      durataMesi: () => 12,
      durataNota: "Si applica al periodo d'imposta dell'assunzione, per gli anni " +
                  "in cui la misura resta in vigore.",
      cumulabilita: {
        tipo: "cumulabile",
        incompatibiliCon: [],
        nota: "Misura fiscale: non insiste sulla contribuzione e si somma agli " +
              "esoneri. Attenzione però alla base di calcolo, perché il costo " +
              "del lavoro deducibile va assunto al netto di quanto già " +
              "agevolato: è un punto tecnico su cui conviene un parere."
      },
      adempimenti: [
        "Determinazione del costo del lavoro incrementale in sede di dichiarazione",
        "Verifica del doppio incremento occupazionale, sui rapporti a tempo indeterminato e sull'organico complessivo",
        "Documentazione dell'appartenenza alle categorie tutelate per la maggiorazione al 30%"
      ],
      aiutoDiStato: "misura generale, non selettiva",
      rischi: [
        "Vale zero per chi è in perdita fiscale",
        "Arriva con un anno di ritardo rispetto alla cassa: non finanzia l'assunzione, la premia dopo"
      ]
    }
  ];

  /* --------------------------------------------------------------------------
   * REGOLE DI CUMULO
   *
   * Modellate come regola generale più eccezioni dichiarate, anziché come
   * matrice completa. Con dieci misure la matrice avrebbe cento celle di cui
   * novanta ovvie e dieci discutibili: la regola generale rende esplicito il
   * principio e lascia visibili solo le eccezioni, che sono la parte
   * interessante.
   * ------------------------------------------------------------------------*/
  const REGOLE_CUMULO = {
    principio: "Gli esoneri sulla contribuzione a carico del datore insistono " +
               "sulla stessa base imponibile: sul medesimo lavoratore e nel " +
               "medesimo periodo se ne applica uno solo, il più conveniente. " +
               "Gli incentivi economici e le misure fiscali hanno base diversa " +
               "e in linea di principio possono coesistere con un esonero.",
    eccezioni: [
      {
        id: "bonus-zes-esclusivo",
        descrizione: "Il Bonus ZES 2026 esclude qualunque altra agevolazione " +
                     "contributiva, incluse la decontribuzione Sud e gli " +
                     "incentivi per disabili e percettori di NASpI."
      },
      {
        id: "sequenza-temporale",
        descrizione: "Due esoneri incompatibili in contemporanea possono essere " +
                     "compatibili in sequenza: finito il bonus assunzione, la " +
                     "decontribuzione Sud può prendere il posto per gli anni " +
                     "successivi. Il motore ottimizza anche questa dimensione."
      }
    ],
    confidenza: "media",
    avvertenza: "Le regole di cumulo sono la parte del sistema con più " +
                "incertezza interpretativa e la più soggetta a messaggi INPS " +
                "successivi. Il motore adotta l'ipotesi prudente — un solo " +
                "esonero per volta — e dichiara sempre quale ha scelto e perché."
  };

  return {
    ANNO: 2026,
    ZES_UNICA,
    ZES_MAGGIORAZIONE_BONUS,
    MEZZOGIORNO_DECONTRIBUZIONE,
    CONDIZIONI_GENERALI,
    MISURE,
    REGOLE_CUMULO,
    utilita: { svantaggiatoUE, moltoSvantaggiatoUE, criteriSvantaggioUlteriore, inArea }
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.AGEVOLAZIONI_2026;
}
