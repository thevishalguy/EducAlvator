# EduPanel (Chrome extension)

A Manifest V3 side panel that answers questions using the Google Gemini API. It reads:

- **PDFs** open in your current tab, with pdf.js.
- **Web pages** open in your current tab, including the text of their links, text inside frames and shadow DOM, and up to 2 PDFs shown inside the page (an `<embed>`, `<object>` or `<iframe>`). The page is read again each time you ask, so text that appears later is included.
- **Links you paste in a question**, up to 3 per question, whether they lead to a web page, a PDF or a plain text file. These stay available for follow-up questions until you move to another document.

It is separate from the EducAlvator app and shares no code with it, but it uses the app's look: the same paper background, `#E05D43` accent, dark app bar, logo and chat bubbles, in light and dark mode.

## Install

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and choose this `ask-gemini-extension` folder.
3. For local PDFs, click **Details** on the extension and turn on **Allow access to file URLs**. Without this, Chrome blocks `file://` PDFs and the panel tells you so.
4. Pin the extension and click its icon to open the side panel.

The Gemini API key comes from `sidepannel.env.txt` in this folder. The file contains only the key.

An optional backup key goes in `sidepannel-backup.env.txt`. When a question asked with the main key ends in an error (used-up quota, an invalid key, an outage) before any words appear, the backup key answers it. A second backup key in `sidepannel-backup-2.env.txt` answers when the backup key errors too.

**Keep this folder private.** Anyone who gets a copy can read the keys from those files, so don't zip it for others or publish it to the Chrome Web Store with the key inside. The root `.gitignore` already keeps `*.env.txt` out of git.

## Voice

Tap the **mic** next to the send arrow and speak. Your words appear in the box as you talk, after anything you already typed, and the question is sent by itself when you stop. Tap the mic again to stop listening without sending.

Saying one of these on its own runs it instead of asking a question:

| Say | What happens |
| --- | --- |
| "stop" or "cancel" | Stops the answer being written, keeping what is there |
| "read this again" or "reload" | Reads the PDF or page again |
| "show history" | Opens the chat history |
| "close" or "close panel" | Closes EduPanel |

The first time, a small EduPanel window opens and Chrome asks for the microphone, because a side panel cannot show that prompt itself. Choose **Allow**; the window closes and the panel starts listening. If you chose **Block**, allow it again from the icon to the left of that window's address, or in Chrome's site settings for the extension.

Voice uses Chrome's speech recognition, which sends the audio to Google to turn it into text, so it needs an internet connection. It listens in your browser's language.

### Voice mode

The **voice mode** button (headset icon, between the mic and the send arrow) opens a hands-free spoken conversation, like Study Buddy's voice mode in the app. It listens, sends what you said, reads the answer aloud, then listens again, until you end it.

- **Quick replies:** voice questions go to `gemini-3.5-flash-lite` first (then the other models if it fails), with minimal thinking and a request for short spoken-style answers. EduPanel starts speaking the first sentence while the rest is still arriving. In testing, the first words came about 1.5 seconds after the question; Gemini is occasionally slower.
- **The orb:** while listening, tap it when you have finished speaking; while thinking, tap to cancel; while speaking, tap to interrupt and ask something else.
- **Ending it:** say "stop" or "exit", press Esc, or use **End voice chat** or the X.
- **The chat:** every spoken question and answer is also written into the chat and saved in history.
- **Problems:** a Gemini error is said aloud ("Sorry, …") and shown, and voice mode keeps listening. A microphone or speech-service problem pauses it with the reason; tap the orb to try again.
- **Voices:** answers are read by a voice installed on your computer in your browser's language, which starts at once and works offline. Maths symbols are read as words, such as "x squared" or "3 over 4".

## pdf.js

pdf.js runs entirely from this folder, with no CDN. Version **6.4.299** of `pdfjs-dist` is already in `lib/pdfjs/`, so you only need these steps to replace or upgrade it.

The extension needs exactly this layout:

```
ask-gemini-extension/lib/pdfjs/
  pdf.min.mjs          from build/ in the package (main library)
  pdf.worker.min.mjs   from build/ in the package (background worker)
  cmaps.bin            the package's cmaps/ folder packed into one file (decodes CJK and other non-Latin fonts)
  standard-fonts.bin   the package's standard_fonts/ folder packed into one file (fonts not embedded in the PDF)
  LICENSE              Apache-2.0 licence, keep it with the code
  DATA-LICENSES.txt    the licences that came inside cmaps/ and standard_fonts/
```

