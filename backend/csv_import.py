import pymysql
import pandas as pd
import os
import random

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
csv_path = os.path.join(base_dir, "..", "data", "finall.csv")
csv_path = os.path.abspath(csv_path)
print("csv文件完整路径：", csv_path)

# 1. 读CSV
df = pd.read_csv(csv_path, encoding="utf-8")
print("CSV列名：", df.columns.tolist())
print("CSV总行数：", len(df))

# 2. 字段映射（注意：CSV 中的"用户性别"列不导入，表结构中无性别字段）
df = df.rename(columns={
    "用户ID": "user_id",
    "商品名称": "goods_name",
    "商品类别": "category",
    "单价": "unit_price",
    "购买数量": "quantity",
    "消费金额": "total_amount",
    "购买时间": "order_time"
})

# 重点：CSV没有订单号，新增order_no，自动生成1,2,3...
df["order_no"] = range(1, len(df) + 1)

# user_type：新老用户判定
# 规则：
#   1) 若源数据里已含新老用户字段（新老用户 / 用户类型 / user_type），直接采用；
#   2) 若没有该字段，则按购买次数判定：同一用户ID购买 >= 2 次算老用户，仅购买 1 次算新用户。

def _classify_user_type(df):
    # 1) 数据里已有新老用户字段 -> 直接用
    for col in ("新老用户", "用户类型", "user_type"):
        if col in df.columns:
            v = df[col].astype(str).str.strip().str.lower()
            ut = v.map(lambda x: "new" if ("新" in x or x in ("new", "n"))
                       else ("old" if ("老" in x or x in ("old", "o")) else "new"))
            print(f"✅ 数据含新老用户字段 {col}，直接采用")
            return ut
    # 2) 无字段 -> 按购买次数：同一用户ID >= 2 次购买为老用户，仅 1 次为新用户
    cnt = df.groupby("user_id")["order_no"].transform("count")
    ut = cnt.apply(lambda c: "old" if c >= 2 else "new")
    print(f"⚠️ 数据无新老用户字段，按购买次数判定：同一用户购买 >=2 次为老用户，仅 1 次为新用户")
    return ut

df["user_type"] = _classify_user_type(df)

# pay_method：CSV里有"支付方式"列就直接用，没有则统一填"未知"
if "支付方式" in df.columns:
    df = df.rename(columns={"支付方式": "pay_method"})
    print("✅ CSV含支付方式列，直接使用真实数据")
else:
    df["pay_method"] = "未知"
    print("⚠️ CSV无支付方式列，默认填'未知'")

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
