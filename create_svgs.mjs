import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path';
import TextToSVG from 'text-to-svg';
import { MemoryDb } from 'minimongo'
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);

console.log(__filename)
export const fontParamsSans = {
  "e-angle": { a: ["horizontal", "~horizontal", "angled", "~vertical", "vertical", "other"], s: "ea", c: "lower case e Angle" },
  "g-shape": { a: ["modern (single story)", "classical (double story)", "both", "other"], s: "g", c: "lower case g shape" },
  "l-shape": { a: ["helvetica", "akkurat", "mono", "other"], s: "l", c: "lower case l shape" },
  "ij-dot-shape": { a: ["square", "round", "other"], s: "ij", c: "dot shape of lower case i & j" },
  "Kk-shape": { a: ["helvetica", "univers", "other"], s: "K k", c: "shape of upper and lower case k / K" },
  "a-shape": { a: ["double story", "double story extensive tail", "single story", "other"], s: "a", c: "shape of lower case a" },
  "g-up-shape": { a: ["Helvetica", "Univers", "Other"], s: "G", c: "shape of uppercase G" },
  "R-shape": { a: ["curved", "straight"], s: "R", c: "shape of uppercase R" },
  "M-tip": { a: ["baseline", "above"], s: "M", c: "position of tip of uppercase M" },
  "M-stems": { a: ["parallel", "angled"], s: "M", c: "angle of outer stems of uppercase M" },
  "W-tip": { a: ["one tip", "crossed", "other"], s: "W", c: "shape of uppercase w tip" },
  "W-tip-level": { a: ["capheight", "below", "other"], s: "W", c: "position of uppercase W tip" },
  "AMW-joints": { a: ["flat", "sharp", "other"], s: "WAM", c: "shape of outer joins of uppercase A / W / M" },
  "x-height": { a: ["neutra", "reasonable"], s: "EAR\nae", c: "x height and center of uppercase A" },
  "coarse-classification": { a: ["sans", "serif", "handwriting", "script", "mono"], s: "sAp", c: "General Classification" },
  "Vox-ATypI": { a: ["humanist serif", "geralde", "transitional", "didone", "mechanistic", "grotesque", "neo-grotesque", "geometric", "humanist sans", "glyphic", "script", "graphic", "blackletter", "other"], s: "ESaest", c: "" }

}

const db = new MemoryDb();
db.addCollection('fonts')

const metas = JSON.parse(readFileSync('bettergooglefontsng/src/assets/fontmeta.json'))
const classificationEntries = JSON.parse(readFileSync('bettergooglefontsng/src/assets/classification.json'))
const classification = new Map(classificationEntries)

for (const meta of metas) {
    meta['classification'] = classification.get(meta.meta.name)
}


db.collections['fonts'].upsert(metas,
    (docs) => { console.log(docs.length), createSvgs(db) },
    (err) => { console.log(err); }
)

async function createSvgs(db) {
    for (const [k, v] of Object.entries(fontParamsSans)) {

        console.log(`${k}`)

        const letters = []

        for (const value of v.a) {
            const firstMatch = await db.fonts.findOne({ ['classification.' + k]: value })
            if (!firstMatch) {
                continue
            }
            console.log(firstMatch)

            const prevsvgname = `${k}-${value}.svg`;
            console.log(prevsvgname)

            const textToSVG = TextToSVG.loadSync(join(firstMatch.dir, firstMatch.meta.fonts[0].filename))
            // const textToSVG = TextToSVG.loadSync()

            const attributes = { fill: 'black' };

            const fs = 50

            const metrics = textToSVG.getMetrics(v.s, { fontSize: fs })

            const scale = 100 / metrics.height;
            const options = { x: 50, y: 50, fontSize: fs * scale, attributes: attributes, anchor: 'center middle' };

            // const svg = textToSVG.getSVG(v.s, {...options,y: -metrics.y});
            const path = textToSVG.getPath(v.s, options)

            const svg = svgHeaderSquare(path)

            letters.push({ textToSVG, letter: v.s, width: metrics.width * scale, fontSize: fs * scale })
            writeFileSync(join('prevsvgs', prevsvgname), svg)

        }
        const totalwidth = letters
            .map(l => l.width)
            .reduce((sum, w) => sum + w, 0)

        let x = 10; // startx
        let paths = ""
        for (const letter of letters) {
            const options = { x, y: 50, anchor: 'left middle', fontSize: letter.fontSize * (180 / totalwidth) }
            x += letter.textToSVG.getWidth(letter.letter, options)
            paths += letter.textToSVG.getPath(letter.letter, options)
        }

        writeFileSync(join('prevsvgs', `${k}.svg`), svgHeader(paths))
    }
}
function svgHeaderSquare(path) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
            <svg
               xmlns="http://www.w3.org/2000/svg"
               xmlns:svg="http://www.w3.org/2000/svg"
               width="100"
               height="100"
               version="1.1"
               id="svg1"
               viewBox="0 0 100 100"
               >
               ${path}
            </svg>`;
}

function svgHeader(path) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
            <svg
               xmlns="http://www.w3.org/2000/svg"
               xmlns:svg="http://www.w3.org/2000/svg"
               width="200"
               height="100"
               version="1.1"
               id="svg1"
               viewBox="0 0 200 100"
               >
               ${path}
            </svg>`;
}

