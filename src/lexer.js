'use strict'

const { BIT, BUILD, CHAR_CODE, TOKEN_TYPE } = require('./constants')
const { Token } = require('./model')

const EOF_TOKEN = Token(/*inline*/ TOKEN_TYPE.EOF, '')

function createLexer(xmlAsString, { knownAttrib, knownElement } = {}) {
    const { length: xmlLength } = xmlAsString
    const scoping = []
    let currScope = 0
    let currToken = EOF_TOKEN
    let currTokenType = 0
    let isErrored = 0
    let peekedPos = 0
    let peekedTagName = ''
    let peekedTokenType = 0
    let pos = 0
    let seenRootTagName = false
    let erroredMessage

    const getPos = () => pos
    const getScope = () => currScope
    const peek = () => xmlAsString.charCodeAt(pos)
    const hasNext = () => pos < xmlLength

    const initializePosForLexer = () => {
        skipSpaces(/*inline*/)
        skipXMLDocumentHeader(/*inline*/)
    }

    const isAssignToAttribute = () => currTokenType === TOKEN_TYPE.ASSIGN

    const isBlank = ($code) =>
        $code === CHAR_CODE.SPACE ||
        $code === CHAR_CODE.NEW_LINE ||
        $code === CHAR_CODE.CARRIAGE_RETURN ||
        $code === CHAR_CODE.TAB

    const isElementBegin = () => currTokenType === TOKEN_TYPE.OPEN_ANGLE_BRACKET

    const isQuote = ($code) =>
        $code === CHAR_CODE.DOUBLE_QUOTE || $code === CHAR_CODE.SINGLE_QUOTE

    const peekCDStart = () =>
        pos + 7 < xmlLength &&
        xmlAsString.charCodeAt(pos) === CHAR_CODE.EXCLAMATION_POINT &&
        xmlAsString.charCodeAt(pos + 1) === CHAR_CODE.OPEN_SQUARE_BRACKET &&
        xmlAsString.charCodeAt(pos + 2) === CHAR_CODE.UPPER_C &&
        xmlAsString.charCodeAt(pos + 3) === CHAR_CODE.UPPER_D &&
        xmlAsString.charCodeAt(pos + 4) === CHAR_CODE.UPPER_A &&
        xmlAsString.charCodeAt(pos + 5) === CHAR_CODE.UPPER_T &&
        xmlAsString.charCodeAt(pos + 6) === CHAR_CODE.UPPER_A &&
        xmlAsString.charCodeAt(pos + 7) === CHAR_CODE.OPEN_SQUARE_BRACKET

    const peekCDEnd = () =>
        // prettier-ignore
        pos < xmlLength &&
        (
            pos + 2 >= xmlLength ||
            (
                xmlAsString.charCodeAt(pos + 2) === CHAR_CODE.CLOSE_ANGLE_BRACKET &&
                xmlAsString.charCodeAt(pos + 1) === CHAR_CODE.CLOSE_SQUARE_BRACKET &&
                xmlAsString.charCodeAt(pos) === CHAR_CODE.CLOSE_SQUARE_BRACKET
            )
        )

    const peekCommentStart = () =>
        pos + 2 < xmlLength &&
        xmlAsString.charCodeAt(pos) === CHAR_CODE.EXCLAMATION_POINT &&
        xmlAsString.charCodeAt(pos + 1) === CHAR_CODE.HYPHEN &&
        xmlAsString.charCodeAt(pos + 2) === CHAR_CODE.HYPHEN

    const peekCommentEnd = () =>
        // prettier-ignore
        pos < xmlLength &&
        (
            pos + 2 >= xmlLength ||
            (
                xmlAsString.charCodeAt(pos + 2) === CHAR_CODE.CLOSE_ANGLE_BRACKET &&
                xmlAsString.charCodeAt(pos + 1) === CHAR_CODE.HYPHEN &&
                xmlAsString.charCodeAt(pos) === CHAR_CODE.HYPHEN
            )
        )

    const readAlphaNumericAndSpecialChars = () => {
        const start = pos
        skipAlphaNumericAndSpecialChars(/*inline*/)
        const str = xmlAsString.slice(start, pos)
        return replaceQuotes(str)
    }

    const readBracketsAsBitmask = () => {
        if (hasNext(/*inline*/)) {
            switch (peek(/*inline*/)) {
                case CHAR_CODE.OPEN_ANGLE_BRACKET: {
                    pos += 1
                    if (
                        hasNext(/*inline*/) &&
                        peek(/*inline*/) === CHAR_CODE.FORWARD_SLASH
                    ) {
                        pos += 1
                        return BIT.OPEN_ANGLE_BRACKET_SLASH
                    }
                    if (peekCommentStart(/*inline*/)) {
                        // its a comment
                        pos += 3
                        return BIT.COMMENT
                    }
                    if (peekCDStart(/*inline*/)) {
                        // is CDATA
                        pos += 8
                        return BIT.CDATA
                    }
                    return BIT.OPEN_ANGLE_BRACKET
                }
                case CHAR_CODE.FORWARD_SLASH: {
                    pos += 1
                    if (
                        hasNext(/*inline*/) &&
                        peek(/*inline*/) === CHAR_CODE.CLOSE_ANGLE_BRACKET
                    ) {
                        pos += 1
                        return BIT.SLASH_CLOSE_ANGLE_BRACKET
                    }
                    return BIT.FORWARD_SLASH
                }
                case CHAR_CODE.EQUAL_SIGN: {
                    pos += 1
                    return BIT.EQUAL_SIGN
                }
                case CHAR_CODE.CLOSE_ANGLE_BRACKET: {
                    pos += 1
                    return BIT.CLOSE_ANGLE_BRACKET
                }
            }
        }
        return 0
    }

    const readCData = () => {
        const start = pos
        while (!(peekCDEnd(/*inline*/))) {
            pos += 1
        }
        const str = xmlAsString.slice(start, pos)
        if (pos !== xmlLength) pos += 3
        return str
    }

    const readTagName = () => {
        const start = pos
        skipTagName(/*inline*/)
        return xmlAsString.slice(start, pos)
    }

    const replaceQuotes = ($str) => {
        let output = ''
        let fromIndex = 0
        let index = 0
        while ((index = $str.indexOf("'", fromIndex)) !== -1) {
            output = output + $str.slice(fromIndex, index) + '"'
            fromIndex = index + 1
        }
        return fromIndex ? output + $str.slice(fromIndex) : $str
    }

    const skipAlphaNumericAndSpecialChars = () => {
        while (hasNext(/*inline*/)) {
            const code = peek(/*inline*/)
            // inline /[^>=<]/.test(xmlAsString[pos])
            if (
                code !== CHAR_CODE.OPEN_ANGLE_BRACKET &&
                code !== CHAR_CODE.EQUAL_SIGN &&
                code !== CHAR_CODE.CLOSE_ANGLE_BRACKET
            ) {
                pos += 1
                continue
            }
            break
        }
    }

    const skipCDSect = () => {
        while (!(peekCDEnd(/*inline*/))) {
            pos += 1
        }
        if (pos !== xmlLength) pos += 3
    }

    const skipComment = () => {
        while (!(peekCommentEnd(/*inline*/))) {
            pos += 1
        }
        if (pos !== xmlLength) pos += 3
    }

    const skipQuotes = () => {
        if (hasNext(/*inline*/)) {
            const code = peek(/*inline*/)
            if (isQuote(/*inline*/ code)) {
                pos += 1
            }
        }
    }

    const skipSpaces = () => {
        while (hasNext(/*inline*/)) {
            const code = peek(/*inline*/)
            if (isBlank(/*inline*/ code)) {
                pos += 1
                continue
            }
            break
        }
    }

    const skipTagName = () => {
        let isFirstChar = true
        while (hasNext(/*inline*/)) {
            const code = peek(/*inline*/)
            // A tag name can start with ONLY [a-zA-Z] characters.
            if (isFirstChar) {
                isFirstChar = false
                if (
                    (code >= CHAR_CODE.LOWER_A && code <= CHAR_CODE.LOWER_Z) ||
                    (code >= CHAR_CODE.UPPER_A && code <= CHAR_CODE.UPPER_Z)
                ) {
                    pos += 1
                    continue
                }
                isErrored = 1
            }
            // The rest of the tag name can contain [a-zA-Z0-9_:.-] characters.
            if (
                (code >= CHAR_CODE.LOWER_A && code <= CHAR_CODE.LOWER_Z) ||
                (code >= CHAR_CODE.UPPER_A && code <= CHAR_CODE.UPPER_Z) ||
                (code >= CHAR_CODE.DIGIT_0 && code <= CHAR_CODE.DIGIT_9) ||
                code === CHAR_CODE.LODASH ||
                code === CHAR_CODE.COLON ||
                code === CHAR_CODE.PERIOD ||
                code === CHAR_CODE.HYPHEN
            ) {
                pos += 1
                continue
            }
            break
        }
    }

    const skipXMLDocumentHeader = () => {
        // inline xmlAsString.startsWith('<?xml', pos)
        if (
            peek(/*inline*/) === CHAR_CODE.OPEN_ANGLE_BRACKET &&
            xmlAsString.charCodeAt(pos + 1) === CHAR_CODE.QUESTION_MARK &&
            xmlAsString.charCodeAt(pos + 2) === CHAR_CODE.LOWER_X &&
            xmlAsString.charCodeAt(pos + 3) === CHAR_CODE.LOWER_M &&
            xmlAsString.charCodeAt(pos + 4) === CHAR_CODE.LOWER_L
        ) {
            while (hasNext(/*inline*/)) {
                if (peek(/*inline*/) !== CHAR_CODE.QUESTION_MARK) {
                    pos += 1
                } else if (
                    xmlAsString.charCodeAt(pos + 1) ===
                    CHAR_CODE.CLOSE_ANGLE_BRACKET
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

    const throws = (message) => {
        isErrored = 1
        erroredMessage = message
        throw new Error(message)
    }

    const next = () => {
        if (isErrored) {
            throws(/*inline*/ erroredMessage)
        }
        let skippingScope = null
        let skippingAttrib = false
        while (true) {
            if (skippingScope === null) {
                let prevPos = pos
                if (peekedPos === 0) {
                    skipSpaces(/*inline*/)
                } else if (peekedTokenType === TOKEN_TYPE.EOF) {
                    pos = peekedPos
                    peekedPos = 0
                    peekedTagName = ''
                    peekedTokenType = 0
                }
                if (!(hasNext(/*inline*/))) {
                    currToken = EOF_TOKEN
                    currTokenType = TOKEN_TYPE.EOF
                    return currToken
                }
                if (isElementBegin(/*inline*/)) {
                    // starting new element
                    const tagName = peekedTagName
                    pos = peekedPos
                    peekedPos = 0
                    peekedTagName = ''
                    peekedTokenType = 0
                    currScope = { tagName }
                    currTokenType = TOKEN_TYPE.ELEMENT_TYPE
                    currToken = Token(
                        /*inline*/ TOKEN_TYPE.ELEMENT_TYPE,
                        tagName
                    )
                    scoping.push(currScope)
                    return currToken
                }
                if (isAssignToAttribute(/*inline*/)) {
                    // assign value to attribute
                    skipQuotes(/*inline*/)
                    let start = pos
                    while (hasNext(/*inline*/)) {
                        const code = peek(/*inline*/)
                        if (isQuote(/*inline*/ code)) {
                            break
                        }
                        pos += 1
                    }
                    currTokenType = TOKEN_TYPE.ATTRIB_VALUE
                    if (skippingAttrib) {
                        skippingAttrib = false
                        pos += 1
                        continue
                    }
                    const str = xmlAsString.slice(start, pos)
                    const buffer = replaceQuotes(str)
                    pos += 1
                    currToken = Token(
                        /*inline*/ TOKEN_TYPE.ATTRIB_VALUE,
                        buffer
                    )
                    return currToken
                }
                const numOfSpacesSkipped = pos - prevPos
                skipSpaces(/*inline*/)
                switch (readBracketsAsBitmask()) {
                    case BIT.OPEN_ANGLE_BRACKET: {
                        const prevPos = pos
                        // peek at tag name
                        skipSpaces(/*inline*/)
                        peekedPos = pos
                        if (!(hasNext(/*inline*/))) {
                            peekedTokenType = TOKEN_TYPE.EOF
                        } else {
                            const start = pos
                            peekedTagName = readTagName()
                            isErrored |= pos === start
                            if (isErrored) {
                                throws(
                                    /*inline*/ `Invalid tag name: "${peekedTagName}"`
                                )
                            }
                            peekedTokenType = TOKEN_TYPE.ELEMENT_TYPE
                            peekedPos = pos
                            if (
                                seenRootTagName &&
                                typeof knownElement === 'function' &&
                                !knownElement(peekedTagName)
                            ) {
                                const tagName = peekedTagName
                                peekedPos = 0
                                peekedTagName = ''
                                currScope = { tagName }
                                currTokenType = TOKEN_TYPE.ELEMENT_TYPE
                                skippingScope = currScope
                                skippingAttrib = true
                                scoping.push(currScope)
                                break
                            } else if (seenRootTagName === false) {
                                seenRootTagName = true
                            }
                        }
                        // Restore pos after peeking so that the APIs report
                        // expected values for the current position/token.
                        pos = prevPos
                        currTokenType = TOKEN_TYPE.OPEN_ANGLE_BRACKET
                        currToken = Token(
                            /*inline*/ TOKEN_TYPE.OPEN_ANGLE_BRACKET,
                            ''
                        )
                        return currToken
                    }
                    case BIT.OPEN_ANGLE_BRACKET_SLASH: {
                        scoping.pop()
                        const start = pos
                        while (
                            peek(/*inline*/) !== CHAR_CODE.CLOSE_ANGLE_BRACKET
                        )
                            pos += 1
                        currScope = scoping[scoping.length - 1]
                        currTokenType = TOKEN_TYPE.CLOSE_ELEMENT
                        currToken = Token(
                            /*inline*/
                            TOKEN_TYPE.CLOSE_ELEMENT,
                            xmlAsString.slice(start, pos)
                        )
                        pos += 1 // skip the ">"
                        return currToken
                    }
                    case BIT.CLOSE_ANGLE_BRACKET: {
                        currTokenType = TOKEN_TYPE.CLOSE_ANGLE_BRACKET
                        currToken = Token(
                            /*inline*/ TOKEN_TYPE.CLOSE_ANGLE_BRACKET,
                            ''
                        )
                        return currToken
                    }
                    case BIT.SLASH_CLOSE_ANGLE_BRACKET: {
                        const { tagName } = scoping.pop()
                        currScope = scoping[scoping.length - 1]
                        currTokenType = TOKEN_TYPE.CLOSE_ELEMENT
                        currToken = Token(
                            /*inline*/
                            TOKEN_TYPE.CLOSE_ELEMENT,
                            tagName
                        )
                        return currToken
                    }
                    case BIT.EQUAL_SIGN: {
                        if (currTokenType === TOKEN_TYPE.ATTRIB_NAME) {
                            currTokenType = TOKEN_TYPE.ASSIGN
                            if (skippingAttrib) break
                            currToken = Token(/*inline*/ TOKEN_TYPE.ASSIGN, '')
                            return currToken
                        }
                        currTokenType = TOKEN_TYPE.CONTENT
                        currToken = Token(/*inline*/ TOKEN_TYPE.CONTENT, '=')
                        return currToken
                    }
                    case BIT.CDATA: {
                        currTokenType = TOKEN_TYPE.CONTENT
                        currToken = Token(
                            /*inline*/
                            TOKEN_TYPE.CONTENT,
                            readCData()
                        )
                        return currToken
                    }
                    case BIT.COMMENT: {
                        skipComment(/*inline*/)
                        break
                    }
                    default: {
                        const buffer = readAlphaNumericAndSpecialChars()
                        if (buffer.length === 0) {
                            throws(
                                /*inline*/ `Unknown Syntax : "${xmlAsString[pos]}"`
                            )
                        }
                        // here we fall if we have alphanumeric string, which can be related to attributes, content or nothing
                        if (currTokenType === TOKEN_TYPE.CLOSE_ANGLE_BRACKET) {
                            currTokenType = TOKEN_TYPE.CONTENT
                            currToken =
                                // prettier-ignore
                                peek(/*inline*/) === CHAR_CODE.OPEN_ANGLE_BRACKET
                                    ? Token(
                                        /*inline*/
                                        TOKEN_TYPE.CONTENT,
                                        buffer
                                    )
                                    : Token(
                                        /*inline*/
                                        TOKEN_TYPE.CONTENT,
                                        buffer +
                                                readAlphaNumericAndSpecialChars()
                                    )
                            return currToken
                        }
                        if (
                            currTokenType !== TOKEN_TYPE.ATTRIB_NAME &&
                            currTokenType !== TOKEN_TYPE.CONTENT
                        ) {
                            if (currTokenType === TOKEN_TYPE.CLOSE_ELEMENT) {
                                // we're assuming this is content, part of unstructured data
                                currTokenType = TOKEN_TYPE.CONTENT
                                currToken = Token(
                                    /*inline*/
                                    TOKEN_TYPE.CONTENT,
                                    ' '.repeat(numOfSpacesSkipped) + buffer
                                )
                                return currToken
                            }
                            // it should be an attribute name token
                            currTokenType = TOKEN_TYPE.ATTRIB_NAME
                            if (
                                typeof knownAttrib === 'function' &&
                                !knownAttrib(buffer)
                            ) {
                                skippingAttrib = true
                                break
                            }
                            currToken = Token(
                                /*inline*/
                                TOKEN_TYPE.ATTRIB_NAME,
                                buffer
                            )
                            return currToken
                        }
                        currTokenType = TOKEN_TYPE.CONTENT
                        currToken = Token(
                            /*inline*/
                            TOKEN_TYPE.CONTENT,
                            ' '.repeat(numOfSpacesSkipped) + buffer // spaces included as content
                        )
                        return currToken
                    }
                }
            } else {
                skipSpaces(/*inline*/)
                if (!(hasNext(/*inline*/))) {
                    currToken = EOF_TOKEN
                    currTokenType = TOKEN_TYPE.EOF
                    return currToken
                }
                if (isElementBegin(/*inline*/)) {
                    // starting new element
                    const start = pos
                    skipTagName()
                    isErrored |= pos === start
                    if (isErrored) {
                        throws(
                            /*inline*/ `Invalid tag name: "${xmlAsString.slice(start, pos)}"`
                        )
                    }
                    currScope = { tagName: '' }
                    currTokenType = TOKEN_TYPE.ELEMENT_TYPE
                    scoping.push(currScope)
                    continue
                }
                if (isAssignToAttribute(/*inline*/)) {
                    // assign value to attribute
                    skipQuotes(/*inline*/)
                    while (hasNext(/*inline*/)) {
                        const code = peek(/*inline*/)
                        if (isQuote(/*inline*/ code)) {
                            break
                        }
                        pos += 1
                    }
                    pos += 1
                    currTokenType = TOKEN_TYPE.ATTRIB_VALUE
                    continue
                }
                skipSpaces(/*inline*/)
                switch (readBracketsAsBitmask()) {
                    case BIT.OPEN_ANGLE_BRACKET: {
                        currTokenType = TOKEN_TYPE.OPEN_ANGLE_BRACKET
                        break
                    }
                    case BIT.OPEN_ANGLE_BRACKET_SLASH: {
                        const isDoneSkipping = scoping.pop() === skippingScope
                        while (
                            peek(/*inline*/) !== CHAR_CODE.CLOSE_ANGLE_BRACKET
                        )
                            pos += 1
                        currScope = scoping[scoping.length - 1]
                        currTokenType = TOKEN_TYPE.CLOSE_ELEMENT
                        if (isDoneSkipping) skippingScope = null
                        pos += 1 // skip the ">"
                        break
                    }
                    case BIT.CLOSE_ANGLE_BRACKET: {
                        currTokenType = TOKEN_TYPE.CLOSE_ANGLE_BRACKET
                        break
                    }
                    case BIT.SLASH_CLOSE_ANGLE_BRACKET: {
                        const isDoneSkipping = scoping.pop() === skippingScope
                        currScope = scoping[scoping.length - 1]
                        currTokenType = TOKEN_TYPE.CLOSE_ELEMENT
                        if (isDoneSkipping) skippingScope = null
                        break
                    }
                    case BIT.EQUAL_SIGN: {
                        currTokenType =
                            currTokenType === TOKEN_TYPE.ATTRIB_NAME
                                ? TOKEN_TYPE.ASSIGN
                                : TOKEN_TYPE.CONTENT
                        break
                    }
                    case BIT.CDATA: {
                        skipCDSect(/*inline*/)
                        break
                    }
                    case BIT.COMMENT: {
                        skipComment(/*inline*/)
                        break
                    }
                    default: {
                        const start = pos
                        skipAlphaNumericAndSpecialChars()
                        if (pos === start) {
                            throws(
                                /*inline*/ `Unknown Syntax : "${xmlAsString[pos]}"`
                            )
                        }
                        // here we fall if we have alphanumeric string, which can be related to attributes, content or nothing
                        if (currTokenType === TOKEN_TYPE.CLOSE_ANGLE_BRACKET) {
                            currTokenType = TOKEN_TYPE.CONTENT
                            if (
                                peek(/*inline*/) !==
                                CHAR_CODE.OPEN_ANGLE_BRACKET
                            ) {
                                skipAlphaNumericAndSpecialChars()
                            }
                        } else if (
                            currTokenType !== TOKEN_TYPE.ATTRIB_NAME &&
                            currTokenType !== TOKEN_TYPE.CONTENT
                        ) {
                            currTokenType =
                                // prettier-ignore
                                currTokenType === TOKEN_TYPE.CLOSE_ELEMENT
                                    // we're assuming this is content, part of unstructured data
                                    ? TOKEN_TYPE.CONTENT
                                    // it should be an attribute name token
                                    : TOKEN_TYPE.ATTRIB_NAME
                        } else {
                            currTokenType = TOKEN_TYPE.CONTENT
                        }
                    }
                }
            }
        }
    }

    initializePosForLexer(/*inline*/)

    return {
        hasNext,
        next,
        peek,
        pos: getPos,
        scope: getScope,
        // prettier-ignore
        ...(BUILD.COMPTIME
            ? {
                initializePosForLexer,
                isAssignToAttribute,
                isBlank,
                isElementBegin,
                isQuote,
                peekCDEnd,
                peekCDStart,
                peekCommentEnd,
                peekCommentStart,
                skipAlphaNumericAndSpecialChars,
                skipCDSect,
                skipComment,
                skipQuotes,
                skipSpaces,
                skipTagName,
                skipXMLDocumentHeader,
                throws
            }
            : {})
    }
}

module.exports = {
    createLexer
}
