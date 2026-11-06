"""Taxonomy checks that keep classes apart (pure functions over iNaturalist ancestry).

iNaturalist's ``ancestor_ids`` lists the whole lineage and ends with the taxon itself.
A query on a taxon also returns all its descendants, so:

- a class whose taxon contains another class's taxon must exclude it
  (``without_taxon_id``), or the same observations would land in both;
- an "altro" taxon inside a catalogue taxon is skipped (its photos belong to a class),
  and one that contains catalogue taxa excludes them.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from typing import Any

from .catalog import CatalogClass


def lineage(taxon: dict[str, Any] | None) -> set[int]:
    """Ancestors of a taxon, the taxon included."""
    if not taxon:
        return set()
    ids = {int(i) for i in taxon.get("ancestor_ids") or []}
    if taxon.get("id") is not None:
        ids.add(int(taxon["id"]))
    return ids


def taxon_owner(classes: Sequence[CatalogClass]) -> dict[int, str]:
    return {taxon_id: cls.id for cls in classes for taxon_id in cls.taxon_ids}


def nested_exclusions(classes: Sequence[CatalogClass], taxa: dict[int, dict[str, Any]]) -> dict[str, set[int]]:
    """For each class, the taxa of *other* classes that sit inside one of its taxa."""
    owner = taxon_owner(classes)
    exclusions: dict[str, set[int]] = {}
    for taxon_id, class_id in owner.items():
        for ancestor in lineage(taxa.get(taxon_id)) - {taxon_id}:
            container = owner.get(ancestor)
            if container is not None and container != class_id:
                exclusions.setdefault(container, set()).add(taxon_id)
    return exclusions


def catalog_classes_containing(taxon: dict[str, Any], owner: dict[int, str]) -> set[str]:
    """Catalogue classes that already include this taxon (it is the class taxon or inside it)."""
    return {owner[i] for i in lineage(taxon) if i in owner}


def catalog_taxa_inside(taxon_id: int, catalog_taxa: dict[int, dict[str, Any]]) -> set[int]:
    """Catalogue taxa strictly inside ``taxon_id``: to exclude when querying it."""
    return {cid for cid, taxon in catalog_taxa.items() if cid != taxon_id and taxon_id in lineage(taxon)}


def class_of(ancestor_ids: Iterable[int], owner: dict[int, str]) -> str | None:
    """The catalogue class an observation belongs to, from its taxon's lineage."""
    for taxon_id in reversed(list(ancestor_ids)):  # most specific first
        if taxon_id in owner:
            return owner[taxon_id]
    return None
