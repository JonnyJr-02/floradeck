# FloraDeck — Proposta di catalogo

> Bozza da validare (fase 1). Generata da `catalog/scripts/render_proposal.py` con i dati iNaturalist del 2026-11-06. Per cambiarla si modifica `catalog/proposal/candidates.json` e si rigenera.

## Come leggerla

- **8 album, 95 specie + 1 leggendaria**, una specie rara per album. Dopo ogni album ci sono alcune riserve (26 in tutto) per gli scambi.
- **Periodo**: i mesi in cui la pianta viene fotografata in fiore in Italia (con i frutti, per l'album delle bacche), secondo le annotazioni di iNaturalist. Conta un mese se ha almeno il 15% delle osservazioni del mese di picco (35% per i frutti, perché l'annotazione comprende anche quelli acerbi). L'asterisco indica che le annotazioni erano poche e ho usato tutte le osservazioni.
- **Foto**: osservazioni iNaturalist verificate dalla comunità ("research grade") in Italia, con foto a licenza CC0, CC-BY o CC-BY-NC: è il materiale per addestrare il modello. ✅ almeno 300 · 🟡 meno di 300 in Italia ma almeno 300 in Europa · 🔴 pochi dati. † = conta anche le piante coltivate, che iNaturalist non marca mai come verificate.
- **N · C · S**: dove la si trova in Italia. Nord sopra i 44° N (circa la linea Genova–Ravenna), Centro fino ai 41,8° N (circa Roma), poi Sud e isole. Le percentuali sono corrette per il numero di osservazioni di piante in ciascuna area, perché al Nord gli utenti di iNaturalist sono molti di più: 33 · 33 · 33 vuol dire "ugualmente frequente ovunque". Utile per capire cosa trovate vicino a voi.
- **Livello**: *gruppo* o *genere* quando le specie si distinguono solo da vicino; la carta vale per tutto il gruppo.
- **Sosia**: "→ altro" significa che il sosia non è in catalogo e il modello lo impara come "altro". "In catalogo" significa che il sosia è un'altra carta, quindi il modello deve distinguerle.

## Sintesi

| Album | Specie | Comuni / non comuni / rare | Foto ✅ / 🟡 / 🔴 |
|---|---|---|---|
| Prati di primavera | 11 | 9 / 1 / 1 | 11 / 0 / 0 |
| Campi e bordi di strada | 12 | 9 / 2 / 1 | 12 / 0 / 0 |
| Montagna e pascoli alpini | 12 | 4 / 7 / 1 | 12 / 0 / 0 |
| Macchia mediterranea e coste | 12 | 7 / 4 / 1 | 12 / 0 / 0 |
| Boschi e sottobosco | 12 | 8 / 3 / 1 | 12 / 0 / 0 |
| Zone umide, fossi e laghi | 12 | 7 / 4 / 1 | 8 / 4 / 0 |
| Giardini, parchi e balconi | 12 | 11 / 0 / 1 | 9 / 3 / 0 |
| Bacche e colori d'autunno | 12 | 8 / 3 / 1 | 12 / 0 / 0 |
| Carta leggendaria (segreta) | 1 | leggendaria | 0 / 1 / 0 |

Specie con poche foto in Italia: Nannufaro (🟡 293 (UE 15393)), Trifoglio fibrino (🟡 202 (UE 9692)), Giunco fiorito (🟡 189 (UE 8692)), Campanellino estivo (🟡 145 (UE 2715)), Agapanto (🟡 215† (UE 2984)), Gelsomino invernale (🟡 153† (UE 1392)), Fior di loto (🟡 128† (UE 723)), Scarpetta di Venere (🟡 238 (UE 5284)).

## Prati di primavera

