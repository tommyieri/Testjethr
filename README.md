# Dalla RAL al netto

Calcolatore della retribuzione netta annuale e mensile a partire dalla
retribuzione annua lorda, per l'anno d'imposta **2026**.

**→ [Provalo qui](https://tommyieri.github.io/Testjethr/)**

Prototipo realizzato per il task di selezione *Product Builder* di Jet HR.
Non è un prodotto ufficiale Jet HR e non sostituisce il calcolo di un
consulente del lavoro.

---

## Cosa fa

Inserisci il lordo annuale e ottieni il netto annuo e mensile, le trattenute
totali e la loro incidenza. Ogni riga del percorso dal lordo al netto è
espandibile e mostra **la formula applicata e la fonte normativa del
parametro**: l'obiettivo non è solo dare un numero, ma rendere verificabile
come ci si arriva.

Funziona anche al contrario: parti dal netto mensile che vuoi e ti dice quale
RAL serve.

### Input

Il caso standard richiede tre campi. Tutto il resto sta dietro «Personalizza
la tua situazione», così chi vuole solo la stima veloce non paga il costo
della completezza.

| Campo | Effetto |
|---|---|
| Stipendio lordo annuale | Base del calcolo |
| Mensilità | 12, 13 o 14 |
| Tipo di rapporto | Apprendistato → contributi 5,84% invece di 9,19%; tempo determinato → minimo detrazione 1.380 € invece di 690 € |
| Giorni di lavoro | Rapporta le detrazioni a un anno parziale |
| Coniuge a carico | Detrazione art. 12 co. 1 lett. a) TUIR |
| Figli 21-29 anni | Detrazione art. 12 co. 1 lett. c), con soglia crescente per figlio |
| Ripartizione figli | 100% o 50% fra i genitori |
| Altri familiari a carico | Solo ascendenti conviventi |
| Welfare / fringe benefit | Esenti sotto soglia, interamente imponibili sopra |
| Bonus 100 € | Interruttore sul trattamento integrativo |
| Aliquote addizionali | Regionale e comunale modificabili |

---

## Com'è fatto

Tre file, nessuna dipendenza, nessun build step. Si apre anche con un doppio
clic su `index.html`.

```
index.html          markup, stili e logica di interfaccia
parametri-2026.js   solo dati fiscali, ognuno con la sua fonte
calcolo.js          solo logica, nessun numero fiscale scritto dentro
```

**La separazione fra parametri e logica è la decisione strutturale più
importante del progetto.** I parametri fiscali cambiano ogni anno, le formule
quasi mai. Tenerli separati significa che portare il calcolatore al 2027 vuol
dire toccare un solo file, senza rileggere una riga di logica — e che leggendo
una formula si vede il ragionamento, non una costante magica.

`parametri-2026.js` espone `globalThis.PARAMETRI_2026`; `calcolo.js` lo
consuma ed espone `globalThis.CALC` con `calcolaNetto` e `calcolaRalDaNetto`.
Sono script classici e non moduli ES, di proposito: i moduli ES non si
caricano da `file://` per via delle regole CORS, e volevo che il prototipo
funzionasse anche scaricato e aperto in locale.

### Il calcolo, in ordine

```
RAL (+ welfare imponibile se oltre soglia)
  − contributi INPS                    9,19% · 5,84% se apprendista
                                       +1% oltre 56.224 €, cap a 120.607 €
  = imponibile fiscale
  → IRPEF lorda                        23% / 33% / 43% a scaglioni
  − detrazione lavoro dipendente       art. 13 TUIR, rapportata ai giorni
  − detrazioni familiari a carico      art. 12 TUIR
  − ulteriore detrazione               20.000-40.000 €
  = IRPEF netta                        mai negativa
  − addizionale regionale
  − addizionale comunale
  + trattamento integrativo            "bonus 100 €"
  + somma integrativa                  redditi fino a 20.000 €
  + welfare esente                     se sotto soglia
  = netto annuo
```

---

## Le decisioni che ho preso

Questa è la parte che conta più del codice.

### Il cliff del welfare, e perché l'ho modellato

