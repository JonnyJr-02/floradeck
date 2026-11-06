# FloraDeck — Specifica originale

> Testo fornito dall'utente il 2026-11-06 come prompt iniziale, riportato senza modifiche di contenuto (solo formattazione Markdown).
> I valori tra `[[ … ]]` erano decisioni modificabili: sono stati accettati i valori predefiniti.
> Le decisioni prese dopo sono in [CLAUDE.md](../CLAUDE.md) e [PLAN.md](PLAN.md).

## Ambiente di lavoro (leggi per primo)

- Lavori in locale sul mio PC Windows, nella cartella `C:\Users\jjarb\floradeck`, dall'app Claude desktop. Tutti i file del progetto vanno creati qui, non in un ambiente cloud.
- Il terminale è PowerShell. Node.js e npm/npx sono installati; la execution policy è già `RemoteSigned` per il mio utente. Se un comando `npx` dà problemi, usa `npx.cmd`. Tieni conto dei percorsi Windows.
- Git: verifica se è installato (`git --version`). Se manca, dimmelo e suggeriscimi `winget install Git.Git`; non installare niente sul sistema senza chiedermelo.
- Chiedimi conferma prima di ogni installazione globale o comando che modifica il sistema fuori da questa cartella.

## Fase 0 — Verifica del setup (prima di tutto il resto)

1. Elenca le skill che vedi in `.claude/skills/` di questo progetto e in quelle globali. Devono esserci almeno:
   - `impeccable`
   - `design-taste-frontend` (è la "Taste skill")
   - le skill di Emil Kowalski: `emil-design-eng`, `animate`, `review-animations`
2. Se mancano le skill di Emil Kowalski, proponimi di installarle (con il mio permesso) con: `npx -y skills add emilkowalski/skills --agent claude-code` (se il repository non esiste, prova `emilkowalski/skill`), scegliendo le tre skill sopra.
3. Collega il server MCP di Playwright a questo progetto creando un file `.mcp.json` nella root con:

   ```json
   {
     "mcpServers": {
       "playwright": {
         "command": "cmd",
         "args": ["/c", "npx", "@playwright/mcp@latest"]
       }
     }
   }
   ```

   Poi dimmi se devo riavviare la sessione o l'app perché venga caricato, e dopo il riavvio verifica di avere davvero accesso agli strumenti di Playwright (es. apri una pagina di prova e fai uno screenshot).
4. Fammi un riepilogo: skill trovate, MCP attivi, versioni di Node/npm/git. Solo dopo passa al piano del progetto.

## Ruolo e modo di lavorare

Sei il mio sviluppatore senior. Costruiremo insieme un'app personale, usata solo da 2 persone (io e la mia ragazza). Io sono un ingegnere biomedico con esperienza di deep learning in Python (PyTorch), quindi la parte di machine learning puoi spiegarmela a livello tecnico; sul frontend sono meno esperto.

Regole di lavoro:

1. Prima di scrivere codice, leggi tutta questa specifica, poi proponimi un piano a fasi (con struttura delle cartelle e scelte tecniche) e fammi le domande che ti servono. Aspetta la mia conferma.
2. Lavora una fase alla volta. Alla fine di ogni fase: fai girare build e test, dimmi cosa provare a mano sul telefono e fermati.
3. Crea e mantieni aggiornato un `CLAUDE.md` nella root con: decisioni prese, comandi utili (dev, build, test, training), struttura del progetto.
4. Codice e commenti in inglese, interfaccia dell'app in italiano.
5. Usa git: un commit chiaro alla fine di ogni passo significativo.
6. Budget zero: niente servizi a pagamento, niente account sviluppatore Apple/Google. Tutto deve funzionare con strumenti gratuiti.

## Skill e strumenti MCP disponibili

Usa queste skill e questi server MCP come indicato (verificati nella Fase 0). Quando una skill è pertinente, caricala davvero e seguine le istruzioni; dimmi in una riga quale skill stai usando in ogni passo di UI:

