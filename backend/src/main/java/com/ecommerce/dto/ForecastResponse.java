package com.ecommerce.dto;

import java.util.List;

/**
 * 商家建议（销量/销售额预测）接口的返回结构。
 *
 * @param horizonDays 预测区间：7 / 30 / 90 天
 * @param metric      指标：revenue=销售额（默认，作为利润的代理指标） / qty=销量
 * @param baseDate    预测基准日（订单数据里的最后一天）
 * @param generatedAt 计算时间
 * @param items       按预测值降序的商品列表
 * @param categories  品类级预测汇总
 * @param summary     整体预测与建议
 */
public record ForecastResponse(
        int horizonDays,
        String metric,
        String baseDate,
        String generatedAt,
        List<Item> items,
        List<CategoryItem> categories,
        Summary summary) {

    /**
     * @param predicted    预测值：metric=revenue 时是金额，metric=qty 时是件数
     * @param predictedQty 预测销量（件）
     * @param recent       上一周期实际值（同 metric）
     * @param growthRate   环比增长率（小数，0.12 = +12%）
     * @param advice       建议文案：重点备货 / 适量补货 / 保持稳定 / 减少进货
     */
    public record Item(
            String goodsName,
            String category,
            double predicted,
            long predictedQty,
            double recent,
            double growthRate,
            String advice) {
    }

    public record CategoryItem(
            String category,
            double predicted,
            long predictedQty,
            double growthRate) {
    }

    /**
     * @param totalPredicted    区间预测总额（或总件数）
     * @param totalPredictedQty 区间预测总销量
     * @param growing           增长商品数
     * @param declining         下滑商品数
     * @param tip               一句话结论，直接给商家看的建议
     */
    public record Summary(
            double totalPredicted,
            long totalPredictedQty,
            int growing,
            int declining,
            String tip) {
    }
}
