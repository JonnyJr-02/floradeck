# FloraDeck — Proposta di catalogo

> Bozza da validare (fase 1). Generata da `catalog/scripts/render_proposal.py` con i dati iNaturalist del 2026-11-07. Per cambiarla si modifica `catalog/proposal/candidates.json` e si rigenera.

## Come leggerla

- **7 album, 204 specie + 1 leggendaria**, una specie rara per album. Dopo ogni album ci sono alcune riserve (19 in tutto) per gli scambi.
- **Periodo**: i mesi in cui la pianta viene fotografata in fiore in Italia (con i frutti, per l'album delle bacche), secondo le annotazioni di iNaturalist. Conta un mese se ha almeno il 15% delle osservazioni del mese di picco (35% per i frutti, perché l'annotazione comprende anche quelli acerbi). L'asterisco indica che le annotazioni erano poche e ho usato tutte le osservazioni.
- **Foto**: osservazioni iNaturalist verificate dalla comunità ("research grade") in Italia, con foto a licenza CC0, CC-BY o CC-BY-NC: è il materiale per addestrare il modello. ✅ almeno 300 · 🟡 meno di 300 in Italia ma almeno 300 in Europa (o nel mondo, per le coltivate) · 🔴 pochi dati. † = conta anche le piante coltivate, che iNaturalist non marca mai come verificate.
- **N · C · S**: dove la si trova in Italia. Nord sopra i 44° N (circa la linea Genova–Ravenna), Centro fino ai 41,8° N (circa Roma), poi Sud e isole. Le percentuali sono corrette per il numero di osservazioni di piante in ciascuna area, perché al Nord gli utenti di iNaturalist sono molti di più: 33 · 33 · 33 vuol dire "ugualmente frequente ovunque". Utile per capire cosa trovate vicino a voi.
- **Livello**: *gruppo* o *genere* quando le specie si distinguono solo da vicino; la carta vale per tutto il gruppo.
- **Sosia**: "→ altro" significa che il sosia non è in catalogo e il modello lo impara come "altro". "In catalogo" significa che il sosia è un'altra carta, quindi il modello deve distinguerle.

## Sintesi

| Album | Specie | Comuni / non comuni / rare | Foto ✅ / 🟡 / 🔴 |
|---|---|---|---|
| Prati di primavera | 24 | 16 / 7 / 0 | 23 / 1 / 0 |
| Campi e bordi di strada | 30 | 23 / 6 / 0 | 25 / 5 / 0 |
| Montagna e pascoli alpini | 30 | 16 / 13 / 0 | 28 / 2 / 0 |
| Macchia mediterranea e coste | 25 | 14 / 11 / 0 | 21 / 4 / 0 |
| Boschi e sottobosco | 26 | 17 / 8 / 0 | 26 / 0 / 0 |
| Zone umide, fossi e laghi | 21 | 13 / 8 / 0 | 13 / 8 / 0 |
| Bacche e colori d'autunno | 29 | 20 / 8 / 0 | 27 / 2 / 0 |
| Orchidee spontanee | 25 | 8 / 16 / 0 | 24 / 1 / 0 |

Specie con poche foto in Italia: Fritillaria (🟡 113 (UE 5103)), Enotera (🟡 292 (UE 15559)), Barba di becco violetta (🟡 191 (UE 2755)), Specchio di Venere (🟡 279 (UE 1060)), Crisantemo coronario (🟡 237 (UE 4489)), Buglossa azzurra (🟡 234 (UE 2678)), Viola speronata (🟡 217 (UE 971, mondo 973)), Aconito napello (🟡 299 (UE 3325)), Salvione giallo (🟡 249 (UE 1235)), Anemone dei fiorai (🟡 254 (UE 1478)), Tamerice (🟡 54 (UE 1752)), Agnocasto (🟡 220 (UE 2773)), Nannufaro (🟡 293 (UE 15393)), Trifoglio fibrino (🟡 202 (UE 9692)), Giunco fiorito (🟡 189 (UE 8692)), Campanellino estivo (🟡 145 (UE 2715)), Olmaria (🟡 280 (UE 45535)), Ranuncolo acquatico (🟡 104 (UE 1424)), Poligono anfibio (🟡 105 (UE 8523)), Erba impaziente (🟡 226 (UE 7842)), Olivello spinoso (🟡 130 (UE 13349)), Astro americano (🟡 92 (UE 2427)), Scarpetta di Venere (🟡 238 (UE 5284)).

## Prati di primavera

