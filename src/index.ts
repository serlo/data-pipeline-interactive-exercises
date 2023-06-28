import fs from 'fs'

const i: string = 'Hello, world!'

console.log(i)

const dir = '_output'

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir)
}

fs.writeFileSync(dir + '/test.json', JSON.stringify({ key: 'value' }), {
  encoding: 'utf8',
  flag: 'w',
})
