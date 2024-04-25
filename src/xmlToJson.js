'use strict'

const jsonConverter = require('./converters/astToJson')
const { transpile } = require('./transpiler')

function convertXML(xmlAsString, customConverter = jsonConverter) {
    return transpile(xmlAsString, customConverter)
}

function createAST(xmlAsString) {
    return transpile(xmlAsString)
}

module.exports = {
    convertXML,
    createAST
}
