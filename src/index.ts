import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { updateChanges } from './update-changes'

export const startDate = '2023-06-12'

export const tmp_endDate = '2023-09-10'

async function run() {
  await updateChanges()

  if (!existsSync('./_output')) {
    mkdirSync('./_output')
  }
  writeFileSync('./_output/index.html', 'Hallo, Welt!')
}

run()
