const { raw } = require('body-parser')
const express = require('express')
const fs = require('fs')
const app = express()
const port = 3000

app.use(express.static('fonts/ofl/'))

function renderFont(fontInfo,variationInfo) {
    // console.log(fontInfo.meta.fonts[0])

    if( variationInfo ) {
        parsedVariationInfo = `font-variation-settings: 
        ${Object.entries(variationInfo).map(([k,v])=>`"k" v`).join(',\n')};`
    }
    firstFont = fontInfo.meta.fonts[0]
    let out = `<style>
  @font-face {
    font-family: "${firstFont.name}";
    font-style: ${firstFont.style};
    font-weight: ${firstFont.weight};
    src: url(/${fontInfo.dir}/${firstFont.filename})
  }
  </style>
  <div style="font-family: '${firstFont.name}'">${firstFont.name} - The quick brown fox jumps over the lazy dog</div>
    `

    return out
}
// create memory db for queries
// Require minimongo
const minimongo = require("minimongo");

const LocalDb = minimongo.MemoryDb;

db = new LocalDb();
db.addCollection('fonts')

const gf = require('./gf.js')
gf.listMetaData().then(fonts => {
    db.fonts.upsert(fonts, (docs) => { console.log(docs.length) }, (err) => { console.log(err) })
})

app.get('/axes', (req, res) => {

    db.fonts.find({ 'meta.axes': { $exists: true } }).fetch()
        .then(docs => {
            const axes = new Map()
            for (const doc of docs) {
                for (const axe of doc.meta.axes) {
                    if (!axes.has(axe.tag)) {
                        axes.set(axe.tag, { count: 0, min: 1000, max: 0 })
                    }
                    const axstat = axes.get(axe.tag)
                    axstat.count++

                    if (axe.min_value < axstat.min) {
                        axstat.min = axe.min_value
                    }
                    if (axe.max_value > axstat.max) {
                        axstat.max = axe.max_value
                    }

                }
            }
            res.send(JSON.stringify([...axes.entries()]))
        })
})

app.get('/tags', (req, res) => {
    const csvparse = require('csv-parse/sync')
    const content = fs.readFileSync('fonts/tags/all/families.csv')
    const records = csvparse.parse(content,
        { delimiter: ',', from: 2 })

    const lookup = {}
    // res.send(JSON.stringify(records))
    for (const row of records) {
        const [fontFamilyName, groupAndTag, weight] = row
        const [, group, tag] = groupAndTag.split('/')

        if (!(group in lookup)) {
            lookup[group] = {}
        }
        if (!(tag in lookup[group])) {
            lookup[group][tag] = []
        }
        lookup[group][tag].push([fontFamilyName, weight])
    }
    res.send(lookup)
})

app.get('/', (req, res) => {
    res.write('<html><body><ul>')
    filter = req.query
    const selector = {}
    const variationInfos = [] 
    for ([param, value] of Object.entries(filter)) {
        if (param.startsWith('a_')) { // axes

            const name = param.substring(2)
            selector['meta.axes'] = { $elemMatch: { tag: name } } // cutting off 'a_'
            if (value) {
                const [min, max] = value.split(':')
                if (min) {
                    selector['meta.axes']['$elemMatch']['min_value'] = { $lte: parseFloat(min) }
                    variationInfos.push({name: parseFloat(min)})
                }
                if (max) {
                    selector['meta.axes']['$elemMatch']['max_value'] = { $gte: parseFloat(max) }
                    variationInfos.push({name: parseFloat(max)})
                }
            }

        }
    }

    // { 'meta.axes': { $elemMatch: { 'tag': "wght", 'max_value': { $gt: 800 } } } }

    db.fonts.find(selector).fetch()
        .then(fonts => {
            for (const font of fonts) {
                if( variationInfos.length > 0 ) {
                    // todo: combinatoric
                    for(const variationInfo of variationInfos) {
                    res.write(`<li>${renderFont(font, variationInfo)}</li>`)
                    }
                } else {
                    res.write(`<li>${renderFont(font)}</li>`)
                }
            }
            res.write('</ul></body></html>')
            res.end()
        })
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})