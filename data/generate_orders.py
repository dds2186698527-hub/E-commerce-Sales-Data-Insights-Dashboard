# generate_orders.py
# 把 data/ 目录下所有【能构成订单】的数据（CSV / Excel）统一成一套订单格式，合并输出为 finall.csv
#
# 自动识别四类订单数据源：
#   1) 平台中文订单（淘宝/京东/拼多多/苏宁易购/天猫/1688）：用户ID,用户姓名,商品ID,...12列
#   2) 白鲸/电商销售数据（GBK 中文，含真实支付方式）：订单ID,用户ID,订单日期,商品分类,...
#   3) Amazon Sale Report（英文，约12万行）：Order ID,Date,Category,Style,SKU,Qty,Amount,...
#      品类为英文时尚类（Blouse/Top/Saree...），统一映射成中文平台品类「服装」以对齐其它数据
#   4) 大话电商销售数据（Excel .xlsx）：订单号,日期,商品品类,实际售价,销售数,销售额,...（无商品名，用品类代替）
#
# 无法构成订单的文件（费用表/仓库对比/商品定价目录）会自动跳过，并在末尾列出。
#
# 输出列 = 平台中文订单列 + 支付方式，与 backend/csv_import.py 的字段映射保持一致；
# order_no、user_type 由 csv_import.py 导入时生成。
import pandas as pd
import os
import glob
import hashlib

base_dir = os.path.dirname(os.path.abspath(__file__))

OUTPUT_NAME = "finall.csv"
EXCLUDE = {OUTPUT_NAME, "ecommerce_data.csv", "orders.csv"}

# 统一输出列（中文，供 csv_import.py 导入 MySQL t_orders）
UNIFIED_COLS = [
    "用户ID", "用户姓名", "商品ID", "商品名称", "商品类别", "单价",
    "购买时间", "购买数量", "消费金额", "用户城市", "用户性别", "用户年龄", "支付方式",
]

# Amazon 英文品类 -> 中文平台品类（对齐其它数据，使看板品类筛选统一）
AMAZON_CATEGORY_MAP = {
    "Blouse": "服装", "Bottom": "服装", "Dupatta": "服装", "Ethnic Dress": "服装",
    "Saree": "服装", "Set": "服装", "Top": "服装", "Western Dress": "服装", "kurta": "服装",
}


# 日期统一成 MySQL datetime 可识别的 "YYYY-MM-DD HH:MM:SS"
def norm_date(series, dayfirst=False):
    # format="mixed"：兼容各平台多种日期格式，避免 dateutil 逐条推断警告
    d = pd.to_datetime(series, errors="coerce", format="mixed", dayfirst=dayfirst)
    return d.dt.strftime("%Y-%m-%d %H:%M:%S")


# 去掉金额/价格里的货币符号与千分位，转数值
def to_money(series):
    s = series.astype(str).str.replace(r"[¥￥,\s]", "", regex=True)
    return pd.to_numeric(s, errors="coerce")


def read_file(path):
    """按内容读取 CSV / Excel；无法识别时返回 (None, 原因)。"""
    ext = os.path.splitext(path)[1].lower()
    if ext in (".xlsx", ".xls"):
        try:
            return pd.read_excel(path), None
        except Exception as e:
            return None, f"Excel 读取失败：{e}"

    with open(path, "rb") as f:
        magic = f.read(4)
    for enc in ("utf-8-sig", "gb18030"):
        try:
            # low_memory=False：整表一次性推断列类型，避免"Unnamed: 22"混合类型 DtypeWarning
            return pd.read_csv(path, encoding=enc, low_memory=False), None
        except Exception:
            continue
    # 文本读取失败但文件头是 xlsx 容器（PK 魔数，命名成 .csv 的 Excel）
    if magic[:2] == b"PK":
        try:
            return pd.read_excel(path), None
        except Exception as e:
            return None, f"实为 Excel 但读取失败：{e}"
    return None, "编码无法识别（UTF-8 / GB18030 均失败）"