_Fioriture di prati e pascoli di pianura e collina, da marzo a giugno._

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Pratolina**<br>*Bellis perennis* | specie | comune | bianco, rosa | dic–giu | ✅ 4322 | 34 · 49 · 16 | Sosia: margherite (Leucanthemum), Erigeron (→ altro). |
| 02 | **Tarassaco (dente di leone)**<br>*Taraxacum sp.* | genere | comune | giallo | mar–giu, ott | ✅ 865 | 66 · 22 · 11 | Genere: centinaia di microspecie. Sosia: altre composite gialle (Hypochaeris, Crepis, Leontodon → altro). |
| 03 | **Primula odorosa**<br>*Primula veris* | specie | comune | giallo | mar–giu | ✅ 1138 | 76 · 24 · 0 | Sosia: Primula elatior (→ altro), Primula vulgaris (in catalogo, Boschi). |
| 04 | **Viola mammola**<br>*Viola gr. odorata* | gruppo | comune | viola, bianco | feb–mar | ✅ 1651 | 66 · 24 · 10 | Gruppo: le tre specie si distinguono solo da vicino (foglie, profumo). |
| 05 | **Muscari**<br>*Muscari sp.* | gruppo | comune | blu, viola | mar–mag | ✅ 1214 | 31 · 53 · 16 | Gruppo a livello di genere, escluso il cipollaccio (Muscari comosum), che ha un aspetto diverso. |
| 06 | **Non ti scordar di me**<br>*Myosotis sp.* | genere | comune | azzurro | mar–ago | ✅ 1223 | 67 · 20 · 12 | Genere: le specie si distinguono solo da vicino. |
| 07 | **Salvia dei prati**<br>*Salvia pratensis* | specie | comune | viola, blu | apr–lug, ott | ✅ 2663 | 84 · 13 · 3 | Sosia: Salvia verbenaca, Salvia nemorosa (→ altro). |
| 08 | **Iva comune**<br>*Ajuga reptans* | specie | comune | blu, viola | mar–mag | ✅ 2884 | 45 · 39 · 16 | Sosia: Ajuga genevensis, Prunella vulgaris, Glechoma hederacea (→ altro). |
| 09 | **Trifoglio pratense**<br>*Trifolium pratense* | specie | comune | rosa | apr–set | ✅ 4143 | 49 · 37 · 14 | Sosia: Trifolium medium, Trifolium incarnatum (→ altro). |
| 10 | **Orchide minore**<br>*Anacamptis morio* | specie | non comune | viola | apr–mag | ✅ 3742 | 14 · 42 · 43 | Orchidea. Sosia: Orchis mascula, Anacamptis laxiflora (→ altro). |
| 11 | **Ofride fior d'api**<br>*Ophrys apifera* | specie | **rara** | rosa | mag–giu | ✅ 1375 | 16 · 53 · 31 | Orchidea. Sosia: altre Ophrys (→ altro). |

**Riserve**

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Margherita comune**<br>*Leucanthemum vulgare agg.* | gruppo | comune | bianco | apr–set, nov | ✅ 674 | 83 · 14 · 3 | Sosia: Anthemis, Tripleurospermum, Bellis (in catalogo). |
| 02 | **Narciso dei poeti**<br>*Narcissus poeticus* | specie | non comune | bianco | apr–giu | ✅ 1028 | 45 · 38 · 18 | Sosia: narcisi coltivati (→ altro). |
| 03 | **Latte di gallina**<br>*Ornithogalum umbellatum* | specie | comune | bianco | mar–mag | ✅ 564 | 56 · 32 · 12 | Sosia: altri Ornithogalum (→ altro). |
| 04 | **Ranuncolo dei prati**<br>*Ranunculus gr. acris* | gruppo | comune | giallo | feb–mag | ✅ 1361 | 83 · 15 · 3 | Gruppo: indistinguibili dalle foto del fiore. Sosia: Potentilla, Ficaria verna. |

## Campi e bordi di strada

