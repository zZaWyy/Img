import sys

USAGE = """Uso:
  python -m reviewbot run                  # ciclo Google (respeta DRY_RUN)
  python -m reviewbot auth                 # obtener GBP_REFRESH_TOKEN (una vez)
  python -m reviewbot tripadvisor FILE     # generar borradores para TripAdvisor
"""


def main():
    if len(sys.argv) < 2:
        print(USAGE)
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "run":
        from .main import run
        run()
    elif cmd == "auth":
        from .gbp import interactive_auth
        interactive_auth()
    elif cmd == "tripadvisor":
        if len(sys.argv) < 3:
            print(USAGE)
            sys.exit(1)
        from .tripadvisor import run
        run(sys.argv[2])
    else:
        print(USAGE)
        sys.exit(1)


if __name__ == "__main__":
    main()
