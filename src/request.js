//文件状态记录
const fileStatusList = {}

//xhr封装
function request({
  url,
  method = 'POST',
  data,
  onProgress,
  success,
}) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url)
    xhr.upload.onprogress = onProgress
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if(xhr.status === 200) {
          success(xhr.response)
        }
      }
    }
    xhr.send(data)
}

//计算百分比
function calcProgress(hash) {
  let loadedTotal = fileStatusList[hash].loaded.map(it => it.loaded).reduce((pre, curr) => pre+curr)
  let total = fileStatusList[hash].loaded.map(it => it.total).reduce((pre, curr) => pre+curr)
  let progress
  //如果是其中一部分已经发过了
  if (fileStatusList[hash].initProgress) {
    progress = parseInt((loadedTotal/total) * (100 - fileStatusList[hash].initProgress)) + fileStatusList[hash].initProgress
  } else {
    progress = parseInt(loadedTotal/total * 100)
  }
  fileStatusList[hash].progress = `${progress}%`
}

//发送请求检查服务器已接收的内容
//如果文件已存在，则返回true
//如果已经有一部分了，返回已有部分的index
async function checkUploaded(url, dataList) {
  if (dataList[0].hash) {
    dataList = [dataList]
  }

  const data = dataList.map(file => {
    return {
      name: file[0].fileName,
      hash: file[0].hash
    }
  })

  const uploadInfo = await new Promise(resolve => {
    request({
      url:`${url}/check`,
      method:'get',
      data:data,
      onProgress:null,
      success:(res) => {
        resolve(res)
      }
    })
  })

  return JSON.parse(uploadInfo)
}

//过滤服务器已存在的内容并记录
async function filterDataList(uploadInfo,dataList,onProgressChange) {
  for (let i = 0; i < dataList.length; i++) {
    const hash = dataList[i].hash
    if (uploadInfo[hash]) {
      //文件已存在
      if (uploadInfo[hash] === true) {
        dataList[i].done = true
        //显示极速秒传
        fileStatusList[hash].progress = 7
      //部分chunk已存在
      } else if (Array.isArray(uploadInfo[hash])) {
        dataList[i].chunks = dataList[i].chunks.filter((it,index) => !uploadInfo[hash].includes(index))
        //显示已传的占比
        const progress = parseInt((dataList[i].chunks.length / dataList[i].total) * 100)
        fileStatusList[hash].progress = `${progress}%`
        fileStatusList[hash].initProgress = progress
      }
    }
  }
  onProgressChange(fileStatusList)
  return dataList.filter(item => !item.done)
}

async function sendData({url, dataList, onProgressChange}) {
  //清除传输中和已完成的文件
  dataList = dataList.filter(file => {
    return !(fileStatusList[file.hash] || file.done)
  })
  if (dataList.length === 0) {
    return
  }
  console.log(fileStatusList)
  console.log(dataList)

  //为干净的文件添加记录
  dataList.forEach(file => {
    fileStatusList[file.hash] = {
      initProgress: 0,
      progress: 1,
      loaded:[]
    }
  })

  const uploadInfo = await checkUploaded(url,dataList)
  const filteredDataList = await filterDataList(uploadInfo,dataList,onProgressChange)


  function uploadChunk() {
    //封装formData
    filteredDataList.map((file,index) => {
      return file.chunks.forEach(chunk => {
        const formData = new FormData();
        formData.append("chunk", chunk.fileChunk);
        formData.append("hash", chunk.chunkHash);
        formData.append("index", chunk.index);
        formData.append("filename", file.name);
        formData.append("fileHash", file.hash);
        formData.append('total', file.total)

        request({
          url:`${url}/upload`,
          data:formData,
          onProgress: onProgress(file.hash,chunk.index),
          success: () => {
            console.log('ok')
          }
        })
      })
    })
  }
  function onProgress(hash,index) {
    return e => {
      fileStatusList[hash].loaded[index] = {
        loaded: e.loaded,
        total: e.total
      }

      calcProgress(hash)
      //通知前端
      onProgressChange(fileStatusList)
    };
  }
  uploadChunk()
}

export default sendData