_Fiori di campi coltivati, incolti e bordi delle strade._

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Papavero comune**<br>*Papaver rhoeas* | specie | comune | rosso | apr–giu | ✅ 2836 | 23 · 42 · 35 | Sosia: Papaver dubium (→ altro). |
| 02 | **Fiordaliso**<br>*Centaurea cyanus* | specie | non comune | blu | apr–lug | ✅ 409 | 50 · 43 · 7 | Frequente anche nei miscugli di fiori seminati. Sosia: Centaurea montana (→ altro). |
| 03 | **Cicoria selvatica**<br>*Cichorium intybus* | specie | comune | azzurro | mag–nov | ✅ 2266 | 22 · 55 · 24 | Sosia: Lactuca perennis (→ altro). |
| 04 | **Viperina azzurra**<br>*Echium vulgare* | specie | comune | blu, viola | apr–set | ✅ 2526 | 42 · 43 · 15 | Sosia: Echium plantagineum (→ altro). |
| 05 | **Vilucchio comune**<br>*Convolvulus arvensis* | specie | comune | bianco, rosa | mag–ago | ✅ 2888 | 27 · 47 · 26 | Sosia: Calystegia sepium (→ altro), Calystegia soldanella (in catalogo, Coste). |
| 06 | **Malva selvatica**<br>*Malva sylvestris* | specie | comune | rosa, viola | mar–nov | ✅ 2956 | 19 · 61 · 20 | Sosia: Malva neglecta, Malva olbia (→ altro). |
| 07 | **Linajola comune**<br>*Linaria vulgaris* | specie | comune | giallo, arancio | lug–nov | ✅ 1834 | 34 · 58 · 8 |   |
| 08 | **Verbasco**<br>*Verbascum sp.* | genere | comune | giallo | mag–ott | ✅ 3167 | 27 · 42 · 32 | Genere: le specie si distinguono a fatica dalle foto. |
| 09 | **Silene rigonfia**<br>*Silene vulgaris* | specie | comune | bianco | apr–ott | ✅ 2933 | 46 · 22 · 32 |   |
| 10 | **Fiorrancio selvatico**<br>*Calendula arvensis* | specie | comune | arancio | dic–apr | ✅ 926 | 3 · 58 · 39 | Sosia: Calendula officinalis coltivata (→ altro). |
| 11 | **Gladiolo dei campi**<br>*Gladiolus italicus* | specie | non comune | rosa, viola | apr–mag | ✅ 766 | 12 · 48 · 40 |   |
| 12 | **Tulipano selvatico**<br>*Tulipa sylvestris* | specie | **rara** | giallo | mar–giu | ✅ 391 | 69 · 16 · 15 | Sosia: tulipani coltivati gialli (→ altro). |

**Riserve**

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Erba di San Giovanni**<br>*Hypericum perforatum* | specie | comune | giallo | mag–ago | ✅ 1829 | 31 · 48 · 21 | Sosia: altri Hypericum (→ altro). |
| 02 | **Cardo mariano**<br>*Silybum marianum* | specie | comune | viola | apr–giu | ✅ 1460 | 11 · 55 · 34 |   |
| 03 | **Damigella scapigliata**<br>*Nigella damascena* | specie | non comune | azzurro | apr–giu | ✅ 635 | 8 · 58 · 35 |   |
| 04 | **Orchide piramidale**<br>*Anacamptis pyramidalis* | specie | non comune | rosa | mag–giu | ✅ 3138 | 19 · 46 · 35 | Orchidea. |

## Montagna e pascoli alpini

