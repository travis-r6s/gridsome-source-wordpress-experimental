import got from 'got'
import ora from 'ora'
import { buildClientSchema, getIntrospectionQuery, GraphQLSchema } from 'graphql'

import { Utils } from '../utils'

export const fetchSchema = async (baseUrl: string, utils: Utils): Promise<{ schema: GraphQLSchema; data: any }> => {
  const fetchSchemaTime = utils.timer()
  const spinner = ora('Fetching WordPress schema').start()

  const { data, errors } = await got.post(baseUrl, {
    json: { query: getIntrospectionQuery() },
    resolveBodyOnly: true,
    responseType: 'json'
  })
  
  spinner.stop()
  fetchSchemaTime.log('Fetched schema in %s')

  if (errors) throw new Error(errors[0].message)
  if (!data) throw new Error('No data - cancelling operation.')

  const buildSchemaTime = utils.timer()
  const schema = buildClientSchema(data)
  buildSchemaTime.log(`Built client schema in %s`)

  return { schema, data }
}
