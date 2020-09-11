import { GraphQLAbstractType, GraphQLSchema } from 'graphql'
import { createSchemaTypes } from './create-types'
import { fetchSchema } from './fetch-schema'
import { renameType } from 'graphql-tools'
import { filterSchema } from './filter-schema'

export interface SchemaUtils {
  baseUrl: string
  typeName: string
  prefix: Function
}

export const createSchema = async (actions: any, utils: SchemaUtils): Promise<GraphQLSchema> => {
  const { baseUrl, prefix } = utils

  const { schema, data } = await fetchSchema(baseUrl)
  const transformedSchema = filterSchema(schema, utils)

  const schemaTypes = await createSchemaTypes(transformedSchema, data, actions, utils)
  actions.addSchemaTypes(schemaTypes)

  const nodeType = schema.getType('Node') as GraphQLAbstractType
  const possibleTypes = schema.getPossibleTypes(nodeType)
  const collections = possibleTypes.map(type => renameType(type, prefix(type.name))).map(type => type.name)

  for (const type of collections) {
    actions.addCollection(type)
  }

  return transformedSchema
}