Download it from npm. Run these in a terminal opened in the `ask-gemini-extension` folder; you need [Node.js](https://nodejs.org) for `npm`.

PowerShell (Windows):

```powershell
$version = "6.4.299"
npm pack "pdfjs-dist@$version" --silent
tar -xzf "pdfjs-dist-$version.tgz"
New-Item -ItemType Directory -Force lib\pdfjs | Out-Null
Copy-Item package\build\pdf.min.mjs, package\build\pdf.worker.min.mjs, package\LICENSE lib\pdfjs\ -Force
node ..\scripts\pack-pdfjs-data.mjs package\cmaps lib\pdfjs\cmaps.bin
node ..\scripts\pack-pdfjs-data.mjs package\standard_fonts lib\pdfjs\standard-fonts.bin
Remove-Item -Recurse -Force package, "pdfjs-dist-$version.tgz"
```

macOS or Linux:

```bash
version=6.4.299
npm pack "pdfjs-dist@$version" --silent
tar -xzf "pdfjs-dist-$version.tgz"
mkdir -p lib/pdfjs
cp package/build/pdf.min.mjs package/build/pdf.worker.min.mjs package/LICENSE lib/pdfjs/
node ../scripts/pack-pdfjs-data.mjs package/cmaps lib/pdfjs/cmaps.bin
node ../scripts/pack-pdfjs-data.mjs package/standard_fonts lib/pdfjs/standard-fonts.bin
rm -rf package "pdfjs-dist-$version.tgz"
```

Then click the reload icon on the extension's card in `chrome://extensions`. To upgrade, change the version number and re-check with a PDF, since newer pdf.js versions can raise the minimum Chrome version. This one needs Chrome 128 or later, which `manifest.json` declares.

The `cmaps/` and `standard_fonts/` folders are packed (about 185 files into 2) to keep the repository small in file count; `sidepanel.js` hands PDF.js each file out of the packs. If a new version adds licence files to those folders, add them to `DATA-LICENSES.txt`.

The `wasm/` and `iccs/` package folders are left out on purpose. They are for drawing images and colours, and this extension only reads text.

## Model

`GEMINI_MODELS` at the top of `sidepanel.js` lists the models in the order they are tried: `gemini-3.5-flash`, then `gemini-3-flash-preview`, then `gemini-3.5-flash-lite`. If a model is out of quota (429), overloaded (503), failing (5xx), retired (404) or unreachable, the same question goes to the next one before any answer appears. A model out of daily quota is skipped until Google says its quota is back; a rate-limited one, for the wait Google suggests. These are remembered until the panel is closed. To change the list, edit it and reload the extension.

When every model fails, or the problem is not one another model can fix, the panel shows the HTTP status, a plain explanation and Google's message, with a Retry button. Covered cases: daily quota used up, rate limit, overload, retired model, invalid key, key reported as leaked, Gemini API turned off for the key's project, unsupported region, a document too long for Gemini, no reply within 90 seconds (or a stream that stalls for 60), a dropped connection, being offline, a blocked question or answer, and an empty answer. An answer cut at Gemini's length limit is kept, with a note.

## What is stored and sent

`chrome.storage.local` holds `chats`: questions and answers per URL, for the 20 most recently used PDFs and pages, with each title. The **history** button (clock icon) lists them; choosing one opens that PDF or page with its chat, and **Clear history** at the bottom deletes them all.

Text read from PDFs, pages and links stays in memory and is never written to storage.

Opening a page or PDF sends nothing anywhere. When you ask a question, the full text of the open PDF or page, any pasted links, your question and the earlier chat go to Google's Gemini API. That includes whatever a logged-in page is showing, such as email or banking details, so don't ask questions on pages like that. Check Google's terms for your plan before using confidential documents, since free-tier data handling can differ from paid.

## Known limits

- **Browser pages:** Chrome blocks extensions from `chrome://` pages and the Chrome Web Store, so nothing can be read there.
- **Canvas-drawn pages:** apps that paint text onto a canvas instead of the page, such as Google Docs, show little or no text.
- **Bot checks:** while a site shows a "checking your browser" or captcha screen, that screen is what gets read. Once it has passed, asking again reads the real page.
- **Pasted links that need JavaScript:** a pasted link is downloaded, not opened, so a page that draws its text with JavaScript may come back empty. Open it in a tab instead, which reads what you see.
- **Links are not followed automatically:** links inside a page or PDF are not opened. Click one to read it in the tab, or paste it in your question.
- **Scanned PDFs:** pdf.js reads text layers, not images, so a scan shows "No readable text". There is no OCR.
- **PDFs that cannot be downloaded again:** the extension fetches the URL itself, using your cookies. PDFs behind a one-time link, a POST request or a `blob:` URL may fail, and the panel shows the error.
- **Password-protected PDFs:** these are not supported, and the panel says so.
- **Very long PDFs:** the whole text is always sent, so these can exceed a per-minute token limit and return 429.
- **Tables and columns:** text comes out in the PDF's internal order, so complex layouts may read out of order.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | Permissions, side panel and service worker declaration |
| `background.js` | Makes the toolbar icon open the side panel |
| `sidepanel.html`, `styles.css` | Chat UI, light and dark |
| `sidepanel.js` | PDF detection and extraction, Gemini calls, UI state |
| `mic-permission.html`, `mic-permission.js` | Small window that asks Chrome for the microphone |
| `latex-to-text.js` | Turns any LaTeX in an answer into readable Unicode text |
| `sidepannel.env.txt` | Your Gemini API key (gitignored) |
| `sidepannel-backup.env.txt` | Optional backup Gemini API key (gitignored) |
| `sidepannel-backup-2.env.txt` | Optional second backup key (gitignored) |
| `lib/pdfjs/` | Local copy of pdf.js |
| `icons/` | Extension icons and `logo.svg` (the EducAlvator logo) |
