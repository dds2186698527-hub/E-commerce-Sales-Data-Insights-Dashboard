# README.md（第三周版本）
# 电商销售数据洞察看板
> 项目：阿里天池电商订单数据分析可视化看板
> 技术栈：Python + FastAPI + MySQL + DataGrip + Git/GitHub

## 项目简介
本项目基于阿里天池电商订单数据集，将多份原始CSV文件导入MySQL数据库，使用FastAPI开发后端统计查询接口。
**考核要点：业务不直接读取静态CSV文件，所有数据查询均访问MySQL数据库，后端查询后返回JSON数据。**

## 项目目录结构
```
ecommerce-dashboard
├── backend/                 # 后端代码（第三周任务）
│   ├── main.py              # FastAPI主程序，统计接口
│   └── import_data.py       # CSV批量导入MySQL脚本
├── data/                    # 阿里天池原始CSV数据集
├── .gitignore               # Git忽略配置
└── README.md                # 项目说明文档
```

## 环境依赖
后端Python依赖包：
```
fastapi
uvicorn
pymysql
```
安装命令
```bash
pip install fastapi uvicorn pymysql
```

## 数据库说明
- 数据库：MySQL
- 管理工具：DataGrip
- 数据表：`t_orders`
- 数据来源：阿里天池多份CSV订单数据
- 流程：执行建表SQL创建`t_orders`，运行import_data.py把CSV一次性导入数据库，后续查询不再读取csv文件

## 后端接口文档
启动后端后访问：[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

| 接口地址 | 请求方式 | 接口说明 |
| ---- | ---- | ---- |
| `/api/overview` | GET | 大盘概览：总订单数、总销售额 |
| `/api/month_sales` | GET | 月度销售趋势数据 |
| `/api/stats/user_type` | GET | 用户性别订单统计 |
| `/api/stats/goods_top10` | GET | 商品销量TOP10 |
| `/api/stats/category_sale` | GET | 商品分类销售额统计 |

## 运行步骤
1. 在DataGrip连接MySQL，执行建表SQL，生成`t_orders`数据表
2. 运行`backend/import_data.py`，导入阿里天池CSV数据入库
3. 启动FastAPI后端服务
```bash
uvicorn backend.main:app --reload
```
后端地址：`[http://127.0.0.1:8000](http://127.0.0.1:8000)`
接口文档地址：`[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)`

## 开发进度（分周里程碑）
- ✅ **第二周末**：初始化Git仓库，编写建表SQL，阿里天池CSV数据导入MySQL，提交基础文件
- ✅ **第三周末**：FastAPI后端开发，编写统计查询接口，对接`t_orders`，接口测试通过，后端代码提交GitHub
- ⏳ **第四周末**：前端可视化看板开发（待完成）

## 项目说明
1. 满足考核要求：CSV仅用于一次性导入数据库，业务查询全部通过后端访问MySQL获取数据，不读取本地静态csv。
2. 采用前后端分离架构，后端负责数据查询与统计，返回JSON，后续前端页面调用接口绘图。
3. .gitignore配置完成，不上传虚拟环境venv、本地敏感配置等文件。
```