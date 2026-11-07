"""Convert floradeck_train.py (cells marked with ``# %%``) into floradeck-train.ipynb for Kaggle.

Run from the repository root: ``py -3.13 ml/kaggle/make_notebook.py``. Standard library only.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "floradeck_train.py"
TARGET = HERE / "floradeck-train.ipynb"


def cells(text: str) -> list[dict]:
    result = []
    for chunk in re.split(r"^# %%", text, flags=re.MULTILINE)[1:]:
        header, _, body = chunk.partition("\n")
        if header.strip() == "[markdown]":
            lines = [line[2:] if line.startswith("# ") else line.lstrip("#") for line in body.strip("\n").split("\n")]
            result.append({"cell_type": "markdown", "metadata": {}, "source": _lines("\n".join(lines))})
        else:
            result.append({"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [],
                           "source": _lines(body.strip("\n"))})
    return result


def _lines(text: str) -> list[str]:
    parts = text.split("\n")
    return [line + "\n" for line in parts[:-1]] + [parts[-1]]


def main() -> None:
    notebook = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python"},
            "kaggle": {"accelerator": "nvidiaTeslaT4", "isGpuEnabled": True, "isInternetEnabled": True,
                       "language": "python", "sourceType": "notebook"},
        },
        "cells": cells(SOURCE.read_text(encoding="utf-8")),
    }
    for i, cell in enumerate(notebook["cells"]):
        cell["id"] = f"cell-{i:02d}"
    TARGET.write_text(json.dumps(notebook, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(f"Wrote {TARGET} ({len(notebook['cells'])} cells)")


if __name__ == "__main__":
    main()
