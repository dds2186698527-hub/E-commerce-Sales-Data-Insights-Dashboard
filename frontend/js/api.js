/*
 * api.js —— 数据请求层
 * 只负责：请求后端、超时/异常处理、字段归一化，不操作 DOM。
 * 后端：Spring Boot，server.port=8080，接口前缀 /api/order
 */
(function (global) {
    'use strict';

    // 后端基础地址（与 backend/src/main/resources/application.yml 的 server.port 保持一致）
    var API_BASE_URL = 'http://127.0.0.1:8080';

    var ENDPOINTS = {
        total: '/api/order/total',            // 订单总数 + 销售总额
        categorySales: '/api/order/category/sales', // 按品类销售额
        goodsTop10: '/api/order/goods/top10', // 商品销量 TOP10
        orderList: '/api/order/list'          // 订单明细
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

    // F1：{ orderCount, totalSales }
    function fetchSummary() {
        return request(ENDPOINTS.total).then(function (raw) {
            return {
                orderCount: toNumber(pick(raw, ['order_count', 'orderCount'])),
                totalSales: toNumber(pick(raw, ['all_sale', 'allSale']))
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

    // F8 / 客户端聚合：原始行 -> 规范化订单
    function fetchOrderList() {
        return request(ENDPOINTS.orderList).then(function (rows) {
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

    global.Api = {
        BASE_URL: API_BASE_URL,
        ENDPOINTS: ENDPOINTS,
        fetchSummary: fetchSummary,
        fetchCategorySales: fetchCategorySales,
        fetchGoodsTop10: fetchGoodsTop10,
        fetchOrderList: fetchOrderList
    };
})(window);
