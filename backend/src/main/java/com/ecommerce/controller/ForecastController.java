package com.ecommerce.controller;

import com.ecommerce.common.Result;
import com.ecommerce.dto.ForecastResponse;
import com.ecommerce.service.ForecastService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 商家建议接口：根据历史订单预测未来一段时间各商品的销售表现。
 */
@RestController
@RequestMapping("/api/forecast")
@CrossOrigin
@Tag(name = "商家建议接口")
public class ForecastController {

    @Autowired
    private ForecastService forecastService;

    @GetMapping
    @Operation(summary = "预测未来 7/30/90 天商品销售额或销量，并给出备货建议")
    public Result<ForecastResponse> forecast(
            @RequestParam(defaultValue = "30") int horizon,
            @RequestParam(defaultValue = "revenue") String metric) {
        return Result.success(forecastService.forecast(horizon, metric));
    }
}
