# 电商销售数据洞察看板

> 项目：阿里天池电商数据集可视化看板
>
> 技术考核要点：CSV 静态文件不能直接读取展示，必须导入 MySQL 数据库，后端查询数据库返回数据给前端

---

## 项目介绍

本项目基于阿里天池电商订单数据集，搭建一套**数据可视化看板**。后端提供统计查询接口，前端使用图表展示订单销量、品类销售、热门商品等数据分析结果。

---

## 技术栈

| 层级 | 技术 | 说明 |
| ---- | ---- | ---- |
| 数据库 | MySQL 8.0+ | 存储订单数据 |
| 后端 | SpringBoot 3.2.0 + JDK 17 | RESTful 统计接口，集成 MyBatis-Plus |
| 数据预处理 | Python 3 + pandas + pymysql | 仅一次性导入 CSV 到 MySQL，不提供 Web 服务 |
| 接口文档 | Swagger / springdoc-openapi | 可视化调试后端接口 |
| 前端 | 原生 HTML + CSS + JS (ES6+) + ECharts | 数据可视化看板，使用 fetch 调用 API |
| 版本管理 | Git + GitHub | 代码托管与协作 |

---

## 项目目录结构

```text
ecommerce-dashboard
├── backend                     # SpringBoot 后端工程
│   ├── src/main/java/com/ecommerce
│   │   ├── BackendApplication.java     # 启动类
│   │   ├── config/CorsConfig.java      # CORS 跨域配置
│   │   ├── controller/OrderController.java # 订单接口控制器
│   │   ├── entity/TOrders.java          # 订单实体
│   │   ├── mapper/TOrdersMapper.java    # MyBatis-Plus Mapper
│   │   └── service/TOrdersService.java  # 订单服务
│   ├── pom.xml                 # Maven 依赖
│   └── csv_import.py           # Python 一次性数据导入脚本
├── sql
│   └── create_table.sql        # MySQL 建表脚本，t_orders 订单表
├── frontend                    # 前端工程
│   ├── index.html              # 主页面
│   ├── css/style.css           # 页面样式
│   └── js/                     # 核心逻辑
│       ├── echarts.min.js      # 本地 ECharts 引擎
│       ├── api.js              # 数据请求层（含降级兜底）
│       ├── charts.js           # 图表渲染层
│       └── main.js             # 主控逻辑
└── README.md                   # 项目说明文档

数据库说明
数据库名：ecommerce_dashboard

数据表：t_orders 电商订单表

字段	类型	说明
id	bigint	主键，自增
order_no	varchar(64)	订单号
goods_name	varchar(128)	商品名称
category	varchar(32)	商品品类
unit_price	decimal(10,2)	单价
quantity	int	购买数量
total_amount	decimal(10,2)	总金额
order_time	datetime	下单时间
user_id	varchar(32)	用户 ID
user_type	varchar(16)	用户类型
pay_method	varchar(32)	支付方式
后端接口文档
后端启动后访问接口文档：http://127.0.0.1:8080/swagger-ui.html

接口	请求方式	功能说明	前端对应功能
/api/order/total	GET	整体订单汇总（订单总数、销售总额）	F1 KPI卡片
/api/order/category/sales	GET	按品类统计销售额	F5 柱状图
/api/order/goods/top10	GET	商品销量 TOP10	F6 横向柱状图
/api/order/list	GET	查询全部订单数据	F8 数据表格
后端已配置跨域 CORS（CorsConfig.java），支持前端页面跨域调用接口。
注：KPI接口缺平均客单价、热销商品数，品类筛选、时间筛选、分页、用户行为饼图等接口有待后续完善。

前端页面（第4-6周）
前端看板已完成真实接口对接，并采用模块化开发：

F1 整体订单汇总指标卡：总销售额、总订单数（真实数据），平均客单价前端计算，热销商品数暂用降级策略。

F2/F3 筛选联动：前端已完成静态布局，待后端完善筛选参数接口。

F4 销售趋势折线图：前端完成 ECharts 渲染，数据暂用 Mock 降级。

F5 品类销售柱状图：已接入真实后端数据。

F6 商品销量TOP10：已接入真实后端数据。

F7 用户行为饼图：待后端补充用户类型统计接口。

F8 数据明细表格：已接入真实全量列表数据（展示前10条）。

前端已封装 fetch 请求逻辑，并采用了降级容错机制（当后端接口未就绪或网络异常时，自动使用本地 Mock 数据渲染，确保页面可演示）。

开发进度
第 2 周 ✅
创建 Git 仓库，编写 .gitignore

编写建表 SQL 脚本 create_table.sql

准备阿里天池数据集，设计数据表结构

第 3 周 ✅
删除旧 Python FastAPI 后端，重构为 SpringBoot 后端项目

完善 t_orders 订单表结构，新增 user_type、pay_method 字段

编写 csv_import.py 脚本，实现天池 CSV 批量导入 MySQL

开发订单统计接口（汇总、品类销售、商品 TOP10），配置跨域

第 4-6 周 ✅ (前端)
完成前端 F1-F8 静态原型开发

实现 ECharts 图表渲染逻辑

完成 JS 模块化拆分（api.js, charts.js, main.js）

已对接真实后端接口（F1、F5、F6、F8），采用降级容错策略

待办：前后端联调完善，完善筛选条件和分页接口