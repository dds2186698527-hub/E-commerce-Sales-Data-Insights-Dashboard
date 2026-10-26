package com.ecommerce.common;

/**
 * 统一返回结构 Result<T>：所有接口都包一层，保证返回格式一致（自查清单#5）。
 * code = 200 表示成功，其余为业务/系统错误码；data 承载数据。
 *
 * @param <T> 返回的数据类型
 */
public class Result<T> {

    private int code;
    private String message;
    private T data;

    public Result() {
    }

    public Result(int code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    /** 成功：data 直接放数据，message 固定 success */
    public static <T> Result<T> success(T data) {
        return new Result<>(200, "success", data);
    }

    /** 成功：可自定义提示 */
    public static <T> Result<T> success(String message, T data) {
        return new Result<>(200, message, data);
    }

    /** 失败：code 非 200，message 为友好错误说明 */
    public static <T> Result<T> fail(int code, String message) {
        return new Result<>(code, message, null);
    }

    public int getCode() {
        return code;
    }

    public void setCode(int code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }
}
