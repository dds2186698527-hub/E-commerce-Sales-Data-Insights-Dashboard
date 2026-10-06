from fastapi import FastAPI
import pymysql
from pymysql.cursors import DictCursor

# 数据库配置
db_config = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": "123456", # 修改成你的mysql密码
    "database": "ecommerce_dashboard",
    "charset": "utf8mb4"
}

app = FastAPI(title="电商数据分析接口", version="1.0")

def get_db_conn():
    conn = pymysql.connect(**db_config)
    return conn

# 接口1：按用户类型统计订单数量（新用户/老用户）
@app.get("/api/stats/user_type", summary="新老用户订单统计")
def get_user_type_stats():
    conn = get_db_conn()
    try:
        with conn.cursor(DictCursor) as cur:
            sql = """
            select user_type, count(*) as order_count
            from t_orders
            group by user_type
            """
            cur.execute(sql)
            result = cur.fetchall()
            return {"code":200, "data": result}
    except Exception as e:
        return {"code":500, "msg": str(e)}
    finally:
        conn.close()

# 接口2：商品销量TOP10
@app.get("/api/stats/goods_top10", summary="商品销量TOP10")
def get_goods_top10():
    conn = get_db_conn()
    try:
        with conn.cursor(DictCursor) as cur:
            sql = """
            select goods_name, sum(quantity) as sale_num
            from t_orders
            group by goods_name
            order by sale_num desc
            limit 10
            """
            cur.execute(sql)
            result = cur.fetchall()
            return {"code":200, "data": result}
    except Exception as e:
        return {"code":500, "msg": str(e)}
    finally:
        conn.close()

# 可选：再加一个接口，按类别统计销售额（给前端饼图）
@app.get("/api/stats/category_sale", summary="商品分类销售额统计")
def get_category_sale():
    conn = get_db_conn()
    try:
        with conn.cursor(DictCursor) as cur:
            sql = """
            select category, sum(total_amount) as total_sale
            from t_orders
            group by category
            """
            cur.execute(sql)
            result = cur.fetchall()
            return {"code":200, "data": result}
    except Exception as e:
        return {"code":500, "msg": str(e)}
    finally:
        conn.close()

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
