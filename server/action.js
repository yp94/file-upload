const multiparty = require('multiparty');
const path = require('path')
const fse = require("fs-extra");

const UPLOAD_DIR = path.resolve(__dirname, "..", "target"); // 大文件存储目录


const checkUploaded = () => {

}

const uploadFile = (req, res) => {
  handleFormData(req, res)
}

const pipeStream = (filePath, writeStream) => {
  return new Promise((resolve, reject) => {
    const readStream = fse.createReadStream(filePath)
    readStream.on('end',() => {
      fse.unlinkSync(filePath);
      resolve()
    })
    readStream.pipe(writeStream)
  })
}

const mergeFile = (chunkDir,total, filename,res) => {
  fse.readdir(chunkDir).then(async files => {
    //如果已经收到了所有chunk
    if (files.length === Number(total)) {
      files.sort((a,b) => a-b)
      const size = fse.statSync(path.resolve(chunkDir, files[0])).size
      await Promise.all(files.map((file, index) => {
        return pipeStream(
          path.resolve(chunkDir, file),
          fse.createWriteStream(path.resolve(UPLOAD_DIR, filename),{
            start: index * size,
            end: (index + 1) * size
          })
        )
      }))
      fse.rmdirSync(chunkDir);
      res.end('merge sucess')
    }
  })
}

const handleFormData = async (req, res) => {
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
    const [filename] = fields.filename
    const [total] = fields.total

    const chunkDir = path.resolve(UPLOAD_DIR, fileHash)

    //确保文件夹存在
    fse.ensureDirSync(chunkDir)

    try {
      await fse.move(chunk.path, path.resolve(chunkDir, index))
    } catch (error) {
      console.log(error)
    }

    mergeFile(chunkDir, total, filename, res)

    res.end('ok')
    });
}


module.exports = {
  checkUploaded,
  uploadFile
}