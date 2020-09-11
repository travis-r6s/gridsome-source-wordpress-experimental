// Packages
import got from 'got'
import { getIntrospectionQuery, buildClientSchema, isObjectType, isListType, getNamedType, getNullableType, isScalarType } from 'graphql'
import { visitSchema, VisitSchemaKind, renameType } from 'graphql-tools'
// import { graphqlQueryBuilder as queryBuilder } from '@wheelroom/graphql-query-builder'
import consola from 'consola'
import { transform } from 'typescript'

const reporter = consola.create({ defaults: { tag: 'gridsome-source-wordpress-experimental' } })

export default (api, config) => {
  const { typeName = 'WordPress', baseUrl = '' } = config

  const excludedTypes = ['Theme', 'Script', 'Stylesheet', 'Payload', 'Asset', 'Enqueued']

  api.loadSource(async actions => {
    const scalarTypes = ['String', 'Int', 'Float', 'Boolean', 'ID']
    const prefix = name => scalarTypes.includes(name) ? name : `${typeName}${name}`

    const transformFields = typeFields => {
      return Object.entries(typeFields).map(([key, field]) => {
        const strippedName = getNamedType(field.type).toString()
        if (excludedTypes.some(type => strippedName.includes(type))) return

        let type = getNullableType(field.type)

        // Get root node type of connections or edges
        if (isObjectType(type)) {
          if (type.name.includes('Connection')) {
            const subTypes = type.getFields()
            if (type.name.includes('Edge')) type = subTypes.node.type
            else type = subTypes.nodes.type
          }
        }

        return [key, {
          type: type.toString(),
          description: field.description,
          deprecationReason: field.deprecationReason
        }]
      }).filter(f => f)
    }

    const { data, errors } = await got.post(baseUrl, {
      json: { query: getIntrospectionQuery() },
      resolveBodyOnly: true,
      responseType: 'json'
    })

    if (errors) {
      errors.forEach(({ message }) => reporter.error(message))
    }
    if (!data) {
      return reporter.error('No data - cancelling operation.')
    }

    // Schema
    const schema = buildClientSchema(data)

    const transformed = visitSchema(schema, {
      [ VisitSchemaKind.MUTATION ] () { return null },
      [ VisitSchemaKind.INPUT_OBJECT_TYPE ] () { return null },
      [ VisitSchemaKind.OBJECT_TYPE ] (type) {
        if (excludedTypes.some(str => type.name.includes(str))) return null
        return renameType(type, prefix(type.name))
      },
      [ VisitSchemaKind.INTERFACE_TYPE ] (type) {
        if (excludedTypes.some(str => type.name.includes(str))) return null
        return renameType(type, prefix(type.name))
      }
    })

    // Interfaces
    const interfaces = data.__schema.types
      .filter(({ kind, name }) => kind === 'INTERFACE' && name !== 'Node' && !excludedTypes.some(str => name.includes(str)))
      .map(({ name }) => {
        const type = transformed.getType(prefix(name))
        const fields = transformFields(type.getFields())
        const schemaInterface = actions.schema.createInterfaceType({
          name: type.name,
          description: type.description,
          fields: Object.fromEntries(fields)
        })

        return {
          name: type.name,
          schemaInterface
        }
      })

    actions.addSchemaTypes(interfaces.map(type => type.schemaInterface))
    console.log('Added interfaces')
    // Nodes
    const nodeInterface = transformed.getType('WordPressNode')
    const possibleTypes = transformed.getPossibleTypes(nodeInterface)

    const nodeTypes = possibleTypes.map(type => {
      const fields = transformFields(type.getFields())

      const interfaces = type.getInterfaces()

      const schemaObject = actions.schema.createObjectType({
        name: type.name,
        interfaces: ['Node', ...interfaces],
        description: type.description,
        fields: Object.fromEntries(fields)
      })

      return { name: type.name, schemaObject }
    })

    actions.addSchemaTypes(nodeTypes.map(type => type.schemaObject))

    for (const { name, schemaObject } of nodeTypes) {
      // if (name === 'WordPressCoupon') console.log(schemaObject.options.fields)
      actions.addCollection(name)
    }

    // Enums
    const discardEnums = ['__DirectiveLocation', '__TypeKind']
    const enumTypes = data.__schema.types.filter(({ kind, name }) => kind === 'ENUM' && !discardEnums.includes(name)).map(type => {
      const values = Object.fromEntries(type.enumValues.map(({ name, value, deprecationReason, description }) => [name, { value, deprecationReason, description }]))
      return {
        name: prefix(type.name),
        description: type.description,
        values
      }
    })

    actions.addSchemaTypes(enumTypes.map(type => actions.schema.createEnumType(type)))

    reporter.success('Finished')
  })
}
