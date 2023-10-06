import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { updateChanges } from './update-changes'
import { dateToLocaleDate } from './utils'
import { loadSolvedExercises } from './load-solved-exercises'
import { loadTitles } from './load-titles'

export const startDate = '2023-06-12'

export const endDate = dateToLocaleDate(new Date())

async function run() {
  console.log('script end date', endDate)

  const res = await fetch(
    'https://serlo.github.io/visits-dashboard/uuid_index.json'
  )
  const uuidIndex = await res.json()

  const uuids = Object.entries(uuidIndex)
    .filter((entry) => entry[1] == 'ExerciseFolder')
    .map((entry) => parseInt(entry[0]))

  console.log(uuids.length, 'uuids geladen')

  await updateChanges(uuids)

  await loadSolvedExercises()

  await loadTitles(uuids)

  if (!existsSync('./_output')) {
    mkdirSync('./_output')
  }
  writeFileSync('./_output/index.html', 'Hallo, Welt!')
}

run()