_Pascoli e pendii di montagna, in gran parte sopra i 1000 m._

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Stella alpina**<br>*Leontopodium nivale* | specie | **rara** | bianco | giu–ago | ✅ 2177 | 88 · 12 · 0 |   |
| 02 | **Genziana a trombetta**<br>*Gentiana gr. acaulis* | gruppo | non comune | blu | apr–lug | ✅ 2120 | 99 · 1 · 0 | Gruppo: G. acaulis e G. clusii si distinguono solo dal calice. |
| 03 | **Genziana maggiore**<br>*Gentiana lutea* | specie | non comune | giallo | giu–ago | ✅ 601 | 47 · 41 · 12 |   |
| 04 | **Botton d'oro**<br>*Trollius europaeus* | specie | comune | giallo | mag–lug | ✅ 1404 | 98 · 2 · 0 |   |
| 05 | **Arnica**<br>*Arnica montana* | specie | non comune | arancio, giallo | giu–ago | ✅ 925 | 100 · 0 · 0 | Sosia: Doronicum, Senecio doronicum (→ altro). |
| 06 | **Croco primaverile**<br>*Crocus vernus* | specie | comune | viola, bianco | feb–giu | ✅ 1292 | 58 · 32 · 10 | Sosia: Colchicum autumnale (fiorisce in autunno, velenoso) e altri Crocus (→ altro). |
| 07 | **Soldanella**<br>*Soldanella sp.* | genere | comune | viola | apr–lug | ✅ 1102 | 93 · 3 · 4 | Genere. |
| 08 | **Rododendro alpino**<br>*Rhododendron ferrugineum / hirsutum* | gruppo | comune | rosa, rosso | giu–ago | ✅ 2633 | 100 · 0 · 0 | Gruppo: le due specie differiscono per le foglie. |
| 09 | **Pulsatilla alpina**<br>*Pulsatilla alpina* | specie | non comune | bianco, giallo | mag–giu | ✅ 1708 | 76 · 23 · 1 | Bianca, o gialla nella sottospecie apiifolia. Sosia: Pulsatilla vernalis (→ altro). |
| 10 | **Nigritella**<br>*Nigritella sp.* | genere | non comune | rosso, rosa | giu–ago | ✅ 1051 | 97 · 2 · 1 | Orchidea; tassonomia complicata, quindi livello di genere. |
| 11 | **Giglio martagone**<br>*Lilium martagon* | specie | non comune | rosa | giu–lug | ✅ 2189 | 81 · 17 · 2 |   |
| 12 | **Astro alpino**<br>*Aster alpinus* | specie | non comune | viola | giu–ago | ✅ 970 | 81 · 19 · 0 | Sosia: Erigeron alpinus (→ altro). |

**Riserve**

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Giglio di monte**<br>*Paradisea liliastrum* | specie | non comune | bianco | mag–giu | ✅ 570 | 100 · 0 · 0 | Sosia: Anthericum liliago (→ altro). |
| 02 | **Campanula barbata**<br>*Campanula barbata* | specie | comune | azzurro | giu–ago | ✅ 1175 | 100 · 0 · 0 |   |
| 03 | **Genziana primaticcia**<br>*Gentiana verna* | specie | comune | blu | apr–lug | ✅ 1564 | 64 · 32 · 4 | Sosia: Gentiana brachyphylla, G. bavarica, G. nivalis (→ altro). |

## Macchia mediterranea e coste

