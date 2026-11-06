"""Helpers shared by the FloraDeck catalog scripts (proposal, build, review)."""

from __future__ import annotations

import math

MONTHS_IT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"]

# A month counts when it has at least this share of the peak month's observations.
# Fruits need a higher bar: the iNaturalist annotation also covers unripe fruits.
PEAK_SHARE = {"flowering": 0.15, "fruiting": 0.35}
MIN_PHENOLOGY = 30  # with fewer annotated observations, fall back to all observations
MIN_AREA_TOTAL = 20  # with fewer observations, no north/centre/south split
AREA_KEYS = ("north", "center", "south")


def as_months(raw: dict | None) -> dict[int, int]:
    return {int(month): value for month, value in (raw or {}).items()}


def selected_months(stats: dict, phenology: str) -> tuple[list[int], bool]:
    """Months in which the collectible part is visible.

    Returns the months and whether the annotated observations were too few,
    so that all observations were used instead.
    """
    months = as_months(stats.get("itPhenologyMonths"))
    fallback = sum(months.values()) < MIN_PHENOLOGY
    if fallback:
        months = as_months(stats.get("itMonths"))
    peak = max(months.values(), default=0)
    if peak == 0:
        return [], fallback
    share = PEAK_SHARE[phenology]
    return sorted(m for m, v in months.items() if v >= share * peak), fallback


def compress_months(selected: set[int] | list[int]) -> str:
    """{11, 12, 1, 2} -> 'nov–feb'; handles ranges across the new year."""
    selected = set(selected)
    if not selected:
        return "—"
    if len(selected) == 12:
        return "tutto l'anno"
    first_gap = next(month for month in range(1, 13) if month not in selected)
    order = [(first_gap + offset - 1) % 12 + 1 for offset in range(1, 13)]
    runs: list[list[int]] = []
    run: list[int] = []
    for month in order:
        if month in selected:
            run.append(month)
        elif run:
            runs.append(run)
            run = []
    if run:
        runs.append(run)
    return ", ".join(
        MONTHS_IT[r[0] - 1] if len(r) == 1 else f"{MONTHS_IT[r[0] - 1]}–{MONTHS_IT[r[-1] - 1]}" for r in runs
    )


def area_shares(stats: dict, baseline: dict | None) -> list[int] | None:
    """North/centre/south percentages, corrected for observer density.

    Each area's share of the species' observations is divided by that area's
    share of all plant observations (the baseline), then renormalised, so
    [33, 33, 33] means "equally frequent everywhere".
    """
    areas = stats.get("areas") or {}
    total = sum(areas.values())
    if total < MIN_AREA_TOTAL:
        return None
    weights = [areas.get(a, 0) / total for a in AREA_KEYS]
    if baseline and all(baseline.get(a) for a in AREA_KEYS):
        base_total = sum(baseline[a] for a in AREA_KEYS)
        weights = [w / (baseline[a] / base_total) for w, a in zip(weights, AREA_KEYS)]
    weight_sum = sum(weights) or 1
    return [round(100 * w / weight_sum) for w in weights]


def regions_label(shares: list[int] | None) -> str:
    """Short Italian label for where in Italy the species is found."""
    if not shares:
        return ""
    north, centre, south = shares
    if min(shares) >= 15:
        return "Tutta Italia"
    if north >= 70:
        return "Soprattutto al Nord"
    if south >= 60:
        return "Soprattutto al Sud e nelle isole"
    if centre >= 60:
        return "Soprattutto al Centro"
    if south < 15:
        return "Nord e Centro"
    if north < 15:
        return "Centro, Sud e isole"
    return "Tutta Italia"


def altitude_label(elevation: dict | None) -> str:
    """'0–1300 m' from the 5th–95th percentile of observation altitudes."""
    if not elevation or elevation.get("p05") is None or elevation.get("p95") is None:
        return ""
    low = max(0, math.floor(elevation["p05"] / 100) * 100)
    high = max(100, math.ceil(elevation["p95"] / 100) * 100)
    return f"{low}–{high} m"
