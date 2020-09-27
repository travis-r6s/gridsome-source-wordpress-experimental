import { GraphQLSchema } from 'graphql'

import { reporter, Utils } from '../utils'
import { FieldTransformer } from './transform-fields'
import { createQueries } from './create-queries'
import { fetchData } from './fetch-data'

export const importData = async (schema: GraphQLSchema, actions: any, utils: Utils) => {
  const queryFields = schema.getQueryType()?.getFields()
  if (!queryFields) return

  const fieldTransfomer = FieldTransformer(schema, utils)

  const queries = createQueries(queryFields, fieldTransfomer, utils)
  const data = await fetchData(queries, utils)

  for (const { type, nodes } of data) {
    const collection = actions.getCollection(type)
    if (!collection) {
      reporter.warn(`No collection for type: ${type}`)
      continue
    }
    for (const node of nodes) {
      collection.addNode(node)
    }
  }
}
