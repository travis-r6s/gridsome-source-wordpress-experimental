import got from 'got/dist/source'
import pMap from 'p-map'
import { reporter, Utils } from '../utils'
import { FieldTransformParent } from './transform-fields'

export const fetchData = (queries: FieldTransformParent[], utils: Utils) =>
  pMap(
    queries,
    async (field: FieldTransformParent) => {
      const { query, name, path, fields, type } = field

      const { data, errors } = await got.post(utils.baseUrl, {
        json: { query },
        resolveBodyOnly: true,
        responseType: 'json'
      })
      if (errors) {
        reporter.error(`Error when getting ${name}: ${errors[0].message}`)
        return { type: '', nodes: [] }
      }

      const nodes = data[name][path] as any
      if (!nodes) {
        reporter.warn(`No nodes found at this path: data.${name}.${path}`)
        return { type: '', nodes: [] }
      }

      const formattedNodes = nodes.map((node: any) => {
        const nodeFields = Object.entries(node).map(([key, value]: [string, any]) => {
          const config = fields.get(key)
          if (!value || !config?.path) return [key, value]

          return [key, value[config.path]]
        })

        const updatedTypeNames = nodeFields.map(([key, value]) => {
          if (!value || typeof value !== 'object') return [key, value]

          if (Array.isArray(value)) {
            const transformedValues = value.map(({ typeName, ...v }) => (typeName ? { ...v, typeName: utils.prefix(typeName) } : v))
            return [key, transformedValues]
          }
          if (value.typeName) {
            return [key, { ...value, typeName: utils.prefix(value.typeName) }]
          }

          return [key, value]
        })

        return Object.fromEntries(updatedTypeNames)
      })

      return {
        type: utils.prefix(type),
        nodes: formattedNodes
      }
    },
    { concurrency: utils.concurrency }
  )
