import consola from 'consola'

export const reporter = consola.create({ defaults: { tag: 'gridsome-source-wordpress-experimental' } })

export interface Utils {
  baseUrl: string
  typeName: string
  prefix: Function
  concurrency: number
  excluded: {
    fields: string[]
    types: string[]
  }
  included?: string[]
}

export const excludedFields = [
  'allSettings',
  'cart',
  'comments',
  'contentNodes',
  'contentTypes',
  'coupons',
  'customers',
  'discussionSettings',
  'generalSettings',
  'orders',
  'paymentGateways',
  'plugins',
  'readingSettings',
  'refunds',
  'registeredScripts',
  'registeredStylesheets',
  'revisions',
  'themes',
  'userRoles',
  'users',
  'viewer',
  'visibleProducts',
  'writingSettings'
]
export const excludedTypes = ['EnqueuedScript', 'EnqueuedStylesheet', 'DownloadableItem']
