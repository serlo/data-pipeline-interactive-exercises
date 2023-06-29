import fs from 'fs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function run() {
  // automatically detect interesting things happening in interactive exercise folders

  let output = ''

  const now = new Date()
  const startOfToday = new Date(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  )

  output += `<small>Stand: ${now.toLocaleString('de-DE', {
    timeZone: 'CET',
  })}</small>`

  for (let i = 0; i < 60; i++) {
    // Step 1: load all data from 1 day
    const start = new Date(startOfToday.getTime() - i * 1000 * 60 * 60 * 24)

    const dailyTops: {
      path: string
      timestamp: number
      count: number
      median: number
    }[] = []

    output += `<h2>${start.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'CET',
    })}</h2>`

    const end = new Date(start.getTime() + 1000 * 60 * 60 * 24)

    const data = await prisma.exerciseSubmission.findMany({
      where: { timestamp: { gte: start, lt: end } },
    })

    const pages = data.reduce((result, obj) => {
      const key = obj.path
      const entry = (result[key] = result[key] ?? [])
      entry.push(obj)
      return result
    }, {} as { [key: string]: typeof data })

    for (const pageEntry of Object.entries(pages)) {
      const [path, data] = pageEntry

      const sessions = data.reduce((result, obj) => {
        const key = obj.sessionId
        const entry = (result[key] = result[key] ?? [])
        entry.push(obj)
        return result
      }, {} as { [key: string]: typeof data })

      const sessionData = Object.entries(sessions).map(([id, data]) => {
        data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        return {
          start: data[0].timestamp.getTime(),
          end: data.at(-1).timestamp.getTime(),
          id,
        }
      })

      const deltas: {
        timestamp: number
        action: 'start' | 'end'
        id: string
      }[] = []

      sessionData.forEach((entry) => {
        deltas.push({ action: 'start', id: entry.id, timestamp: entry.start })
        deltas.push({ action: 'end', id: entry.id, timestamp: entry.end })
      })

      deltas.sort((a, b) => a.timestamp - b.timestamp)

      const activeSessions = new Set<string>()

      const highs: { timestamp: number; sessions: Set<string> }[] = []

      for (const delta of deltas) {
        if (delta.action == 'start') {
          activeSessions.add(delta.id)
        } else if (delta.action == 'end') {
          activeSessions.delete(delta.id)
        }
        if (activeSessions.size >= 10) {
          highs.push({
            timestamp: delta.timestamp,
            sessions: new Set(activeSessions),
          })
        }
      }
      while (highs.length > 0) {
        highs.sort((a, b) => b.sessions.size - a.sessions.size)
        const top = highs.shift()

        if (top.sessions.size >= 10) {
          // do more analysis of this moment
          const times: number[] = []
          sessionData.forEach((entry) => {
            if (top.sessions.has(entry.id)) {
              times.push(entry.end - entry.start)
            }
          })
          const median = calcMedian(times)

          console.log(
            `Candidate at & ${new Date(
              top.timestamp
            )} on ${path}: Median ${Math.round(median / 1000 / 60)} min, ${
              top.sessions.size
            } users`
          )

          dailyTops.push({
            path,
            timestamp: top.timestamp,
            count: top.sessions.size,
            median: Math.round(median / 1000 / 60),
          })
        } else {
          break
        }

        // remove sessions from others
        highs.forEach((high) => {
          top.sessions.forEach((ses) => {
            high.sessions.delete(ses)
          })
        })
      }
    }
    dailyTops.sort((a, b) => b.timestamp - a.timestamp)
    for (const top of dailyTops) {
      output += `
        <p>
          <a href="https://de.serlo.org${
            top.path
          }" target="_blank">de.serlo.org${decodeURIComponent(
        top.path
      )}</a> | ${new Date(top.timestamp).toLocaleTimeString('de-DE', {
        timeZone: 'CET',
      })}, ${top.count} NutzerInnen, ${top.median} min aktive Zeit (median)
        </p>
      `
    }
  }

  const dir = '_output'

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }

  fs.writeFileSync(
    dir + '/index.html',
    `
      <!doctype html>

      <html lang="de">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        
          <title>Einsatz von Serlo-Aufgaben im Unterricht</title>
        
        </head>
        
        <body>
          <h1>Einsatz von Serlo-Aufgaben im Unterricht</h1>
          <p>
            Eine Serlo-Seite mit Aufgaben wird gleichzeitig von mindestens 10 Personen interaktiv genutzt -&gt; hier wird ein Einsatz im Unterricht vermutet.
          </p>

          ${output}
        </body>
      </html>
  
  `
  )
}

run()

function calcMedian(ar1: number[]) {
  var half = Math.floor(ar1.length / 2)
  ar1.sort(function (a, b) {
    return a - b
  })

  if (ar1.length % 2) {
    return ar1[half]
  } else {
    return (ar1[half] + ar1[half] + 1) / 2.0
  }
}
