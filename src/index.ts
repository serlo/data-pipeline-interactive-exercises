import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { dateToLocaleDate, generateDateList } from './utils'
import { updateChanges } from './update-changes'

async function run() {
  await updateChanges()

  if (!existsSync('./_output')) {
    mkdirSync('./_output')
  }
  writeFileSync('./_output/index.html', 'Hallo, Welt!')
}

run()
