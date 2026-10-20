package com.ecommerce.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.ecommerce.dto.ForecastResponse;
import com.ecommerce.entity.TOrders;
import com.ecommerce.mapper.TOrdersMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * 商家建议：基于历史订单预测未来一段时间各商品的销售额/销量。
 *
 * 算法（可解释、不依赖外部模型）：
 * 1. 从 t_orders 按「商品 + 日期」聚合出日销售额、日销量；
 * 2. 用全体数据算出星期因子（星期几卖得更好），对预测做季节性修正；
 * 3. 以最近 28 天的日均值作为基准水位；
 * 4. 用最近 7 天与上一个 7 天的比值作为短期趋势，按预测天数做阻尼外推（最多放大/缩小到趋势值）；
 * 5. 逐日累加得到区间预测，并与「刚过去的同长度区间」对比得到环比增长率；
 * 6. 按增长率给出备货建议。
 *
 * 注意：订单表没有成本字段，所以「是否更赚钱」用销售额作为代理指标；
 *      需要真实毛利时请补充成本字段后替换 metric=profit。
 */
@Service
public class ForecastService {

    private static final int LOOKBACK_DAYS = 28;
    private static final int MAX_ITEMS = 30;

    @Autowired
    private TOrdersMapper ordersMapper;

    public ForecastResponse forecast(int horizonParam, String metricParam) {
        int horizon = (horizonParam == 7 || horizonParam == 30 || horizonParam == 90) ? horizonParam : 30;
        boolean byQty = "qty".equalsIgnoreCase(metricParam);
        String metric = byQty ? "qty" : "revenue";

        QueryWrapper<TOrders> wrapper = new QueryWrapper<>();
        wrapper.select("goods_name", "category", "DATE(order_time) AS d",
                        "SUM(total_amount) AS revenue", "SUM(quantity) AS qty")
                .groupBy("goods_name", "category", "DATE(order_time)");
        List<Map<String, Object>> rows = ordersMapper.selectMaps(wrapper);

        if (rows == null || rows.isEmpty()) {
            return new ForecastResponse(horizon, metric, null, now(), List.of(), List.of(),
                    new ForecastResponse.Summary(0, 0, 0, 0, "暂无订单数据，无法预测"));
        }

        // 商品 -> 每日 {销售额, 销量}
        Map<String, Goods> goodsMap = new LinkedHashMap<>();
        LocalDate minDate = null;
        LocalDate maxDate = null;

        for (Map<String, Object> row : rows) {
            String name = text(pick(row, "goods_name", "goodsName"));
            String category = text(pick(row, "category"));
            LocalDate date = toDate(pick(row, "d", "D"));
            if (name.isEmpty() || date == null) {
                continue;
            }
            double revenue = num(pick(row, "revenue", "REVENUE"));
            double qty = num(pick(row, "qty", "QTY"));

            Goods goods = goodsMap.computeIfAbsent(name + "\u0000" + category,
                    key -> new Goods(name, category));
            double[] cell = goods.daily.computeIfAbsent(date, key -> new double[2]);
            cell[0] += revenue;
            cell[1] += qty;

            if (minDate == null || date.isBefore(minDate)) {
                minDate = date;
            }
            if (maxDate == null || date.isAfter(maxDate)) {
                maxDate = date;
            }
        }

        if (maxDate == null) {
            return new ForecastResponse(horizon, metric, null, now(), List.of(), List.of(),
                    new ForecastResponse.Summary(0, 0, 0, 0, "暂无订单数据，无法预测"));
        }

        // 全局星期因子：先按日期汇总，再按星期几求均值，最后除以整体日均
        Map<LocalDate, double[]> dayTotals = new HashMap<>();
        for (Goods goods : goodsMap.values()) {
            for (Map.Entry<LocalDate, double[]> entry : goods.daily.entrySet()) {
                double[] total = dayTotals.computeIfAbsent(entry.getKey(), key -> new double[2]);
                total[0] += entry.getValue()[0];
                total[1] += entry.getValue()[1];
            }
        }
        double[] weekdaySum = new double[7];
        double[] weekdaySumQty = new double[7];
        int[] weekdayDays = new int[7];
        for (LocalDate date = minDate; !date.isAfter(maxDate); date = date.plusDays(1)) {
            double[] total = dayTotals.get(date);
            int index = date.getDayOfWeek().getValue() - 1;
            weekdaySum[index] += total == null ? 0 : total[0];
            weekdaySumQty[index] += total == null ? 0 : total[1];
            weekdayDays[index]++;
        }
        double[] weekdayFactor = factor(weekdaySum, weekdayDays);
        double[] weekdayFactorQty = factor(weekdaySumQty, weekdayDays);

        List<ForecastResponse.Item> items = new ArrayList<>();
        Map<String, double[]> categoryAgg = new LinkedHashMap<>();
        double totalPredicted = 0;
        long totalPredictedQty = 0;
        int growing = 0;
        int declining = 0;

        for (Goods goods : goodsMap.values()) {
            double levelRevenue = goods.sum(maxDate, LOOKBACK_DAYS, 0) / LOOKBACK_DAYS;
            double levelQty = goods.sum(maxDate, LOOKBACK_DAYS, 1) / LOOKBACK_DAYS;
            if (levelRevenue <= 0) {
                continue;
            }

            double trendRevenue = trend(goods, maxDate, 0);
            double trendQty = trend(goods, maxDate, 1);

            double predictedRevenue = 0;
            double predictedQty = 0;
            for (int i = 1; i <= horizon; i++) {
                LocalDate date = maxDate.plusDays(i);
                int index = date.getDayOfWeek().getValue() - 1;
                double ramp = Math.min(1.0, i / (double) LOOKBACK_DAYS);
                double factorRevenue = 1 + (trendRevenue - 1) * ramp;
                double factorQty = 1 + (trendQty - 1) * ramp;
                predictedRevenue += levelRevenue * factorRevenue * weekdayFactor[index];
                predictedQty += levelQty * factorQty * weekdayFactorQty[index];
            }

            double recentRevenue = goods.sum(maxDate, horizon, 0);
            double recentQty = goods.sum(maxDate, horizon, 1);
            double predicted = byQty ? predictedQty : predictedRevenue;
            double recent = byQty ? recentQty : recentRevenue;
            double growth = recent > 0 ? predicted / recent - 1 : (predicted > 0 ? 1 : 0);

            if (predicted <= 0) {
                continue;
            }

            String category = goods.category.isEmpty() ? "未分类" : goods.category;
            items.add(new ForecastResponse.Item(goods.name, category, round(predicted),
                    Math.round(predictedQty), round(recent), round(growth), advice(growth)));
            if (growth >= 0.05) {
                growing++;
            } else if (growth <= -0.05) {
                declining++;
            }

            double[] agg = categoryAgg.computeIfAbsent(category, key -> new double[4]);
            agg[0] += predictedRevenue;
            agg[1] += predictedQty;
            agg[2] += recentRevenue;
            agg[3] += recentQty;

            totalPredicted += predicted;
            totalPredictedQty += Math.round(predictedQty);
        }

        items.sort(Comparator.comparingDouble(ForecastResponse.Item::predicted).reversed());
        List<ForecastResponse.Item> topItems = items.size() > MAX_ITEMS ? items.subList(0, MAX_ITEMS) : items;

        List<ForecastResponse.CategoryItem> categories = new ArrayList<>();
        for (Map.Entry<String, double[]> entry : categoryAgg.entrySet()) {
            double[] agg = entry.getValue();
            double predicted = byQty ? agg[1] : agg[0];
            double recent = byQty ? agg[3] : agg[2];
            double growth = recent > 0 ? predicted / recent - 1 : (predicted > 0 ? 1 : 0);
            categories.add(new ForecastResponse.CategoryItem(entry.getKey(),
                    round(predicted), Math.round(agg[1]), round(growth)));
        }
        categories.sort(Comparator.comparingDouble(ForecastResponse.CategoryItem::predicted).reversed());

        ForecastResponse.Summary summary = new ForecastResponse.Summary(
                round(totalPredicted), totalPredictedQty, growing, declining,
                tip(horizon, byQty, totalPredicted, topItems, categories));

        return new ForecastResponse(horizon, metric, maxDate.toString(), now(),
                new ArrayList<>(topItems), categories, summary);
    }