_Fioriture di prati e pascoli di pianura e collina, da marzo a giugno._

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Pratolina**<br>*Bellis perennis* | specie | comune | bianco, rosa | dic–giu | ✅ 4322 | 34 · 49 · 16 | Sosia: Margherita comune (in catalogo), Erigeron (→ altro). |
| 02 | **Tarassaco (dente di leone)**<br>*Taraxacum sp.* | genere | comune | giallo | mar–giu, ott | ✅ 865 | 66 · 22 · 11 | Genere: centinaia di microspecie. Sosia: altre composite gialle (Hypochaeris, Crepis, Leontodon → altro). |
| 03 | **Primula odorosa**<br>*Primula veris* | specie | comune | giallo | mar–giu | ✅ 1138 | 75 · 25 · 0 | Sosia: Primula elatior (→ altro), Primula comune (in catalogo, Boschi). |
| 04 | **Viola mammola**<br>*Viola gr. odorata* | gruppo | comune | viola, bianco | feb–apr | ✅ 2404 | 67 · 21 · 11 | Gruppo: mammole e viole dei boschi si distinguono solo da vicino. Sosia: Viola del pensiero (in catalogo, Giardini). |
| 05 | **Muscari**<br>*Muscari sp.* | gruppo | comune | blu, viola | mar–mag | ✅ 1214 | 31 · 53 · 16 | Gruppo a livello di genere, escluso il cipollaccio (in catalogo, Campi). |
| 06 | **Non ti scordar di me**<br>*Myosotis sp.* | genere | comune | azzurro | mar–ago | ✅ 1223 | 67 · 20 · 12 | Genere: le specie si distinguono solo da vicino. |
| 07 | **Salvia dei prati**<br>*Salvia pratensis* | specie | comune | viola, blu | apr–lug, ott | ✅ 2663 | 84 · 13 · 3 | Sosia: Salvia verbenaca (→ altro), Salvia (in catalogo, Orto). |
| 08 | **Iva comune**<br>*Ajuga reptans* | specie | comune | blu, viola | mar–mag | ✅ 2884 | 45 · 39 · 16 | Sosia: Ajuga genevensis, Prunella vulgaris, Glechoma hederacea (→ altro). |
| 09 | **Trifoglio pratense**<br>*Trifolium pratense* | specie | comune | rosa | apr–set | ✅ 4143 | 49 · 37 · 14 | Sosia: Trifolium medium, Trifolium incarnatum (→ altro). |
| 10 | **Margherita comune**<br>*Leucanthemum vulgare agg.* | gruppo | comune | bianco | apr–set, nov | ✅ 674 | 83 · 14 · 3 | Sosia: Anthemis, Tripleurospermum (→ altro), Pratolina (in catalogo). |
| 11 | **Narciso dei poeti**<br>*Narcissus poeticus* | specie | non comune | bianco | apr–giu | ✅ 1028 | 45 · 38 · 17 | Sosia: Narciso nostrale (in catalogo), narcisi coltivati (→ altro). |
| 12 | **Latte di gallina**<br>*Ornithogalum umbellatum* | specie | comune | bianco | mar–mag | ✅ 564 | 56 · 32 · 12 | Sosia: altri Ornithogalum (→ altro). |
| 13 | **Ranuncolo dei prati**<br>*Ranunculus gr. acris* | gruppo | comune | giallo | feb–mag | ✅ 1361 | 83 · 15 · 3 | Gruppo: indistinguibili dalle foto del fiore. Sosia: Favagello (in catalogo), Potentilla (→ altro). |
| 14 | **Favagello**<br>*Ficaria verna* | specie | comune | giallo | feb–apr | ✅ 2810 | 39 · 35 · 26 | Sosia: ranuncoli (in catalogo), Calta palustre (in catalogo, Zone umide). |
| 15 | **Ambretta**<br>*Knautia sp.* | genere | comune | viola | apr–set | ✅ 659 | 68 · 17 · 15 | Sosia: Scabiosa (→ altro). |
| 16 | **Ginestrino**<br>*Lotus corniculatus* | specie | comune | giallo | apr–set | ✅ 1648 | 72 · 24 · 4 | Sosia: Hippocrepis comosa, altri Lotus (→ altro). |
| 17 | **Geranio sanguigno**<br>*Geranium sanguineum* | specie | non comune | rosa | apr–giu | ✅ 1080 | 55 · 30 · 14 |   |
| 18 | **Garofano dei certosini**<br>*Dianthus gr. carthusianorum* | gruppo | non comune | rosa | mag–ott | ✅ 1000 | 44 · 51 · 5 | Gruppo. |
| 19 | **Anemone stellata**<br>*Anemone hortensis* | specie | non comune | rosa, viola | feb–apr | ✅ 1682 | 4 · 47 · 49 | Sosia: Anemone dei fiorai (in catalogo, Macchia). |
| 20 | **Narciso nostrale**<br>*Narcissus tazetta* | specie | non comune | bianco, giallo | dic–apr | ✅ 444 | 5 · 40 · 54 | Sosia: narcisi coltivati (→ altro). |
| 21 | **Cresta di gallo**<br>*Rhinanthus sp.* | genere | non comune | giallo | mag–ago | ✅ 871 | 72 · 24 · 4 | Genere. |
| 22 | **Vulneraria**<br>*Anthyllis vulneraria* | specie | non comune | giallo | apr–ago | ✅ 2196 | 52 · 17 · 31 |   |
| 23 | **Fritillaria**<br>*Fritillaria sp. (spontanee)* | gruppo | **leggendaria** | viola | apr–mag | 🟡 113 (UE 5103) | 19 · 74 · 7 | Gruppo delle fritillarie spontanee; la corona imperiale dei giardini va in 'altro'. |
| 24 | **Trifoglio bianco**<br>*Trifolium repens* | specie | comune | bianco | apr–ago | ✅ 2438 | 41 · 35 · 24 |   |

**Riserve**

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Cardamine dei prati**<br>*Cardamine pratensis* | specie | comune | rosa | mar–lug\* | 🟡 21 (UE 33065) | 100 · 0 · 0 |   |
| 02 | **Prunella comune**<br>*Prunella vulgaris* | specie | comune | viola | giu–ott | ✅ 1513 | 51 · 36 · 13 | Sosia: Iva comune (in catalogo). |

## Campi e bordi di strada

