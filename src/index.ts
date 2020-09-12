// Packages
import { getNamedType, GraphQLAbstractType, GraphQLFieldMap, isInterfaceType, isObjectType, isScalarType } from 'graphql'
import { createSchema } from './schema'
import { reporter } from './utils'
import { Fields, graphqlQueryBuilder as queryBuilder } from '@wheelroom/graphql-query-builder'
import got from 'got'

interface SourceOptions {
  typeName: string
  baseUrl: string
  log: boolean
}

const GridsomeSourceWordPress = (api: any, config: SourceOptions) => {
  const { typeName = 'WordPress', baseUrl = '', log = false } = config

  if (!baseUrl) throw new Error('Missing the `baseUrl` config option.')
  if (!typeName) throw new Error('Missing the `typeName` config option.')

  api.loadSource(async (actions: any) => {
    const scalarTypes = ['String', 'Int', 'Float', 'Boolean', 'ID']
    const prefix = (name: string) => (scalarTypes.includes(name) ? name : `${typeName}${name}`)

    const utils = { baseUrl, typeName, prefix }

    // Create Schema
    try {
      const schema = await createSchema(actions, utils)

      const nodeType = schema.getType('Node') as GraphQLAbstractType
      const possibleTypes = schema.getPossibleTypes(nodeType)

      const post = possibleTypes[9]
      const postFields = post.getFields()

      const transformFields = (fields: GraphQLFieldMap<any, any>): Fields =>
        Object.fromEntries(
          Object.values(fields).map(field => {
            const namedType = getNamedType(field.type)
            if (isScalarType(namedType)) return [field.name, {}]
            if (isObjectType(namedType)) {
              if (namedType.name.includes('ConnectionEdge')) {
                return [
                  field.name,
                  {
                    fields: {
                      node: {
                        fields: {
                          id: {},
                          __typename: {
                            alias: 'typeName'
                          }
                        }
                      }
                    }
                  }
                ]
              }
              if (namedType.name.includes('Connection')) {
                return [
                  field.name,
                  {
                    fields: {
                      nodes: {
                        fields: {
                          id: {},
                          __typename: {
                            alias: 'typeName'
                          }
                        }
                      }
                    }
                  }
                ]
              }
              return [
                field.name,
                {
                  fields: {
                    some: {}
                  }
                }
              ]
            }

            if (isInterfaceType(namedType)) {
              const subFields = namedType.getFields()
              return [field.name, { fields: transformFields(subFields) }]
            }
            return [
              field.name,
              {
                id: {},
                __typename: {
                  alias: 'typeName'
                }
              }
            ]
          })
        )

      const query = queryBuilder({
        operationName: 'Posts',
        operationType: 'query',
        fields: {
          posts: {
            fields: {
              nodes: {
                fields: transformFields(postFields)
              }
            }
          }
        }
      })

      const { data } = await got.post(baseUrl, {
        json: { query },
        resolveBodyOnly: true,
        responseType: 'json'
      })
      console.log(data.posts.nodes[0].author)
    } catch (error) {
      reporter.error(error.message)
    }

    if (log) reporter.success('Finished adding WordPress schema')
  })
}

module.exports = GridsomeSourceWordPress
