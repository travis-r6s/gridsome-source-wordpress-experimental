// Packages
import got from 'got'
import { getIntrospectionQuery, buildClientSchema, getNamedType, getNullableType, isObjectType, isUnionType, isEnumType, isInterfaceType } from 'graphql'
import { visitSchema, VisitSchemaKind, renameType } from 'graphql-tools'
// import { graphqlQueryBuilder as queryBuilder } from '@wheelroom/graphql-query-builder'
import consola from 'consola'

const reporter = consola.create({ defaults: { tag: 'gridsome-source-wordpress-experimental' } })

export default (api, config) => {
  const { typeName = 'WordPress', baseUrl = '' } = config

  const excludedTypes = ['Theme', 'Script', 'Stylesheet', 'Payload', 'Asset', 'Enqueued']

  api.loadSource(async actions => {
    const scalarTypes = ['String', 'Int', 'Float', 'Boolean', 'ID']
    const prefix = name => scalarTypes.includes(name) ? name : `${typeName}${name}`

    const transformFields = type => {
      const fields = type.getFields()
      return Object.entries(fields).map(([key, field]) => {
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
        if (type.name !== 'Node') return renameType(type, prefix(type.name))
      },
      [ VisitSchemaKind.UNION_TYPE ] (type) {
        return renameType(type, prefix(type.name))
      },
      [ VisitSchemaKind.ENUM_TYPE ] (type) {
        return renameType(type, prefix(type.name))
      }
    })

    const typeMap = transformed.getTypeMap()
    const allTypes = Object.values(typeMap).filter(type => type.name.startsWith(typeName) && !type.name.includes('Root') && !type.name.includes('Connection'))

    const TypeBuilder = schema => ({
      interface: type => {
        const fields = transformFields(type)
        return schema.createInterfaceType({
          name: type.name,
          description: type.description,
          fields: Object.fromEntries(fields)
        })
      },
      union: type => {
        const types = type.getTypes().map(type => type.name)
        return schema.createUnionType({
          name: type.name,
          description: type.description,
          types
        })
      },
      enum: type => {
        // We don't seem to get any enum types here - further research required...
      },
      object: type => {
        const fields = transformFields(type)
        const interfaces = type.getInterfaces().map(type => type.name)
        return schema.createObjectType({
          interfaces,
          name: type.name,
          description: type.description,
          fields: Object.fromEntries(fields)
        })
      }
    })

    const buildType = TypeBuilder(actions.schema)
    const schemaTypes = allTypes.map(type => {
      if (isInterfaceType(type)) return buildType.interface(type)
      if (isEnumType(type)) return buildType.enum(type)
      if (isObjectType(type)) return buildType.object(type)
      if (isUnionType(type)) return buildType.union(type)
    })

    actions.addSchemaTypes(schemaTypes)

    // Enums - don;t seem to be inlcuded in the type map
    const discardEnums = ['__DirectiveLocation', '__TypeKind']
    const enumTypes = data.__schema.types.filter(({ kind, name }) => kind === 'ENUM' && !discardEnums.includes(name)).map(type => {
      const values = Object.fromEntries(type.enumValues.map(({ name, value, deprecationReason, description }) => [name, { value, deprecationReason, description }]))
      return {
        name: type.name,
        description: type.description,
        values
      }
    })

    actions.addSchemaTypes(enumTypes.map(type => actions.schema.createEnumType(type)))

    const nodeType = schema.getType('Node')
    const possibleTypes = schema.getPossibleTypes(nodeType)
    const collections = possibleTypes.map(type => renameType(type, prefix(type.name))).map(type => type.name)

    for (const type of collections) {
      actions.addCollection(type)
    }

    reporter.success('Finished adding WordPress schema')
  })
}
