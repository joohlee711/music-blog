import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { marked } from 'marked';
import type {
  PageObjectResponse,
  QueryDatabaseParameters,
} from '@notionhq/client/build/src/api-endpoints';

// ── 환경변수 검증 ──────────────────────────────────────────
const NOTION_API_KEY = import.meta.env.NOTION_API_KEY;
const DATABASE_ID = import.meta.env.NOTION_DATABASE_ID;

if (!NOTION_API_KEY) {
  throw new Error('NOTION_API_KEY 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.');
}
if (!DATABASE_ID) {
  throw new Error('NOTION_DATABASE_ID 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.');
}

const notion = new Client({ auth: NOTION_API_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

// ── 타입 ───────────────────────────────────────────────────
export interface Post {
  id: string;
  title: string;
  slug: string;
  status: string;
  date: string;
  description: string;
  category: string;
  tags: string[];
  artist?: string;
  album?: string;
  rating?: number;
  cover?: string;
}

// ── Property 추출 헬퍼 ────────────────────────────────────
type Properties = PageObjectResponse['properties'];
type PropertyValue = Properties[string];

function extractText(prop: PropertyValue): string {
  if (prop.type === 'title') {
    return prop.title.map((t) => t.plain_text).join('');
  }
  if (prop.type === 'rich_text') {
    return prop.rich_text.map((t) => t.plain_text).join('');
  }
  return '';
}

function findTitle(props: Properties): string {
  const titleProp = Object.values(props).find((v) => v.type === 'title');
  return titleProp ? extractText(titleProp) : '';
}

function parsePost(page: PageObjectResponse): Post {
  const p = page.properties;

  let cover: string | undefined;
  for (const [key, val] of Object.entries(p)) {
    if ((key === 'albumart' || key === 'cover') && val.type === 'files') {
      const filesArr = (val as any).files;
      if (filesArr?.length > 0) {
        cover = filesArr[0]?.file?.url ?? filesArr[0]?.external?.url;
        break;
      }
    }
  }

  return {
    id: page.id,
    title: findTitle(p),
    slug: extractText(p.slug),
    status: p.status?.type === 'select' ? (p.status.select?.name ?? '') : '',
    date: p.date?.type === 'date' ? (p.date.date?.start ?? '') : '',
    description: extractText(p.description),
    category: p.category?.type === 'select' ? (p.category.select?.name ?? '') : '',
    tags:
      p.tags?.type === 'multi_select'
        ? p.tags.multi_select.map((t) => t.name)
        : [],
    artist: extractText(p.artist) || undefined,
    album: extractText(p.album) || undefined,
    rating: p.rating?.type === 'number' ? (p.rating.number ?? undefined) : undefined,
    cover,
  };
}

// ── 페이지네이션 포함 전체 fetch ──────────────────────────
async function queryAll(
  params: Omit<QueryDatabaseParameters, 'database_id' | 'start_cursor'>,
): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      ...params,
      start_cursor: cursor,
    });
    pages.push(
      ...response.results.filter(
        (r): r is PageObjectResponse => 'properties' in r,
      ),
    );
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return pages;
}

// ── 공개 API ──────────────────────────────────────────────

/** published 상태인 모든 글을 날짜 내림차순으로 반환 */
export async function getPublishedPosts(): Promise<Post[]> {
  const pages = await queryAll({
    filter: {
      property: 'status',
      select: { equals: 'published' },
    },
    sorts: [{ property: 'date', direction: 'descending' }],
  });

  return pages.map(parsePost);
}

/** slug로 단일 글 조회 (Notion API 필터 사용) */
export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      and: [
        { property: 'status', select: { equals: 'published' } },
        { property: 'slug', rich_text: { equals: slug } },
      ],
    },
    page_size: 1,
  });

  const page = response.results[0];
  if (!page || !('properties' in page)) return undefined;
  return parsePost(page as PageObjectResponse);
}

/** Notion 페이지 본문을 HTML 문자열로 변환 */
export async function getPostContent(pageId: string): Promise<string> {
  const mdBlocks = await n2m.pageToMarkdown(pageId);
  const mdString = n2m.toMarkdownString(mdBlocks);
  const md = mdString.parent ?? '';
  if (!md) return '';
  return await marked.parse(md);
}

/** 모든 태그 목록 반환 */
export async function getAllTags(): Promise<string[]> {
  const posts = await getPublishedPosts();
  return [...new Set(posts.flatMap((p) => p.tags))];
}
