import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { startDate } from '.'
import { generateDateList } from './utils'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function loadSolvedExercises() {
  if (!existsSync('./solved')) {
    mkdirSync('./solved')
  }
  const endDate = '2023-07-17'
  const dates = generateDateList(startDate, endDate)

  for (const date of dates) {
    const filename = './solved/' + date + '.json'
    if (!existsSync(filename)) {
      console.log('load solved exercises for', date)
      const startOfDay = new Date(date)
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
      const output = await prisma.exerciseSubmission.findMany({
        where: {
          timestamp: { gte: startOfDay, lt: endOfDay },
          result: 'correct',
        },
      })
      writeFileSync(filename, JSON.stringify(output))
    }
  }
}
