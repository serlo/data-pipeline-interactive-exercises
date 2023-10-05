import { exec as execCallback } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { promisify } from 'util'
import yauzl from 'yauzl'
import readline from 'readline'

const exec = promisify(execCallback)

export interface DumpData {
  entity: {
    [key: number]: {
      current_revision_id: number
      type_id: number
      date: string
      __typename?: string
      __id?: number
      children?: object[]
    }
  }
  uuid: {
    [key: number]: {
      trashed: boolean
      discriminator: string
    }
  }
  term_taxonomy_entity: {
    [key: number]: {
      entity_id: number
      position: number
    }[]
  }
  entity_link: {
    [key: number]: {
      child_id: number
      order: number
    }[]
  }
  type: {
    [key: number]: {
      name: string
    }
  }
}

export async function extractFromDump(date: string): Promise<DumpData | null> {
  if (!existsSync('./tmp')) {
    mkdirSync('./tmp')
  }
  const { stdout, stderr } = await exec(
    `gsutil cp gs://anonymous-data/dump-${date}.zip ./tmp/dump.zip`
  )
  console.log(stdout, stderr)
  if (!existsSync('./tmp/dump.zip')) {
    console.log('database dump missing, skipping', date)
    return null
  }
  return await readDB()
}

function readDB() {
  return new Promise<DumpData>((res, rej) => {
    const term_taxonomy_entity: DumpData['term_taxonomy_entity'] = {}
    const uuid: DumpData['uuid'] = {}
    const entity_link: DumpData['entity_link'] = {}
    const type: DumpData['type'] = {}

    const entity: DumpData['entity'] = {}

    // Open the ZIP file for reading
    yauzl.open('./tmp/dump.zip', { lazyEntries: true }, (err, zipfile) => {
      if (err) throw err

      // Search for the target file within the ZIP archive
      zipfile.readEntry()

      zipfile.on('entry', (entry) => {
        if (entry.fileName === 'mysql.sql') {
          console.log('start reading mysql.sql file')
          // Open the target file for reading
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) throw err

            // Create a readline interface to read the file line by line
            const rl = readline.createInterface({
              input: readStream,
              crlfDelay: Infinity, // Detects all types of newlines
            })

            // Read the file line by line
            rl.on('line', (line) => {
              // console.log(line); // Process each line here
              if (line.startsWith('INSERT INTO `term_taxonomy_entity`')) {
                console.log('term taxonomy entity', line.length)

                // Use regular expression to match values inside parentheses
                const valuePattern = /\((.*?)\)/g

                // Use a loop to extract values from the input string
                let match
                while ((match = valuePattern.exec(line))) {
                  // Split the matched values by commas and convert them to numbers
                  const values = match[1].split(',').map(Number)
                  //arrayOfArrays.push(values);
                  const entry = (term_taxonomy_entity[values[2]] =
                    term_taxonomy_entity[values[2]] || [])
                  entry.push({
                    entity_id: values[1],
                    position: values[3],
                  })
                }
              }
              if (line.startsWith('INSERT INTO `uuid`')) {
                console.log('uuid', line.length)

                // Use regular expression to match values inside parentheses
                const valuePattern = /\((.*?)\)/g

                // Use a loop to extract values from the input string
                let match
                while ((match = valuePattern.exec(line))) {
                  // Split the matched values by commas and convert them to numbers
                  const values = match[1].split(',')
                  //arrayOfArrays.push(values);
                  uuid[parseInt(values[0])] = {
                    trashed: values[0] == 1,
                    discriminator: values[2].replace(/'/g, ''),
                  }
                }
              }
              if (line.startsWith('INSERT INTO `entity`')) {
                console.log('uuid', line.length)

                // Use regular expression to match values inside parentheses
                const valuePattern = /\((.*?)\)/g

                // Use a loop to extract values from the input string
                let match
                while ((match = valuePattern.exec(line))) {
                  // Split the matched values by commas and convert them to numbers
                  const values = match[1].split(',')
                  //arrayOfArrays.push(values);
                  entity[parseInt(values[0])] = {
                    current_revision_id: parseInt(values[5]),
                    type_id: parseInt(values[1]),
                    date: values[4].replace(/'/g, ''),
                  }
                }
              }
              if (line.startsWith('INSERT INTO `type`')) {
                console.log('uuid', line.length)

                // Use regular expression to match values inside parentheses
                const valuePattern = /\((.*?)\)/g

                // Use a loop to extract values from the input string
                let match
                while ((match = valuePattern.exec(line))) {
                  // Split the matched values by commas and convert them to numbers
                  const values = match[1].split(',')
                  //arrayOfArrays.push(values);
                  type[parseInt(values[0])] = {
                    name: values[1].replace(/'/g, ''),
                  }
                }
              }
              if (line.startsWith('INSERT INTO `entity_link`')) {
                console.log('term taxonomy entity', line.length)

                // Use regular expression to match values inside parentheses
                const valuePattern = /\((.*?)\)/g

                // Use a loop to extract values from the input string
                let match
                while ((match = valuePattern.exec(line))) {
                  // Split the matched values by commas and convert them to numbers
                  const values = match[1].split(',').map(Number)
                  //arrayOfArrays.push(values);
                  const entry = (entity_link[values[1]] =
                    entity_link[values[1]] || [])
                  entry.push({
                    child_id: values[2],
                    order: values[4],
                  })
                }
              }
            })

            rl.on('close', () => {
              // All lines have been read
              console.log('Finished reading the file.')

              res({ entity, uuid, term_taxonomy_entity, entity_link, type })
            })
          })
        } else {
          // Move to the next entry if the file is not the target file
          zipfile.readEntry()
        }
      })

      zipfile.on('end', () => {
        // All entries have been processed
        console.log('No more entries in the ZIP file.')
      })
    })
  })
}
