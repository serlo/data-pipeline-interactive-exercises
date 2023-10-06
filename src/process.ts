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
  for (let i = 0; i + 1 < dates.length; i++) {
    const date = dates[i]
    const psRaw: SolvedData = JSON.parse(
      readFileSync(`./solved/${date}.json`, 'utf-8')
    )

    solved[date] = {}
    solvedByEntity[date] = {}

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
          }

          return { ...change, solved: s, visits: v, solvedByEntity: sbe }
        }
      }),
    }
    writeFileSync(
      `./_output/folderData/${uuid}.json`,
      JSON.stringify(folderData)
    )
  }
}
