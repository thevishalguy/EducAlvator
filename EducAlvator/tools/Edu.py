import os
from pathlib import Path
from openai import OpenAI

# Google AI Studio API Key
# Resolves from environment variable, project key files, or direct fallback key
def resolve_api_key() -> str:
    for var in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
        val = os.environ.get(var)
        if val and val.strip():
            return val.strip()

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


api_key = resolve_api_key()

# Google AI Studio OpenAI-compatible endpoint
client = OpenAI(
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    api_key=api_key,
)

# Gemini 2.0 Flash multimodal call
completion = client.chat.completions.create(
    model="gemini-2.0-flash",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Read the traffic sign in this image. What does it say, and what color is the sign?",
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://assets.ngc.nvidia.com/products/api-catalog/phi-3-5-vision/example1a.jpg"
                    },
                },
            ],
        }
    ],
    temperature=1,
    top_p=0.95,
    stream=True,
)

for chunk in completion:
    if not chunk.choices:
        continue
    delta = chunk.choices[0].delta
    reasoning = getattr(delta, "reasoning_content", None)
    if reasoning:
        print(reasoning, end="", flush=True)
    if getattr(delta, "content", None) is not None:
        print(delta.content, end="", flush=True)
print()
