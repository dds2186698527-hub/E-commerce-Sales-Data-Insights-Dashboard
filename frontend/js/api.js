// 假数据，等你后端好了就替换这里
const mockKpi = { total_sales: 500000, total_orders: 1200, avg_order_value: 416.6, hot_product_count: 15 };

// 渲染KPI
document.getElementById('kpi-sales').innerText = mockKpi.total_sales;
document.getElementById('kpi-orders').innerText = mockKpi.total_orders;

// 渲染折线图（F4）
const lineChart = echarts.init(document.getElementById('line-chart'));
lineChart.setOption({
    title: { text: '销售趋势' },
    xAxis: { type: 'category', data: ['10-01', '10-02', '10-03', '10-04'] },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: [20000, 30000, 25000, 40000] }]
});