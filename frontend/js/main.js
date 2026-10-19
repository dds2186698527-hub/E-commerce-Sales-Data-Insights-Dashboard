/*
 * main.js —— 主控逻辑
 * 状态管理、接口编排、筛选 / 分页、KPI / 表格渲染。
 * 依赖 api.js（window.Api）与 charts.js（window.Charts）
 */
(function (global) {
    'use strict';

    var Api = global.Api;
    var Charts = global.Charts;

    var PAGE_SIZE = 10;

    var state = {
        orders: [],          // 全量订单明细（/api/order/list）
        summary: null,       // 后端汇总（/api/order/total）
        categoryRows: null,  // 后端品类销售额（/api/order/category/sales）
        topGoods: null,      // 后端商品 TOP10（/api/order/goods/top10）
        filters: { category: '', start: '', end: '' },
        page: 1,
        loading: false,
        failures: []
    };

    var els = {};

    /* ---------- 小工具 ---------- */
    function $(id) { return document.getElementById(id); }

    function money(value, digits) {
        var n = Number(value);
        if (!isFinite(n)) n = 0;
        return '¥ ' + n.toLocaleString('zh-CN', {
            minimumFractionDigits: digits || 0,
            maximumFractionDigits: digits || 2
        });
    }

    function escapeHtml(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function sumBy(rows, field) {
        return rows.reduce(function (acc, row) {
            var n = Number(row[field]);
            return acc + (isFinite(n) ? n : 0);
        }, 0);
    }

    /* ---------- 数据聚合（筛选时全部在本地算，后端暂未提供筛选参数） ---------- */
    function filteredOrders() {
        var f = state.filters;
        return state.orders.filter(function (order) {
            if (f.category && order.category !== f.category) return false;
            var date = (order.orderTime || '').slice(0, 10);
            if (f.start && date && date < f.start) return false;
            if (f.end && date && date > f.end) return false;
            return true;
        });
    }

    function hasFilter() {
        var f = state.filters;
        return Boolean(f.category || f.start || f.end);
    }

    function summarize(rows) {
        return { count: rows.length, sales: sumBy(rows, 'totalAmount') };
    }

    // 热销商品数：按商品汇总销量，销量 ≥ 平均单商品销量的商品个数
    function hotGoodsCount(rows) {
        if (!rows.length) return null;
        var byGoods = new Map();
        rows.forEach(function (order) {
            var key = order.goodsName || '未知商品';
            byGoods.set(key, (byGoods.get(key) || 0) + (order.quantity || 0));
        });
        var quantities = Array.from(byGoods.values());
        var total = quantities.reduce(function (a, b) { return a + b; }, 0);
        var average = total / quantities.length;
        if (!(average > 0)) return null;
        return quantities.filter(function (q) { return q >= average; }).length;
    }

    function aggregateCategories(rows) {
        var map = new Map();
        rows.forEach(function (order) {
            var key = order.category || '未分类';
            map.set(key, (map.get(key) || 0) + (order.totalAmount || 0));
        });
        return Array.from(map.entries())
            .map(function (item) { return { category: item[0], saleTotal: item[1] }; })
            .sort(function (a, b) { return b.saleTotal - a.saleTotal; });
    }

    function aggregateTopGoods(rows) {
        var map = new Map();
        rows.forEach(function (order) {
            var key = order.goodsName || '未知商品';
            map.set(key, (map.get(key) || 0) + (order.quantity || 0));
        });
        return Array.from(map.entries())
            .map(function (item) { return { goodsName: item[0], totalQty: item[1] }; })
            .sort(function (a, b) { return b.totalQty - a.totalQty; })
            .slice(0, 10);
    }

    function aggregateTrend(rows) {
        var map = new Map();
        rows.forEach(function (order) {
            var date = (order.orderTime || '').slice(0, 10);
            if (!date) return;
            map.set(date, (map.get(date) || 0) + (order.totalAmount || 0));
        });
        return Array.from(map.entries())
            .map(function (item) { return { date: item[0], sales: item[1] }; })
            .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    }

    /* ---------- 渲染 ---------- */
    function setText(el, text) {
        if (el) el.textContent = text;
    }

    function renderKpi(rows) {
        var filtered = hasFilter();
        // 至少有一个数据来源才显示数字，否则一律显示占位符，避免用假数据冒充
        var hasSource = state.summary !== null || state.orders.length > 0;

        if (!hasSource) {
            setText(els.sales, '—');
            setText(els.orders, '—');
            setText(els.avg, '—');
            setText(els.hot, '—');
            return;
        }

        var kpi;
        if (filtered) {
            kpi = summarize(rows);
        } else if (state.summary) {
            kpi = { count: state.summary.orderCount, sales: state.summary.totalSales };
        } else {
            // /total 失败但明细可用：用明细兜底
            kpi = summarize(state.orders);
        }

        setText(els.sales, money(kpi.sales));
        setText(els.orders, kpi.count.toLocaleString('zh-CN'));
        setText(els.avg, kpi.count > 0 ? money(kpi.sales / kpi.count, 2) : '—');

        var hot = hotGoodsCount(filtered ? rows : state.orders);
        setText(els.hot, hot === null ? '—' : String(hot));
    }

    function renderCharts(rows) {
        var filtered = hasFilter();
        var categoryRows = filtered || !state.categoryRows ? aggregateCategories(rows) : state.categoryRows;
        var topRows = filtered || !state.topGoods ? aggregateTopGoods(rows) : state.topGoods;
        var trendRows = aggregateTrend(rows);

        Charts.renderTrend(els.chartLine, trendRows);
        Charts.renderCategoryBar(els.chartBar, categoryRows);
        Charts.renderTop10(els.chartTop10, topRows);
        Charts.renderCategoryPie(els.chartPie, categoryRows);
    }

    function renderTable(rows) {
        var sorted = rows.slice().sort(function (a, b) {
            var byTime = String(b.orderTime || '').localeCompare(String(a.orderTime || ''));
            return byTime !== 0 ? byTime : (b.id || 0) - (a.id || 0);
        });

        var pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
        if (state.page > pages) state.page = pages;
        if (state.page < 1) state.page = 1;

        var start = (state.page - 1) * PAGE_SIZE;
        var pageRows = sorted.slice(start, start + PAGE_SIZE);

        if (!pageRows.length) {
            var emptyMessage = hasFilter()
                ? '没有符合筛选条件的订单'
                : (state.failures.length ? '订单数据加载失败，详见顶部提示' : '暂无订单数据（数据库 t_orders 没有记录）');
            els.tbody.innerHTML = '<tr class="table-empty"><td colspan="4">' + escapeHtml(emptyMessage) + '</td></tr>';
        } else {
            els.tbody.innerHTML = pageRows.map(function (order) {
                var date = (order.orderTime || '').slice(0, 10);
                return '<tr>' +
                    '<td>' + escapeHtml(order.orderNo) + '</td>' +
                    '<td>' + escapeHtml(order.goodsName) + '</td>' +
                    '<td class="num">' + money(order.totalAmount) + '</td>' +
                    '<td title="' + escapeHtml(order.orderTime) + '">' + escapeHtml(date) + '</td>' +
                    '</tr>';
            }).join('');
        }

        setText(els.pageInfo, '第 ' + state.page + ' / ' + pages + ' 页');
        els.prev.disabled = state.page <= 1;
        els.next.disabled = state.page >= pages;
        setText(els.tableSummary,
            (state.failures.length ? '数据未加载完整 · ' : '') +
            '共 ' + sorted.length + ' 条' + (hasFilter() ? '（已应用筛选）' : ''));
    }

    function renderCategoryOptions() {
        var names = new Set();
        (state.categoryRows || []).forEach(function (row) { if (row.category) names.add(row.category); });
        state.orders.forEach(function (order) { if (order.category) names.add(order.category); });

        var current = els.select.value;
        var options = ['<option value="">全部品类</option>'].concat(
            Array.from(names).sort().map(function (name) {
                return '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>';
            })
        );
        els.select.innerHTML = options.join('');
        els.select.value = names.has(current) ? current : '';
    }

    function renderAll() {
        var rows = filteredOrders();
        renderKpi(rows);
        renderCharts(rows);
        renderTable(rows);
        renderCategoryOptions();
    }

    /* ---------- 状态条 ---------- */
    function showStatus(messages) {
        if (!messages || !messages.length) {
            els.statusBar.hidden = true;
            els.statusText.textContent = '';
            return;
        }
        els.statusBar.hidden = false;
        els.statusText.innerHTML = messages.map(function (msg) {
            return '<div>' + escapeHtml(msg) + '</div>';
        }).join('');
    }

    /* ---------- 数据加载 ---------- */
    function loadAll() {
        if (state.loading) return;
        state.loading = true;
        state.failures = [];
        setText(els.updated, '加载中…');
        showStatus([]);

        var tasks = [
            { name: '汇总指标', run: Api.fetchSummary, done: function (d) { state.summary = d; } },
            { name: '品类销售', run: Api.fetchCategorySales, done: function (d) { state.categoryRows = d; } },
            { name: '商品 TOP10', run: Api.fetchGoodsTop10, done: function (d) { state.topGoods = d; } },
            { name: '订单明细', run: Api.fetchOrderList, done: function (d) { state.orders = d; } }
        ];

        Promise.allSettled(tasks.map(function (task) { return task.run(); }))
            .then(function (results) {
                results.forEach(function (result, index) {
                    if (result.status === 'fulfilled') {
                        tasks[index].done(result.value);
                    } else {
                        var reason = result.reason;
                        state.failures.push(tasks[index].name + '：' +
                            (reason && reason.message ? reason.message : '请求失败'));
                    }
                });
            })
            .then(function () {
                state.loading = false;
                var messages = [];
                if (!Charts.hasEngine()) {
                    messages.push('ECharts 未加载：请确认 js/echarts.min.js 文件存在（图表将不可用，指标与表格不受影响）');
                }
                if (state.failures.length) {
                    messages = messages.concat(state.failures).concat(
                        '接口地址：' + Api.BASE_URL + '（后端未启动时请先运行 Spring Boot 工程）'
                    );
                }
                showStatus(messages);

                setText(els.updated, state.failures.length
                    ? '数据更新失败 · ' + new Date().toLocaleTimeString('zh-CN')
                    : '数据更新于 ' + new Date().toLocaleTimeString('zh-CN'));

                renderAll();
            });
    }

    /* ---------- 事件 ---------- */
    function applyFilters() {
        state.filters = {
            category: els.select.value,
            start: els.start.value,
            end: els.end.value
        };
        state.page = 1;
        renderAll();
    }

    function resetFilters() {
        els.select.value = '';
        els.start.value = '';
        els.end.value = '';
        applyFilters();
    }

    function debounce(fn, wait) {
        var timer = null;
        return function () {
            clearTimeout(timer);
            timer = setTimeout(fn, wait);
        };
    }

    function bindEvents() {
        els.query.addEventListener('click', applyFilters);
        els.reset.addEventListener('click', resetFilters);

        [els.start, els.end].forEach(function (input) {
            input.addEventListener('keydown', function (event) {
                if (event.key === 'Enter') applyFilters();
            });
        });

        els.prev.addEventListener('click', function () {
            state.page -= 1;
            renderTable(filteredOrders());
        });

        els.next.addEventListener('click', function () {
            state.page += 1;
            renderTable(filteredOrders());
        });

        els.retry.addEventListener('click', loadAll);
        global.addEventListener('resize', debounce(Charts.resizeAll, 150));
    }

    /* ---------- 启动 ---------- */
    function boot() {
        els = {
            sales: $('kpi-sales'),
            orders: $('kpi-orders'),
            avg: $('kpi-avg'),
            hot: $('kpi-hot'),
            select: $('category-select'),
            start: $('start-date'),
            end: $('end-date'),
            query: $('filter-query'),
            reset: $('filter-reset'),
            tbody: $('order-tbody'),
            pageInfo: $('page-info'),
            prev: $('prev-page'),
            next: $('next-page'),
            tableSummary: $('table-summary'),
            statusBar: $('status-bar'),
            statusText: $('status-text'),
            retry: $('status-retry'),
            updated: $('updated-at'),
            chartLine: $('chart-line'),
            chartBar: $('chart-bar'),
            chartTop10: $('chart-top10'),
            chartPie: $('chart-pie')
        };

        bindEvents();
        renderAll();
        loadAll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})(window);
