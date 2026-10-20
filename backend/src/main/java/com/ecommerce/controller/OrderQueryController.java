package com.ecommerce.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.ecommerce.entity.TOrders;
import com.ecommerce.service.TOrdersService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 符合项目规范的订单接口（A1-A5）
 * A1 GET /api/categories     品类列表
 * A2 GET /api/orders         条件查询+分页
 * A3 GET /api/orders/kpi     KPI汇总
 * A4 GET /api/orders/ranking TOP10
 * A5 GET /api/orders/stats   按时间聚合
 */
@RestController
@RequestMapping("/api")
@CrossOrigin
@Tag(name = "订单规范接口(A1-A5)")
public class OrderQueryController {

    @Autowired
    private TOrdersService ordersService;

    // A1：返回所有品类列表
    @GetMapping("/categories")
    @Operation(summary = "A1 返回商品品类列表")
    public List<String> getCategories() {
        QueryWrapper<TOrders> wrapper = new QueryWrapper<>();
        wrapper.select("DISTINCT category");
        List<Map<String, Object>> rows = ordersService.listMaps(wrapper);
        return rows.stream()
                .map(r -> String.valueOf(r.get("category")))
                .sorted()
                .collect(Collectors.toList());
    }

    // A2：按条件查询订单（品类、起止日期、关键字）+ 分页
    @GetMapping("/orders")
    @Operation(summary = "A2 按条件分页查询订单")
    public Map<String, Object> getOrders(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {

        // 先查总数
        QueryWrapper<TOrders> countWrapper = new QueryWrapper<>();
        if (category != null && !category.isEmpty()) countWrapper.eq("category", category);
        if (startDate != null && !startDate.isEmpty()) countWrapper.ge("order_time", startDate + " 00:00:00");
        if (endDate != null && !endDate.isEmpty()) countWrapper.le("order_time", endDate + " 23:59:59");
        if (keyword != null && !keyword.isEmpty()) countWrapper.like("goods_name", keyword);
        long total = ordersService.count(countWrapper);

        // 再查当前页数据
        QueryWrapper<TOrders> dataWrapper = new QueryWrapper<>();
        if (category != null && !category.isEmpty()) dataWrapper.eq("category", category);
        if (startDate != null && !startDate.isEmpty()) dataWrapper.ge("order_time", startDate + " 00:00:00");
        if (endDate != null && !endDate.isEmpty()) dataWrapper.le("order_time", endDate + " 23:59:59");
        if (keyword != null && !keyword.isEmpty()) dataWrapper.like("goods_name", keyword);
        dataWrapper.orderByDesc("order_time");
        int offset = (page - 1) * size;
        dataWrapper.last("LIMIT " + offset + "," + size);
        List<TOrders> list = ordersService.list(dataWrapper);

        Map<String, Object> resp = new HashMap<>();
        resp.put("total", total);
        resp.put("page", page);
        resp.put("size", size);
        resp.put("totalPages", (long) Math.ceil((double) total / size));
        resp.put("list", list);
        return resp;
    }

    // A3：KPI汇总（总销售额、总订单数、平均客单价、热销商品数）
    @GetMapping("/orders/kpi")
    @Operation(summary = "A3 KPI汇总数据")
    public Map<String, Object> getKpi() {
        QueryWrapper<TOrders> wrapper = new QueryWrapper<>();
        wrapper.select(
                "COUNT(id) AS order_count",
                "SUM(total_amount) AS total_sales",
                "AVG(total_amount) AS avg_order_value"
        );
        Map<String, Object> row = ordersService.getMap(wrapper);

        // 热销商品数：销量 ≥ 平均单商品销量的商品数
        QueryWrapper<TOrders> goodsWrapper = new QueryWrapper<>();
        goodsWrapper.select("goods_name", "SUM(quantity) AS qty");
        goodsWrapper.groupBy("goods_name");
        List<Map<String, Object>> goodsRows = ordersService.listMaps(goodsWrapper);

        double avgQty = goodsRows.stream()
                .mapToDouble(r -> toDouble(r.get("qty")))
                .average().orElse(0);
        long hotCount = goodsRows.stream()
                .filter(r -> toDouble(r.get("qty")) >= avgQty)
                .count();

        Map<String, Object> kpi = new HashMap<>();
        kpi.put("totalSales", toDouble(row.get("total_sales")));
        kpi.put("orderCount", toLong(row.get("order_count")));
        kpi.put("avgOrderValue", toDouble(row.get("avg_order_value")));
        kpi.put("hotGoodsCount", hotCount);
        return kpi;
    }

    // A4：商品销售额/销量TOP10
    @GetMapping("/orders/ranking")
    @Operation(summary = "A4 商品TOP10排行")
    public List<Map<String, Object>> getRanking(
            @RequestParam(defaultValue = "qty") String metric) {
        String orderField = "qty".equalsIgnoreCase(metric) ? "total_qty" : "total_sales";
        QueryWrapper<TOrders> wrapper = new QueryWrapper<>();
        wrapper.select("goods_name", "SUM(quantity) AS total_qty", "SUM(total_amount) AS total_sales")
                .groupBy("goods_name")
                .orderByDesc(orderField)
                .last("LIMIT 10");
        return ordersService.listMaps(wrapper);
    }

    // A5：按时间粒度聚合销售额与订单量
    @GetMapping("/orders/stats")
    @Operation(summary = "A5 按时间粒度聚合销售额与订单量")
    public List<Map<String, Object>> getStats(
            @RequestParam(defaultValue = "day") String granularity) {
        String dateExpr;
        switch (granularity.toLowerCase()) {
            case "week":
                dateExpr = "YEARWEEK(order_time, 1)";
                break;
            case "month":
                dateExpr = "DATE_FORMAT(order_time, '%Y-%m')";
                break;
            default:
                dateExpr = "DATE(order_time)";
        }
        QueryWrapper<TOrders> wrapper = new QueryWrapper<>();
        wrapper.select(
                dateExpr + " AS date",
                "SUM(total_amount) AS sales",
                "COUNT(id) AS order_count"
        );
        wrapper.groupBy("date");
        wrapper.orderByAsc("date");
        return ordersService.listMaps(wrapper);
    }

    private double toDouble(Object v) {
        return v == null ? 0 : Double.parseDouble(v.toString());
    }

    private long toLong(Object v) {
        return v == null ? 0 : Long.parseLong(v.toString());
    }
}
