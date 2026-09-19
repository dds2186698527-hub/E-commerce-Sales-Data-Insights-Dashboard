CREATE DATABASE IF NOT EXISTS ecommerce_dashboard DEFAULT CHARACTER SET utf8mb4;
-- 选中这个数据库（关键！）
USE ecommerce_dashboard;

-- t_orders 电商订单表
CREATE TABLE `t_orders` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键自增',
  `order_no` varchar(64) NOT NULL COMMENT '订单号',
  `goods_name` varchar(128) NOT NULL COMMENT '商品名',
  `category` varchar(32) NOT NULL COMMENT '商品品类：手机/电脑/服饰/食品',
  `unit_price` decimal(10,2) NOT NULL COMMENT '单价',
  `quantity` int NOT NULL COMMENT '购买数量',
  `total_amount` decimal(10,2) NOT NULL COMMENT '订单商品总金额',
  `order_time` datetime NOT NULL COMMENT '下单时间',
  `user_id` varchar(32) NOT NULL COMMENT '用户ID',
  `user_type` varchar(16) NOT NULL COMMENT '用户类型：new新用户 old老用户',
  `pay_method` varchar(32) NOT NULL COMMENT '支付方式：微信、支付宝、银行卡',
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_order_time` (`order_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='电商订单表';