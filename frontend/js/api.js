// 1. 定义后端基础地址
const API_BASE_URL = 'http://127.0.0.1:8000';

// 2. 获取KPI数据（F1）
async function loadKpiData() {
    try {
        // 真实请求
        const res = await fetch(`${API_BASE_URL}/api/orders/kpi`);
        const json = await res.json();
        
        if (json.code === 200) {
            const data = json.data;
            document.getElementById('kpi-sales').innerText = '¥ ' + data.total_sales.toLocaleString();
            document.getElementById('kpi-orders').innerText = data.total_orders.toLocaleString();
            document.getElementById('kpi-avg').innerText = '¥ ' + data.avg_order_value;
            document.getElementById('kpi-hot').innerText = data.hot_product_count;
        }
    } catch (error) {
        console.error('KPI接口请求失败，请检查后端是否启动，或者CORS是否配置:', error);
        // 降级方案：如果后端没写好，暂时用假数据撑住页面
        document.getElementById('kpi-sales').innerText = '¥ 500,000 (Mock)';
    }
}

// 3. 页面加载时自动调用
window.onload = function() {
    loadKpiData();
    loadLineChart();
    loadBarChart();
    loadTop10();
    loadPieChart();
    loadTableData();
};