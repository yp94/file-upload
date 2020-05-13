import React from 'react';
import './Upload.css';
import createFileChunk from './createFileChunk';
import {getSize, formatStatus} from './tools';
import {sendData, onCancel, onContinue} from './request'


class App extends React.Component {
  constructor(){
    super()
    this.onProgressChange = this.onProgressChange.bind(this)
    this.state = {
      fileInfoList: [],
      dataList: [],
    }
  }

  async fileChange(e) {
    let fileList = e.target.files
    //去除列表重复的文件
    fileList = Array.prototype.filter.call(fileList, curr => {
      return !this.state.fileInfoList.map(pre => pre.name).includes(curr.name)
    })
    const fileInfo = Array.prototype.map.call(fileList, (it, index) => {
      return {
        name: it.name,
        type: it.type,
        size: getSize(it.size),
        status: formatStatus(0),
        progress: null,
        pause: false
      }
    })

    const preFileInfoList = this.state.fileInfoList

    preFileInfoList.push(...fileInfo)

    this.setState({
      fileInfoList: preFileInfoList,
    })

    //文件切片，计算hash
    const dataList = await createFileChunk(fileList)
    const preDataList = this.state.dataList
    const prefileInfoList = this.state.fileInfoList

    const startIndex = prefileInfoList.length - fileInfo.length

    for (let i = 0; i < fileInfo.length; i++) {
      const target = prefileInfoList[startIndex+i]
      target.hash = dataList[i].hash
      target.status = formatStatus(1)
    }

    preDataList.push(...dataList)

    this.setState({
      dataList: preDataList,
      fileInfoList: prefileInfoList
    })
  }

  uploadAll() {
    sendData({
      url: 'http://localhost:8080',
      dataList: this.state.dataList,
      onProgressChange: this.onProgressChange,
      cancelUpload: this.state.cancelUpload
    })
  }

  //监听变化进度变化
  onProgressChange(fileStatusList) {
    let fileInfoList = this.state.fileInfoList
    for (let i = 0; i < fileInfoList.length; i++) {
      const hash = fileInfoList[i].hash
      if (fileStatusList[hash]) {
        const progress = fileStatusList[hash].progress
        const preProgress = fileInfoList[i].progress

        fileInfoList[i].status = fileStatusList[hash].status

        if (typeof progress === 'number' && preProgress > progress) {
            continue
        }

        fileInfoList[i].progress = progress
      }
    }

    this.setState({
      fileInfoList: fileInfoList,
    })
  }

  cancel(e,index) {
    const {fileInfoList, dataList} = this.state
    const targetHash = fileInfoList[index].hash
    fileInfoList.splice(index,1)
    dataList.splice(index,1)

    onCancel({
      hash: targetHash,
      type: 'cancel'
    })

    this.setState({
      fileInfoList: fileInfoList,
      dataList: dataList,
    })
  }

  uploadStatusChange(e,index) {
    const fileInfoList = this.state.fileInfoList
    const targetHash = fileInfoList[index].hash
    if (fileInfoList[index].pause) {
      onContinue({
        data: this.state.dataList[index],
        hash: targetHash
      })
    } else {
      fileInfoList[index].status = formatStatus(4)
      onCancel({
        hash: targetHash,
        type: 'pause'
      })
    }
    fileInfoList[index].pause = !fileInfoList[index].pause

    this.setState({
      fileInfoList: fileInfoList,
    })
  }

  render() {
    return (
      <div className='container'>
        <div className='header'>
          Ajax大体积文件分片断点续传实例
        </div>
        <div className='content'>
          <div className='upload-box'>
            <label htmlFor="input">
                <svg t="1589031888474" className="add-icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1253"><path d="M956.1240653818753 579.0559211537523h-377.4918801217032v377.55208924331106c0 36.792317387069836-29.839867873102275 66.60264870994936-66.63332128133455 66.60264870994936-36.792317387069836 0-66.63218526017215-29.81033132287954-66.63218526017215-66.60264870994936v-377.55208924331106h-377.49415216402804c-36.822989958455004 0-66.63218526017215-29.81033132287954-66.63218526017215-66.60264870994936 0-36.77868513312089 29.812603365204367-66.60264870994936 66.63218526017215-66.60264870994936h377.4918801217032v-377.55208924331106c0-36.77868513312089 29.839867873102275-66.60264870994936 66.63218526017215-66.60264870994936 36.793453408232246 0 66.63332128133455 29.825099597990917 66.63332128133455 66.60264870994936v377.55322526447344h377.4918801217032c36.822989958455004 0 66.63332128133455 29.822827555666088 66.63332128133455 66.60037666762456-0.0011360211624130007 36.792317387069836-29.81033132287954 66.60037666762456-66.63332128133455 66.60037666762456z" fill="#bfbfbf" p-id="1254"></path></svg>
                <input type='file' id='input' multiple onChange={(e) => this.fileChange(e)}/>
                <span>点击添加文件</span>
            </label>
            <button onClick={() => this.uploadAll()}>上传</button>
          </div>
          <div className='upload-list'>
            <table style={{display: this.state.fileInfoList.length > 0 ? '':'none'}}>
              <thead>
                <tr>
                  <th>文件名</th>
                  <th>文件类型</th>
                  <th>文件大小</th>
                  <th>hash</th>
                  <th>上传进度</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {this.state.fileInfoList.map((it,index) => {
                  return (
                    <tr>
                      <td>{it.name}</td>
                      <td>{it.type || '未知'}</td>
                      <td>{it.size}</td>
                      <td>{it.hash || '计算中'}</td>
                      <td>{it.progress ? `${it.status}${it.progress}%`:(it.status)}</td>
                      <td>
                        <button
                          className="btn"
                          onClick={(e) => this.uploadStatusChange(e,index)}
                          disabled={!it.progress}
                          // style={{display: it.progress ? '':'none'}}
                        >{it.pause ? '继续':'暂停'}</button>
                        <button
                          onClick={(e) => this.cancel(e,index)}
                          className="btn"
                          >
                          {it.status === '上传完成' ? '删除' : '取消'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }
}

export default App;
