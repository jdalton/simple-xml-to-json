'use strict'

const testUtils = require('./testUtils')
const { TOKEN_TYPE } = require('../src/constants')
const lexer = require('../src/lexer')
const { Token } = require('../src/model')

describe('Lexer', () => {
    it('Simple lexing', () => {
        const tokenizer = lexer.createLexer('<a></a>')
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ELEMENT_TYPE, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ELEMENT, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.EOF))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.EOF))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.EOF))
    })

    it('should ignore single line comments', () => {
        const tokenizer = lexer.createLexer(`
            <!-- simple comment! -->
            <a></a>
        `)
        const expectedTokensOrder = [
            Token(TOKEN_TYPE.OPEN_ANGLE_BRACKET),
            Token(TOKEN_TYPE.ELEMENT_TYPE, 'a'),
            Token(TOKEN_TYPE.CLOSE_ANGLE_BRACKET),
            Token(TOKEN_TYPE.CLOSE_ELEMENT, 'a'),
            Token(TOKEN_TYPE.EOF)
        ]
        expectedTokensOrder.forEach((token) => {
            expect(tokenizer.next()).toEqual(token)
        })
    })

    it('should ignore multi-line comments', () => {
        const tokenizer = lexer.createLexer(`
            <!--
                line 1 - comment foo
                line 2 - comment bar
            -->
            <a></a>
        `)
        const expectedTokensOrder = [
            Token(TOKEN_TYPE.OPEN_ANGLE_BRACKET),
            Token(TOKEN_TYPE.ELEMENT_TYPE, 'a'),
            Token(TOKEN_TYPE.CLOSE_ANGLE_BRACKET),
            Token(TOKEN_TYPE.CLOSE_ELEMENT, 'a'),
            Token(TOKEN_TYPE.EOF)
        ]
        expectedTokensOrder.forEach((token) => {
            expect(tokenizer.next()).toEqual(token)
        })
    })

    it('Lexing attributes', () => {
        const tokenizer = lexer.createLexer("<a p1='v1' p2='v2'></a>")
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ELEMENT_TYPE, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_NAME, 'p1'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ASSIGN))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_VALUE, 'v1'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_NAME, 'p2'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ASSIGN))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_VALUE, 'v2'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ELEMENT, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.EOF))
    })

    it('should skip unknown attributes', () => {
        const tokenizer = lexer.createLexer("<a p1='v1' p2='v2' p3='v3'></a>", {
            knownAttrib: (n) => n === 'p1' || n === 'p3'
        })
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ELEMENT_TYPE, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_NAME, 'p1'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ASSIGN))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_VALUE, 'v1'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_NAME, 'p3'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ASSIGN))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_VALUE, 'v3'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ELEMENT, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.EOF))
    })

    it('should support textual content for elements', () => {
        const tokenizer = lexer.createLexer('<a>Hello world</a>')
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ELEMENT_TYPE, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(
            Token(TOKEN_TYPE.CONTENT, 'Hello world')
        )
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ELEMENT, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.EOF))
    })

    it('should support nesting', () => {
        const mockXML = `
            <a><b></b></a>
        `
        const tokenizer = lexer.createLexer(mockXML)
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ELEMENT_TYPE, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ANGLE_BRACKET))

        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ELEMENT_TYPE, 'b'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ANGLE_BRACKET))

        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ELEMENT, 'b'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ELEMENT, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.EOF))
    })

    it('should not skip root elements', () => {
        const mockXML = `
            <a></a>
        `
        const tokenizer = lexer.createLexer(mockXML, {
            knownElement: () => false
        })
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ELEMENT_TYPE, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ELEMENT, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.EOF))
    })

    it('should skip unknown elements', () => {
        const mockXML = `
            <a><b></b><c><d>D</d><e><f>F</f>E</e>C</c></a>
        `
        const tokenizer = lexer.createLexer(mockXML, {
            knownElement: (n) => n === 'b'
        })
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ELEMENT_TYPE, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ANGLE_BRACKET))

        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ELEMENT_TYPE, 'b'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ANGLE_BRACKET))

        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ELEMENT, 'b'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ELEMENT, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.EOF))
    })

    it('should tokenize a real XML file', () => {
        const readXMLFile = (fileName) => {
            return testUtils.readXMLFile(fileName)
        }

        const xmlFileToTest = readXMLFile(__dirname + '/mock.xml')
        const tokenizer = lexer.createLexer(xmlFileToTest)
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(
            Token(TOKEN_TYPE.ELEMENT_TYPE, 'parent')
        )
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ANGLE_BRACKET))

        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(
            Token(TOKEN_TYPE.ELEMENT_TYPE, 'child')
        )
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_NAME, 'name'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ASSIGN))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_VALUE, 'Foo'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(
            Token(TOKEN_TYPE.CLOSE_ELEMENT, 'child')
        )

        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(
            Token(TOKEN_TYPE.ELEMENT_TYPE, 'child')
        )
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_NAME, 'name'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ASSIGN))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_VALUE, 'Bar'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ANGLE_BRACKET))

        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(
            Token(TOKEN_TYPE.ELEMENT_TYPE, 'child')
        )
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ATTRIB_NAME, 'name'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ASSIGN))
        expect(tokenizer.next()).toEqual(
            Token(TOKEN_TYPE.ATTRIB_VALUE, 'grandson')
        )
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(
            Token(TOKEN_TYPE.CLOSE_ELEMENT, 'child')
        )

        expect(tokenizer.next()).toEqual(
            Token(TOKEN_TYPE.CLOSE_ELEMENT, 'child')
        )

        expect(tokenizer.next()).toEqual(
            Token(TOKEN_TYPE.CLOSE_ELEMENT, 'parent')
        )
    })

    it('should parse CDATA', () => {
        const mockXML = `
            <a><![CDATA[<greeting>Hello, world!</greeting>]]></a>
        `
        const tokenizer = lexer.createLexer(mockXML)
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.OPEN_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.ELEMENT_TYPE, 'a'))
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ANGLE_BRACKET))
        expect(tokenizer.next()).toEqual(
            Token(TOKEN_TYPE.CONTENT, '<greeting>Hello, world!</greeting>')
        )
        expect(tokenizer.next()).toEqual(Token(TOKEN_TYPE.CLOSE_ELEMENT, 'a'))
    })

    it('should error for tag names not starting with a-z', () => {
        ;[
            '<1a></1a>',
            '<_a></-a>',
            '<:a></:a>',
            '<.a></.a>',
            '<-a></-a>'
        ].forEach((mockXML) => {
            const tagName = mockXML.slice(1, 3)
            const tokenizer = lexer.createLexer(mockXML)
            expect(() => tokenizer.next()).toThrow(
                `Invalid tag name: "${tagName}"`
            )
        })
    })

    it('should persist error on subsequent next() calls', () => {
        const mockXML = '<1a><_b></_b></1a>'
        const tokenizer = lexer.createLexer(mockXML)
        const expected = 'Invalid tag name: "1a"'
        expect(() => tokenizer.next()).toThrow(expected)
        expect(() => tokenizer.next()).toThrow(expected)
    })
})
