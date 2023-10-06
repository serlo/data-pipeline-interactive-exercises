import { existsSync, readFileSync, writeFileSync } from 'fs'
import { startDate } from '.'

const apiUrl = 'https://api.serlo.org/graphql'

export async function loadTitles(uuids: number[]) {
  const titles: { [key: number]: string } = existsSync('./titles.json')
    ? JSON.parse(readFileSync('./titles.json', 'utf-8'))
    : {}

  for (const uuid of uuids) {
    if (!titles[uuid]) {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
      query{
        uuid(id: ${uuid}) {
          alias
        }
      }
    `,
        }),
      })
      const res = await resp.json()

      if (res?.data?.uuid?.alias) {
        console.log(res.data.uuid.alias)
        titles[uuid] = res.data.uuid.alias
      }
    }
    // need a loop ...
  }

  writeFileSync('./titles.json', JSON.stringify(titles))
}
