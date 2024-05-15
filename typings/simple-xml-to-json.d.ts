declare module '@jdalton/simple-xml-to-json' {
  export interface ASTConverter {
    convert: (ast: XMLRootNode) => JSON_LD_Object | null
  }
  export type LexerKnownAttrib = (attrName: string) => boolean
  export type LexerKnownElement = (tagName: string) => boolean 
  
  export type ConvertASTOptions = {
    knownAttrib?: LexerKnownAttrib,
    knownElement?: LexerKnownElement
  }
  export type ConvertXMLOptions = ConvertASTOptions & {
    converter?: ASTConverter
  }

  export function convertXML(xmlAsString: string, options?: ConvertXMLOptions) : JSON_LD_Object;
  export function createAST(xmlAsString: string, options?: ConvertASTOptions): XMLRootNode;

  export type JSON_LD_Array = JSON_LD_Value[]
  export type JSON_LD_Object = { [key: string]: JSON_LD_Value }
  export type JSON_LD_Value = number | string | JSON_LD_Array | JSON_LD_Object

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
