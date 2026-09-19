# 电商销售数据洞察看板
> 课程项目｜第二周末里程碑提交

## 1、项目选题
电商销售数据洞察看板，实现订单多维度统计可视化分析。

## 2、数据集说明
- **数据来源：阿里天池公开数据集【电商用户行为分析数据集】**
- 数据集网页地址：https://tianchi.aliyun.com/dataset/216886
- 原始数据：多个CSV订单文件，合计1000+条成交订单记录
- 原始文件存放路径：`data/`目录下（因文件体积较大，加入.gitignore，不上传Git仓库）
- 数据预处理脚本：`data/preprocess_tianchi.py`
> 原始天池数据集缺少字段`user_type(新老用户)`、`pay_method(支付方式)`；预处理脚本读取多个原始CSV，完成数据合并、清洗，随机补齐缺失字段，输出`orders.csv`，输出文件字段完全匹配数据库表`t_orders`。
- 输出文件：`data/orders.csv`（预处理之后用于导入MySQL，不提交Git）

### 数据字段说明
|字段|说明|
|---|---|
|order_no|订单号（来自原始invoice_no）|
|goods_name|商品名称|
|category|商品品类|
|unit_price|商品单价|
|quantity|购买数量|
|total_amount|订单商品总金额|
|order_time|下单时间|
|user_id|用户ID（来自原始customer_id）|
|user_type|脚本补全，用户类型 new新用户 / old老用户|
|pay_method|脚本补全，支付方式：微信、支付宝、银行卡|

### 数据导入说明
后续开发阶段操作：运行`preprocess_tianchi.py`得到`orders.csv`，使用Navicat/DBeaver将csv导入MySQL表`t_orders`。

> ### 考核点说明
> 项目技术要求：禁止后端直接读取静态CSV文件。
> 1. 本项目多个阿里天池原始CSV仅作为本地数据源；
> 2. 使用辅助Python脚本完成多文件读取、数据清洗合并、字段补全，生成标准`orders.csv`；
> 3. 将`orders.csv`手动导入MySQL数据库`t_orders`；
> 4. SpringBoot后端所有查询、筛选、分页、统计全部通过SQL访问MySQL实现；**后端业务代码没有任何读取CSV文件的逻辑**。

## 3、数据库建表脚本
脚本路径：`sql/create_table.sql`
数据表名：`t_orders`

## 4、当前项目阶段
> 里程碑：第2周末，项目启动&数据源准备阶段
- ✅ Git仓库初始化完成
- ✅ 确定数据源：阿里天池数据集，编写多文件预处理Python脚本
- ✅ 数据库建表SQL脚本编写完成
- ⏳ 尚未开发SpringBoot后端接口、尚未开发前端页面

## 5、后续开发计划
1. 第4周末：完成前端静态页面原型
2. 第6周末：后端API接口开发
3. 第7周末：前后端联调测试
4. 第8周：项目答辩