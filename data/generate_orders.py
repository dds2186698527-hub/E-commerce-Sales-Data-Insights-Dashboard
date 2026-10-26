# generate_orders.py
# 将淘宝/京东/拼多多/苏宁易购/天猫/1688 等平台 CSV 合并为 ecommerce_data.csv
# 输出列名与源文件一致（中文），供 csv_import.py 导入 MySQL
import pandas as pd
import os
import glob

base_dir = os.path.dirname(os.path.abspath(__file__))

# 各平台原始 CSV 文件（列名统一为中文）
platform_files = [
    "淘宝.csv", "京东.csv", "拼多多.csv",
    "苏宁易购.csv", "天猫.csv", "1688.csv"
]

# 也兼容自动匹配：data 目录下除 ecommerce_data.csv / orders.csv 外的所有 CSV
all_csv = glob.glob(os.path.join(base_dir, "*.csv"))
for f in all_csv:
    name = os.path.basename(f)
    if name not in ("ecommerce_data.csv", "orders.csv") and name not in platform_files:
        platform_files.append(name)

print("待合并文件：")
frames = []
for name in platform_files:
    path = os.path.join(base_dir, name)
    if not os.path.exists(path):
        print(f"  ⚠️ 跳过（不存在）：{name}")
        continue
    df = pd.read_csv(path, encoding="utf-8")
    print(f"  ✅ {name}：{len(df)} 行")
    frames.append(df)

if not frames:
    print("❌ 没有找到任何平台 CSV 文件")
    exit(1)

# 合并
merged = pd.concat(frames, ignore_index=True)
print(f"\n合并完成：共 {len(merged)} 行")

# 输出 ecommerce_data.csv
out_path = os.path.join(base_dir, "ecommerce_data.csv")
merged.to_csv(out_path, index=False, encoding="utf-8")
print(f"✅ 已输出：{out_path}")
print("下一步运行 backend/csv_import.py 将数据导入 MySQL")