def to_unified(df, name):
    """按列名把每个来源映射成统一订单格式；无法识别时返回 None。"""
    cols = set(df.columns)

    # 1) 平台中文订单
    if {"用户ID", "商品名称", "商品类别", "单价", "购买数量", "消费金额", "购买时间"} <= cols:
        return pd.DataFrame({
            "用户ID": df["用户ID"],
            "用户姓名": df["用户姓名"] if "用户姓名" in cols else "用户" + df["用户ID"].astype(str),
            "商品ID": df["商品ID"] if "商品ID" in cols else "P" + (df.index + 1).astype(str),
            "商品名称": df["商品名称"],
            "商品类别": df["商品类别"],
            "单价": pd.to_numeric(df["单价"], errors="coerce"),
            "购买时间": norm_date(df["购买时间"]),
            "购买数量": pd.to_numeric(df["购买数量"], errors="coerce"),
            "消费金额": pd.to_numeric(df["消费金额"], errors="coerce"),
            "用户城市": df["用户城市"] if "用户城市" in cols else "",
            "用户性别": df["用户性别"] if "用户性别" in cols else "",
            "用户年龄": df["用户年龄"] if "用户年龄" in cols else "",
            "支付方式": df["支付方式"] if "支付方式" in cols else "未知",
        })

    # 2) 白鲸 / 电商销售数据（GBK，含 订单ID/支付方式/用户所在地区）
    if {"用户ID", "商品名称", "商品分类", "单价", "购买数量", "订单金额", "订单日期"} <= cols:
        return pd.DataFrame({
            "用户ID": df["用户ID"],
            "用户姓名": "用户" + df["用户ID"].astype(str),
            "商品ID": df["订单ID"] if "订单ID" in cols else "P" + (df.index + 1).astype(str),
            "商品名称": df["商品名称"],
            "商品类别": df["商品分类"],
            "单价": pd.to_numeric(df["单价"], errors="coerce"),
            "购买时间": norm_date(df["订单日期"]),
            "购买数量": pd.to_numeric(df["购买数量"], errors="coerce"),
            "消费金额": pd.to_numeric(df["订单金额"], errors="coerce"),
            "用户城市": df["用户所在地区"] if "用户所在地区" in cols else "",
            "用户性别": "",
            "用户年龄": "",
            "支付方式": df["支付方式"] if "支付方式" in cols else "未知",
        })

    # 3) Amazon 英文订单（无用户字段，用户ID 合成；单价=金额/数量反算；品类映射为中文）
    if {"Order ID", "Category", "Qty", "Amount"} <= cols:
        qty = pd.to_numeric(df["Qty"], errors="coerce")
        amt = pd.to_numeric(df["Amount"], errors="coerce")
        goods = df["Style"].where(df["Style"].notna(), df["SKU"] if "SKU" in cols else None)
        goods = goods.where(goods.notna(), "Amazon商品")
        category = df["Category"].fillna("").map(
            lambda c: AMAZON_CATEGORY_MAP.get(str(c).strip(), "服装"))
        out = pd.DataFrame({
            "用户ID": "AMZ" + (df.index + 1).astype(str),
            "用户姓名": "Amazon用户",
            "商品ID": df["SKU"].where(df["SKU"].notna(),
                                     df["ASIN"].where(df["ASIN"].notna(), "")) if "SKU" in cols else "",
            "商品名称": goods,
            "商品类别": category,
            "单价": (amt / qty).round(2),
            "购买时间": norm_date(df["Date"], dayfirst=True),   # Amazon 报表日期为 dd/mm/yyyy
            "购买数量": qty,
            "消费金额": amt,
            "用户城市": df["ship-city"].fillna(df["ship-state"].fillna("")) if "ship-city" in cols else "",
            "用户性别": "",
            "用户年龄": "",
            "支付方式": "亚马逊",
        })
        # 过滤无效订单行：缺订单号 / 数量为空或<=0 / 金额为空 / 日期无法解析
        ok = df["Order ID"].notna() & qty.gt(0) & amt.notna() & out["购买时间"].notna()
        return out[ok]

    # 4) 大话电商销售数据（Excel，无商品名/用户ID，用品类代替商品名）
    if {"订单号", "商品品类", "实际售价", "销售数", "销售额"} <= cols:
        return pd.DataFrame({
            "用户ID": "DH" + (df.index + 1).astype(str),
            "用户姓名": "大话用户",
            "商品ID": df["订单号"].astype(str),
            "商品名称": df["商品品类"],
            "商品类别": df["商品品类"],
            "单价": to_money(df["实际售价"]),
            "购买时间": norm_date(df["日期"]),
            "购买数量": pd.to_numeric(df["销售数"], errors="coerce"),
            "消费金额": to_money(df["销售额"]),
            "用户城市": df["区域"] if "区域" in cols else "",
            "用户性别": df["客户性别"] if "客户性别" in cols else "",
            "用户年龄": df["客户年龄"] if "客户年龄" in cols else "",
            "支付方式": "未知",
        })

    return None


