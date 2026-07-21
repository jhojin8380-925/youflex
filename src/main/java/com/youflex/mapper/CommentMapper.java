package com.youflex.mapper;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface CommentMapper {

    // 관리자 신고 처리 - 삭제 액션. 대댓글 보존을 위해 하드 삭제가 아닌 소프트 삭제(comment_delete_status = '삭제')
    void deleteComment(int commentId);
}
