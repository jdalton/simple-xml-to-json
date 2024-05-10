'use strict'

const { BUILD, NODE_TYPE, TOKEN_TYPE } = require('./constants')
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

const ElementNode = ($type, $attributes, $children, $loc) => ({
    type: NODE_TYPE.ELEMENT,
    value: {
        type: $type,
        attributes: $attributes,
        children: $children,
        loc: $loc
    }
})

const Node = ($type, $value) => ({
    type: $type,
    value: $value
})

const createAST = (xmlAsString) => {
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
    const lexer = createLexer(xmlAsString)
    const rootNode = Node(/*inline*/ NODE_TYPE.ROOT, {
        children: [],
        loc: { start: 0, end: xmlAsString.length }
    })
    const scopingNode = [rootNode]

    while (lexer.hasNextToken()) {
        const tok = lexer.next()
        const { value: nodeValue } = scopingNode[scopingNode.length - 1]
        switch (tok.type) {
            case TOKEN_TYPE.OPEN_BRACKET: {
                const start = lexer.pos() - 1
                const { value: tagName } = lexer.next()
                const attribs = []
                let currTok = lexer.next()
                let currType = currTok.type
                while (
                    currType !== TOKEN_TYPE.CLOSE_BRACKET &&
                    currType !== TOKEN_TYPE.CLOSE_ELEMENT &&
                    currType !== TOKEN_TYPE.EOF &&
                    lexer.hasNextToken()
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
                    currType = currTok.type
                }
                currType = currTok.type
                const isSelfClosing =
                    currType === TOKEN_TYPE.CLOSE_ELEMENT ||
                    currType === TOKEN_TYPE.EOF
                const end = isSelfClosing ? lexer.pos() : start
                const childNode = ElementNode(/*inline*/ tagName, attribs, [], {
                    start,
                    end
                })
                nodeValue.children.push(childNode)
                if (!isSelfClosing) {
                    scopingNode.push(childNode)
                }
                break
            }
            case TOKEN_TYPE.CLOSE_ELEMENT: {
                if (tok.value === nodeValue.type) {
                    scopingNode.pop()
                    nodeValue.loc.end = lexer.pos()
                    const { children } = nodeValue
                    const { length: childrenLength } = children
                    const firstChild =
                        childrenLength > 0 ? children[0] : undefined
                    if (firstChild && firstChild.type === NODE_TYPE.CONTENT) {
                        let buffer = firstChild.value
                        const reduced = []
                        for (let i = 1; i < childrenLength; i += 1) {
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

module.exports = {
    createAST,
    // prettier-ignore
    ...(BUILD.COMPTIME
        ? {
            AttribNode,
            ContentNode,
            ElementNode,
            Node 
        }
        : {})
}
