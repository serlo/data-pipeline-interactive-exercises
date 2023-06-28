import fs from 'fs'

const i: string = 'Hello, world!'

console.log(i)

fs.mkdirSync('_output')

fs.writeFileSync('_output/test.json', JSON.stringify({ key: 'value' }), {
  encoding: 'utf8',
  flag: 'w',
})
