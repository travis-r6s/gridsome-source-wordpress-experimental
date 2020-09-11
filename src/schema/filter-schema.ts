import { GraphQLSchema } from 'graphql'
import { visitSchema, VisitSchemaKind, renameType } from 'graphql-tools'
import { SchemaUtils } from '.'
import { excludedTypes } from './type-builder'

export const filterSchema = (schema: GraphQLSchema, { prefix }: SchemaUtils) =>
  visitSchema(schema, {
    [VisitSchemaKind.MUTATION]() {
      return null
    },
    [VisitSchemaKind.INPUT_OBJECT_TYPE]() {
      return null
    },
    [VisitSchemaKind.OBJECT_TYPE](type) {
      if (excludedTypes.includes(type.name)) return null
      return renameType(type, prefix(type.name))
    },
    [VisitSchemaKind.INTERFACE_TYPE](type) {
      if (excludedTypes.includes(type.name)) return null
      if (type.name !== 'Node') return renameType(type, prefix(type.name))
      return type
    },
    [VisitSchemaKind.UNION_TYPE](type) {
      return renameType(type, prefix(type.name))
    },
    [VisitSchemaKind.ENUM_TYPE](type) {
      return renameType(type, prefix(type.name))
    }
  })
