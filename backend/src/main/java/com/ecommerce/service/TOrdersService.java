package com.ecommerce.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.ecommerce.entity.TOrders;

import java.util.List;
import java.util.Map;

/**
 * 订单业务接口：所有查询/聚合逻辑放在 Service 层，
 * Controller 只负责参数接收与返回（自查清单#15：分层清晰，业务逻辑不写在 Controller）。
 */
public interface TOrdersService extends IService<TOrders> {

    /** A1 商品品类列表 */
    List<String> getCategories();

    /** A2 分页查询订单（支持 category / 时间范围 / 关键字） */
    Map<String, Object> pageOrders(String category, String startDate, String endDate,
                                   String keyword, int page, int size);

    /** 订单列表（支持品类/时间范围/关键字筛选，按时间倒序） */
    List<TOrders> listOrders(String category, String startDate, String endDate, String keyword);

    /** 全量订单（备用接口） */
    List<TOrders> listAll();

    /** A3 KPI 汇总（总销售额/订单数/客单价/总销量/热销商品数），支持筛选 */
    Map<String, Object> getKpi(String category, String startDate, String endDate);

    /** A4 商品销量/销售额 TOP10，支持筛选 */
    List<Map<String, Object>> getRanking(String metric, String category, String startDate, String endDate);

    /** 按品类统计销售额，支持筛选 */
    List<Map<String, Object>> getCategorySales(String category, String startDate, String endDate);

    /** A5 按 day/week/month 聚合销售额与订单量，支持筛选 */
    List<Map<String, Object>> getStats(String granularity, String category, String startDate, String endDate);

    /** 新老用户订单占比，支持筛选 */
    List<Map<String, Object>> getUserTypeRatio(String category, String startDate, String endDate);
}
