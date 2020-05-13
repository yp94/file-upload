import {formatStatus} from './tools'
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
    return xhr
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
  fileStatusList[hash].progress = progress
}

//发送请求检查服务器已接收的内容
//如果文件已存在，则返回true
//如果已经有一部分了，返回已有部分的index
async function checkUploaded(url, dataList) {
  if (dataList[0] && dataList[0].hash) {
    dataList = [dataList]
  }

  const data = dataList.map(file => {
      return {
        name: file[0].fileName,
        hash: file[0].hash
      }
    })

  const uploadedChunk = await new Promise(resolve => {
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

  return JSON.parse(uploadedChunk)
}

//过滤服务器已存在的内容并记录
async function filterDataList(uploadedChunk,dataList,onProgressChange) {
  for (let i = 0; i < dataList.length; i++) {
    const hash = dataList[i].hash
    if (uploadedChunk[hash]) {
      //文件已存在
      if (uploadedChunk[hash] === true) {
        dataList[i].done = true
        //显示极速秒传
        fileStatusList[hash].status = formatStatus(7)
      //部分chunk已存在
      } else if (Array.isArray(uploadedChunk[hash])) {
        const unUploadChunks = dataList[i].chunks.filter((it,index) => !uploadedChunk[hash].includes(index))
        //把需要传输的chunk放入fileStatusList
        fileStatusList[hash].chunks = unUploadChunks
        //显示已传的占比
        const progress = parseInt((unUploadChunks.length / dataList[i].total) * 100)
        fileStatusList[hash].progress = fileStatusList[hash].initProgress = progress
      }
    }
  }
  onProgressChange(fileStatusList)
  return dataList.filter(item => !item.done)
}

function uploadChunk(url,files,onProgressChange) {
  function onProgress(hash,index) {
    return e => {
      fileStatusList[hash].loaded[index] = {
        loaded: e.loaded,
        total: e.total
      }

      calcProgress(hash)
      //通知前端
      onProgressChange(fileStatusList)
    }
  }
  //封装formData
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    fileStatusList[file.hash].status = formatStatus(3)
    file.chunks.forEach(chunk => {
      const formData = new FormData();
      formData.append("chunk", chunk.fileChunk);
      formData.append("hash", chunk.chunkHash);
      formData.append("index", chunk.index);
      formData.append("filename", file.name);
      formData.append("fileHash", file.hash);
      formData.append('total', file.total)

      const xhr = request({
        url:`${url}/upload`,
        data:formData,
        onProgress: onProgress(file.hash,chunk.index),
        success: () => {
          const requestList = fileStatusList[file.hash].requestList
          requestList[chunk.index] = null
          if (requestList.filter(it => it).length === 0) {
            // debugger
            console.log(fileStatusList)
            fileStatusList[file.hash].status = formatStatus(5)
            fileStatusList[file.hash].progress = null
            onProgressChange(fileStatusList)
          }
        }
      })
      //保存xhr对象
      fileStatusList[file.hash].requestList[chunk.index] = xhr
    })
  }
}

//abort暂停上传和取消上传文件的xhr
function onCancel(target) {
  if (!fileStatusList[target.hash]) {
    return
  }
  fileStatusList[target.hash].status = formatStatus(4)
  const targetRequestList = fileStatusList[target.hash].requestList.filter(it => it)
  targetRequestList.forEach(xhr => xhr.abort())
  if (target.type === 'cancel') {
    fileStatusList[target.hash] = null
  }
}

async function onContinue(target) {
  const targetFileStatus = fileStatusList[target.hash]
  targetFileStatus.requestList = []
  targetFileStatus.loaded = []
  targetFileStatus.status = formatStatus(3)
  const url = targetFileStatus.url
  //查询已传输的chunk信息
  const uploadedChunk = await checkUploaded(url,[target.data])
  //过滤掉已传输的chunk
  const filteredDataList = await filterDataList(uploadedChunk,[target.data],fileStatusList.onProgressChange)
  uploadChunk(url, filteredDataList, fileStatusList.onProgressChange)
}


async function sendData({url, dataList, onProgressChange}) {
  //清除传输中和已完成的文件
  dataList = dataList.filter(file => {
    return !(fileStatusList[file.hash] || file.done)
  })
  if (dataList.length === 0) {
    return
  }

  fileStatusList.onProgressChange = onProgressChange

  //为干净的文件添加记录
  dataList.forEach(file => {
    fileStatusList[file.hash] = {
      initProgress: 0,
      progress: 0,
      loaded:[],
      requestList:[],
      url: url,
      status: formatStatus(2)
    }
  })

  //
  onProgressChange(fileStatusList)

  const uploadedChunk = await checkUploaded(url,dataList)
  const filteredDataList = await filterDataList(uploadedChunk,dataList,onProgressChange)

  uploadChunk(url, filteredDataList, onProgressChange)
}

export {sendData, onCancel, onContinue}