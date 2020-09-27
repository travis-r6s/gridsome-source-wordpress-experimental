import { Field } from '@wheelroom/graphql-query-builder'
import { getNamedType, GraphQLObjectType, isObjectType, isInterfaceType, isScalarType, isTypeSubTypeOf, GraphQLSchema } from 'graphql'
import { Utils } from '../utils'

export const isConnectionField = (type: GraphQLObjectType) => Object.values(type.getFields()).find(({ name }) => name === 'nodes')
export const isConnectionEdgeField = (type: GraphQLObjectType) => Object.values(type.getFields()).find(({ name }) => name === 'node')

export interface FieldTransform {
  name: string
  type: string
  fields: [string, Field]
  path: string
}

export interface FieldTransformParent {
  name: string
  type: string
  fields: Map<string, FieldTransform>
  path: string
  query: string
}

export declare type FieldTransformer = (type: GraphQLObjectType) => FieldTransform[]

export const FieldTransformer = (schema: GraphQLSchema, utils: Utils) => (type: GraphQLObjectType): FieldTransform[] =>
  Object.values(type.getFields())
    .map(field => {
      if (utils.excluded.fields.includes(field.name)) return
      const namedType = getNamedType(field.type) as GraphQLObjectType

      if (isScalarType(namedType)) {
        return {
          name: field.name,
          type: field.type.toString(),
          fields: [field.name, {}],
          path: ''
        }
      }

      if (isObjectType(namedType)) {
        const nodesField = isConnectionField(namedType)
        if (nodesField) {
          const subType = getNamedType(nodesField.type)
          if (utils.excluded.types.includes(subType.toString())) return
          return {
            name: field.name,
            type: subType.toString(),
            fields: [field.name, { fields: { nodes: { fields: { id: {}, __typename: { alias: 'typeName' } } } } }],
            path: 'nodes'
          }
        }

        const nodeField = isConnectionEdgeField(namedType)
        if (nodeField) {
          const subType = getNamedType(nodeField.type)
          if (utils.excluded.types.includes(subType.toString())) return
          return {
            name: field.name,
            type: subType.toString(),
            fields: [field.name, { fields: { node: { fields: { id: {}, __typename: { alias: 'typeName' } } } } }],
            path: 'node'
          }
        }
      }

      if (isInterfaceType(namedType)) {
        if (isTypeSubTypeOf(schema, namedType, type)) {
          return {
            name: field.name,
            type: namedType.toString(),
            fields: [field.name, { fields: { id: {}, __typename: { alias: 'typeName' } } }],
            path: ''
          }
        }
        const fields = FieldTransformer(schema, utils)(namedType).map(({ fields }) => fields)
        return {
          name: field.name,
          type: namedType.toString(),
          fields: [field.name, { fields: Object.fromEntries(fields) }],
          path: ''
        }
      }

      return
    })
    .filter(f => !!f) as FieldTransform[]
