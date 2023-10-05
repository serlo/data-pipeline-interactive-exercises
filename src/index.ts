import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs'
import { promisify } from 'util'
import { exec as execCallback } from 'child_process'
const exec = promisify(execCallback)

async function run() {
  if (!existsSync('./tmp')) {
    mkdirSync('./tmp')
  }
  const { stdout, stderr } = await exec(
    'gsutil cp gs://anonymous-data/dump-2023-09-30.zip ./tmp/test.zip'
  )
  console.log(stdout, stderr)
  console.log(statSync('./tmp/test.zip'))

  if (!existsSync('./_output')) {
    mkdirSync('./_output')
  }
  writeFileSync('./_output/index.html', 'Hallo, Welt!')
}

run()
