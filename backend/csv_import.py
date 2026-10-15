import pymysql
import pandas as pd
import os

# 数据库配置
db_config = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": "123456",  # 改成你的mysql密码
    "database": "ecommerce_dashboard",
    "charset": "utf8mb4"
}

# 自动获取脚本所在目录，拼接csv路径
base_dir = os.path.dirname(__file__)
csv_path = os.path.join(base_dir, "..", "data", "ecommerce_data.csv")
csv_path = os.path.abspath(csv_path)
print("csv文件完整路径：", csv_path)

# 1. 读CSV
df = pd.read_csv(csv_path, encoding="utf-8")
print("CSV列名：", df.columns.tolist())
print("CSV总行数：", len(df))

# 2. 字段映射
df = df.rename(columns={
    "用户ID": "user_id",
    "商品名称": "goods_name",
    "商品类别": "category",
    "单价": "unit_price",
    "购买数量": "quantity",
    "消费金额": "total_amount",
    "购买时间": "order_time",
    "用户性别": "user_type"
})

# 重点：CSV没有订单号，新增order_no，自动生成1,2,3...
df["order_no"] = range(1, len(df) + 1)
# pay_method表中有，CSV没有，给个默认值
df["pay_method"] = "未知"

# 只保留表需要的列
cols = ["order_no", "goods_name", "category", "unit_price", "quantity",
        "total_amount", "order_time", "user_id", "user_type", "pay_method"]
df = df[cols]

# 3. 写入MySQL
conn = pymysql.connect(**db_config)
try:
    # 先清空旧数据
    with conn.cursor() as cur:
        cur.execute("TRUNCATE TABLE t_orders")

    # 批量插入
    sql = """
    INSERT INTO t_orders 
    (order_no, goods_name, category, unit_price, quantity, 
     total_amount, order_time, user_id, user_type, pay_method)
    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """
    rows = [tuple(r) for r in df.values]
    with conn.cursor() as cur:
        cur.executemany(sql, rows)
    conn.commit()
    print(f"✅ 成功导入 {len(rows)} 行数据到 t_orders")
except Exception as e:
    conn.rollback()
    print("❌ 导入失败：", e)
finally:
    conn.close()
