import { existsSync, readFileSync, writeFileSync } from 'fs'
import { generateDateList } from './utils'
import { DumpData, extractFromDump } from './extract-from-dump'
import { startDate, tmp_endDate } from '.'

interface Changes {
  __start: string
  __end: string | null
  data: {
    [key: number]: {
      content: object[]
      start: string
      end: string
    }[]
  }
}

export async function updateChanges() {
  const changes: Changes = existsSync('./changes.json')
    ? JSON.parse(readFileSync('./changes.json', 'utf-8'))
    : { data: {}, __start: startDate, __end: null }

  const dates = generateDateList(startDate, tmp_endDate)

  const indexOfEndDate = changes.__end ? dates.indexOf(changes.__end) : -1

  if (
    changes.__start !== startDate ||
    (changes.__end && !dates.includes(changes.__end))
  ) {
    throw 'Fatal: changes start/end invalid. Something is broken'
  }

  const res = await fetch(
    'https://serlo.github.io/visits-dashboard/uuid_index.json'
  )
  const uuidIndex = await res.json()

  const uuids = Object.entries(uuidIndex)
    .filter((entry) => entry[1] == 'ExerciseFolder')
    .map((entry) => parseInt(entry[0]))

  console.log(uuids.length, 'uuids geladen')

  for (let i = indexOfEndDate + 1; i < dates.length; i++) {
    console.log('running update for', dates[i])
    const output = await extractFromDump(dates[i])
    if (!output) continue

    for (const uuid of uuids) {
      if (!changes.data[uuid]) {
        changes.data[uuid] = []
      }
    }

    for (const key in changes.data) {
      const content = resolveTaxonomy(parseInt(key), output)
      if (content) {
        const v = changes.data[key]
        if (v.length == 0) {
          v.push({ content, start: dates[i], end: dates[i] })
          console.log('new version', key)
        } else {
          if (deepEqual(v[v.length - 1].content, content)) {
            v[v.length - 1].end = dates[i]
          } else {
            v.push({ content, start: dates[i], end: dates[i] })
            console.log('new version', key)
          }
        }
      }
    }
    changes.__end = dates[i]
    writeFileSync('./changes.json', JSON.stringify(changes))
  }
}

function resolveTaxonomy(id: number, result: DumpData) {
  // console.log('Resolve taoxnomy', id)
  const entries = result.term_taxonomy_entity[id]
  if (!entries) return
  entries.sort((a, b) => a.position - b.position)
  return entries.map((e) => resolveEntity(e.entity_id, result)).filter((e) => e)
}

function resolveEntity(id: number, result: DumpData) {
  // console.log('Resolve entity', id)
  const entity = result.entity[id]
  const type = result.type[entity.type_id]
  const uuid = result.uuid[id]
  if (uuid.trashed) return
  entity.__typename = result.type[entity.type_id].name
  entity.__id = id
  if (
    ![
      'text-exercise',
      'text-solution',
      'text-exercise-group',
      'grouped-text-exercise',
    ].includes(entity.__typename)
  ) {
    return
  }
  if (entity.current_revision_id) {
    const children = result.entity_link[id]
    if (children) {
      children.sort((a, b) => a.order - b.order)
      entity.children = children
        .map(({ child_id }) => {
          return resolveEntity(child_id, result)
        })
        .filter((e) => e)
    }
    return entity
  }
}

function deepEqual(obj1, obj2) {
  // Check if the objects are of the same type
  if (typeof obj1 !== typeof obj2) {
    return false
  }

  // Check if the objects are arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      return false
    }
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) {
        return false
      }
    }
    return true
  }

  // Check if the objects are objects (non-arrays)
  if (
    typeof obj1 === 'object' &&
    obj1 !== null &&
    typeof obj2 === 'object' &&
    obj2 !== null
  ) {
    const keys1 = Object.keys(obj1)
    const keys2 = Object.keys(obj2)

    if (keys1.length !== keys2.length) {
      return false
    }

    for (const key of keys1) {
      if (!deepEqual(obj1[key], obj2[key])) {
        return false
      }
    }

    return true
  }

  // For primitive types or functions, use strict equality
  return obj1 === obj2
}
