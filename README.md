# 🛒 电商销售数据洞察看板 
> **项目简介**：基于电商订单数据集的前后端分离可视化看板。后端使用 Spring Boot 提供 RESTful API 从 MySQL 查询数据，前端使用原生 HTML/CSS/JS 结合 ECharts 渲染图表，并附带商家建议（销量/销售额预测）模块。
>

---

## 🛠️ 技术栈

| 层级 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **数据库** | MySQL 8.0+ | 存储订单数据 `t_orders` 表 |
| **后端** | **Spring Boot 3.2.0 + JDK 17 / 21** | 分层架构（Controller / Service / Mapper），集成 MyBatis-Plus |
| **构建工具** | Maven 3.8+ | 也可直接用 IntelliJ IDEA 自带的 Maven |
| **数据预处理** | Python 3 + pandas + pymysql | 仅用于一次性把 CSV 导入 MySQL，不提供 Web 服务 |
| **接口文档** | Swagger / springdoc-openapi | 后端启动后自动生成可视化 API 文档 |
| **前端** | **原生 HTML + CSS + JS (ES6+)** | 不使用 Vue/React，`fetch` 调用 API，无 axios |
| **图表库** | Apache ECharts 5.5 | 本地引入 `echarts.min.js`，断网也能演示 |
| **版本管理** | Git + GitHub | 协同开发与进度追踪 |

> ⚠️ **JDK 版本注意**：项目依赖的 Lombok 1.18.30 不支持 JDK 25/26，编译会报，
> 请使用 **JDK 17 **
---

## 📁 项目目录结构

```text
ecommerce-dashboard
├── backend/                              # Spring Boot 后端工程
│   ├── src/main/java/com/ecommerce/
│   │   ├── BackendApplication.java       # 启动类
│   │   ├── config/CorsConfig.java        # 全局 CORS 跨域配置
│   │   ├── controller/
│   │   │   ├── OrderController.java      # 订单接口（A1-A5 + 全量列表）
│   │   │   └── ForecastController.java   # 商家建议预测接口（F9）
│   │   ├── dto/ForecastResponse.java     # 预测接口返回结构
│   │   ├── entity/TOrders.java           # 订单实体
│   │   ├── mapper/TOrdersMapper.java     # MyBatis-Plus Mapper
│   │   ├── service/
│   │   │   ├── TOrdersService.java       # 订单服务接口
│   │   │   ├── impl/TOrdersServiceImpl.java
│   │   │   └── ForecastService.java      # 预测算法（F9）
│   │   └── ...
│   ├── src/main/resources/application.yml # 端口 8080、数据库连接
│   ├── pom.xml                           # Maven 依赖
│   └── csv_import.py                     # Python 一次性数据导入脚本
├── frontend/                             # 原生前端工程
│   ├── index.html                        # 页面结构：F1–F9 各区块的 DOM
│   ├── style.css                         # 全部样式（卡片/图表/建议模块/响应式）
│   └── js/
│       ├── echarts.min.js                # 本地 ECharts 引擎（第三方库）
│       ├── api.js                        # 数据请求层：拼接口、超时、字段归一化
│       ├── charts.js                     # 图表层：ECharts 实例与空状态
│       └── main.js                       # 主控层：状态、接口编排、交互、渲染
├── sql/
│   └── create_table.sql                  # 建库建表脚本
├── data/
│   ├── 1688.csv / 京东.csv / 天猫.csv / 拼多多.csv / 淘宝.csv / 苏宁易购.csv   # 各平台生成数据
│   ├── Amazon Sale Report.csv / 白鲸电商销售数据.csv / 大话电商销售数据.xlsx   # 其它来源数据
│   ├── generate_orders.py              # 自动扫描并合并清洗 data/ 全部订单数据 → finall.csv
│   └── finall.csv                      # 合并清洗后的总数据（131,985 行；被 .gitignore 忽略，不入库）
└── README.md
```

---

## 🗄️ 数据库说明

