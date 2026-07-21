# YouFlex DB 스키마 참고 문서

작업 전에 컬럼명/enum 값 헷갈릴 때 이 파일부터 확인할 것. DB 접속 권한이 없어서
실제 데이터는 못 보고, 아래 DDL(사용자가 공유한 원본)만 근거로 코드를 짬.

## 주의해야 할 것들 (실수하기 쉬운 포인트)

- **역할/등급은 `member_grade` 하나로 처리함.** `member_role` 같은 컬럼은 없음.
  `member_grade`는 ENUM('시청자','평론가','관리자')이고 기본값 '시청자'
  (기획서 등급 명칭: 일반회원=시청자, 고급회원=평론가).
  관리자 체크는 `memberGrade == '관리자'`로 해야 함 (이전에 `memberRole`을
  따로 만든 건 실수였고 제거함).
- `member_grade_status`는 등급(평론가 등급) **신청/승인 상태**용 ENUM('미신청','신청','승인','반려')
  이지 회원 자체의 활성 상태가 아님. 회원 활성/탈퇴는 `member_delete_status` ENUM('정상','탈퇴').
- `member_loginid`, `member_pwd`는 **nullable** — 소셜 로그인 회원은 둘 다 null.
  로그인 폼 유효성 검사할 때 일반 회원가입 기준으로만 required 걸어둔 상태.
- 대부분의 enum 값이 **한글 문자열**임(`'시청자'`, `'정상'`, `'접수'` 등). Java에서
  비교할 때 영문 상수 쓰지 말고 이 한글 값 그대로 비교해야 함.
- `member_loginid`, `member_email` 둘 다 UNIQUE 제약 있음. 지금 코드는 로그인id
  중복만 서버에서 재검증하고 있고, 이메일 중복은 DB 제약에만 의존 중(터지면 500).
- 회원 취향(관심 장르) 다대다 매핑 테이블 이름은 `preference_mapping`이 아니라
  `member_mapping`임(예전엔 `preference_mapping`이었는데 리네임됨 - 코드에서 옛날
  이름으로 SQL 짜면 테이블이 없어서 바로 에러남). `(member_id, genre_category_id)`
  UNIQUE 제약(`uq_member_mapping`)은 있지만, 최대 3개 제한 트리거는 현재 DDL에는
  없음 — 3개 제한은 서버 쪽(`MemberService`)에서만 걸고 있음.
- `review`는 `genre_category_id` 컬럼이 없음(다중 장르 선택을 위해 빠짐). 장르는
  `review_mapping`(`review_id`, `genre_category_id` 복합 PK) 다대다 테이블로 따로 관리함
  — 게시글 저장 시 `review` INSERT 후 `review_mapping`에 선택한 장르만큼 별도 INSERT.
- `quiz_attempt`의 `quiz_attempt_date`는 (예전엔 트리거가 자동으로 채워준다고 적혀 있었지만)
  실제 DB에는 그 트리거가 없고 컬럼도 DEFAULT가 없음(NOT NULL). insert 시 `CURDATE()`로 직접
  채워야 함 — 안 넣으면 "Field 'quiz_attempt_date' doesn't have a default value" 에러 발생.
- FK는 대부분 `ON DELETE CASCADE` — 회원 탈퇴(row 삭제) 시 관련 데이터가 통째로
  같이 삭제됨. (소프트 삭제면 `member_delete_status`만 바꿔야지 실제 delete 하면 안 됨)
- `banner.banner_badge` 컬럼은 2026.7.21에 관리자 배너 관리 기능 구현하면서 추가됨(기존 DDL에는 없었음).
  로컬 DB에 아직 반영 안 했다면 아래 마이그레이션을 먼저 실행해야 배너 등록/수정이 동작함:
  `ALTER TABLE banner ADD COLUMN banner_badge VARCHAR(50) NOT NULL DEFAULT '' AFTER banner_title;`

## 전체 DDL (원본 그대로)

