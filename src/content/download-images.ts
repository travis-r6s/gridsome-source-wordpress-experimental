import { Data } from '../data/fetch-data'
import { reporter, Utils } from '../utils'
import fs from 'fs-extra'
import stream from 'stream'
import { promisify } from 'util'
import got from 'got'
import pMap from 'p-map'
import { SourceOptions } from '..'
import path from 'path'

export const downloadImages = async (data: Data, actions: any, { config, utils }: { config: SourceOptions; utils: Utils }) => {
  const { original = false, folder = '.images/wordpress', cache = true } = typeof config.images === 'boolean' ? {} : config.images
  const { type, nodes } = data

  const imageStore = actions.getCollection(type)
  const pipeline = promisify(stream.pipeline)

  await pMap(
    nodes,
    async image => {
      const { pathname } = new URL(image.sourceUrl)
      const { name, dir, ext } = path.parse(pathname)

      const targetFileName = original ? name : image.id
      const targetFolder = path.join(process.cwd(), folder, original ? dir : '')

      const filePath = path.format({ ext, name: targetFileName, dir: targetFolder })

      const updatedNode = { ...image, downloaded: filePath }

      if (cache && (await fs.pathExists(filePath))) return imageStore.updateNode(updatedNode)

      try {
        await fs.ensureFile(filePath)
        await pipeline(got.stream(image.sourceUrl), fs.createWriteStream(filePath))

        return imageStore.updateNode(updatedNode)
      } catch (error) {
        reporter.error(error.message)
      }
    },
    { concurrency: utils.concurrency }
  )
}