- **Impeccable** (skill di design principale): applicala a tutto il lavoro di interfaccia. Prima di iniziare la UI esegui `/teach-impeccable` (o il comando equivalente) per salvare il contesto di design del progetto. Usa i suoi comandi di critica/audit/polish alla fine di ogni fase di UI.
- **Skill di Emil Kowalski** (animazioni e rifinitura): usale per tutte le animazioni e le micro-interazioni (apertura della carta, riempimento degli slot, transizioni). Prima di chiudere una fase che contiene animazioni, fai una revisione delle animazioni con la sua skill di review.
- **Taste skill** (`design-taste-frontend`): [[ usala solo nella fase dei mockup, per produrre una delle proposte visive alternative; poi tieni la direzione che scelgo io. Se scelgo quella di Taste, diventa lei la skill principale al posto di Impeccable ]]. Non applicare insieme due skill di design generali con regole in conflitto: se trovi un conflitto, chiedimi quale seguire.
- **Playwright MCP**: dopo ogni modifica alla UI, apri l'app in un viewport mobile (es. 390×844 e 360×800, anche in modalità scura). Fai screenshot, controllali, correggi i problemi visivi e usa Playwright per i test end-to-end dei flussi principali. Prova anche il motore WebKit per avvicinarti a Safari su iPhone. La fotocamera vera e iOS reale non si possono testare così: dimmi tu cosa devo verificare a mano sul telefono.
- [[ **Figma MCP**: solo se ti passo un link a un file Figma, usalo come riferimento di design. Se non c'è nessun file Figma, ignoralo. ]]

Riferimenti visivi: [[ incolla qui link o screenshot di app/siti che ti piacciono, es. una moodboard ]]. Hanno la precedenza sui gusti di default delle skill.

## Obiettivo

Il nome dell'app è **FloraDeck** (usalo nel manifest PWA, nel titolo, nell'icona e nell'interfaccia).

Un'app "collezionatore di fiori e piante" stile gioco di figurine:

- inquadro una pianta con la fotocamera → l'app la riconosce offline, sul dispositivo;
- mostra nome comune italiano, nome scientifico e una breve descrizione;
- se la specie è nel catalogo collezionabile, la aggiunge alla mia collezione come "carta" con la mia foto;
- le specie sono organizzate in pochi album da completare, ognuno con una specie rara;
- io e la mia ragazza possiamo regalarci carte e vedere i progressi dell'altro sugli album.

## Piattaforme e architettura

- Un unico codebase: Progressive Web App (PWA) installabile sulla schermata Home.
  - Il mio telefono è Android (Chrome); quello della mia ragazza è un iPhone (Safari, "Aggiungi a Home").
  - Opzionale in una fase successiva: impacchettare la stessa PWA come APK Android con Capacitor (sideload, senza Play Store).
- Stack proposto (puoi suggerire alternative motivate prima di iniziare):
  - Vite + React + TypeScript
  - Stile: Tailwind CSS + componenti propri; animazioni con Framer Motion
  - Persistenza locale: IndexedDB tramite Dexie; chiedi `navigator.storage.persist()` all'avvio
  - Offline: service worker con vite-plugin-pwa / Workbox che mette in cache app, modello ML, catalogo e illustrazioni
  - Inferenza ML nel browser: ONNX Runtime Web (WebGPU se disponibile, fallback WASM). Valuta tu se TF.js/TFLite è meglio e dimmelo.
  - Hosting gratuito con HTTPS (necessario per la fotocamera): GitHub Pages o Cloudflare Pages
- Dopo il primo caricamento, tutto deve funzionare senza connessione: fotocamera, riconoscimento, collezione, album. Solo la sincronizzazione tra noi due usa internet (o i QR, vedi sotto).
- Gestisci i limiti di iOS: Safari può cancellare i dati di siti non installati e non usati per un po' → mostra un avviso che spiega di installare la PWA sulla Home, e prevedi export/import di un backup (file JSON + foto compresse).

## Struttura del repository (indicativa)

```
/app            → la PWA (React)
/ml             → pipeline Python per dataset, training, valutazione, export ONNX
/catalog        → catalogo specie (JSON) + descrizioni + illustrazioni
/docs           → note, decisioni
CLAUDE.md
```

## Catalogo specie e album

### Vincoli sulle specie (tutti obbligatori)

1. Colore non verde ben visibile: fiori, infiorescenze o bacche colorate (rosso, giallo, blu, viola, bianco, rosa, arancio…), così da distinguerle in natura.
2. Presenti in Italia (spontanee o naturalizzate, oppure comunissime nei giardini se in un album dedicato).
3. Fotografabili: la parte colorata deve stare bene in un'inquadratura da telefono, indicativamente tra ~1 cm e ~2–3 m. Niente fiori microscopici, niente alberi enormi.
4. Riconoscibili da foto dal modello: evita gruppi di specie praticamente indistinguibili; se necessario usa il livello di genere (es. "Muscari sp.") e segnalamelo.

### Album

- [[ 8 ]] album, ciascuno con [[ 10–12 ]] specie, di cui 1 rara (totale ~80–100 specie).
- Proposta di album da cui partire (rivedili con me e proponimi la lista delle specie in un file prima di procedere con il ML):
  1. Prati di primavera
  2. Campi e bordi di strada
  3. Montagna e pascoli alpini
  4. Macchia mediterranea e coste
  5. Boschi e sottobosco
  6. Zone umide, fossi e laghi
  7. Giardini, parchi e balconi
  8. Bacche e colori d'autunno
- Esempi di specie rare (da verificare): Leontopodium nivale (stella alpina), Cypripedium calceolus (scarpetta di Venere), Lilium martagon, Paeonia officinalis, Pancratium maritimum (giglio di mare), Nigritella sp.
- Ogni specie ha rarità: comune / non comune / rara (1 per album). Opzionale: "leggendaria" per un solo fiore segreto in tutto il gioco.
- Per le specie protette l'app deve mostrare chiaramente "Fotografala, non raccoglierla".

### Schema dati di una specie (`/catalog/species.json`)

```json
{
  "id": "papaver-rhoeas",
  "scientificName": "Papaver rhoeas",
  "commonNameIt": "Papavero comune",
  "family": "Papaveraceae",
  "albumId": "campi-bordi-strada",
  "rarity": "common",
  "dominantColors": ["rosso"],
  "bloomMonths": [4, 5, 6, 7],
  "habitat": "Campi coltivati, incolti, bordi delle strade",
  "altitude": "0–1500 m",
  "regions": "Tutta Italia",
  "sizeNote": "Fiore 5–10 cm",
  "description": "2–4 frasi in italiano, tono elegante e curioso.",
  "funFact": "Una curiosità breve.",
  "protected": false,
  "toxic": false,
  "lookalikes": ["papaver-dubium"],
  "modelLabels": ["Papaver rhoeas"]
}
```

- Le descrizioni le scrivi tu in italiano, ma segnalale come "da verificare" e preparami uno script/lista per controllarle velocemente. Non inventare dati: se non sei sicuro di un'informazione, lascia il campo vuoto e segnalalo.
- Tutto il catalogo deve essere incluso nell'app (offline).

## Riconoscimento delle piante (parte ML)

### Approccio

Valuta e proponimi una di queste strade (o una combinazione), spiegando pro/contro, dimensioni del modello e accuratezza attesa:

- **A) Modello addestrato da me (preferita):** fine-tuning di un backbone leggero (MobileNetV3 / EfficientNet-Lite / ConvNeXt-Tiny / un ViT piccolo) sulle specie del catalogo, più una classe "altro" addestrata su molte piante non in catalogo e su immagini senza piante.
- **B) Modello pre-addestrato su molte specie** (migliaia) usato così com'è, mappando le sue etichette sulle specie del catalogo; tutto il resto diventa "pianta non collezionabile".
- **C) Embedding** (es. modello tipo BioCLIP o un backbone pre-addestrato) + classificatore leggero / nearest-neighbour sugli embedding delle specie del catalogo.

