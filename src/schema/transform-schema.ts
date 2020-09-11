import { GraphQLSchema } from 'graphql'
import { visitSchema, VisitSchemaKind, renameType } from 'graphql-tools'
import { SchemaUtils } from '.'
import { excludedTypes } from './type-builder'

export const transformSchema = (schema: GraphQLSchema, { prefix }: SchemaUtils) =>
  visitSchema(schema, {
    [VisitSchemaKind.MUTATION]() {
      return null
    },
    [VisitSchemaKind.INPUT_OBJECT_TYPE]() {
      return null
    },
    [VisitSchemaKind.OBJECT_TYPE](type) {
      if (excludedTypes.some(str => type.name.includes(str))) return null
      return renameType(type, prefix(type.name))
    },
    [VisitSchemaKind.INTERFACE_TYPE](type) {
      if (excludedTypes.some(str => type.name.includes(str))) return null
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

export const transformEnums = (enums: any, actions: any) => {
  // Enums don't seem to be included in the type map
  const discardEnums = ['__DirectiveLocation', '__TypeKind']
  return enums
    .filter(({ name }: { name: string }) => !discardEnums.includes(name))
    .map((type: any) => {
      const values = Object.fromEntries(
        type.enumValues.map(({ name, value, deprecationReason, description }: { name: string; value: string; deprecationReason: string; description: string }) => [
          name,
          { value, deprecationReason, description }
        ])
      )
      return actions.schema.createEnumType({
        name: type.name,
        description: type.description,
        values
      })
    })
}
