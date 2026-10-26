/*
 * charts.js —— 图表渲染层
 * 职责：管理 ECharts 实例、处理空数据状态、把已经归一化的数据画成图。
 * 不负责：取数（api.js）和业务判断（main.js）。
 * 依赖：window.echarts（本地 js/echarts.min.js）。
 */
(function (global) {
    'use strict';

    var PALETTE = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'];

    var instances = new Map();

    function hasEngine() {
        return typeof global.echarts !== 'undefined' && global.echarts !== null;
    }

    function instance(canvas) {
        if (!hasEngine()) return null;
        if (!instances.has(canvas)) {
            instances.set(canvas, global.echarts.init(canvas, null, { renderer: 'canvas' }));
        }
        return instances.get(canvas);
    }

    function emptyNode(canvas) {
        return canvas.parentElement ? canvas.parentElement.querySelector('.chart-empty') : null;
    }

    function setEmpty(canvas, message, hint) {
        var node = emptyNode(canvas);
        if (!node) return;
        node.hidden = !message;
        node.innerHTML = '';
        if (message) {
            var title = document.createElement('div');
            title.textContent = message;
            node.appendChild(title);
            if (hint) {
                var sub = document.createElement('div');
                sub.className = 'chart-empty-hint';
                sub.textContent = hint;
                node.appendChild(sub);
            }
        }
    }

    function money(value) {
        var n = Number(value);
        if (!isFinite(n)) n = 0;
        return '¥ ' + n.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
    }

    function compact(value) {
        var n = Number(value) || 0;
        if (Math.abs(n) >= 100000000) return (n / 100000000).toFixed(1) + '亿';
        if (Math.abs(n) >= 10000) return (n / 10000).toFixed(1) + '万';
        return String(n);
    }

    function draw(canvas, option, rows, emptyMessage, emptyHint) {
        var chart = instance(canvas);
        if (!chart) {
            setEmpty(canvas, '图表引擎未加载', '请检查 js/echarts.min.js 是否存在');
            return false;
        }
        if (!rows || rows.length === 0) {
            chart.clear();
            setEmpty(canvas, emptyMessage || '暂无数据', emptyHint);
            return false;
        }
        setEmpty(canvas, '');
        chart.setOption(option, true);
        return true;
    }

    // F4 销售趋势：points = [{ date, sales }]
    function renderTrend(canvas, points) {
        var rows = points || [];
        var option = {
            color: [PALETTE[0]],
            tooltip: {
                trigger: 'axis',
                valueFormatter: money
            },
            grid: { left: 8, right: 44, top: 24, bottom: 8, containLabel: true },
            xAxis: Object.assign({
                type: 'category',
                boundaryGap: false,
                data: rows.map(function (p) { return p.date; }),
                axisLabel: { color: '#8a94a6', fontSize: 12, hideOverlap: true }
            }, { axisLine: { lineStyle: { color: '#d9dee7' } }, axisTick: { show: false } }),
            yAxis: Object.assign({
                type: 'value',
                splitLine: { lineStyle: { color: '#eef1f6' } },
                axisLabel: { color: '#8a94a6', fontSize: 12, formatter: compact }
            }, { axisLine: { show: false }, axisTick: { show: false } }),
            series: [{
                name: '销售额',
                type: 'line',
                smooth: true,
                symbolSize: 6,
                lineStyle: { width: 2 },
                areaStyle: { opacity: 0.12 },
                data: rows.map(function (p) { return p.sales; })
            }]
        };
        return draw(canvas, option, rows, '暂无销售趋势数据', '需要后端返回订单明细（/api/order/list）');
    }

    // F5 品类销售：rows = [{ category, saleTotal }]
    function renderCategoryBar(canvas, rows) {
        var list = rows || [];
        var option = {
            color: [PALETTE[0]],
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                valueFormatter: money
            },
            grid: { left: 8, right: 24, top: 28, bottom: 8, containLabel: true },
            xAxis: Object.assign({
                type: 'category',
                data: list.map(function (r) { return r.category; }),
                axisLabel: { color: '#8a94a6', fontSize: 12, interval: 0, rotate: list.length > 6 ? 20 : 0 }
            }, { axisLine: { lineStyle: { color: '#d9dee7' } }, axisTick: { show: false } }),
            yAxis: {
                type: 'value',
                splitLine: { lineStyle: { color: '#eef1f6' } },
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { color: '#8a94a6', fontSize: 12, formatter: compact }
            },
            series: [{
                name: '销售额',
                type: 'bar',
                barMaxWidth: 36,
                itemStyle: { color: PALETTE[0], borderRadius: [4, 4, 0, 0] },
                data: list.map(function (r) { return r.saleTotal; })
            }]
        };
        return draw(canvas, option, list, '暂无品类销售数据', '需要后端返回 /api/order/category/sales');
    }

    // F6 商品 TOP10：rows = [{ goodsName, totalQty }]（已按销量降序）
    function renderTop10(canvas, rows) {
        var list = (rows || []).slice(0, 10);
        var names = list.map(function (r) { return r.goodsName; }).reverse();
        var values = list.map(function (r) { return r.totalQty; }).reverse();
        var option = {
            color: [PALETTE[0]],
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                valueFormatter: function (v) { return v + ' 件'; }
            },
            grid: { left: 8, right: 48, top: 16, bottom: 8, containLabel: true },
            xAxis: {
                type: 'value',
                splitLine: { lineStyle: { color: '#eef1f6' } },
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { color: '#8a94a6', fontSize: 12 }
            },
            yAxis: {
                type: 'category',
                data: names,
                axisLine: { lineStyle: { color: '#d9dee7' } },
                axisTick: { show: false },
                axisLabel: { color: '#5b6577', fontSize: 12, width: 110, overflow: 'truncate' }
            },
            series: [{
                name: '销量',
                type: 'bar',
                barMaxWidth: 16,
                itemStyle: { color: PALETTE[0], borderRadius: [0, 4, 4, 0] },
                label: { show: true, position: 'right', color: '#8a94a6', fontSize: 11 },
                data: values
            }]
        };
        return draw(canvas, option, list, '暂无商品销量数据', '需要后端返回 /api/order/goods/top10');
    }

    // F7 用户行为占比：rows = [{ category, saleTotal }]（新老用户订单数）
    function renderCategoryPie(canvas, rows) {
        var list = (rows || []).filter(function (r) { return r.saleTotal > 0; });
        var option = {
            color: PALETTE,
            tooltip: {
                trigger: 'item',
                formatter: function (p) {
                    return p.marker + p.name + '<br/>' + p.value.toLocaleString('zh-CN') + ' 单（' + p.percent + '%）';
                }
            },
            legend: {
                bottom: 0,
                icon: 'circle',
                itemWidth: 8,
                itemHeight: 8,
                textStyle: { color: '#5b6577', fontSize: 12 }
            },
            series: [{
                name: '订单数',
                type: 'pie',
                radius: ['42%', '66%'],
                center: ['50%', '46%'],
                avoidLabelOverlap: true,
                itemStyle: { borderColor: '#fff', borderWidth: 2 },
                label: { color: '#5b6577', fontSize: 12, formatter: '{b}\n{d}%' },
                data: list.map(function (r) { return { name: r.category, value: r.saleTotal }; })
            }]
        };
        return draw(canvas, option, list, '暂无占比数据', '需要后端返回 /api/orders/list');
    }

    // F9 商家建议：预测榜 TOP10（横向柱状图，涨蓝跌红）
    function renderForecastBar(canvas, items, metric) {
        var list = (items || []).slice(0, 10);
        var byQty = metric === 'qty';
        var names = list.map(function (item) { return item.goodsName; }).reverse();
        var data = list.map(function (item) {
            return {
                value: item.predicted,
                itemStyle: { color: item.growthRate >= 0 ? PALETTE[0] : PALETTE[3] }
            };
        }).reverse();
        var option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: function (params) {
                    var p = params[0];
                    var item = list.filter(function (x) { return x.goodsName === p.name; })[0] || {};
                    var growth = item.growthRate == null ? 0 : item.growthRate;
                    var sign = growth >= 0 ? '+' : '';
                    return p.marker + p.name +
                        '<br/>预测' + (byQty ? '销量 ' : '销售额 ') +
                        (byQty ? p.value + ' 件' : money(p.value)) +
                        '<br/>环比 ' + sign + (growth * 100).toFixed(1) + '%' +
                        '<br/>' + (item.advice || '');
                }
            },
            grid: { left: 8, right: 56, top: 16, bottom: 8, containLabel: true },
            xAxis: {
                type: 'value',
                splitLine: { lineStyle: { color: '#eef1f6' } },
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { color: '#8a94a6', fontSize: 12, formatter: byQty ? '{value}' : compact }
            },
            yAxis: {
                type: 'category',
                data: names,
                axisLine: { lineStyle: { color: '#d9dee7' } },
                axisTick: { show: false },
                axisLabel: { color: '#5b6577', fontSize: 12, width: 110, overflow: 'truncate' }
            },
            series: [{
                name: byQty ? '预测销量' : '预测销售额',
                type: 'bar',
                barMaxWidth: 16,
                itemStyle: { borderRadius: [0, 4, 4, 0] },
                label: {
                    show: true,
                    position: 'right',
                    color: '#8a94a6',
                    fontSize: 11,
                    formatter: function (p) {
                        return byQty ? p.value + ' 件' : compact(p.value);
                    }
                },
                data: data
            }]
        };
        return draw(canvas, option, list, '暂无预测数据', '需要后端返回 /api/forecast');
    }

    function clearAll() {
        instances.forEach(function (chart) { chart.clear(); });
    }

    function resizeAll() {
        instances.forEach(function (chart) { chart.resize(); });
    }

    global.Charts = {
        hasEngine: hasEngine,
        renderTrend: renderTrend,
        renderCategoryBar: renderCategoryBar,
        renderTop10: renderTop10,
        renderCategoryPie: renderCategoryPie,
        renderForecastBar: renderForecastBar,
        resizeAll: resizeAll,
        clearAll: clearAll
    };
})(window);
