# preprocess_tianchi.py
# 支持读取data目录下多个天池原始csv文件，合并、清洗、补全字段
import csv
import random
import glob

# 匹配data目录下所有原始csv文件
ORIGIN_FILES = glob.glob("tianchi_*.csv")
OUTPUT_CSV = "orders.csv"

pay_method_list = ["微信", "支付宝", "银行卡"]
user_type_list = ["new", "old"]

out_rows = []

for file_path in ORIGIN_FILES:
    print(f"正在读取原始文件：{file_path}")
    with open(file_path, "r", encoding="utf-8-sig") as f_in:
        reader = csv.DictReader(f_in)
        for row in reader:
            # 兼容不同csv字段名，根据你实际天池表头调整key
            order_no = row["invoice_no"]
            goods_name = row["product_name"]
            category = row["category"]
            unit_price = row["unit_price"]
            quantity = row["quantity"]
            total_amount = row["total_amount"]
            order_time = row["invoice_date"]
            user_id = row["customer_id"]

            # 补全缺失字段
            user_type = random.choice(user_type_list)
            pay_method = random.choice(pay_method_list)

            out_rows.append({
                "order_no": order_no,
                "goods_name": goods_name,
                "category": category,
                "unit_price": unit_price,
                "quantity": quantity,
                "total_amount": total_amount,
                "order_time": order_time,
                "user_id": user_id,
                "user_type": user_type,
                "pay_method": pay_method
            })

# 输出合并后的标准csv
fieldnames = [
    "order_no", "goods_name", "category", "unit_price", "quantity",
    "total_amount", "order_time", "user_id", "user_type", "pay_method"
]
with open(OUTPUT_CSV, "w", newline="", encoding="utf-8-sig") as f_out:
    writer = csv.DictWriter(f_out, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(out_rows)

print(f"预处理完成，一共合并 {len(out_rows)} 条记录，输出文件：{OUTPUT_CSV}")
print("⚠️注意：此csv用于手动导入MySQL，后端Java代码不会读取任何csv文件！")
