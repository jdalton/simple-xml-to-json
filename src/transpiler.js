'use strict'

const { NODE_TYPE, TOKEN_TYPE } = require('./constants')
const { createLexer } = require('./lexer')

const AttribNode = ($name, $value) => ({
    type: NODE_TYPE.ATTRIBUTE,
    value: {
        name: $name,
        value: $value
    }
})

const ContentNode = ($value) => ({
    type: NODE_TYPE.CONTENT,
    value: $value
})

const ElementNode = ($type, $attributes, $children) => ({
    type: NODE_TYPE.ELEMENT,
    value: {
        type: $type,
        attributes: $attributes,
        children: $children
    }
})

const Node = ($type, $value) => ({
    type: $type,
    value: $value
})

const parseXML = (lexer) => {
    /*
    How does the grammar look?
    | expr: StructuredXML | UnstructuredXML | Content
    | StructuredXML: (openBracket + ElementName) + (AttributeList)* + closeBracket + (expr)* + closeElement
    | UnstructuredXML: Content* + expr* + Content*
    | Content: String
    | openBracket: <
    | closeBracket: >
    | closeElement: </ + ElementName + closeBracket
    | ElementName: String
    | AttributeList: AttributeName + "=" + AttributeValue + AttributeList*
    | AttributeName: String
    | AttributeValue: String
    */
    const rootNode = Node(/*inline*/ NODE_TYPE.ROOT, { children: [] })
    const scopingNode = [rootNode]

    while (lexer.hasNext()) {
        const tok = lexer.next()
        const { value: nodeValue } = scopingNode[scopingNode.length - 1]
        switch (tok.type) {
            case TOKEN_TYPE.OPEN_BRACKET: {
                const { value: tagName } = lexer.next()
                const attribs = []
                let currTok = lexer.next()
                while (
                    currTok &&
                    currTok.type !== TOKEN_TYPE.CLOSE_BRACKET &&
                    currTok.type !== TOKEN_TYPE.CLOSE_ELEMENT &&
                    lexer.hasNext()
                ) {
                    const attribNameTok = currTok
                    lexer.next() // assignment token
                    const attribValueTok = lexer.next()
                    attribs.push(
                        AttribNode(
                            /*inline*/ attribNameTok.value,
                            attribValueTok.value
                        )
                    )
                    currTok = lexer.next()
                }
                const childNode = ElementNode(/*inline*/ tagName, attribs, [])
                nodeValue.children.push(childNode)
                if (currTok.type !== TOKEN_TYPE.CLOSE_ELEMENT) {
                    scopingNode.push(childNode)
                }
                break
            }
            case TOKEN_TYPE.CLOSE_ELEMENT: {
                if (tok.value === nodeValue.type) {
                    scopingNode.pop()
                    const { children } = nodeValue
                    const { length: childrenLength } = children
                    if (
                        childrenLength > 0 &&
                        children[0].type === NODE_TYPE.CONTENT
                    ) {
                        let buffer = ''
                        const reduced = []
                        for (let i = 0; i < childrenLength; i += 1) {
                            const child = children[i]
                            if (child.type === NODE_TYPE.CONTENT) {
                                buffer = buffer + child.value
                            } else {
                                if (buffer.length) {
                                    reduced.push(ContentNode(/*inline*/ buffer))
                                    buffer = ''
                                }
                                reduced.push(child)
                            }
                        }
                        if (buffer.length) {
                            reduced.push(ContentNode(/*inline*/ buffer))
                        }
                        nodeValue.children = reduced
                    }
                }
                break
            }
            case TOKEN_TYPE.CONTENT: {
                nodeValue.children.push(ContentNode(/*inline*/ tok.value))
                break
            }
            case TOKEN_TYPE.EOF: {
                return rootNode
            }
            default: {
                throw new Error(
                    `Unknown Lexem type: ${tok.type} "${tok.value}, scoping element: ${nodeValue.type}"`
                )
            }
        }
    }
    return rootNode
}

function transpile(xmlAsString, astConverter) {
    const lexer = createLexer(xmlAsString)
    const ast = parseXML(lexer, xmlAsString)
    return astConverter ? astConverter.convert(ast) : ast
}

module.exports = {
    AttribNode,
    ContentNode,
    ElementNode,
    Node,
    transpile
}