### Requisiti

- Inferenza interamente sul dispositivo, modello quantizzato (int8 o fp16), dimensione target < [[ 30 ]] MB, tempo di risposta < 2 s su un telefono di fascia media.
- Gestire bene i casi fuori catalogo (rilevamento out-of-distribution): soglia di confidenza calibrata (temperature scaling), classe "altro", e risposta "Non sono sicuro" invece di una specie sbagliata.
- Mostrare le prime 3 ipotesi con la confidenza quando il modello è incerto, e lasciarmi scegliere / confermare. Una carta si aggiunge alla collezione solo se confidenza ≥ soglia oppure se l'utente conferma una delle 3 ipotesi.
- Consigli di scatto nell'interfaccia: "avvicinati al fiore", "un fiore solo al centro", "luce naturale".

### Pipeline in `/ml` (Python, PyTorch)

1. Script per scaricare foto con licenza aperta (CC0 / CC-BY / CC-BY-NC) di osservazioni "research grade" da iNaturalist / GBIF, preferendo osservazioni italiane/europee; salva le attribuzioni in un CSV.
2. Pulizia, deduplica, split train/val/test per osservazione (non per immagine, per evitare leakage).
3. Training con data augmentation realistica (luce, sfocatura, crop, rotazioni) — deve girare su Google Colab gratuito o su GPU locale. Dammi un notebook Colab pronto.
4. Valutazione: accuratezza top-1/top-3 per specie, matrice di confusione, analisi dei sosia, curva confidenza/errori per scegliere la soglia.
5. Export ONNX + quantizzazione + test di parità (stesso output in Python e nel browser su immagini di test).
6. Un file `labels.json` che collega gli indici del modello agli `id` del catalogo.

