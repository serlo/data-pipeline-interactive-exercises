import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { updateChanges } from './update-changes'
import { dateToLocaleDate } from './utils'
import { loadSolvedExercises } from './load-solved-exercises'

export const startDate = '2023-06-12'

export const endDate = dateToLocaleDate(new Date())

async function run() {
  console.log('script end date', endDate)

  await updateChanges()

  await loadSolvedExercises()

  if (!existsSync('./_output')) {
    mkdirSync('./_output')
  }
  writeFileSync('./_output/index.html', 'Hallo, Welt!')
}

run()
