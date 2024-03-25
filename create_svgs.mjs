import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path';
import TextToSVG from 'text-to-svg';
import { MemoryDb } from 'minimongo'
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);

console.log(__filename)


const db = new MemoryDb();
db.addCollection('fonts')

const fontParamsSans = JSON.parse(readFileSync('bettergooglefontsng/src/assets/classification_questions.json'))
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

        for (const _value of v.a) {
            let firstMatch, value, sample
            // specific font / sample letters per attribute
            if (typeof _value === 'object') {
                const fontName = _value.f
                firstMatch = await db.fonts.findOne({ 'meta.name': fontName })
                value = _value.a
                sample = _value.s || v.s;
            } else { // first match
                value = _value
                sample = v.s
                firstMatch = await db.fonts.findOne({ ['classification.' + k]: value })
            }

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

            const metrics = textToSVG.getMetrics(sample, { fontSize: fs })

            const scale = 100 / metrics.height;
            const options = { x: 50, y: 50, fontSize: fs * scale, attributes: attributes, anchor: 'center middle' };

            // const svg = textToSVG.getSVG(sample, {...options,y: -metrics.y});
            const path = textToSVG.getPath(sample, options)

            const svg = svgHeaderSquare(path)

            letters.push({ textToSVG, letter: sample, width: metrics.width * scale, fontSize: fs * scale })
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

