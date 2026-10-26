/*
 * main.js —— 主控逻辑（页面的大脑）
 * 职责：维护页面状态、并发调用接口、处理筛选/分页交互、渲染 KPI、明细表、商家建议模块。
 * 不负责：具体请求细节（api.js）、具体图表样式（charts.js）。
 * 依赖：window.Api（api.js）、window.Charts（charts.js）。
 * 关键约定：筛选/聚合/翻页都走后端（筛选结果由后端 WHERE 完成，不是前端本地假过滤）。
 */
(function (global) {
    'use strict';

    var Api = global.Api;
    var Charts = global.Charts;

    var PAGE_SIZE = 10;

    var state = {
        summary: null,        // 后端 KPI（/api/orders/kpi）
        categoryRows: null,   // 后端品类销售额（/api/orders/category-sales）
        topGoods: null,       // 后端商品 TOP10（/api/orders/ranking）
        trendRows: null,      // 后端时间趋势（/api/orders/stats）
        userRows: null,       // 后端新老用户占比（/api/orders/user-type）
        categories: [],       // 后端品类列表（/api/categories）
        pageRows: [],         // 后端分页订单（/api/orders）
        totalRows: 0,
        totalPages: 1,
        page: 1,
        size: PAGE_SIZE,
        forecast: null,       // 商家建议预测（/api/forecast）
        forecastHorizon: 30,  // 预测区间：7 / 30 / 90 天
        forecastMetric: 'revenue', // 预测指标：revenue 销售额 / qty 销量
        forecastError: '',
        filters: { category: '', start: '', end: '' },
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

    // 日期转 yyyy-MM-dd（按本地时区，避免 toISOString 在凌晨差一天）
    function toLocalDateString(date) {
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        return date.getFullYear() + '-' + month + '-' + day;
    }

    function hasFilter() {
        var f = state.filters;
        return Boolean(f.category || f.start || f.end);
    }

    // 订单数据里的最后一天（近7/30/90天以它为终点，而不是系统今天；来自后端趋势数据的最大日期）
    function latestOrderDate() {
        var latest = '';
        (state.trendRows || []).forEach(function (row) {
            var date = String(row.date || '').slice(0, 10);
            if (date > latest) latest = date;
        });
        return latest;
    }

    /* ---------- 渲染 ---------- */
    function setText(el, text) {
        if (el) el.textContent = text;
    }

    function renderKpi() {
        // 至少有一个数据来源才显示数字，否则一律显示占位符，避免用假数据冒充
        var hasSource = state.summary !== null || state.pageRows.length > 0;
        if (!hasSource) {
            setText(els.sales, '—');
            setText(els.orders, '—');
            setText(els.avg, '—');
            setText(els.quantity, '—');
            setText(els.hot, '—');
            return;
        }

        var kpi = state.summary || {};
        setText(els.sales, money(kpi.totalSales));
        setText(els.orders, (kpi.orderCount || 0).toLocaleString('zh-CN'));
        setText(els.avg, (kpi.orderCount || 0) > 0 ? money(kpi.avgOrderValue, 2) : '—');
        setText(els.quantity, (kpi.totalQuantity || 0).toLocaleString('zh-CN') + ' 件');
        var hot = kpi.hotGoodsCount;
        setText(els.hot, hot === null || hot === undefined ? '—' : String(hot));
    }

    function renderCharts() {
        Charts.renderTrend(els.chartLine, state.trendRows || []);
        Charts.renderCategoryBar(els.chartBar, state.categoryRows || []);
        Charts.renderTop10(els.chartTop10, state.topGoods || []);
        Charts.renderCategoryPie(els.chartPie, state.userRows || []);
    }

    function renderTable() {
        var pageRows = state.pageRows || [];
        var total = state.totalRows || 0;
        var pages = Math.max(1, state.totalPages || Math.ceil(total / state.size));
        if (state.page > pages) state.page = pages;
        if (state.page < 1) state.page = 1;

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
            '共 ' + total + ' 条' + (hasFilter() ? '（已应用筛选）' : ''));
    }

    function renderCategoryOptions() {
        var names = new Set((state.categories || []).map(function (name) { return String(name); }));
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
        renderKpi();
        renderCharts();
        renderTable();
        renderCategoryOptions();
        renderForecast();
    }

    /* ---------- F9 商家建议 ---------- */
    function metricLabel(metric) {
        return metric === 'qty' ? '销量' : '销售额';
    }

    function formatMetric(value, metric, digits) {
        if (metric === 'qty') {
            return Math.round(Number(value) || 0).toLocaleString('zh-CN') + ' 件';
        }
        return money(value, digits);
    }

    function growthText(rate) {
        var n = Number(rate) || 0;
        return (n >= 0 ? '+' : '') + (n * 100).toFixed(1) + '%';
    }

    function growthClass(rate) {
        var n = Number(rate) || 0;
        if (n > 0.005) return 'up';
        if (n < -0.005) return 'down';
        return 'flat';
    }

    function adviceClass(advice) {
        if (advice === '重点备货' || advice === '适量补货') return 'badge-up';
        if (advice === '减少进货' || advice === '控制库存') return 'badge-down';
        return 'badge-flat';
    }

    function renderAdviceList(items, metric) {
        if (!items || !items.length) {
            els.adviceTbody.innerHTML = '<tr class="table-empty"><td colspan="5">暂无预测数据</td></tr>';
            return;
        }
        els.adviceTbody.innerHTML = items.map(function (item) {
            return '<tr>' +
                '<td>' + escapeHtml(item.goodsName) + '</td>' +
                '<td>' + escapeHtml(item.category) + '</td>' +
                '<td class="num">' + formatMetric(item.predicted, metric) + '</td>' +
                '<td class="num growth ' + growthClass(item.growthRate) + '">' + growthText(item.growthRate) + '</td>' +
                '<td><span class="badge ' + adviceClass(item.advice) + '">' + escapeHtml(item.advice) + '</span></td>' +
                '</tr>';
        }).join('');
    }

    function renderForecast() {
        var data = state.forecast;
        var metric = state.forecastMetric;

        setText(els.forecastChartTitle, '预测榜 TOP10（' + (metric === 'qty' ? '件' : '元') + '，蓝涨红跌）');

        if (!data) {
            setText(els.adviceTotal, '—');
            setText(els.adviceQty, '—');
            setText(els.adviceGrowing, '—');
            setText(els.adviceDeclining, '—');
            setText(els.adviceSub, state.forecastError
                ? '预测加载失败：' + state.forecastError
                : '基于历史订单预测（最近 28 天日均 + 周内季节性 + 短期趋势）');
            setText(els.adviceTip, '');
            Charts.renderForecastBar(els.chartForecast, [], metric);
            els.adviceTbody.innerHTML = '<tr class="table-empty"><td colspan="5">暂无预测数据</td></tr>';
            return;
        }

        setText(els.adviceSub, ' · ' + data.horizonDays + '  天 · 按' + metricLabel(metric));
        setText(els.adviceTotal, formatMetric(data.summary.totalPredicted, metric));
        setText(els.adviceQty, formatMetric(data.summary.totalPredictedQty, 'qty'));
        setText(els.adviceGrowing, data.summary.growing + ' 个');
        setText(els.adviceDeclining, data.summary.declining + ' 个');

        Charts.renderForecastBar(els.chartForecast, data.items, metric);
        renderAdviceList(data.items.slice(0, 8), metric);
        setText(els.adviceTip, data.summary.tip || '');
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
    // 全量加载：KPI/品类/TOP10/趋势/饼图/品类选项/分页订单/商家建议 全部走后端（携带当前筛选条件）
    function loadAll() {
        if (state.loading) return;
        state.loading = true;
        state.failures = [];
        setText(els.updated, '加载中…');
        showStatus([]);

        var filters = state.filters;
        var tasks = [
            { name: '汇总指标', run: function () { return Api.fetchSummary(filters); }, done: function (d) { state.summary = d; } },
            { name: '品类销售', run: function () { return Api.fetchCategorySales(filters); }, done: function (d) { state.categoryRows = d; } },
            { name: '商品 TOP10', run: function () { return Api.fetchGoodsTop10('qty', filters); }, done: function (d) { state.topGoods = d; } },
            { name: '销售趋势', run: function () { return Api.fetchStats(filters, 'day'); }, done: function (d) { state.trendRows = d; } },
            { name: '用户占比', run: function () { return Api.fetchUserType(filters); }, done: function (d) { state.userRows = d; } },
            { name: '品类选项', run: function () { return Api.fetchCategories(); }, done: function (d) { state.categories = d || []; } },
            {
                name: '订单明细',
                run: function () { return Api.fetchOrdersPage(state.page, state.size, filters); },
                done: function (d) { state.pageRows = d.list; state.totalRows = d.total; state.totalPages = d.totalPages; }
            },
            {
                name: '商家建议',
                run: function () { return Api.fetchForecast(state.forecastHorizon, state.forecastMetric); },
                done: function (d) { state.forecast = d; state.forecastError = ''; }
            }
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
                        if (tasks[index].name === '商家建议') {
                            state.forecastError = reason && reason.message ? reason.message : '请求失败';
                        }
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

    // 分页：只向后端请求某一页（翻页真正走后端，不把全量拉到本地）
    function loadPage(n) {
        if (state.loading) return;
        state.loading = true;
        setText(els.updated, '查询中…');
        Api.fetchOrdersPage(n, state.size, state.filters)
            .then(function (d) {
                state.page = d.page || n;
                state.pageRows = d.list;
                state.totalRows = d.total;
                state.totalPages = d.totalPages;
                state.loading = false;
                renderTable();
                setText(els.updated, '第 ' + state.page + ' 页 · ' + new Date().toLocaleTimeString('zh-CN'));
            })
            .catch(function (err) {
                state.loading = false;
                showStatus(['订单分页查询失败：' + (err && err.message ? err.message : '请求失败')]);
            });
    }

    // 筛选/重置：回到第 1 页并整页走后端重新查询
    function loadFiltered() {
        state.page = 1;
        loadAll();
    }

    /* ---------- 事件 ---------- */
    function applyFilters() {
        state.filters = {
            category: els.select.value,
            start: els.start.value,
            end: els.end.value
        };
        loadFiltered();
    }

    function resetFilters() {
        els.select.value = '';
        els.start.value = '';
        els.end.value = '';
        state.filters = { category: '', start: '', end: '' };
        loadFiltered();
    }

    function debounce(fn, wait) {
        var timer = null;
        return function () {
            clearTimeout(timer);
            timer = setTimeout(fn, wait);
        };
    }

    function setActive(container, attribute, value) {
        Array.prototype.forEach.call(container.querySelectorAll('button'), function (button) {
            button.classList.toggle('active', button.getAttribute(attribute) === String(value));
        });
    }

    // 只刷新商家建议（切换区间/指标时不用重拉整页）
    function reloadForecast() {
        setText(els.adviceTotal, '…');
        Api.fetchForecast(state.forecastHorizon, state.forecastMetric)
            .then(function (data) {
                state.forecast = data;
                state.forecastError = '';
            })
            .catch(function (err) {
                state.forecast = null;
                state.forecastError = err && err.message ? err.message : '请求失败';
            })
            .then(function () {
                renderForecast();
            });
    }

    function bindEvents() {
        els.query.addEventListener('click', applyFilters);
        els.reset.addEventListener('click', resetFilters);

        [els.start, els.end].forEach(function (input) {
            input.addEventListener('keydown', function (event) {
                if (event.key === 'Enter') applyFilters();
            });
        });

        // F3 快捷选项：近7天/近30天/近90天（以数据里的最后一天为终点）
        document.querySelectorAll('.quick-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var days = Number(btn.getAttribute('data-days')) || 7;
                var latest = latestOrderDate();
                var endDate = latest ? new Date(latest + 'T00:00:00') : new Date();
                var startDate = new Date(endDate.getTime() - (days - 1) * 86400000);
                els.end.value = toLocalDateString(endDate);
                els.start.value = toLocalDateString(startDate);
                applyFilters();
            });
        });

        els.horizonSeg.addEventListener('click', function (event) {
            var button = event.target.closest ? event.target.closest('button[data-horizon]') : null;
            if (!button) return;
            state.forecastHorizon = Number(button.getAttribute('data-horizon')) || 30;
            setActive(els.horizonSeg, 'data-horizon', state.forecastHorizon);
            reloadForecast();
        });

        els.metricSeg.addEventListener('click', function (event) {
            var button = event.target.closest ? event.target.closest('button[data-metric]') : null;
            if (!button) return;
            state.forecastMetric = button.getAttribute('data-metric') === 'qty' ? 'qty' : 'revenue';
            setActive(els.metricSeg, 'data-metric', state.forecastMetric);
            reloadForecast();
        });

        els.prev.addEventListener('click', function () {
            if (state.page > 1) loadPage(state.page - 1);
        });

        els.next.addEventListener('click', function () {
            if (state.page < (state.totalPages || 1)) loadPage(state.page + 1);
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
            quantity: $('kpi-quantity'),
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
            chartPie: $('chart-pie'),
            chartForecast: $('chart-forecast'),
            forecastChartTitle: $('forecast-chart-title'),
            adviceTotal: $('advice-total'),
            adviceQty: $('advice-qty'),
            adviceGrowing: $('advice-growing'),
            adviceDeclining: $('advice-declining'),
            adviceTbody: $('advice-tbody'),
            adviceTip: $('advice-tip'),
            adviceSub: $('advice-sub'),
            horizonSeg: $('horizon-seg'),
            metricSeg: $('metric-seg')
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
