/*
 * api.js —— 数据请求层（前端唯一和后端通信的地方）
 * 职责：拼接口地址、设置超时、统一异常处理、把后端原始 JSON 归一化成前端好用的结构。
 * 不负责：DOM 操作和图表渲染（分别在 main.js / charts.js）。
 * 依赖：后端 Spring Boot（默认 http://127.0.0.1:8080），接口前缀 /api/order、/api/forecast。
 */
(function (global) {
    'use strict';

    // 后端基础地址（与 backend/src/main/resources/application.yml 的 server.port 保持一致）
    var API_BASE_URL = 'http://127.0.0.1:8080';

    var ENDPOINTS = {
        kpi: '/api/orders/kpi',               // KPI汇总（销售额/订单数/客单价/热销商品数）
        categorySales: '/api/orders/category-sales', // 按品类销售额
        goodsTop10: '/api/orders/ranking?metric=qty', // 商品销量 TOP10
        orderList: '/api/orders/list',        // 订单明细全量
        forecast: '/api/forecast'             // 商家建议：未来 7/30/90 天销量或销售额预测
    };

    var REQUEST_TIMEOUT = 8000;

    function ApiError(message, path, cause) {
        var err = new Error(message);
        err.name = 'ApiError';
        err.path = path;
        err.cause = cause;
        return err;
    }

    function request(path) {
        var controller = typeof AbortController === 'function' ? new AbortController() : null;
        var timer = controller ? setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT) : null;

        return fetch(API_BASE_URL + path, controller ? { signal: controller.signal } : {})
            .catch(function (err) {
                throw ApiError(
                    err && err.name === 'AbortError'
                        ? '请求超时（' + (REQUEST_TIMEOUT / 1000) + ' 秒）'
                        : '无法连接后端（服务未启动或跨域被拒绝）',
                    path,
                    err
                );
            })
            .then(function (res) {
                if (!res.ok) throw ApiError('HTTP ' + res.status, path);
                return res.text();
            })
            .then(function (text) {
                try {
                    return JSON.parse(text);
                } catch (err) {
                    throw ApiError('返回内容不是合法 JSON', path, err);
                }
            })
            .finally(function () {
                if (timer) clearTimeout(timer);
            });
    }

    // 兼容 MyBatis-Plus listMaps/getMap 返回下划线或驼峰两种情况
    function pick(obj, keys) {
        if (!obj) return undefined;
        for (var i = 0; i < keys.length; i++) {
            if (obj[keys[i]] !== undefined && obj[keys[i]] !== null) return obj[keys[i]];
        }
        return undefined;
    }

    function toNumber(value) {
        var n = Number(value);
        return isFinite(n) ? n : 0;
    }

    function toText(value) {
        return value === undefined || value === null ? '' : String(value);
    }

    // LocalDateTime 序列化后形如 2026-10-19T08:06:59，统一成 2026-10-19 08:06:59 便于展示和排序
    function toDateTime(value) {
        return toText(value).replace('T', ' ').slice(0, 19);
    }

    // F1：KPI汇总
    function fetchSummary() {
        return request(ENDPOINTS.kpi).then(function (raw) {
            return {
                orderCount: toNumber(pick(raw, ['orderCount', 'order_count'])),
                totalSales: toNumber(pick(raw, ['totalSales', 'total_sales', 'all_sale', 'allSale'])),
                avgOrderValue: toNumber(pick(raw, ['avgOrderValue', 'avg_order_value'])),
                hotGoodsCount: toNumber(pick(raw, ['hotGoodsCount', 'hot_goods_count']))
            };
        });
    }

    // F5：原始行 -> [{ category, saleTotal }]
    function fetchCategorySales() {
        return request(ENDPOINTS.categorySales).then(function (rows) {
            return (rows || []).map(function (row) {
                return {
                    category: toText(pick(row, ['category', 'CATEGORY'])) || '未分类',
                    saleTotal: toNumber(pick(row, ['sale_total', 'saleTotal']))
                };
            });
        });
    }

    // F6：原始行 -> [{ goodsName, totalQty }]
    function fetchGoodsTop10() {
        return request(ENDPOINTS.goodsTop10).then(function (rows) {
            return (rows || []).map(function (row) {
                return {
                    goodsName: toText(pick(row, ['goods_name', 'goodsName'])) || '未知商品',
                    totalQty: toNumber(pick(row, ['total_qty', 'totalQty']))
                };
            });
        });
    }

    // 把筛选条件拼成查询串（品类/开始日期/结束日期）
    function filterQuery(filters) {
        if (!filters) return '';
        var parts = [];
        if (filters.category) parts.push('category=' + encodeURIComponent(filters.category));
        if (filters.start) parts.push('startDate=' + encodeURIComponent(filters.start));
        if (filters.end) parts.push('endDate=' + encodeURIComponent(filters.end));
        return parts.length ? '?' + parts.join('&') : '';
    }

    // F8 / 客户端聚合：原始行 -> 规范化订单（可带筛选条件，筛选由后端 WHERE 完成）
    function fetchOrderList(filters) {
        return request(ENDPOINTS.orderList + filterQuery(filters)).then(function (rows) {
            return (rows || []).map(function (row) {
                return {
                    id: toNumber(pick(row, ['id'])),
                    orderNo: toText(pick(row, ['order_no', 'orderNo'])),
                    goodsName: toText(pick(row, ['goods_name', 'goodsName'])),
                    category: toText(pick(row, ['category'])),
                    unitPrice: toNumber(pick(row, ['unit_price', 'unitPrice'])),
                    quantity: toNumber(pick(row, ['quantity'])),
                    totalAmount: toNumber(pick(row, ['total_amount', 'totalAmount'])),
                    orderTime: toDateTime(pick(row, ['order_time', 'orderTime'])),
                    userId: toText(pick(row, ['user_id', 'userId'])),
                    userType: toText(pick(row, ['user_type', 'userType'])),
                    payMethod: toText(pick(row, ['pay_method', 'payMethod']))
                };
            });
        });
    }

    // F9 商家建议：预测未来 N 天各商品的销售额/销量
    // 返回 { horizonDays, metric, baseDate, items[], categories[], summary }
    function fetchForecast(horizonDays, metric) {
        var query = '?horizon=' + encodeURIComponent(horizonDays) + '&metric=' + encodeURIComponent(metric);
        return request(ENDPOINTS.forecast + query).then(function (raw) {
            raw = raw || {};
            var summary = raw.summary || {};
            return {
                horizonDays: toNumber(pick(raw, ['horizonDays', 'horizon_days'])),
                metric: toText(pick(raw, ['metric'])) || metric,
                baseDate: toText(pick(raw, ['baseDate', 'base_date'])),
                items: (raw.items || []).map(function (item) {
                    return {
                        goodsName: toText(pick(item, ['goodsName', 'goods_name'])) || '未知商品',
                        category: toText(pick(item, ['category'])) || '未分类',
                        predicted: toNumber(pick(item, ['predicted'])),
                        predictedQty: toNumber(pick(item, ['predictedQty', 'predicted_qty'])),
                        recent: toNumber(pick(item, ['recent'])),
                        growthRate: toNumber(pick(item, ['growthRate', 'growth_rate'])),
                        advice: toText(pick(item, ['advice']))
                    };
                }),
                categories: (raw.categories || []).map(function (item) {
                    return {
                        category: toText(pick(item, ['category'])) || '未分类',
                        predicted: toNumber(pick(item, ['predicted'])),
                        predictedQty: toNumber(pick(item, ['predictedQty', 'predicted_qty'])),
                        growthRate: toNumber(pick(item, ['growthRate', 'growth_rate']))
                    };
                }),
                summary: {
                    totalPredicted: toNumber(pick(summary, ['totalPredicted', 'total_predicted'])),
                    totalPredictedQty: toNumber(pick(summary, ['totalPredictedQty', 'total_predicted_qty'])),
                    growing: toNumber(pick(summary, ['growing'])),
                    declining: toNumber(pick(summary, ['declining'])),
                    tip: toText(pick(summary, ['tip']))
                }
            };
        });
    }

    global.Api = {
        BASE_URL: API_BASE_URL,
        ENDPOINTS: ENDPOINTS,
        fetchSummary: fetchSummary,
        fetchCategorySales: fetchCategorySales,
        fetchGoodsTop10: fetchGoodsTop10,
        fetchOrderList: fetchOrderList,
        fetchForecast: fetchForecast
    };
})(window);
