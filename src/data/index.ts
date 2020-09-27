// import got from 'got'
// import pMap from 'p-map'
import { getNamedType, GraphQLNamedType, GraphQLSchema } from 'graphql'
import { Utils } from '../utils'
// import { Utils } from '../utils'
// import { cleanNodes } from './clean-nodes'
// import { createQuery } from './create-query'
import { transformFields } from './transform-fields'

export const fetchData = async (schema: GraphQLSchema, utils: Utils) => {
  const { prefix } = utils
  const queryType = schema.getQueryType()
  // const typeMap = schema.getTypeMap()

  if (!queryType) throw new Error('No root query type found.')

  const queryFields = Object.values(queryType.getFields()).filter(({ type }) => type.toString().includes('Connection'))

  for (const [i, field] of queryFields.entries()) {
    console.log(i)
    const type = schema.getType(prefix(field.type.toString())) as GraphQLNamedType
    const config = type.toConfig() as any
    const nodesType = config.fields.nodes.type

    const objectType = getNamedType(nodesType) as any
    const { fields } = schema.getType(objectType)?.toConfig() as any
    console.log(transformFields(fields))
  }
  console.log('done')
  // const allData = await pMap(
  //   possibleTypes,
  //   async type => {
  //     const fields = type.getFields()

  //     const transformedFields = transformFields(fields)

  //     const query = createQuery(type.name, transformedFields)

  //     const { data, errors } = await got.post(baseUrl, {
  //       json: { query },
  //       resolveBodyOnly: true,
  //       responseType: 'json'
  //     })

  //     if (errors) throw new Error(errors[0].message)

  //     const cleanedNodes = cleanNodes(data.data, utils)

  //     return cleanedNodes
  //   },
  //   { concurrency }
  // )

  // return allData
}
