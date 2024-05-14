'use strict'

const { createAST } = require('./parser')

function convertXML(xmlAsString, options = {}) {
    const ast = createAST(xmlAsString, {
        knownAttrib: options.knownAttrib,
        knownElement: options.knownElement
    })
    const converter = options.converter ?? require('./converters/astToJson')
    return converter.convert(ast)
}

module.exports = {
    convertXML
}
