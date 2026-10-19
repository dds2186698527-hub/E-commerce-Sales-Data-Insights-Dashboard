# 🛒 电商销售数据洞察看板 (E-commerce Sales Insights Dashboard)

> **项目简介**：本项目基于阿里天池电商订单数据集，构建了一套前后端分离的电商销售数据可视化看板。后端使用 Spring Boot 提供 RESTful API 从 MySQL 查询数据，前端使用原生 HTML/CSS/JS 结合 ECharts 渲染图表。
> 
> **核心考核点**：CSV 数据仅作为一次性初始化脚本导入 MySQL，后端业务接口完全通过查询数据库返回数据，前端不直接读取本地静态文件。

---

## 🛠️ 技术栈

| 层级 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **数据库** | MySQL 8.0+ | 存储订单数据 `t_orders` 表 |
| **后端** | **Spring Boot 3.2.0 + JDK 17** | 采用分层架构（Controller/Service/Mapper），集成 MyBatis-Plus |
| **数据预处理** | Python 3 + pandas + pymysql | 仅用于 `csv_import.py` 一次性将 CSV 导入 MySQL |
| **接口文档** | Swagger / springdoc-openapi | 后端启动后自动生成可视化 API 文档 |
| **前端** | **原生 HTML + CSS + JS (ES6+)** | 严格不使用 Vue/React，使用 `fetch` 调用 API，无 axios |
| **图表库** | Apache ECharts | 本地引入 `echarts.min.js`，确保断网环境可演示 |
| **版本管理** | Git + GitHub | 协同开发与进度追踪 |

---

## 📁 项目目录结构

```text
ecommerce-dashboard
├── backend/                    # Spring Boot 后端工程
│   ├── src/main/java/com/ecommerce/
│   │   ├── BackendApplication.java     # 启动类
│   │   ├── config/CorsConfig.java      # CORS 跨域配置
│   │   ├── controller/OrderController.java # 订单接口控制器
│   │   ├── entity/TOrders.java          # 订单实体类
│   │   ├── mapper/TOrdersMapper.java    # MyBatis-Plus Mapper
│   │   └── service/                     # 业务逻辑层
│   ├── src/main/resources/application.yml # 数据库/端口配置 (默认8080)
│   ├── pom.xml                 # Maven 依赖 (SpringBoot 3 + MyBatis-Plus)
│   └── csv_import.py           # Python 一次性数据导入脚本
├── frontend/                   # 原生前端工程
│   ├── index.html              # 主页面 (F1-F8 布局)
│   ├── style.css               # 页面样式与响应式布局
│   └── js/                     # 核心逻辑层
│       ├── echarts.min.js      # 本地 ECharts 引擎
│       ├── api.js              # 数据请求层（封装 fetch，含降级容错）
│       ├── charts.js           # 图表渲染层（封装 ECharts 实例）
│       └── main.js             # 主控逻辑（事件绑定、数据分发、前端聚合计算）
├── sql/
│   └── create_table.sql        # MySQL 建表脚本
└── README.md                   # 项目说明文档
```

---

## 🗄️ 数据库说明

- **数据库名**：`ecommerce_dashboard`
- **数据表**：`t_orders` (电商订单表)
- **核心字段**：
  - `order_no` (订单号), `goods_name` (商品名), `category` (品类)
  - `unit_price` (单价), `quantity` (数量), `total_amount` (总金额)
  - `order_time` (下单时间), `user_id` (用户ID), `user_type` (用户类型), `pay_method` (支付方式)

---

## 🔌 后端接口文档

后端启动后，访问 Swagger 接口文档：**http://127.0.0.1:8080/swagger-ui.html**

| 接口地址 | 请求方式 | 功能说明 | 对应前端功能 |
| :--- | :--- | :--- | :--- |
| `/api/order/total` | GET | 整体订单汇总（总数、总销售额） | **F1** KPI 卡片 |
| `/api/order/category/sales` | GET | 按品类统计销售额 | **F5** 品类柱状图、**F7** 饼图 |
| `/api/order/goods/top10` | GET | 商品销量 TOP10 | **F6** 横向柱状图 |
| `/api/order/list` | GET | 查询全部订单明细数据 | **F8** 数据表格 (前端分页) |

> **技术说明**：后端已通过 `CorsConfig.java` 配置全局跨域，支持前端本地调试。受限于开发周期，后端暂未提供 `/api/orders`（带条件分页查询）及按时间趋势聚合的接口，前端已通过拉取全量数据进行本地聚合与筛选来满足 F2/F3/F4 的需求。

---

## 📝 开发里程碑记录

- **第 2 周**：Git 仓库初始化，数据集准备，SQL 建表脚本完成。
- **第 3 周**：重构后端为 Spring Boot 3 架构，编写数据导入脚本，完成基础统计接口开发。
- **第 4-6 周**：完成前端 F1-F8 静态原型，引入本地 ECharts。将 JS 模块化拆分（api.js, charts.js, main.js）。完成与后端的真实接口对接，实现降级容错策略。
- **第 7 周（当前）**：前后端联调完善，解决 CORS 跨域问题。前端利用本地计算补齐了后端缺失的时间聚合与条件筛选逻辑。