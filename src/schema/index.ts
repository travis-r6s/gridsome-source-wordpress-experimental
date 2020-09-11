import { GraphQLAbstractType } from 'graphql'
import { createSchemaTypes } from './create-types'
import { fetchSchema } from './fetch-schema'
import { renameType } from 'graphql-tools'
import { reporter } from '../utils'
import { transformSchema } from './transform-schema'

export interface SchemaUtils {
  baseUrl: string
  typeName: string
  prefix: Function
}

export const createSchema = async (actions: any, utils: SchemaUtils) => {
  const { baseUrl, prefix } = utils

  try {
    const { schema, data } = await fetchSchema(baseUrl)
    const transformedSchema = transformSchema(schema, utils)

    const schemaTypes = await createSchemaTypes(transformedSchema, data, actions, utils)
    actions.addSchemaTypes(schemaTypes)

    const nodeType = schema.getType('Node') as GraphQLAbstractType
    const possibleTypes = schema.getPossibleTypes(nodeType)
    const collections = possibleTypes.map(type => renameType(type, prefix(type.name))).map(type => type.name)

    for (const type of collections) {
      actions.addCollection(type)
    }

    return
  } catch (error) {
    // ! Will probably need to handle this better in future
    reporter.error(error.message)
    return []
  }
}
