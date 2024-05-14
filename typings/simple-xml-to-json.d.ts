declare module '@jdalton/simple-xml-to-json' {
  export function convertXML(xmlAsString: string, options?: { 
    converter?: (ast: XMLRootNode) => JSON_LD_Object,
    knownAttrib?: (attrName: string) => boolean,
    knownElement?: (tagName: string) => boolean 
  }) : any;

  export function createAST(xmlAsString: string, options?: {
    knownAttrib?: (attrName: string) => boolean,
    knownElement?: (tagName: string) => boolean 
  }): JSON_LD_Object;

  export type JSON_LD_Array = JSON_LD_Value[]
  export type JSON_LD_Object = { [key: string]: JSON_LD_Value }
  export type JSON_LD_Value = string | JSON_LD_Array | JSON_LD_Object

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
