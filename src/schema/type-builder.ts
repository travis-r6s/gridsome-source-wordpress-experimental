import { GraphQLEnumType, GraphQLInterfaceType, GraphQLObjectType, GraphQLUnionType } from 'graphql'
import { FieldTransformer } from './transform-fields'
import { Utils } from '../utils'

export const TypeBuilder = (schema: any, utils: Utils) => {
  const transformFields = FieldTransformer(utils)
  return {
    interface: (type: GraphQLInterfaceType) => {
      const fields = transformFields(type)
      return schema.createInterfaceType({
        name: type.name,
        description: type.description,
        interfaces: ['Node'],
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
  }
}
