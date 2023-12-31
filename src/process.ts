import { readFileSync, writeFileSync } from 'fs'
import { Changes } from './update-changes'
import { generateDateList, pathToId } from './utils'

export type SolvedData = {
  id: number
  path: string
  entityId: number
  revisionId: number
  type: string
  result: 'correct'
  timestamp: string
  sessionId: string
}[]

export interface FolderData {
  id: number
  title: string
  versions: {
    start: string
    end: string
    content: object[]
    solved?: number
    visits?: number
    medianTime?: number
    medianTimeCount?: number
    solvedByEntity: { [key: number]: number }
  }[]
}

export async function process(uuids: number[]) {
  const changes: Changes = JSON.parse(readFileSync('./changes.json', 'utf-8'))
  const dates = generateDateList(changes.__start, changes.__end)

  console.log('extract visit counts')
  const visits: { [key: string]: { [key: string]: number } } = {}
  for (let i = 0; i + 1 < dates.length; i++) {
    const date = dates[i]
    const saRaw = JSON.parse(
      readFileSync(`./raw/deserloorg_${date}_${date}.json`, 'utf-8')
    )

    visits[date] = {}

    saRaw.datapoints.forEach((dp) => {
      const id = pathToId(dp.path)
      if (id > 0) {
        if (!visits[date][id]) visits[date][id] = 0
        visits[date][id]++
      }
    })
  }

  console.log('extract solved data')
  const solved: { [key: string]: { [key: string]: Set<string> } } = {}
  const solvedByEntity: {
    [key: string]: { [key: string]: { [key: number]: Set<string> } }
  } = {}
  const solvedByEntityAndSessionTimestamps: {
    [key: string]: {
      [key: string]: { [sessionId: string]: number[] }
    }
  } = {}
  for (let i = 0; i + 1 < dates.length; i++) {
    const date = dates[i]
    const psRaw: SolvedData = JSON.parse(
      readFileSync(`./solved/${date}.json`, 'utf-8')
    )

    solved[date] = {}
    solvedByEntity[date] = {}
    solvedByEntityAndSessionTimestamps[date] = {}

    psRaw.forEach((dp) => {
      const id = pathToId(dp.path)
      if (id > 0) {
        if (!solved[date][id]) solved[date][id] = new Set()
        solved[date][id].add(dp.sessionId)

        if (!solvedByEntity[date][id]) {
          solvedByEntity[date][id] = {}
        }

        if (!solvedByEntity[date][id][dp.entityId]) {
          solvedByEntity[date][id][dp.entityId] = new Set()
        }
        solvedByEntity[date][id][dp.entityId].add(dp.sessionId)

        // collect timestamps of all solves
        if (!solvedByEntityAndSessionTimestamps[date][id]) {
          solvedByEntityAndSessionTimestamps[date][id] = {}
        }

        if (!solvedByEntityAndSessionTimestamps[date][id][dp.sessionId]) {
          solvedByEntityAndSessionTimestamps[date][id][dp.sessionId] = []
        }

        solvedByEntityAndSessionTimestamps[date][id][dp.sessionId].push(
          new Date(dp.timestamp).getTime()
        )
      }
    })
  }

  const titles: { [key: number]: string } = JSON.parse(
    readFileSync('./titles.json', 'utf-8')
  )

  console.log('build folder data for uuids')
  for (const uuid of uuids) {
    const c = changes.data[uuid]

    const folderData: FolderData = {
      id: uuid,
      title: titles[uuid],
      versions: c.map((change) => {
        if (change.start == change.end) {
          return { ...change, solvedByEntity: {} }
        } else {
          const dates = generateDateList(change.start, change.end)
          let s = 0
          let v = 0
          let times: number[] = []
          const sbe: { [key: number]: number } = {}
          for (let i = 0; i + 1 < dates.length; i++) {
            s += solved[dates[i]][uuid]?.size ?? 0
            v += visits[dates[i]][uuid] ?? 0
            if (solvedByEntity[dates[i]][uuid]) {
              for (const key in solvedByEntity[dates[i]][uuid]) {
                if (!sbe[key]) sbe[key] = 0
                sbe[key] += solvedByEntity[dates[i]][uuid][key].size
              }
            }
            if (solvedByEntityAndSessionTimestamps[dates[i]][uuid]) {
              const rawTimestamps =
                solvedByEntityAndSessionTimestamps[dates[i]][uuid]
              for (const id in rawTimestamps) {
                const t = rawTimestamps[id]
                const min = Math.min(...t)
                const max = Math.max(...t)
                times.push(max - min)
              }
            }
          }

          const medianTime = median(times)
          /*if (medianTime > 0) {
            console.log(
              uuid,
              change.start,
              Math.round(median(times) / 1000 / 60),
              times.length
            )
          }*/

          return {
            ...change,
            solved: s,
            visits: v,
            solvedByEntity: sbe,
            medianTime,
            medianTimeCount: times.length,
          }
        }
      }),
    }
    writeFileSync(
      `./_output/folderData/${uuid}.json`,
      JSON.stringify(folderData)
    )
  }

  console.log('build folder overview')
  const folderOverview: {
    id: number
    title: string
    changesCount: number
    visitCount: number
    solvedCount: number
  }[] = uuids
    .map((uuid) => {
      let visitCount = 0
      let solvedCount = 0

      for (let i = 0; i + 1 < dates.length; i++) {
        const date = dates[i]
        visitCount += visits[date][uuid] ?? 0
        solvedCount += solved[date][uuid]?.size ?? 0
      }

      return {
        id: uuid,
        title: titles[uuid],
        changesCount: changes.data[uuid].length - 1,
        visitCount,
        solvedCount,
      }
    })
    .filter((entry) => entry.changesCount >= 0)
  writeFileSync(
    './_output/folderData/overview.json',
    JSON.stringify(folderOverview)
  )
}

function median(numbers: number[]) {
  if (numbers.length == 0) return -1

  const sorted = Array.from(numbers).sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }

  return sorted[middle]
}
