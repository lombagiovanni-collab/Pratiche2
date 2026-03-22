#!/usr/bin/env python3
"""
Watcher Automatico – Decisioni ABF
====================================
Monitora la cartella "Decisioni ABF Utili" e, ogni volta che viene
aggiunto un nuovo PDF, lo elabora automaticamente:
  1. Rinomina il file (ABF Milano n. 5647-2025 (15.03.2025).pdf)
  2. Crea la sintesi Word in Sintesi/

Avvio manuale:
    python3 watcher_decisioni_abf.py [percorso_cartella]

Avvio automatico all'accensione del PC:
    Vedi setup_avvio_automatico.sh
"""

import sys
import time
import logging
from pathlib import Path

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Importa la logica di elaborazione dallo script principale
sys.path.insert(0, str(Path(__file__).parent))
from elabora_decisioni_abf import (
    extract_text, find_collegio, find_numero, find_data,
    build_filename, summarize_with_claude, summarize_fallback,
    create_word_summary, DEFAULT_FOLDER
)

import os, shutil

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(message)s",
    datefmt="%d/%m/%Y %H:%M:%S",
)
log = logging.getLogger("ABF-Watcher")

# ── Handler eventi cartella ───────────────────────────────────────────────────

class ABFHandler(FileSystemEventHandler):
    def __init__(self, folder: Path):
        self.folder = folder
        self.sintesi_dir = folder / "Sintesi"
        self.sintesi_dir.mkdir(exist_ok=True)
        self.use_claude = bool(os.getenv("ANTHROPIC_API_KEY"))
        # Evita di elaborare due volte lo stesso file (rename genera un evento)
        self._processing = set()

    def on_created(self, event):
        if event.is_directory:
            return
        path = Path(event.src_path)
        self._maybe_process(path)

    def on_moved(self, event):
        """Gestisce anche il 'salva con nome' che su Linux appare come move."""
        if event.is_directory:
            return
        path = Path(event.dest_path)
        self._maybe_process(path)

    def _maybe_process(self, path: Path):
        # Solo PDF, non nella sottocartella Sintesi, non già in elaborazione
        if path.suffix.lower() != ".pdf":
            return
        if self.sintesi_dir in path.parents:
            return
        if str(path) in self._processing:
            return
        # Aspetta che il file sia completamente scritto (fino a 5 secondi)
        if not self._wait_for_file(path):
            return
        self._processing.add(str(path))
        try:
            self._process(path)
        finally:
            self._processing.discard(str(path))

    def _wait_for_file(self, path: Path, timeout: float = 5.0) -> bool:
        """Attende che il file non cresca più di dimensione (scrittura completata)."""
        prev_size = -1
        elapsed = 0.0
        while elapsed < timeout:
            try:
                curr_size = path.stat().st_size
            except FileNotFoundError:
                return False
            if curr_size == prev_size and curr_size > 0:
                return True
            prev_size = curr_size
            time.sleep(0.5)
            elapsed += 0.5
        return path.exists() and path.stat().st_size > 0

    def _process(self, pdf_path: Path):
        log.info(f"Nuovo PDF rilevato: {pdf_path.name}")

        # 1. Estrai testo
        text = extract_text(pdf_path)
        if not text:
            log.warning(f"  Testo non leggibile, saltato: {pdf_path.name}")
            return

        # 2. Estrai metadati
        collegio = find_collegio(text)
        numero   = find_numero(text)
        data     = find_data(text)
        log.info(f"  Collegio: {collegio} | Numero: {numero} | Data: {data}")

        # 3. Rinomina PDF
        new_name = build_filename(collegio, data, numero)
        new_pdf_path = self.folder / f"{new_name}.pdf"

        if new_pdf_path != pdf_path:
            counter = 1
            while new_pdf_path.exists():
                new_pdf_path = self.folder / f"{new_name} ({counter}).pdf"
                counter += 1
            shutil.move(str(pdf_path), str(new_pdf_path))
            log.info(f"  Rinominato → {new_pdf_path.name}")
        else:
            log.info(f"  Nome già corretto: {new_pdf_path.name}")

        # 4. Genera sintesi
        summary = None
        if self.use_claude:
            summary = summarize_with_claude(text, collegio, numero)
        if not summary:
            summary = summarize_fallback(text)

        # 5. Crea Word
        docx_path = self.sintesi_dir / f"{new_name} – Sintesi.docx"
        try:
            create_word_summary(
                out_path=docx_path,
                nome_file=new_name,
                collegio=collegio,
                data=data,
                numero=numero,
                summary=summary,
                source_pdf=new_pdf_path.name,
            )
            log.info(f"  Sintesi creata → Sintesi/{docx_path.name}")
        except Exception as e:
            log.error(f"  Errore creazione sintesi: {e}")


# ── Entry point ────────────────────────────────────────────────────────────────

def main():
    folder = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_FOLDER

    if not folder.exists():
        log.error(f"Cartella non trovata: {folder}")
        log.error("Crea la cartella o passa il percorso come argomento:")
        log.error(f"  python3 watcher_decisioni_abf.py /percorso/cartella")
        sys.exit(1)

    use_claude = bool(os.getenv("ANTHROPIC_API_KEY"))
    log.info("=" * 55)
    log.info("  ABF Watcher attivo")
    log.info(f"  Cartella monitorata: {folder}")
    log.info(f"  Modalità sintesi: {'Claude AI' if use_claude else 'Automatica'}")
    log.info("  In attesa di nuovi PDF... (Ctrl+C per fermare)")
    log.info("=" * 55)

    handler = ABFHandler(folder)
    observer = Observer()
    observer.schedule(handler, str(folder), recursive=False)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        log.info("Watcher fermato.")
    observer.join()


if __name__ == "__main__":
    main()
