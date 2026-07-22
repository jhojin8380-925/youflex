package com.youflex.exception;

public class BadWordDetectedException extends RuntimeException {
    public BadWordDetectedException(String message) {
        super(message);
    }
}
