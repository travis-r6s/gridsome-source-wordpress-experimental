import { isNonNullType, getNamedType, isObjectType, GraphQLObjectType, GraphQLFieldMap } from 'graphql'
import { FieldTransformer, FieldTransformParent, isConnectionField } from './transform-fields'
import { reporter, Utils } from '../utils'
import { query as queryBuilder } from 'gql-query-builder'

export const createQueries = (queryFields: GraphQLFieldMap<any, any>, fieldTransformer: FieldTransformer, utils: Utils) => {
  const createQueriesTimer = utils.timer()

  const queries = Object.values(queryFields)
    .map((field): FieldTransformParent | undefined => {
      // If we have a non null arg, or an ID arg, then we can't use this field
      const hasNonNullType = field.args.some(({ type }) => isNonNullType(type))
      const hasIDInput = field.args.find(({ type }) => getNamedType(type).toString() === 'ID')
      if (hasNonNullType || hasIDInput) return
      if (utils.excluded.fields.includes(field.name)) return

      if (isObjectType(field.type)) {
        // Check if this is a `nodes` field: if so, we need to get the root type
        const nodesField = isConnectionField(field.type)
        if (nodesField) {
          const type = getNamedType(nodesField.type) as GraphQLObjectType
          const fields = fieldTransformer(type)

          const queryFields = fields.flatMap(({ fields }) => fields)
          const { query } = queryBuilder({
            operation: field.name,
            fields: [
              {
                pageInfo: ['hasNextPage', 'endCursor']
              },
              {
                nodes: queryFields
              }
            ],
            variables: {
              first: { value: utils.perPage, required: true },
              after: ''
            }
          })

          return {
            name: field.name,
            type: type.name,
            fields: new Map(fields.map(field => [field.name, field])),
            path: 'nodes',
            query
          }
        }

        const fields = fieldTransformer(field.type)

        const queryFields = fields.flatMap(({ fields }) => fields)
        const { query } = queryBuilder({
          operation: field.name,
          fields: queryFields
        })

        return {
          name: field.name,
          type: field.type.toString(),
          fields: new Map(fields.map(field => [field.name, field])),
          path: '',
          query
        }
      }

      reporter.info(`No transformer for ${field.name}`)
      return
    })
    .filter(f => !!f) as FieldTransformParent[]

  createQueriesTimer.log('Created all type queries in %s')

  return queries
}
