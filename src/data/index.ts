import got from 'got'
import pMap from 'p-map'
import { Field, graphqlQueryBuilder } from '@wheelroom/graphql-query-builder'
import { getNamedType, GraphQLObjectType, GraphQLSchema, isInterfaceType, isNonNullType, isObjectType, isScalarType, isTypeSubTypeOf } from 'graphql'
// import { excludedTypes } from '../schema/type-builder'
import { Utils } from '../utils'
// import { cleanNodes } from './clean-nodes'
// import { createQuery } from './create-query'

interface FieldTransform {
  name: string
  type: string
  fields: [string, Field]
  path: string
}
interface FieldTransformParent {
  name: string
  type: string
  fields: Map<string, FieldTransform>
  path: string
  query: string
}

const excludedFields = [
  'viewer',
  'visibleProducts',
  'users',
  'userRoles',
  'themes',
  'registeredScripts',
  'registeredStylesheets',
  'revisions',
  'orders',
  'cart',
  'plugins',
  'paymentGateways',
  'contentNodes',
  'comments',
  'allSettings',
  'readingSettings',
  'discussionSettings',
  'generalSettings',
  'writingSettings',
  'refunds',
  'coupons',
  'contentTypes',
  'contentNodes'
]
const excludedTypes = ['EnqueuedScript', 'EnqueuedStylesheet', 'DownloadableItem']

export const fetchData = async (schema: GraphQLSchema, actions: any, utils: Utils) => {
  const { prefix, baseUrl, concurrency } = utils

  const queryFields = schema.getQueryType()?.getFields()
  if (!queryFields) return

  const isConnectionField = (type: GraphQLObjectType) => Object.values(type.getFields()).find(({ name }) => name === 'nodes')
  const isConnectionEdgeField = (type: GraphQLObjectType) => Object.values(type.getFields()).find(({ name }) => name === 'node')

  const fieldTransformer = (type: GraphQLObjectType): FieldTransform[] =>
    Object.values(type.getFields())
      .map(field => {
        if (excludedFields.includes(field.name)) return
        const namedType = getNamedType(field.type) as GraphQLObjectType

        if (isScalarType(namedType)) {
          return {
            name: field.name,
            type: field.type.toString(),
            fields: [field.name, {}],
            path: ''
          }
        }

        if (isObjectType(namedType)) {
          const nodesField = isConnectionField(namedType)
          if (nodesField) {
            const subType = getNamedType(nodesField.type)
            if (excludedTypes.includes(subType.toString())) return
            return {
              name: field.name,
              type: subType.toString(),
              fields: [field.name, { fields: { nodes: { fields: { id: {}, __typename: { alias: 'typeName' } } } } }],
              path: 'nodes'
            }
          }

          const nodeField = isConnectionEdgeField(namedType)
          if (nodeField) {
            const subType = getNamedType(nodeField.type)
            if (excludedTypes.includes(subType.toString())) return
            return {
              name: field.name,
              type: subType.toString(),
              fields: [field.name, { fields: { node: { fields: { id: {}, __typename: { alias: 'typeName' } } } } }],
              path: 'node'
            }
          }
        }

        if (isInterfaceType(namedType)) {
          if (isTypeSubTypeOf(schema, namedType, type)) {
            return {
              name: field.name,
              type: namedType.toString(),
              fields: [field.name, { fields: { id: {}, __typename: { alias: 'typeName' } } }],
              path: ''
            }
          }
          const fields = fieldTransformer(namedType).map(({ fields }) => fields)
          return {
            name: field.name,
            type: namedType.toString(),
            fields: [field.name, { fields: Object.fromEntries(fields) }],
            path: ''
          }
        }

        return
      })
      .filter(f => !!f) as FieldTransform[]

  const queries = Object.values(queryFields)
    .map((field): FieldTransformParent | undefined => {
      // If we have a non null arg, or an ID arg, then we can't use this field
      const hasNonNullType = field.args.some(({ type }) => isNonNullType(type))
      const hasIDInput = field.args.find(({ type }) => getNamedType(type).toString() === 'ID')
      if (hasNonNullType || hasIDInput) return
      if (excludedFields.includes(field.name)) return

      if (isObjectType(field.type)) {
        // Check if this is a `nodes` field: if so, we need to get the root type
        const nodesField = isConnectionField(field.type)
        if (nodesField) {
          const type = getNamedType(nodesField.type) as GraphQLObjectType
          const fields = fieldTransformer(type)
          const queryFields = Object.fromEntries(fields.map(({ fields }) => fields))
          const query = graphqlQueryBuilder({ operationType: 'query', fields: { [field.name]: { fields: { nodes: { fields: queryFields } } } } })

          return {
            name: field.name,
            type: type.name,
            fields: new Map(fields.map(field => [field.name, field])),
            path: 'nodes',
            query
          }
        }

        const fields = fieldTransformer(field.type)
        const queryFields = Object.fromEntries(fields.map(({ fields }) => fields))
        const query = graphqlQueryBuilder({ operationType: 'query', fields: { [field.name]: { fields: queryFields } } })

        return {
          name: field.name,
          type: field.type.toString(),
          fields: new Map(fields.map(field => [field.name, field])),
          path: '',
          query
        }
      }

      console.log(field)
      return
    })
    .filter(f => !!f) as FieldTransformParent[]

  const data = await pMap(
    queries,
    async (field: FieldTransformParent) => {
      const { query, name, path, fields, type } = field

      const { data, errors } = await got.post(baseUrl, {
        json: { query },
        resolveBodyOnly: true,
        responseType: 'json'
      })
      if (errors) return console.log(`Errors for ${name}: ${errors[0].message}`)

      const nodes = data[name][path] as any
      if (!nodes) return console.log(`No nodes found at this path: data.${name}.${path}`)

      const formattedNodes = nodes.map((node: any) => {
        const nodeFields = Object.entries(node).map(([key, value]: [string, any]) => {
          const config = fields.get(key)
          if (!value || !config?.path) return [key, value]

          return [key, value[config.path]]
        })

        const updatedTypeNames = nodeFields.map(([key, value]) => {
          if (!value || typeof value !== 'object') return [key, value]

          if (Array.isArray(value)) {
            const transformedValues = value.map(({ typeName, ...v }) => (typeName ? { ...v, typeName: prefix(typeName) } : v))
            return [key, transformedValues]
          }
          if (value.typeName) {
            return [key, { ...value, typeName: prefix(value.typeName) }]
          }

          return [key, value]
        })

        return Object.fromEntries(updatedTypeNames)
      })

      return {
        type: prefix(type),
        nodes: formattedNodes
      }
    },
    { concurrency }
  )

  const allData = data.filter(d => !!d) as { type: string; nodes: any[] }[]

  for (const { type, nodes } of allData) {
    const collection = actions.getCollection(type)
    if (!collection) {
      console.log(`No collection for type: ${type}`)
      continue
    }
    for (const node of nodes) {
      collection.addNode(node)
    }
  }
}
