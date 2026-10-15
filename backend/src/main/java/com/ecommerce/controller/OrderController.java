package com.ecommerce.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.ecommerce.entity.TOrders;
import com.ecommerce.service.TOrdersService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/order")
@CrossOrigin //跨域，前端页面访问后端必备
@Tag(name = "订单数据接口")
public class OrderController {

    @Autowired
    private TOrdersService ordersService;

    // 接口1：查询全部订单
    @GetMapping("/list")
    @Operation(summary = "查询全部订单数据")
    public List<TOrders> getOrderList(){
        return ordersService.list();
    }

    // 接口2：按商品品类统计总销售额
    @GetMapping("/category/sales")
    @Operation(summary = "按品类统计销售额")
    public List<Map<String,Object>> getCategorySales(){
        QueryWrapper<TOrders> wrapper = new QueryWrapper<>();
        wrapper.select("category","SUM(total_amount) as sale_total")
                .groupBy("category");
        return ordersService.listMaps(wrapper);
    }

    // 接口3：商品销量TOP10
    @GetMapping("/goods/top10")
    @Operation(summary = "商品销量TOP10")
    public List<Map<String,Object>> getGoodsTop10(){
        QueryWrapper<TOrders> wrapper = new QueryWrapper<>();
        wrapper.select("goods_name","SUM(quantity) as total_qty")
                .groupBy("goods_name")
                .orderByDesc("total_qty")
                .last("LIMIT 10");
        return ordersService.listMaps(wrapper);
    }

    // 接口4：订单总数量 & 销售总额汇总
    @GetMapping("/total")
    @Operation(summary = "整体订单汇总统计")
    public Map<String,Object> getOrderTotal(){
        QueryWrapper<TOrders> wrapper = new QueryWrapper<>();
        wrapper.select("COUNT(id) as order_count","SUM(total_amount) as all_sale");
        return ordersService.getMap(wrapper);
    }

}