- **数据库名**：`ecommerce_dashboard`
- **数据表**：`t_orders`（电商订单表）
- **字段**：`order_no`（订单号）、`goods_name`（商品名）、`category`（品类）、`unit_price`（单价）、`quantity`（数量）、`total_amount`（金额）、`order_time`（下单时间）、`user_id`（用户ID）、`user_type`（用户类型：new 新用户 / old 老用户）、`pay_method`（支付方式）
- **数据来源（开放数据集）**：来自和鲸社区与阿里天池的公开电商数据集，经合并、去重与清洗得到 `finall.csv`（131,985 行）。
  - 和鲸社区：<https://www.heywhale.com/mw/dataset/6a452fa5c9a3ffe866c7c71a/file>
  - 和鲸社区：<https://www.heywhale.com/mw/dataset/65bb52cc21223d1726da9a0a/file>
  - 和鲸社区：<https://www.heywhale.com/mw/dataset/656ee56d625cc861b7dbd4fc/file>
  - 阿里天池：<https://tianchi.aliyun.com/dataset/216886>
  - 各源字段口径与清洗规则详见项目文档「数据说明」。
- **数据量**：合并清洗后 `finall.csv` 约 **131,985 行**，导入后 `SELECT COUNT(*) FROM t_orders;` 应为 131,985。

初始化（脚本里已包含 `CREATE DATABASE` 和 `USE`）：

```bash
mysql -u root -p < sql/create_table.sql
```

### 📥 生成并导入数据（一次性，换机器必须执行）

`finall.csv` 由 `data/generate_orders.py` **自动扫描 `data/` 目录下全部订单文件**合并清洗生成（自动识别 CSV / Excel，文件级+行级去重，过滤空值/负金额/异常单价，品类归一，无需手动合并）：

```bash
# 1) 生成合并数据（输出 data/finall.csv，约 131,985 行）
cd data
python generate_orders.py

# 2) 导入 MySQL（表结构见 sql/create_table.sql）
cd ../backend
python csv_import.py
```

> 若本机 MySQL 密码不是 `123456`，需同步修改 `backend/csv_import.py` 里的数据库连接配置。

---

## 🚀 启动步骤

### 0. 环境要求

| 软件 | 版本 | 检查命令 |
| :--- | :--- | :--- |
| JDK | **17** | `java -version` |
| Maven | 3.8+ | `mvn -v`（没有的话用 IDEA 自带的） |
| MySQL | 8.0+ | 服务已启动，能登录 |
| 浏览器 | Chrome / Edge 等现代浏览器 | — |

### 1. 克隆代码

```bash
git clone https://github.com/dds2186698527-hub/E-commerce-Sales-Data-Insights-Dashboard.git
cd E-commerce-Sales-Data-Insights-Dashboard
```

### 2. 建库建表

```bash
mysql -u root -p < sql/create_table.sql
```

> 建表后还需导入数据，见上文「📥 生成并导入数据」（先跑 `generate_orders.py` 生成 `finall.csv`，再跑 `csv_import.py` 入库）。

### 3. 配置数据库连接

编辑 `backend/src/main/resources/application.yml`，把密码改成**你自己电脑上 MySQL 的密码**：

```yaml
server:
  port: 8080
spring:
  datasource:
    url: jdbc:mysql://127.0.0.1:3306/ecommerce_dashboard?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
    username: root
    password: 你的密码
```

### 4. 编译后端

```bash
cd backend
mvn clean package -DskipTests
```

产物：`target/backend-0.0.1-SNAPSHOT.jar`。


### 5. 启动后端

```bash
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

或在 IDEA 里配置 **Project SDK = JDK 17/21** 后直接运行 `BackendApplication`。

看到 `Tomcat started on port(s): 8080` 即成功。


### 6. 打开前端

前端是纯静态页面，**不需要构建、不需要起服务**：

- 直接双击 `frontend/index.html`（后端已配置 `Access-Control-Allow-Origin: *`，`file://` 也能跨域请求）；
- 或者起个静态服务器：`cd frontend && python -m http.server 5173`，再访问 <http://127.0.0.1:5173>。

页面加载后会自动请求 8080，KPI、图表、表格、商家建议都会有数据。


