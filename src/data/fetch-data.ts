import got from 'got/dist/source'
import pMap from 'p-map'
import ora from 'ora'
import { reporter, Utils } from '../utils'
import { FieldTransformParent } from './transform-fields'

export interface Data {
  name: string
  type: string
  nodes: any[]
}

export const fetchData = async (queries: FieldTransformParent[], utils: Utils): Promise<Data[]> => {
  const fetchDataTimer = utils.timer()
  const spinner = ora('Fetching WordPress data').start()

  const data = await pMap(
    queries,
    async (field: FieldTransformParent) => {
      const { query, name, path, fields, type } = field

      let nodes
      if (path === 'nodes') {
        nodes = await got.paginate.all(utils.baseUrl, {
          method: 'POST',
          json: { query, variables: { first: utils.perPage } },
          resolveBodyOnly: true,
          responseType: 'json',
          pagination: {
            transform: (response: any) => {
              const { data, errors } = response.body
              if (!errors) return data[name].nodes

              const [error] = errors
              reporter.error(`Error when fetching ${name}: ${error.message}`)
              if (utils.log) reporter.info(JSON.stringify(error, null, 2))
              return []
            },
            paginate: (response: any, _allItems, currentItems) => {
              const { hasNextPage, endCursor } = response.body.data[name].pageInfo
              if (!hasNextPage || !currentItems.length) return false
              return {
                json: { query, variables: { first: utils.perPage, after: endCursor } }
              }
            }
          }
        })
      } else {
        const result = (await got.post(utils.baseUrl, {
          json: { query },
          resolveBodyOnly: true,
          responseType: 'json'
        })) as any
        if (result.errors) {
          const [error] = result.errors
          reporter.error(`Error when getting ${name}: ${error.message}`)
          if (utils.log) reporter.info(JSON.stringify(error, null, 2))
          return { type: '', nodes: [] }
        }

        nodes = result.data[name][path] as any
      }

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
            const transformedValues = value.map(value => (value.__typename ? { id: value.id, typeName: utils.prefix(value.__typename) } : value))
            return [key, transformedValues]
          }
          if (value.__typename) return [key, { id: value.id, typeName: utils.prefix(value.__typename) }]
          return [key, value]
        })

        return Object.fromEntries(updatedTypeNames)
      })

      return {
        name,
        type: utils.prefix(type),
        nodes: formattedNodes
      }
    },
    { concurrency: utils.concurrency }
  )

  spinner.stop()
  fetchDataTimer.log('Fetched all data in %s')

  return data.filter(d => !!d) as Data[]
}
