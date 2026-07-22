package com.youflex.exception;

public class AlreadyInRoomException extends RuntimeException {
    private final int existingRoomId;
    private final String existingRoomTitle;

    public AlreadyInRoomException(int existingRoomId, String existingRoomTitle) {
        super("이미 참여 중인 다른 채팅방이 있습니다.");
        this.existingRoomId = existingRoomId;
        this.existingRoomTitle = existingRoomTitle;
    }

    public int getExistingRoomId() { return existingRoomId; }
    public String getExistingRoomTitle() { return existingRoomTitle; }
}