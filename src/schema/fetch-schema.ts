import got from 'got'
import { buildClientSchema, getIntrospectionQuery, GraphQLSchema } from 'graphql'

export const fetchSchema = async (baseUrl: string): Promise<{ schema: GraphQLSchema; data: any }> => {
  const { data, errors } = await got.post(baseUrl, {
    json: { query: getIntrospectionQuery() },
    resolveBodyOnly: true,
    responseType: 'json'
  })

  if (errors) throw new Error(errors[0].message)
  if (!data) throw new Error('No data - cancelling operation.')

  const schema = buildClientSchema(data)

  return { schema, data }
}