### 7. 停止

- 命令行：`Ctrl + C`
- Windows 上按端口杀进程：`netstat -ano | findstr :8080` → `taskkill /PID <pid> /F`

---

## 🔌 接口文档

后端启动后访问 Swagger：**http://127.0.0.1:8080/swagger-ui.html**

| 接口 | 请求方式 | 功能 | 对应前端 |
| :--- | :--- | :--- | :--- |
| `/api/categories` | GET | A1 品类列表 | F2 品类筛选下拉框 |
| `/api/orders?category=&startDate=&endDate=&keyword=&page=&size=` | GET | A2 条件查询+分页（明细表格翻页走后端） | F8 订单表格 |
| `/api/orders/list` | GET | 全部订单明细（带筛选，全量） | 备用 |
| `/api/orders/kpi` | GET | A3 KPI汇总（销售额/订单数/客单价/总销量/热销商品数，共 5 项） | F1 KPI卡片 |
| `/api/orders/ranking?metric=qty\|revenue` | GET | A4 商品TOP10 | F6 横向柱状图 |
| `/api/orders/category-sales` | GET | 按品类销售额 | F5 品类柱状图 |
| `/api/orders/stats?granularity=day\|week\|month` | GET | A5 按时间聚合销售额与订单量 | F4 趋势图 |
| `/api/orders/user-type` | GET | 新老用户订单占比 | F7 饼图 |
| `/api/forecast?horizon=7\|30\|90&metric=revenue\|qty` | GET | 未来区间销量/销售额预测 + 备货建议 | F9 商家建议 |

> 统一返回结构 `Result&lt;T&gt;`：`{ code, message, data }`，`code=200` 表示成功。除 `/api/forecast` 外，各聚合接口均支持 `category` / `startDate` / `endDate` 筛选参数，前端筛选后**重新向后端查询**，非本地假过滤。

---

## ⚠️ 常见问题排查

| 现象 | 原因 / 解决 |
| :--- | :--- |
| 页面顶部黄色提示「无法连接后端」 | 8080 没起来，或被防火墙拦截；先 `curl http://127.0.0.1:8080/api/orders/kpi` 验证 |
| 启动报 `Port 8080 was already in use` | 端口被占：换 `server.port`，或杀掉旧 java 进程 |
| 启动报 `Access denied for user 'root'@'localhost'` | `application.yml` 里的密码和你本机 MySQL 不一致 |
| 启动报 `Unknown database 'ecommerce_dashboard'` | 没执行 `sql/create_table.sql` |
| 页面「暂无订单数据（数据库 t_orders 没有记录）」 | 只建了表没导数据，见「📥 生成并导入数据」 |
| 编译报 Lombok / `JCTree` 相关错误 | JDK 版本过高（25/26），换成 JDK 17 或 21 |
| 编译卡在下载依赖 | 配置 Maven 阿里云镜像，或换网络 |
| `mvn` 命令不存在 | 用 IDEA 自带 Maven，或安装 Maven 并配置 `MAVEN_HOME` |
| 前端图表空白、KPI 显示「—」 | 检查 `frontend/js/echarts.min.js` 是否为完整文件（约 1 MB，不能是 0 字节） |
| 换后端端口 / 换机器后前端连不上 | 改 `frontend/js/api.js` 里的 `API_BASE_URL` |

---

## 🗓️ 开发里程碑记录

- **第 2 周**：Git 仓库初始化，数据集准备，SQL 建表脚本完成。
- **第 3 周**：重构后端为 Spring Boot 3 架构，编写数据导入脚本，完成基础统计接口开发。
- **第 4-6 周**：完成前端 F1-F8 静态原型，引入本地 ECharts，JS 模块化拆分（api.js / charts.js / main.js），完成真实接口对接与降级容错。
- **第 7 周**：前后端联调，解决 CORS；新增 F9 商家建议模块（销量/销售额预测 + 备货建议）；补齐 A1-A5 规范接口（品类列表、条件分页查询、KPI汇总、TOP10、时间聚合）；F3 加快捷日期筛选，F7 饼图改为新老用户行为占比。
