'use strict'

const { readXMLFile } = require('./testUtils')
const { convertXML } = require('../lib/simpleXmlToJson.min.js')
const xmlInput = readXMLFile(__dirname + '/benchmark-input.xml')

describe('transpiler', () => {
    it('Benchmarking baseline', () => {
        const start = Date.now()
        const iterations = 4000
        for (let i = 0; i < iterations; i += 1) {
            convertXML(xmlInput)
        }
        const end = Date.now()
        console.log(
            `Benchmarking baseline:\navg exec time of ${iterations} iterations (in ms): ${
                (end - start) / iterations
            }`
        )
        expect(end - start).toBeGreaterThan(0)
    })
    it('Benchmarking filtering known elements', () => {
        const start = Date.now()
        const iterations = 4000
        const options = { knownElement: (t) => t === 'root' || t === 'star' }
        for (let i = 0; i < iterations; i += 1) {
            convertXML(xmlInput, options)
        }
        const end = Date.now()
        console.log(
            `Benchmarking filtering known elements:\navg exec time of ${iterations} iterations (in ms): ${
                (end - start) / iterations
            }`
        )
        expect(end - start).toBeGreaterThan(0)
    })
})
