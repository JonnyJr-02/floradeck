# Dataset FloraDeck: piano del download (dry run)

Generato il 2026-11-07 alle 11:19:09. Nessuna immagine scaricata: solo metadati (risposte dell'API di iNaturalist, indice di Open Images e richieste HEAD su un campione di foto per stimarne il peso).

## Riepilogo

| | Classi | Osservazioni | Immagini | Download stimato |
|---|---:|---:|---:|---:|
| Catalogo | 261 | 208,262 | 208,350 | 30.0 GB ± 2.2 GB |
| Altro | 1 | 17,873 | 17,873 | 2.9 GB ± 0.2 GB |
| **Totale** | 262 | **226,135** | **226,223** | **32.9 GB ± 2.4 GB** |

- Peso medio di una foto iNaturalist "medium" (500 px sul lato lungo): 144 KB (mediana 135 KB, campione di 150 foto).
- Peso medio di un file Open Images: 304 KB (campione di 40); dopo il ridimensionamento a 500 px occupa molto meno.
- Spazio su disco dopo la ricompressione a qualità 90: circa 13.1 GB (il 40% del download, misurato su un campione di 42 foto).
- Tempo di download al limite di 5 GB/ora: circa 6.6 ore, in 2 giorni al limite di 24 GB/giorno.
- Obiettivo per classe: 300–800 osservazioni, al massimo 20 per osservatore; 1 foto per osservazione (2 nelle classi sotto 300).
- Richieste all'API: 0 in rete, 2,418 dalla cache.

## Da tenere d'occhio

- **1 classe sotto 300 osservazioni** (da accorpare o sostituire, se serve, dopo l'analisi delle confusioni): `crocus-sativus` (272).
- Classi che usano anche foto extra-europee: `phlomis-fruticosa` (28), `bougainvillea` (135), `camellia` (393), `agapanthus` (166), `jasminum-nudiflorum` (110), `nelumbo-nucifera` (319), `lagerstroemia-indica` (486), `trachelospermum-jasminoides` (457), `strelitzia-reginae` (105), `aloe-arborescens` (377), `cyclamen-persicum` (460), `euphorbia-pulcherrima` (199), `callistemon` (478), `phaseolus-coccineus` (689), `diospyros-kaki` (98), `capsicum-annuum` (610), `solanum-melongena` (669), `crocus-sativus` (125).
- Classi coltivate con più di metà delle foto da osservazioni "casual" (piante coltivate, identificazione confermata da almeno un'altra persona salvo dove indicato): `wisteria`, `nerium-oleander`, `bougainvillea`, `pelargonium`, `passiflora-caerulea`, `magnolia`, `strelitzia-reginae`, `euphorbia-pulcherrima`, `diospyros-kaki`, `citrus`, `crocus-sativus`.
- Sosia `Ornithogalum divergens` escluso da "altro": è già compreso nella classe `ornithogalum-umbellatum`.
- 10 osservazioni compaiono in due classi (la stessa foto in due osservazioni, o un'identificazione cambiata fra due richieste): restano solo nella prima classe, in ordine di catalogo.

## Classi del catalogo

Colonne IT/EU/mondo: osservazioni per provenienza (le query non si sovrappongono). "Annotate": osservazioni con l'annotazione di fioritura/fruttificazione della carta; le altre sono senza annotazione, scattate nei mesi in cui la parte colorata è visibile.

| # | Classe | Oss. | IT | EU | mondo | Annotate | Osservatori | Immagini | MB | Note |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | `bellis-perennis` | 800 | 800 | 0 | 0 | 706 | 478 | 800 | 115 |  |
| 2 | `taraxacum` | 800 | 800 | 0 | 0 | 270 | 526 | 800 | 115 | 174 identificate solo al genere/gruppo |
| 3 | `primula-veris` | 800 | 800 | 0 | 0 | 181 | 410 | 800 | 115 |  |
| 4 | `viola-odorata-gruppo` | 800 | 800 | 0 | 0 | 490 | 359 | 800 | 115 |  |
| 5 | `muscari` | 800 | 800 | 0 | 0 | 280 | 429 | 800 | 115 |  |
| 6 | `myosotis` | 800 | 800 | 0 | 0 | 171 | 375 | 800 | 115 |  |
| 7 | `salvia-pratensis` | 800 | 800 | 0 | 0 | 377 | 490 | 800 | 115 |  |
| 8 | `ajuga-reptans` | 800 | 800 | 0 | 0 | 401 | 459 | 800 | 115 |  |
| 9 | `trifolium-pratense` | 800 | 800 | 0 | 0 | 498 | 473 | 800 | 115 |  |
| 10 | `leucanthemum-vulgare` | 800 | 568 | 232 | 0 | 326 | 402 | 800 | 115 | 133 identificate solo al genere/gruppo |
| 11 | `narcissus-poeticus` | 800 | 800 | 0 | 0 | 185 | 445 | 800 | 115 |  |
| 12 | `ornithogalum-umbellatum` | 800 | 531 | 269 | 0 | 383 | 527 | 800 | 115 |  |
| 13 | `ranunculus-acris-gruppo` | 800 | 754 | 46 | 0 | 154 | 365 | 800 | 115 |  |
| 14 | `ficaria-verna` | 800 | 800 | 0 | 0 | 800 | 454 | 800 | 115 |  |
| 15 | `knautia` | 800 | 714 | 86 | 0 | 244 | 418 | 800 | 115 | 232 identificate solo al genere/gruppo |
| 16 | `lotus-corniculatus` | 800 | 800 | 0 | 0 | 205 | 400 | 800 | 115 |  |
| 17 | `geranium-sanguineum` | 800 | 800 | 0 | 0 | 268 | 422 | 800 | 115 |  |
| 18 | `dianthus-carthusianorum-gruppo` | 800 | 800 | 0 | 0 | 173 | 432 | 800 | 115 |  |
| 19 | `anemone-hortensis` | 800 | 800 | 0 | 0 | 502 | 460 | 800 | 115 |  |
| 20 | `narcissus-tazetta` | 800 | 423 | 377 | 0 | 340 | 526 | 800 | 115 |  |
| 21 | `rhinanthus` | 800 | 775 | 25 | 0 | 181 | 383 | 800 | 115 | 66 identificate solo al genere/gruppo |
| 22 | `anthyllis-vulneraria` | 800 | 800 | 0 | 0 | 543 | 484 | 800 | 115 |  |
| 23 | `fritillaria` | 800 | 105 | 695 | 0 | 730 | 423 | 800 | 115 |  |
| 24 | `trifolium-repens` | 800 | 800 | 0 | 0 | 190 | 450 | 800 | 115 |  |
| 25 | `papaver-rhoeas` | 800 | 800 | 0 | 0 | 347 | 590 | 800 | 115 |  |
| 26 | `centaurea-cyanus` | 800 | 386 | 414 | 0 | 468 | 540 | 800 | 115 |  |
| 27 | `cichorium-intybus` | 800 | 800 | 0 | 0 | 335 | 499 | 800 | 115 |  |
| 28 | `echium-vulgare` | 800 | 800 | 0 | 0 | 357 | 487 | 800 | 115 |  |
| 29 | `convolvulus-arvensis` | 800 | 800 | 0 | 0 | 584 | 536 | 800 | 115 |  |
| 30 | `malva-sylvestris` | 800 | 800 | 0 | 0 | 387 | 520 | 800 | 115 |  |
| 31 | `linaria-vulgaris` | 800 | 800 | 0 | 0 | 352 | 458 | 800 | 115 |  |
| 32 | `verbascum` | 800 | 800 | 0 | 0 | 362 | 446 | 800 | 115 |  |
| 33 | `silene-vulgaris` | 800 | 800 | 0 | 0 | 229 | 556 | 800 | 115 |  |
| 34 | `calendula-arvensis` | 800 | 722 | 78 | 0 | 196 | 452 | 800 | 115 |  |
| 35 | `gladiolus-italicus` | 800 | 705 | 95 | 0 | 196 | 509 | 800 | 115 |  |
| 36 | `hypericum-perforatum` | 800 | 800 | 0 | 0 | 277 | 430 | 800 | 115 |  |
| 37 | `silybum-marianum` | 800 | 780 | 20 | 0 | 489 | 547 | 800 | 115 |  |
| 38 | `nigella-damascena` | 800 | 571 | 229 | 0 | 333 | 561 | 800 | 115 |  |
| 39 | `leopoldia-comosa` | 800 | 800 | 0 | 0 | 606 | 586 | 800 | 115 |  |
| 40 | `lamium-purpureum` | 800 | 800 | 0 | 0 | 607 | 435 | 800 | 115 |  |
| 41 | `dipsacus-fullonum` | 800 | 684 | 116 | 0 | 190 | 476 | 800 | 115 |  |
| 42 | `daucus-carota` | 800 | 800 | 0 | 0 | 217 | 466 | 800 | 115 |  |
| 43 | `oenothera` | 800 | 406 | 394 | 0 | 492 | 510 | 800 | 115 | 145 identificate solo al genere/gruppo |
| 44 | `cymbalaria-muralis` | 800 | 800 | 0 | 0 | 411 | 519 | 800 | 115 |  |
| 45 | `antirrhinum-majus` | 800 | 295 | 505 | 0 | 575 | 565 | 800 | 115 |  |
| 46 | `lathyrus-latifolius` | 800 | 534 | 266 | 0 | 375 | 532 | 800 | 115 |  |
| 47 | `tragopogon-porrifolius` | 800 | 173 | 627 | 0 | 315 | 571 | 800 | 115 |  |
| 48 | `legousia-speculum-veneris` | 800 | 255 | 545 | 0 | 167 | 505 | 800 | 115 |  |
| 49 | `glebionis-coronaria` | 800 | 216 | 584 | 0 | 621 | 476 | 800 | 115 |  |
| 50 | `saponaria-officinalis` | 800 | 800 | 0 | 0 | 183 | 416 | 800 | 115 |  |
| 51 | `anchusa-azurea` | 800 | 212 | 588 | 0 | 426 | 504 | 800 | 115 |  |
| 52 | `tulipa-sylvestris` | 800 | 362 | 438 | 0 | 737 | 445 | 800 | 115 |  |
| 53 | `foeniculum-vulgare` | 800 | 590 | 210 | 0 | 254 | 522 | 800 | 115 |  |
| 54 | `leontopodium-nivale` | 800 | 800 | 0 | 0 | 217 | 491 | 800 | 115 |  |
| 55 | `gentiana-acaulis-gruppo` | 799 | 799 | 0 | 0 | 224 | 433 | 799 | 115 | 1 già usate da un'altra classe (foto o osservazione condivisa) |
| 56 | `gentiana-lutea` | 800 | 438 | 362 | 0 | 308 | 545 | 800 | 115 |  |
| 57 | `trollius-europaeus` | 800 | 800 | 0 | 0 | 171 | 534 | 800 | 115 |  |
| 58 | `arnica-montana` | 800 | 800 | 0 | 0 | 114 | 421 | 800 | 115 |  |
| 59 | `crocus-vernus` | 800 | 800 | 0 | 0 | 365 | 414 | 800 | 115 |  |
| 60 | `soldanella` | 798 | 798 | 0 | 0 | 137 | 429 | 798 | 115 | 2 già usate da un'altra classe (foto o osservazione condivisa) |
| 61 | `rhododendron-alpino` | 800 | 800 | 0 | 0 | 260 | 468 | 800 | 115 |  |
| 62 | `pulsatilla-alpina` | 800 | 800 | 0 | 0 | 339 | 456 | 800 | 115 |  |
| 63 | `lilium-martagon` | 800 | 800 | 0 | 0 | 276 | 508 | 800 | 115 |  |
| 64 | `aster-alpinus` | 800 | 800 | 0 | 0 | 213 | 486 | 800 | 115 |  |
| 65 | `paradisea-liliastrum` | 800 | 467 | 333 | 0 | 189 | 502 | 800 | 115 |  |
| 66 | `campanula-barbata` | 800 | 800 | 0 | 0 | 305 | 455 | 800 | 115 |  |
| 67 | `gentiana-verna` | 800 | 800 | 0 | 0 | 347 | 491 | 800 | 115 |  |
| 68 | `viola-calcarata` | 800 | 189 | 611 | 0 | 465 | 444 | 800 | 115 |  |
| 69 | `silene-acaulis` | 800 | 800 | 0 | 0 | 256 | 455 | 800 | 115 |  |
| 70 | `dryas-octopetala` | 800 | 800 | 0 | 0 | 186 | 512 | 800 | 115 |  |
| 71 | `ranunculus-glacialis` | 800 | 456 | 344 | 0 | 279 | 449 | 800 | 115 |  |
| 72 | `saxifraga-oppositifolia` | 800 | 409 | 391 | 0 | 520 | 467 | 800 | 115 |  |
| 73 | `primula-auricula` | 799 | 291 | 508 | 0 | 303 | 477 | 799 | 115 | 1 già usate da un'altra classe (foto o osservazione condivisa) |
| 74 | `linaria-alpina` | 800 | 800 | 0 | 0 | 108 | 484 | 800 | 115 |  |
| 75 | `aconitum-napellus` | 800 | 288 | 512 | 0 | 593 | 526 | 800 | 115 |  |
| 76 | `astrantia-major` | 800 | 756 | 44 | 0 | 167 | 451 | 800 | 115 |  |
| 77 | `phyteuma` | 800 | 800 | 0 | 0 | 420 | 374 | 800 | 115 |  |
| 78 | `lilium-bulbiferum` | 800 | 800 | 0 | 0 | 227 | 525 | 800 | 115 |  |
| 79 | `bistorta-officinalis` | 800 | 797 | 3 | 0 | 126 | 478 | 800 | 115 |  |
| 80 | `chamaenerion-angustifolium` | 800 | 800 | 0 | 0 | 528 | 547 | 800 | 115 |  |
| 81 | `pinguicula` | 800 | 800 | 0 | 0 | 210 | 396 | 800 | 115 |  |
| 82 | `centaurea-montana-gruppo` | 800 | 628 | 172 | 0 | 304 | 439 | 800 | 115 |  |
| 83 | `sempervivum` | 800 | 800 | 0 | 0 | 200 | 426 | 800 | 115 |  |
| 84 | `cistus-creticus` | 800 | 800 | 0 | 0 | 118 | 533 | 800 | 115 |  |
| 85 | `myrtus-communis` | 800 | 434 | 366 | 0 | 523 | 573 | 800 | 115 |  |
| 86 | `lavandula-stoechas` | 800 | 331 | 469 | 0 | 506 | 501 | 800 | 115 |  |
| 87 | `spartium-junceum` | 800 | 800 | 0 | 0 | 181 | 589 | 800 | 115 |  |
| 88 | `asphodelus` | 800 | 800 | 0 | 0 | 164 | 487 | 800 | 115 |  |
| 89 | `centranthus-ruber` | 800 | 800 | 0 | 0 | 286 | 588 | 800 | 115 |  |
| 90 | `capparis-spinosa` | 800 | 436 | 364 | 0 | 474 | 596 | 800 | 115 |  |
| 91 | `carpobrotus` | 800 | 415 | 385 | 0 | 463 | 557 | 800 | 115 | 32 identificate solo al genere/gruppo |
| 92 | `glaucium-flavum` | 800 | 584 | 216 | 0 | 281 | 562 | 800 | 115 |  |
| 93 | `calystegia-soldanella` | 800 | 252 | 548 | 0 | 427 | 608 | 800 | 115 |  |
| 94 | `eryngium-maritimum` | 800 | 570 | 230 | 0 | 266 | 574 | 800 | 115 |  |
| 95 | `pancratium-maritimum` | 800 | 800 | 0 | 0 | 386 | 606 | 800 | 115 |  |
| 96 | `cistus-salviifolius` | 800 | 800 | 0 | 0 | 124 | 518 | 800 | 115 |  |
| 97 | `opuntia-ficus-indica` | 800 | 265 | 535 | 0 | 261 | 550 | 800 | 115 |  |
| 98 | `phlomis-fruticosa` | 800 | 178 | 594 | 28 | 90 | 584 | 800 | 115 | foto extra-europee |
| 99 | `anemone-coronaria` | 800 | 236 | 564 | 0 | 434 | 504 | 800 | 115 |  |
| 100 | `erica-arborea` | 800 | 672 | 128 | 0 | 201 | 511 | 800 | 115 |  |
| 101 | `achillea-maritima` | 800 | 208 | 592 | 0 | 131 | 546 | 800 | 115 |  |
| 102 | `cakile-maritima` | 800 | 800 | 0 | 0 | 160 | 452 | 800 | 115 |  |
| 103 | `limonium` | 800 | 432 | 368 | 0 | 455 | 468 | 800 | 115 | 82 identificate solo al genere/gruppo |
| 104 | `matthiola` | 800 | 360 | 440 | 0 | 517 | 503 | 800 | 115 | 30 identificate solo al genere/gruppo |
| 105 | `helichrysum` | 800 | 414 | 386 | 0 | 477 | 480 | 800 | 115 |  |
| 106 | `teucrium-fruticans` | 800 | 280 | 520 | 0 | 130 | 558 | 800 | 115 |  |
| 107 | `tamarix` | 800 | 98 | 702 | 0 | 150 | 555 | 800 | 115 | 117 identificate solo al genere/gruppo |
| 108 | `vitex-agnus-castus` | 799 | 168 | 631 | 0 | 207 | 609 | 799 | 115 | 1 già usate da un'altra classe (foto o osservazione condivisa) |
| 109 | `anemone-nemorosa` | 800 | 800 | 0 | 0 | 269 | 420 | 800 | 115 |  |
| 110 | `hepatica-nobilis` | 800 | 800 | 0 | 0 | 419 | 480 | 800 | 115 |  |
| 111 | `primula-vulgaris` | 799 | 799 | 0 | 0 | 513 | 427 | 799 | 115 | 1 già usate da un'altra classe (foto o osservazione condivisa) |
| 112 | `galanthus-nivalis` | 800 | 800 | 0 | 0 | 299 | 342 | 800 | 115 |  |
| 113 | `erythronium-dens-canis` | 799 | 799 | 0 | 0 | 160 | 353 | 799 | 115 | 1 già usate da un'altra classe (foto o osservazione condivisa) |
| 114 | `pulmonaria` | 800 | 800 | 0 | 0 | 154 | 350 | 800 | 115 |  |
| 115 | `scilla-bifolia` | 799 | 799 | 0 | 0 | 521 | 424 | 799 | 115 | 1 già usate da un'altra classe (foto o osservazione condivisa) |
| 116 | `vinca-minor` | 800 | 800 | 0 | 0 | 497 | 400 | 800 | 115 |  |
| 117 | `cyclamen` | 800 | 800 | 0 | 0 | 800 | 511 | 800 | 115 |  |
| 118 | `helleborus-niger` | 800 | 733 | 67 | 0 | 189 | 348 | 800 | 115 |  |
| 119 | `aquilegia` | 800 | 800 | 0 | 0 | 372 | 459 | 800 | 115 |  |
| 120 | `paeonia-officinalis` | 800 | 417 | 383 | 0 | 227 | 441 | 800 | 115 |  |
| 121 | `daphne-mezereum` | 800 | 800 | 0 | 0 | 132 | 410 | 800 | 115 |  |
| 122 | `convallaria-majalis` | 800 | 462 | 338 | 0 | 446 | 500 | 800 | 115 |  |
| 123 | `lathyrus-vernus` | 800 | 697 | 103 | 0 | 245 | 453 | 800 | 115 |  |
| 124 | `anemone-ranunculoides` | 800 | 571 | 229 | 0 | 290 | 408 | 800 | 115 |  |
| 125 | `corydalis` | 800 | 800 | 0 | 0 | 182 | 408 | 800 | 115 |  |
| 126 | `oxalis-acetosella` | 800 | 735 | 65 | 0 | 152 | 440 | 800 | 115 |  |
| 127 | `geranium-robertianum` | 800 | 800 | 0 | 0 | 396 | 455 | 800 | 115 |  |
| 128 | `melittis-melissophyllum` | 800 | 800 | 0 | 0 | 288 | 434 | 800 | 115 |  |
| 129 | `digitalis` | 800 | 800 | 0 | 0 | 276 | 428 | 800 | 115 |  |
| 130 | `lonicera-caprifogli` | 800 | 800 | 0 | 0 | 279 | 476 | 800 | 115 |  |
| 131 | `clematis-vitalba` | 800 | 800 | 0 | 0 | 193 | 488 | 800 | 115 |  |
| 132 | `sambucus-nigra` | 800 | 800 | 0 | 0 | 175 | 505 | 800 | 115 |  |
| 133 | `calluna-vulgaris` | 800 | 800 | 0 | 0 | 94 | 432 | 800 | 115 |  |
| 134 | `erica-carnea` | 800 | 800 | 0 | 0 | 215 | 427 | 800 | 115 |  |
| 135 | `iris-pseudacorus` | 800 | 800 | 0 | 0 | 140 | 436 | 800 | 115 |  |
| 136 | `lythrum-salicaria` | 800 | 800 | 0 | 0 | 263 | 420 | 800 | 115 |  |
| 137 | `caltha-palustris` | 800 | 672 | 128 | 0 | 359 | 490 | 800 | 115 |  |
| 138 | `nuphar-lutea` | 800 | 276 | 524 | 0 | 553 | 485 | 800 | 115 |  |
| 139 | `nymphaea` | 800 | 281 | 519 | 0 | 585 | 501 | 800 | 115 | 65 casual coltivate; 22 identificate solo al genere/gruppo |
| 140 | `epilobium-hirsutum` | 800 | 662 | 138 | 0 | 249 | 383 | 800 | 115 |  |
| 141 | `lysimachia-vulgaris` | 800 | 440 | 360 | 0 | 416 | 421 | 800 | 115 |  |
| 142 | `symphytum-officinale` | 800 | 416 | 384 | 0 | 493 | 448 | 800 | 115 |  |
| 143 | `impatiens-glandulifera` | 800 | 745 | 55 | 0 | 145 | 482 | 800 | 115 |  |
| 144 | `menyanthes-trifoliata` | 800 | 135 | 665 | 0 | 700 | 606 | 800 | 115 |  |
| 145 | `butomus-umbellatus` | 800 | 168 | 632 | 0 | 661 | 423 | 800 | 115 |  |
| 146 | `leucojum-aestivum` | 800 | 142 | 658 | 0 | 259 | 576 | 800 | 115 |  |
| 147 | `calystegia-sepium` | 800 | 459 | 341 | 0 | 456 | 454 | 800 | 115 |  |
| 148 | `lychnis-flos-cuculi` | 800 | 800 | 0 | 0 | 190 | 474 | 800 | 115 |  |
| 149 | `eupatorium-cannabinum` | 800 | 800 | 0 | 0 | 148 | 381 | 800 | 115 |  |
| 150 | `filipendula-ulmaria` | 800 | 220 | 580 | 0 | 637 | 528 | 800 | 115 |  |
| 151 | `ranunculus-acquatici` | 800 | 99 | 701 | 0 | 170 | 600 | 800 | 115 |  |
| 152 | `persicaria-amphibia` | 800 | 97 | 703 | 0 | 436 | 511 | 800 | 115 |  |
| 153 | `parnassia-palustris` | 800 | 800 | 0 | 0 | 479 | 526 | 800 | 115 |  |
| 154 | `impatiens-noli-tangere` | 800 | 181 | 619 | 0 | 573 | 535 | 800 | 115 |  |
| 155 | `mentha-aquatica` | 800 | 241 | 559 | 0 | 604 | 448 | 800 | 115 |  |
| 156 | `hydrangea-macrophylla` | 800 | 58 | 742 | 0 | 136 | 629 | 800 | 115 | 116 casual coltivate |
| 157 | `wisteria` | 800 | 101 | 699 | 0 | 173 | 752 | 800 | 115 | 618 casual coltivate; 32 identificate solo al genere/gruppo |
| 158 | `nerium-oleander` | 800 | 643 | 157 | 0 | 245 | 614 | 800 | 115 | 436 casual coltivate |
| 159 | `bougainvillea` | 800 | 67 | 598 | 135 | 129 | 691 | 800 | 115 | foto extra-europee; 611 casual coltivate; 36 identificate solo al genere/gruppo |
| 160 | `pelargonium` | 800 | 166 | 634 | 0 | 530 | 684 | 800 | 115 | 697 casual coltivate; 36 identificate solo al genere/gruppo |
| 161 | `camellia` | 800 | 32 | 375 | 393 | 256 | 669 | 800 | 115 | foto extra-europee; 388 casual coltivate; 4 identificate solo al genere/gruppo |
| 162 | `syringa-vulgaris` | 800 | 83 | 717 | 0 | 412 | 646 | 800 | 115 | 56 casual coltivate |
| 163 | `cercis-siliquastrum` | 800 | 228 | 572 | 0 | 248 | 654 | 800 | 115 | 86 casual coltivate |
| 164 | `passiflora-caerulea` | 800 | 370 | 430 | 0 | 284 | 715 | 800 | 115 | 463 casual coltivate |
| 165 | `agapanthus` | 800 | 28 | 606 | 166 | 231 | 693 | 800 | 115 | foto extra-europee; 358 casual coltivate; 118 identificate solo al genere/gruppo |
| 166 | `jasminum-nudiflorum` | 800 | 60 | 630 | 110 | 203 | 678 | 800 | 115 | foto extra-europee; 290 casual coltivate |
| 167 | `nelumbo-nucifera` | 800 | 70 | 411 | 319 | 366 | 562 | 800 | 115 | foto extra-europee; 88 casual coltivate |
| 168 | `lagerstroemia-indica` | 800 | 59 | 255 | 486 | 219 | 700 | 800 | 115 | foto extra-europee; 234 casual coltivate |
| 169 | `hibiscus` | 800 | 216 | 584 | 0 | 143 | 678 | 800 | 115 | 177 casual coltivate |
| 170 | `tulipa-gesneriana` | 800 | 44 | 756 | 0 | 528 | 554 | 800 | 115 | 248 casual coltivate |
| 171 | `hyacinthus-orientalis` | 800 | 118 | 682 | 0 | 185 | 691 | 800 | 115 | 44 casual coltivate |
| 172 | `magnolia` | 800 | 109 | 691 | 0 | 253 | 719 | 800 | 115 | 799 casual coltivate |
| 173 | `lantana-camara` | 800 | 94 | 706 | 0 | 165 | 621 | 800 | 115 | 75 casual coltivate |
| 174 | `petunia` | 800 | 147 | 653 | 0 | 177 | 549 | 800 | 115 | 253 casual coltivate; 101 identificate solo al genere/gruppo |
| 175 | `trachelospermum-jasminoides` | 800 | 94 | 249 | 457 | 123 | 688 | 800 | 115 | foto extra-europee; 343 casual coltivate |
| 176 | `forsythia` | 800 | 66 | 734 | 0 | 198 | 661 | 800 | 115 | 50 casual coltivate; 394 identificate solo al genere/gruppo |
| 177 | `strelitzia-reginae` | 800 | 111 | 584 | 105 | 154 | 699 | 800 | 115 | foto extra-europee; 690 casual coltivate |
| 178 | `aloe-arborescens` | 800 | 29 | 394 | 377 | 380 | 595 | 800 | 115 | foto extra-europee; 143 casual coltivate |
| 179 | `hemerocallis-fulva` | 800 | 286 | 514 | 0 | 181 | 620 | 800 | 115 | 28 casual coltivate |
| 180 | `iris-germanica` | 800 | 319 | 481 | 0 | 266 | 620 | 800 | 115 | 51 casual coltivate |
| 181 | `viola-wittrockiana` | 800 | 114 | 686 | 0 | 703 | 577 | 800 | 115 | 165 casual coltivate |
| 182 | `cyclamen-persicum` | 800 | 55 | 285 | 460 | 409 | 532 | 800 | 115 | foto extra-europee; 245 casual coltivate |
| 183 | `euphorbia-pulcherrima` | 800 | 67 | 534 | 199 | 97 | 747 | 800 | 115 | foto extra-europee; 596 casual coltivate |
| 184 | `callistemon` | 800 | 30 | 292 | 478 | 516 | 628 | 800 | 115 | foto extra-europee; 314 casual coltivate |
| 185 | `buddleja-davidii` | 800 | 800 | 0 | 0 | 147 | 467 | 800 | 115 |  |
| 186 | `rosa-canina` | 800 | 162 | 638 | 0 | 602 | 562 | 800 | 115 |  |
| 187 | `crataegus-monogyna` | 800 | 614 | 186 | 0 | 289 | 414 | 800 | 115 |  |
| 188 | `pyracantha` | 800 | 221 | 579 | 0 | 223 | 651 | 800 | 115 | 74 casual coltivate; 30 identificate solo al genere/gruppo |
| 189 | `euonymus-europaeus` | 800 | 800 | 0 | 0 | 189 | 448 | 800 | 115 |  |
| 190 | `ruscus-aculeatus` | 800 | 800 | 0 | 0 | 274 | 521 | 800 | 115 |  |
| 191 | `arbutus-unedo` | 800 | 800 | 0 | 0 | 206 | 600 | 800 | 115 |  |
| 192 | `physalis-alkekengi` | 800 | 206 | 594 | 0 | 340 | 569 | 800 | 115 |  |
| 193 | `viburnum-opulus` | 800 | 266 | 534 | 0 | 567 | 530 | 800 | 115 |  |
| 194 | `arum-italicum` | 800 | 220 | 580 | 0 | 587 | 628 | 800 | 115 |  |
| 195 | `sorbus-aucuparia` | 800 | 503 | 297 | 0 | 386 | 544 | 800 | 115 |  |
| 196 | `ilex-aquifolium` | 800 | 623 | 177 | 0 | 234 | 433 | 800 | 115 |  |
| 197 | `iris-foetidissima` | 800 | 129 | 671 | 0 | 343 | 483 | 800 | 115 |  |
| 198 | `cornus-mas` | 800 | 204 | 596 | 0 | 469 | 638 | 800 | 115 |  |
| 199 | `smilax-aspera` | 800 | 800 | 0 | 0 | 90 | 501 | 800 | 115 |  |
| 200 | `solanum-dulcamara` | 800 | 512 | 288 | 0 | 350 | 515 | 800 | 115 |  |
| 201 | `prunus-spinosa` | 800 | 769 | 31 | 0 | 280 | 524 | 800 | 115 |  |
| 202 | `phytolacca-americana` | 800 | 800 | 0 | 0 | 283 | 523 | 800 | 115 |  |
| 203 | `berberis-vulgaris` | 800 | 162 | 638 | 0 | 416 | 539 | 800 | 115 |  |
| 204 | `hippophae-rhamnoides` | 800 | 114 | 686 | 0 | 485 | 575 | 800 | 115 |  |
| 205 | `vaccinium-myrtillus` | 800 | 379 | 421 | 0 | 498 | 562 | 800 | 115 |  |
| 206 | `vaccinium-vitis-idaea` | 799 | 352 | 447 | 0 | 499 | 564 | 799 | 115 | 1 già usate da un'altra classe (foto o osservazione condivisa) |
| 207 | `fragaria-vesca` | 800 | 545 | 255 | 0 | 327 | 488 | 800 | 115 |  |
| 208 | `rubus` | 800 | 278 | 522 | 0 | 622 | 487 | 800 | 115 |  |
| 209 | `taxus-baccata` | 800 | 497 | 303 | 0 | 0 | 532 | 800 | 115 |  |
| 210 | `cotoneaster` | 800 | 113 | 687 | 0 | 380 | 508 | 800 | 115 | 32 casual coltivate; 10 identificate solo al genere/gruppo |
| 211 | `colchicum-autumnale` | 800 | 800 | 0 | 0 | 363 | 483 | 800 | 115 |  |
| 212 | `sternbergia-lutea` | 800 | 396 | 404 | 0 | 550 | 585 | 800 | 115 |  |
| 213 | `symphyotrichum` | 800 | 87 | 713 | 0 | 258 | 516 | 800 | 115 |  |
| 214 | `solidago` | 800 | 800 | 0 | 0 | 204 | 384 | 800 | 115 |  |
| 215 | `anacamptis-morio` | 800 | 800 | 0 | 0 | 754 | 359 | 800 | 115 |  |
| 216 | `anacamptis-pyramidalis` | 800 | 800 | 0 | 0 | 460 | 431 | 800 | 115 |  |
| 217 | `anacamptis-papilionacea` | 800 | 800 | 0 | 0 | 282 | 379 | 800 | 115 |  |
| 218 | `orchis-purpurea` | 800 | 800 | 0 | 0 | 526 | 439 | 800 | 115 |  |
| 219 | `orchis-simia` | 800 | 637 | 163 | 0 | 251 | 383 | 800 | 115 |  |
| 220 | `orchis-italica` | 800 | 800 | 0 | 0 | 154 | 338 | 800 | 115 |  |
| 221 | `orchis-mascula` | 800 | 800 | 0 | 0 | 240 | 398 | 800 | 115 |  |
| 222 | `neotinea-tridentata` | 800 | 800 | 0 | 0 | 308 | 393 | 800 | 115 |  |
| 223 | `himantoglossum-robertianum` | 800 | 800 | 0 | 0 | 131 | 363 | 800 | 115 |  |
| 224 | `ophrys-apifera` | 800 | 800 | 0 | 0 | 195 | 437 | 800 | 115 |  |
| 225 | `ophrys-bertolonii` | 800 | 800 | 0 | 0 | 379 | 348 | 800 | 115 |  |
| 226 | `ophrys-lutea-gruppo` | 800 | 800 | 0 | 0 | 169 | 244 | 800 | 115 |  |
| 227 | `ophrys-fuciflora-gruppo` | 800 | 800 | 0 | 0 | 284 | 309 | 800 | 115 |  |
| 228 | `ophrys-tenthredinifera` | 800 | 800 | 0 | 0 | 122 | 248 | 800 | 115 |  |
| 229 | `serapias` | 800 | 800 | 0 | 0 | 252 | 347 | 800 | 115 |  |
| 230 | `cephalanthera-bianche` | 800 | 800 | 0 | 0 | 508 | 396 | 800 | 115 |  |
| 231 | `cephalanthera-rubra` | 800 | 496 | 304 | 0 | 461 | 455 | 800 | 115 |  |
| 232 | `dactylorhiza-sambucina` | 800 | 800 | 0 | 0 | 384 | 385 | 800 | 115 |  |
| 233 | `dactylorhiza-maculata-gruppo` | 800 | 800 | 0 | 0 | 404 | 421 | 800 | 115 |  |
| 234 | `gymnadenia-conopsea` | 800 | 800 | 0 | 0 | 260 | 400 | 800 | 115 |  |
| 235 | `nigritella` | 800 | 800 | 0 | 0 | 93 | 382 | 800 | 115 |  |
| 236 | `limodorum-abortivum` | 800 | 678 | 122 | 0 | 220 | 447 | 800 | 115 |  |
| 237 | `platanthera` | 800 | 800 | 0 | 0 | 153 | 389 | 800 | 115 |  |
| 238 | `traunsteinera-globosa` | 800 | 475 | 325 | 0 | 208 | 403 | 800 | 115 |  |
| 239 | `borago-officinalis` | 800 | 800 | 0 | 0 | 304 | 534 | 800 | 115 |  |
| 240 | `tropaeolum-majus` | 800 | 147 | 653 | 0 | 359 | 607 | 800 | 115 | 23 casual coltivate |
| 241 | `cucurbita` | 800 | 32 | 768 | 0 | 45 | 526 | 800 | 115 | 80 casual coltivate; 75 identificate solo al genere/gruppo |
| 242 | `phaseolus-coccineus` | 800 | 1 | 110 | 689 | 126 | 560 | 800 | 115 | foto extra-europee; 45 casual coltivate |
| 243 | `cynara-cardunculus` | 800 | 187 | 613 | 0 | 160 | 608 | 800 | 115 | 37 casual coltivate |
| 244 | `allium-schoenoprasum` | 800 | 212 | 588 | 0 | 470 | 590 | 800 | 115 | 30 casual coltivate |
| 245 | `salvia-officinalis` | 800 | 137 | 663 | 0 | 108 | 603 | 800 | 115 | 90 casual coltivate |
| 246 | `salvia-rosmarinus` | 799 | 642 | 157 | 0 | 250 | 578 | 799 | 115 | 200 casual coltivate; 1 già usate da un'altra classe (foto o osservazione condivisa) |
| 247 | `lavandula-giardino` | 800 | 77 | 723 | 0 | 129 | 570 | 800 | 115 | 190 casual coltivate |
| 248 | `calendula-officinalis` | 800 | 106 | 694 | 0 | 532 | 601 | 800 | 115 | 25 casual coltivate |
| 249 | `punica-granatum` | 800 | 150 | 650 | 0 | 272 | 661 | 800 | 115 | 122 casual coltivate |
| 250 | `diospyros-kaki` | 800 | 205 | 497 | 98 | 582 | 682 | 800 | 115 | foto extra-europee; 672 casual coltivate |
| 251 | `citrus` | 800 | 277 | 523 | 0 | 548 | 636 | 800 | 115 | 684 casual coltivate; 28 identificate solo al genere/gruppo |
| 252 | `prunus-dulcis` | 800 | 53 | 747 | 0 | 396 | 494 | 800 | 115 | 31 casual coltivate |
| 253 | `cydonia-oblonga` | 800 | 46 | 754 | 0 | 213 | 680 | 800 | 115 | 286 casual coltivate |
| 254 | `vitis-vinifera` | 800 | 72 | 728 | 0 | 113 | 562 | 800 | 115 | 31 casual coltivate |
| 255 | `solanum-lycopersicum` | 800 | 162 | 638 | 0 | 190 | 462 | 800 | 115 | 23 casual coltivate |
| 256 | `capsicum-annuum` | 800 | 18 | 172 | 610 | 447 | 621 | 800 | 115 | foto extra-europee; 159 casual coltivate |
| 257 | `solanum-melongena` | 800 | 4 | 127 | 669 | 50 | 695 | 800 | 115 | foto extra-europee; 110 casual coltivate |
| 258 | `helianthus-annuus` | 800 | 99 | 701 | 0 | 255 | 581 | 800 | 115 | 45 casual coltivate |
| 259 | `phacelia-tanacetifolia` | 800 | 152 | 648 | 0 | 652 | 642 | 800 | 115 | 11 casual coltivate |
| 260 | `crocus-sativus` | 272 | 13 | 134 | 125 | 31 | 241 | 360 | 52 | sotto 300; foto extra-europee; 35 senza conferma della comunità; 223 casual coltivate |
| 261 | `cypripedium-calceolus` | 800 | 213 | 587 | 0 | 653 | 496 | 800 | 115 |  |

## Classe "altro"

| Parte | Origine | Licenza | Gruppi | Osservazioni | Immagini | MB |
|---|---|---|---:|---:|---:|---:|
| Sosia fuori catalogo | iNaturalist, research grade; Italia → Europa → mondo; prima le foto annotate in fiore/frutto | CC0, CC BY o CC BY-NC (scelta dell'autore, foto per foto) | 64 | 6,376 | 6,376 | 917 |
| Piante comuni in Italia | iNaturalist, specie vascolari più osservate in Italia (research grade) fuori dal catalogo | CC0, CC BY o CC BY-NC (scelta dell'autore, foto per foto) | 300 | 5,998 | 5,998 | 863 |
| Specie del catalogo senza fiori né frutti | iNaturalist, specie del catalogo con l'annotazione "No Flowers or Fruits" | CC0, CC BY o CC BY-NC (scelta dell'autore, foto per foto) | 1 | 1,999 | 1,999 | 288 |
| Non piante (iNaturalist) | iNaturalist: funghi, uccelli, mammiferi, rettili, anfibi, molluschi (niente insetti e ragni) | CC0, CC BY o CC BY-NC (scelta dell'autore, foto per foto) | 6 | 1,500 | 1,500 | 216 |
| Scene senza piante (Open Images) | Open Images V7, validation: immagini senza etichette di piante | CC BY 2.0 (foto Flickr); etichette CC BY 4.0 (Google) | 1 | 2,000 | 2,000 | 609 |

L'elenco completo delle fonti di "altro" è in `ml/reports/altro-sources.md`.
