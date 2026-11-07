"""
Study Buddy — PDF → Google AI Studio Gemini (Vision-Language Model) helper.

Why this file exists
--------------------
Google AI Studio Gemini (`gemini-2.0-flash`) is a multimodal model.
To send PDF pages to the model via the OpenAI-compatible endpoint, each page
is rasterized to a JPEG, base64-encoded, and sent as an OpenAI-style
`{"type": "image_url", ...}` part.

Dependencies
------------
    pip install openai pymupdf python-dotenv

- openai         -> standard OpenAI SDK (works with Google AI Studio's OpenAI compatibility endpoint)
- pymupdf (fitz) -> renders PDF pages to image bytes; pip-only, no poppler/GS
- python-dotenv  -> loads your key from a .env file

Setup
-----
Put your key in a `gemini.env` or `.env` file next to this script:

    GEMINI_API_KEY=your-google-ai-studio-key

Usage
-----
    python pdf_study_buddy.py worksheet.pdf
    python pdf_study_buddy.py worksheet.pdf -q "Solve question 3 for me" -g 6
"""

from __future__ import annotations

import argparse
import base64
import os
from pathlib import Path

import fitz  # PyMuPDF
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()  # read GEMINI_API_KEY / GOOGLE_API_KEY from .env

# Google AI Studio's OpenAI-compatible endpoint.
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
MODEL = "gemini-2.0-flash"


def get_api_key() -> str:
    """Resolve the Google AI Studio API key."""
    # 1. Environment variables
    for var in ("GEMINI_API_KEY", "GOOGLE_API_KEY", "NVIDIA_CHAT_API_KEY", "NVIDIA_API_KEY"):
        val = os.environ.get(var)
        if val and val.strip():
            return val.strip()

    # 2. Check gemini.env / .env files in directory or parent root
    base_dir = Path(__file__).resolve().parent
    search_dirs = [base_dir, base_dir.parent]
    for d in search_dirs:
        for fname in (" gemini.env", "gemini.env", "Chatbot.ENV.txt", ".env"):
            fpath = d / fname
            if fpath.is_file():
                try:
                    for line in fpath.read_text(encoding="utf-8").splitlines():
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if "=" in line:
                            k, v = line.split("=", 1)
                            if k.strip() in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
                                return v.strip()
                        elif not line.startswith("nvapi-"):
                            return line
                except Exception:
                    pass

    # No key found — fail loudly rather than embedding a secret in source.
    raise RuntimeError("Set GEMINI_API_KEY in your environment, .env, or gemini.env.")


def pdf_to_image_data_urls(
    pdf_path: str,
    *,
    dpi: int = 150,
    max_pages: int = 8,
    jpeg_quality: int = 80,
) -> list[str]:
    """Render each PDF page to a base64-encoded JPEG data URL.

    dpi          higher = sharper (and bigger); 150 is a good read/size balance
    max_pages    safety cap so a huge PDF can't blow past the model's limits
    jpeg_quality 1-100; 80 keeps text crisp while staying small
    """
    data_urls: list[str] = []
    zoom = dpi / 72.0  # PDFs are defined at 72 DPI; scale up to the target DPI
    matrix = fitz.Matrix(zoom, zoom)

    with fitz.open(pdf_path) as doc:
        for page in doc[:max_pages]:
            # alpha=False -> no transparency, so it encodes cleanly as JPEG.
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            jpeg_bytes = pix.tobytes("jpeg", jpg_quality=jpeg_quality)
            b64 = base64.b64encode(jpeg_bytes).decode("ascii")
            data_urls.append(f"data:image/jpeg;base64,{b64}")

    if not data_urls:
        raise ValueError(f"No pages were rendered from {pdf_path!r}.")
    return data_urls


def ask_about_pdf(
    pdf_path: str,
    question: str = "Read this PDF and help me with the questions in it.",
    *,
    grade: int | None = None,
) -> str:
    """Send the PDF (as page images) plus a question to Gemini and return its reply."""
    api_key = get_api_key()
    if not api_key:
        raise RuntimeError(
            "Set GEMINI_API_KEY in your environment, .env, or gemini.env before running."
        )

    client = OpenAI(base_url=GEMINI_BASE_URL, api_key=api_key)

    # Build one multimodal user turn: the question text, then one image per page.
    content: list[dict] = [{"type": "text", "text": question}]
    for url in pdf_to_image_data_urls(pdf_path):
        content.append({"type": "image_url", "image_url": {"url": url}})

    level = f" The student is in Grade {grade}; match that level." if grade else ""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are EducAlvator's friendly study buddy. Read the pages in "
                    "the images and help the student clearly and simply." + level
                ),
            },
            {"role": "user", "content": content},
        ],
        temperature=0.6,
        top_p=0.9,
        max_tokens=2048,
    )
    return (response.choices[0].message.content or "").strip()


def main() -> None:
    parser = argparse.ArgumentParser(description="Ask Google AI Studio Gemini about a PDF.")
    parser.add_argument("pdf", help="Path to the local PDF file.")
    parser.add_argument(
        "-q", "--question",
        default="Read this PDF and help me with the questions in it.",
        help="What to ask about the PDF.",
    )
    parser.add_argument("-g", "--grade", type=int, help="Student grade, to match the level.")
    args = parser.parse_args()

    print(ask_about_pdf(args.pdf, args.question, grade=args.grade))


if __name__ == "__main__":
    main()
