const multiparty = require('multiparty');
const path = require('path')
const fse = require("fs-extra");

const UPLOAD_DIR = path.resolve(__dirname, "..", "target"); // 大文件存储目录

//获取扩展名
const getFileNameExtension = fileName => {
  return fileName.slice(fileName.lastIndexOf("."), fileName.length);
}

const getPostData = (req) => {
  return new Promise((resolve, reject) => {
    let chunk = ''
    req.on('data', data => {
      chunk += data
    })
    req.on('end', () => {
      resolve(JSON.parse(chunk))
    })
  })
}

const pipeStream = (filePath, writeStream) => {
  return new Promise((resolve, reject) => {
    const readStream = fse.createReadStream(filePath)
    readStream.on('end',() => {
      resolve()
    })
    readStream.pipe(writeStream)
  })
}

//合并chunk
const mergeFile = (chunkDir,total, fileName,res) => {
  fse.readdir(chunkDir).then(async files => {
    //如果已经收到了所有chunk
    if (files.length === Number(total)) {
      files.sort((a,b) => a-b)
      const size = fse.statSync(path.resolve(chunkDir, files[0])).size
      const hashFileName = `${chunkDir.substring(0,chunkDir.length - 1)}${getFileNameExtension(fileName)}`

      await Promise.all(files.map((file, index) => {
        return pipeStream(
          path.resolve(chunkDir, file),
          fse.createWriteStream(hashFileName,{
            start: index * size,
            end: (index + 1) * size
          })
        )
      }))

      fse.emptyDirSync(chunkDir)
      fse.rmdirSync(chunkDir);
      res.end('merge sucess')
    }
  })
}

//解析上传的chunk并储存
const uploadFile = async (req, res) => {
  const form = new multiparty.Form();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.status = 500
      res.end('err')
    }

    if (!(fields && files)) {
      return
    }

    const [chunk] = files.chunk
    const [index] = fields.index
    const [fileHash] = fields.fileHash
    const [fileName] = fields.fileName
    const [total] = fields.total

    const chunkDir = path.resolve(UPLOAD_DIR, fileHash)

    //确保文件夹存在
    fse.ensureDirSync(chunkDir)

    try {
      await fse.move(chunk.path, path.resolve(chunkDir, index))
    } catch (error) {
      console.log(error)
    }

    mergeFile(chunkDir, total, fileName, res)

    res.end('ok')
    });
}

//检查路径是否存在
const pathExists = path => {
  return fse.pathExistsSync(path)
}

const getDirInfo = dirPath => {
  const fileList = fse.readdirSync(dirPath)
  const size = fileList.reduce((pre, curr) => {
    return pre + fse.statSync(path.resolve(dirPath, curr)).size
  },0)
  fileList.push(size)
  return fileList
}

//检查文件是否已上传
const checkUploaded = async (req, res) => {
  const data = await getPostData(req)
  const result = {}
  data.forEach(item => {
    const {hash, fileName} = item
    const dirPath = path.resolve(UPLOAD_DIR, hash)
    const filePath = `${dirPath.substring(0,dirPath.length - 1)}${getFileNameExtension(fileName)}`
    if (pathExists(dirPath)) {
      result[hash] = getDirInfo(dirPath)
    } else if (pathExists(filePath)) {
      result[hash] = true
    }
  })
  res.end(JSON.stringify(result))
}

module.exports = {
  checkUploaded,
  uploadFile
}