    /** 最近 7 天日均 / 上一个 7 天日均，限制在 [0.5, 2.0]，避免单日波动放大。 */
    private double trend(Goods goods, LocalDate end, int index) {
        double lastWeek = goods.rangeSum(end.minusDays(6), end, index) / 7.0;
        double prevWeek = goods.rangeSum(end.minusDays(13), end.minusDays(7), index) / 7.0;
        if (prevWeek <= 0) {
            return lastWeek > 0 ? 1.5 : 1.0;
        }
        return Math.max(0.5, Math.min(2.0, lastWeek / prevWeek));
    }

    private double[] factor(double[] sums, int[] days) {
        double[] result = new double[7];
        double total = 0;
        int dayCount = 0;
        for (int i = 0; i < 7; i++) {
            total += sums[i];
            dayCount += days[i];
        }
        double overall = dayCount > 0 ? total / dayCount : 0;
        for (int i = 0; i < 7; i++) {
            double average = days[i] > 0 ? sums[i] / days[i] : overall;
            result[i] = (overall > 0 && average > 0) ? average / overall : 1.0;
        }
        return result;
    }

    private String advice(double growth) {
        if (growth >= 0.15) {
            return "重点备货";
        }
        if (growth >= 0.05) {
            return "适量补货";
        }
        if (growth <= -0.15) {
            return "减少进货";
        }
        if (growth <= -0.05) {
            return "控制库存";
        }
        return "保持稳定";
    }