_Fiori di campi coltivati, incolti, bordi delle strade e vecchi muri._

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Papavero comune**<br>*Papaver rhoeas* | specie | comune | rosso | apr–giu | ✅ 2836 | 23 · 42 · 35 | Sosia: Papaver dubium (→ altro). |
| 02 | **Fiordaliso**<br>*Centaurea cyanus* | specie | **leggendaria** | blu | apr–lug | ✅ 409 | 50 · 43 · 7 | Frequente anche nei miscugli di fiori seminati. Sosia: Fiordaliso montano (in catalogo, Montagna). |
| 03 | **Cicoria selvatica**<br>*Cichorium intybus* | specie | comune | azzurro | mag–nov | ✅ 2266 | 22 · 55 · 24 | Sosia: Lactuca perennis (→ altro). |
| 04 | **Viperina azzurra**<br>*Echium vulgare* | specie | comune | blu, viola | apr–set | ✅ 2526 | 42 · 43 · 15 | Sosia: Echium plantagineum (→ altro). |
| 05 | **Vilucchio comune**<br>*Convolvulus arvensis* | specie | comune | bianco, rosa | mag–ago | ✅ 2888 | 27 · 47 · 26 | Sosia: Vilucchio bianco (in catalogo, Zone umide), Soldanella marittima (in catalogo, Coste). |
| 06 | **Malva selvatica**<br>*Malva sylvestris* | specie | comune | rosa, viola | mar–nov | ✅ 2956 | 19 · 61 · 20 | Sosia: Malva neglecta, Malva olbia (→ altro). |
| 07 | **Linajola comune**<br>*Linaria vulgaris* | specie | comune | giallo, arancio | lug–nov | ✅ 1834 | 34 · 58 · 8 |   |
| 08 | **Verbasco**<br>*Verbascum sp.* | genere | comune | giallo | mag–ott | ✅ 3167 | 27 · 42 · 32 | Genere: le specie si distinguono a fatica dalle foto. |
| 09 | **Silene rigonfia**<br>*Silene vulgaris* | specie | comune | bianco | apr–ott | ✅ 2933 | 46 · 22 · 31 |   |
| 10 | **Fiorrancio selvatico**<br>*Calendula arvensis* | specie | comune | arancio | dic–apr | ✅ 926 | 3 · 58 · 39 | Sosia: Calendula (in catalogo, Orto). |
| 11 | **Gladiolo dei campi**<br>*Gladiolus italicus* | specie | non comune | rosa, viola | apr–mag | ✅ 766 | 12 · 48 · 40 |   |
| 12 | **Erba di San Giovanni**<br>*Hypericum perforatum* | specie | comune | giallo | mag–ago | ✅ 1829 | 31 · 48 · 21 | Sosia: altri Hypericum (→ altro). |
| 13 | **Cardo mariano**<br>*Silybum marianum* | specie | comune | viola | apr–giu | ✅ 1460 | 11 · 55 · 34 |   |
| 14 | **Damigella scapigliata**<br>*Nigella damascena* | specie | non comune | azzurro | apr–giu | ✅ 635 | 8 · 58 · 35 |   |
| 15 | **Cipollaccio**<br>*Leopoldia comosa* | specie | comune | viola | apr–mag | ✅ 2785 | 21 · 45 · 33 | Sosia: Muscari (in catalogo, Prati). |
| 16 | **Falsa ortica purpurea**<br>*Lamium purpureum* | specie | comune | viola, rosa | feb–apr | ✅ 2713 | 60 · 32 · 8 | Sosia: Lamium amplexicaule (→ altro). |
| 17 | **Cardo dei lanaioli**<br>*Dipsacus fullonum* | specie | comune | viola | giu–ago | ✅ 1377 | 23 · 52 · 25 |   |
| 18 | **Carota selvatica**<br>*Daucus carota* | specie | comune | bianco | mag–ago, ott | ✅ 2025 | 17 · 33 · 50 | Sosia rischiosi: altre ombrellifere bianche (Ammi, Orlaya, Torilis → altro). |
| 19 | **Enotera**<br>*Oenothera sp.* | genere | comune | giallo | mag–nov | 🟡 292 (UE 15559) | 46 · 38 · 17 | Genere; specie aliene naturalizzate. |
| 20 | **Ciombolino comune**<br>*Cymbalaria muralis* | specie | comune | viola | mar–ago, ott | ✅ 3390 | 26 · 53 · 21 | Sui vecchi muri. |
| 21 | **Bocca di leone**<br>*Antirrhinum majus* | specie | comune | rosa | apr–ott | ✅ 342 | 29 · 46 · 25 | Sui muri e nei giardini. |
| 22 | **Cicerchia a foglie larghe**<br>*Lathyrus latifolius* | specie | comune | rosa | mag–set | ✅ 593 | 23 · 65 · 12 | Sosia: Lathyrus sylvestris (→ altro). |
| 23 | **Barba di becco violetta**<br>*Tragopogon porrifolius* | specie | non comune | viola | apr–mag | 🟡 191 (UE 2755) | 8 · 38 · 55 |   |
| 24 | **Specchio di Venere**<br>*Legousia speculum-veneris* | specie | non comune | viola | mag–giu | 🟡 279 (UE 1060) | 23 · 47 · 31 |   |
| 25 | **Crisantemo coronario**<br>*Glebionis coronaria* | specie | comune | giallo | feb–mag | 🟡 237 (UE 4489) | 0 · 5 · 94 | Sosia: altre composite gialle (→ altro). |
| 26 | **Saponaria comune**<br>*Saponaria officinalis* | specie | comune | rosa | giu–ott | ✅ 1418 | 58 · 27 · 15 |   |
| 27 | **Buglossa azzurra**<br>*Anchusa azurea* | specie | non comune | blu | apr–giu | 🟡 234 (UE 2678) | 4 · 48 · 48 | Sosia: Borragine (in catalogo, Orto). |
| 28 | **Tulipano selvatico**<br>*Tulipa sylvestris* | specie | non comune | giallo | mar–giu | ✅ 391 | 69 · 16 · 15 | Sosia: Tulipano da giardino (in catalogo, Giardini). |
| 29 | **Finocchio selvatico**<br>*Foeniculum vulgare* | specie | comune | giallo | giu–ott | ✅ 904 | 3 · 44 · 53 |   |
| 30 | **Borragine**<br>*Borago officinalis* | specie | comune | blu | feb–mag | ✅ 2083 | 7 · 49 · 44 | Anche spontanea nei campi. Sosia: Buglossa azzurra (in catalogo, Campi). |

**Riserve**

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Adonide**<br>*Adonis sp. (rosse)* | gruppo | non comune | rosso | apr–giu\* | 🟡 67 (UE 2538) | 11 · 55 · 34 | Gruppo delle adonidi rosse dei campi di cereali. |
| 02 | **Mordigallina**<br>*Lysimachia arvensis* | specie | comune | rosso, blu | apr–lug | ✅ 1897 | 13 · 40 · 47 | Fiore piccolo, circa 1 cm. |
| 03 | **Speronella**<br>*Consolida sp.* | gruppo | non comune | viola, blu | mag–ago, ott | 🟡 194 (UE 10906) | 38 · 50 · 12 |   |

## Montagna e pascoli alpini