```sql
create database youflex;
use youflex;

-- drop database youflex;

-- ---------------------------------------------------------
-- 1. 회원 도메인
-- ---------------------------------------------------------

-- 1
-- 회원 테이블 --
create table member (
    member_id            int auto_increment,
    member_loginid       varchar(20) null,   -- 소셜로그인 일 경우 null
    member_pwd           varchar(255) null,  -- 소셜로그인 일 경우 null
    member_name          varchar(20) not null,
    member_email         varchar(100) not null,
    member_phone         varchar(20) null,
    member_grade         enum('시청자','평론가','관리자') not null default '시청자',
    member_point         int not null default 0,
    member_delete_status enum('정상','탈퇴') not null default '정상',
    member_created_at    datetime not null default now(),
    member_deleted_at    datetime null,      -- [수정1] 탈퇴 통계 대시보드용 탈퇴일시
    member_profile_img   varchar(500) null,
    member_grade_status  enum('미신청','신청','승인','반려') not null default '미신청', -- [수정] 승인/반려 이력 구분
    constraint pk_member primary key (member_id),
    constraint uk_member_loginid unique (member_loginid),
    constraint uk_member_email unique (member_email)
);

-- 2
-- 소셜 로그인 테이블 --
create table member_social (
    member_social_id   int not null auto_increment,
    member_id          int not null,
    member_social_type varchar(20) not null,
    member_social_key  varchar(200) not null,
    constraint pk_member_social primary key (member_social_id),
    constraint fk_member_social_member foreign key (member_id) references member(member_id) on delete cascade,
    constraint uq_member_social_type_key unique (member_social_type, member_social_key)
);

-- 3
-- 장르 카테고리 --
create table genre_category (
    genre_category_id   int auto_increment,
    genre_category_name varchar(20) not null,
    constraint pk_genre_category primary key (genre_category_id)
);


-- 4
-- 카테고리 다대다 매핑 --
create table member_mapping (
    member_mapping_id int auto_increment,
    member_id             int not null,
    genre_category_id     int not null,
    constraint pk_member_mapping primary key (member_mapping_id),
    constraint fk_mapping_member foreign key (member_id) references member(member_id) on delete cascade,
    constraint fk_member_genre foreign key (genre_category_id) references genre_category(genre_category_id),
    constraint uq_member_mapping unique (member_id, genre_category_id) -- [수정] 취향 중복등록 방지
);

-- ---------------------------------------------------------
-- 2. 게시판 도메인
-- ---------------------------------------------------------

-- 5
-- 리뷰글 --
create table review (
    review_id                    int auto_increment,
    member_id                    int not null,
    -- genre_category_id            int not null,
    review_platform              varchar(50) not null,
    review_related               varchar(50),
    review_title                 varchar(200) not null,
    review_content               text not null,
    review_img                   varchar(500),
    review_hit                   int not null default 0,
    review_rating                decimal(2, 1),
    review_highlighted           enum('N','Y') not null default 'N',
    review_highlight_started_at  datetime null, -- [수정4] 하이라이트 시작 시각
    review_highlight_expired_at  datetime null, -- [수정4] 하이라이트 만료 시각(자동해제 배치용)
    review_created_at            datetime not null default now(),
    review_updated_at            datetime null, -- null 허용으로 변경(2026.7.15(수) 오전)
    constraint pk_review primary key (review_id),
    constraint fk_review_member foreign key (member_id) references member(member_id) on delete cascade
    -- constraint fk_review_category foreign key (genre_category_id) references genre_category(genre_category_id)
);

-- 5.2 다중 장르 매핑 테이블 생성
CREATE TABLE review_mapping (
    review_id INT NOT NULL,
    genre_category_id INT NOT NULL,
    PRIMARY KEY (review_id, genre_category_id),
    CONSTRAINT fk_mapping_review FOREIGN KEY (review_id) REFERENCES REVIEW (review_id) ON DELETE CASCADE,
    CONSTRAINT fk_review_genre FOREIGN KEY (genre_category_id) REFERENCES genre_category (genre_category_id)
);

-- 6
-- 임시 저장 테이블 --
create table review_draft (
    review_draft_id        int auto_increment,
    member_id               int not null,
    genre_category_id       int not null,
    review_draft_title      varchar(200),
    review_draft_content    text,
    review_draft_saved_at   datetime not null default now(),
    constraint pk_review_draft primary key (review_draft_id),
    constraint fk_draft_member foreign key (member_id) references member(member_id) on delete cascade,
    constraint fk_draft_category foreign key (genre_category_id) references genre_category(genre_category_id)
);

-- 7
-- 리뷰글 좋아요 테이블 --
create table review_like (
    review_like_id          int auto_increment,
    review_id                int not null,
    member_id                int not null,
    review_like_created_at   datetime not null default now(), -- [수정] 좋아요 포인트 적립 로그/한도 체크용
    constraint pk_review_like primary key (review_like_id),
    constraint fk_reviewlike_review foreign key (review_id) references review(review_id) on delete cascade,
    constraint fk_reviewlike_member foreign key (member_id) references member(member_id) on delete cascade,
    constraint uq_reviewlike unique (review_id, member_id)
);

-- 8
-- 북마크 테이블 --
create table bookmark (
    bookmark_id          int auto_increment,
    review_id             int not null,
    member_id             int not null,
    bookmark_created_at   datetime not null default now(),
    constraint pk_bookmark primary key (bookmark_id),
    constraint fk_bookmark_review foreign key (review_id) references review(review_id) on delete cascade,
    constraint fk_bookmark_member foreign key (member_id) references member(member_id) on delete cascade,
    constraint uq_bookmark unique (review_id, member_id)
);

-- 9
-- 리뷰 신고 --
create table review_report (
    review_report_id          int auto_increment,
    review_id                  int not null,
    member_id                  int not null,
    review_report_reason       varchar(200) not null,
    review_report_status       enum('접수','처리중','처리완료') not null default '접수',
    review_report_created_at   datetime not null default now(),
    review_report_content      varchar(200) not null,
    constraint pk_review_report primary key (review_report_id),
    constraint fk_reviewreport_review foreign key (review_id) references review(review_id) on delete cascade,
    constraint fk_reviewreport_member foreign key (member_id) references member(member_id) on delete cascade
);

-- ---------------------------------------------------------
-- 3. 댓글 도메인
-- ---------------------------------------------------------

-- 10
-- 댓글 테이블 --
create table comment (
    comment_id             int auto_increment,
    member_id               int not null,
    review_id                int not null,
    parent_id                int null, -- 자기참조 (대댓글)
    comment_content          text not null,
    comment_delete_status    enum('정상','삭제') not null default '정상', -- [수정2] 소프트삭제 (대댓글 보존)
    comment_created_at       datetime not null default now(),
    comment_updated_at       datetime not null default now(),
    constraint pk_comment primary key (comment_id),
    constraint fk_comment_review foreign key (review_id) references review(review_id) on delete cascade,
    constraint fk_comment_member foreign key (member_id) references member(member_id) on delete cascade,
    constraint fk_comment_parent foreign key (parent_id) references comment(comment_id) on delete cascade
);

-- 11
-- 댓글 좋아요 --
create table comment_like (
    comment_like_id   int auto_increment,
    comment_id         int not null,
    member_id           int not null,
    constraint pk_comment_like primary key (comment_like_id),
    constraint fk_commentlike_comment foreign key (comment_id) references comment(comment_id) on delete cascade,
    constraint fk_commentlike_member foreign key (member_id) references member(member_id) on delete cascade,
    constraint uq_commentlike unique (comment_id, member_id)
);

-- 12
-- 댓글 신고 --
create table comment_report (
    comment_report_id          int auto_increment,
    comment_id                  int not null,
    member_id                   int not null,
    comment_report_reason       varchar(200) not null,
    comment_report_status       enum('접수','처리중','처리완료') not null default '접수',
    comment_report_created_at   datetime not null default now(),
    comment_report_content      varchar(200) not null,
    constraint pk_comment_report primary key (comment_report_id),
    constraint fk_commentreport_comment foreign key (comment_id) references comment(comment_id) on delete cascade,
    constraint fk_commentreport_member foreign key (member_id) references member(member_id) on delete cascade
);

-- ---------------------------------------------------------
-- 4. 채팅 도메인
-- ---------------------------------------------------------

-- 13
-- 채팅방 테이블 --
create table chatroom (
    chatroom_id           int auto_increment,
    member_id              int not null, -- 방장
    chatroom_title          varchar(100) not null,
    chatroom_max_member     int not null default 30, -- [수정1] 기획서 고정값 30명으로 통일
    chatroom_created_at     datetime not null default now(),
    constraint pk_chatroom primary key (chatroom_id),
    constraint fk_chatroom_member foreign key (member_id) references member(member_id) on delete cascade
);

-- 14
-- 채팅 멤버 --
create table chat_member (
    chat_member_id       int auto_increment,
    member_id              int not null,
    chatroom_id             int not null,
    chat_member_role        enum('방장','참여자') not null default '참여자',
    chat_member_status      enum('참여중','퇴장','강퇴') not null default '참여중', -- [수정3] 강퇴/자진퇴장 구분
    constraint pk_chat_member primary key (chat_member_id),
    constraint fk_chatmember_member foreign key (member_id) references member(member_id) on delete cascade,
    constraint fk_chatmember_chatroom foreign key (chatroom_id) references chatroom(chatroom_id) on delete cascade,
    constraint uq_chatmember unique (member_id, chatroom_id)
);

-- 15
-- 채팅 메시지 --
create table chat_message (
    chat_message_id         int auto_increment,
    chatroom_id               int not null,
    member_id                 int not null,
    chat_message_content      text not null,
    chat_message_created_at   datetime not null default now(),
    constraint pk_chat_message primary key (chat_message_id),
    constraint fk_chatmessage_chatroom foreign key (chatroom_id) references chatroom(chatroom_id) on delete cascade,
    constraint fk_chatmessage_member foreign key (member_id) references member(member_id) on delete cascade
);

-- 16
-- 채팅 경고 --
create table chat_warning (
    chat_warning_id           int not null auto_increment,
    member_id                  int not null,
    chatroom_id                 int not null,
    chat_message_id              int not null,
    chat_warning_reason          varchar(200) not null,
    chat_warning_created_at      datetime not null default now(),
    constraint pk_chat_warning primary key (chat_warning_id),
    constraint fk_chat_warning_memberid foreign key (member_id) references member(member_id) on delete cascade,
    constraint fk_chat_warning_chatroomid foreign key (chatroom_id) references chatroom(chatroom_id) on delete cascade,
    constraint fk_chat_warning_chatmessageid foreign key (chat_message_id) references chat_message(chat_message_id) on delete cascade
);

-- ---------------------------------------------------------
-- 5. 챗봇/퀴즈 도메인
-- ---------------------------------------------------------

-- 17
-- 퀴즈 테이블 --
create table quiz (
    quiz_id            int auto_increment,
    quiz_content         text not null,
    quiz_type             enum('객관식','ox') not null,
    quiz_option1          varchar(200),
    quiz_option2          varchar(200),
    quiz_option3          varchar(200),
    quiz_option4          varchar(200),
    quiz_answer           int null,
    quiz_explanation      text,
    quiz_ox               text,
    quiz_ox_answer        int,
    quiz_point            int not null default 100,
    constraint pk_quiz primary key (quiz_id)
);

-- 18
-- 퀴즈 시도 확인 테이블 --
CREATE TABLE quiz_attempt (
    quiz_attempt_id             INT AUTO_INCREMENT,
    quiz_id                     INT NOT NULL,
    member_id                   INT NOT NULL,
    quiz_attempt_check          INT NOT NULL, -- 정답 여부 (0/1)
    quiz_attempt_attempted_at   DATETIME NOT NULL DEFAULT NOW(),
    quiz_attempt_date           DATE NOT NULL, -- 매일 제한 체크용
    
    CONSTRAINT pk_quiz_attempt PRIMARY KEY (quiz_attempt_id),
    CONSTRAINT fk_quizattempt_quiz 
        FOREIGN KEY (quiz_id) REFERENCES quiz(quiz_id) ON DELETE CASCADE,
    CONSTRAINT fk_quizattempt_member 
        FOREIGN KEY (member_id) REFERENCES member(member_id) ON DELETE CASCADE
a);

-- ---------------------------------------------------------
-- 6. 운영/관리 도메인
-- ---------------------------------------------------------

-- 19
-- 경고 테이블 --
create table warning (
    warning_id           int auto_increment,
    member_id              int not null,
    warning_reason          varchar(200) not null,
    warning_status          enum('유효','포인트차감취소') not null default '유효', -- [수정] 포인트로 차감된 경고 구분
    warning_created_at      datetime not null default now(),
    constraint pk_warning primary key (warning_id),
    constraint fk_warning_member foreign key (member_id) references member(member_id) on delete cascade
);

-- 20
-- 포인트 이력 --
create table point_history (
    point_history_id           int auto_increment,
    member_id                    int not null,
    point_history_amount         int not null,
    point_history_type           enum('적립','사용','만료') not null,
    point_history_reason         varchar(100) not null, -- [수정] 좋아요/퀴즈/경고차감/하이라이트 등 사유 구분
    point_history_created_at     datetime not null default now(),
    point_history_updated_at     datetime not null default now(),
    constraint pk_point_history primary key (point_history_id),
    constraint fk_pointhistory_member foreign key (member_id) references member(member_id) on delete cascade
);

-- 21
-- 비속어 --
create table bad_word (
    bad_word_id        int auto_increment,
    bad_word_content     varchar(50) not null,
    constraint pk_bad_word primary key (bad_word_id)
);

-- 22
-- 공지사항 --
create table notice (
    notice_id           int auto_increment,
    notice_title          varchar(200) not null,
    notice_content        text not null,
    notice_hit            int not null default 0,
    notice_created_at     datetime not null default now(),
    notice_updated_at     datetime not null default now(),
    constraint pk_notice primary key (notice_id)
);




-- 23
-- 질문 게시판 --
create table qna (
    qna_id            int auto_increment,
    member_id           int not null,
    qna_title            varchar(200) not null,
    qna_content          text not null,
    qna_hit              int not null default 0,
    qna_created_at       datetime not null default now(),
    qna_updated_at       datetime not null default now(),
    qna_status           enum('답변대기','답변완료') not null default '답변대기', -- [수정] int → enum 명확화
    qna_is_secret        enum('공개','비밀') not null default '공개', -- [수정] varchar → enum 명확화
    constraint pk_qna primary key (qna_id),
    constraint fk_qna_member foreign key (member_id) references member(member_id) on delete cascade
);

-- 24
-- 질문 게시글 신고 --
create table qna_report (
    qna_report_id           int auto_increment,
    qna_id                    int not null,
    member_id                 int not null,
    qna_report_reason          varchar(200) not null,
    qna_report_status          enum('접수','처리중','처리완료') not null default '접수',
    qna_report_created_at      datetime not null default now(),
    qna_report_content         varchar(200) not null,
    constraint pk_qna_report primary key (qna_report_id),
    constraint fk_qnareport_qna foreign key (qna_id) references qna(qna_id) on delete cascade,
    constraint fk_qnareport_member foreign key (member_id) references member(member_id) on delete cascade
);

-- 25
-- 질문 댓글 --
create table qna_comment (
    qna_comment_id           int auto_increment,
    qna_id                     int not null,
    member_id                  int not null,
    qna_comment_content         text not null,
    qna_comment_created_at      datetime not null default now(),
    qna_comment_updated_at      datetime not null default now(),
    constraint pk_qna_comment primary key (qna_comment_id),
    constraint fk_qna_comment_qna foreign key (qna_id) references qna(qna_id) on delete cascade,
    constraint fk_qnacomment_member foreign key (member_id) references member(member_id) on delete cascade
);

-- 26
-- 질문게시판 -> 관리자 답변 --
create table admin_answer (
    admin_answer_id           int auto_increment,
    qna_id                      int not null,
    admin_answer_content         text not null,
    admin_answer_created_at      datetime not null default now(),
    admin_answer_updated_at      datetime not null default now(),
    constraint pk_admin_answer primary key (admin_answer_id),
    constraint fk_adminanswer_qna foreign key (qna_id) references qna(qna_id) on delete cascade
);

-- 27
-- 질문 댓글 신고 --
create table qna_comment_report (
    qna_comment_report_id           int auto_increment,
    qna_comment_id                    int not null,
    member_id                         int not null,
    qna_comment_report_reason          varchar(200) not null,
    qna_comment_report_status          enum('접수','처리중','처리완료') not null default '접수',
    qna_comment_report_created_at      datetime not null default now(),
    qna_comment_report_content         varchar(200) not null,
    constraint pk_qna_comment_report primary key (qna_comment_report_id),
    constraint fk_qna_comment_report_comment foreign key (qna_comment_id) references qna_comment(qna_comment_id) on delete cascade,
    constraint fk_qna_comment_report_member foreign key (member_id) references member(member_id) on delete cascade
);

-- 28
-- 배너 게시판 --
create table banner (
    banner_id         int not null auto_increment,
    banner_badge         varchar(50) not null default '', -- [수정] 관리자 배너 관리 화면의 뱃지(예: NETFLIX 시리즈) 표시용, 2026.7.21 추가
    banner_title        varchar(100) not null,
    banner_content       text not null,
    banner_img           varchar(500) not null,
    constraint pk_banner primary key (banner_id)
);

-- ---------------------------------------------------------
-- 7. 알림 도메인
-- ---------------------------------------------------------

-- 29
-- 알림 테이블 -- [수정5] 내용/이동경로/읽음상태 컬럼 보강
create table notifications (
    notifications_id            int auto_increment,
    member_id                     int not null,
    notifications_type            varchar(50) not null,   -- '댓글', '대댓글', '좋아요', '경고', 'QNA답변' 등
    notifications_content         varchar(200) not null,
    notifications_target_type     varchar(20) null,        -- 'review', 'comment', 'qna', 'admin_notice', 'warning' 등
    notifications_read_status     enum('안읽음','읽음') not null default '안읽음',
    notifications_created_at      datetime not null default now(),
    constraint pk_notifications primary key (notifications_id),
    constraint fk_notifications foreign key (member_id) references member(member_id) on delete cascade
);