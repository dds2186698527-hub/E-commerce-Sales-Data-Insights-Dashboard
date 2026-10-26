package com.ecommerce.controller;

import com.ecommerce.common.Result;
import com.ecommerce.entity.TOrders;
import com.ecommerce.service.TOrdersService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 订单数据接口（统一返回 Result&lt;T&gt;，聚合逻辑在 Service 层）。
 */
@RestController
@RequestMapping("/api")
@CrossOrigin
@Tag(name = "订单数据接口")
public class OrderController {

    @Autowired
    private TOrdersService ordersService;

    @GetMapping("/categories")
    @Operation(summary = "A1 返回商品品类列表")
    public Result<List<String>> getCategories() {
        return Result.success(ordersService.getCategories());
    }

    @GetMapping("/orders")
    @Operation(summary = "A2 按条件分页查询订单")
    public Result<Map<String, Object>> getOrders(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        return Result.success(ordersService.pageOrders(category, startDate, endDate, keyword, page, size));
    }

    // 订单列表（可带筛选条件，供前端聚合与明细使用）——筛选由后端 WHERE 完成
    @GetMapping("/orders/list")
    @Operation(summary = "查询订单数据（支持品类/日期/关键字筛选）")
    public Result<List<TOrders>> getOrderList(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String keyword) {
        return Result.success(ordersService.listOrders(category, startDate, endDate, keyword));
    }

    @GetMapping("/orders/kpi")
    @Operation(summary = "A3 KPI 汇总数据（总销售额/订单数/客单价/总销量/热销商品数）")
    public Result<Map<String, Object>> getKpi(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return Result.success(ordersService.getKpi(category, startDate, endDate));
    }

    @GetMapping("/orders/ranking")
    @Operation(summary = "A4 商品销量/销售额 TOP10")
    public Result<List<Map<String, Object>>> getRanking(
            @RequestParam(defaultValue = "qty") String metric,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return Result.success(ordersService.getRanking(metric, category, startDate, endDate));
    }

    @GetMapping("/orders/category-sales")
    @Operation(summary = "按品类统计销售额")
    public Result<List<Map<String, Object>>> getCategorySales(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return Result.success(ordersService.getCategorySales(category, startDate, endDate));
    }

    @GetMapping("/orders/stats")
    @Operation(summary = "A5 按 day/week/month 聚合销售额与订单量")
    public Result<List<Map<String, Object>>> getStats(
            @RequestParam(defaultValue = "day") String granularity,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return Result.success(ordersService.getStats(granularity, category, startDate, endDate));
    }

    @GetMapping("/orders/user-type")
    @Operation(summary = "新老用户订单占比")
    public Result<List<Map<String, Object>>> getUserType(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return Result.success(ordersService.getUserTypeRatio(category, startDate, endDate));
    }
}
