import { GraphQLAbstractType, GraphQLSchema } from 'graphql'
import { createSchemaTypes } from './create-types'
import { fetchSchema } from './fetch-schema'
import { renameType } from 'graphql-tools'
import { filterSchema } from './filter-schema'
import { Utils } from '../utils'

export const createSchema = async (actions: any, utils: Utils): Promise<GraphQLSchema> => {
  const { baseUrl, prefix } = utils

  const { schema, data } = await fetchSchema(baseUrl, utils)
  const transformedSchema = filterSchema(schema, utils)

  const schemaTypes = await createSchemaTypes(transformedSchema, data, actions, utils)

  const addSchemaTypesTimer = utils.timer()
  actions.addSchemaTypes(schemaTypes)
  addSchemaTypesTimer.log('Added types to schema in %s')

  const addCollectionsTimer = utils.timer()
  const nodeType = schema.getType('Node') as GraphQLAbstractType
  const possibleTypes = schema.getPossibleTypes(nodeType)
  const collections = possibleTypes.map(type => renameType(type, prefix(type.name))).map(type => type.name)

  for (const type of collections) {
    actions.addCollection(type)
  }
  addCollectionsTimer.log('Added type collections in %s')

  return transformedSchema
}
