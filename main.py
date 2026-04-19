import base64
import json
import os
import re

import anthropic
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = (
    "You are a document text extractor. Extract all visible text and information "
    "from images and return it as structured JSON.\n"
    "Rules:\n"
    "- Return ONLY valid JSON — no prose, no markdown fences\n"
    "- Always include 'raw_text' with the complete verbatim text you read\n"
    "- Add structured fields based on content type (medications, dates, names, "
    "addresses, instructions, amounts, warnings, etc.)\n"
    "- If no text is found, return {\"raw_text\": \"\", \"note\": \"No text detected\"}"
)

@app.post("/api/extract")
async def extract(file: UploadFile = File(...)):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 20MB)")

    image_b64 = base64.standard_b64encode(contents).decode("utf-8")
    media_type = file.content_type or "image/jpeg"

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_b64,
                            },
                        },
                        {
                            "type": "text",
                            "text": "Extract all text and information from this image. Return ONLY a JSON object.",
                        },
                    ],
                }
            ],
        )
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Claude API error: {e}")

    raw = message.content[0].text.strip()

    # Strip markdown code fences if Claude added them
    raw = re.sub(r"^```(?:json)?\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw.strip())

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {"raw_text": raw, "parse_error": "Claude returned non-JSON response"}

    return JSONResponse(content=result)


# Static files mounted last so /api/* routes take priority
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
