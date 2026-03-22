#!/usr/bin/env python3
"""
Elaboratore Decisioni ABF
=========================
Per ogni PDF nella cartella "Decisioni ABF Utili":
  1. Analizza il testo
  2. Rinomina il file (Organo + data + numero, es. "ABF Milano n. 5647-2025.pdf")
  3. Produce una sintesi in Word (.docx)

Uso:
    python3 elabora_decisioni_abf.py [percorso_cartella]

Variabili d'ambiente:
    ANTHROPIC_API_KEY  – se presente, usa Claude per la sintesi (raccomandato)
"""

import os
import re
import sys
import shutil
from pathlib import Path
from datetime import datetime

try:
    import fitz  # PyMuPDF
    PDF_BACKEND = "pymupdf"
except ImportError:
    try:
        import pdfplumber
        PDF_BACKEND = "pdfplumber"
    except ImportError:
        raise ImportError("Installa PyMuPDF: pip3 install PyMuPDF")

from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

# ── Costanti ──────────────────────────────────────────────────────────────────

DEFAULT_FOLDER = Path.home() / "Desktop" / "Decisioni ABF Utili"

COLLEGI = ["Milano", "Roma", "Napoli", "Torino", "Bari", "Palermo",
           "Bologna", "Firenze", "Venezia", "Genova"]

MONTHS_IT = {
    "gennaio": "01", "febbraio": "02", "marzo": "03", "aprile": "04",
    "maggio": "05", "giugno": "06", "luglio": "07", "agosto": "08",
    "settembre": "09", "ottobre": "10", "novembre": "11", "dicembre": "12",
}

# ── Estrazione testo dal PDF ───────────────────────────────────────────────────

def extract_text(pdf_path: Path, max_pages: int = 15) -> str:
    """Estrae il testo dal PDF (limitato alle prime max_pages pagine)."""
    text_parts = []
    try:
        if PDF_BACKEND == "pymupdf":
            doc = fitz.open(str(pdf_path))
            for page in doc[:max_pages]:
                text_parts.append(page.get_text())
            doc.close()
        else:
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages[:max_pages]:
                    t = page.extract_text()
                    if t:
                        text_parts.append(t)
    except Exception as e:
        print(f"  [ERRORE] Impossibile leggere {pdf_path.name}: {e}")
        return ""
    return "\n".join(text_parts)


# ── Parsing metadati ABF ───────────────────────────────────────────────────────

def find_collegio(text: str) -> str:
    """Individua il Collegio ABF nel testo."""
    text_upper = text.upper()
    for c in COLLEGI:
        if c.upper() in text_upper:
            return c
    # Fallback: cerca pattern generico
    m = re.search(r"COLLEGIO\s+DI\s+([A-ZÀÈÌÒÙ]+)", text_upper)
    if m:
        return m.group(1).capitalize()
    return "Sconosciuto"