def file_md5(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


# ---------- 主流程 ----------
# 扫描 CSV + Excel，排除输出文件、Office 临时文件(~$)；排序保证处理顺序固定
all_files = sorted(
    glob.glob(os.path.join(base_dir, "*.csv"))
    + glob.glob(os.path.join(base_dir, "*.xlsx"))
    + glob.glob(os.path.join(base_dir, "*.xls"))
)
files = [f for f in all_files
         if os.path.basename(f) not in EXCLUDE
         and not os.path.basename(f).startswith("~$")]

if not files:
    print("❌ 当前目录下没有可合并的 CSV / Excel 文件")
    exit(1)

frames = []
skipped = []        # (文件名, 原因)
seen_hash = set()   # 跳过完全相同（重复）的文件，避免重复计数
for path in files:
    name = os.path.basename(path)
    df, reason = read_file(path)
    if df is None:
        skipped.append((name, reason))
        continue
    if df.empty:
        skipped.append((name, "空文件"))
        continue
    md5 = file_md5(path)
    if md5 in seen_hash:
        skipped.append((name, "与已合并文件完全相同（重复），跳过避免重复计数"))
        continue
    seen_hash.add(md5)

    uni = to_unified(df, name)
    if uni is None:
        skipped.append((name, f"列名无法识别为订单数据（列：{df.columns.tolist()}）"))
        continue
    print(f"  ✅ {name}：{len(uni)} 行 -> 订单格式")
    frames.append(uni)

if not frames:
    print("❌ 没有可合并的订单数据")
    if skipped:
        print("\n被跳过的文件：")
        for n, r in skipped:
            print(f"  - {n}：{r}")
    exit(1)

merged = pd.concat(frames, ignore_index=True, sort=False)
merged = merged[UNIFIED_COLS]

# ---- 清洗规则（写入文档/答辩口径） ----
# 1) 关键字段为空的整行丢弃（如商品名/金额缺失）；
# 2) 过滤 消费金额/单价/购买数量 <= 0 的行：这些是退款、负金额或异常记录，
#    若保留会让"总销售额/客单价"等 KPI 的 SUM 被负值污染。
# 3) 去重：完全相同的重复订单记录只保留一条，避免同一笔数据被重复计数
#    （同一来源文件内的重复行，以及跨文件完全相同的重复数据，都只保留第一条）。
before = len(merged)
merged = merged.dropna(subset=["商品名称", "消费金额"])
merged = merged[merged["消费金额"] > 0]
merged = merged[merged["单价"] > 0]
merged = merged[merged["购买数量"] > 0]
filtered = len(merged)
merged = merged.drop_duplicates()
print(f"\n清洗：合并 {before} 行 -> 过滤空值/负金额/异常单价后剩 {filtered} 行"
      f" -> 去除 {before - filtered} 行异常，再去除 {filtered - len(merged)} 行完全重复 -> 剩 {len(merged)} 行")
print(f"合并完成：共 {len(merged)} 行 × {merged.shape[1]} 列")

out_path = os.path.join(base_dir, OUTPUT_NAME)
merged.to_csv(out_path, index=False, encoding="utf-8")
print(f"✅ 已输出：{out_path}")

if skipped:
    print("\n被跳过的文件（未并入 finall.csv）：")
    for n, r in skipped:
        print(f"  - {n}：{r}")
else:
    print("\n所有数据文件均已并入。")

print("\n下一步运行 backend/csv_import.py 将数据导入 MySQL")
