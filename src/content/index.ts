import { Data } from '../data/fetch-data'
import { SourceOptions } from '..'
import { downloadImages } from './download-images'
import { reporter, Utils } from '../utils'

export const contentActions = async (data: Data[], actions: any, { config, utils }: { config: SourceOptions; utils: Utils }) => {
  const { images = true } = config
  if (images) {
    const mediaItems = data.find(({ name }) => name === 'mediaItems')

    if (!mediaItems) reporter.log('No MediaItem nodes to process.')
    else await downloadImages(mediaItems, actions, { config, utils })
  }
}
