# youflex 프로젝트 가이드

이 문서는 팀원들이 각자 Claude Code로 작업할 때 동일한 기준으로 동작하도록 만든 공용 지침서입니다.
모든 팀원의 Claude Code는 프로젝트를 열 때 이 파일을 자동으로 읽습니다.

## 프로젝트 개요

- Spring Boot + MyBatis + Thymeleaf 기반 웹 서비스
- 패키지 구조 (`com.youflex`)
  - `controller` : REST API 컨트롤러 (`@RestController`), 화면 렌더링 컨트롤러 (`*ViewController`)
  - `service` : 인터페이스 + `*ServiceImpl` 구현체로 분리
  - `mapper` : MyBatis 매퍼 인터페이스 (`@Mapper`)
  - `dto` : Lombok 기반 데이터 객체
  - `exception` : 도메인별 커스텀 예외 (예: `NoticeNotFoundException`)
  - `config` : 설정 클래스

## 코딩 컨벤션 (기존 코드 기준)

새 코드를 작성할 때는 아래처럼 이미 쓰이고 있는 패턴을 그대로 따릅니다.

- **Controller**
  - `@RequiredArgsConstructor` + `private final XxxService` 로 생성자 주입
  - REST API는 `ResponseEntity<T>` 반환, 상태 코드를 명시 (`ResponseEntity.ok()`, `.status(HttpStatus.CREATED)` 등)
- **Service**
  - `XxxService` 인터페이스와 `XxxServiceImpl` 구현체를 분리
  - 존재 여부 확인이 필요한 조회/수정/삭제는 먼저 조회해서 없으면 커스텀 예외를 던짐
- **Mapper**
  - `@Mapper` 인터페이스, 메서드는 `select~ / insert~ / update~ / delete~` 접두사 사용
  - SQL은 `src/main/resources/mappers/XxxMapper.xml` 에 인터페이스와 1:1로 매칭
- **DTO**
  - `@Data @Builder @NoArgsConstructor @AllArgsConstructor` (Lombok) 조합 사용
- **주석 (팀 공통 규칙)**
  - 클래스/메서드에 목적을 설명하는 Javadoc 스타일 주석을 유지
  - 코드를 변경할 때는 변경한 부분에 간결한 설명 주석을 추가

## 화면 리소스 구조 주의사항

- `src/main/resources/templates/` : 실제 서비스에 연결된 Thymeleaf 템플릿 (도메인별 폴더 + `fragments/layout.html` 공통 레이아웃)
- `src/main/resources/html/` : 초기 디자인 목업용 정적 HTML/CSS/JS (프로덕션에는 연결되지 않음)
- 두 폴더를 혼동하지 않도록 주의. 실제 기능 구현은 `templates/` 쪽을 수정

## 작업 전 참고 문서 (docs/)

작업을 시작하기 전에 아래 두 문서를 확인하고, 그 내용을 근거로 구현한다.

- `docs/database-schema.md` : DB 스키마(DDL) + 헷갈리기 쉬운 포인트 정리
  (예: `member_grade` enum이 역할까지 겸함, enum 값이 한글 문자열, `member_loginid`/`member_pwd`는 소셜 로그인 시 null 등)
  테이블/컬럼/enum 값을 다루는 코드를 작성하기 전에 반드시 이 문서로 확인
- `docs/project-plan.md` : 서비스 기획서 (기능 정의, 회원 등급/포인트/경고 정책, 메뉴 구조)
  기능 요구사항이나 정책(등급 조건, 포인트 지급/차감 기준 등)을 구현하기 전에 이 문서로 확인

**문제 발견 시 처리 방법**

작업 중 아래와 같은 경우를 발견하면 임의로 판단해서 진행하지 말고, 문제 내용을 설명한 뒤 사용자에게 진행 여부를 먼저 확인한다.

- 요청받은 작업이 두 문서의 내용과 어긋나는 경우 (예: 문서에 없는 컬럼/enum 값을 쓰려고 하는 경우, 정책과 다른 권한/조건으로 구현하려는 경우)
- 두 문서끼리 서로 내용이 다르거나 모순되는 경우
- 기존 코드가 문서와 다르게 구현되어 있어서 어느 쪽이 맞는지 판단이 필요한 경우

## AI(Claude Code) 행동 제한

아래 항목은 팀원이 명시적으로 승인하기 전까지 실행하지 않습니다.

- **개발 서버 임의 실행 금지** (`bootRun` 등) — 요청받지 않는 한 서버를 띄우지 않음
- **git commit / push 임의 실행 금지** — 커밋/푸시가 필요하면 먼저 사용자에게 확인
- **DB 스키마/마이그레이션 임의 변경 금지** — 스키마 변경이 필요하면 반드시 먼저 팀원과 협의