_Macchia, garighe, dune e scogliere._

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Cisto rosso**<br>*Cistus creticus* | specie | comune | rosa | apr–giu | ✅ 1529 | 1 · 43 · 57 | Sosia: Cistus albidus (→ altro). |
| 02 | **Mirto**<br>*Myrtus communis* | specie | comune | bianco | mag–lug, ott | ✅ 1107 | 3 · 34 · 63 |   |
| 03 | **Lavanda selvatica**<br>*Lavandula stoechas* | specie | comune | viola | mar–mag | ✅ 439 | 2 · 40 · 58 |   |
| 04 | **Ginestra comune**<br>*Spartium junceum* | specie | comune | giallo | apr–lug | ✅ 2018 | 9 · 53 · 37 | Sosia: Cytisus scoparius, Genista, Calicotome (→ altro). |
| 05 | **Asfodelo**<br>*Asphodelus sp.* | genere | comune | bianco | feb–giu | ✅ 1583 | 5 · 23 · 72 | Genere. |
| 06 | **Valeriana rossa**<br>*Centranthus ruber* | specie | comune | rosso, rosa | apr–ott | ✅ 2537 | 16 · 30 · 53 | Comune anche sui muri delle città. |
| 07 | **Cappero**<br>*Capparis spinosa* | specie | non comune | bianco, rosa | mag–set | ✅ 630 | 8 · 49 · 43 |   |
| 08 | **Fico degli Ottentotti**<br>*Carpobrotus sp.* | genere | comune | rosa, giallo | apr–mag | ✅ 496 | 2 · 29 · 69 | Genere; specie aliena invasiva delle coste. |
| 09 | **Papavero cornuto**<br>*Glaucium flavum* | specie | non comune | giallo | apr–ago | ✅ 768 | 1 · 16 · 83 |   |
| 10 | **Soldanella marittima**<br>*Calystegia soldanella* | specie | non comune | rosa | apr–giu | ✅ 367 | 9 · 37 · 53 | Sosia: Convolvulus arvensis (in catalogo, Campi). |
| 11 | **Calcatreppola marittima**<br>*Eryngium maritimum* | specie | non comune | azzurro | mag–ago | ✅ 928 | 4 · 26 · 70 |   |
| 12 | **Giglio di mare**<br>*Pancratium maritimum* | specie | **rara** | bianco | lug–ott | ✅ 1461 | 0 · 25 · 75 |   |

**Riserve**

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Cisto femmina**<br>*Cistus salviifolius* | specie | comune | bianco | apr–mag | ✅ 1643 | 7 · 37 · 56 | Sosia: Cistus monspeliensis (→ altro). |
| 02 | **Fico d'India**<br>*Opuntia ficus-indica* | specie | comune | giallo, arancio | mag–giu | ✅ 1227 | 2 · 11 · 87 |   |
| 03 | **Salvione giallo**<br>*Phlomis fruticosa* | specie | non comune | giallo | mar–mag\* | 🟡 249 (UE 1235) | 1 · 4 · 94 |   |

## Boschi e sottobosco

_Soprattutto fioriture di fine inverno e primavera, prima che gli alberi mettano le foglie._

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Anemone dei boschi**<br>*Anemone nemorosa* | specie | comune | bianco | mar–apr | ✅ 2446 | 80 · 19 · 1 | Sosia: Anemone trifolia (→ altro). |
| 02 | **Erba trinità**<br>*Hepatica nobilis* | specie | comune | blu, viola | gen–apr | ✅ 3406 | 73 · 23 · 4 |   |
| 03 | **Primula comune**<br>*Primula vulgaris* | specie | comune | giallo | gen–apr | ✅ 3410 | 61 · 30 · 8 | Sosia: Primula veris (in catalogo, Prati), Primula elatior (→ altro). |
| 04 | **Bucaneve**<br>*Galanthus nivalis* | specie | comune | bianco | gen–apr | ✅ 1163 | 49 · 38 · 13 | Sosia: Leucojum (in catalogo, Zone umide). |
| 05 | **Dente di cane**<br>*Erythronium dens-canis* | specie | non comune | rosa | feb–mar | ✅ 1665 | 92 · 8 · 0 |   |
| 06 | **Polmonaria**<br>*Pulmonaria sp.* | genere | comune | rosa, blu | feb–mag | ✅ 1353 | 83 · 12 · 5 | Genere. |
| 07 | **Scilla silvestre**<br>*Scilla bifolia* | specie | comune | blu | feb–mag | ✅ 1492 | 44 · 38 · 18 | Sosia: altre Scilla e Chionodoxa coltivate (→ altro). |
| 08 | **Pervinca minore**<br>*Vinca minor* | specie | comune | blu, viola | feb–mag | ✅ 1968 | 74 · 18 · 9 | Sosia: Vinca major (→ altro). |
| 09 | **Ciclamino selvatico**<br>*Cyclamen sp. (spontanei)* | gruppo | comune | rosa | apr–mag, lug–nov | ✅ 4667 | 15 · 49 · 36 | Gruppo. I ciclamini in vaso (Cyclamen persicum) vanno in 'altro', ma il modello potrebbe confonderli. |
| 10 | **Rosa di Natale**<br>*Helleborus niger* | specie | non comune | bianco | dic–apr | ✅ 1201 | 100 · 0 · 0 | Comune anche nei giardini. |
| 11 | **Aquilegia**<br>*Aquilegia sp.* | genere | non comune | blu, viola | apr–ago | ✅ 1784 | 92 · 6 · 2 | Genere. |
| 12 | **Peonia selvatica**<br>*Paeonia officinalis* | specie | **rara** | rosa, rosso | apr–giu | ✅ 512 | 55 · 45 · 0 | Sosia: peonie coltivate (→ altro). |