_Pascoli, rocce e pendii di montagna, in gran parte sopra i 1000 m._

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Stella alpina**<br>*Leontopodium nivale* | specie | **leggendaria** | bianco | giu–ago | ✅ 2177 | 88 · 12 · 0 |   |
| 02 | **Genziana a trombetta**<br>*Gentiana gr. acaulis* | gruppo | non comune | blu | apr–lug | ✅ 2120 | 99 · 1 · 0 | Gruppo: G. acaulis e G. clusii si distinguono solo dal calice. |
| 03 | **Genziana maggiore**<br>*Gentiana lutea* | specie | non comune | giallo | giu–ago | ✅ 601 | 47 · 41 · 12 |   |
| 04 | **Botton d'oro**<br>*Trollius europaeus* | specie | comune | giallo | mag–lug | ✅ 1404 | 98 · 2 · 0 |   |
| 05 | **Arnica**<br>*Arnica montana* | specie | non comune | arancio, giallo | giu–ago | ✅ 925 | 100 · 0 · 0 | Sosia: Doronicum, Senecio doronicum (→ altro). |
| 06 | **Croco primaverile**<br>*Crocus vernus* | specie | comune | viola, bianco | feb–giu | ✅ 1292 | 58 · 32 · 10 | Sosia: Colchico d'autunno (in catalogo, velenoso), Zafferano (in catalogo, Orto). |
| 07 | **Soldanella**<br>*Soldanella sp.* | genere | comune | viola | apr–lug | ✅ 1102 | 93 · 3 · 4 | Genere. |
| 08 | **Rododendro alpino**<br>*Rhododendron ferrugineum / hirsutum* | gruppo | comune | rosa, rosso | giu–ago | ✅ 2633 | 100 · 0 · 0 | Gruppo: le due specie differiscono per le foglie. |
| 09 | **Pulsatilla alpina**<br>*Pulsatilla alpina* | specie | non comune | bianco, giallo | mag–giu | ✅ 1708 | 76 · 23 · 1 | Bianca, o gialla nella sottospecie apiifolia. Sosia: Pulsatilla vernalis (→ altro). |
| 10 | **Giglio martagone**<br>*Lilium martagon* | specie | non comune | rosa | giu–lug | ✅ 2189 | 81 · 17 · 2 |   |
| 11 | **Astro alpino**<br>*Aster alpinus* | specie | non comune | viola | giu–ago | ✅ 970 | 81 · 19 · 0 | Sosia: Erigeron alpinus (→ altro). |
| 12 | **Giglio di monte**<br>*Paradisea liliastrum* | specie | non comune | bianco | mag–giu | ✅ 570 | 100 · 0 · 0 | Sosia: Anthericum liliago (→ altro). |
| 13 | **Campanula barbata**<br>*Campanula barbata* | specie | comune | azzurro | giu–ago | ✅ 1175 | 100 · 0 · 0 |   |
| 14 | **Genziana primaticcia**<br>*Gentiana verna* | specie | comune | blu | apr–lug | ✅ 1564 | 63 · 32 · 4 | Sosia: Gentiana brachyphylla, G. bavarica, G. nivalis (→ altro). |
| 15 | **Viola speronata**<br>*Viola calcarata* | specie | comune | viola | apr–lug | 🟡 217 (UE 971, mondo 973) | 99 · 1 · 0 |   |
| 16 | **Silene a cuscinetto**<br>*Silene acaulis* | specie | comune | rosa | giu–ago | ✅ 1350 | 88 · 11 · 1 |   |
| 17 | **Camedrio alpino**<br>*Dryas octopetala* | specie | comune | bianco | mag–ago | ✅ 1294 | 87 · 12 · 1 |   |
| 18 | **Ranuncolo dei ghiacciai**<br>*Ranunculus glacialis* | specie | non comune | bianco, rosa | giu–ago | ✅ 476 | 100 · 0 · 0 |   |
| 19 | **Sassifraga a foglie opposte**<br>*Saxifraga oppositifolia* | specie | non comune | viola | apr–ago | ✅ 456 | 84 · 15 · 1 |   |
| 20 | **Primula orecchia d'orso**<br>*Primula auricula* | specie | non comune | giallo | apr–giu | ✅ 425 | 64 · 29 · 7 |   |
| 21 | **Linajola alpina**<br>*Linaria alpina* | specie | non comune | viola, arancio | giu–set | ✅ 925 | 94 · 6 · 0 |   |
| 22 | **Aconito napello**<br>*Aconitum napellus* | specie | comune | viola, blu | lug–set | 🟡 299 (UE 3325) | 100 · 0 · 0 | Velenoso. |
| 23 | **Astranzia maggiore**<br>*Astrantia major* | specie | comune | bianco, rosa | giu–ago | ✅ 868 | 97 · 3 · 0 |   |
| 24 | **Raponzolo**<br>*Phyteuma sp.* | genere | comune | blu, viola | mag–ago | ✅ 4047 | 94 · 6 · 1 | Genere. |
| 25 | **Giglio di San Giovanni**<br>*Lilium bulbiferum* | specie | non comune | arancio | giu–lug | ✅ 1852 | 52 · 37 · 11 | Sosia: Emerocallide (in catalogo, Giardini). |
| 26 | **Bistorta**<br>*Bistorta officinalis* | specie | comune | rosa | mag–set | ✅ 881 | 95 · 4 · 1 |   |
| 27 | **Garofanino maggiore**<br>*Chamaenerion angustifolium* | specie | comune | rosa | lug–set | ✅ 1891 | 84 · 9 · 7 | Sosia: Garofanino d'acqua (in catalogo, Zone umide). |
| 28 | **Pinguicola**<br>*Pinguicula sp.* | genere | non comune | viola | apr–lug | ✅ 1427 | 86 · 6 · 8 | Genere; pianta carnivora delle rocce umide. |
| 29 | **Fiordaliso montano**<br>*Centaurea gr. montana* | gruppo | comune | blu, viola | mag–ago | ✅ 777 | 48 · 44 · 9 | Sosia: Fiordaliso (in catalogo, Campi). |
| 30 | **Semprevivo**<br>*Sempervivum sp.* | genere | comune | rosa | giu–ago | ✅ 2884 | 75 · 20 · 5 | Genere. |

**Riserve**

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Globularia**<br>*Globularia sp.* | genere | non comune | blu | mar–lug | ✅ 2021 | 53 · 39 · 8 |   |
| 02 | **Genziana di Esculapio**<br>*Gentiana asclepiadea* | specie | non comune | blu | ago–set | ✅ 1073 | 97 · 3 · 0 |   |

## Macchia mediterranea e coste

_Macchia, garighe, dune e scogliere._

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Cisto rosso**<br>*Cistus creticus* | specie | comune | rosa | apr–giu | ✅ 1529 | 1 · 43 · 57 | Sosia: Cistus albidus (→ altro). |
| 02 | **Mirto**<br>*Myrtus communis* | specie | comune | bianco | mag–lug, ott | ✅ 1107 | 3 · 34 · 63 |   |
| 03 | **Lavanda selvatica**<br>*Lavandula stoechas* | specie | comune | viola | mar–mag | ✅ 439 | 2 · 40 · 58 | Sosia: Lavanda (in catalogo, Orto). |
| 04 | **Ginestra comune**<br>*Spartium junceum* | specie | comune | giallo | apr–lug | ✅ 2018 | 9 · 53 · 37 | Sosia: Cytisus scoparius, Genista, Calicotome (→ altro). |
| 05 | **Asfodelo**<br>*Asphodelus sp.* | genere | comune | bianco | feb–giu | ✅ 1583 | 5 · 23 · 72 | Genere. |
| 06 | **Valeriana rossa**<br>*Centranthus ruber* | specie | comune | rosso, rosa | apr–ott | ✅ 2537 | 16 · 30 · 53 | Comune anche sui muri delle città. |
| 07 | **Cappero**<br>*Capparis spinosa* | specie | non comune | bianco, rosa | mag–set | ✅ 630 | 8 · 49 · 43 |   |
| 08 | **Fico degli Ottentotti**<br>*Carpobrotus sp.* | genere | comune | rosa, giallo | apr–mag | ✅ 496 | 2 · 29 · 69 | Genere; specie aliena invasiva delle coste. |
| 09 | **Papavero cornuto**<br>*Glaucium flavum* | specie | non comune | giallo | apr–ago | ✅ 768 | 1 · 16 · 83 |   |
| 10 | **Soldanella marittima**<br>*Calystegia soldanella* | specie | non comune | rosa | apr–giu | ✅ 367 | 9 · 37 · 53 | Sosia: Vilucchio comune (in catalogo, Campi). |
| 11 | **Calcatreppola marittima**<br>*Eryngium maritimum* | specie | non comune | azzurro | mag–ago | ✅ 928 | 4 · 26 · 70 |   |
| 12 | **Giglio di mare**<br>*Pancratium maritimum* | specie | non comune | bianco | lug–ott | ✅ 1461 | 0 · 25 · 75 |   |
| 13 | **Cisto femmina**<br>*Cistus salviifolius* | specie | comune | bianco | apr–mag | ✅ 1643 | 7 · 37 · 56 | Sosia: Cistus monspeliensis (→ altro). |
| 14 | **Fico d'India**<br>*Opuntia ficus-indica* | specie | comune | giallo, arancio | mag–giu | ✅ 1227 | 2 · 11 · 87 |   |
| 15 | **Salvione giallo**<br>*Phlomis fruticosa* | specie | non comune | giallo | mar–mag\* | 🟡 249 (UE 1235) | 1 · 4 · 94 |   |
| 16 | **Anemone dei fiorai**<br>*Anemone coronaria* | specie | non comune | rosso, blu, bianco | feb–apr | 🟡 254 (UE 1478) | 2 · 66 · 32 | Sosia: Anemone stellata (in catalogo, Prati). |
| 17 | **Erica arborea**<br>*Erica arborea* | specie | comune | bianco | mar–mag | ✅ 1062 | 12 · 52 · 36 |   |
| 18 | **Santolina delle spiagge**<br>*Achillea maritima* | specie | non comune | giallo | mag–set, nov | ✅ 335 | 0 · 21 · 79 |   |
| 19 | **Ravastrello marino**<br>*Cakile maritima* | specie | comune | rosa | mar–gen | ✅ 971 | 7 · 34 · 59 |   |
| 20 | **Limonio**<br>*Limonium sp.* | genere | comune | viola | giu–ott | ✅ 570 | 5 · 26 · 69 | Genere: molte specie endemiche, indistinguibili in foto. |
| 21 | **Violacciocca**<br>*Matthiola sp.* | genere | non comune | viola, rosa | feb, apr–giu | ✅ 443 | 8 · 16 · 76 | Genere. |
| 22 | **Elicriso**<br>*Helichrysum sp.* | gruppo | comune | giallo | mag–ago | ✅ 663 | 7 · 58 · 35 | Gruppo. Sosia: Santolina delle spiagge (in catalogo). |
| 23 | **Camedrio femmina**<br>*Teucrium fruticans* | specie | non comune | azzurro | dic–giu | ✅ 308 | 0 · 29 · 70 |   |
| 24 | **Tamerice**<br>*Tamarix sp.* | genere | comune | rosa | apr–mag\* | 🟡 54 (UE 1752) | 6 · 15 · 79 | Genere. |
| 25 | **Agnocasto**<br>*Vitex agnus-castus* | specie | non comune | viola | giu–set | 🟡 220 (UE 2773) | 3 · 17 · 81 |   |

