package com.youflex.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

// Spring Security 없이 순수 JDK만으로 비밀번호를 해시/검증하는 유틸.
// 저장 형식: base64(salt) + ":" + base64(sha256(salt + rawPwd))
public class PasswordUtil {

    private static final SecureRandom RANDOM = new SecureRandom();

    private PasswordUtil() {
    }

    public static String encode(String rawPwd) {
        byte[] salt = new byte[16];
        RANDOM.nextBytes(salt);
        byte[] hash = sha256(salt, rawPwd);
        return Base64.getEncoder().encodeToString(salt) + ":" + Base64.getEncoder().encodeToString(hash);
    }

    public static boolean matches(String rawPwd, String encoded) {
        String[] parts = encoded.split(":", 2);
        if (parts.length != 2) {
            return false;
        }
        byte[] salt = Base64.getDecoder().decode(parts[0]);
        byte[] expectedHash = Base64.getDecoder().decode(parts[1]);
        byte[] actualHash = sha256(salt, rawPwd);
        // 타이밍 공격을 피하기 위해 MessageDigest.isEqual로 비교(단순 Arrays.equals 대신)
        return MessageDigest.isEqual(expectedHash, actualHash);
    }

    private static byte[] sha256(byte[] salt, String rawPwd) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(salt);
            return digest.digest(rawPwd.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