**Riserve**

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Fior di stecco**<br>*Daphne mezereum* | specie | non comune | rosa | feb–giu | ✅ 1411 | 87 · 9 · 4 |   |
| 02 | **Mughetto**<br>*Convallaria majalis* | specie | non comune | bianco | apr–mag | ✅ 690 | 97 · 2 · 1 |   |
| 03 | **Cicerchia primaticcia**<br>*Lathyrus vernus* | specie | comune | viola, blu | mar–mag | ✅ 890 | 82 · 15 · 3 |   |

## Zone umide, fossi e laghi

_Rive, fossi, stagni e prati umidi._

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Giaggiolo acquatico**<br>*Iris pseudacorus* | specie | comune | giallo | apr–mag | ✅ 1242 | 50 · 38 · 12 |   |
| 02 | **Salcerella**<br>*Lythrum salicaria* | specie | comune | rosa, viola | giu–set | ✅ 2004 | 54 · 34 · 12 |   |
| 03 | **Calta palustre**<br>*Caltha palustris* | specie | comune | giallo | apr–lug | ✅ 729 | 88 · 4 · 8 | Sosia: Ficaria verna (→ altro). |
| 04 | **Nannufaro**<br>*Nuphar lutea* | specie | non comune | giallo | apr–set | 🟡 293 (UE 15393) | 73 · 21 · 6 |   |
| 05 | **Ninfea**<br>*Nymphaea sp.* | genere | non comune | bianco, rosa | apr–ott | ✅ 586† | 31 · 38 · 32 | Genere: la ninfea bianca spontanea e le ninfee ornamentali dei laghetti. |
| 06 | **Garofanino d'acqua**<br>*Epilobium hirsutum* | specie | comune | rosa | giu–ott | ✅ 810 | 42 · 35 · 23 | Sosia: Chamaenerion angustifolium (→ altro). |
| 07 | **Mazza d'oro**<br>*Lysimachia vulgaris* | specie | comune | giallo | giu–ago | ✅ 504 | 80 · 14 · 7 | Sosia: Lysimachia punctata coltivata (→ altro). |
| 08 | **Consolida maggiore**<br>*Symphytum officinale* | specie | comune | viola, bianco | apr–ago, ott | ✅ 493 | 83 · 11 · 6 |   |
| 09 | **Balsamina ghiandolosa**<br>*Impatiens glandulifera* | specie | comune | rosa | giu–ott | ✅ 794 | 100 · 0 · 0 | Specie aliena invasiva lungo i fiumi. |
| 10 | **Trifoglio fibrino**<br>*Menyanthes trifoliata* | specie | non comune | bianco | apr–giu | 🟡 202 (UE 9692) | 98 · 2 · 0 |   |
| 11 | **Giunco fiorito**<br>*Butomus umbellatus* | specie | non comune | rosa | mag–ago | 🟡 189 (UE 8692) | 93 · 7 · 0 |   |
| 12 | **Campanellino estivo**<br>*Leucojum aestivum* | specie | **rara** | bianco | mar–mag\* | 🟡 145 (UE 2715) | 65 · 15 · 20 | Sosia: Leucojum vernum (→ altro), Galanthus nivalis (in catalogo, Boschi). |

