// Packages
import { createSchema } from './schema'
import { reporter } from './utils'
import { fetchData } from './data'

interface SourceOptions {
  typeName: string
  baseUrl: string
  log: boolean
  concurrency: number
}

const GridsomeSourceWordPress = (api: any, config: SourceOptions) => {
  const { typeName = 'WordPress', baseUrl = '', log = false, concurrency = 8 } = config

  if (!baseUrl) throw new Error('Missing the `baseUrl` config option.')
  if (!typeName) throw new Error('Missing the `typeName` config option.')

  api.loadSource(async (actions: any) => {
    const scalarTypes = ['String', 'Int', 'Float', 'Boolean', 'ID']
    const prefix = (name: string) => (scalarTypes.includes(name) ? name : `${typeName}${name}`)

    const utils = { baseUrl, typeName, prefix, concurrency }

    // Create Schema
    try {
      const schema = await createSchema(actions, utils)

      await fetchData(schema, actions, utils)
    } catch (error) {
      reporter.error(error.message)
    }

    if (log) reporter.success('Finished adding WordPress schema')
  })
}

module.exports = GridsomeSourceWordPress