Finché il modello vero non è pronto, nell'app crea un riconoscitore finto (mock) dietro la stessa interfaccia, così l'interfaccia si può sviluppare in parallelo.

## Meccaniche di gioco

- **Carta:** la mia foto (ritagliata e compressa), nome, rarità, data, luogo (facoltativo, solo con il mio permesso), album, numero della carta nell'album (es. 07/12).
- **Album:** griglia con slot vuoti in silhouette/ombra per le specie non ancora trovate (mostra solo un indizio: colore, habitat, periodo di fioritura). Barra di avanzamento. Lo slot della specie rara ha un aspetto speciale.
- **Completamento di un album:** animazione di celebrazione + badge. Completare tutti gli album sblocca qualcosa di speciale (es. la carta leggendaria o un tema grafico).
- **Doppioni:** se trovo di nuovo una specie che ho già, la carta va tra i "doppioni", che si possono regalare. Tengo comunque la foto migliore (posso scegliere quale tenere come copertina).
- **Stagionalità:** sezione "In fiore questo mese" con le specie mancanti che fioriscono adesso.
- **Diario:** cronologia delle scoperte, con foto e data.
- Facoltativo: piccole sfide settimanali generate in locale (es. "trova un fiore viola").
- Nessuna penalità, nessuna notifica aggressiva: è un gioco rilassante.

## Due giocatori: condivisione e regali

Gli utenti sono solo 2. Proponimi la soluzione migliore tra queste, mantenendo l'app offline-first:

1. **Regalo tramite QR / link** (funziona anche senza server): regalare un doppione genera un QR o un link/file da mandare su WhatsApp; l'altra persona lo apre o lo scansiona e la carta entra nella sua collezione con l'etichetta "Regalo di …". La carta regalata esce dalla mia collezione di doppioni (niente copie infinite). Il payload contiene id specie, foto compressa, data, mittente e un codice per evitare che lo stesso regalo venga importato due volte.
2. **Sincronizzazione online opzionale** con un backend gratuito (es. Supabase free tier, 2 account): quando c'è connessione, sincronizza regali e progressi; senza connessione l'app funziona comunque e mette le operazioni in coda.

