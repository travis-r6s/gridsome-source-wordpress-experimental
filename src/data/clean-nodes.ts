import { Utils } from '../utils'

export const cleanNodes = (nodes: any, { prefix }: Utils) =>
  nodes.map((node: any) =>
    Object.fromEntries(
      Object.entries(node).map(([key, data]: [string, any]) => {
        if (!data) return [key, data]
        const value = data.nodes || data.node || data
        if (Array.isArray(value) && value.length) {
          if (value[0].typeName) {
            const values = value.map(({ id, typeName }) => ({ id, typeName: prefix(typeName) }))
            return [key, values]
          }
        }
        if (value.typeName) {
          return [key, { ...value, typeName: prefix(value.typeName) }]
        }
        return [key, value]
      })
    )
  )
