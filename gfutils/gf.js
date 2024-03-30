const fs = require('node:fs');
const path = require('node:path')
const ProtoBuf = require('protobufjs')
const sut = require('protobufjs-textformat')
const fqn = 'google.fonts_public.FamilyProto';

async function listMetaData() {
    // load protobuf definition
    const root = await (new ProtoBuf.Root()).load('fonts_public.proto', { keepCase: true })

    const fontsBasePaths = ['./fonts/ofl/', './fonts/apache/', './fonts/ufl/'];

    const fontDirs = fontsBasePaths.flatMap(d => fs.readdirSync(d).map(sub => path.join(d, sub)));

    // console.log(fontDirs);

    // METADATA.pb
    let missingCounter = 0, idx = 1
    const parsingErrors = [], parsed = []

    for (const fontDirName of fontDirs) {
        const fullName = path.join(fontDirName, '/METADATA.pb');
        if (fs.existsSync(fullName)) {
            const metaContents = fs.readFileSync(fullName, 'utf-8');
            const result = sut.parse(root, fqn, metaContents)
            if (result.status) {
                // console.log(JSON.stringify(result.message,null,2));
                parsed.push({ meta: result.message, dir: fontDirName, idx })
            }
            else {
                parsingErrors.push([fullName, result.error])
            }
            idx++
        } else {
            missingCounter++
            // console.log(`Metadata for ${fontDirName} was not found!`)
        }
    }
    console.log(`Metadata files for ${missingCounter} fonts were not found!`)
    console.log(`Meta Parsing failed for ${parsingErrors.length} fonts`)
    console.log(parsingErrors)
    return parsed
}
async function parseAxesRegistry() {
    const axesfolder = 'fonts/axisregistry/Lib/axisregistry';
    const root = await (new ProtoBuf.Root()).load(axesfolder + '/axes.proto', { keepCase: true })

    const dataFolder = axesfolder + '/data';
    const axes = fs.readdirSync(dataFolder);

    const outs = []
    const parseerrors = []

    for (const axe of axes) {
        if (axe.endsWith('.textproto')) {
            contents = fs.readFileSync(dataFolder + '/' + axe, 'utf-8')
            const out = sut.parse(root, 'AxisProto', contents)
            if (out.status) {
                outs.push(out.message)
            }
            else {
                parseerrors.push([axe, out.error])
            }
        }

    }
    console.log(parseerrors)
    return outs
}

exports.listMetaData = listMetaData
exports.parseAxesRegistry = parseAxesRegistry

if (require.main === module) {
    console.log(process.argv)
    const outputfolder = process.argv[2]
    listMetaData().then(fatJson =>
        fs.writeFileSync(outputfolder + '/fontmeta.json', JSON.stringify(fatJson))
    );
    parseAxesRegistry().then(axesJson =>
        fs.writeFileSync(outputfolder + '/axesmeta.json', JSON.stringify(axesJson))
    );
}