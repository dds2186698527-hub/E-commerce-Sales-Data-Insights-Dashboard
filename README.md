\## 2、数据集说明

\- \*\*数据来源：阿里天池公开数据集【电商用户行为分析数据集】\*\*

\- 数据集网页地址：https://tianchi.aliyun.com/dataset/216886

\- 原始数据记录：1000+条成交订单记录

\- 原始文件：`data/tianchi\_origin.csv`（因文件较大，加入.gitignore，不提交git仓库）

\- 数据预处理脚本：`data/preprocess\_tianchi.py`

> 原始天池数据集缺少字段`user\_type(新老用户)`、`pay\_method(支付方式)`；预处理脚本随机补齐两个字段，输出`orders.csv`，字段完全匹配数据库表`t\_orders`。

\- 输出文件：`data/orders.csv`（预处理之后用于导入MySQL，不提交git）



\### 数据字段说明

|字段|说明|

|---|---|

|order\_no|订单号（来自原始invoice\_no）|

|goods\_name|商品名称|

|category|商品品类：电子产品、服装、家居、书籍、美妆、运动、玩具|

|unit\_price|商品单价|

|quantity|购买数量|

|total\_amount|订单商品总金额|

|order\_time|下单时间|

|user\_id|用户ID（来自原始customer\_id）|

|user\_type|【脚本补全】用户类型 new新用户 / old老用户|

|pay\_method|【脚本补全】支付方式：微信、支付宝、银行卡|



\### 数据导入说明

> 后续开发阶段操作：运行`preprocess\_tianchi.py`得到orders.csv，使用Navicat/DBeaver将csv导入MySQL表`t\_orders`

> ⚠️ 项目禁止程序直接读取csv文件，全部数据查询走MySQL数据库。