Funzioni di coppia:

- Profilo di ognuno (nome, colore, avatar).
- Vedere gli album dell'altra persona (sola lettura) e i suoi progressi.
- Album condiviso di coppia (facoltativo): un album comune in cui le specie trovate da uno dei due contano per entrambi.
- Un messaggio breve allegato al regalo ("L'ho trovato pensando a te").

Niente login complicati: con il backend, sono sufficienti 2 account creati a mano.

## Estetica

- Moderna ed elegante, ispirata alle tavole botaniche e alle riviste di design, ma con la "giocosità" delle figurine.
- Palette: sfondo carta/avorio caldo (e una modalità scura con blu notte/antracite), colori di accento presi dai fiori. Il verde va usato con moderazione.
- Tipografia: un serif elegante per i titoli (es. Fraunces, Cormorant o Playfair Display) + un sans pulito per i testi (es. Inter). Font inclusi nell'app (offline).
- Carte con angoli arrotondati, leggera texture di carta, bordo che cambia con la rarità (es. foglia d'oro per le rare, effetto olografico leggero per la leggendaria quando inclini il telefono, se il sensore è disponibile).
- Micro-animazioni curate: l'apertura della carta dopo il riconoscimento (stile "spacchettamento"), il riempimento dello slot nell'album, i coriandoli di petali quando si completa un album.
- Mobile-first, uso a una mano, navigazione in basso con 4 voci: Esplora (fotocamera), Album, Diario, Coppia.
- Accessibilità: contrasto adeguato, testo ridimensionabile, rispetto di "riduci movimento".
- Prima dell'implementazione definitiva, creami 2–3 proposte visive (mockup HTML statici) tra cui scegliere.

## Privacy e dati

- Le foto restano sul dispositivo (e sul backend solo se attivo la sincronizzazione). Posizione GPS solo con il mio permesso, e in ogni caso arrotondata.
- Le foto vengono ridimensionate (es. lato lungo 1080 px, WebP/JPEG) per non riempire la memoria.
- Esportazione e importazione del backup completo.

## Fasi suggerite (rivedile con me)

0. Verifica del setup (skill, Playwright, strumenti), poi piano, domande, `CLAUDE.md`, impostazione del repository.
1. Lista delle specie e degli album → la valido io → `species.json` completo.
2. Scheletro della PWA: navigazione, tema, IndexedDB, offline, installazione su Android e iPhone. Deploy su GitHub Pages.
3. Fotocamera + riconoscitore mock + flusso "scatto → carta → collezione".
4. Album, rarità, doppioni, diario, stagionalità, animazioni.
5. Pipeline ML: dataset, training su Colab, valutazione, export ONNX.
6. Integrazione del modello vero nella PWA, calibrazione delle soglie, test su foto reali.
7. Regali via QR/link, poi (facoltativo) sincronizzazione con Supabase.
8. Rifinitura grafica, backup, test su iPhone e Android, (facoltativo) APK con Capacitor.

> Nota: le fasi sono state riviste e rinumerate in [PLAN.md](PLAN.md).

## Definizione di "fatto"

- Funziona in modalità aereo su Android (Chrome) e su iPhone (PWA installata da Safari).
- Riconoscimento < 2 s; top-1 ≥ [[ 85 ]]% e top-3 ≥ [[ 95 ]]% sul test set delle specie del catalogo; le piante fuori catalogo vengono per lo più respinte invece di essere classificate male.
- Un regalo inviato da un telefono arriva sull'altro e non può essere importato due volte.
- Test automatici per la logica di collezione, i regali e l'import/export.