**Riserve**

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Erica multiflora**<br>*Erica multiflora* | specie | non comune | rosa | ott–gen | 🟡 224 (UE 2917) | 0 · 56 · 44 | Fiorisce in autunno. |

## Boschi e sottobosco

_Boschi e radure; molte fioriture tra fine inverno e primavera, prima che gli alberi mettano le foglie._

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Anemone dei boschi**<br>*Anemone nemorosa* | specie | comune | bianco | mar–apr | ✅ 2446 | 80 · 19 · 1 | Sosia: Anemone trifolia (→ altro). |
| 02 | **Erba trinità**<br>*Hepatica nobilis* | specie | comune | blu, viola | gen–apr | ✅ 3406 | 73 · 23 · 4 |   |
| 03 | **Primula comune**<br>*Primula vulgaris* | specie | comune | giallo | gen–apr | ✅ 3410 | 61 · 30 · 8 | Sosia: Primula odorosa (in catalogo, Prati), Primula elatior (→ altro). |
| 04 | **Bucaneve**<br>*Galanthus nivalis* | specie | comune | bianco | gen–apr | ✅ 1163 | 49 · 38 · 13 | Sosia: Campanellino estivo (in catalogo, Zone umide), Leucojum vernum (→ altro). |
| 05 | **Dente di cane**<br>*Erythronium dens-canis* | specie | non comune | rosa | feb–mar | ✅ 1665 | 92 · 8 · 0 |   |
| 06 | **Polmonaria**<br>*Pulmonaria sp.* | genere | comune | rosa, blu | feb–mag | ✅ 1353 | 83 · 12 · 5 | Genere. |
| 07 | **Scilla silvestre**<br>*Scilla bifolia* | specie | comune | blu | feb–mag | ✅ 1492 | 44 · 39 · 18 | Sosia: altre Scilla e Chionodoxa coltivate (→ altro). |
| 08 | **Pervinca minore**<br>*Vinca minor* | specie | comune | blu, viola | feb–mag | ✅ 1968 | 73 · 18 · 9 | Sosia: Vinca major (→ altro). |
| 09 | **Ciclamino selvatico**<br>*Cyclamen sp. (spontanei)* | gruppo | comune | rosa | apr–mag, lug–nov | ✅ 4667 | 15 · 49 · 36 | Gruppo dei ciclamini spontanei. Sosia: Ciclamino da vaso (in catalogo, Giardini). |
| 10 | **Rosa di Natale**<br>*Helleborus niger* | specie | non comune | bianco | dic–apr | ✅ 1201 | 100 · 0 · 0 | Comune anche nei giardini. |
| 11 | **Aquilegia**<br>*Aquilegia sp.* | genere | non comune | blu, viola | apr–ago | ✅ 1784 | 92 · 6 · 2 | Genere. |
| 12 | **Peonia selvatica**<br>*Paeonia officinalis* | specie | **leggendaria** | rosa, rosso | apr–giu | ✅ 512 | 55 · 45 · 0 | Sosia: peonie coltivate (→ altro). |
| 13 | **Fior di stecco**<br>*Daphne mezereum* | specie | non comune | rosa | feb–giu | ✅ 1411 | 87 · 9 · 4 | Velenosa. |
| 14 | **Mughetto**<br>*Convallaria majalis* | specie | non comune | bianco | apr–mag | ✅ 690 | 97 · 2 · 1 | Velenoso. |
| 15 | **Cicerchia primaticcia**<br>*Lathyrus vernus* | specie | comune | viola, blu | mar–mag | ✅ 890 | 82 · 15 · 3 |   |
| 16 | **Anemone gialla**<br>*Anemone ranunculoides* | specie | non comune | giallo | mar–mag | ✅ 613 | 65 · 29 · 6 | Sosia: Favagello (in catalogo, Prati). |
| 17 | **Colombina**<br>*Corydalis sp.* | gruppo | comune | viola, bianco | mar–mag | ✅ 856 | 55 · 33 · 12 | Gruppo. |
| 18 | **Acetosella dei boschi**<br>*Oxalis acetosella* | specie | comune | bianco | mar–giu | ✅ 974 | 85 · 7 · 8 |   |
| 19 | **Erba roberta**<br>*Geranium robertianum* | specie | comune | rosa | mar–ago | ✅ 1927 | 57 · 25 · 18 | Sosia: Geranium purpureum (→ altro). |
| 20 | **Erba limona**<br>*Melittis melissophyllum* | specie | non comune | bianco, rosa | apr–giu | ✅ 1298 | 50 · 43 · 7 |   |
| 21 | **Digitale**<br>*Digitalis sp.* | genere | non comune | viola, giallo | giu–ago | ✅ 1480 | 30 · 44 · 26 | Genere; velenosa. |
| 22 | **Caprifoglio**<br>*Lonicera gr. caprifolium* | gruppo | comune | bianco, giallo, rosa | apr–giu | ✅ 2125 | 29 · 41 · 30 | Gruppo dei caprifogli rampicanti. |
| 23 | **Vitalba**<br>*Clematis vitalba* | specie | comune | bianco | giu–ott | ✅ 2917 | 31 · 48 · 21 | Sosia: Clematis flammula (→ altro). |
| 24 | **Sambuco**<br>*Sambucus nigra* | specie | comune | bianco | apr–giu | ✅ 3500 | 42 · 39 · 19 | Si colleziona la fioritura. Sosia: Sambucus ebulus (→ altro). |
| 25 | **Brugo**<br>*Calluna vulgaris* | specie | comune | rosa, viola | lug–ott | ✅ 1326 | 82 · 18 · 0 |   |
| 26 | **Erica carnicina**<br>*Erica carnea* | specie | comune | rosa | gen–giu | ✅ 1613 | 99 · 1 · 0 |   |

