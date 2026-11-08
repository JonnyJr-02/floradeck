# Dataset FloraDeck: piano del download (dry run)

Generato il 2026-11-07 alle 11:42:52. Nessuna immagine scaricata: solo metadati (risposte dell'API di iNaturalist, indice di Open Images e richieste HEAD su un campione di foto per stimarne il peso).

## Riepilogo

| | Classi | Osservazioni | Immagini | Download stimato |
|---|---:|---:|---:|---:|
| Catalogo | 261 | 130,264 | 130,352 | 19.3 GB ± 1.5 GB |
| Altro | 1 | 17,873 | 17,873 | 3.0 GB ± 0.2 GB |
| **Totale** | 262 | **148,137** | **148,225** | **22.2 GB ± 1.7 GB** |

- Peso medio di una foto iNaturalist "medium" (500 px sul lato lungo): 148 KB (mediana 141 KB, campione di 150 foto).
- Peso medio di un file Open Images: 304 KB (campione di 40); dopo il ridimensionamento a 500 px occupa molto meno.
- Spazio su disco dopo la ricompressione a qualità 90: circa 8.9 GB (il 40% del download, misurato su un campione di 42 foto).
- Tempo di download al limite di 5 GB/ora: circa 4.4 ore.
- Obiettivo per classe: 300–500 osservazioni, al massimo 20 per osservatore; 1 foto per osservazione (2 nelle classi sotto 300).
- Richieste all'API: 0 in rete, 1,946 dalla cache.

## Da tenere d'occhio

- **1 classe sotto 300 osservazioni** (da accorpare o sostituire, se serve, dopo l'analisi delle confusioni): `crocus-sativus` (272).
- Classi che usano anche foto extra-europee: `camellia` (93), `nelumbo-nucifera` (19), `lagerstroemia-indica` (186), `trachelospermum-jasminoides` (157), `aloe-arborescens` (77), `cyclamen-persicum` (160), `callistemon` (178), `phaseolus-coccineus` (389), `capsicum-annuum` (310), `solanum-melongena` (369), `crocus-sativus` (125).
- Classi coltivate con più di metà delle foto da osservazioni "casual" (piante coltivate, identificazione confermata da almeno un'altra persona salvo dove indicato): `wisteria`, `nerium-oleander`, `bougainvillea`, `pelargonium`, `camellia`, `passiflora-caerulea`, `magnolia`, `trachelospermum-jasminoides`, `strelitzia-reginae`, `euphorbia-pulcherrima`, `callistemon`, `diospyros-kaki`, `citrus`, `crocus-sativus`.
- Sosia `Ornithogalum divergens` escluso da "altro": è già compreso nella classe `ornithogalum-umbellatum`.
- 8 osservazioni compaiono in due classi (la stessa foto in due osservazioni, o un'identificazione cambiata fra due richieste): restano solo nella prima classe, in ordine di catalogo.

## Classi del catalogo

Colonne IT/EU/mondo: osservazioni per provenienza (le query non si sovrappongono). "Annotate": osservazioni con l'annotazione di fioritura/fruttificazione della carta; le altre sono senza annotazione, scattate nei mesi in cui la parte colorata è visibile.

| # | Classe | Oss. | IT | EU | mondo | Annotate | Osservatori | Immagini | MB | Note |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | `bellis-perennis` | 500 | 500 | 0 | 0 | 500 | 339 | 500 | 74 |  |
| 2 | `taraxacum` | 500 | 500 | 0 | 0 | 96 | 337 | 500 | 74 |  |
| 3 | `primula-veris` | 500 | 500 | 0 | 0 | 181 | 280 | 500 | 74 |  |
| 4 | `viola-odorata-gruppo` | 500 | 500 | 0 | 0 | 490 | 251 | 500 | 74 |  |
| 5 | `muscari` | 500 | 500 | 0 | 0 | 280 | 300 | 500 | 74 |  |
| 6 | `myosotis` | 500 | 500 | 0 | 0 | 171 | 232 | 500 | 74 |  |
| 7 | `salvia-pratensis` | 500 | 500 | 0 | 0 | 377 | 320 | 500 | 74 |  |
| 8 | `ajuga-reptans` | 500 | 500 | 0 | 0 | 401 | 295 | 500 | 74 |  |
| 9 | `trifolium-pratense` | 500 | 500 | 0 | 0 | 498 | 299 | 500 | 74 |  |
| 10 | `leucanthemum-vulgare` | 500 | 500 | 0 | 0 | 94 | 227 | 500 | 74 | 65 identificate solo al genere/gruppo |
| 11 | `narcissus-poeticus` | 500 | 500 | 0 | 0 | 185 | 314 | 500 | 74 |  |
| 12 | `ornithogalum-umbellatum` | 500 | 500 | 0 | 0 | 114 | 273 | 500 | 74 |  |
| 13 | `ranunculus-acris-gruppo` | 500 | 500 | 0 | 0 | 108 | 213 | 500 | 74 |  |
| 14 | `ficaria-verna` | 500 | 500 | 0 | 0 | 500 | 303 | 500 | 74 |  |
| 15 | `knautia` | 500 | 500 | 0 | 0 | 127 | 245 | 500 | 74 | 18 identificate solo al genere/gruppo |
| 16 | `lotus-corniculatus` | 500 | 500 | 0 | 0 | 205 | 282 | 500 | 74 |  |
| 17 | `geranium-sanguineum` | 500 | 500 | 0 | 0 | 268 | 278 | 500 | 74 |  |
| 18 | `dianthus-carthusianorum-gruppo` | 500 | 500 | 0 | 0 | 173 | 294 | 500 | 74 |  |
| 19 | `anemone-hortensis` | 500 | 500 | 0 | 0 | 500 | 303 | 500 | 74 |  |
| 20 | `narcissus-tazetta` | 500 | 423 | 77 | 0 | 175 | 325 | 500 | 74 |  |
| 21 | `rhinanthus` | 500 | 500 | 0 | 0 | 141 | 237 | 500 | 74 |  |
| 22 | `anthyllis-vulneraria` | 500 | 500 | 0 | 0 | 500 | 334 | 500 | 74 |  |
| 23 | `fritillaria` | 500 | 105 | 395 | 0 | 430 | 261 | 500 | 74 |  |
| 24 | `trifolium-repens` | 500 | 500 | 0 | 0 | 190 | 288 | 500 | 74 |  |
| 25 | `papaver-rhoeas` | 500 | 500 | 0 | 0 | 347 | 371 | 500 | 74 |  |
| 26 | `centaurea-cyanus` | 500 | 386 | 114 | 0 | 168 | 337 | 500 | 74 |  |
| 27 | `cichorium-intybus` | 500 | 500 | 0 | 0 | 335 | 309 | 500 | 74 |  |
| 28 | `echium-vulgare` | 500 | 500 | 0 | 0 | 357 | 336 | 500 | 74 |  |
| 29 | `convolvulus-arvensis` | 500 | 500 | 0 | 0 | 500 | 368 | 500 | 74 |  |
| 30 | `malva-sylvestris` | 500 | 500 | 0 | 0 | 387 | 329 | 500 | 74 |  |
| 31 | `linaria-vulgaris` | 500 | 500 | 0 | 0 | 352 | 303 | 500 | 74 |  |
| 32 | `verbascum` | 500 | 500 | 0 | 0 | 362 | 297 | 500 | 74 |  |
| 33 | `silene-vulgaris` | 500 | 500 | 0 | 0 | 229 | 356 | 500 | 74 |  |
| 34 | `calendula-arvensis` | 500 | 500 | 0 | 0 | 118 | 301 | 500 | 74 |  |
| 35 | `gladiolus-italicus` | 500 | 500 | 0 | 0 | 101 | 343 | 500 | 74 |  |
| 36 | `hypericum-perforatum` | 500 | 500 | 0 | 0 | 277 | 299 | 500 | 74 |  |
| 37 | `silybum-marianum` | 500 | 500 | 0 | 0 | 469 | 361 | 500 | 74 |  |
| 38 | `nigella-damascena` | 500 | 500 | 0 | 0 | 104 | 346 | 500 | 74 |  |
| 39 | `leopoldia-comosa` | 500 | 500 | 0 | 0 | 500 | 387 | 500 | 74 |  |
| 40 | `lamium-purpureum` | 500 | 500 | 0 | 0 | 500 | 303 | 500 | 74 |  |
| 41 | `dipsacus-fullonum` | 500 | 500 | 0 | 0 | 74 | 290 | 500 | 74 |  |
| 42 | `daucus-carota` | 500 | 500 | 0 | 0 | 217 | 322 | 500 | 74 |  |
| 43 | `oenothera` | 500 | 406 | 94 | 0 | 192 | 298 | 500 | 74 | 145 identificate solo al genere/gruppo |
| 44 | `cymbalaria-muralis` | 500 | 500 | 0 | 0 | 411 | 336 | 500 | 74 |  |
| 45 | `antirrhinum-majus` | 500 | 295 | 205 | 0 | 275 | 365 | 500 | 74 |  |
| 46 | `lathyrus-latifolius` | 500 | 500 | 0 | 0 | 109 | 312 | 500 | 74 |  |
| 47 | `tragopogon-porrifolius` | 500 | 173 | 327 | 0 | 315 | 364 | 500 | 74 |  |
| 48 | `legousia-speculum-veneris` | 500 | 255 | 245 | 0 | 167 | 324 | 500 | 74 |  |
| 49 | `glebionis-coronaria` | 500 | 216 | 284 | 0 | 321 | 320 | 500 | 74 |  |
| 50 | `saponaria-officinalis` | 500 | 500 | 0 | 0 | 183 | 307 | 500 | 74 |  |
| 51 | `anchusa-azurea` | 500 | 212 | 288 | 0 | 327 | 297 | 500 | 74 |  |
| 52 | `tulipa-sylvestris` | 500 | 362 | 138 | 0 | 437 | 271 | 500 | 74 |  |
| 53 | `foeniculum-vulgare` | 500 | 500 | 0 | 0 | 44 | 345 | 500 | 74 |  |
| 54 | `leontopodium-nivale` | 500 | 500 | 0 | 0 | 217 | 336 | 500 | 74 |  |
| 55 | `gentiana-acaulis-gruppo` | 499 | 499 | 0 | 0 | 224 | 281 | 499 | 74 | 1 già usate da un'altra classe (foto o osservazione condivisa) |
| 56 | `gentiana-lutea` | 500 | 438 | 62 | 0 | 98 | 335 | 500 | 74 |  |
| 57 | `trollius-europaeus` | 500 | 500 | 0 | 0 | 171 | 364 | 500 | 74 |  |
| 58 | `arnica-montana` | 500 | 500 | 0 | 0 | 114 | 302 | 500 | 74 |  |
| 59 | `crocus-vernus` | 500 | 500 | 0 | 0 | 365 | 302 | 500 | 74 |  |
| 60 | `soldanella` | 498 | 498 | 0 | 0 | 137 | 293 | 498 | 74 | 2 già usate da un'altra classe (foto o osservazione condivisa) |
| 61 | `rhododendron-alpino` | 500 | 500 | 0 | 0 | 260 | 320 | 500 | 74 |  |
| 62 | `pulsatilla-alpina` | 500 | 500 | 0 | 0 | 339 | 313 | 500 | 74 |  |
| 63 | `lilium-martagon` | 500 | 500 | 0 | 0 | 276 | 325 | 500 | 74 |  |
| 64 | `aster-alpinus` | 500 | 500 | 0 | 0 | 213 | 327 | 500 | 74 |  |
| 65 | `paradisea-liliastrum` | 500 | 467 | 33 | 0 | 101 | 296 | 500 | 74 |  |
| 66 | `campanula-barbata` | 500 | 500 | 0 | 0 | 305 | 328 | 500 | 74 |  |
| 67 | `gentiana-verna` | 500 | 500 | 0 | 0 | 347 | 333 | 500 | 74 |  |
| 68 | `viola-calcarata` | 500 | 189 | 311 | 0 | 413 | 282 | 500 | 74 |  |
| 69 | `silene-acaulis` | 500 | 500 | 0 | 0 | 256 | 309 | 500 | 74 |  |
| 70 | `dryas-octopetala` | 500 | 500 | 0 | 0 | 186 | 350 | 500 | 74 |  |
| 71 | `ranunculus-glacialis` | 500 | 456 | 44 | 0 | 118 | 271 | 500 | 74 |  |
| 72 | `saxifraga-oppositifolia` | 500 | 409 | 91 | 0 | 220 | 276 | 500 | 74 |  |
| 73 | `primula-auricula` | 499 | 291 | 208 | 0 | 291 | 297 | 499 | 74 | 1 già usate da un'altra classe (foto o osservazione condivisa) |
| 74 | `linaria-alpina` | 500 | 500 | 0 | 0 | 108 | 332 | 500 | 74 |  |
| 75 | `aconitum-napellus` | 500 | 288 | 212 | 0 | 293 | 338 | 500 | 74 |  |
| 76 | `astrantia-major` | 500 | 500 | 0 | 0 | 123 | 309 | 500 | 74 |  |
| 77 | `phyteuma` | 500 | 500 | 0 | 0 | 420 | 264 | 500 | 74 |  |
| 78 | `lilium-bulbiferum` | 500 | 500 | 0 | 0 | 227 | 362 | 500 | 74 |  |
| 79 | `bistorta-officinalis` | 500 | 500 | 0 | 0 | 123 | 338 | 500 | 74 |  |
| 80 | `chamaenerion-angustifolium` | 500 | 500 | 0 | 0 | 500 | 364 | 500 | 74 |  |
| 81 | `pinguicula` | 500 | 500 | 0 | 0 | 210 | 281 | 500 | 74 |  |
| 82 | `centaurea-montana-gruppo` | 500 | 500 | 0 | 0 | 132 | 248 | 500 | 74 |  |
| 83 | `sempervivum` | 500 | 500 | 0 | 0 | 200 | 287 | 500 | 74 |  |
| 84 | `cistus-creticus` | 500 | 500 | 0 | 0 | 118 | 368 | 500 | 74 |  |
| 85 | `myrtus-communis` | 500 | 434 | 66 | 0 | 328 | 374 | 500 | 74 |  |
| 86 | `lavandula-stoechas` | 500 | 331 | 169 | 0 | 206 | 319 | 500 | 74 |  |
| 87 | `spartium-junceum` | 500 | 500 | 0 | 0 | 181 | 382 | 500 | 74 |  |
| 88 | `asphodelus` | 500 | 500 | 0 | 0 | 164 | 317 | 500 | 74 |  |
| 89 | `centranthus-ruber` | 500 | 500 | 0 | 0 | 286 | 372 | 500 | 74 |  |
| 90 | `capparis-spinosa` | 500 | 436 | 64 | 0 | 174 | 376 | 500 | 74 |  |
| 91 | `carpobrotus` | 500 | 415 | 85 | 0 | 163 | 356 | 500 | 74 | 32 identificate solo al genere/gruppo |
| 92 | `glaucium-flavum` | 500 | 500 | 0 | 0 | 65 | 366 | 500 | 74 |  |
| 93 | `calystegia-soldanella` | 500 | 252 | 248 | 0 | 289 | 404 | 500 | 74 |  |
| 94 | `eryngium-maritimum` | 500 | 500 | 0 | 0 | 36 | 374 | 500 | 74 |  |
| 95 | `pancratium-maritimum` | 500 | 500 | 0 | 0 | 386 | 413 | 500 | 74 |  |
| 96 | `cistus-salviifolius` | 500 | 500 | 0 | 0 | 124 | 346 | 500 | 74 |  |
| 97 | `opuntia-ficus-indica` | 500 | 265 | 235 | 0 | 261 | 398 | 500 | 74 |  |
| 98 | `phlomis-fruticosa` | 500 | 178 | 322 | 0 | 88 | 366 | 500 | 74 |  |
| 99 | `anemone-coronaria` | 500 | 236 | 264 | 0 | 344 | 320 | 500 | 74 |  |
| 100 | `erica-arborea` | 500 | 500 | 0 | 0 | 73 | 322 | 500 | 74 |  |
| 101 | `achillea-maritima` | 500 | 208 | 292 | 0 | 131 | 356 | 500 | 74 |  |
| 102 | `cakile-maritima` | 500 | 500 | 0 | 0 | 160 | 312 | 500 | 74 |  |
| 103 | `limonium` | 500 | 432 | 68 | 0 | 155 | 297 | 500 | 74 | 82 identificate solo al genere/gruppo |
| 104 | `matthiola` | 500 | 360 | 140 | 0 | 217 | 338 | 500 | 74 | 30 identificate solo al genere/gruppo |
| 105 | `helichrysum` | 500 | 414 | 86 | 0 | 177 | 309 | 500 | 74 |  |
| 106 | `teucrium-fruticans` | 500 | 280 | 220 | 0 | 130 | 389 | 500 | 74 |  |
| 107 | `tamarix` | 500 | 98 | 402 | 0 | 103 | 368 | 500 | 74 | 60 identificate solo al genere/gruppo |
| 108 | `vitex-agnus-castus` | 500 | 168 | 332 | 0 | 207 | 401 | 500 | 74 |  |
| 109 | `anemone-nemorosa` | 500 | 500 | 0 | 0 | 269 | 284 | 500 | 74 |  |
| 110 | `hepatica-nobilis` | 500 | 500 | 0 | 0 | 419 | 299 | 500 | 74 |  |
| 111 | `primula-vulgaris` | 499 | 499 | 0 | 0 | 499 | 275 | 499 | 74 | 1 già usate da un'altra classe (foto o osservazione condivisa) |
| 112 | `galanthus-nivalis` | 500 | 500 | 0 | 0 | 299 | 261 | 500 | 74 |  |
| 113 | `erythronium-dens-canis` | 499 | 499 | 0 | 0 | 160 | 269 | 499 | 74 | 1 già usate da un'altra classe (foto o osservazione condivisa) |
| 114 | `pulmonaria` | 500 | 500 | 0 | 0 | 154 | 253 | 500 | 74 |  |
| 115 | `scilla-bifolia` | 499 | 499 | 0 | 0 | 499 | 302 | 499 | 74 | 1 già usate da un'altra classe (foto o osservazione condivisa) |
| 116 | `vinca-minor` | 500 | 500 | 0 | 0 | 497 | 264 | 500 | 74 |  |
| 117 | `cyclamen` | 500 | 500 | 0 | 0 | 500 | 337 | 500 | 74 |  |
| 118 | `helleborus-niger` | 500 | 500 | 0 | 0 | 122 | 224 | 500 | 74 |  |
| 119 | `aquilegia` | 500 | 500 | 0 | 0 | 372 | 314 | 500 | 74 |  |
| 120 | `paeonia-officinalis` | 500 | 417 | 83 | 0 | 169 | 285 | 500 | 74 |  |
| 121 | `daphne-mezereum` | 500 | 500 | 0 | 0 | 132 | 288 | 500 | 74 |  |
| 122 | `convallaria-majalis` | 500 | 462 | 38 | 0 | 146 | 285 | 500 | 74 |  |
| 123 | `lathyrus-vernus` | 500 | 500 | 0 | 0 | 142 | 276 | 500 | 74 |  |
| 124 | `anemone-ranunculoides` | 500 | 500 | 0 | 0 | 61 | 237 | 500 | 74 |  |
| 125 | `corydalis` | 500 | 500 | 0 | 0 | 182 | 283 | 500 | 74 |  |
| 126 | `oxalis-acetosella` | 500 | 500 | 0 | 0 | 87 | 285 | 500 | 74 |  |
| 127 | `geranium-robertianum` | 500 | 500 | 0 | 0 | 396 | 292 | 500 | 74 |  |
| 128 | `melittis-melissophyllum` | 500 | 500 | 0 | 0 | 288 | 301 | 500 | 74 |  |
| 129 | `digitalis` | 500 | 500 | 0 | 0 | 276 | 288 | 500 | 74 |  |
| 130 | `lonicera-caprifogli` | 500 | 500 | 0 | 0 | 279 | 337 | 500 | 74 |  |
| 131 | `clematis-vitalba` | 500 | 500 | 0 | 0 | 193 | 315 | 500 | 74 |  |
| 132 | `sambucus-nigra` | 500 | 500 | 0 | 0 | 175 | 329 | 500 | 74 |  |
| 133 | `calluna-vulgaris` | 500 | 500 | 0 | 0 | 94 | 302 | 500 | 74 |  |
| 134 | `erica-carnea` | 500 | 500 | 0 | 0 | 215 | 286 | 500 | 74 |  |
| 135 | `iris-pseudacorus` | 500 | 500 | 0 | 0 | 140 | 310 | 500 | 74 |  |
| 136 | `lythrum-salicaria` | 500 | 500 | 0 | 0 | 263 | 291 | 500 | 74 |  |
| 137 | `caltha-palustris` | 500 | 500 | 0 | 0 | 231 | 316 | 500 | 74 |  |
| 138 | `nuphar-lutea` | 500 | 276 | 224 | 0 | 253 | 314 | 500 | 74 |  |
| 139 | `nymphaea` | 500 | 281 | 219 | 0 | 285 | 329 | 500 | 74 | 65 casual coltivate; 22 identificate solo al genere/gruppo |
| 140 | `epilobium-hirsutum` | 500 | 500 | 0 | 0 | 111 | 224 | 500 | 74 |  |
| 141 | `lysimachia-vulgaris` | 500 | 440 | 60 | 0 | 116 | 239 | 500 | 74 |  |
| 142 | `symphytum-officinale` | 500 | 416 | 84 | 0 | 193 | 274 | 500 | 74 |  |
| 143 | `impatiens-glandulifera` | 500 | 500 | 0 | 0 | 90 | 317 | 500 | 74 |  |
| 144 | `menyanthes-trifoliata` | 500 | 135 | 365 | 0 | 400 | 359 | 500 | 74 |  |
| 145 | `butomus-umbellatus` | 500 | 168 | 332 | 0 | 361 | 289 | 500 | 74 |  |
| 146 | `leucojum-aestivum` | 500 | 142 | 358 | 0 | 259 | 332 | 500 | 74 |  |
| 147 | `calystegia-sepium` | 500 | 459 | 41 | 0 | 156 | 272 | 500 | 74 |  |
| 148 | `lychnis-flos-cuculi` | 500 | 500 | 0 | 0 | 190 | 346 | 500 | 74 |  |
| 149 | `eupatorium-cannabinum` | 500 | 500 | 0 | 0 | 148 | 264 | 500 | 74 |  |
| 150 | `filipendula-ulmaria` | 500 | 220 | 280 | 0 | 337 | 330 | 500 | 74 |  |
| 151 | `ranunculus-acquatici` | 500 | 99 | 401 | 0 | 170 | 391 | 500 | 74 |  |
| 152 | `persicaria-amphibia` | 500 | 97 | 403 | 0 | 419 | 317 | 500 | 74 |  |
| 153 | `parnassia-palustris` | 500 | 500 | 0 | 0 | 479 | 352 | 500 | 74 |  |
| 154 | `impatiens-noli-tangere` | 500 | 181 | 319 | 0 | 347 | 346 | 500 | 74 |  |
| 155 | `mentha-aquatica` | 500 | 241 | 259 | 0 | 304 | 286 | 500 | 74 |  |
| 156 | `hydrangea-macrophylla` | 500 | 58 | 442 | 0 | 73 | 395 | 500 | 74 | 53 casual coltivate |
| 157 | `wisteria` | 500 | 101 | 399 | 0 | 173 | 472 | 500 | 74 | 318 casual coltivate; 32 identificate solo al genere/gruppo |
| 158 | `nerium-oleander` | 500 | 500 | 0 | 0 | 88 | 390 | 500 | 74 | 293 casual coltivate |
| 159 | `bougainvillea` | 500 | 67 | 433 | 0 | 59 | 441 | 500 | 74 | 446 casual coltivate; 36 identificate solo al genere/gruppo |
| 160 | `pelargonium` | 500 | 166 | 334 | 0 | 321 | 427 | 500 | 74 | 397 casual coltivate; 36 identificate solo al genere/gruppo |
| 161 | `camellia` | 500 | 32 | 375 | 93 | 166 | 442 | 500 | 74 | foto extra-europee; 388 casual coltivate; 4 identificate solo al genere/gruppo |
| 162 | `syringa-vulgaris` | 500 | 83 | 417 | 0 | 412 | 396 | 500 | 74 | 56 casual coltivate |
| 163 | `cercis-siliquastrum` | 500 | 228 | 272 | 0 | 248 | 416 | 500 | 74 | 86 casual coltivate |
| 164 | `passiflora-caerulea` | 500 | 370 | 130 | 0 | 120 | 459 | 500 | 74 | 299 casual coltivate |
| 165 | `agapanthus` | 500 | 28 | 472 | 0 | 65 | 434 | 500 | 74 | 224 casual coltivate; 118 identificate solo al genere/gruppo |
| 166 | `jasminum-nudiflorum` | 500 | 60 | 440 | 0 | 157 | 425 | 500 | 74 | 100 casual coltivate |
| 167 | `nelumbo-nucifera` | 500 | 70 | 411 | 19 | 66 | 334 | 500 | 74 | foto extra-europee; 88 casual coltivate |
| 168 | `lagerstroemia-indica` | 500 | 59 | 255 | 186 | 219 | 434 | 500 | 74 | foto extra-europee; 234 casual coltivate |
| 169 | `hibiscus` | 500 | 216 | 284 | 0 | 143 | 425 | 500 | 74 | 177 casual coltivate |
| 170 | `tulipa-gesneriana` | 500 | 44 | 456 | 0 | 320 | 351 | 500 | 74 | 40 casual coltivate |
| 171 | `hyacinthus-orientalis` | 500 | 118 | 382 | 0 | 185 | 435 | 500 | 74 | 44 casual coltivate |
| 172 | `magnolia` | 500 | 109 | 391 | 0 | 253 | 450 | 500 | 74 | 499 casual coltivate |
| 173 | `lantana-camara` | 500 | 94 | 406 | 0 | 165 | 399 | 500 | 74 | 75 casual coltivate |
| 174 | `petunia` | 500 | 147 | 353 | 0 | 64 | 339 | 500 | 74 | 125 casual coltivate; 8 identificate solo al genere/gruppo |
| 175 | `trachelospermum-jasminoides` | 500 | 94 | 249 | 157 | 123 | 456 | 500 | 74 | foto extra-europee; 343 casual coltivate |
| 176 | `forsythia` | 500 | 66 | 434 | 0 | 198 | 397 | 500 | 74 | 50 casual coltivate; 94 identificate solo al genere/gruppo |
| 177 | `strelitzia-reginae` | 500 | 111 | 389 | 0 | 71 | 454 | 500 | 74 | 495 casual coltivate |
| 178 | `aloe-arborescens` | 500 | 29 | 394 | 77 | 99 | 430 | 500 | 74 | foto extra-europee; 143 casual coltivate |
| 179 | `hemerocallis-fulva` | 500 | 286 | 214 | 0 | 181 | 379 | 500 | 74 | 28 casual coltivate |
| 180 | `iris-germanica` | 500 | 319 | 181 | 0 | 250 | 394 | 500 | 74 | 51 casual coltivate |
| 181 | `viola-wittrockiana` | 500 | 114 | 386 | 0 | 491 | 364 | 500 | 74 | 106 casual coltivate |
| 182 | `cyclamen-persicum` | 500 | 55 | 285 | 160 | 200 | 390 | 500 | 74 | foto extra-europee; 245 casual coltivate |
| 183 | `euphorbia-pulcherrima` | 500 | 67 | 433 | 0 | 13 | 462 | 500 | 74 | 495 casual coltivate |
| 184 | `callistemon` | 500 | 30 | 292 | 178 | 243 | 435 | 500 | 74 | foto extra-europee; 314 casual coltivate |
| 185 | `buddleja-davidii` | 500 | 500 | 0 | 0 | 147 | 333 | 500 | 74 |  |
| 186 | `rosa-canina` | 500 | 162 | 338 | 0 | 378 | 342 | 500 | 74 |  |
| 187 | `crataegus-monogyna` | 500 | 500 | 0 | 0 | 103 | 269 | 500 | 74 |  |
| 188 | `pyracantha` | 500 | 221 | 279 | 0 | 223 | 408 | 500 | 74 | 74 casual coltivate; 30 identificate solo al genere/gruppo |
| 189 | `euonymus-europaeus` | 500 | 500 | 0 | 0 | 189 | 328 | 500 | 74 |  |
| 190 | `ruscus-aculeatus` | 500 | 500 | 0 | 0 | 274 | 333 | 500 | 74 |  |
| 191 | `arbutus-unedo` | 500 | 500 | 0 | 0 | 206 | 402 | 500 | 74 |  |
| 192 | `physalis-alkekengi` | 500 | 206 | 294 | 0 | 331 | 344 | 500 | 74 |  |
| 193 | `viburnum-opulus` | 500 | 266 | 234 | 0 | 267 | 339 | 500 | 74 |  |
| 194 | `arum-italicum` | 500 | 220 | 280 | 0 | 339 | 412 | 500 | 74 |  |
| 195 | `sorbus-aucuparia` | 500 | 500 | 0 | 0 | 89 | 322 | 500 | 74 |  |
| 196 | `ilex-aquifolium` | 500 | 500 | 0 | 0 | 57 | 249 | 500 | 74 |  |
| 197 | `iris-foetidissima` | 500 | 129 | 371 | 0 | 343 | 318 | 500 | 74 |  |
| 198 | `cornus-mas` | 500 | 204 | 296 | 0 | 364 | 415 | 500 | 74 |  |
| 199 | `smilax-aspera` | 500 | 500 | 0 | 0 | 90 | 342 | 500 | 74 |  |
| 200 | `solanum-dulcamara` | 500 | 500 | 0 | 0 | 62 | 300 | 500 | 74 |  |
| 201 | `prunus-spinosa` | 500 | 500 | 0 | 0 | 249 | 338 | 500 | 74 |  |
| 202 | `phytolacca-americana` | 500 | 500 | 0 | 0 | 283 | 325 | 500 | 74 |  |
| 203 | `berberis-vulgaris` | 500 | 162 | 338 | 0 | 386 | 343 | 500 | 74 |  |
| 204 | `hippophae-rhamnoides` | 500 | 114 | 386 | 0 | 396 | 339 | 500 | 74 |  |
| 205 | `vaccinium-myrtillus` | 500 | 379 | 121 | 0 | 198 | 330 | 500 | 74 |  |
| 206 | `vaccinium-vitis-idaea` | 499 | 352 | 147 | 0 | 199 | 354 | 499 | 74 | 1 già usate da un'altra classe (foto o osservazione condivisa) |
| 207 | `fragaria-vesca` | 500 | 500 | 0 | 0 | 72 | 262 | 500 | 74 |  |
| 208 | `rubus` | 500 | 278 | 222 | 0 | 322 | 325 | 500 | 74 |  |
| 209 | `taxus-baccata` | 500 | 497 | 3 | 0 | 0 | 293 | 500 | 74 |  |
| 210 | `cotoneaster` | 500 | 113 | 387 | 0 | 380 | 334 | 500 | 74 | 32 casual coltivate; 10 identificate solo al genere/gruppo |
| 211 | `colchicum-autumnale` | 500 | 500 | 0 | 0 | 363 | 314 | 500 | 74 |  |
| 212 | `sternbergia-lutea` | 500 | 396 | 104 | 0 | 250 | 379 | 500 | 74 |  |
| 213 | `symphyotrichum` | 500 | 87 | 413 | 0 | 258 | 313 | 500 | 74 |  |
| 214 | `solidago` | 500 | 500 | 0 | 0 | 204 | 259 | 500 | 74 |  |
| 215 | `anacamptis-morio` | 500 | 500 | 0 | 0 | 500 | 252 | 500 | 74 |  |
| 216 | `anacamptis-pyramidalis` | 500 | 500 | 0 | 0 | 460 | 293 | 500 | 74 |  |
| 217 | `anacamptis-papilionacea` | 500 | 500 | 0 | 0 | 282 | 244 | 500 | 74 |  |
| 218 | `orchis-purpurea` | 500 | 500 | 0 | 0 | 500 | 293 | 500 | 74 |  |
| 219 | `orchis-simia` | 500 | 500 | 0 | 0 | 88 | 250 | 500 | 74 |  |
| 220 | `orchis-italica` | 500 | 500 | 0 | 0 | 154 | 250 | 500 | 74 |  |
| 221 | `orchis-mascula` | 500 | 500 | 0 | 0 | 240 | 258 | 500 | 74 |  |
| 222 | `neotinea-tridentata` | 500 | 500 | 0 | 0 | 308 | 278 | 500 | 74 |  |
| 223 | `himantoglossum-robertianum` | 500 | 500 | 0 | 0 | 131 | 254 | 500 | 74 |  |
| 224 | `ophrys-apifera` | 500 | 500 | 0 | 0 | 195 | 297 | 500 | 74 |  |
| 225 | `ophrys-bertolonii` | 500 | 500 | 0 | 0 | 379 | 226 | 500 | 74 |  |
| 226 | `ophrys-lutea-gruppo` | 500 | 500 | 0 | 0 | 169 | 167 | 500 | 74 |  |
| 227 | `ophrys-fuciflora-gruppo` | 500 | 500 | 0 | 0 | 284 | 215 | 500 | 74 |  |
| 228 | `ophrys-tenthredinifera` | 500 | 500 | 0 | 0 | 122 | 169 | 500 | 74 |  |
| 229 | `serapias` | 500 | 500 | 0 | 0 | 252 | 227 | 500 | 74 |  |
| 230 | `cephalanthera-bianche` | 500 | 500 | 0 | 0 | 500 | 255 | 500 | 74 |  |
| 231 | `cephalanthera-rubra` | 500 | 496 | 4 | 0 | 161 | 257 | 500 | 74 |  |
| 232 | `dactylorhiza-sambucina` | 500 | 500 | 0 | 0 | 384 | 242 | 500 | 74 |  |
| 233 | `dactylorhiza-maculata-gruppo` | 500 | 500 | 0 | 0 | 404 | 271 | 500 | 74 |  |
| 234 | `gymnadenia-conopsea` | 500 | 500 | 0 | 0 | 260 | 274 | 500 | 74 |  |
| 235 | `nigritella` | 500 | 500 | 0 | 0 | 93 | 263 | 500 | 74 |  |
| 236 | `limodorum-abortivum` | 500 | 500 | 0 | 0 | 98 | 304 | 500 | 74 |  |
| 237 | `platanthera` | 500 | 500 | 0 | 0 | 153 | 276 | 500 | 74 |  |
| 238 | `traunsteinera-globosa` | 500 | 475 | 25 | 0 | 69 | 217 | 500 | 74 |  |
| 239 | `borago-officinalis` | 500 | 500 | 0 | 0 | 304 | 351 | 500 | 74 |  |
| 240 | `tropaeolum-majus` | 500 | 147 | 353 | 0 | 359 | 367 | 500 | 74 | 23 casual coltivate |
| 241 | `cucurbita` | 500 | 32 | 468 | 0 | 31 | 323 | 500 | 74 | 16 casual coltivate |
| 242 | `phaseolus-coccineus` | 500 | 1 | 110 | 389 | 126 | 373 | 500 | 74 | foto extra-europee; 45 casual coltivate |
| 243 | `cynara-cardunculus` | 500 | 187 | 313 | 0 | 160 | 379 | 500 | 74 | 37 casual coltivate |
| 244 | `allium-schoenoprasum` | 500 | 212 | 288 | 0 | 324 | 377 | 500 | 74 | 30 casual coltivate |
| 245 | `salvia-officinalis` | 500 | 137 | 363 | 0 | 108 | 395 | 500 | 74 | 90 casual coltivate |
| 246 | `salvia-rosmarinus` | 500 | 500 | 0 | 0 | 93 | 346 | 500 | 74 | 57 casual coltivate |
| 247 | `lavandula-giardino` | 500 | 77 | 423 | 0 | 86 | 333 | 500 | 74 | 26 casual coltivate |
| 248 | `calendula-officinalis` | 500 | 106 | 394 | 0 | 426 | 374 | 500 | 74 | 25 casual coltivate |
| 249 | `punica-granatum` | 500 | 150 | 350 | 0 | 272 | 413 | 500 | 74 | 122 casual coltivate |
| 250 | `diospyros-kaki` | 500 | 205 | 295 | 0 | 428 | 433 | 500 | 74 | 470 casual coltivate |
| 251 | `citrus` | 500 | 277 | 223 | 0 | 248 | 440 | 500 | 74 | 384 casual coltivate; 28 identificate solo al genere/gruppo |
| 252 | `prunus-dulcis` | 500 | 53 | 447 | 0 | 396 | 296 | 500 | 74 | 31 casual coltivate |
| 253 | `cydonia-oblonga` | 500 | 46 | 454 | 0 | 139 | 431 | 500 | 74 | 37 casual coltivate |
| 254 | `vitis-vinifera` | 500 | 72 | 428 | 0 | 113 | 395 | 500 | 74 | 31 casual coltivate |
| 255 | `solanum-lycopersicum` | 500 | 162 | 338 | 0 | 190 | 318 | 500 | 74 | 23 casual coltivate |
| 256 | `capsicum-annuum` | 500 | 18 | 172 | 310 | 328 | 400 | 500 | 74 | foto extra-europee; 159 casual coltivate |
| 257 | `solanum-melongena` | 500 | 4 | 127 | 369 | 50 | 450 | 500 | 74 | foto extra-europee; 110 casual coltivate |
| 258 | `helianthus-annuus` | 500 | 99 | 401 | 0 | 255 | 377 | 500 | 74 | 45 casual coltivate |
| 259 | `phacelia-tanacetifolia` | 500 | 152 | 348 | 0 | 388 | 404 | 500 | 74 | 11 casual coltivate |
| 260 | `crocus-sativus` | 272 | 13 | 134 | 125 | 31 | 241 | 360 | 53 | sotto 300; foto extra-europee; 35 senza conferma della comunità; 223 casual coltivate |
| 261 | `cypripedium-calceolus` | 500 | 213 | 287 | 0 | 353 | 327 | 500 | 74 |  |

## Classe "altro"

| Parte | Origine | Licenza | Gruppi | Osservazioni | Immagini | MB |
|---|---|---|---:|---:|---:|---:|
| Sosia fuori catalogo | iNaturalist, research grade; Italia → Europa → mondo; prima le foto annotate in fiore/frutto | CC0, CC BY o CC BY-NC (scelta dell'autore, foto per foto) | 64 | 6,376 | 6,376 | 942 |
| Piante comuni in Italia | iNaturalist, specie vascolari più osservate in Italia (research grade) fuori dal catalogo | CC0, CC BY o CC BY-NC (scelta dell'autore, foto per foto) | 300 | 5,998 | 5,998 | 886 |
| Specie del catalogo senza fiori né frutti | iNaturalist, specie del catalogo con l'annotazione "No Flowers or Fruits" | CC0, CC BY o CC BY-NC (scelta dell'autore, foto per foto) | 1 | 1,999 | 1,999 | 295 |
| Non piante (iNaturalist) | iNaturalist: funghi, uccelli, mammiferi, rettili, anfibi, molluschi (niente insetti e ragni) | CC0, CC BY o CC BY-NC (scelta dell'autore, foto per foto) | 6 | 1,500 | 1,500 | 222 |
| Scene senza piante (Open Images) | Open Images V7, validation: immagini senza etichette di piante | CC BY 2.0 (foto Flickr); etichette CC BY 4.0 (Google) | 1 | 2,000 | 2,000 | 609 |

L'elenco completo delle fonti di "altro" è in `ml/reports/altro-sources.md`.
