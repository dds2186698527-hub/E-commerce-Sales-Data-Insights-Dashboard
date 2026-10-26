package com.ecommerce.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.ecommerce.entity.TOrders;
import com.ecommerce.mapper.TOrdersMapper;
import com.ecommerce.service.TOrdersService;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 订单业务实现：把聚合 SQL 统一收敛到 Service 层（自查清单#15）。
 */
@Service
public class TOrdersServiceImpl extends ServiceImpl<TOrdersMapper, TOrders> implements TOrdersService {

    @Override
    public List<String> getCategories() {
        QueryWrapper<TOrders> wrapper = new QueryWrapper<>();
        wrapper.select("DISTINCT category");
        return listMaps(wrapper).stream()
                .map(r -> String.valueOf(r.get("category")))
                .sorted()
                .collect(Collectors.toList());
    }

    @Override
    public Map<String, Object> pageOrders(String category, String startDate, String endDate,
                                          String keyword, int page, int size) {
        long total = count(buildQuery(category, startDate, endDate, keyword));

        QueryWrapper<TOrders> dataWrapper = buildQuery(category, startDate, endDate, keyword);
        dataWrapper.orderByDesc("order_time");
        dataWrapper.last("LIMIT " + (page - 1) * size + "," + size);
        List<TOrders> list = list(dataWrapper);

        Map<String, Object> resp = new HashMap<>();
        resp.put("total", total);
        resp.put("page", page);
        resp.put("size", size);
        resp.put("totalPages", (long) Math.ceil((double) total / size));
        resp.put("list", list);
        return resp;
    }

    @Override
    public List<TOrders> listAll() {
        return list();
    }

    @Override
    public Map<String, Object> getKpi(String category, String startDate, String endDate) {
        // 汇总金额/订单数/客单价/总销量
        QueryWrapper<TOrders> sumWrapper = buildQuery(category, startDate, endDate);
        sumWrapper.select("COUNT(id) AS order_count",
                "SUM(total_amount) AS total_sales",
                "AVG(total_amount) AS avg_order_value",
                "SUM(quantity) AS total_quantity");
        Map<String, Object> sumRow = getMap(sumWrapper);

        // 热销商品数：销量 >= 全部商品平均销量的商品个数
        QueryWrapper<TOrders> goodsWrapper = buildQuery(category, startDate, endDate);
        goodsWrapper.select("goods_name", "SUM(quantity) AS qty").groupBy("goods_name");
        List<Map<String, Object>> goodsRows = listMaps(goodsWrapper);
        double avgQty = goodsRows.stream().mapToDouble(r -> toDouble(r.get("qty"))).average().orElse(0);
        long hotCount = goodsRows.stream().filter(r -> toDouble(r.get("qty")) >= avgQty).count();

        Map<String, Object> kpi = new HashMap<>();
        kpi.put("totalSales", toDouble(sumRow.get("total_sales")));
        kpi.put("orderCount", toLong(sumRow.get("order_count")));
        kpi.put("avgOrderValue", toDouble(sumRow.get("avg_order_value")));
        kpi.put("totalQuantity", toDouble(sumRow.get("total_quantity")));   // 第5个KPI：总销量
        kpi.put("hotGoodsCount", hotCount);
        return kpi;
    }

    @Override
    public List<Map<String, Object>> getRanking(String metric, String category, String startDate, String endDate) {
        String orderField = "qty".equalsIgnoreCase(metric) ? "total_qty" : "total_sales";
        QueryWrapper<TOrders> wrapper = buildQuery(category, startDate, endDate);
        wrapper.select("goods_name", "SUM(quantity) AS total_qty", "SUM(total_amount) AS total_sales")
                .groupBy("goods_name")
                .orderByDesc(orderField)
                .last("LIMIT 10");
        return listMaps(wrapper);
    }

    @Override
    public List<Map<String, Object>> getCategorySales(String category, String startDate, String endDate) {
        QueryWrapper<TOrders> wrapper = buildQuery(category, startDate, endDate);
        wrapper.select("category", "SUM(total_amount) AS sale_total").groupBy("category");
        return listMaps(wrapper);
    }

    @Override
    public List<Map<String, Object>> getStats(String granularity, String category, String startDate, String endDate) {
        String dateExpr;
        switch (granularity.toLowerCase()) {
            case "week":  dateExpr = "YEARWEEK(order_time, 1)"; break;
            case "month": dateExpr = "DATE_FORMAT(order_time, '%Y-%m')"; break;
            default:      dateExpr = "DATE(order_time)";
        }
        QueryWrapper<TOrders> wrapper = buildQuery(category, startDate, endDate);
        wrapper.select(dateExpr + " AS date", "SUM(total_amount) AS sales", "COUNT(id) AS order_count")
                .groupBy("date")
                .orderByAsc("date");
        return listMaps(wrapper);
    }

    @Override
    public List<Map<String, Object>> getUserTypeRatio(String category, String startDate, String endDate) {
        QueryWrapper<TOrders> wrapper = buildQuery(category, startDate, endDate);
        wrapper.select("user_type", "COUNT(id) AS cnt").groupBy("user_type");
        return listMaps(wrapper);
    }

    /** 基础筛选条件：品类 + 时间范围 */
    private QueryWrapper<TOrders> buildQuery(String category, String startDate, String endDate) {
        QueryWrapper<TOrders> wrapper = new QueryWrapper<>();
        if (category != null && !category.isEmpty()) {
            wrapper.eq("category", category);
        }
        if (startDate != null && !startDate.isEmpty()) {
            wrapper.ge("order_time", startDate + " 00:00:00");
        }
        if (endDate != null && !endDate.isEmpty()) {
            wrapper.le("order_time", endDate + " 23:59:59");
        }
        return wrapper;
    }

    /** 订单分页附加关键字筛选（商品名模糊匹配） */
    private QueryWrapper<TOrders> buildQuery(String category, String startDate, String endDate, String keyword) {
        QueryWrapper<TOrders> wrapper = buildQuery(category, startDate, endDate);
        if (keyword != null && !keyword.isEmpty()) {
            wrapper.like("goods_name", keyword);
        }
        return wrapper;
    }

    private double toDouble(Object v) {
        return v == null ? 0 : Double.parseDouble(v.toString());
    }

    private long toLong(Object v) {
        return v == null ? 0 : Long.parseLong(v.toString());
    }
}
