'use strict'

const fs = require('fs')
const lexer = require('../src/lexer')
const {Token, TOKEN_TYPE} = require('../src/model')

describe('Lexer', () => {
    it('Simple lexing', () => {
        const tokenizer = lexer.createLexer("<a></a>")
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ELEMENT_TYPE, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ELEMENT, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.EOF))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.EOF))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.EOF))
    })

    it('Lexing attributes', () => {
        const tokenizer = lexer.createLexer("<a p1='v1' p2='v2'></a>")
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ELEMENT_TYPE, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_NAME, 'p1'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ASSIGN))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_VALUE, 'v1'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_NAME, 'p2'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ASSIGN))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_VALUE, 'v2'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ELEMENT, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.EOF))
    })

    it('should support textual content for elements', () => {
        const tokenizer = lexer.createLexer("<a>Hello world</a>")
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ELEMENT_TYPE, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CONTENT, 'Hello world'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ELEMENT, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.EOF))
    })

    it('should support nesting', () => {
        const mockXML = `
            <a><b></b></a>
        `
        const tokenizer = lexer.createLexer(mockXML)
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ELEMENT_TYPE, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_BRACKET))

        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ELEMENT_TYPE, 'b'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_BRACKET))

        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ELEMENT, 'b'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ELEMENT, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.EOF))
    })

    it('should tokenize a real XML file', () => {
        const readXMLFile = fileName => {
            return fs.readFileSync(fileName, {encoding: 'utf8'})
        }

        const xmlFileToTest = readXMLFile(__dirname + '/mock.xml')
        const tokenizer = lexer.createLexer(xmlFileToTest)
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ELEMENT_TYPE, 'parent'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_BRACKET))
        
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ELEMENT_TYPE, 'child'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_NAME, 'name'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ASSIGN))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_VALUE, 'Foo'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ELEMENT, 'child'))
        
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ELEMENT_TYPE, 'child'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_NAME, 'name'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ASSIGN))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_VALUE, 'Bar'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_BRACKET))

        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ELEMENT_TYPE, 'child'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_NAME, 'name'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ASSIGN))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_VALUE, 'grandson'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ELEMENT, 'child'))

        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ELEMENT, 'child'))

        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ELEMENT, 'parent'))
    })
})
