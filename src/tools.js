const STATUS = {
  0: '切片中...',
  1: '准备就绪',
  2: '等待上传...',
  3: '上传中...',
  4: '暂停中...',
  5: '上传完成',
  6: '上传失败',
  7: '极速秒传'
}

function getSize(size) {
  return size > 1024
  ? size / 1024  > 1024
  ? size / (1024 * 1024) > 1024
  ? (size / (1024 * 1024 * 1024)).toFixed(2) + 'GB'
  : (size / (1024 * 1024)).toFixed(2) + 'MB'
  : (size / 1024).toFixed(2) + 'KB'
  : (size).toFixed(2) + 'B';
}

function formatStatus(statusCode) {
  return STATUS[statusCode]
}

export {getSize, formatStatus}