# Project: Music Blog Platform

## Overview
남자친구를 위한 음악 글쓰기 플랫폼. 주로 앨범 리뷰를 쓰되, 에세이/플레이리스트 등으로 확장 가능한 구조.

## Architecture
- **Frontend**: Astro (SSG — Static Site Generation)
- **CMS**: Notion Database (API로 빌드 시 fetch)
- **Deploy**: Vercel (git push → 자동 빌드 & 배포)
- **Styling**: 미정 (Tailwind CSS 권장)

## Key Decisions
- 완전 정적 사이트 (SSG). 서버 사이드 렌더링 안 씀.
- Notion에 글 쓰면 → 수동으로 Vercel redeploy (또는 git push)로 반영.
- SEO 중요: 검색에 잘 걸려야 함. 메타태그, sitemap, OG 태그 필수.
- 비개발자(남자친구)도 유지보수 가능해야 함 — 코드 구조를 단순하게 유지.

## Notion DB Schema
Database name: "블로그 글" (또는 "Posts")

### Properties
| Property     | Type         | Required | Notes                                    |
|-------------|-------------|----------|------------------------------------------|
| title       | title       | Yes      | 글 제목 (Notion 기본 Name 컬럼)           |
| slug        | rich_text   | Yes      | URL 경로 (예: radiohead-ok-computer)      |
| status      | select      | Yes      | "draft" 또는 "published"                 |
| date        | date        | Yes      | 발행일                                    |
| description | rich_text   | Yes      | 글 요약 (목록 카드 + SEO meta description) |
| category    | select      | Yes      | 글 종류: 리뷰, 에세이, 플레이리스트 등     |
| tags        | multi_select| No       | 장르/키워드: 힙합, 재즈, 앰비언트 등       |
| artist      | rich_text   | No       | 아티스트명 (리뷰용)                       |
| album       | rich_text   | No       | 앨범명 (리뷰용)                           |
| rating      | number      | No       | 평점 0~10, 0.5 단위 (리뷰용)             |
| cover       | files       | No       | 앨범 커버 / 대표 이미지                    |

- Page body (Notion 페이지 본문) = 글 내용
- status가 "published"인 것만 빌드 시 fetch
- 음악 메타(artist, album, rating, cover)가 있으면 앨범 카드 UI 표시, 없으면 일반 글 레이아웃

## Environment Variables
```
NOTION_API_KEY=secret_xxxxxxxx      # Notion Integration 토큰
NOTION_DATABASE_ID=xxxxxxxx         # Notion DB ID
```
- `.env`에 저장, `.gitignore`에 반드시 포함
- Vercel 배포 시 환경변수로 등록

## Pages
- `/` — 홈 (최신 글 목록)
- `/posts/[slug]` — 글 상세
- `/tags/[tag]` — 태그별 필터
- `/categories/[category]` — 카테고리별 필터 (추후)
- `/about` — 소개 페이지 (추후)

## Tech Constraints
- Node.js 18+ (설치됨)
- npm 사용 (yarn/pnpm 아님)
- macOS (Apple Silicon)
- Git & GitHub 사용 가능
- Vercel 무료 플랜

## Style Guide
- 한국어 콘텐츠 중심
- 깔끔하고 읽기 좋은 타이포그래피 우선
- 다크모드 지원하면 좋음
- 모바일 반응형 필수
