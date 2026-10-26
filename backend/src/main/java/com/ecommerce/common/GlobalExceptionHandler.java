package com.ecommerce.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * 全局异常处理（自查清单#11）：把异常统一兜住，返回规范的 HTTP 状态码与友好提示。
 * - 参数类型不匹配 / 缺少必填参数 -> 400
 * - 请求的接口不存在 -> 404
 * - 其它未预期异常 -> 500（记日志，对外只给一句友好提示）
 * 注：前端 api.js 以 res.ok 判断成功/失败，故这里用 ResponseEntity 设置真实状态码。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler({MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
    public ResponseEntity<Result<Void>> handleBadRequest(Exception e) {
        return ResponseEntity.status(400).body(Result.fail(400, "参数错误：" + e.getMessage()));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Result<Void>> handleNotFound(NoResourceFoundException e) {
        return ResponseEntity.status(404).body(Result.fail(404, "请求的接口不存在"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleException(Exception e) {
        log.error("服务器内部错误", e);
        return ResponseEntity.status(500).body(Result.fail(500, "服务器内部错误，请稍后再试"));
    }
}
