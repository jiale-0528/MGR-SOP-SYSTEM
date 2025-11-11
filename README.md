# MGR Project System

保险业绩管理系统 - 支持 iPhone、Android 手机和 iPad 的响应式网页应用

## 功能特点

### 1. 用户认证系统
- 注册：Agent Name、Agent Code、密码
- 登录：使用 Agent Code 和密码
- 密码重置：忘记密码可直接更换，无需重新注册
- 数据持久化：所有数据按 Agent Code 保存

### 2. 首页
- 集成 MGR Logo
- 背景图片展示
- 科技年轻风格设计
- 快速导航到各个功能模块

### 3. 业绩目标评估
- 支持三种预设目标类型：
  - Supremacy (Great Eastern)
  - MDRT
  - GSPC
- 自定义目标标题
- 目标数额和目前业绩记录
- 目标到期日期设置
- 自动计算目标距离
- 目标进度可视化
- 日历集成显示目标到期日期
- 目标颜色自定义

### 4. 客户名单管理

#### 4.1 原有客户
- 完整的客户信息记录：
  - Life Assured 和 Proposer 姓名（支持区分）
  - 身份证号码
  - 年龄、联络方式
  - 保单类型、保单号码
  - 缴付方式（Credit Card/Cash）
  - 保费金额
  - 生效日期（自动计算生效时长）
- 保障内容详细记录：
  - 人寿
  - 疾病
  - 意外
  - 医疗
  - 住院利益
  - Waive
- 受益人状态（Yes/No）
- 如果 Life Assured 与 Proposer 不同，可记录关系
- 重复身份证号码自动关联显示所有保单
- 横向卡片布局，方便查看保障金额

#### 4.2 Family Tree
- 从现有客户列表选择家庭成员
- 或手动添加新家庭成员信息
- 标记现有客户（绿色）和潜在客户（红色）
- 记录关系、性别、年龄、工作、手机号码
- 潜在客户自动添加到注意事项提醒

#### 4.3 KIV 名单
- 记录未能立即成交的客户
- 包含名字、保单类型、保费金额
- 最后一次和下一次见面时间
- 不能成交的原因
- 自动添加到日历
- 接近见面时间时在注意事项提醒

#### 4.4 Monthly Cake Counting
- 当月计划和跟进客户
- 记录名字、保单类型、保费金额
- 预约时间和 Outcome
- 自动添加到日历

### 5. 注意事项
自动汇总和提醒：
- 遗漏的受益人
- 未完成的目标
- 可开发的市场（Family Tree 中的潜在客户）
- KIV 顾客见面时间到期（7天内）

### 6. 日历功能
- 集成在目标评估页面右侧
- 显示所有目标到期日期
- 显示 KIV 下次见面时间
- 显示 Monthly Cake 预约时间
- 不同颜色标记不同类型事件

## 图片文件要求

请将以下图片文件放置在 `images` 文件夹中：

1. **mgr-logo.png** - MGR Project System Logo（图1）
2. **background.jpg** - 首页背景图（图2）
3. **great-eastern.png** - Great Eastern Logo（图3，用于 Supremacy 目标）
4. **mdrt.png** - MDRT Logo（图4）
5. **gspc.png** - GSPC Logo（图5，Great Supreme Producers Club）

## 使用方法

1. 将所有图片文件放入 `images` 文件夹
2. 在浏览器中打开 `index.html`
3. 首次使用需要注册账号
4. 使用 Agent Code 和密码登录
5. 开始管理您的业绩和客户

## 技术特点

- **响应式设计**：完美适配手机、平板和桌面设备
- **本地存储**：使用 localStorage 保存数据，无需服务器
- **数据隔离**：每个 Agent 的数据独立存储
- **实时更新**：所有数据实时同步和更新
- **现代化 UI**：科技年轻风格，使用 MGR Logo 配色方案

## 浏览器支持

- Chrome/Edge（推荐）
- Firefox
- Safari
- 移动浏览器（iOS Safari、Chrome Mobile）

## 云端同步功能

系统支持 Firebase 云端同步，可在不同设备间同步数据。

### 设置 Firebase 云端同步

1. **创建 Firebase 项目**
   - 访问 [Firebase Console](https://console.firebase.google.com/)
   - 创建新项目或使用现有项目

2. **启用 Realtime Database**
   - 在 Firebase 控制台中，进入 "Realtime Database"
   - 点击 "创建数据库"
   - 选择区域（建议选择离您最近的区域）
   - 选择 "测试模式"（开发阶段）或配置安全规则

3. **获取配置信息**
   - 在项目设置中，点击 "添加应用" > Web
   - 复制配置信息（apiKey、authDomain、databaseURL 等）

4. **配置应用**
   - 打开 `index.html` 文件
   - 找到 `firebaseConfig` 对象（约第 1336 行）
   - 将 Firebase 配置信息替换到相应字段：
     ```javascript
     const firebaseConfig = {
         apiKey: "您的_API_KEY",
         authDomain: "您的项目ID.firebaseapp.com",
         databaseURL: "https://您的项目ID-default-rtdb.firebaseio.com",
         projectId: "您的项目ID",
         storageBucket: "您的项目ID.appspot.com",
         messagingSenderId: "您的_MESSAGING_SENDER_ID",
         appId: "您的_APP_ID"
     };
     ```

5. **设置数据库安全规则**（可选，但建议）
   - 在 Firebase 控制台 > Realtime Database > Rules
   - 可以设置更严格的规则，或暂时使用测试模式：
     ```json
     {
       "rules": {
         "agents": {
           "$agentCode": {
             ".read": true,
             ".write": true
           }
         }
       }
     }
     ```

### 使用云端同步

- **自动同步**：在"小工具" > "数据同步"中启用自动同步后，数据变更会自动上传到云端
- **手动同步**：点击"立即同步"按钮手动上传数据
- **下载数据**：在新设备上登录后，点击"从云端下载"获取云端数据
- **降级支持**：如果未配置 Firebase 或网络失败，系统会自动降级到本地 IndexedDB 存储

## 注意事项

- **本地存储**：数据同时保存在浏览器本地和云端（如果已配置 Firebase）
- **数据备份**：建议定期使用"数据备份"功能导出数据
- **云端同步**：配置 Firebase 后，不同设备间可以同步数据
- **未配置 Firebase**：如果未配置 Firebase，系统仍可正常使用，但数据只保存在本地

## 颜色方案

基于 MGR Logo 配色：
- 主蓝色：#4A90E2
- 主橙色：#FF6B35
- 深灰色：#2C3E50
- 浅灰色：#ECF0F1

