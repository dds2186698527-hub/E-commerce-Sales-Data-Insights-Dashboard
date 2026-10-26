package com.ecommerce.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_orders")
public class TOrders {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String orderNo;
    private String goodsName;
    private String category;
    private BigDecimal unitPrice;
    private Integer quantity;
    private BigDecimal totalAmount;
    private LocalDateTime orderTime;
    private String userId;
    private String userType;
    private String payMethod;
}
