const fs = require('fs')
const sut = require('protobufjs-textformat')
const ProtoBuf = require('protobufjs')

async function main() {
    const fqn = 'google.fonts_public.FamilyProto';
    // load protobuf definition
    const root = await (new ProtoBuf.Root()).load('fonts_public.proto', { keepCase: true })

    // load text based protobuf data
    const input = fs.readFileSync('./fonts/ofl/abeezee/METADATA.pb', 'utf-8');
    const result = sut.parse(root, fqn, input)

    if (result.status) {
        console.log(JSON.stringify(result.message, null, 2));
    } else {
        console.error('Parsing failed', result.error);
    }
}

main()

