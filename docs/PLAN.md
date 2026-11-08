# FloraDeck — Piano di lavoro

Concordato il 2026-11-06: il piano è stato accettato con le scelte predefinite elencate in fondo.
Requisiti completi in [SPEC.md](SPEC.md); sintesi operativa delle decisioni in [CLAUDE.md](../CLAUDE.md).

## Scelte tecniche

| Area | Scelta | Note |
|---|---|---|
| App | Vite + React + TypeScript | come da specifica |
| Stile | Tailwind CSS v4 + componenti propri | |
| Animazioni | Motion (nuovo nome di Framer Motion, stessa API) | |
| Dati locali | Dexie (IndexedDB) + `navigator.storage.persist()` all'avvio | stato della persistenza visibile nelle impostazioni |
| Offline | vite-plugin-pwa (Workbox) | app, catalogo, font e illustrazioni in precache; il modello (~10–15 MB) si scarica una volta con barra di avanzamento ed è versionato, così un aggiornamento dell'app non lo riscarica |
| Inferenza | ONNX Runtime Web in un Web Worker | WASM-SIMD come base (stima 0,1–0,5 s); WebGPU solo se i benchmark sui telefoni lo giustificano, perché compila gli shader alla prima inferenza. TF.js scartato: la conversione PyTorch→TF è fragile |
| Foto | lato lungo 1080 px, miniatura separata | WebP se il browser lo codifica, altrimenti JPEG (controllo a runtime: Safari spesso non lo fa) |
| Illustrazioni | tavole botaniche di pubblico dominio (Thomé, Sturm, Köhler, Curtis's Botanical Magazine, Sibthorp per le mediterranee) da Wikimedia Commons e BHL | attribuzioni salvate; silhouette degli slot vuoti ricavate da script; ~5–8 MB in tutto |
| Test | Vitest + fake-indexeddb; Playwright Test con profilo Android (Chromium) e iPhone (WebKit); Playwright MCP | controlli visivi a 390×844 e 360×800, chiaro e scuro |
| Hosting | GitHub Pages via GitHub Actions, repo pubblico | riserva: Cloudflare Pages (repo privato, header per WASM multi-thread) |

## Struttura del repository

```
floradeck/
├─ app/                 PWA
│  ├─ src/domain/       logica pura: collezione, doppioni, regali, stagionalità (tutta testata)
│  ├─ src/db/           schema Dexie, migrazioni, backup
│  ├─ src/recognition/  interfaccia Recognizer, mock, worker ONNX, preprocessing
│  ├─ src/features/     explore · albums · journal · couple · settings
│  ├─ src/ui/           design system (Carta, Slot, Sheet…), token, temi, font
│  └─ e2e/              test Playwright
├─ catalog/             species.json, albums.json, schema, illustrazioni + attribuzioni, script di verifica
├─ ml/                  download, pulizia, split, training, valutazione, export; notebook Colab
├─ docs/                SPEC.md, PLAN.md, mockups/
├─ .mcp.json
└─ CLAUDE.md
```

`catalog/` è la fonte unica: l'app lo importa e lo valida al build, la pipeline ML ne legge le specie.
`ml/` produce `labels.json` con temperatura, soglie, normalizzazione e versione del modello, così nell'app non ci sono numeri scritti a mano.

## Riconoscimento delle piante

### Le tre strade

- **A — fine-tuning** di un CNN mobile (MobileNetV4-M, EfficientNet-B0 o ConvNeXt-Nano, via timm): ~5–16 MB in int8. Stima 88–94 % top-1 e 96–99 % top-3 su foto in stile iNaturalist con ~95 specie (82–90 % e 93–97 % con le ~260 attuali, vedi Aggiornamenti); meno su foto reali, che misureremo con un set di foto vostre. È l'unica strada che rispetta insieme dimensione, tempi e accuratezza.
- **B — modello già pronto:** l'unico piccolo e aperto (Google AIY Plants, ~2000 specie, 2019) è debole e copre in modo incerto la flora italiana; quelli buoni (BioCLIP, il ViT-B di PlantCLEF) pesano ~90 MB anche in int8 e sul telefono sono lenti. Scartata.
- **C — embedding + kNN** (ad es. DINOv2 ViT-S, ~22 MB): aggiungere specie senza riaddestrare è comodo, ma le feature congelate di solito restano qualche punto sotto il fine-tuning.

**Scelta: A**, con l'idea di C come secondo segnale: il modello esporta anche l'embedding del penultimo strato, e la distanza dai prototipi di specie si affianca a softmax calibrata e classe "altro" per riconoscere le piante fuori catalogo. Il segnale definitivo si sceglie dalle curve di valutazione.

### Pipeline (`ml/`)

1. **Dati:** iNaturalist (API + open data su AWS), solo research grade, licenze CC0/CC-BY/CC-BY-NC, Italia e poi Europa come riserva; attribuzioni in CSV. Preferenza per le osservazioni annotate "In fiore" / "Con frutti", così il modello vede la parte colorata e non le foglie. Obiettivo 300–800 osservazioni per specie.
2. **Classe "altro":** sosia fuori catalogo, ~300 piante italiane comuni, foto di sole foglie, immagini senza piante.
3. **Pulizia e split:** deduplica (hash percettivo), split per osservazione; il test set è raggruppato anche per osservatore (stessa persona = stessa fotocamera e stessi posti → stima ottimistica).
4. **Training su Colab T4:** AdamW + cosine, label smoothing, AMP, bilanciamento delle classi, confronto fra 2–3 backbone. Augmentation realistica (crop, rotazioni, sfocatura, compressione JPEG, luce) ma **senza hue jitter**: il colore è la feature che distingue le specie.
5. **Valutazione:** top-1/top-3 per specie, matrice di confusione, coppie di sosia, ECE prima e dopo il temperature scaling, curva rischio–copertura su validation con piante dentro e fuori catalogo per fissare la soglia (ad es. ≥ 95 % di precisione sulle carte accettate).
6. **Export:** ONNX, poi int8 calibrato oppure fp16. Il test di parità controlla separatamente il modello (stessi tensori in Python e nel browser, via Playwright) e il preprocessing (il ridimensionamento del browser e quello di PIL differiscono: è il bug classico).
7. **Metadati:** `labels.json` (indice del modello → `id` del catalogo) + temperatura, soglie, normalizzazione.

Download, pulizia ed export girano in locale su CPU: la GPU del PC (MX130, 2 GB) non basta per il training.

### Nell'app

- Media su 2–3 ritagli della foto.
- Sopra soglia → carta; zona grigia → "Non sono sicuro" + prime 3 ipotesi da confermare; "altro" o fuori distribuzione → "Non sembra una specie del catalogo" + consigli di scatto.
- Fino al modello vero: `MockRecognizer` con la stessa interfaccia e scenari forzabili (sicuro / incerto / fuori catalogo).

## Regali e coppia: offline-first, senza server

- **Regalo = link** condiviso con il menu nativo (WhatsApp), con i dati nel frammento `#` dell'URL: nessun server, e il frammento non arriva neanche all'hosting. Contiene id specie, foto compressa (~15–20 KB), data, mittente, messaggio e un `giftId` univoco. In alternativa lo stesso contenuto viaggia come file `.floradeck`.
  - Android: di solito il link apre direttamente la PWA installata (da verificare).
  - iPhone: iOS apre i link in Safari, che ha una memoria separata dalla PWA sulla Home → la pagina mostra "Copia regalo", poi in FloraDeck si tocca "Incolla regalo".
- **QR di persona:** abbinamento iniziale dei profili e aggiornamento dei progressi (un QR contiene ~3 KB: l'elenco delle specie sì, le foto no).
- **Niente copie infinite:** il doppione esce dalla collezione appena si crea il regalo e va nello storico (rinvio = stesso `giftId`); chi riceve conserva i `giftId` importati, anche nel backup, quindi un secondo import viene rifiutato. Coperto da test automatici.
- **Coppia:** album dell'altra persona in sola lettura dall'ultimo aggiornamento ricevuto (con data); album di coppia = unione delle due collezioni.
- **Backend facoltativo (fase 8):** il piano gratuito di Supabase mette in pausa i progetti inattivi da circa una settimana (da ricontrollare prima); valutare anche Cloudflare Workers + D1.

## Fasi

| # | Fase | Note |
|---|---|---|
| 0 | Setup, piano, `CLAUDE.md`, repository | ✅ 2026-11-06 |
| 1 | Catalogo: album + lista specie in un file → validazione → `species.json`, schema, foglio di verifica con link (Portale della Flora d'Italia, Acta Plantarum, POWO) | ✅ 2026-11-06; i testi restano da verificare con `catalog/review/index.html` |
| 2 | Design: `impeccable teach`, 3 mockup statici (2 Impeccable, 1 Taste) → scelta | ✅ 2026-11-07: scelta la proposta C «Foto in primo piano» (Taste skill), in `docs/mockups/taste/` |
| 3 | Scheletro PWA: navigazione, temi, font offline, Dexie, offline, guida all'installazione, avviso iOS, deploy | anche skill `mobile-native`; ✅ 2026-11-08: pubblicata su https://jonnyjr-02.github.io/floradeck/ |
| 4 | Fotocamera + mock + scatto → carta → collezione, animazione di spacchettamento | ✅ 2026-11-08; da provare sui telefoni |
| 5 | Album, rarità, doppioni, copertina, diario, "In fiore questo mese", celebrazioni, carta leggendaria, **backup** | backup anticipato: su iPhone serve appena si inizia a collezionare; ✅ 2026-11-08, da provare sui telefoni |
| 6 | Pipeline ML, notebook Kaggle, valutazione, export | gli script partono subito dopo la fase 1, in parallelo alla UI |
| 7 | Modello vero nell'app, calibrazione, test su foto reali | |
| 8 | Profili, regali, funzioni di coppia; backend facoltativo | |
| 9 | Rifinitura (controlli finali di design e accessibilità, review animazioni), test sui telefoni, sfide settimanali, APK Capacitor facoltativo | |

Siamo a novembre: fino a marzo i test sul campo si potranno fare quasi solo con bacche e piante da giardino o balcone; per il resto si useranno foto di test.

## Scelte predefinite accettate (2026-11-06)

1. Specie diffuse in tutta Italia (regione non indicata).
2. Nessun riferimento visivo: si parte dall'estetica descritta nella specifica.
3. GitHub Pages con repository pubblico.
4. Script ML subito dopo il catalogo, in parallelo alle fasi di UI; il training su Colab lo lancia l'utente.
5. Carta leggendaria nella fase 5, sfide settimanali nella fase 9.
6. Posizione solo su permesso, arrotondata a ~1 km, con il comune più vicino calcolato offline (elenco ISTAT).
7. Nessuna ipotesi sui telefoni: le prestazioni si misurano sui vostri.

## Aggiornamenti

- **2026-11-06 — catalogo più grande, su richiesta:** 10 album da 20–30 specie (circa 260) più la leggendaria, invece di 8 album da 10–12. Nuovi album: *Orchidee spontanee* (tutte le orchidee del catalogo stanno qui) e *Orto, frutteto ed erbe aromatiche*. Resta una sola specie rara per album.
  - Effetto sul modello: dimensione e tempi non cambiano (cresce solo l'ultimo strato), ma con ~260 classi l'accuratezza attesa scende. Stima rivista: 82–90 % top-1 e 93–97 % top-3 su foto in stile iNaturalist. Dopo l'analisi delle confusioni (fase 6) le classi che il modello confonde si accorpano a livello di gruppo/genere o si sostituiscono.
  - Effetto sui dati: circa 170 000 foto (~10 GB a 500 px), da scaricare in qualche ora nei limiti chiesti da iNaturalist; training su Colab di diverse ore, con checkpoint su Drive.
- **2026-11-07 — direzione di design: proposta C «Foto in primo piano».** La Taste skill diventa la skill di design principale al posto di Impeccable. È pensata per i siti web, quindi per l'app se ne usano i token (Fraunces + Figtree, angoli arrotondati, avorio e blu notte con un solo accento rosso papavero) e le regole generali. Dove contrasta con la specifica o con le regole di lavoro vincono queste: animazioni con le skill di Emil Kowalski, controlli con Playwright, effetto olografico della carta leggendaria quando si inclina il telefono. Come chiede la specifica, alla direzione C vanno ancora aggiunte la leggera texture di carta, la cornice in foglia d'oro per le rare e l'olografico per la leggendaria. I mockup A e B restano in `docs/mockups/` solo come riferimento.
- **2026-11-07 — dataset più leggero, su richiesta:** obiettivo 300–500 osservazioni per classe invece di 300–800. Le foto "medium" recenti di iNaturalist pesano ~145 KB, non ~60: con 800 il download sarebbe stato ~33 GB, con 500 è ~22 GB (~4,4 ore), ~9 GB su disco dopo la ricompressione a qualità 90. Costo stimato: 1–2 punti di top-1. La selezione a 500 è contenuta in quella a 800: se l'analisi delle confusioni lo chiede, si alza l'obiettivo e si scaricano solo le foto in più. I dati stanno in `C:\Users\jjarb\floradeck\ml\data\`.
- **2026-11-07 — solo piante spontanee e colorate, su richiesta:** tolti gli album *Giardini, parchi e balconi* e *Orto, frutteto ed erbe aromatiche*; borragine e rosmarino passano negli album selvatici. Restano 8 album con 210 specie più la leggendaria, tutte fiori o bacche colorate che si incontrano in passeggiata e in montagna. Le specie tolte restano nei dati come esempi di "altro" (100 foto ciascuna), così l'app risponde "non è nel catalogo" davanti a un glicine o a un pomodoro.
- **2026-11-07 — addestramento su Kaggle invece di Colab:** il dataset (~9 GB) riempirebbe quasi tutto il Google Drive gratuito; Kaggle offre GPU T4 gratis (circa 30 ore a settimana), sessioni fino a 12 ore che continuano a browser chiuso e dataset privati abbastanza grandi. Istruzioni in `ml/kaggle/README.md`.
- **2026-11-08 — tolto il rosmarino, su richiesta:** a colpo d'occhio è un arbusto verde con fiorellini azzurro pallido. Restano 209 specie più la leggendaria (*Macchia mediterranea e coste* ne ha 25). Il modello già addestrato lo conosce ancora: nella fase 7 una classe che non è più nel catalogo vale «non è nel catalogo»; al prossimo `pack` le sue foto diventano «altro».
- **2026-11-08 — album con nome e tavola botanica anche per le specie da trovare, su richiesta:** invece del solo indizio (colore, ambiente, mesi) previsto dalla specifica, ogni casella vuota mostra nome, indizio e una tavola botanica antica di pubblico dominio; le specie senza tavola sicura restano senza disegno e vengono segnalate.
- **2026-11-08 — album per colore e una leggendaria per album, su richiesta:** 6 album (bianchi, gialli, rosa, rossi e arancio, viola e lilla, blu e azzurri) al posto degli 8 per ambiente; una specie con più colori sta in tutti gli album dei suoi colori e una carta la riempie ovunque. Ogni album ha una leggendaria, solo lì: Stella alpina, Scarpetta di Venere, Peonia selvatica, Giaggiolo puzzolente, Fritillaria, Fiordaliso; il livello «rara» non c'è più. Nessun riaddestramento: il modello riconosce specie, non album. Carte eliminabili, foto di riferimento da iNaturalist (CC0/CC BY/CC BY-SA) nella scheda, lucchetto sulle caselle da trovare, animazione dorata per le leggendarie.
- **2026-11-08 — da valutare: riconoscere anche le piante fuori catalogo**, solo per dirne il nome (nessuna carta). Servirebbe un secondo modello con migliaia di specie (es. pesi pubblici legati a PlantNet-300K, oppure un modello «flora d'Italia» addestrato su Kaggle) o un servizio online (Pl@ntNet, solo con rete). Da decidere con la sessione ML.

## Punti aperti

- Regione e zone frequentate, per affinare il catalogo (fase 1).
- Nome utente GitHub (prima del primo push). L'email dei commit resta quella attuale (scelta del 2026-11-07). Il repo sarà leggibile da chiunque, compreso il fatto che l'app è una sorpresa (lo dice `PRODUCT.md`).
- Modelli dei telefoni e versioni di Android/iOS.
- Backend: da decidere nella fase 8, dopo aver ricontrollato i limiti gratuiti.
