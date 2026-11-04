"""Executa os testes nativos no Chrome headless, sem instalar dependências."""
from functools import partial
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import shutil
import subprocess
import sys
import tempfile
import threading


class Results(HTMLParser):
    def __init__(self):
        super().__init__()
        self.active = False
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag == "pre" and dict(attrs).get("id") == "results":
            self.active = True

    def handle_endtag(self, tag):
        if tag == "pre":
            self.active = False

    def handle_data(self, data):
        if self.active:
            self.parts.append(data)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


root = Path(__file__).resolve().parent.parent
chrome = next((str(path) for path in [
    Path(os.environ.get("PROGRAMFILES", "C:/Program Files")) / "Google/Chrome/Application/chrome.exe",
    Path(os.environ.get("PROGRAMFILES(X86)", "C:/Program Files (x86)")) / "Microsoft/Edge/Application/msedge.exe",
] if path.is_file()), shutil.which("chromium") or shutil.which("google-chrome"))
if not chrome:
    sys.exit("Chrome/Edge não encontrado. Abra os testes HTML no navegador com servidor HTTP.")

server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
failed = False
try:
    suites = ["item-tests.html", "combat-tests.html", "storage-tests.html?isolated=1"]
    if "--live" in sys.argv:
        suites.append("combat-tests.html?live=1")
    selected = next((arg.split("=", 1)[1] for arg in sys.argv if arg.startswith("--suite=")), None)
    if selected:
        suites = [suite for suite in suites if suite.split(".html")[0] == selected]
        if not suites:
            raise ValueError("Suíte desconhecida: " + selected)
    for suite in suites:
        with tempfile.TemporaryDirectory(prefix="danmachi-test-") as profile:
            # Confere o destino antes da limpeza recursiva feita pelo contexto temporário.
            profile_path = Path(profile).resolve()
            assert profile_path.is_relative_to(Path(tempfile.gettempdir()).resolve())
            assert profile_path.name.startswith("danmachi-test-")
            process = subprocess.run([
                chrome, "--headless", "--no-first-run", "--no-default-browser-check",
                "--user-data-dir=" + profile, "--dump-dom", "--virtual-time-budget=20000",
                f"http://127.0.0.1:{server.server_port}/docs/{suite}",
            ], capture_output=True, timeout=55,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
            parsed = Results()
            parsed.feed(process.stdout.decode("utf-8", errors="replace"))
            report = "".join(parsed.parts)
            print(f"\n{suite}\n{report or 'Sem resultado do navegador'}")
            if process.returncode or "DONE:" not in report or "FAIL:" in report:
                failed = True
                print(process.stderr.decode("utf-8", errors="replace")[-1500:])
finally:
    server.shutdown()
    server.server_close()
sys.exit(1 if failed else 0)