La soglia di esenzione dei fringe benefit è **1.000 €**, elevata a **2.000 €**
per chi ha figli a carico. Non è una franchigia: superata anche di un solo
euro, diventa imponibile **l'intero importo**, non l'eccedenza.

Con RAL 30.000 € e nessun figlio:

| Welfare | Netto mensile |
|---|---|
| 1.000 € | **1.878,89 €** |
| 1.001 € | **1.846,61 €** |

Un euro in più ne costa 32 al mese. È il tipo di discontinuità che un
calcolatore che arrotonda o approssima nasconde, e che invece è esattamente
ciò che un dipendente ha bisogno di sapere. Il prototipo lo modella e lo
segnala esplicitamente quando succede.

La stessa logica di soglia-non-franchigia vale per l'addizionale comunale di
Milano: sotto i 23.000 € non si paga nulla, sopra si paga sull'intero
imponibile.

### Perché non ho precaricato le venti regioni

La Lombardia è modellata a scaglioni su valori verificati. Per le altre regioni
l'aliquota si inserisce a mano.

Non è una dimenticanza. Le fonti secondarie che ho consultato si contraddicono
già sui valori base — una dà Friuli 0,70% e Calabria 2,03%, un'altra Valle
d'Aosta 0,70% e Calabria 2,25% — e non ho potuto raggiungere le fonti primarie
per verificarle. Precaricare venti tabelle fiscali incerte avrebbe reso il
risultato **meno** affidabile, non più completo: un numero sbagliato che sembra
autorevole è peggio di un campo che chiede un dato.

### Trattamento integrativo e somma integrativa sono cumulabili

A RAL 12.000 € il netto risulta il **99,91%** del lordo. Sembra un errore, e
all'inizio l'ho trattato come tale: sospettavo che le due misure venissero
sommate quando erano alternative.

La verifica dice il contrario. Sono misure **distinte e cumulabili**: il
trattamento integrativo (DL 3/2020) convive con la somma integrativa introdotta
dalla L. 207/2024. Alle fasce basse i due bonus compensano quasi per intero
contributi e imposte. Il risultato è corretto, e vale la pena conoscerlo
proprio perché è controintuitivo.

### La base della somma integrativa

La percentuale si applica al *reddito di lavoro dipendente*, mentre la soglia
di accesso guarda il *reddito complessivo*. Ai sensi dell'art. 51 co. 2 lett. a)
TUIR i contributi obbligatori non concorrono al reddito di lavoro dipendente,
quindi per chi ha solo redditi da lavoro le due grandezze coincidono con
l'imponibile fiscale. È il motivo per cui nel codice compare un solo valore.

### Progressive disclosure

Il calcolatore è passato da 3 a 12 input senza che il caso semplice diventi più
difficile. La schermata iniziale chiede lordo, mensilità e basta; il resto sta
in un pannello richiudibile. Aggiungere campi è facile, aggiungerli senza
appesantire il percorso di chi non ne ha bisogno è il lavoro vero.

---

## Cosa non copre

Dichiarato anche in pagina, perché un limite noto e scritto vale più di una
copertura apparente.

| | |
|---|---|
| **Aliquote regionali** | Solo la Lombardia è precaricata, per le ragioni sopra |
| **Anno di competenza delle addizionali** | Calcolate sul reddito dell'anno corrente; nella realtà si trattengono a rate nell'anno successivo, quindi in busta paga convivono acconto e saldo |
| **Trattamento integrativo 15.000-28.000 €** | In quella fascia dipende da spese mediche e bonus edilizi, che il calcolatore non conosce |
| **Oneri detraibili e deducibili** | Spese mediche, mutuo, previdenza complementare: insieme ai familiari a carico sono la variabile che sposta di più il netto reale a parità di RAL |
| **Soglia welfare e figli sotto i 21 anni** | La soglia di 2.000 € si attiva qui solo con figli 21-29; nella realtà vale per qualunque figlio a carico |
| **Sterilizzazione IRPEF oltre 200.000 €** | Taglia 440 € di oneri detraibili al 19%, qui assenti per assunzione: implementarla non produrrebbe alcun effetto |
| **Contrattazione collettiva** | Nessun CCNL. Le mensilità aggiuntive sono un divisore, non voci con imponibilità propria |
| **Cadenza reale delle trattenute** | Calcolo annuale diviso per le mensilità; una busta paga vera applica IRPEF mese per mese con conguaglio a dicembre |

