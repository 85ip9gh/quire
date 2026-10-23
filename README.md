# Quire

A PDF toolkit that runs entirely in your browser tab. Merge, split, reorder, convert images, number pages, edit metadata and add or remove passwords without uploading a single byte.

Most free PDF sites ask you to upload the file first, which is a poor trade for a resume, a lease or a bank statement. Quire does the same jobs locally, and the production build is locked down so it *cannot* make a network request, rather than merely promising not to.

## Tools

| Tool | What it does |
|---|---|
| Merge | Combines any number of PDFs in the order you set, with an optional page range per file (`1-3, 5, 8-end`). |
| Split | One file per range, a single file of chosen pages, or fixed-size pieces. Several outputs download as one `.zip`. |
| Organize | Page thumbnails you can drag into a new order, turn a quarter at a time, or mark for removal. |
| Images to PDF | JPG, PNG, WebP, GIF, BMP or AVIF to one PDF on Letter, A4 or image-sized pages. Phone photos are turned upright from their EXIF orientation. |
| Page numbers | `3`, `3 of 12` or `Page 3` in any of six positions, with a start number and an unnumbered cover page. Labels land on the visual edge of pages that are already rotated. |
| Metadata | Shows the title, author, creating software and dates a PDF records. Edit the fields or strip the info dictionary and the XMP packet entirely. |
| Password | Encrypts with AES-256 and optional print, copy and edit restrictions, or opens a protected file with its password and saves an unlocked copy. |

Password-protected files can be dropped into any tool. Quire asks for the password once, then works on the decrypted copy in memory.

## Run it

Requires Node 22 or newer.

```bash
npm install
npm run build
npm run preview
```

Then open http://localhost:4173. For development with hot reload, use `npm run dev` instead.

`npm run build` writes the whole app, scripts, styles and the pdf.js worker included, into a single `dist/index.html` of about 2.3 MB. That one file is the deliverable.

## How the "no network" guarantee works

The build adds a Content-Security-Policy meta tag with `default-src 'none'` and `connect-src 'none'`. Inline scripts and styles are allowed only by their SHA-256 hashes, which are computed after everything has been inlined. Under that policy the page and its worker cannot `fetch`, open a WebSocket, load a remote script or submit a form, even if a dependency tried to.

`scripts/check-build.mjs` runs after every build and fails it unless `dist` holds exactly one file, the policy is present before the first script, `connect-src` and `default-src` are both `'none'`, every inline block's hash is listed, and no `src` or `href` points anywhere but a `data:` URI. CI runs the same check, so a change that weakens the policy fails the pull request.

The dev server does not apply the policy, since hot reload needs a socket.

## Under the hood

- [`@cantoo/pdf-lib`](https://github.com/cantoo-scribe/pdf-lib), the maintained fork of pdf-lib, does every write: copying pages, rotation, drawing labels, embedding images, metadata and encryption.
- [`pdfjs-dist`](https://github.com/mozilla/pdf.js) renders the Organize thumbnails in a Web Worker that is bundled inline.
- [`fflate`](https://github.com/101arrowz/fflate) builds the `.zip` for multi-file splits.
- React 19, TypeScript and Vite, with `vite-plugin-singlefile` producing the one-file build.

The PDF operations in `src/lib` have no DOM dependency and are tested in Node against documents the tests build themselves. Each page in a fixture gets a unique width, so the tests can assert exact page order after a merge, split or reorder rather than just a page count.

## Development

```bash
npm run lint
npm run typecheck
npm test
```

| Path | Contents |
|---|---|
| `src/lib/pdf-ops.ts` | Every PDF operation, pure functions over bytes |
| `src/lib/layout.ts` | Page number placement for each rotation, image fitting, label formats |
| `src/lib/ranges.ts` | The page range parser |
| `src/lib/exif.ts` | JPEG orientation reader |
| `src/lib/preview.ts` | pdf.js thumbnail rendering |
| `src/tools/` | One component per tool |
| `tests/` | Vitest suites and PDF and PNG fixture builders |

## Known limits

- Bookmarks are not carried into merged, split or reorganized files.
- Any edit invalidates a digital signature, as it would in any other editor.
- There is no compression or OCR yet.
- Files are held in memory, so very large PDFs are bounded by what the browser tab can hold.
