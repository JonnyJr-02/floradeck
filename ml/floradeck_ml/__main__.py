from .cli import main

if __name__ == "__main__":  # also keeps worker processes from re-running the CLI
    raise SystemExit(main())