### Assunzioni di partenza

Impiegato a tempo indeterminato, residente a Milano, nessuna agevolazione
particolare, nessun familiare a carico salvo indicazione contraria. Il
massimale contributivo è applicato a tutti, il che presuppone assenza di
anzianità contributiva al 31/12/1995.

---

## Verifica

Il prototipo è stato testato in Chromium headless con Playwright: **62
controlli**, tutti superati, su regressione numerica, effetto di ogni singolo
input, contrasto WCAG AA in tema chiaro e scuro, target touch, assenza di
scroll orizzontale da 320 a 1280 px, semantica e assenza di errori JavaScript.

Per una verifica manuale rapida, con i valori di default (13 mensilità,
Lombardia, Milano, nessun familiare a carico):

| RAL | Netto mensile |
|---|---|
| 12.000 € | 922,26 € |
| 20.000 € | 1.340,97 € |
| 30.000 € | 1.801,96 € |
| 45.000 € | 2.310,33 € |
| 60.000 € | 2.888,82 € |
| 130.000 € | 5.563,05 € |

---

## Fonti

Ogni parametro cita la propria fonte anche nell'interfaccia, sotto la voce
corrispondente.

**Normativa**
Art. 12, 13 e 51 TUIR · L. 207/2024 (Legge di Bilancio 2025) · Legge di
Bilancio 2026 · DL 3/2020 art. 1 · D.Lgs. 192/2024 · art. 3-ter DL 384/1992
conv. L. 438/1992 · art. 72 L.R. Lombardia 10/2003 · delibera Comune di Milano
n. 46 del 28/09/2020

**Prassi e documentazione**
- [MEF — Principali misure della legge di bilancio 2026](https://www.mef.gov.it/focus/Principali-misure-della-legge-di-bilancio-2026/)
- [Il Sole 24 Ore — INPS, aliquote contributive 2026](https://ntpluslavoro.ilsole24ore.com/art/inps-aliquote-contributive-2026-i-lavoratori-dipendenti-AI8FP90)
- [EC News — Contributi INPS 2026: minimali e massimali](https://www.ecnews.it/lavoro/news-del-giorno/contributi-inps-2026-stabiliti-minimali-massimali/)
- [Fiscomania — Detrazioni per redditi da lavoro dipendente](https://fiscomania.com/detrazioni-per-redditi-da-lavoro-dipendente/)
- [Fiscomania — Familiari a carico 2026](https://fiscomania.com/familiari-a-carico-limiti-detrazione/)
- [Brocardi — Art. 12 TUIR](https://www.brocardi.it/testo-unico-imposte-redditi/titolo-i/capo-i/art12.html) · [Art. 13 TUIR](https://www.brocardi.it/testo-unico-imposte-redditi/titolo-i/capo-i/art13.html)
- [Studio Zazza — Trattamento integrativo, somma integrativa e ulteriore detrazione](https://www.studiozazza.eu/trattamento-integrativo-somma-integrativa-a-sostituzione-dellesonero-contributivo-ulteriore-detrazione-legge-207-2024-note/)
- [Fiscal Focus — Sterilizzazione del beneficio oltre 200.000 €](https://www.fiscal-focus.it/infografica/schede-infografica/irpef-riduzione-seconda-aliquota-e-sterilizzazione-del-beneficio-per-redditi-oltre-200-000-euro,3,180553)

---

## Nota sulla veste grafica

Colori e marchio in pagina sono un'interpretazione grafica ispirata al
posizionamento di Jet HR, **non un prelievo dal loro design system**: il sito
jethr.com non era raggiungibile dall'ambiente in cui il prototipo è stato
sviluppato. La pagina lo dichiara esplicitamente.
