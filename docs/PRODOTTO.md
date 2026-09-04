# Dove si perdono i soldi, e perché ho costruito questo

> **Questo è materiale fuori dal perimetro della task.**
> La consegna chiede un calcolatore dalla RAL al netto, per un dipendente
> senza agevolazioni: quello è
> [`index.html`](https://tommyieri.github.io/Testjethr/), documentato nel
> [README](../README.md), e non dipende da nulla di ciò che è descritto qui.
>
> Quello che segue è una seconda pagina che ho costruito dopo, per capire
> come apparisse lo stesso rapporto di lavoro dall'altro lato. La includo
> perché il ragionamento mi sembra la parte interessante, non perché sia
> parte della consegna.

Demo: [Console Cost-Saving](https://tommyieri.github.io/Testjethr/cost-saving.html).

---

## 1. La domanda che ho cambiato

Il calcolatore della task risponde alla domanda del **dipendente**: quanto mi
arriva in tasca. È la domanda giusta per chi firma un contratto.

L'altra metà è: quanto costa quella persona all'azienda, e quanto di quel
costo si può legittimamente abbattere. Sono due mestieri diversi. Il primo è
un calcolo, il secondo è una decisione.

Quindi la domanda giusta non è «quanto costa un dipendente», a cui rispondono
già venti calcolatori online. È:

> **Data questa persona, in questa azienda, in questo mese: quale
> combinazione di misure conviene attivare, in quale ordine nel tempo, e quale
> dato mi manca per portarla a casa?**

Le tre parti sono tutte necessarie. Una risposta che dice «spetta il Bonus
Giovani» senza dire *per quanti mesi*, *cosa viene dopo* e *quale documento
serve* non è azionabile: è un articolo di blog con un numero dentro.

---

## 2. Come funziona oggi, e dove si rompe

Ho ricostruito il processo di un'azienda che assume — così come emerge dalla
normativa, dalla prassi INPS e da come sono scritte le guide di settore.

```
posizione aperta → si sceglie contratto e RAL → si assume
   → qualcuno controlla se c'è un incentivo → domanda INPS
   → esposizione in UniEmens → verifica mensile delle condizioni
```

Cinque punti di rottura, in ordine di quanto costano.

### 2.1 La decisione è già presa quando arriva il calcolo

È il collo di bottiglia numero uno e nessuno lo tratta come tale.

Nel processo sopra, l'incentivo si guarda **dopo** aver scelto contratto, RAL
e data. Ma è esattamente lì che si decide quasi tutto il risparmio: il tipo di
contratto, la regione dell'unità produttiva, il mese di decorrenza, perfino la
ripartizione in 12 o 13 mensilità. Quando la pratica arriva alle paghe, le
leve sono già bloccate.

Nella scheda «Confronto scenari» questo è misurato: lo stesso ruolo, coperto
in modi diversi, ha divari a cinque cifre nel solo primo anno. Non nascono da
una trattativa sullo stipendio, nascono da come il rapporto viene impostato il
giorno in cui si firma.

**Implicazione di prodotto:** lo strumento non va messo in payroll, va messo
in *recruiting*, prima che la job description sia pubblicata. È uno
spostamento di collocazione, non una feature.

### 2.2 Il dato che vale di più non ce l'ha l'azienda

Guardando i requisiti delle dieci misure che ho modellato, quello che
discrimina più spesso — e che vale di più — è uno solo: **da quanti mesi la
persona è priva di impiego regolarmente retribuito**.

Con 26 mesi il Bonus Giovani dura 24 mesi; con 14 ne dura 12. Stessa persona,
stesso stipendio, metà del beneficio. Lo stesso vale per la NASpI residua, che
determina interamente il valore dell'incentivo ex art. 2 co. 10-bis L. 92/2012.

Nessuno di questi dati è in azienda. Sono nel candidato, e nessun ATS li
chiede.

**Implicazione di prodotto:** il pezzo di software con il ROI più alto qui non
è un motore di calcolo, sono **tre campi in fase di candidatura**. Il motore
serve a sapere quali tre campi, e a dimostrare quanto valgono. Per questo
l'output principale della console non è il numero: è la lista delle domande
aperte, ordinata per euro in gioco.

### 2.3 Le misure sullo stock non hanno un evento che le ricordi

Gli incentivi all'assunzione hanno un innesco naturale: si assume, qualcuno
controlla. Le misure strutturali no. La Decontribuzione Sud si applica ai
rapporti già in essere: non c'è nessun momento in cui qualcuno si ferma a
chiedersi se spetta.

Il risultato è prevedibile: chi non l'ha mai chiesta non se ne accorge mai.

**Implicazione di prodotto:** serve un motore che giri sul **portafoglio**, in
batch, e non sulla singola pratica su richiesta. È la scheda «Scan
dell'organico»: si incolla l'organico e si vede cosa resta sul tavolo oggi,
senza assumere nessuno.

### 2.4 Le condizioni si perdono dopo, non prima

L'art. 31 D.Lgs. 150/2015 non è un requisito di accesso, è una condizione da
mantenere. Incremento occupazionale netto, DURC regolare, assenza di
licenziamenti: se cadono a metà percorso, l'incentivo decade **con recupero
di quanto già fruito**.

Questo trasforma il problema da calcolo a monitoraggio, ed è la ragione per
cui nel motore le condizioni generali si valutano *prima* di ogni conto e
possono bloccare il risultato invece di apparire come nota a piè di pagina.

### 2.5 Il perimetro cambia ogni tre mesi

Il 2026 è un caso di scuola. Le misure del DL Coesione sono state prorogate
dal Milleproroghe fino al 30 aprile con percentuali ridotte; dal 1° gennaio
è entrato in vigore un impianto nuovo con il DL 62/2026; le istruzioni
operative INPS sono arrivate a maggio con tre circolari distinte. Tre
stratificazioni sovrapposte in cinque mesi.

Nessuna azienda può seguire questo ritmo, e nemmeno un consulente può farlo
per tutti i clienti contemporaneamente.

**Implicazione di prodotto:** l'asset difendibile non è l'interfaccia, è il
**ruleset versionato**. L'interfaccia si riscrive in una settimana; un catasto
normativo tenuto aggiornato, con fonti e livelli di confidenza, è il pezzo che
non si copia.

---

## 3. La leva che nessuno conta come cost saving

C'è una sesta cosa, e per me è la più interessante perché sposta il perimetro
del problema invece di ottimizzarlo.

Tutto il discorso sulle agevolazioni riguarda **come ridurre il costo di una
retribuzione data**. Nessuno si fa la domanda opposta: **a costo dato, come si
massimizza il valore che arriva alla persona?**

I numeri, calcolati dal motore su una RAL di 30.000 € nel terziario:

| Canale | Efficienza | Per consegnare 1.000 € netti l'azienda spende |
|---|---|---|
| Aumento della retribuzione lorda | 38-40% | **2.624 €** |
| Premio di risultato detassato all'1% | 65% | 1.538 € |
| Fringe benefit sotto soglia | 100% | 1.000 € |
| Premio convertito in welfare | 100% | 1.000 € |

Lo stesso euro netto costa all'azienda **due volte e mezzo** a seconda del
canale. E la maggior parte delle aziende usa solo la riga peggiore.

Perché conta più degli incentivi all'assunzione: la base di applicazione. Gli
incentivi toccano solo chi entra, cioè forse il 15-20% dell'organico in un
anno buono. I canali di retribuzione toccano **tutti**, ogni anno, senza
requisiti soggettivi, senza risorse contingentate, senza scadenze e senza
domanda all'INPS.

Su un'azienda da 50 persone, spostare 1.000 € a testa dall'aumento in busta al
fringe benefit vale circa **86.000 € l'anno a parità di netto consegnato**.
Nessun bonus assunzione arriva lì.

La legge di bilancio 2026 ha reso il momento particolarmente favorevole:
l'imposta sostitutiva sui premi di risultato è scesa all'1% su un tetto di
5.000 €. È una finestra che vale la pena giocarsi ora.

---

## 4. Le tre decisioni tecniche che porterei anche in produzione

Le espongo perché sono trasferibili: non sono scelte di questo prototipo, sono
scelte che rifarei su un sistema vero.

### La normativa è un dato, non del codice

Le dieci misure vivono in `agevolazioni-2026.js` come oggetti con predicati
eseguibili, formule, durate, tetti, regole di cumulo, adempimenti e fonti.
Nessuna condizione normativa è scritta dentro il motore.

Il guadagno non è l'eleganza. È che diventa possibile: aggiungere una misura
senza toccare la logica; generare la documentazione dai dati invece che
scriverla a mano (la scheda «Metodo e limiti» è generata così, e quindi non
può divergere dai parametri); e far rivedere il ruleset a un consulente del
lavoro, che non sa leggere un `if` ma sa benissimo dire se un requisito è
scritto giusto.

### I predicati hanno tre valori, non due

Ogni requisito restituisce `true`, `false` oppure `null`. Null significa «con
i dati che ho non lo so».

Sembra un dettaglio ed è la differenza fra due prodotti diversi. Un motore a
due valori risponde «non spetta» e chiude la conversazione. Un motore a tre
valori risponde «mi mancano 26 mesi di storia contributiva, e sapere quel dato
vale 6.000 €» — e quella è una telefonata da fare, non una pratica da
archiviare.

Nel processo reale è la differenza fra un candidato scartato e uno assunto con
un incentivo.

### Il tempo è la dimensione che tutti dimenticano

Gli esoneri sulla contribuzione datoriale sono alternativi fra loro *nello
stesso mese*, non *nel tempo*. È una distinzione che nessun calcolatore
online modella, e vale molti soldi.

Il motore sceglie mese per mese la combinazione migliore su un orizzonte di
cinque anni. Poiché ogni misura ha un calendario proprio e indipendente dalle
altre, l'ottimo mese per mese è anche l'ottimo complessivo: il problema si
risolve con una scansione lineare invece che con una ricerca su 2ⁿ
combinazioni, e — cosa che conta di più — il risultato resta spiegabile riga
per riga, che è la condizione per farlo firmare a un consulente.

Su un'assunzione al Sud la staffetta *Bonus Giovani per 24 mesi, poi
Decontribuzione Sud per 36* vale **20.100 € contro i 15.600 €** della sola
misura migliore. Il 29% in più, che nessuno vede perché nessuno guarda oltre
il primo anno.

Lo stesso ragionamento mensile fa emergere un secondo effetto controintuitivo:
**a parità di RAL, pagare in 12 mensilità invece che in 13 vale oltre 1.000 €
di esonero in più**, perché i massimali sono mensili e la tredicesima ne
spreca una parte. Un modello annuale non può vederlo, e infatti sovrastima.

---

## 5. Cosa non ho costruito, e perché

Elencare i limiti è più utile che coprirli male.

- **Nessun CCNL.** Minimi tabellari, scatti, imponibilità delle singole voci:
  la retribuzione è un numero che si inserisce. Modellare i CCNL è un progetto
  a sé e non cambia nessuna delle conclusioni sopra.
- **Nessuna misura regionale o camerale.** Sono decine, con bandi e sportelli
  propri. È l'estensione naturale, ma è lavoro di raccolta continua più che di
  modellazione: va fatto quando c'è chi lo mantiene.
- **Nessun controllo di capienza dei plafond.** Diverse misure funzionano a
  prenotazione. Il motore dice se il requisito c'è, non se al momento della
  domanda ci saranno ancora fondi. Per saperlo serve un'integrazione, non un
  calcolo.
- **Nessun dato regionale precaricato oltre quelli verificati.** Stessa
  scelta della pagina gemella: un numero sbagliato che sembra autorevole è
  peggio di un campo che chiede un dato.
- **Le aliquote datoriali sono preset modificabili, non verità.** Lato datore
  l'aliquota dipende da CCNL, settore, dimensione e posizione INPS. Ogni
  parametro dichiara in pagina il proprio livello di confidenza, e i preset
  sono marcati come *tipici* o *da verificare* invece che come certi.

E un limite sulle fonti che vale la pena dire chiaramente: l'ambiente in cui
ho sviluppato non raggiunge né inps.it né lavoro.gov.it né jethr.com, bloccati
dalla policy di rete. Ho lavorato su fonti secondarie incrociate, e per questo
ogni misura porta in pagina la norma, la circolare di riferimento e un livello
di confidenza esplicito. **Prima di usare questi numeri su un caso reale vanno
riverificati sulle circolari originali.** Il valore di questo lavoro sta nel
metodo e nella struttura, non nella certificazione dei parametri.

Tre riscontri incoraggianti però ci sono, ottenuti confrontando i risultati
con i numeri che Jet HR pubblica sul proprio sito: il costo azienda su una RAL
di 30.000 € (41.486 € contro ~41.100 €), l'incentivo per l'assunzione di una
persona con disabilità grave (21.000 € al 50,6% del costo, contro 21.000 € al
51%) e il risparmio dell'apprendistato professionalizzante (13,6% contro
~14%). Sono numeri prodotti da un motore diverso, scritto da altri, su fonti
che io non ho potuto raggiungere: li ho messi nella suite di test, perché un
ruleset internamente perfetto ma tarato male passerebbe tutti gli altri
controlli e non questi tre.

---

## 6. Come lo porterei a valore

Se domani lavorassi su questo dentro Jet HR, non partirei costruendo di più.
Partirei misurando.

**Prime settimane — capire dove siamo.** Sul portafoglio clienti esistente:
per ogni assunzione degli ultimi dodici mesi, l'incentivo applicato e quello
che il motore avrebbe indicato. Il numero che ne esce — il **tasso di
cattura**, cioè euro intercettati su euro teoricamente disponibili — è
l'unica metrica che dice se qui c'è un problema da risolvere e quanto grande.
Sospetto sia molto sotto il 100%, ma il punto è saperlo, non sospettarlo.

**Poi — spostare lo strumento a monte.** Se il tasso di cattura è basso per il
motivo 2.1, la correzione non è un calcolatore migliore: sono le tre domande
al candidato del punto 2.2 e la simulazione prima della firma. Piccolo da
costruire, alto in leva.

**In parallelo — la passata sullo stock.** Il batch del punto 2.3 su tutto il
portafoglio è codice già scritto: cambia solo la sorgente dei dati. Produce
euro recuperabili senza che il cliente faccia nulla, ed è il tipo di risultato
che si racconta bene in una call di rinnovo.

**Poi — il canale di retribuzione.** È la leva più grande e la più lenta,
perché richiede accordi di secondo livello. Standardizzare quell'accordo è
lavoro da prodotto, non da consulenza: si fa una volta e vale per tutti.

**Sempre — il ruleset come processo.** Una misura nuova deve poter entrare in
mezza giornata da chi conosce la norma, senza toccare il motore e senza
aspettare un rilascio. Se ci vuole una settimana, il prodotto perde contro la
Gazzetta Ufficiale.

### Le metriche che guarderei

| Metrica | Perché |
|---|---|
| Tasso di cattura degli incentivi | La metrica madre: dice quanto valore stiamo lasciando per strada |
| Quota di assunzioni con simulazione **prima** della firma | Misura se abbiamo davvero spostato lo strumento a monte |
| Giorni fra assunzione e domanda INPS | Le risorse sono contingentate: il ritardo è denaro |
| Quota di domande respinte, per causale | Ogni respinta è un requisito che il motore ha valutato male |
| Euro recuperati sullo stock, per cliente | È l'argomento commerciale più forte che esista |
| Copertura del ruleset sulle misure vigenti | Se scende, il prodotto sta invecchiando |

---

## 7. Cosa mi manca per essere sicuro

Le domande che farei il primo giorno, perché cambierebbero cosa costruisco.

1. **Qual è il tasso di cattura reale oggi?** Se è già alto, il collo di
   bottiglia non è quello che ho descritto e questa analisi va rifatta.
2. **Chi decide contratto e RAL, e quando?** Tutta la tesi del punto 2.1
   dipende dal fatto che il calcolo arrivi dopo la decisione. Se in Jet HR
   arriva già prima, la leva è un'altra.
3. **Quante domande INPS vengono respinte, e per cosa?** È il dato che dice
   quali requisiti modellare meglio: sono i punti in cui il mondo reale
   contraddice il ruleset.
4. **Quanti clienti hanno già un accordo di secondo livello?** Determina se il
   canale del premio di risultato è una leva attivabile subito o un progetto
   di sei mesi.
5. **Il cost saving è un servizio a sé o una ragione per restare?** Cambia
   tutto: nel primo caso si ottimizza il valore per pratica, nel secondo la
   copertura sul portafoglio. Sono roadmap diverse.

---

## Nota di metodo

Ho usato Claude Code per costruire questo, e mi sembra corretto dirlo. Il
lavoro che ho fatto io è quello che si legge in questo documento: capire di
che problema si tratta, decidere che la sequenza temporale contava più della
singola misura, accorgermi che la definizione di «molto svantaggiato» era
circolare e stava raddoppiando ogni durata, decidere che «non lo so» dovesse
essere un terzo valore di ritorno e non un `false`, e scegliere di dichiarare
la confidenza di ogni parametro invece di nasconderla.

Il resto è esecuzione, e l'esecuzione oggi è veloce. La parte che non si
delega è sapere cosa vale la pena eseguire.
