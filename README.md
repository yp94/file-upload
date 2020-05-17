## 大体积文件上传 + 断点续传

该项目来源于公司内部产品需求，前端基于React，后端使用Node.js处理文件。可以批量上传任意格式的文件，并实现了上传进度展示，断点续传，暂停，取消，极速秒传的功能

### 功能列表

- [x] 进度显示
- [x] 断点续传
- [x] 极速秒传
- [x] 暂停上传
- [x] 取消上传
- [ ] 上传优先级

### 预览


### 技术概览
#### 前端
* React渲染页面
* Blob#slice 实现文件切片
* spark-md5 + web-worker 生成文件hash
* xhr 发送 formdata

#### 后端
* Node.js搭建http服务器
* multiparty 处理 formData
* fs-extra 操作读写

### 开始
```
npm install
```

启动前端：
```
npm run start
```
启动后端：
```
cd server/
node index.js
```