import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path';
import { parseArgs } from "node:util";
import TextToSVG from 'text-to-svg';
import { MemoryDb } from 'minimongo'
import { fileURLToPath } from 'node:url';
import { time } from 'node:console';
const __filename = fileURLToPath(import.meta.url);

console.log(__filename)


const args = parseArgs({
    options: {
        class: {
            type: "boolean",
            short: "c",
        },
        specimen: {
            type: "boolean",
            short: "s"
        }
    },
    allowPositionals: true
});

console.log(args)
if (args.values.class) {
    createSvgs()
} else if (args.values.specimen) {
    if (args.positionals.length >= 2) {
        createSpecimen(args.positionals)
    } else {
        throw new Error(`At least 2 positional arguments are required for specimen. Only ${args.positionals.length} were given`)
    }

}


async function initDb() {

    const db = new MemoryDb();
    db.addCollection('fonts')

    const classificationEntries = JSON.parse(readFileSync('../bettergooglefontsng/src/assets/classification.json'))
    const classification = new Map(classificationEntries)
    const metas = JSON.parse(readFileSync('../bettergooglefontsng/src/assets/fontmeta.json'))

    for (const meta of metas) {
        meta['classification'] = classification.get(meta.meta.name)
    }
    const docs = await db.collections['fonts'].upsert(metas);
    console.log(docs.length)
    return db
}

async function createSvgs() {
    const db = await initDb();
    const fontParamsSans = JSON.parse(readFileSync('../bettergooglefontsng/src/assets/classification_questions.json'))
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

            const prevsvgname = `${k}-${value}.svg`
            console.log(prevsvgname)

            const textToSVG = TextToSVG.loadSync(join('..', firstMatch.dir, firstMatch.meta.fonts[0].filename))
            // const textToSVG = TextToSVG.loadSync()

            const attributes = { fill: 'black' }

            const fs = 50

            const metrics = textToSVG.getMetrics(sample, { fontSize: fs })

            const scale = 100 / metrics.height
            const options = { x: 50, y: 50, fontSize: fs * scale, attributes: attributes, anchor: 'center middle' }

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

async function createSpecimen(args) {
    const db = await initDb();
    const [specimen, ...fontNames] = args

    const prevsvgname = Date.now() + '.svg'
    console.log(prevsvgname)

    const letters = []
    for (const fontName of fontNames) {
        const firstMatch = await db.fonts.findOne({ 'meta.name': fontName })

        if (!firstMatch) {
            console.warn(`Font with name "${fontName}" was not found`)
            continue
        }

        console.log(firstMatch)

        const textToSVG = TextToSVG.loadSync(join('..', firstMatch.dir, firstMatch.meta.fonts[0].filename))
        // const textToSVG = TextToSVG.loadSync()
        letters.push({ textToSVG, letter: specimen })

    }

    let y = 10, width = 0; // starty
    let paths = ""
    for (const letter of letters) {
        const options = { x: 10, y, anchor: 'left top', fontSize: 50 }
        const metrics = letter.textToSVG.getMetrics(letter.letter, options)
        y += metrics.height
        width = Math.max(width, metrics.width)
        paths += letter.textToSVG.getPath(letter.letter, options)
    }
    writeFileSync(join('out', prevsvgname), svgHeader(paths, width, y + 10))
}

function svgHeaderSquare(path) {
    return svgHeader(path, 100, 100)
}

function svgHeader(path, width = 200, height = 100) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
            <svg
               xmlns="http://www.w3.org/2000/svg"
               xmlns:svg="http://www.w3.org/2000/svg"
               width="${width}"
               height="${height}"
               version="1.1"
               id="svg1"
               viewBox="0 0 ${width} ${height}"
               >
               ${path}
            </svg>`;
}