    private String tip(int horizon, boolean byQty, double total,
                       List<ForecastResponse.Item> items,
                       List<ForecastResponse.CategoryItem> categories) {
        if (items.isEmpty()) {
            return "最近 28 天没有销售记录，暂时无法给出建议。";
        }
        String unit = byQty ? " 件" : " 元";
        StringBuilder sb = new StringBuilder();
        sb.append("未来 ").append(horizon).append(" 天预计")
                .append(byQty ? "销量 " : "销售额 ")
                .append(String.format("%,.0f", total)).append(unit).append("；");

        if (!categories.isEmpty()) {
            ForecastResponse.CategoryItem top = categories.get(0);
            sb.append("贡献最大的是「").append(top.category()).append("」，预计 ")
                    .append(String.format("%,.0f", top.predicted())).append(unit);
            double topGrowth = top.growthRate();
            sb.append(topGrowth >= 0.05 ? "，且仍在上涨" : topGrowth <= -0.05 ? "，但已在下滑" : "，走势平稳")
                    .append("；");
        }

        String hot = items.stream()
                .filter(item -> item.growthRate() >= 0.05)
                .limit(3)
                .map(ForecastResponse.Item::goodsName)
                .reduce((a, b) -> a + "、" + b)
                .orElse("");
        String cold = items.stream()
                .filter(item -> item.growthRate() <= -0.05)
                .limit(3)
                .map(ForecastResponse.Item::goodsName)
                .reduce((a, b) -> a + "、" + b)
                .orElse("");

        if (!hot.isEmpty()) {
            sb.append("建议优先备货：").append(hot).append("；");
        }
        if (!cold.isEmpty()) {
            sb.append("建议减少进货：").append(cold).append("。");
        } else {
            sb.append("暂无明显下滑商品，可按预测值正常备货。");
        }
        return sb.toString();
    }

    private String now() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    private static Object pick(Map<String, Object> row, String... keys) {
        for (String key : keys) {
            Object value = row.get(key);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private static String text(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static double num(Object value) {
        return value instanceof Number number ? number.doubleValue() : 0d;
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private static LocalDate toDate(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDate date) {
            return date;
        }
        if (value instanceof java.sql.Date date) {
            return date.toLocalDate();
        }
        if (value instanceof java.sql.Timestamp timestamp) {
            return timestamp.toLocalDateTime().toLocalDate();
        }
        if (value instanceof java.util.Date date) {
            return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
        }
        String text = String.valueOf(value);
        return LocalDate.parse(text.length() > 10 ? text.substring(0, 10) : text);
    }

    /** 单个商品的日序列（销售额、销量）。 */
    private static final class Goods {
        private final String name;
        private final String category;
        private final TreeMap<LocalDate, double[]> daily = new TreeMap<>();

        private Goods(String name, String category) {
            this.name = name;
            this.category = category;
        }

        private double value(LocalDate date, int index) {
            double[] cell = daily.get(date);
            return cell == null ? 0 : cell[index];
        }

        /** 以 end 结尾、长度为 days 的区间合计（缺失日期按 0 计）。 */
        private double sum(LocalDate end, int days, int index) {
            return rangeSum(end.minusDays(days - 1L), end, index);
        }

        private double rangeSum(LocalDate start, LocalDate end, int index) {
            double total = 0;
            for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
                total += value(date, index);
            }
            return total;
        }
    }
}
