// allowing sync methods in this file only
/*eslint no-sync: 0*/

const fs = require('fs')
const path = require('path')

const indexes = {}

function walkDir(currentNotation, currentDir, firstPass) {
  const list = fs.readdirSync(currentDir)

  for (let i = 0; i < list.length; i++) {
    const subPath = path.resolve(currentDir, list[i])
    const stat = fs.statSync(subPath)

    // only add index.js files
    if (firstPass !== true && stat.isFile() && list[i] === 'index.js') {
      indexes[currentNotation] = currentDir
      continue
    }

    if (stat.isDirectory()) {
      walkDir(`${currentNotation}${currentNotation.length ? '.' : ''}${list[i]}`, subPath)
    }
  }
}
walkDir('', path.resolve(__dirname, 'subscribers'), true)

module.exports = indexes