**Riserve**

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Falsa ortica macchiata**<br>*Lamium maculatum* | specie | comune | rosa | mar–mag | ✅ 1624 | 32 · 59 · 8 | Sosia: Falsa ortica purpurea (in catalogo, Campi). |
| 02 | **Campanula selvatica**<br>*Campanula trachelium* | specie | comune | viola | giu–ott | ✅ 1780 | 54 · 38 · 8 |   |

## Zone umide, fossi e laghi

_Rive, fossi, stagni e prati umidi._

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Giaggiolo acquatico**<br>*Iris pseudacorus* | specie | comune | giallo | apr–mag | ✅ 1242 | 50 · 38 · 12 |   |
| 02 | **Salcerella**<br>*Lythrum salicaria* | specie | comune | rosa, viola | giu–set | ✅ 2004 | 54 · 34 · 12 |   |
| 03 | **Calta palustre**<br>*Caltha palustris* | specie | comune | giallo | apr–lug | ✅ 729 | 88 · 4 · 8 | Sosia: Favagello (in catalogo, Prati). |
| 04 | **Nannufaro**<br>*Nuphar lutea* | specie | non comune | giallo | apr–set | 🟡 293 (UE 15393) | 73 · 21 · 6 |   |
| 05 | **Ninfea**<br>*Nymphaea sp.* | genere | non comune | bianco, rosa | apr–ott | ✅ 586† | 31 · 38 · 32 | Genere: la ninfea bianca spontanea e le ninfee ornamentali dei laghetti. |
| 06 | **Garofanino d'acqua**<br>*Epilobium hirsutum* | specie | comune | rosa | giu–ott | ✅ 810 | 42 · 35 · 23 | Sosia: Garofanino maggiore (in catalogo, Montagna). |
| 07 | **Mazza d'oro**<br>*Lysimachia vulgaris* | specie | comune | giallo | giu–ago | ✅ 504 | 80 · 14 · 7 | Sosia: Lysimachia punctata coltivata (→ altro). |
| 08 | **Consolida maggiore**<br>*Symphytum officinale* | specie | comune | viola, bianco | apr–ago, ott | ✅ 493 | 83 · 11 · 6 |   |
| 09 | **Balsamina ghiandolosa**<br>*Impatiens glandulifera* | specie | comune | rosa | giu–ott | ✅ 794 | 100 · 0 · 0 | Specie aliena invasiva lungo i fiumi. |
| 10 | **Trifoglio fibrino**<br>*Menyanthes trifoliata* | specie | non comune | bianco | apr–giu | 🟡 202 (UE 9692) | 98 · 2 · 0 |   |
| 11 | **Giunco fiorito**<br>*Butomus umbellatus* | specie | non comune | rosa | mag–ago | 🟡 189 (UE 8692) | 93 · 7 · 0 |   |
| 12 | **Campanellino estivo**<br>*Leucojum aestivum* | specie | non comune | bianco | mar–mag\* | 🟡 145 (UE 2715) | 65 · 15 · 20 | Sosia: Leucojum vernum (→ altro), Bucaneve (in catalogo, Boschi). |
| 13 | **Vilucchio bianco**<br>*Calystegia sepium* | specie | comune | bianco | mag–set | ✅ 530 | 50 · 36 · 14 | Sosia: Vilucchio comune (in catalogo, Campi). |
| 14 | **Fior di cuculo**<br>*Silene flos-cuculi* | specie | comune | rosa | mar–lug | ✅ 1335 | 44 · 50 · 6 |   |
| 15 | **Canapa acquatica**<br>*Eupatorium cannabinum* | specie | comune | rosa | lug–set | ✅ 1504 | 42 · 42 · 16 |   |
| 16 | **Olmaria**<br>*Filipendula ulmaria* | specie | comune | bianco | giu–ago, ott–nov | 🟡 280 (UE 45535) | 95 · 2 · 3 |   |
| 17 | **Ranuncolo acquatico**<br>*Ranunculus sect. Batrachium* | gruppo | comune | bianco | mar–ago | 🟡 104 (UE 1424) | 26 · 35 · 39 | Gruppo: indistinguibili dalle foto. |
| 18 | **Poligono anfibio**<br>*Persicaria amphibia* | specie | non comune | rosa | apr–set\* | 🟡 105 (UE 8523) | 44 · 23 · 32 |   |
| 19 | **Parnassia**<br>*Parnassia palustris* | specie | non comune | bianco | lug–set | ✅ 1289 | 94 · 5 · 1 |   |
| 20 | **Erba impaziente**<br>*Impatiens noli-tangere* | specie | non comune | giallo | lug–ago | 🟡 226 (UE 7842) | 90 · 9 · 2 |   |
| 21 | **Menta acquatica**<br>*Mentha aquatica* | specie | comune | viola, rosa | ago–ott | ✅ 331 | 38 · 34 · 29 | Sosia: altre mente (→ altro). |

**Riserve**

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Erba saetta**<br>*Sagittaria sagittifolia* | specie | non comune | bianco | giu–ott\* | 🟡 30 (UE 6601) | 100 · 0 · 0 |   |
| 02 | **Giaggiolo siberiano**<br>*Iris sibirica* | specie | **rara** | blu, viola | mag\* | 🟡 60 (UE 4290) | 100 · 0 · 0 |   |
| 03 | **Limnantemio**<br>*Nymphoides peltata* | specie | **rara** | giallo | giu–ott | 🟡 60 (UE 1657) | 71 · 25 · 4 |   |

## Bacche e colori d'autunno

