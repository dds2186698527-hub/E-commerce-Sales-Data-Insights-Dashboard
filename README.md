# 电商销售数据洞察看板

> 项目：阿里天池电商数据集可视化看板
>
> 开发周期：4周，前后端分离项目
>
> 技术考核要点：CSV 静态文件不能直接读取展示，必须导入 MySQL 数据库，后端查询数据库返回数据给前端

---

## 目录

- [项目介绍](#项目介绍)
- [技术栈](#技术栈)
- [项目目录结构](#项目目录结构)
- [数据库说明](#数据库说明)
- [后端接口文档](#后端接口文档)
- [前端页面（第四周）](#前端页面第四周)
- [开发进度](#开发进度)
- [项目启动步骤](#项目启动步骤)
- [环境依赖](#环境依赖)
- [常见问题排查](#常见问题排查)

---

## 项目介绍

本项目基于阿里天池电商订单数据集，搭建一套**数据可视化看板**。后端提供统计查询接口，前端使用图表展示订单销量、品类销售、热门商品等数据分析结果。

项目整体分为三个阶段：

1. **数据准备**：获取天池电商数据集，设计数据表，通过 Python 脚本导入 MySQL。
2. **后端开发**：使用 SpringBoot 搭建 RESTful 接口，从数据库聚合统计数据。
3. **前端展示**：使用 ECharts 绘制各类图表，调用后端接口完成看板可视化。

---

## 技术栈

| 层级 | 技术 | 说明 |
| ---- | ---- | ---- |
| 数据库 | MySQL 8.0+ | 存储订单数据 |
| 后端 | SpringBoot 3.2.0 | RESTful 统计接口，集成 MyBatis-Plus |
| 数据预处理 | Python 3 + pandas + pymysql | 仅一次性导入 CSV 到 MySQL，不提供 Web 服务 |
| 接口文档 | Swagger / springdoc-openapi | 可视化调试后端接口 |
| 前端 | HTML + JavaScript + ECharts | 数据可视化看板（第四周开发） |
| 版本管理 | Git + GitHub | 代码托管与协作 |

---

## 项目目录结构

```
ecommerce-dashboard
├── backend                     # SpringBoot 后端工程
│   ├── src                     # Java 源码
│   │   └── main
│   │       └── java/com/ecommerce
│   │           ├── BackendApplication.java     # 启动类
│   │           ├── config/MybatisPlusConfig.java  # MyBatis-Plus 配置
│   │           ├── controller/OrderController.java # 订单接口控制器
│   │           ├── entity/TOrders.java          # 订单实体
│   │           └── service/TOrdersService.java  # 订单服务
│   ├── pom.xml                 # Maven 依赖
│   └── csv_import.py           # Python 一次性数据导入脚本
├── sql
│   └── create_table.sql        # MySQL 建表脚本，t_orders 订单表
├── data                        # 存放原始天池 csv 数据集（.gitignore 忽略，不上传）
├── README.md                   # 项目说明文档
└── .gitignore                  # git 忽略配置
```

---

## 数据库说明

**数据库名**：`ecommerce_dashboard`

**数据表**：`t_orders` 电商订单表

**表结构**：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| id | bigint | 主键，自增 |
| order_no | varchar(64) | 订单号 |
| goods_name | varchar(128) | 商品名称 |
| category | varchar(32) | 商品品类（手机/电脑/服饰/食品等） |
| unit_price | decimal(10,2) | 单价 |
| quantity | int | 购买数量 |
| total_amount | decimal(10,2) | 订单商品总金额 |
| order_time | datetime | 下单时间 |
| user_id | varchar(32) | 用户 ID |
| user_type | varchar(16) | 用户类型/性别 |
| pay_method | varchar(32) | 支付方式 |

### 初始化数据库步骤

1. 在 DataGrip 中执行 `sql/create_table.sql`，创建数据库与订单表。

2. 执行 SQL 追加字段：

```sql
ALTER TABLE t_orders ADD COLUMN user_type VARCHAR(16) COMMENT '用户类型';
ALTER TABLE t_orders ADD COLUMN pay_method VARCHAR(32) COMMENT '支付方式';
```

3. 运行 `backend/csv_import.py`，读取阿里天池 CSV，批量导入数据至 `t_orders` 表。

> ⚠️ 注意：`csv_import.py` 仅作为**一次性初始化脚本**，业务后端不会直接读取 CSV 文件，符合考核要求。

---

## 后端接口文档

后端启动后访问接口文档：http://127.0.0.1:8080/swagger-ui.html

| 接口 | 请求方式 | 功能说明 |
| ---- | ---- | ---- |
| /api/order/list | GET | 分页查询订单数据 |
| /api/order/category/sales | GET | 按品类统计销售额 |
| /api/order/goods/top10 | GET | 商品销量 TOP10 |
| /api/order/total | GET | 整体订单汇总统计 |

> 后端已配置跨域 CORS，支持前端页面跨域调用接口。

---

## 前端页面（第四周）

待开发，计划实现以下图表：

- 整体订单汇总指标卡（订单总数、销售总额等）
- 各品类销售额环形图 / 饼图
- 商品销量 TOP10 横向条形图
- 订单量随时间变化折线图

---

## 开发进度

### 第 2 周

1. 创建 Git 仓库，编写 `.gitignore`
2. 编写建表 SQL 脚本 `create_table.sql`
3. 准备阿里天池数据集，设计数据表结构
4. 提交基础 SQL 脚本、项目文档

### 第 3 周 ✅ 已完成

1. 删除旧 Python FastAPI 后端，重构为 SpringBoot 后端项目
2. 完善 `t_orders` 订单表结构，新增 `user_type`、`pay_method` 字段
3. 编写 `csv_import.py` 脚本，实现天池 CSV 批量导入 MySQL
4. 开发订单统计接口（汇总、品类销售、商品 TOP10），配置跨域
5. 更新项目 README 文档

### 第 4 周 待开发

1. 前端页面开发，使用 ECharts 绘制各类统计图表
2. 前端对接后端接口，完成看板可视化展示
3. 前后端联调，整体测试

---

## 项目启动步骤

```bash
# 1. 启动 MySQL 服务，创建数据库
# 2. 执行建表脚本
mysql -u root -p ecommerce_dashboard < sql/create_table.sql

# 3. 导入天池数据集（需先安装依赖）
pip install pandas pymysql
python backend/csv_import.py

# 4. 启动 SpringBoot 后端项目
#    IDEA 中运行 BackendApplication，或命令行：
cd backend
mvn spring-boot:run

# 5. 访问接口文档测试
#    http://127.0.0.1:8080/swagger-ui.html
```

---

## 环境依赖

1. MySQL 8.0+
2. JDK 17+
3. Maven
4. Python 3 + pandas + pymysql（仅用于一次性导入数据）
5. Node.js（可选，如前端使用构建工具）

---

## 常见问题排查

### Q1：SpringBoot 启动报错 `Invalid value type for attribute 'factoryBeanObjectType'`

**原因**：SpringBoot 3 与 mybatis-plus 3.5.5 的 `mybatis-plus-boot-starter` 不兼容。

**解决**：更换为 SpringBoot 3 专用依赖：

```xml
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-spring-boot3-starter</artifactId>
    <version>3.5.9</version>
</dependency>
```

### Q2：Swagger 页面一直 loading / 接口卡住

**原因**：`/api/order/list` 一次性查询全部订单，数据量大时耗时过长。

**解决**：优先测试统计类接口（`/total`、`/category/sales`），或给 list 接口加分页。

### Q3：运行 csv_import.py 报编码错误

**解决**：将 `encoding="utf-8"` 改为 `encoding="gbk"`。

### Q4：导入时提示找不到字段

**原因**：CSV 列名与表字段不一致。

**解决**：在脚本中检查 `rename` 映射，确保 CSV 表头与 `t_orders` 字段对应；表缺少字段时先执行 `ALTER TABLE` 追加。

---

## 版本更新记录

| 版本 | 时间 | 说明 |
| ---- | ---- | ---- |
| v0.1 | 第 2 周 | 初始化项目、建表脚本、数据集准备 |
| v0.2 | 第 3 周 | 完成 SpringBoot 后端、CSV 导入、统计接口 |
| v1.0 | 第 4 周 | 前端看板开发（待完成） |

---

> 本项目为教学实践项目，数据来源为阿里天池公开数据集。
