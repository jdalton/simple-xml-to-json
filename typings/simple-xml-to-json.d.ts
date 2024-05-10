declare module '@jdalton/simple-xml-to-json' {
  export interface ASTConverter {
    convert: (ast: object) => any;
  }

  export function convertXML(xmlAsString: string, customConverter?: ASTConverter): any;
  export function createAST(xmlAsString: string): XMLRootNode;

  export type XMLNode = {
    type: string
    value: any
  }
  export type XMLChildNode = XMLElementNode | XMLContentNode
  export type XMLElementNodeLoc = { start: number; end: number }

  export interface XMLRootNode extends XMLNode {
    type: 'ROOT'
    value: {
      children: XMLChildNode[]
    }
  }
  export interface XMLAttribNode extends XMLNode {
    type: 'ATTRIBUTE'
    value: {
      name: string
      value: string
    }
  }
  export interface XMLContentNode extends XMLNode {
    type: 'CONTENT'
    value: string
  }
  export interface XMLElementNode extends XMLNode {
    type: 'ELEMENT'
    value: {
      type: string
      attributes: XMLAttribNode[]
      children: XMLChildNode[]
      loc: XMLElementNodeLoc
    }
  }
}

declare module '@jdalton/simple-xml-to-json/lib/simpleXmlToJson.js' {
  export * from '@jdalton/simple-xml-to-json'
}