_Frutti e semi da collezionare, più qualche fioritura d'autunno._

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Rosa canina**<br>*Rosa canina agg.* | gruppo | comune | rosso | ago–nov, gen | ✅ 476 | 49 · 34 · 17 | Gruppo: altre rose selvatiche hanno frutti simili. |
| 02 | **Biancospino**<br>*Crataegus monogyna* | specie | comune | rosso | ago–ott | ✅ 2021 | 32 · 49 · 18 | Sosia: Crataegus laevigata (→ altro), Piracanta e Cotognastro (in catalogo). |
| 03 | **Agazzino (piracanta)**<br>*Pyracantha sp.* | genere | comune | arancio, rosso | ago–nov | ✅ 562† | 25 · 50 · 26 | Sosia: Cotognastro (in catalogo). |
| 04 | **Berretta del prete**<br>*Euonymus europaeus* | specie | comune | rosa, arancio | set–dic | ✅ 2156 | 43 · 41 · 16 | Velenosa. |
| 05 | **Pungitopo**<br>*Ruscus aculeatus* | specie | comune | rosso | ott–mag | ✅ 3010 | 25 · 46 · 28 |   |
| 06 | **Corbezzolo**<br>*Arbutus unedo* | specie | comune | rosso, arancio | apr, set–nov | ✅ 1472 | 6 · 46 · 48 |   |
| 07 | **Alchechengi**<br>*Physalis alkekengi* | specie | non comune | arancio | ago–nov | ✅ 350 | 84 · 15 · 1 |   |
| 08 | **Pallon di maggio**<br>*Viburnum opulus* | specie | non comune | rosso | lug–ott | ✅ 613 | 97 · 3 · 1 | Sosia: Viburnum lantana (→ altro). |
| 09 | **Gigaro**<br>*Arum italicum* | specie | comune | arancio, rosso | giu–lug | ✅ 2429 | 18 · 54 · 28 | Velenoso. Sosia: Arum maculatum (→ altro). |
| 10 | **Sorbo degli uccellatori**<br>*Sorbus aucuparia* | specie | comune | arancio, rosso | ago–set | ✅ 1047 | 81 · 11 · 8 |   |
| 11 | **Agrifoglio**<br>*Ilex aquifolium* | specie | non comune | rosso | giu, ago–feb | ✅ 1345 | 37 · 33 · 30 | Velenoso. |
| 12 | **Giaggiolo puzzolente**<br>*Iris foetidissima* | specie | **leggendaria** | arancio, rosso | ott–feb | ✅ 312 | 31 · 46 · 23 | Si collezionano i semi rosso-arancio nelle capsule aperte. |
| 13 | **Corniolo**<br>*Cornus mas* | specie | comune | rosso | ago | ✅ 1150 | 45 · 46 · 9 |   |
| 14 | **Salsapariglia**<br>*Smilax aspera* | specie | comune | rosso | apr, ago–nov, gen | ✅ 1720 | 5 · 40 · 55 |   |
| 15 | **Dulcamara**<br>*Solanum dulcamara* | specie | comune | rosso, viola | lug–ott | ✅ 792 | 55 · 29 · 15 | Velenosa. |
| 16 | **Prugnolo**<br>*Prunus spinosa* | specie | comune | blu | lug–ott | ✅ 1572 | 24 · 60 · 17 |   |
| 17 | **Uva turca**<br>*Phytolacca americana* | specie | comune | viola, nero | ago–nov | ✅ 3691 | 47 · 37 · 16 | Specie aliena invasiva; velenosa. |
| 18 | **Crespino**<br>*Berberis vulgaris* | specie | non comune | rosso | ago–set | ✅ 494 | 91 · 6 · 3 |   |
| 19 | **Olivello spinoso**<br>*Hippophae rhamnoides* | specie | non comune | arancio | apr–ott\* | 🟡 130 (UE 13349) | 98 · 2 · 0 |   |
| 20 | **Mirtillo nero**<br>*Vaccinium myrtillus* | specie | comune | blu | lug–ago | ✅ 962 | 94 · 6 · 0 |   |
| 21 | **Mirtillo rosso**<br>*Vaccinium vitis-idaea* | specie | non comune | rosso | ago–ott | ✅ 710 | 100 · 0 · 0 |   |
| 22 | **Fragola di bosco**<br>*Fragaria vesca* | specie | comune | rosso | mag–lug | ✅ 1169 | 52 · 32 · 16 | Sosia: Potentilla indica (→ altro). |
| 23 | **Rovo (more)**<br>*Rubus gr. fruticosus* | gruppo | comune | nero, viola | lug–ago | ✅ 897 | 26 · 31 · 44 | Gruppo. |
| 24 | **Tasso**<br>*Taxus baccata* | specie | non comune | rosso | gen–nov\* | ✅ 527 | 38 · 31 · 31 | Velenoso. |
| 25 | **Cotognastro**<br>*Cotoneaster sp.* | genere | comune | rosso | ago–mar | ✅ 429† | 55 · 32 · 14 | Sosia: Piracanta (in catalogo). |
| 26 | **Colchico d'autunno**<br>*Colchicum autumnale* | specie | comune | rosa, viola | ago–ott | ✅ 1783 | 63 · 30 · 7 | Fioritura d'autunno; velenoso. Sosia: Croco primaverile e Zafferano (in catalogo). |
| 27 | **Zafferanastro giallo**<br>*Sternbergia lutea* | specie | non comune | giallo | set–ott | ✅ 414 | 8 · 39 · 53 | Fioritura d'autunno. |
| 28 | **Astro americano**<br>*Symphyotrichum sp.* | gruppo | comune | viola | set–ott | 🟡 92 (UE 2427) | 100 · 0 · 0 | Gruppo; specie aliene che fioriscono in autunno. |
| 29 | **Verga d'oro**<br>*Solidago sp.* | genere | comune | giallo | lug–ott | ✅ 1525 | 77 · 17 · 6 | Genere; fioritura di fine estate e autunno. |

**Riserve**

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Viburno lantana**<br>*Viburnum lantana* | specie | comune | rosso, nero | giu–ago | ✅ 1016 | 90 · 9 · 1 | Sosia: Pallon di maggio (in catalogo). |
| 02 | **Lacrime d'Italia**<br>*Symphoricarpos albus* | specie | comune | bianco | ago–nov\* | 🟡 60† (UE 13555) | 50 · 25 · 25 |   |

## Orchidee spontanee

