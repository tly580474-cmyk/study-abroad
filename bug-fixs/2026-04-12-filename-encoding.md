# Bug 修复：文件名中文乱码

## 问题描述
学生上传的文件名称在预览时显示乱码，例如 "2026ä¸Šå�Šå­¦æœŸæœ«é¡¹ç›®æ±‡æ€».docx"

## 根因分析
- multer 在接收 FormData 上传的中文文件名时，默认使用 latin1 编码
- 导致文件名在数据库中存储为乱码
- 下载时也没有正确设置 Content-Disposition 编码

## 修复方案

### 1. 添加文件名解码函数
文件：`backend/src/controllers/documentController.ts`
```typescript
const decodeFileName = (fileName: string): string => {
  try {
    return decodeURIComponent(escape(fileName));
  } catch {
    try {
      const buffer = Buffer.from(fileName, 'latin1');
      return buffer.toString('utf8');
    } catch {
      return fileName;
    }
  }
};
```

### 2. 上传时解码文件名
```typescript
name: name || decodeFileName(req.file.originalname),
```

### 3. 下载时正确设置编码
```typescript
const encodedFileName = encodeURIComponent(document.name);
res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}; filename="${encodedFileName}"`);
```

## 验证
- 重新上传包含中文的文件
- 文件名显示正常
- 下载时文件名正确
