-- ============================================================
-- 관리자페이지 기능 추가에 따른 스키마 마이그레이션 (2026.7.21)
-- docs/database-schema.md에 반영된 변경사항과 동일. 팀원 로컬 DB에도
-- 아래 스크립트를 한 번 실행해야 배너 관리 / 누적 탈퇴자수 / 신고 처리완료
-- 이력 보존 기능이 정상 동작함.
--
-- 실행: MySQL Workbench/DBeaver 등에서 youflex 스키마 선택 후 전체 실행
-- 이미 적용된 항목이 있으면 해당 블록만 건너뛰어도 됨(각 블록은 독립적으로 실행 가능)
-- ============================================================

USE youflex;

-- 1. 배너 관리 - 뱃지 텍스트 컬럼 추가 (관리자 배너 설정 화면)
ALTER TABLE banner ADD COLUMN banner_badge VARCHAR(50) NOT NULL DEFAULT '' AFTER banner_title;

-- 2. 회원 탈퇴 승인 이력 테이블 - 관리자 대시보드 "누적 탈퇴자수" 집계용
--    (탈퇴 승인 시 member row가 완전삭제되어 이력이 안 남는 문제를 보완)
CREATE TABLE member_withdrawal_log (
  member_withdrawal_log_id INT AUTO_INCREMENT,
  member_id INT NOT NULL,
  member_name VARCHAR(20) NOT NULL,
  withdrawn_at DATETIME NOT NULL DEFAULT NOW(),
  PRIMARY KEY (member_withdrawal_log_id)
);

-- 3. 신고 처리 "처리완료" 탭 이력 보존 - 원본(게시글/QNA/QNA댓글)을 관리자가 완전삭제해도
--    신고 기록 자체는 남도록 FK를 CASCADE에서 SET NULL로 변경 (댓글은 원래 소프트 삭제라 해당 없음)
ALTER TABLE review_report DROP FOREIGN KEY fk_reviewreport_review;
ALTER TABLE review_report MODIFY review_id INT NULL;
ALTER TABLE review_report ADD CONSTRAINT fk_reviewreport_review
  FOREIGN KEY (review_id) REFERENCES review(review_id) ON DELETE SET NULL;

ALTER TABLE qna_report DROP FOREIGN KEY fk_qnareport_qna;
ALTER TABLE qna_report MODIFY qna_id INT NULL;
ALTER TABLE qna_report ADD CONSTRAINT fk_qnareport_qna
  FOREIGN KEY (qna_id) REFERENCES qna(qna_id) ON DELETE SET NULL;

ALTER TABLE qna_comment_report DROP FOREIGN KEY fk_qna_comment_report_comment;
ALTER TABLE qna_comment_report MODIFY qna_comment_id INT NULL;
ALTER TABLE qna_comment_report ADD CONSTRAINT fk_qna_comment_report_comment
  FOREIGN KEY (qna_comment_id) REFERENCES qna_comment(qna_comment_id) ON DELETE SET NULL;