_Tutte tutelate: si fotografano e non si raccolgono._

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Orchide minore**<br>*Anacamptis morio* | specie | comune | viola | apr–mag | ✅ 3742 | 14 · 42 · 43 | Sosia: Orchide maschia (in catalogo), Anacamptis laxiflora (→ altro). |
| 02 | **Orchide piramidale**<br>*Anacamptis pyramidalis* | specie | comune | rosa | mag–giu | ✅ 3138 | 19 · 46 · 35 | Sosia: Manina rosea (in catalogo). |
| 03 | **Orchide farfalla**<br>*Anacamptis papilionacea* | specie | non comune | rosa | mar–mag | ✅ 1690 | 2 · 28 · 70 |   |
| 04 | **Orchide maggiore**<br>*Orchis purpurea* | specie | comune | viola, rosa | apr–mag | ✅ 3406 | 22 · 67 · 10 | Sosia: Orchide militare (→ altro). |
| 05 | **Orchide scimmia**<br>*Orchis simia* | specie | non comune | rosa, bianco | apr–mag | ✅ 664 | 32 · 54 · 14 | Sosia: Orchide militare (→ altro). |
| 06 | **Orchide italiana**<br>*Orchis italica* | specie | non comune | rosa | apr–mag | ✅ 1105 | 0 · 20 · 80 |   |
| 07 | **Orchide maschia**<br>*Orchis mascula* | specie | comune | viola | apr–giu | ✅ 1910 | 50 · 28 · 22 | Sosia: Orchide minore (in catalogo). |
| 08 | **Orchide tridentata**<br>*Neotinea tridentata* | specie | non comune | rosa | apr–giu | ✅ 1743 | 27 · 41 · 31 |   |
| 09 | **Barlia**<br>*Himantoglossum robertianum* | specie | non comune | rosa, viola | dic–apr | ✅ 1273 | 17 · 18 · 65 | Fiorisce già a fine inverno. |
| 10 | **Ofride fior d'api**<br>*Ophrys apifera* | specie | non comune | rosa | mag–giu | ✅ 1375 | 16 · 53 · 31 | Sosia: altre Ophrys (→ altro). |
| 11 | **Ofride di Bertoloni**<br>*Ophrys bertolonii* | specie | non comune | rosa, viola | apr–mag | ✅ 1607 | 8 · 38 · 53 |   |
| 12 | **Ofride gialla**<br>*Ophrys gr. lutea* | gruppo | non comune | giallo | mar–mag | ✅ 941 | 0 · 7 · 93 | Gruppo. |
| 13 | **Ofride dei fuchi**<br>*Ophrys gr. fuciflora* | gruppo | non comune | rosa | apr–giu | ✅ 1663 | 22 · 37 · 41 | Gruppo. |
| 14 | **Ofride tentredinifera**<br>*Ophrys tenthredinifera* | specie | non comune | rosa | mar–mag | ✅ 969 | 0 · 5 · 95 |   |
| 15 | **Serapide**<br>*Serapias sp.* | genere | comune | rosso | apr–mag | ✅ 2305 | 6 · 35 · 59 | Genere. |
| 16 | **Cefalantera bianca**<br>*Cephalanthera longifolia / damasonium* | gruppo | comune | bianco | apr–giu | ✅ 2890 | 52 · 34 · 14 | Gruppo. |
| 17 | **Cefalantera rossa**<br>*Cephalanthera rubra* | specie | non comune | rosa | giu–lug | ✅ 550 | 36 · 43 · 21 |   |
| 18 | **Orchide sambucina**<br>*Dactylorhiza sambucina* | specie | non comune | giallo, rosso | apr–giu | ✅ 1807 | 42 · 41 · 17 | Gialla o rossa. |
| 19 | **Orchide macchiata**<br>*Dactylorhiza gr. maculata* | gruppo | comune | rosa | mag–lug | ✅ 2616 | 73 · 15 · 12 | Gruppo. |
| 20 | **Manina rosea**<br>*Gymnadenia conopsea* | specie | comune | rosa | mag–lug | ✅ 1879 | 71 · 25 · 4 | Sosia: Orchide piramidale (in catalogo). |
| 21 | **Nigritella**<br>*Nigritella sp.* | genere | non comune | rosso, rosa | giu–ago | ✅ 1051 | 97 · 2 · 1 | Tassonomia complicata, quindi livello di genere. |
| 22 | **Fior di legna**<br>*Limodorum abortivum* | specie | non comune | viola | mag–giu | ✅ 1007 | 32 · 37 · 31 | Orchidea senza foglie. |
| 23 | **Platantera**<br>*Platanthera bifolia / chlorantha* | gruppo | non comune | bianco | mag–lug | ✅ 1276 | 68 · 24 · 8 | Gruppo. |
| 24 | **Orchide globosa**<br>*Traunsteinera globosa* | specie | non comune | rosa | giu–lug | ✅ 530 | 99 · 1 · 0 | Sosia: Nigritella (in catalogo). |
| 25 | **Scarpetta di Venere**<br>*Cypripedium calceolus* | specie | **leggendaria** | giallo, viola | mag–giu | 🟡 238 (UE 5284) | 81 · 1 · 18 | Orchidea tutelata dalla Direttiva Habitat UE. |

**Riserve**

| # | Specie | Livello | Rarità | Colori | Periodo | Foto | N · C · S | Note |
|---|---|---|---|---|---|---|---|---|
| 01 | **Orchide militare**<br>*Orchis militaris* | specie | non comune | rosa | mag–giu | ✅ 513 | 75 · 22 · 3 | Sosia: Orchide scimmia e Orchide maggiore (in catalogo). |
| 02 | **Orchide cimicina**<br>*Anacamptis coriophora* | specie | non comune | rosso | mag–giu | 🟡 223 (UE 2542) | 45 · 48 · 6 |   |
| 03 | **Ofride fior di ragno**<br>*Ophrys gr. sphegodes* | gruppo | comune | viola | mar–mag | ✅ 2911 | 8 · 34 · 59 | Colori spenti: labello bruno e sepali verdi. |
| 04 | **Barbone**<br>*Himantoglossum hircinum / adriaticum* | gruppo | non comune | viola | mag–giu | ✅ 832 | 21 · 62 · 18 | Colori spenti (verde-bruno). |

## Note tecniche

- Nomi che iNaturalist tratta come sinonimi (i conteggi li includono): *Leopoldia comosa* → *Muscari comosum*; *Consolida regalis* → *Delphinium consolida*; *Consolida ajacis* → *Delphinium ajacis*; *Leontopodium alpinum* → *Leontopodium nivale alpinum*; *Crocus albiflorus* → *Crocus vernus*; *Otanthus maritimus* → *Achillea maritima maritima*; *Anemone nemorosa* → *Anemonoides nemorosa*; *Anemone hepatica* → *Hepatica nobilis*; *Anemone ranunculoides* → *Anemonoides ranunculoides*; *Physalis alkekengi* → *Alkekengi officinarum*; *Barlia robertiana* → *Himantoglossum robertianum*; *Ophrys phryganae* → *Ophrys lutea phryganae*; *Ophrys apulica* → *Ophrys fuciflora apulica*; *Ophrys incubacea* → *Ophrys sphegodes atrata*; *Ophrys passionis* → *Ophrys sphegodes passionis*.
- I conteggi sono osservazioni, non foto: un'osservazione ha di solito 1–4 foto. Per gli album di genere o gruppo nella fase ML si potranno usare anche osservazioni identificate solo a livello di genere.
- Il dettaglio per mese e per area è in `catalog/proposal/inat_stats.json`.

