import { getNamedType, getNullableType, GraphQLEnumType, GraphQLInterfaceType, GraphQLObjectType, GraphQLUnionType, isObjectType } from 'graphql'

export const excludedTypes = ['Theme', 'Script', 'Stylesheet', 'Payload', 'Asset', 'Enqueued']

export const transformFields = (type: GraphQLObjectType | GraphQLInterfaceType) => {
  const fields = type.getFields()
  const transformed = Object.entries(fields)
    .map(([key, field]) => {
      const strippedName = getNamedType(field.type).toString()
      if (excludedTypes.some(type => strippedName.includes(type))) return

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
          description: field.description,
          deprecationReason: field.deprecationReason
        }
      ]
    })
    .filter(f => f) as [string, { type: string; description: string; deprecationReason: string }][]

  return Object.fromEntries(transformed)
}

export const TypeBuilder = (schema: any) => ({
  interface: (type: GraphQLInterfaceType) => {
    const fields = transformFields(type)
    return schema.createInterfaceType({
      name: type.name,
      description: type.description,
      fields
    })
  },
  union: (type: GraphQLUnionType) => {
    const types = type.getTypes().map(type => type.name)
    return schema.createUnionType({
      name: type.name,
      description: type.description,
      types
    })
  },
  enum: (_type: GraphQLEnumType) => {
    // We don't seem to get any enum types here - further research required...
  },
  object: (type: GraphQLObjectType) => {
    const fields = transformFields(type)
    const interfaces = type.getInterfaces().map(type => type.name)
    return schema.createObjectType({
      fields,
      interfaces,
      name: type.name,
      description: type.description
    })
  }
})
