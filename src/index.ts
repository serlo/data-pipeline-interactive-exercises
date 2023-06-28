import fs from 'fs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function run() {
  const count = await prisma.exerciseSubmission.count()

  const dir = '_output'

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }

  fs.writeFileSync(dir + '/test.json', JSON.stringify({ count }), {
    encoding: 'utf8',
    flag: 'w',
  })
}

run()
