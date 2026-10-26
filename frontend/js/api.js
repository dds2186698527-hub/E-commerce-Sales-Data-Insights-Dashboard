/*
 * api.js —— 数据请求层（前端唯一和后端通信的地方）
 * 职责：拼接口地址、设置超时、统一异常处理、解包后端 Result<T>、把数据归一化成前端好用的结构。
 * 不负责：DOM 操作和图表渲染（分别在 main.js / charts.js）。
 * 依赖：后端 Spring Boot（默认 http://127.0.0.1:8080）。
 * 后端契约：所有接口返回 { code, message, data }，code=200 成功，data 承载数据。
 */
(function (global) {
    'use strict';

    // 后端基础地址（与 backend/src/main/resources/application.yml 的 server.port 保持一致）
    var API_BASE_URL = 'http://127.0.0.1:8080';

    var ENDPOINTS = {
        categories: '/api/categories',            // A1 品类列表
        kpi: '/api/orders/kpi',                   // A3 KPI汇总（销售额/订单数/客单价/总销量/热销商品数）
        categorySales: '/api/orders/category-sales', // 按品类销售额
        goodsTop10: '/api/orders/ranking',        // A4 商品 TOP10（metric=qty|revenue）
        stats: '/api/orders/stats',                // A5 按 day/week/month 聚合
        userType: '/api/orders/user-type',         // 新老用户订单占比
        orderList: '/api/orders/list',             // 订单列表（带筛选）
        ordersPage: '/api/orders',                 // A2 分页订单（page/size + 筛选）
        forecast: '/api/forecast'                  // 商家建议：未来 7/30/90 天销量或销售额预测
    };

    var REQUEST_TIMEOUT = 8000;

    function ApiError(message, path, cause) {
        var err = new Error(message);
        err.name = 'ApiError';
        err.path = path;
        err.cause = cause;
        return err;
    }

    // 发起请求：超时控制、HTTP 状态检查、JSON 解析、解包 Result<T>
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
            .then(function (json) {
                // 统一解包 Result<T>：{ code, message, data }
                if (json && typeof json === 'object' && 'code' in json && 'data' in json) {
                    if (json.code !== 200) {
                        throw ApiError(json.message || ('业务错误 ' + json.code), path);
                    }
                    return json.data;
                }
                return json; // 兼容非 Result 结构
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

    // 把筛选条件拼成查询串（品类/开始日期/结束日期）+ 额外参数
    function buildQuery(filters, extra) {
        var parts = (extra || []).slice();
        if (filters) {
            if (filters.category) parts.push('category=' + encodeURIComponent(filters.category));
            if (filters.start) parts.push('startDate=' + encodeURIComponent(filters.start));
            if (filters.end) parts.push('endDate=' + encodeURIComponent(filters.end));
        }
        return parts.length ? '?' + parts.join('&') : '';
    }

    // A1 品类列表（供筛选下拉框）
    function fetchCategories() {
        return request(ENDPOINTS.categories);
    }

    // F1：KPI汇总（可带筛选）
    function fetchSummary(filters) {
        return request(ENDPOINTS.kpi + buildQuery(filters)).then(function (raw) {
            return {
                orderCount: toNumber(pick(raw, ['orderCount', 'order_count'])),
                totalSales: toNumber(pick(raw, ['totalSales', 'total_sales', 'all_sale', 'allSale'])),
                avgOrderValue: toNumber(pick(raw, ['avgOrderValue', 'avg_order_value'])),
                totalQuantity: toNumber(pick(raw, ['totalQuantity', 'total_quantity'])),
                hotGoodsCount: pick(raw, ['hotGoodsCount', 'hot_goods_count']) === undefined
                    ? null : toNumber(pick(raw, ['hotGoodsCount', 'hot_goods_count']))
            };
        });
    }

    // F5：原始行 -> [{ category, saleTotal }]（可带筛选）
    function fetchCategorySales(filters) {
        return request(ENDPOINTS.categorySales + buildQuery(filters)).then(function (rows) {
            return (rows || []).map(function (row) {
                return {
                    category: toText(pick(row, ['category', 'CATEGORY'])) || '未分类',
                    saleTotal: toNumber(pick(row, ['sale_total', 'saleTotal']))
                };
            });
        });
    }

    // F6：商品 TOP10（可带筛选）
    function fetchGoodsTop10(metric, filters) {
        var m = metric === 'qty' ? 'qty' : 'revenue';
        return request(ENDPOINTS.goodsTop10 + buildQuery(filters, ['metric=' + m])).then(function (rows) {
            return (rows || []).map(function (row) {
                return {
                    goodsName: toText(pick(row, ['goods_name', 'goodsName'])) || '未知商品',
                    totalQty: toNumber(pick(row, ['total_qty', 'totalQty'])),
                    totalSales: toNumber(pick(row, ['total_sales', 'totalSales']))
                };
            });
        });
    }

    // A5 时间趋势（可带筛选，granularity=day|week|month）
    function fetchStats(filters, granularity) {
        return request(ENDPOINTS.stats + buildQuery(filters, ['granularity=' + granularity])).then(function (rows) {
            return (rows || []).map(function (row) {
                return {
                    date: toText(pick(row, ['date'])),
                    sales: toNumber(pick(row, ['sales', 'sales_total'])),
                    orderCount: toNumber(pick(row, ['order_count', 'orderCount']))
                };
            });
        });
    }

    // 新老用户订单占比（可带筛选）
    function fetchUserType(filters) {
        return request(ENDPOINTS.userType + buildQuery(filters)).then(function (rows) {
            return (rows || []).map(function (row) {
                var t = toText(pick(row, ['user_type', 'userType']));
                return {
                    category: t === 'new' ? '新用户' : (t === 'old' ? '老用户' : '未知'),
                    saleTotal: toNumber(pick(row, ['cnt', 'count']))
                };
            });
        });
    }

    // 原始订单行 -> 规范化订单
    function normalizeOrder(row) {
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
    }

    // A2 分页订单：后端按 page/size 返回一页 + total（翻页/明细真正走后端）
    function fetchOrdersPage(page, size, filters, keyword) {
        var extra = ['page=' + page, 'size=' + size];
        if (keyword) extra.push('keyword=' + encodeURIComponent(keyword));
        return request(ENDPOINTS.ordersPage + buildQuery(filters, extra)).then(function (raw) {
            return {
                list: (raw.list || []).map(normalizeOrder),
                total: toNumber(pick(raw, ['total'])),
                page: toNumber(pick(raw, ['page'])),
                totalPages: toNumber(pick(raw, ['totalPages', 'total_pages']))
            };
        });
    }

    // 订单列表（可带筛选，全量；分页场景建议用 fetchOrdersPage）
    function fetchOrderList(filters) {
        return request(ENDPOINTS.orderList + buildQuery(filters)).then(function (rows) {
            return (rows || []).map(normalizeOrder);
        });
    }

    // F9 商家建议：预测未来 N 天各商品的销售额/销量
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
        fetchCategories: fetchCategories,
        fetchSummary: fetchSummary,
        fetchCategorySales: fetchCategorySales,
        fetchGoodsTop10: fetchGoodsTop10,
        fetchStats: fetchStats,
        fetchUserType: fetchUserType,
        fetchOrdersPage: fetchOrdersPage,
        fetchOrderList: fetchOrderList,
        fetchForecast: fetchForecast
    };
})(window);
