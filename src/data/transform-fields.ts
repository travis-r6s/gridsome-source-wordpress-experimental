import { Fields } from '@wheelroom/graphql-query-builder'
import { GraphQLFieldMap, getNamedType, isScalarType, isObjectType, isInterfaceType } from 'graphql'

export const transformFields = (fields: GraphQLFieldMap<any, any>): Fields =>
  Object.fromEntries(
    Object.entries(fields).map(([name, field]) => {
      console.log(name)
      const namedType = getNamedType(field.type)
      if (isScalarType(namedType)) return [name, {}]
      if (isObjectType(namedType)) {
        if (namedType.name.includes('ConnectionEdge')) {
          return [
            name,
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
            name,
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
          name,
          {
            fields: {
              some: {}
            }
          }
        ]
      }

      if (isInterfaceType(namedType)) {
        const subFields = namedType.getFields()
        return [name, { fields: transformFields(subFields) }]
      }
      return [
        name,
        {
          id: {},
          __typename: {
            alias: 'typeName'
          }
        }
      ]
    })
  )
