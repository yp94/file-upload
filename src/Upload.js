import React from 'react';
import './Upload.css';
import createFileChunk from './createFileChunk';
import {getSize} from './tools';
import sendData from './request'

const STATUS = {
  0: '切片中...',
  1: '准备上传',
  2: '上传中...',
  3: '暂停中...',
  4: '上传完成',
  5: '上传失败',
  7: '极速秒传'
}

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
        status: STATUS[0]
      }
    })

    const preFileInfoList = this.state.fileInfoList

    preFileInfoList.push(...fileInfo)

    this.setState({
      fileInfoList: preFileInfoList
    })

    //文件切片，计算hash
    const dataList = await createFileChunk(fileList)
    const preDataList = this.state.dataList
    const prefileInfoList = this.state.fileInfoList

    const startIndex = prefileInfoList.length - fileInfo.length

    for (let i = 0; i < fileInfo.length; i++) {
      prefileInfoList[startIndex+i].hash = dataList[i].hash
      prefileInfoList[startIndex+i].status = STATUS[1]
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
      onProgressChange: this.onProgressChange
    })
  }

  //监听变化进度变化
  onProgressChange(fileStatusList) {
    let fileInfoList = this.state.fileInfoList
    // let dataList = this.state.dataList
    for (let i = 0; i < fileInfoList.length; i++) {
      const hash = fileInfoList[i].hash
      if (fileStatusList[hash]) {
        if (Number(fileStatusList[hash].progress)) {
          fileInfoList[i].status = STATUS[fileStatusList[hash].progress]
        } else {
          fileInfoList[i].status = fileStatusList[hash].progress
        }
      }
    }
    this.setState({
      fileInfoList: fileInfoList,
      // dataList: dataList
    })
  }

  cancel(e,index) {
    const {fileInfoList, dataList} = this.state
    fileInfoList.splice(index,1)
    dataList.splice(index,1)
    this.setState({
      fileInfoList: fileInfoList,
      dataList: dataList
    })
  }

  render() {
    return (
      <div className='container'>
        <div className='upload-box'>
          <label htmlFor="input">
            <div className=''>
              <svg t="1589031888474" className="add-icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1253"><path d="M956.1240653818753 579.0559211537523h-377.4918801217032v377.55208924331106c0 36.792317387069836-29.839867873102275 66.60264870994936-66.63332128133455 66.60264870994936-36.792317387069836 0-66.63218526017215-29.81033132287954-66.63218526017215-66.60264870994936v-377.55208924331106h-377.49415216402804c-36.822989958455004 0-66.63218526017215-29.81033132287954-66.63218526017215-66.60264870994936 0-36.77868513312089 29.812603365204367-66.60264870994936 66.63218526017215-66.60264870994936h377.4918801217032v-377.55208924331106c0-36.77868513312089 29.839867873102275-66.60264870994936 66.63218526017215-66.60264870994936 36.793453408232246 0 66.63332128133455 29.825099597990917 66.63332128133455 66.60264870994936v377.55322526447344h377.4918801217032c36.822989958455004 0 66.63332128133455 29.822827555666088 66.63332128133455 66.60037666762456-0.0011360211624130007 36.792317387069836-29.81033132287954 66.60037666762456-66.63332128133455 66.60037666762456z" fill="#bfbfbf" p-id="1254"></path></svg>
              <input type='file' id='input' multiple onChange={(e) => this.fileChange(e)}/>
              <span>{this.state.fileInfoList.length > 0 ? '点击添加':'点击上传'}</span>
            </div>
          </label>
        </div>
        <div className='upload-list'>
          <button onClick={() => this.uploadAll()}>上传全部</button>
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
                    <td>{it.type}</td>
                    <td>{it.size}</td>
                    <td>{it.hash || '计算中'}</td>
                    <td>{it.status}</td>
                    <td>
                      <button onClick={(e) => this.uploadFile(e,index)}>暂停</button>
                      <button onClick={(e) => this.cancel(e,index)}>取消</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    )
  }
}

export default App;
