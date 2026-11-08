"""Small factories shared by the tests."""

from __future__ import annotations

from floradeck_ml.catalog import CatalogClass
from floradeck_ml.records import INAT, Observation, Photo

HOST = "inaturalist-open-data.s3.amazonaws.com"


def photo(photo_id: int | str, license: str = "cc-by", width: int | None = 2000, height: int | None = 1500) -> Photo:
    return Photo(
        id=str(photo_id),
        url=f"https://{HOST}/photos/{photo_id}/medium.jpg",
        license=license,
        attribution=f"(c) someone, some rights reserved ({license})",
        width=width,
        height=height,
    )


def observation(obs_id: int, observer: int | str = 1, photos: tuple[Photo, ...] | None = None, **extra) -> Observation:
    return Observation(
        provider=INAT,
        id=str(obs_id),
        observer_id=str(observer),
        observer_login=f"user{observer}",
        observer_name=f"User {observer}",
        taxon_id=extra.pop("taxon_id", 1),
        taxon_name=extra.pop("taxon_name", "Testus testus"),
        quality=extra.pop("quality", "research"),
        observed_on="2026-05-01",
        page_url=f"https://www.inaturalist.org/observations/{obs_id}",
        photos=photos if photos is not None else (photo(obs_id * 10),),
        extra=extra,
    )


def catalog_class(
    class_id: str = "bellis-perennis",
    *,
    taxon_ids: tuple[int, ...] = (55563,),
    level: str = "species",
    cultivated: bool = False,
    phenology: tuple[str, ...] = ("flowering",),
    months: tuple[int, ...] = (3, 4, 5),
) -> CatalogClass:
    return CatalogClass(
        id=class_id,
        scientific_name=class_id,
        taxon_level=level,
        taxon_ids=taxon_ids,
        model_labels=(class_id,),
        cultivated=cultivated,
        phenology=phenology,
        months=months,
        lookalikes_outside=(),
        album_id="prati-primavera",
        rarity="common",
    )
