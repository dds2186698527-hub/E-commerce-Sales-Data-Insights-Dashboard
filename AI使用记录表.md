# AI使用记录表

| 序号 | 日期 | 环节 | 使用的AI工具 | 提问内容（或提示词） | AI输出摘要 | 是否采用 | 如何修改 | 如何验证 |
|------|------|------|-------------|---------------------|-----------|---------|---------|---------|
| 1 | 09.19 | 前端布局 | 豆包 | "生成一个电商数据看板页面，顶部KPI卡片，中间图表区，底部表格，用CSS Grid布局" | 返回完整HTML+CSS代码框架，包含KPI卡片、图表容器、表格结构 | 部分采用 | 调整了配色为蓝色主题，拆分为独立的style.css，图表区改为2x2网格布局，引入本地ECharts | 浏览器打开index.html，切换不同分辨率验证响应式 |
| 2 | 09.19 | 数据脚本 | 豆包 | "用Python读取CSV文件，按字段映射写入MySQL数据库" | 返回pymysql+pandas连接代码，包含批量插入逻辑 | 大部分采用 | 修正了中文字段名映射（用户ID→user_id等），增加了随机填充user_type和pay_method字段，添加TRUNCATE清空旧数据 | 运行脚本后查询MySQL，验证15000行数据正确入库 |
| 3 | 10.06 | 后端接口 | 豆包 | "用Spring Boot写订单统计接口：总销售额、品类销售额、商品TOP10、订单列表" | 返回完整Controller+Service+Mapper代码，使用MyBatis-Plus QueryWrapper | 大部分采用 | 补充了Swagger注解，增加CORS全局配置，将@CrossOrigin移到全局配置类，调整返回字段为驼峰命名 | 启动后端，访问Swagger文档逐个测试接口返回 |
| 4 | 10.15 | 前端对接 | 豆包 | "用fetch调用Spring Boot接口，渲染ECharts图表，包含降级容错" | 返回api.js封装、charts.js渲染、main.js事件绑定完整代码 | 部分采用 | 增加Promise.allSettled容错机制，失败时显示状态条提示，统一字段归一化处理下划线/驼峰，增加XSS转义 | 断开后端服务测试前端是否优雅降级，检查各图表正常渲染 |
| 5 | 10.19 | 预测模块 | 豆包 | "基于历史订单数据预测未来30天各商品销售额，给出备货建议" | 返回ForecastService完整算法：28天日均基准+星期因子+7天趋势阻尼外推 | 大部分采用 | 调整了预测区间参数校验（仅允许7/30/90天），增加空数据兜底，将返回结构改为Java record，补充备货建议分级逻辑 | 启动后端调用/api/forecast接口，对比预测值与历史数据合理性 |
| 6 | 10.20 | 代码审查 | 豆包 | "检查这个电商看板项目有什么问题" | 返回问题清单：实体类缺字段、CSV字段映射错误、接口路径不规范、F7饼图内容不对 | 全部采用 | 修复TOrders.java补充userType/payMethod字段，修正csv_import.py性别误映射，新增A1-A5规范接口，F7改为新老用户占比 | 重新编译后端，启动前后端联调，验证各接口和图表正常 |
| 7 | 10.20 | 接口整合 | 豆包 | "把两个重复的控制器合并成一个统一接口" | 返回整合后的OrderController，统一路径为/api/orders/* | 全部采用 | 提取buildQuery私有方法复用条件构建，保留全量list接口供前端聚合，同步更新前端api.js路径 | Swagger检查接口列表，前端页面功能正常无报错 |
| 8 | 10.20 | 规范接口 | 豆包 | "按照项目要求补齐A1-A5接口：品类列表、条件分页查询、KPI汇总、TOP10、时间聚合，用Swagger注解标注" | 返回完整OrderQueryController，包含/api/categories、/api/orders分页、/api/orders/kpi、/api/orders/ranking、/api/orders/stats，带@Operation和@Tag注解 | 全部采用 | 将两个控制器合并为一个OrderController，去掉分页插件改用手动LIMIT，补充品类销售额和全量列表接口，Swagger页面展示完整接口文档 | 启动后端访问swagger-ui.html，逐个调用接口验证返回数据正确 |
