-- ============================================================
-- 신고 처리 탭(admin/admin.html) 테스트용 더미 데이터
-- 댓글 신고(comment_report) / 리뷰(게시글) 신고(review_report) 생성
--
-- 신고에 필요한 회원(작성자 2명, 신고자 2명) / 리뷰 1건 / 댓글 1건도
-- 함께 만들기 때문에 기존 DB에 데이터가 없어도 그대로 실행됩니다.
-- 단, genre_category 테이블에는 최소 1건 이상 데이터가 있어야 합니다
-- (회원가입 취향 선택 목록으로 이미 있을 가능성이 높음).
--
-- 실행: MySQL Workbench/DBeaver 등에서 youflex 스키마 선택 후 전체 실행
-- ============================================================

USE youflex;

-- (선택) 재실행 전 이전 테스트 데이터 정리하고 싶으면 아래 주석 해제
-- DELETE FROM review_report WHERE review_report_content LIKE '[TEST]%';
-- DELETE FROM comment_report WHERE comment_report_content LIKE '[TEST]%';
-- DELETE FROM comment WHERE comment_content LIKE '[TEST]%';
-- DELETE FROM review WHERE review_title LIKE '[TEST]%';
-- DELETE FROM member WHERE member_loginid IN ('test_wr1','test_wr2','test_rp1','test_rp2');

-- 1. 테스트용 회원 (게시글/댓글 작성자 2명 + 신고자 2명)
-- member_loginid는 varchar(20)이라 짧게 지음
INSERT INTO member (member_loginid, member_pwd, member_name, member_email, member_grade)
VALUES
  ('test_wr1', 'test1234', '테스트작성자1', 'test_report_writer1@test.com', '시청자'),
  ('test_wr2', 'test1234', '테스트작성자2', 'test_report_writer2@test.com', '시청자'),
  ('test_rp1', 'test1234', '테스트신고자1', 'test_report_reporter1@test.com', '시청자'),
  ('test_rp2', 'test1234', '테스트신고자2', 'test_report_reporter2@test.com', '시청자');

-- 2. 테스트용 게시글(리뷰) 1건 - genre_category는 기존에 등록된 것 중 아무거나 사용
INSERT INTO review (member_id, genre_category_id, review_platform, review_title, review_content, review_updated_at)
SELECT
  (SELECT member_id FROM member WHERE member_loginid = 'test_wr1'),
  (SELECT genre_category_id FROM genre_category LIMIT 1),
  '넷플릭스',
  '[TEST] 광고성 스팸 게시물입니다',
  '[TEST] 신고 테스트를 위해 생성된 게시글 본문입니다.',
  NOW();

-- 3. 테스트용 댓글 1건 (위 게시글에 작성)
INSERT INTO comment (member_id, review_id, comment_content, comment_updated_at)
SELECT
  (SELECT member_id FROM member WHERE member_loginid = 'test_wr2'),
  (SELECT review_id FROM review WHERE review_title = '[TEST] 광고성 스팸 게시물입니다'),
  '[TEST] 저는 조금 다르게 생각해요... 이건 명백한 욕설입니다',
  NOW();

-- 4. 리뷰(게시글) 신고 - 대기중 2건 + 처리완료 1건 (관리자 화면에서 상태별 UI 확인용)
INSERT INTO review_report (review_id, member_id, review_report_reason, review_report_status, review_report_content)
SELECT
  (SELECT review_id FROM review WHERE review_title = '[TEST] 광고성 스팸 게시물입니다'),
  (SELECT member_id FROM member WHERE member_loginid = 'test_rp1'),
  '스팸/도배', '접수', '[TEST] 광고성 스팸 게시물입니다'
UNION ALL SELECT
  (SELECT review_id FROM review WHERE review_title = '[TEST] 광고성 스팸 게시물입니다'),
  (SELECT member_id FROM member WHERE member_loginid = 'test_rp2'),
  '기타', '처리중', '[TEST] 재검토가 필요해 보입니다'
UNION ALL SELECT
  (SELECT review_id FROM review WHERE review_title = '[TEST] 광고성 스팸 게시물입니다'),
  (SELECT member_id FROM member WHERE member_loginid = 'test_rp1'),
  '기타', '처리완료', '[TEST] 이미 검토가 끝난 신고 건입니다';

-- 5. 댓글 신고 - 대기중 1건 + 처리중 1건
INSERT INTO comment_report (comment_id, member_id, comment_report_reason, comment_report_status, comment_report_content)
SELECT
  (SELECT comment_id FROM comment WHERE comment_content LIKE '[TEST] 저는 조금%'),
  (SELECT member_id FROM member WHERE member_loginid = 'test_rp1'),
  '욕설/비방', '접수', '[TEST] 저는 조금 다르게 생각해요... 이건 명백한 욕설입니다'
UNION ALL SELECT
  (SELECT comment_id FROM comment WHERE comment_content LIKE '[TEST] 저는 조금%'),
  (SELECT member_id FROM member WHERE member_loginid = 'test_rp2'),
  '기타', '처리중', '[TEST] 확인이 필요한 댓글입니다';
