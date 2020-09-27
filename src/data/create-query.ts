import { graphqlQueryBuilder, Fields } from '@wheelroom/graphql-query-builder'

export const createQuery = (type: string, fields: Fields) =>
  graphqlQueryBuilder({
    operationType: 'query',
    operationName: type,
    fields: {
      [type]: {
        alias: 'data',
        fields: {
          nodes: {
            fields
          }
        }
      }
    }
  })
