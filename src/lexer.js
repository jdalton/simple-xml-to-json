'use strict'

const { BIT, BUILD, CHAR_CODE, TOKEN_TYPE } = require('./constants')
const { Token } = require('./model')

const EOF_TOKEN = Token(/*inline*/ TOKEN_TYPE.EOF)

function createLexer(xmlAsString) {
    const { length } = xmlAsString
    const scopingTagName = []
    let currentToken = null
    let pos = 0

    const getPos = () => pos
    const peek = () => xmlAsString.charCodeAt(pos)
    const hasNextPos = () => pos < length
    const hasNextToken = () => currentToken !== EOF_TOKEN && pos < length

    const initializePosForLexer = () => {
        skipSpaces(/*inline*/)
        skipXMLDocumentHeader(/*inline*/)
    }

    const isAssignToAttribute = () =>
        currentToken && currentToken.type === TOKEN_TYPE.ASSIGN

    const isBlank = ($code) =>
        $code === CHAR_CODE.SPACE ||
        $code === CHAR_CODE.NEW_LINE ||
        $code === CHAR_CODE.CARRIAGE_RETURN ||
        $code === CHAR_CODE.TAB

    const isElementBegin = () =>
        currentToken && currentToken.type === TOKEN_TYPE.OPEN_BRACKET

    const isQuote = ($code) =>
        $code === CHAR_CODE.DOUBLE_QUOTE || $code === CHAR_CODE.SINGLE_QUOTE

    const replaceQuotes = (str) => str.replaceAll("'", '"')

    const skipQuotes = () => {
        if (hasNextPos(/*inline*/)) {
            const code = peek(/*inline*/)
            if (isQuote(/*inline*/ code)) {
                pos += 1
            }
        }
    }

    const skipSpaces = () => {
        while (hasNextPos(/*inline*/)) {
            const code = peek(/*inline*/)
            if (isBlank(/*inline*/ code)) {
                pos += 1
                continue
            }
            break
        }
    }

    const skipXMLDocumentHeader = () => {
        // inline xmlAsString.startsWith('<?xml', pos)
        if (
            peek(/*inline*/) === CHAR_CODE.OPEN_BRACKET &&
            xmlAsString.charCodeAt(pos + 1) === CHAR_CODE.QUESTION_MARK &&
            xmlAsString.charCodeAt(pos + 2) === CHAR_CODE.LOWER_X &&
            xmlAsString.charCodeAt(pos + 3) === CHAR_CODE.LOWER_M &&
            xmlAsString.charCodeAt(pos + 4) === CHAR_CODE.LOWER_L
        ) {
            while (hasNextPos(/*inline*/)) {
                if (peek(/*inline*/) !== CHAR_CODE.QUESTION_MARK) {
                    pos += 1
                } else if (
                    xmlAsString.charCodeAt(pos + 1) === CHAR_CODE.CLOSE_BRACKET
                ) {
                    // skip "?>"
                    pos += 2
                    break
                } else {
                    pos += 1
                }
            }
        }
    }

    const readBracketsAsBitmask = () => {
        if (hasNextPos(/*inline*/)) {
            const code = peek(/*inline*/)
            if (code === CHAR_CODE.OPEN_BRACKET) {
                pos += 1
                if (
                    hasNextPos(/*inline*/) &&
                    peek(/*inline*/) === CHAR_CODE.FORWARD_SLASH
                ) {
                    pos += 1
                    return BIT.OPEN_BRACKET_SLASH
                }
                if (
                    hasNextPos(/*inline*/) &&
                    peek(/*inline*/) === CHAR_CODE.EXCLAMATION_POINT &&
                    xmlAsString.charCodeAt(pos + 1) === CHAR_CODE.HYPHEN &&
                    xmlAsString.charCodeAt(pos + 2) === CHAR_CODE.HYPHEN
                ) {
                    // its a comment
                    pos += 3
                    return BIT.COMMENT
                }
                return BIT.OPEN_BRACKET
            }
            if (code === CHAR_CODE.FORWARD_SLASH) {
                pos += 1
                if (
                    hasNextPos(/*inline*/) &&
                    peek(/*inline*/) === CHAR_CODE.CLOSE_BRACKET
                ) {
                    pos += 1
                    return BIT.SLASH_CLOSE_BRACKET
                }
                return BIT.FORWARD_SLASH
            } else if (code === CHAR_CODE.EQUAL_SIGN) {
                pos += 1
                return BIT.EQUAL_SIGN
            } else if (code === CHAR_CODE.CLOSE_BRACKET) {
                pos += 1
                return BIT.CLOSE_BRACKET
            }
        }
        return 0
    }

    const readAlphaNumericCharsAndBrackets = () => {
        if (hasNextPos(/*inline*/)) {
            const code = peek(/*inline*/)
            if (code === CHAR_CODE.OPEN_BRACKET) {
                pos += 1
                if (
                    hasNextPos(/*inline*/) &&
                    peek(/*inline*/) === CHAR_CODE.FORWARD_SLASH
                ) {
                    pos += 1
                    return '</'
                }
                if (
                    hasNextPos(/*inline*/) &&
                    peek(/*inline*/) === CHAR_CODE.EXCLAMATION_POINT &&
                    xmlAsString.charCodeAt(pos + 1) === CHAR_CODE.HYPHEN &&
                    xmlAsString.charCodeAt(pos + 2) === CHAR_CODE.HYPHEN
                ) {
                    // its a comment
                    pos += 3
                    return '<!--'
                }
                return '<'
            }
            if (code === CHAR_CODE.FORWARD_SLASH) {
                pos += 1
                if (
                    hasNextPos(/*inline*/) &&
                    peek(/*inline*/) === CHAR_CODE.CLOSE_BRACKET
                ) {
                    pos += 1
                    return '/>'
                }
                return '/'
            } else if (code === CHAR_CODE.EQUAL_SIGN) {
                pos += 1
                return '='
            } else if (code === CHAR_CODE.CLOSE_BRACKET) {
                pos += 1
                return '>'
            }
        }
        return readAlphaNumericChars()
    }

    const readAlphaNumericChars = () => {
        let start = pos
        while (hasNextPos(/*inline*/)) {
            const code = peek(/*inline*/)
            // inline /[a-zA-Z0-9_:-]/.test(xmlAsString[pos])
            if (
                (code >= CHAR_CODE.LOWER_A && code <= CHAR_CODE.LOWER_Z) ||
                (code >= CHAR_CODE.UPPER_A && code <= CHAR_CODE.UPPER_Z) ||
                (code >= CHAR_CODE.DIGIT_0 && code <= CHAR_CODE.DIGIT_9) ||
                code === CHAR_CODE.LODASH ||
                code === CHAR_CODE.COLON ||
                code === CHAR_CODE.HYPHEN
            ) {
                pos += 1
                continue
            }
            break
        }
        const str = xmlAsString.slice(start, pos)
        return replaceQuotes(/*inline*/ str)
    }

    const readAlphaNumericAndSpecialChars = () => {
        let start = pos
        while (hasNextPos(/*inline*/)) {
            const code = peek(/*inline*/)
            // inline /[^>=<]/u.test(xmlAsString[pos])
            if (
                code !== CHAR_CODE.OPEN_BRACKET &&
                code !== CHAR_CODE.EQUAL_SIGN &&
                code !== CHAR_CODE.CLOSE_BRACKET
            ) {
                pos += 1
                continue
            }
            break
        }
        const str = xmlAsString.slice(start, pos)
        return replaceQuotes(/*inline*/ str)
    }

    const next = () => {
        let eating = true
        eatingLoop: while (eating) {
            eating = false
            const prevPos = pos
            skipSpaces(/*inline*/)
            const numOfSpacesSkipped = pos - prevPos
            if (!(hasNextPos(/*inline*/))) {
                currentToken = EOF_TOKEN
                return currentToken
            } else if (isElementBegin(/*inline*/)) {
                // starting new element
                skipSpaces(/*inline*/)
                const tagName = readAlphaNumericCharsAndBrackets()
                currentToken = Token(
                    /*inline*/ TOKEN_TYPE.ELEMENT_TYPE,
                    tagName
                )
                scopingTagName.push(tagName)
            } else if (isAssignToAttribute(/*inline*/)) {
                // assign value to attribute
                skipQuotes(/*inline*/)
                let start = pos
                while (hasNextPos(/*inline*/)) {
                    const code = peek(/*inline*/)
                    if (isQuote(/*inline*/ code)) {
                        break
                    }
                    pos += 1
                }
                const str = xmlAsString.slice(start, pos)
                const buffer = replaceQuotes(/*inline*/ str)
                pos += 1
                currentToken = Token(/*inline*/ TOKEN_TYPE.ATTRIB_VALUE, buffer)
            } else {
                skipSpaces(/*inline*/)
                switch (readBracketsAsBitmask()) {
                    case BIT.OPEN_BRACKET: {
                        currentToken = Token(/*inline*/ TOKEN_TYPE.OPEN_BRACKET)
                        break
                    }
                    case BIT.OPEN_BRACKET_SLASH: {
                        const start = pos
                        while (peek(/*inline*/) !== CHAR_CODE.CLOSE_BRACKET)
                            pos += 1
                        currentToken = Token(
                            /*inline*/
                            TOKEN_TYPE.CLOSE_ELEMENT,
                            xmlAsString.slice(start, pos)
                        )
                        pos += 1 // skip the ">"
                        scopingTagName.pop()
                        break
                    }
                    case BIT.CLOSE_BRACKET: {
                        currentToken = Token(
                            /*inline*/ TOKEN_TYPE.CLOSE_BRACKET
                        )
                        break
                    }
                    case BIT.SLASH_CLOSE_BRACKET: {
                        currentToken = Token(
                            /*inline*/
                            TOKEN_TYPE.CLOSE_ELEMENT,
                            scopingTagName.pop()
                        )
                        break
                    }
                    case BIT.EQUAL_SIGN: {
                        if (currentToken.type === TOKEN_TYPE.ATTRIB_NAME) {
                            currentToken = Token(/*inline*/ TOKEN_TYPE.ASSIGN)
                        } else {
                            currentToken = Token(
                                /*inline*/ TOKEN_TYPE.CONTENT,
                                '='
                            )
                        }
                        break
                    }
                    case BIT.COMMENT: {
                        // skipComment contents
                        const closingBuff = [
                            CHAR_CODE.EXCLAMATION_POINT,
                            CHAR_CODE.HYPHEN,
                            CHAR_CODE.HYPHEN
                        ]
                        while (
                            hasNextPos(/*inline*/) &&
                            (closingBuff[2] !== CHAR_CODE.CLOSE_BRACKET ||
                                closingBuff[1] !== CHAR_CODE.HYPHEN ||
                                closingBuff[0] !== CHAR_CODE.HYPHEN)
                        ) {
                            closingBuff.shift()
                            closingBuff.push(peek(/*inline*/))
                            pos += 1
                        }
                        eating = true
                        continue eatingLoop
                    }
                    default: {
                        const buffer = readAlphaNumericAndSpecialChars()
                        // here we fall if we have alphanumeric string, which can be related to attributes, content or nothing
                        if (buffer.length > 0) {
                            if (
                                currentToken.type === TOKEN_TYPE.CLOSE_BRACKET
                            ) {
                                if (
                                    peek(/*inline*/) !== CHAR_CODE.OPEN_BRACKET
                                ) {
                                    currentToken = Token(
                                        /*inline*/
                                        TOKEN_TYPE.CONTENT,
                                        buffer +
                                            readAlphaNumericAndSpecialChars()
                                    )
                                } else {
                                    currentToken = Token(
                                        /*inline*/
                                        TOKEN_TYPE.CONTENT,
                                        buffer
                                    )
                                }
                            } else if (
                                currentToken.type !== TOKEN_TYPE.ATTRIB_NAME &&
                                currentToken.type !== TOKEN_TYPE.CONTENT
                            ) {
                                if (
                                    currentToken.type ===
                                    TOKEN_TYPE.CLOSE_ELEMENT
                                ) {
                                    // we're assuming this is content, part of unstructured data
                                    currentToken = Token(
                                        /*inline*/
                                        TOKEN_TYPE.CONTENT,
                                        ' '.repeat(numOfSpacesSkipped) + buffer
                                    )
                                } else {
                                    // it should be an attribute name token
                                    currentToken = Token(
                                        /*inline*/
                                        TOKEN_TYPE.ATTRIB_NAME,
                                        buffer
                                    )
                                }
                            } else {
                                currentToken = Token(
                                    /*inline*/
                                    TOKEN_TYPE.CONTENT,
                                    ' '.repeat(numOfSpacesSkipped) + buffer // spaces included as content
                                )
                            }
                            break
                        } else {
                            throw new Error(
                                `Unknown Syntax : "${xmlAsString[pos]}"`
                            )
                        }
                    }
                }
            }
        }

        return currentToken
    }

    initializePosForLexer(/*inline*/)

    return {
        hasNextPos,
        hasNextToken,
        next,
        peek,
        pos: getPos,
        // prettier-ignore
        ...(BUILD.COMPTIME
            ? {
                initializePosForLexer,
                isAssignToAttribute,
                isBlank,
                isElementBegin,
                isQuote,
                replaceQuotes,
                skipQuotes,
                skipSpaces,
                skipXMLDocumentHeader
            }
            : {})
    }
}

module.exports = {
    createLexer
}
