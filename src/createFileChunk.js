const SIZE = 2 * 1024 * 1024; // 切片大小2M

//file切片
function createFileChunk(file, size = SIZE) {
  const chunkList = []
  let curr = 0
  while(curr < file.size) {
    chunkList.push(file.slice(curr, curr+size))
    curr += size
  }
  return chunkList
}

//计算hash
function calcHash(file) {
  return new Promise((resolve, reject) => {
    const calcWorker = new Worker('/hash.js')
    calcWorker.postMessage(file)
    calcWorker.onmessage = e => {
      if (e.data.hash) {
        resolve(e.data.hash)
      } else {
        reject('hash error')
      }
    }
  })
}

//封装切片
async function fileChunk(fileList) {
  const fileChunkList = []
  const hashList = []
  Array.prototype.forEach.call(fileList, (file,index) => {
    fileChunkList[index] = createFileChunk(file)
  })
  await Promise.all(
    Array.prototype.map.call(fileList, async(file, index) => {
      hashList[index] = await calcHash(file)
    })
  )

  const dataList = fileChunkList.map((file,i) => {
    return {
      hash: hashList[i],
      name: fileList[i].name,
      total: fileChunkList[i].length,
      size: fileList[i].size,
      chunks: file.map((fileChunk,j) => {
        return {
          chunkHash: `${hashList[i]}_${j}`,
          index:j,
          fileChunk
        }
      })
    }
  })

  return dataList
}

export default fileChunk