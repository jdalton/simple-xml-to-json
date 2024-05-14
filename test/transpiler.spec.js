'use strict'

const testUtils = require('./testUtils')
const { NODE_TYPE } = require('../src/constants')
const { AttribNode, ElementNode } = require('../src/parser')
const { convertXML, createAST } = require('../src/xmlToJson')

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>'

describe('issues', () => {
    it('issue #17 - support special char ¬', () => {
        const json = convertXML('<a><child>hi ¬</child></a>')
        expect(json).toEqual({
            a: {
                children: [
                    {
                        child: {
                            content: 'hi ¬'
                        }
                    }
                ]
            }
        })
    })

    describe('issue #22 - supporting unstructured XML', () => {
        xdescribe('Unsupported cases', () => {
            it('should support BLANK SPACES in unstructured XML -> TEXT + XML + BLANK SPACES + XML + TEXT', () => {
                const json = convertXML(
                    '<a>Hello <b>again</b>    <c>unstructured</c> XML</a>'
                )
                expect(json).toEqual({
                    a: {
                        children: [
                            {
                                content: 'Hello '
                            },
                            {
                                b: {
                                    content: 'again'
                                }
                            },
                            {
                                content: '    '
                            },
                            {
                                c: {
                                    content: 'unstructured'
                                }
                            },
                            {
                                content: ' XML'
                            }
                        ]
                    }
                })
            })
        })

        describe('Supported cases', () => {
            it('should support unstructured XML -> XML + TEXT', () => {
                const json = convertXML('<a><b>Hello</b> unstructured XML</a>')
                expect(json).toEqual({
                    a: {
                        children: [
                            {
                                b: {
                                    content: 'Hello'
                                }
                            },
                            {
                                content: ' unstructured XML'
                            }
                        ]
                    }
                })
            })

            it('should support unstructured XML -> TEXT + XML', () => {
                const json = convertXML(
                    '<a>Hello again <b>unstructured XML</b></a>'
                )
                expect(json).toEqual({
                    a: {
                        children: [
                            {
                                content: 'Hello again '
                            },
                            {
                                b: {
                                    content: 'unstructured XML'
                                }
                            }
                        ]
                    }
                })
            })

            it('should support unstructured XML -> XML + XML + TEXT + XML', () => {
                const json = convertXML(
                    '<a><Hello>inner content</Hello><b>again</b> unstructured <c>XML</c></a>'
                )
                expect(json).toEqual({
                    a: {
                        children: [
                            {
                                Hello: {
                                    content: 'inner content'
                                }
                            },
                            {
                                b: {
                                    content: 'again'
                                }
                            },
                            {
                                content: ' unstructured '
                            },
                            {
                                c: {
                                    content: 'XML'
                                }
                            }
                        ]
                    }
                })
            })

            it('should support unstructured XML -> TEXT + XML + TEXT + XML', () => {
                const json = convertXML(
                    '<a>Hello <b>again</b> unstructured <c>XML</c></a>'
                )
                expect(json).toEqual({
                    a: {
                        children: [
                            {
                                content: 'Hello '
                            },
                            {
                                b: {
                                    content: 'again'
                                }
                            },
                            {
                                content: ' unstructured '
                            },
                            {
                                c: {
                                    content: 'XML'
                                }
                            }
                        ]
                    }
                })
            })

            it('should support unstructured XML -> TEXT + XML + TEXT', () => {
                const json = convertXML(
                    '<p style="color: white;">This is a sentence <b>with</b> one word in bold</p>'
                )
                expect(json).toEqual({
                    p: {
                        style: 'color: white;',
                        children: [
                            {
                                content: 'This is a sentence '
                            },
                            {
                                b: {
                                    content: 'with'
                                }
                            },
                            {
                                content: ' one word in bold'
                            }
                        ]
                    }
                })
            })

            it('should support unstructured nested XML -> TEXT + XML + UNSTRUCTURED_XML + TEXT', () => {
                const json = convertXML(
                    '<p style="color: white;">This is a sentence <b>with</b><c>nested <unstructured>XML</unstructured></c> one word in bold</p>'
                )
                expect(json).toEqual({
                    p: {
                        style: 'color: white;',
                        children: [
                            {
                                content: 'This is a sentence '
                            },
                            {
                                b: {
                                    content: 'with'
                                }
                            },
                            {
                                c: {
                                    children: [
                                        {
                                            content: 'nested '
                                        },
                                        {
                                            unstructured: {
                                                content: 'XML'
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                content: ' one word in bold'
                            }
                        ]
                    }
                })
            })
        })
    })

    describe('issue #42 - conversion of self closing elements', () => {
        it('should support conversion of self closing elements', () => {
            const json = convertXML(
                '<parent><child attrib1="val1" attrib2="val2" /></parent>'
            )
            expect(json).toEqual({
                parent: {
                    children: [
                        {
                            child: {
                                attrib1: 'val1',
                                attrib2: 'val2'
                            }
                        }
                    ]
                }
            })
        })

        it('should support when nested', () => {
            const json = convertXML(`
            <?xml version="1.0" encoding="utf-8" ?>
<root>
  <item>
    <atom:link attrib="val" href="http://www.npmjs.com" />
  </item>
  <item>
    <atom:link attrib="val2" href="http://fr.wikipedia.org" />
  </item>
</root>
            `)
            expect(json).toEqual({
                root: {
                    children: [
                        {
                            item: {
                                children: [
                                    {
                                        'atom:link': {
                                            attrib: 'val',
                                            href: 'http://www.npmjs.com'
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            item: {
                                children: [
                                    {
                                        'atom:link': {
                                            attrib: 'val2',
                                            href: 'http://fr.wikipedia.org'
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            })
        })
    })
})

describe('transpiler', () => {
    describe('to AST', () => {
        it('should convert a very simple XML to a simple AST', () => {
            const mockXML = '<a></a>'
            const ast = createAST(mockXML)
            expect(ast).toEqual({
                type: NODE_TYPE.ROOT,
                value: {
                    children: [
                        {
                            type: NODE_TYPE.ELEMENT,
                            value: {
                                type: 'a',
                                attributes: [],
                                children: [],
                                loc: { start: 0, end: 7 }
                            }
                        }
                    ],
                    loc: { start: 0, end: 7 }
                }
            })
        })

        it('should convert a simple XML with content to a simple AST', () => {
            const mockXML = '<a>Hello content</a>'
            const ast = createAST(mockXML)
            expect(ast).toEqual({
                type: NODE_TYPE.ROOT,
                value: {
                    children: [
                        {
                            type: NODE_TYPE.ELEMENT,
                            value: {
                                type: 'a',
                                attributes: [],
                                children: [
                                    {
                                        type: NODE_TYPE.CONTENT,
                                        value: 'Hello content'
                                    }
                                ],
                                loc: { start: 0, end: 20 }
                            }
                        }
                    ],
                    loc: { start: 0, end: 20 }
                }
            })
        })

        it('should convert a very simple XML to a simple AST with XML schema declaration', () => {
            const mockXML = `
            ${XML_HEADER}
            <a></a>
            `
            const ast = createAST(mockXML)
            expect(ast).toEqual({
                type: NODE_TYPE.ROOT,
                value: {
                    children: [
                        {
                            type: NODE_TYPE.ELEMENT,
                            value: {
                                type: 'a',
                                attributes: [],
                                children: [],
                                loc: { start: 81, end: 88 }
                            }
                        }
                    ],
                    loc: { start: 0, end: 101 }
                }
            })
        })

        it('should convert a simple xml element with attributes to AST', () => {
            const mockXML = '<a p1="v1" p2="v2"></a>'
            const ast = createAST(mockXML)
            expect(ast).toEqual({
                type: NODE_TYPE.ROOT,
                value: {
                    children: [
                        {
                            type: NODE_TYPE.ELEMENT,
                            value: {
                                type: 'a',
                                attributes: [
                                    AttribNode('p1', 'v1'),
                                    AttribNode('p2', 'v2')
                                ],
                                children: [],
                                loc: { start: 0, end: 23 }
                            }
                        }
                    ],
                    loc: { start: 0, end: 23 }
                }
            })
        })

        it('should convert a full XML to AST', () => {
            const mockXML = `
            <a ap1="av1" ap2="av2">
                <b bp1='bv1'></b>
                <b bp2='bv2'></b>
                <b bp3='bv3'>
                    <c cp1='cv1' cp2='cv2'></c>
                </b>
            </a>
            `
            const ast = createAST(mockXML)
            expect(ast).toEqual({
                type: NODE_TYPE.ROOT,
                value: {
                    children: [
                        {
                            type: NODE_TYPE.ELEMENT,
                            value: {
                                type: 'a',
                                attributes: [
                                    AttribNode('ap1', 'av1'),
                                    AttribNode('ap2', 'av2')
                                ],
                                children: [
                                    ElementNode(
                                        'b',
                                        [AttribNode('bp1', 'bv1')],
                                        [],
                                        { start: 53, end: 70 }
                                    ),
                                    ElementNode(
                                        'b',
                                        [AttribNode('bp2', 'bv2')],
                                        [],
                                        { start: 87, end: 104 }
                                    ),
                                    ElementNode(
                                        'b',
                                        [AttribNode('bp3', 'bv3')],
                                        [
                                            {
                                                type: NODE_TYPE.ELEMENT,
                                                value: {
                                                    type: 'c',
                                                    attributes: [
                                                        AttribNode(
                                                            'cp1',
                                                            'cv1'
                                                        ),
                                                        AttribNode('cp2', 'cv2')
                                                    ],
                                                    children: [],
                                                    loc: {
                                                        start: 155,
                                                        end: 182
                                                    }
                                                }
                                            }
                                        ],
                                        { start: 121, end: 203 }
                                    )
                                ],
                                loc: { start: 13, end: 220 }
                            }
                        }
                    ],
                    loc: { start: 0, end: 233 }
                }
            })
        })

        it('should skip unknown elements', () => {
            const mockXML = `
            <a>
                <b></b>
                <c>
                    <d>D</d>
                    <e>
                        <f>F</f>
                        E
                    </e>
                    C
                </c>
            </a>
            `
            const ast = createAST(mockXML, {
                knownElement: (n) => n === 'a' || n === 'b'
            })
            expect(ast).toEqual({
                type: NODE_TYPE.ROOT,
                value: {
                    children: [
                        {
                            type: NODE_TYPE.ELEMENT,
                            value: {
                                type: 'a',
                                attributes: [],
                                children: [
                                    ElementNode('b', [], [], {
                                        start: 33,
                                        end: 40
                                    })
                                ],
                                loc: { start: 13, end: 257 }
                            }
                        }
                    ],
                    loc: { start: 0, end: 270 }
                }
            })
        })

        it('should skip unknown attributes', () => {
            const mockXML = "<a p1='v1' p2='v2' p3='v3'></a>"
            const ast = createAST(mockXML, {
                knownAttrib: (n) => n === 'p1' || n === 'p3'
            })
            expect(ast).toEqual({
                type: NODE_TYPE.ROOT,
                value: {
                    children: [
                        {
                            type: NODE_TYPE.ELEMENT,
                            value: {
                                type: 'a',
                                attributes: [
                                    AttribNode('p1', 'v1'),
                                    AttribNode('p3', 'v3')
                                ],
                                children: [],
                                loc: { start: 0, end: 31 }
                            }
                        }
                    ],
                    loc: { start: 0, end: 31 }
                }
            })
        })
    })

    describe('to JSON', () => {
        describe('simple XML', () => {
            it('should transform a simple XML to JSON', () => {
                const mockXML = '<a></a>'
                const json = convertXML(mockXML)
                expect(json).toEqual({
                    a: {}
                })
            })

            it('should transform a simple XML to JSON with an XML header', () => {
                const mockXML = `
                ${XML_HEADER}
                <a></a>
                `
                const json = convertXML(mockXML)
                expect(json).toEqual({
                    a: {}
                })
            })
        })

        describe('simple XML with attributes', () => {
            it('should transform a simple XML to JSON with an XML header', () => {
                const mockXML = `
                ${XML_HEADER}
                <a a="5" b="hello"></a>
                `
                const json = convertXML(mockXML)
                expect(json).toEqual({
                    a: {
                        a: '5',
                        b: 'hello'
                    }
                })
            })
        })

        describe('XML with children', () => {
            it('should transform the XML children to nested JSONs', () => {
                const mockXML = `
                ${XML_HEADER}
                <a a="5" b="hello">
                <empty></empty>
                <message>Hello JSON world</message>
                <specialMessage color="purple">Special Hello</specialMessage>
                <nested>
                <message from="sender">Nested hello</message>
                </nested>
                </a>
                `
                const json = convertXML(mockXML)
                expect(json).toEqual({
                    a: {
                        a: '5',
                        b: 'hello',
                        children: [
                            {
                                empty: {}
                            },
                            {
                                message: {
                                    content: 'Hello JSON world'
                                }
                            },
                            {
                                specialMessage: {
                                    color: 'purple',
                                    content: 'Special Hello'
                                }
                            },
                            {
                                nested: {
                                    children: [
                                        {
                                            message: {
                                                from: 'sender',
                                                content: 'Nested hello'
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                })
            })
        })

        describe('Special characters', () => {
            describe('XML attributes with characters', () => {
                it('should transform the XML to JSON when {:, -} chars are in attribute name', () => {
                    const mockXML =
                        '<a attrib:n1="v1" attrib-n2="v2">content</a>'
                    const json = convertXML(mockXML)
                    expect(json).toEqual({
                        a: {
                            'attrib:n1': 'v1',
                            'attrib-n2': 'v2',
                            content: 'content'
                        }
                    })
                })
            })

            describe('XML content with characters', () => {
                it('should transform the XML to JSON supporting chars - {:, /, -, +, "," }', () => {
                    const mockXML =
                        '<link>https://www.acme.com/abc/A-B_C,d+E/</link>'
                    const json = convertXML(mockXML)
                    expect(json).toEqual({
                        link: {
                            content: 'https://www.acme.com/abc/A-B_C,d+E/'
                        }
                    })
                })

                it('should transform the XML to JSON supporting unicode chars', () => {
                    const mockXML = '<link>á</link>'
                    const json = convertXML(mockXML)
                    expect(json).toEqual({
                        link: {
                            content: 'á'
                        }
                    })
                })

                it('should transform a random XML to JSON without failing', () => {
                    const mockXML = `
                    <?xml version="1.0" encoding="UTF-8" ?>
                    <root>
                        <HDshFn2rCQZMG>
                            <k>K[</k>
                            <c8s3k least="saw">
                                <o1DU education="trade">_Su&gt;%Z8</o1DU>
                                <u8JYzwdeWwGn>1673963950.2489343</u8JYzwdeWwGn>
                            </c8s3k>
                            <yI1dht0 opportunity="look">&lt;&amp;RY~HyxRC&lt;d{</yI1dht0>
                        </HDshFn2rCQZMG>
                        <R9Z28 train="please">a=b.JD&amp;m3&gt;vP.AG</R9Z28>
                    </root>
                    `
                    const json = convertXML(mockXML)
                    expect(json).toEqual({
                        root: {
                            children: [
                                {
                                    HDshFn2rCQZMG: {
                                        children: [
                                            {
                                                k: {
                                                    content: 'K['
                                                }
                                            },
                                            {
                                                c8s3k: {
                                                    least: 'saw',
                                                    children: [
                                                        {
                                                            o1DU: {
                                                                education:
                                                                    'trade',
                                                                content:
                                                                    '_Su&gt;%Z8'
                                                            }
                                                        },
                                                        {
                                                            u8JYzwdeWwGn: {
                                                                content:
                                                                    '1673963950.2489343'
                                                            }
                                                        }
                                                    ]
                                                }
                                            },
                                            {
                                                yI1dht0: {
                                                    opportunity: 'look',
                                                    content:
                                                        '&lt;&amp;RY~HyxRC&lt;d{'
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    R9Z28: {
                                        train: 'please',
                                        content: 'a=b.JD&amp;m3&gt;vP.AG'
                                    }
                                }
                            ]
                        }
                    })
                })
            })

            describe('XML content with "\t" (tabs) ', () => {
                it('should succeed transforming the XML to JSON (based on issue#10 - tab char after new line)', () => {
                    const mockXML = testUtils.readXMLFile(
                        __dirname + '/mock-with-tabs.xml'
                    )
                    const json = convertXML(mockXML)
                    expect(json).toEqual({
                        'testng-results': {
                            ignored: '20',
                            total: '40',
                            passed: '8',
                            failed: '11',
                            skipped: '1',
                            children: [
                                {
                                    'reporter-output': {}
                                }
                            ]
                        }
                    })
                })
            })
        })

        describe('Spaces', () => {
            it('Spaces as content', () => {
                const json = convertXML(
                    '<a><child>hello     world</child><child>1    + 1  =  2</child></a>'
                )
                expect(json).toEqual({
                    a: {
                        children: [
                            {
                                child: {
                                    content: 'hello     world'
                                }
                            },
                            {
                                child: {
                                    content: '1    + 1  =  2'
                                }
                            }
                        ]
                    }
                })
            })

            it('Spaces and Tabs as content', () => {
                const json = convertXML(
                    '<a><child>2 tabs        between</child><child>1tab  + 1space</child></a>'
                )
                expect(json).toEqual({
                    a: {
                        children: [
                            {
                                child: {
                                    content: '2 tabs        between'
                                }
                            },
                            {
                                child: {
                                    content: '1tab  + 1space'
                                }
                            }
                        ]
                    }
                })
            })
        })

        describe('Options', () => {
            it('should skip unknown elements', () => {
                const mockXML = `
                <a>
                    <b></b>
                    <c>
                        <d>D</d>
                        <e>
                            <f>F</f>
                            E
                        </e>
                        C
                    </c>
                </a>
                `
                const json = convertXML(mockXML, {
                    knownElement: (n) => n === 'a' || n === 'b'
                })
                expect(json).toEqual({
                    a: {
                        children: [
                            {
                                b: {}
                            }
                        ]
                    }
                })
            })

            it('should skip unknown attributes', () => {
                const mockXML = "<a p1='v1' p2='v2' p3='v3'></a>"
                const json = convertXML(mockXML, {
                    knownAttrib: (n) => n === 'p1' || n === 'p3'
                })
                expect(json).toEqual({
                    a: {
                        p1: 'v1',
                        p3: 'v3'
                    }
                })
            })
        })
    })
})