**Riserve**

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Vilucchio bianco**<br>*Calystegia sepium* | specie | comune | bianco | mag–set | ✅ 530 | 50 · 36 · 14 | Sosia: Convolvulus arvensis (in catalogo, Campi). |
| 02 | **Giaggiolo siberiano**<br>*Iris sibirica* | specie | **rara** | blu, viola | mag\* | 🟡 60 (UE 4290) | 100 · 0 · 0 |   |
| 03 | **Limnantemio**<br>*Nymphoides peltata* | specie | **rara** | giallo | giu–ott | 🟡 60 (UE 1657) | 71 · 25 · 4 |   |

## Giardini, parchi e balconi

_Piante coltivate comunissime; la rara è naturalizzata._

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Ortensia**<br>*Hydrangea macrophylla* | specie | comune | blu, rosa, bianco | mag–ago | ✅ 465† | 34 · 33 · 33 |   |
| 02 | **Glicine**<br>*Wisteria sp.* | genere | comune | viola | apr–mag | ✅ 996† | 22 · 48 · 30 | Genere: Wisteria sinensis e W. floribunda. |
| 03 | **Oleandro**<br>*Nerium oleander* | specie | comune | rosa, bianco, rosso | apr–set | ✅ 2451† | 11 · 34 · 55 |   |
| 04 | **Buganvillea**<br>*Bougainvillea sp.* | genere | comune | rosa, viola | mag–ott | ✅ 1053† | 6 · 29 · 65 | Genere. |
| 05 | **Geranio da balcone**<br>*Pelargonium sp.* | genere | comune | rosso, rosa | mar–set | ✅ 737† | 13 · 25 · 62 | Genere: tutti i 'gerani' da balcone. |
| 06 | **Camelia**<br>*Camellia sp.* | genere | comune | rosso, rosa, bianco | mar–mag | ✅ 377† | 30 · 37 · 33 | Genere: Camellia japonica e C. sasanqua. |
| 07 | **Lillà**<br>*Syringa vulgaris* | specie | comune | viola | apr–mag | ✅ 300† | 42 · 41 · 17 |   |
| 08 | **Albero di Giuda**<br>*Cercis siliquastrum* | specie | comune | rosa | apr | ✅ 1177† | 13 · 56 · 31 |   |
| 09 | **Passiflora**<br>*Passiflora caerulea* | specie | comune | bianco, viola | mag–ott | ✅ 915† | 25 · 48 · 27 |   |
| 10 | **Agapanto**<br>*Agapanthus sp.* | genere | comune | blu | giu–lug | 🟡 215† (UE 2984) | 17 · 47 · 37 | Genere. |
| 11 | **Gelsomino invernale**<br>*Jasminum nudiflorum* | specie | comune | giallo | dic–mar | 🟡 153† (UE 1392) | 58 · 36 · 6 | Sosia: Forsythia (→ altro). |
| 12 | **Fior di loto**<br>*Nelumbo nucifera* | specie | **rara** | rosa | mag–ott\* | 🟡 128† (UE 723) | 38 · 48 · 13 | Naturalizzato nei laghi di Mantova; anche in orti botanici e laghetti. |

**Riserve**

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Lagerstroemia**<br>*Lagerstroemia indica* | specie | comune | rosa, viola | lug–set | ✅ 328† | 42 · 41 · 17 |   |
| 02 | **Ibisco**<br>*Hibiscus syriacus* | specie | comune | rosa, viola, bianco | giu–ott | ✅ 665† | 31 · 45 · 25 |   |
| 03 | **Lavanda**<br>*Lavandula angustifolia / × intermedia* | gruppo | comune | viola | mag–ago | ✅ 380† | 29 · 42 · 28 | Sosia: Lavandula stoechas (in catalogo, Macchia). |

## Bacche e colori d'autunno

