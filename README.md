# JMX-Solo: 分布式 JMeter 压测管理平台

## 项目背景 (Project Background)
在日常的性能测试和压测工作中，运维和测试工程师往往需要将 JMX 压测脚本和关联的 CSV 数据文件手动上传至多台压测机，然后分别登录每台机器去通过命令行触发压测任务。当压测机节点较多或脚本频繁修改时，这种传统模式会导致极大的维护成本，并容易出现脚本/配置不一致的情况。

**JMX-Solo** 诞生于这一痛点。它提供了一个现代化的 Web 界面，让你可以：
1. **云端管理脚本**：基于 Cloudflare R2（S3 协议）统一管理 JMX 脚本与 CSV 数据文件。
2. **在线编辑配置**：在 Web 页面直接修改 JMX 文件的线程组参数、环境变量、CSV 数据路径等，并一键同步到云端。
3. **集群一键下发**：选中多台压测机节点，一键将最新的压测脚本和数据文件分发至集群。

## 功能特性 (Features)
- 🖥️ **现代科技感 UI**：基于 React + Tailwind CSS 打造的极客风交互界面，体验极致流畅。
- ☁️ **云端存储集成**：与 Cloudflare R2 (兼容 S3) 深度集成，实现脚本的云端集中存储与多目录管理。
- 📝 **JMX 在线解析与编辑**：后端通过 DOM4J 解析 `.jmx` (XML) 文件，前端可直接配置**线程数**、**吞吐量**、**环境变量**以及 **CSV 数据集路径**，免去本地修改后再上传的烦恼。
- 🚀 **分布式节点管理**：
  - 在线/离线状态监测，支持一键探测压测机连通性。
  - 支持一键下发指定的 JMX 和 CSV 数据文件到选中节点的指定目录中。
  - 自动扫描目标服务器的执行脚本（如 `.sh`），并提供快捷可复制的集群执行命令。
- 📦 **异步与无状态架构**：Java 配合 Spring Boot 异步线程下发任务，前后端分离设计。

---

## 敏感变量配置与替换指南 (Configuration & Variables)
为了保护你的隐私和安全，本项目代码中已经去除了所有敏感的数据库密码、云存储密钥和服务器账号信息。在克隆并启动本项目之前，你必须配置以下环境变量或修改对应配置文件：

### 1. 后端变量替换 (Backend)
请修改 `jmx-backend/src/main/resources/application.yml` 文件，或在服务器环境中设置以下环境变量：

- **数据库配置 (MySQL)**:
  - `SPRING_DATASOURCE_URL`: 你的 MySQL 连接地址 (默认: `jdbc:mysql://127.0.0.1:3306/jmeter_db?useUnicode=true&...`)
  - `SPRING_DATASOURCE_USERNAME`: 数据库用户名 (默认: `root`)
  - `SPRING_DATASOURCE_PASSWORD`: 数据库密码 (默认: `123456`)

- **Cloudflare R2 (S3) 配置**:
  - `CLOUDFLARE_R2_ENDPOINT`: 你的 R2 Endpoint URL (如: `https://<account-id>.r2.cloudflarestorage.com`)
  - `CLOUDFLARE_R2_ACCESS_KEY`: R2 Access Key
  - `CLOUDFLARE_R2_SECRET_KEY`: R2 Secret Key
  - `CLOUDFLARE_R2_BUCKET`: R2 Bucket 名称

- **默认压测机节点配置**:
  - 在 `jmx-backend/src/main/java/com/jmx/manager/service/JmeterNodeService.java` 文件的 `initDefaultNodes()` 方法中，项目会在数据库为空时自动初始化一些压测机节点。
  - 你需要将方法中的 `"192.168.1.101"`, `username`, `password` 替换为你实际的压测机 SSH 连接信息。或者直接清空数据库表，通过其他方式录入。

### 2. 前端变量替换 (Frontend)
请在 `jmx-frontend/` 目录下创建一个 `.env` 文件（可参考 `.env.example`）：
```env
VITE_API_URL=http://你的后端服务器IP:8081/api
```
如果前后端都在本地运行，默认的 `http://localhost:8081/api` 即可正常工作。

---

## 部署说明 (Deployment Instructions)

### 环境要求
- **Backend**: Java 17+, Maven 3.8+, MySQL 8.0+
- **Frontend**: Node.js 18+, npm / yarn

### 后端部署 (Backend Deployment)
1. 进入后端目录：`cd jmx-backend`
2. 编译打包：`./mvnw clean package -DskipTests`
3. 运行服务：
   ```bash
   java -jar target/manager-0.0.1-SNAPSHOT.jar
   ```
   *(服务将默认启动在 8081 端口)*

### 前端部署 (Frontend Deployment)
1. 进入前端目录：`cd jmx-frontend`
2. 安装依赖：`npm install`
3. 本地开发运行：
   ```bash
   npm run dev
   ```
   *(前端开发服务器将启动在 5173 端口)*
4. 生产环境构建：
   ```bash
   npm run build
   ```
   *(构建产物会生成在 `dist/` 目录，你可以使用 Nginx 或其他静态资源服务器代理该目录，并将 `/api` 路由转发至后端 8081 端口)*