def find_numero(text: str) -> str:
    """Estrae il numero della decisione (es. 5647/2025)."""
    patterns = [
        r"[Dd]ecisione\s+[Nn][\.\s]*[°]?\s*(\d{3,6})\s*/\s*(20\d{2})",
        r"[Nn][\.\s]*[°]?\s*(\d{3,6})\s*/\s*(20\d{2})",
        r"ricorso\s+n[\.\s]*(\d{3,6})\s*/\s*(20\d{2})",
        r"(\d{4,6})\s*/\s*(20\d{2})",
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            return f"{m.group(1)}/{m.group(2)}"
    return "nd"


def find_data(text: str) -> str:
    """Estrae la data della decisione nel formato DD/MM/YYYY."""
    # "Roma, 15 marzo 2024" o "15 marzo 2024"
    pattern_it = (
        r"\b(\d{1,2})\s+"
        r"(gennaio|febbraio|marzo|aprile|maggio|giugno|"
        r"luglio|agosto|settembre|ottobre|novembre|dicembre)"
        r"\s+(20\d{2})\b"
    )
    m = re.search(pattern_it, text, re.IGNORECASE)
    if m:
        day = m.group(1).zfill(2)
        month = MONTHS_IT[m.group(2).lower()]
        year = m.group(3)
        return f"{day}/{month}/{year}"
    # Formato numerico gg/mm/aaaa
    m2 = re.search(r"\b(\d{1,2})[/\-\.](\d{1,2})[/\-\.](20\d{2})\b", text)
    if m2:
        return f"{m2.group(1).zfill(2)}/{m2.group(2).zfill(2)}/{m2.group(3)}"
    return "nd"


def build_filename(collegio: str, data: str, numero: str) -> str:
    """
    Costruisce il nome file pulito.
    Es.: ABF Milano n. 5647-2025
    """
    # Normalizza data: 15/03/2025 → 15.03.2025
    data_fmt = data.replace("/", ".") if data != "nd" else "nd"
    # Normalizza numero: 5647/2025 → 5647-2025
    numero_fmt = numero.replace("/", "-") if numero != "nd" else "nd"
    return f"ABF {collegio} n. {numero_fmt} ({data_fmt})"


# ── Sintesi con Claude API ─────────────────────────────────────────────────────

def summarize_with_claude(text: str, collegio: str, numero: str) -> str:
    """Usa Claude per produrre una sintesi strutturata."""
    try:
        import anthropic
        client = anthropic.Anthropic()
        prompt = f"""Sei un consulente legale specializzato in diritto bancario e finanziario.
Analizza la seguente decisione ABF (Arbitro Bancario Finanziario) del Collegio di {collegio}, n. {numero}.

Produci una sintesi professionale e concisa con queste sezioni:

**PARTI**: Ricorrente vs. Intermediario
**OGGETTO**: Controversia in breve (1-2 righe)
**FATTI**: Fatti rilevanti (3-5 punti)
**QUESTIONE GIURIDICA**: Norma o principio applicato
**DECISIONE**: Esito (accolta / rigettata / parzialmente accolta) e motivazione sintetica
**PRECEDENTI/NOTE**: Eventuali riferimenti utili o massima ricavabile

Sii conciso ma completo. Usa linguaggio tecnico-giuridico.

--- TESTO DECISIONE ---
{text[:12000]}
"""
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text
    except ImportError:
        return None
    except Exception as e:
        print(f"  [AVVISO] Claude API non disponibile: {e}")
        return None


def summarize_fallback(text: str) -> str:
    """
    Sintesi automatica senza AI: estrae sezioni chiave del documento ABF.
    """
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    sections = {
        "PARTI": [],
        "OGGETTO": [],
        "DECISIONE": [],
    }

    keywords_parti = ["ricorrente", "resistente", "intermediario", "banca", "s.p.a.", "s.r.l."]
    keywords_oggetto = ["oggetto", "controversia", "domanda", "questione", "richiesta"]
    keywords_decisione = ["decide", "rigetta", "accoglie", "dichiara", "condanna",
                          "il collegio", "per questi motivi"]

    for line in lines[:80]:
        ll = line.lower()
        if any(k in ll for k in keywords_parti) and len(sections["PARTI"]) < 3:
            sections["PARTI"].append(line)
        if any(k in ll for k in keywords_oggetto) and len(sections["OGGETTO"]) < 3:
            sections["OGGETTO"].append(line)
        if any(k in ll for k in keywords_decisione) and len(sections["DECISIONE"]) < 4:
            sections["DECISIONE"].append(line)

    summary_parts = []
    for title, items in sections.items():
        if items:
            summary_parts.append(f"**{title}**")
            for item in items:
                summary_parts.append(f"  {item}")
            summary_parts.append("")

    if not any(sections.values()):
        # Ultimo fallback: prime 20 righe significative
        summary_parts = ["**ESTRATTO AUTOMATICO**", ""]
        summary_parts += lines[:20]

    return "\n".join(summary_parts)


# ── Creazione documento Word ───────────────────────────────────────────────────

def create_word_summary(
    out_path: Path,
    nome_file: str,
    collegio: str,
    data: str,
    numero: str,
    summary: str,
    source_pdf: str,
):
    """Crea un file .docx con la sintesi della decisione."""
    doc = Document()

    # Stile titolo
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    # Intestazione
    title = doc.add_heading(f"ABF {collegio} – n. {numero}", level=1)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER

    sub = doc.add_paragraph(f"Data: {data}   |   Fonte: {source_pdf}")
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub.runs[0].font.color.rgb = RGBColor(0x70, 0x70, 0x70)

    doc.add_paragraph()  # spazio

    # Corpo sintesi
    for line in summary.split("\n"):
        if line.startswith("**") and line.endswith("**"):
            # Titolo sezione
            heading_text = line.strip("*").strip()
            p = doc.add_paragraph()
            run = p.add_run(heading_text)
            run.bold = True
            run.font.size = Pt(12)
            run.font.color.rgb = RGBColor(0x1F, 0x49, 0x7D)
        elif line.strip():
            doc.add_paragraph(line.strip())

    # Nota a piè di pagina
    doc.add_paragraph()
    note = doc.add_paragraph(
        f"Sintesi generata automaticamente il {datetime.now().strftime('%d/%m/%Y %H:%M')} "
        f"– verificare il documento originale prima di ogni utilizzo."
    )
    note.runs[0].font.size = Pt(8)
    note.runs[0].font.color.rgb = RGBColor(0xAA, 0xAA, 0xAA)

    doc.save(out_path)


# ── Processamento principale ───────────────────────────────────────────────────

def process_folder(folder: Path):
    """Processa tutti i PDF nella cartella."""
    pdfs = sorted(folder.glob("*.pdf"))
    if not pdfs:
        print(f"\nNessun PDF trovato in: {folder}")
        print("Assicurati che la cartella esista e contenga file .pdf")
        return

    # Sottocartella per le sintesi
    sintesi_dir = folder / "Sintesi"
    sintesi_dir.mkdir(exist_ok=True)

    use_claude = bool(os.getenv("ANTHROPIC_API_KEY"))
    print(f"\n{'='*60}")
    print(f"  Elaboratore Decisioni ABF")
    print(f"  Cartella: {folder}")
    print(f"  PDF trovati: {len(pdfs)}")
    print(f"  Modalità sintesi: {'Claude AI' if use_claude else 'Automatica (regex)'}")
    print(f"{'='*60}\n")

    ok = 0
    errori = []

    for i, pdf_path in enumerate(pdfs, 1):
        print(f"[{i}/{len(pdfs)}] {pdf_path.name}")

        # 1. Estrai testo
        text = extract_text(pdf_path)
        if not text:
            print("  → Testo non leggibile, saltato.\n")
            errori.append(pdf_path.name)
            continue

        # 2. Estrai metadati
        collegio = find_collegio(text)
        numero   = find_numero(text)
        data     = find_data(text)
        print(f"  → Collegio: {collegio} | Numero: {numero} | Data: {data}")

        # 3. Costruisci nuovo nome
        new_name = build_filename(collegio, data, numero)

        # 4. Rinomina PDF (gestisci duplicati)
        new_pdf_path = folder / f"{new_name}.pdf"
        if new_pdf_path != pdf_path:
            counter = 1
            base = new_pdf_path
            while new_pdf_path.exists():
                new_pdf_path = folder / f"{new_name} ({counter}).pdf"
                counter += 1
            shutil.move(str(pdf_path), str(new_pdf_path))
            print(f"  → Rinominato: {new_pdf_path.name}")
        else:
            print(f"  → Nome già corretto: {new_pdf_path.name}")

        # 5. Genera sintesi
        summary = None
        if use_claude:
            summary = summarize_with_claude(text, collegio, numero)
        if not summary:
            summary = summarize_fallback(text)

        # 6. Crea Word
        docx_path = sintesi_dir / f"{new_name} – Sintesi.docx"
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
            print(f"  → Sintesi: {docx_path.name}\n")
            ok += 1
        except Exception as e:
            print(f"  [ERRORE] Creazione Word fallita: {e}\n")
            errori.append(new_pdf_path.name)

    # Report finale
    print(f"{'='*60}")
    print(f"  Completato: {ok}/{len(pdfs)} PDF elaborati")
    if errori:
        print(f"  Errori ({len(errori)}):")
        for e in errori:
            print(f"    - {e}")
    print(f"  Sintesi salvate in: {sintesi_dir}")
    print(f"{'='*60}\n")


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) > 1:
        folder = Path(sys.argv[1])
    else:
        folder = DEFAULT_FOLDER

    if not folder.exists():
        print(f"\nCartella non trovata: {folder}")
        print(f"\nCrea la cartella o specificane un'altra:")
        print(f"  python3 elabora_decisioni_abf.py /percorso/alla/cartella\n")
        sys.exit(1)

    process_folder(folder)
