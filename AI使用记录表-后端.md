# AI使用记录表（后端）

> 本表仅记录**后端核心代码**相关的 AI 使用情况，用于答辩时解释后端架构、接口设计与核心算法。

## 一、后端技术架构（答辩速览）

```
Controller（接口层） → Service（业务逻辑层） → Mapper（MyBatis-Plus 数据访问层） → MySQL
   │                        │
   │ 接收请求、参数校验       ├─ TOrdersService：订单CRUD（继承 IService）
   │ 返回JSON               └─ ForecastService：销售预测算法
```

- **框架**：Spring Boot 3.2.0 + JDK 17 + MyBatis-Plus 3.5.9
- **入口**：`BackendApplication.java`（`@SpringBootApplication` + `@MapperScan`）
- **配置**：`application.yml`（端口8080、MySQL连接、驼峰映射）
- **跨域**：`CorsConfig.java`（全局 `CorsFilter`，允许所有来源）
- **接口文档**：springdoc-openapi 自动生成 Swagger

## 二、AI 使用记录明细

| 序号 | 日期 | 环节 | 使用的AI工具 | 提问内容（或提示词） | AI输出摘要 | 是否采用 | 如何修改 | 如何验证 |
|------|------|------|-------------|---------------------|-----------|---------|---------|---------|
| 1 | 10.06 | 后端基础接口 | 豆包 | "用Spring Boot 3 + MyBatis-Plus写订单统计接口：总销售额、品类销售额、商品TOP10、订单列表" | 返回完整Controller + Service + Mapper代码，使用QueryWrapper做分组聚合查询 | 大部分采用 | 补充Swagger注解(@Tag/@Operation)，增加全局CorsConfig跨域配置，将返回字段统一为驼峰命名 | 启动后端访问Swagger，逐个接口测试返回数据 |
| 2 | 10.06 | 实体与配置 | 豆包 | "订单实体类怎么写，MyBatis-Plus字段映射和application.yml怎么配" | 返回TOrders实体（@TableName/@TableId）、Lombok @Data、yml数据库连接配置 | 大部分采用 | 补全了userType/payMethod字段，设置map-underscore-to-camel-case驼峰映射 | 编译通过，查询接口能正确返回数据库字段 |
| 3 | 10.15 | 前后端对接（后端部分） | 豆包 | "后端接口返回字段大小写不一致，前端如何兼容" | 建议统一返回结构，用别名保证字段名稳定 | 部分采用 | 在SQL查询中使用AS别名（如total_amount→total_sales），保证接口返回字段稳定 | 前端fetch正常解析JSON，无字段缺失 |
| 4 | 10.19 | 销售预测算法 | 豆包 | "基于历史订单数据预测未来30天各商品销售额，给出备货建议" | 返回ForecastService完整算法：28天日均基准 + 星期因子(季节性修正) + 7天趋势阻尼外推 | 大部分采用 | 限制horizon仅允许7/30/90天，增加空数据兜底，返回结构改为Java record，补充备货建议分级(重点备货/适量补货/保持稳定/减少进货) | 调用/api/forecast接口，对比预测值与历史数据合理性 |
| 5 | 10.20 | 代码审查（后端） | 豆包 | "检查这个电商看板后端有什么问题" | 返回问题清单：实体类缺userType/payMethod字段、CSV字段映射错误、接口路径不规范 | 全部采用 | 修复TOrders.java补全字段，修正csv_import.py性别误映射问题 | 重新编译，查询接口返回完整字段 |
| 6 | 10.20 | 规范接口A1-A5 | 豆包 | "按照项目要求补齐A1-A5接口：品类列表、条件分页查询、KPI汇总、TOP10、时间聚合" | 返回完整OrderQueryController，含/api/categories、/api/orders分页、/api/orders/kpi、/api/orders/ranking、/api/orders/stats | 全部采用 | 合并为统一OrderController，分页改用手动LIMIT(避免引入分页插件)，A3补齐平均客单价和热销商品数 | Swagger逐个调用，验证分页、筛选、聚合返回正确 |
| 7 | 10.20 | 接口整合 | 豆包 | "把两个重复的控制器合并成一个统一接口" | 返回整合后的OrderController，统一路径为/api/orders/* | 全部采用 | 提取buildQuery()私有方法复用查询条件构建，保留全量list接口供前端聚合，同步更新前端api.js | Swagger检查接口列表完整，前端无404 |
| 8 | 10.23 | 数据导入优化 | 豆包 | "CSV导入时新老用户和支付方式字段怎么合理填充" | 建议按时间判断新老用户，支付方式按用户固定分配 | 部分采用 | 新老用户以2024-07-01为界按时间判断；支付方式改为CSV有列则直接用，无则默认"未知"，逻辑更简洁 | 重新导入后查询MySQL，验证分布合理 |

## 三、答辩核心代码解释（后端）

### 1. 分层架构
- **Controller**：只负责接收请求、参数校验、返回JSON，不写业务逻辑
- **Service**：业务逻辑（`TOrdersService`继承MyBatis-Plus的`IService`，`ForecastService`封装预测算法）
- **Mapper**：`TOrdersMapper extends BaseMapper`，MyBatis-Plus自动提供CRUD和条件查询

### 2. 核心接口示例（OrderController）
- **A2分页查询**：`buildQuery()`构建`QueryWrapper`条件（品类eq、日期ge/le、关键字like），先`count()`查总数，再`LIMIT offset,size`查当前页，返回`{total, page, size, totalPages, list}`
- **A3 KPI**：`SELECT COUNT(id), SUM(total_amount), AVG(total_amount)`一次查出订单数、总销售额、客单价；热销商品数单独按商品分组算"销量≥平均销量"的商品个数

### 3. 预测算法（ForecastService）——答辩重点
```
预测值 = 最近28天日均值 × 星期因子 × (1 + 短期趋势×阻尼系数)
```
- **星期因子**：统计每周各天销量/整体日均，修正周期性波动（如周末卖得好）
- **趋势外推**：最近7天日均 / 上7天日均，限制在[0.5, 2.0]防单日波动放大
- **阻尼**：预测天数越多，趋势影响越小（`ramp = min(1, i/28)`）
- **备货建议**：按增长率分级（≥15%重点备货、≥5%适量补货、≤-5%控制库存、≤-15%减少进货）

### 4. 关键配置
- **CORS**：`CorsFilter`全局允许跨域，前端 file:// 也能访问
- **驼峰映射**：`map-underscore-to-camel-case: true`，数据库下划线字段自动转Java驼峰属性
