import { isInterfaceType, isEnumType, isObjectType, isUnionType, GraphQLSchema } from 'graphql'
import { SchemaUtils } from '.'
import { reporter } from '../utils'
import { transformEnums } from './transform-schema'
import { TypeBuilder } from './type-builder'

export const createSchemaTypes = async (schema: GraphQLSchema, data: any, actions: any, { typeName }: SchemaUtils) => {
  try {
    const typeMap = schema.getTypeMap()
    const allTypes = Object.values(typeMap).filter(type => type.name.startsWith(typeName) && !type.name.includes('Root') && !type.name.includes('Connection'))

    const buildType = TypeBuilder(actions.schema)

    const schemaTypes = allTypes.map(type => {
      if (isInterfaceType(type)) return buildType.interface(type)
      if (isEnumType(type)) return buildType.enum(type)
      if (isObjectType(type)) return buildType.object(type)
      if (isUnionType(type)) return buildType.union(type)
    })

    // We need to transform all enums too
    const enums = data.__schema.types.filter(({ kind }: { kind: string; name: string }) => kind === 'ENUM')
    const enumTypes = transformEnums(enums, actions)

    return [...schemaTypes, ...enumTypes]
  } catch (error) {
    // ! Will probably need to handle this better in future
    reporter.error(error.message)
    return []
  }
}
