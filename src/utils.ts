import consola from 'consola'

export const reporter = consola.create({ defaults: { tag: 'gridsome-source-wordpress-experimental' } })

export interface Utils {
  baseUrl: string
  typeName: string
  prefix: Function
  concurrency: number
}
