# Cost Saving sul costo del lavoro — prototipo 2026

Due strumenti che guardano lo stesso rapporto di lavoro dai due lati opposti.

| | |
|---|---|
| **[Console Cost-Saving](https://tommyieri.github.io/Testjethr/cost-saving.html)** | Il lato azienda: quanto costa quella persona, quali agevolazioni spettano, in quale sequenza conviene usarle nei prossimi cinque anni e quale dato manca per portarle a casa. |
| **[Dalla RAL al netto](https://tommyieri.github.io/Testjethr/)** | Il lato dipendente: quanto arriva davvero in busta, voce per voce, con formula e fonte normativa di ogni passaggio. |

Prototipo realizzato per il task di selezione del team **Cost-Saving di Jet HR**.
Non è un prodotto ufficiale Jet HR e non sostituisce il parere di un consulente
del lavoro.

**Il ragionamento di prodotto sta in [`docs/PRODOTTO.md`](docs/PRODOTTO.md)**:
dove si perdono i soldi nel processo reale, quale collo di bottiglia ho scelto
di attaccare e perché, cosa non ho costruito, e come lo porterei a valore.
È la parte che conta più del codice.

---

## Cosa fa la Console Cost-Saving

Le guide alle agevolazioni rispondono a «quali bonus esistono». Chi assume ha
tre domande diverse, e sono queste tre a cui la console risponde.

**Quale misura spetta a questa persona.** Dieci misure valutate una per una,
con l'esito e soprattutto il *perché*: quale requisito manca, quale dato non
c'è, quale norma lo dice. Un «non spetta» senza motivo non è utilizzabile.

**In quale ordine usarle.** Gli esoneri sulla contribuzione datoriale sono
alternativi fra loro *nello stesso mese*, non *nel tempo*. Il motore sceglie
mese per mese su un orizzonte di cinque anni, e da lì emergono le staffette:
Bonus Giovani per 24 mesi, poi Decontribuzione Sud per i 36 successivi.

**Quale dato manca.** Ogni requisito ha tre esiti, non due: sì, no, e *non lo
so*. I «non lo so» diventano una lista di domande ordinate per euro in gioco.
È l'output con cui si prende il telefono.

In più due cose che gli strumenti di settore non fanno:

- **L'efficienza dell'euro.** A costo azienda dato, quale canale fa arrivare
  più netto alla persona. È una leva che si applica a tutto l'organico e non
  solo a chi entra.
- **Lo scan dell'organico.** Le misure strutturali si applicano a chi è già in
  azienda, ma non hanno nessun evento che le ricordi. Si incolla l'organico e
  si vede cosa resta sul tavolo oggi, senza assumere nessuno.

---

## Tre risultati che il modello mese per mese fa emergere

Sono i numeri che giustificano le scelte tecniche, tutti verificati dai test.

### La sequenza vale il 29% più della singola misura migliore

Assunzione di un under 35 disoccupato da oltre due anni, RAL 30.000 €,
azienda del terziario in Campania:

| Periodo | Misura | Risparmio |
|---|---|---|
| mesi 1–24 | Bonus Giovani 2026 | 15.600 € |
| mesi 25–60 | Decontribuzione Sud PMI | 4.500 € |
| | **totale su 5 anni** | **20.100 €** |

Chi guarda solo il primo anno, o solo la misura più ricca, ne vede 15.600.

### A parità di RAL, 12 mensilità valgono più di 13

Stessa persona, stessa retribuzione annua, stesso tutto. Bonus Donne 2026 in
ZES, massimale 650 € al mese elevato a 800 €:

| Mensilità | Contribuzione mensile | Esonero su 24 mesi |
|---|---|---|
| 12 | 759,50 € — sempre sotto il tetto | **18.228 €** |
| 13 | 701,08 €, ma 1.402,15 € a dicembre | **17.024 €** |

La tredicesima sfonda il massimale mensile e la parte eccedente si perde.
**1.204 € di differenza** prodotti solo da come la retribuzione è ripartita.
Un modello annuale non può vedere questo effetto, e infatti sovrastima.

### Lo stesso euro netto costa all'azienda due volte e mezzo

Con 3.000 € di budget su una RAL di 30.000 €:

| Come li dai | Costo azienda | Netto alla persona | Efficienza |
|---|---|---|---|
| Aumento in busta | 3.000 € | 1.172 € | 39% |
| Fringe benefit 1.000 € + welfare 2.000 € | 3.000 € | 3.000 € | 100% |

**2,56 volte**, a parità di costo. La legge di bilancio 2026 ha portato
l'imposta sostitutiva sui premi di risultato all'1% su un tetto di 5.000 €,
il che rende il momento particolarmente favorevole.

---

## Com'è fatto

Sei file, nessuna dipendenza, nessun passo di build. Si aprono con un doppio
clic.

```
parametri-2026.js          parametri fiscali lato dipendente
calcolo.js                 motore dalla RAL al netto
parametri-datore-2026.js   parametri di costo lato azienda
agevolazioni-2026.js       il ruleset normativo, come dati
costo-azienda.js           motore del costo e dei canali di retribuzione
motore-agevolazioni.js     eleggibilità, cumulo e sequenza ottima
index.html                 pagina «dalla RAL al netto»
cost-saving.html           Console Cost-Saving
interfaccia.js             presentazione della console
test/verifica.js           137 controlli, Node puro
```

I parametri stanno separati dalla logica, e la logica del costo sta separata
da quella delle agevolazioni. Cambiare anno significa toccare i file di
parametri; cambiare una norma significa toccare il ruleset; in nessuno dei due
casi si rilegge una riga di motore.

### Le tre decisioni che rifarei in produzione

**La normativa è un dato, non del codice.** Le dieci misure sono oggetti con
predicati eseguibili, formule, durate, tetti, regole di cumulo, adempimenti e
fonti. Nessuna condizione normativa è scritta dentro il motore. Il guadagno
non è l'eleganza: è che il ruleset può essere riletto da un consulente del
lavoro, che non sa leggere un `if` ma sa benissimo dire se un requisito è
scritto giusto.

**I predicati hanno tre valori.** `true`, `false`, `null`. Null significa «con
i dati che ho non lo so», e genera una domanda invece di un rifiuto. Nel
processo reale è la differenza fra un candidato scartato e uno assunto con un
incentivo.

**Le condizioni generali si valutano prima di tutto.** L'art. 31
D.Lgs. 150/2015 è un cancello, non una nota a piè di pagina: se una condizione
cade, decadono tutti gli incentivi, anche quelli già fruiti, con recupero. Un
motore che mostra 12.000 € di risparmio e in fondo scrive «verifica i
requisiti» ha già fatto il danno, perché quel numero è finito in una proposta.

### La confidenza è un campo di prima classe

Lato dipendente i parametri stanno nel TUIR: un numero, una norma, fine. Lato
datore no. L'aliquota contributiva complessiva dipende da CCNL, settore,
dimensione e persino dalla singola posizione INPS; il tasso INAIL dipende
dalla lavorazione. **Non esiste «l'aliquota datore 2026»: esiste l'aliquota di
quella azienda.**

Quindi ogni parametro dichiara in pagina se è *certo*, *tipico* o *da
verificare*. Chi legge un risultato sa quanto fidarsi di ogni pezzo, e sa
esattamente quale dato chiedere per passare da stima a certezza.

---

## Verifica

```bash
node test/verifica.js     # 137 controlli, nessuna dipendenza
```

I test non guardano se il codice gira: in un motore fiscale i bug non si
presentano come eccezioni, si presentano come numeri plausibili. Guardano
quindi se i comportamenti che distinguono questo motore da un foglio Excel
sono ancora al loro posto — che il massimale mensile si applichi mese per
mese, che il massimale contributivo annuo tagli la sola quota IVS, che due
esoneri non si sommino mai.

In più 52 controlli in Chromium headless su due temi e cinque larghezze:
assenza di errori JavaScript, contrasto WCAG AA, target touch da 44 px,
assenza di scroll orizzontale da 320 px, e il fatto che la pagina preesistente
continui a funzionare.

Un bug vero trovato dai test: la definizione di «lavoratore molto
svantaggiato» era circolare. Contando la disoccupazione fra le categorie di
svantaggio, chiunque superasse i 12 mesi soddisfaceva automaticamente anche la
seconda gamba della condizione, e la soglia dei 24 mesi non discriminava più
nulla — raddoppiando la durata di ogni bonus. Sovrastima del 100%, con un
risultato perfettamente plausibile.

---

## Cosa non copre

Un limite dichiarato vale più di una copertura apparente.

| | |
|---|---|
| **Contrattazione collettiva** | Nessun CCNL. La retribuzione è un numero che si inserisce |
| **Misure regionali e camerali** | Solo il perimetro nazionale: le regionali sono decine, con bandi e sportelli propri |
| **Capienza dei plafond** | Il motore dice se il requisito c'è, non se ci saranno ancora fondi al momento della domanda |
| **Cadenza reale del recupero** | Il beneficio è collocato nel mese di competenza, non in quello di incasso |
| **Apprendistato di primo e terzo livello** | Modellato solo il professionalizzante, di gran lunga il più frequente |
| **Aliquote regionali IRPEF** | Solo la Lombardia è precaricata, per le ragioni spiegate nella pagina gemella |
| **Interpretazioni sul cumulo** | Il motore adotta l'ipotesi prudente — un solo esonero per volta — e dichiara sempre quale ha scelto |

### Una nota onesta sulle fonti

L'ambiente in cui questo prototipo è stato sviluppato **non raggiunge
inps.it, lavoro.gov.it né jethr.com**, bloccati dalla policy di rete. Ho
lavorato su fonti secondarie incrociate fra loro, e per questo ogni misura
porta in pagina la norma, la circolare di riferimento e un livello di
confidenza esplicito.

**Prima di usare questi numeri su un caso reale vanno riverificati sulle
circolari originali.** Il valore di questo lavoro sta nel metodo e nella
struttura, non nella certificazione dei parametri.

Due riscontri incoraggianti però ci sono, ottenuti confrontando i risultati
con i dati che Jet HR pubblica sul proprio sito:

| | motore | Jet HR |
|---|---|---|
| Costo azienda su RAL 30.000 € | 41.486 € | ~41.100 € |
| Incentivo disabilità grave, primo anno su RAL 30.000 € | 21.000 € (50,6%) | 21.000 € (51%) |
| Risparmio dell'apprendistato professionalizzante | 5.631 € (13,6%) | ~5.500 € (~14%) |

Sono tre numeri prodotti da un motore diverso, scritto da altri, su fonti che
non ho potuto raggiungere. Li ho messi nella suite di test: un ruleset
internamente perfetto ma tarato male passerebbe tutti gli altri controlli e
non questi tre.

---

## Fonti principali

Ogni misura cita la propria fonte anche nell'interfaccia, sotto la voce
corrispondente, insieme al livello di confidenza.

**Normativa** — art. 2 e segg. DL 62/2026 · DL 60/2024 (decreto Coesione) ·
DL 200/2025 (Milleproroghe) · L. 207/2024 · legge di bilancio 2026 ·
art. 31 D.Lgs. 150/2015 · art. 13 L. 68/1999 · art. 2 co. 10-bis e art. 4
co. 8-11 L. 92/2012 · art. 10 DL 48/2023 · art. 4 D.Lgs. 216/2023 ·
art. 1 co. 191 L. 213/2023 · artt. 12, 13 e 51 TUIR · art. 47 co. 7 e
art. 44 D.Lgs. 81/2015 · art. 2120 c.c.

**Prassi** — INPS circolari 55, 56 e 57 del 14 maggio 2026 (Bonus Giovani,
ZES e Donne 2026) · circolari INPS su Decontribuzione Sud PMI, minimali e
massimali 2026, aliquote contributive 2026.

**Documentazione consultata** —
[Cliclavoro sugli incentivi](https://www.cliclavoro.gov.it/focus-on/incentivi/persone-diversamente-abili) ·
[Consulenti del Lavoro sulla maxi-deduzione](https://www.consulentidellavoro.it/home/storico-articoli/18338-maxi-deduzioni-per-nuove-assunzioni-ecco-come-funziona) ·
[EC News sul Bonus ZES 2026](https://www.ecnews.it/lavoro/imposte-contributi-e-premi/agevolazioni/bonus-zes-2026-prime-istruzioni-inps/) ·
[MySolution sul Bonus Giovani 2026](https://www.mysolution.it/fisco/approfondimenti/prima-lettura/2026/05/bonus-giovani-le-istruzioni-inps-per-lesonero-previsto-dal-decreto-lavoro/) ·
[Commercialista Telematico sul Bonus Donne 2026](https://www.commercialistatelematico.com/articoli/2026/05/bonus-donne-2026-istruzioni-inps.html) ·
[Quotidiano Più sulla Decontribuzione Sud](https://www.quotidianopiu.it/dettaglio/14832863/decontribuzione-sud-come-applicarla-nel-2026) ·
[Jet HR — agevolazioni assunzioni 2026](https://www.jethr.com/risorse/agevolazioni-assunzioni-2026/) ·
[Jet HR — calcolo costo azienda](https://www.jethr.com/strumenti/calcolo-costo-azienda)

---

## Nota sulla veste grafica

Colori e marchio in pagina sono un'interpretazione ispirata al posizionamento
di Jet HR, **non un prelievo dal loro design system**: jethr.com non è
raggiungibile dall'ambiente di sviluppo. Le due pagine condividono gli stessi
token, così da essere un prodotto solo e non due prototipi scollegati.
