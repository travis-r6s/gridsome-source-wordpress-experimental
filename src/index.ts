// Packages
import { createSchema } from './schema'
import { reporter } from './utils'
// import { graphqlQueryBuilder as queryBuilder } from '@wheelroom/graphql-query-builder'

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
    await createSchema(actions, utils)

    if (log) reporter.success('Finished adding WordPress schema')
  })
}

module.exports = GridsomeSourceWordPress
