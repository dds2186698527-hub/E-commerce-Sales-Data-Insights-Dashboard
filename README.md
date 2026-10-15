```
# 电商销售数据洞察看板
> 项目：阿里天池电商数据集可视化看板
> 开发周期：4周，前后端分离项目
> 技术考核要点：CSV静态文件不能直接读取展示，必须导入MySQL数据库，后端查询数据库返回数据给前端

## 项目介绍
本项目基于阿里天池电商订单数据集，搭建一套数据可视化看板。后端提供统计查询接口，前端使用图表展示订单销量、品类销售、热门商品等数据分析结果。

## 技术栈
- 数据库：MySQL
- 后端：SpringBoot
- 数据预处理：Python（仅一次性导入天池CSV数据到MySQL，不提供web服务）
- 前端：HTML + JavaScript + ECharts（第四周开发）
- 版本管理：Git + GitHub

## 项目目录结构
```
ecommerce-dashboard
├── backend                 # SpringBoot 后端工程
│   ├── src                 # Java 源码
│   ├── pom.xml             # Maven 依赖
│   └── csv_import.py       # Python 一次性数据导入脚本
├── sql
│   └── create_table.sql    # MySQL 建表脚本，t_orders 订单表
├── data                    # 存放原始天池 csv 数据集（.gitignore 忽略，不上传大文件）
├── README.md               # 项目说明文档
└── .gitignore              # git 忽略配置
```

## 数据库说明
数据库名：`ecommerce_dashboard`
数据表：`t_orders` 电商订单表
字段：id、order_no、goods_name、category、unit_price、quantity、total_amount、order_time、user_id、user_type、pay_method

### 初始化数据库步骤
1. 在DataGrip中执行 `sql/create_table.sql` 创建数据库与订单表
2. 执行SQL追加字段：
```sql
ALTER TABLE t_orders ADD COLUMN user_type VARCHAR(16) COMMENT '用户类型';
ALTER TABLE t_orders ADD COLUMN pay_method VARCHAR(32) COMMENT '支付方式';
```

3. 运行 `backend/csv_import.py`，读取阿里天池 CSV，批量导入数据至 t_orders 表

> 
> 注意：csv_import.py 仅作为一次性初始化脚本，**业务后端不会直接读取 CSV 文件**，符合考核要求。

## 后端接口文档

后端启动后访问接口文档：[http://127.0.0.1:8080/swagger-ui.html](http://127.0.0.1:8080/swagger-ui.html)

表格

| 接口 | 请求方式 | 功能说明 |
| --- | --- | --- |
| /api/order/summary | GET | 订单整体汇总统计 |
| /api/order/category-sales | GET | 各品类销售额统计 |
| /api/order/goods-top10 | GET | 商品销量 TOP10 |

> 
> 后端配置跨域 CORS，支持前端页面跨域调用接口。

## 开发进度

### 第 2 周

1. 创建 Git 仓库，编写.gitignore
2. 编写建表 SQL 脚本 create_table.sql
3. 准备阿里天池数据集，设计数据表结构
4. 提交基础 SQL 脚本、项目文档

### 第 3 周 ✅ 已完成

1. 删除旧 Python FastAPI 后端，重构为 SpringBoot 后端项目
2. 完善 t_orders 订单表结构，新增 user_type、pay_method 字段
3. 编写 csv_import.py 脚本，实现天池 CSV 批量导入 MySQL
4. 开发 3 个数据分析接口，配置跨域
5. 更新项目 README 文档

### 第 4 周 待开发

1. 前端页面开发，使用 ECharts 绘制各类统计图表
2. 前端对接后端接口，完成看板可视化展示
3. 前后端联调，整体测试

## 项目启动步骤

1. 本地启动 MySQL 服务，创建数据库
2. 执行 sql/create_table.sql，建立数据表
3. 运行 csv_import.py，导入天池数据集
4. 启动 SpringBoot 后端项目
5. 访问 swagger 接口文档测试接口（第四周开发前端看板）

## 环境依赖

1. MySQL 8.0+
2. JDK 17+
3. Maven
4. Python3 + pymysql + pandas（仅用于一次性导入数据）