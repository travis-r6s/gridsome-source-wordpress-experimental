import { GraphQLObjectType, GraphQLInterfaceType, getNamedType, getNullableType, isObjectType } from 'graphql'
import { Utils } from '../utils'

export const FieldTransformer = (utils: Utils) => (type: GraphQLObjectType | GraphQLInterfaceType) => {
  const fields = type.getFields()
  const transformed = Object.entries(fields)
    .map(([key, field]) => {
      const strippedName = getNamedType(field.type).toString()
      if (utils.excluded.types.some(type => strippedName.includes(type))) return

      let type = getNullableType(field.type)

      // Get root node type of connections or edges
      if (isObjectType(type)) {
        if (type.name.includes('Connection')) {
          const subTypes = type.getFields()
          if (type.name.includes('Edge')) type = subTypes.node.type
          else type = subTypes.nodes.type
        }
      }

      return [
        key,
        {
          type: type.toString(),
          description: field.description
        }
      ]
    })
    .filter(f => f) as [string, { type: string; description: string; deprecationReason: string }][]

  return Object.fromEntries(transformed)
}

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