_Qui si collezionano i frutti: il modello impara bacche e semi, non i fiori._

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Rosa canina**<br>*Rosa canina agg.* | gruppo | comune | rosso | ago–nov, gen | ✅ 476 | 49 · 34 · 17 | Gruppo: altre rose selvatiche hanno frutti simili. |
| 02 | **Biancospino**<br>*Crataegus monogyna* | specie | comune | rosso | ago–ott | ✅ 2021 | 32 · 49 · 18 | Sosia: Crataegus laevigata (→ altro), Pyracantha (in catalogo). |
| 03 | **Agazzino (piracanta)**<br>*Pyracantha sp.* | genere | comune | arancio, rosso | ago–nov | ✅ 562† | 25 · 50 · 26 | Sosia: Cotoneaster (→ altro). |
| 04 | **Berretta del prete**<br>*Euonymus europaeus* | specie | comune | rosa, arancio | set–dic | ✅ 2156 | 43 · 41 · 16 |   |
| 05 | **Pungitopo**<br>*Ruscus aculeatus* | specie | comune | rosso | ott–mag | ✅ 3010 | 25 · 46 · 28 |   |
| 06 | **Corbezzolo**<br>*Arbutus unedo* | specie | comune | rosso, arancio | apr, set–nov | ✅ 1472 | 6 · 46 · 48 |   |
| 07 | **Alchechengi**<br>*Physalis alkekengi* | specie | non comune | arancio | ago–nov | ✅ 350 | 84 · 15 · 1 |   |
| 08 | **Pallon di maggio**<br>*Viburnum opulus* | specie | non comune | rosso | lug–ott | ✅ 613 | 97 · 3 · 1 | Sosia: Viburnum lantana (→ altro). |
| 09 | **Gigaro**<br>*Arum italicum* | specie | comune | arancio, rosso | giu–lug | ✅ 2429 | 18 · 54 · 29 | Sosia: Arum maculatum (→ altro). |
| 10 | **Sorbo degli uccellatori**<br>*Sorbus aucuparia* | specie | comune | arancio, rosso | ago–set | ✅ 1047 | 81 · 11 · 8 |   |
| 11 | **Agrifoglio**<br>*Ilex aquifolium* | specie | non comune | rosso | giu, ago–feb | ✅ 1345 | 37 · 33 · 30 |   |
| 12 | **Giaggiolo puzzolente**<br>*Iris foetidissima* | specie | **rara** | arancio, rosso | ott–feb | ✅ 312 | 31 · 46 · 23 | Si collezionano i semi rosso-arancio nelle capsule aperte. |

**Riserve**

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Corniolo**<br>*Cornus mas* | specie | comune | rosso | ago | ✅ 1150 | 45 · 46 · 9 |   |
| 02 | **Salsapariglia**<br>*Smilax aspera* | specie | comune | rosso | apr, ago–nov, gen | ✅ 1720 | 5 · 40 · 55 |   |
| 03 | **Dulcamara**<br>*Solanum dulcamara* | specie | comune | rosso, viola | lug–ott | ✅ 792 | 55 · 29 · 15 |   |

## Carta leggendaria (segreta)

_Un solo fiore segreto, fuori dagli album._

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Scarpetta di Venere**<br>*Cypripedium calceolus* | specie | **leggendaria** | giallo, viola | mag–giu | 🟡 238 (UE 5284) | 81 · 1 · 18 | Orchidea tutelata dalla Direttiva Habitat UE. |

## Note tecniche

- Nomi che iNaturalist tratta come sinonimi (i conteggi li includono): *Leontopodium alpinum* → *Leontopodium nivale alpinum*; *Crocus albiflorus* → *Crocus vernus*; *Anemone nemorosa* → *Anemonoides nemorosa*; *Anemone hepatica* → *Hepatica nobilis*; *Physalis alkekengi* → *Alkekengi officinarum*.
- I conteggi sono osservazioni, non foto: un'osservazione ha di solito 1–4 foto. Per gli album di genere o gruppo nella fase ML si potranno usare anche osservazioni identificate solo a livello di genere.
- Il dettaglio per mese e per area è in `catalog/proposal/inat_stats.json`.

