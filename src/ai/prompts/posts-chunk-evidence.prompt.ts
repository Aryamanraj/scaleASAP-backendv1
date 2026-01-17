/**
 * Posts Chunk Evidence Extraction Prompt Builder
 */

interface PostSummary {
  postedAt: string | null;
  text: string; // truncated to 500 chars
  engagement: {
    likes?: number;
    comments?: number;
    shares?: number;
  } | null;
}

interface PostsChunkInput {
  posts: PostSummary[];
  chunkPeriod: string | null; // e.g., "2024-03", "undated", "batch"
  totalPosts: number;
}

const SYSTEM_PROMPT = `You are analyzing a batch of LinkedIn posts to extract professional evidence and insights.
Your goal is to identify skills, technologies, industries, roles, and themes that emerge from the posts.

Output ONLY valid JSON with this schema:
{
  "skills": string[],              // Technical skills, tools, frameworks mentioned
  "domains": string[],             // Professional domains/industries (e.g., "AI/ML", "FinTech", "Healthcare")
  "roles": string[],               // Professional roles/titles implied or stated
  "themes": string[],              // Recurring topics or themes
  "engagement_patterns": {         // Engagement insights
    "high_engagement_topics": string[],
    "avg_likes": number | null,
    "avg_comments": number | null
  },
  "content_types": string[],       // Types of content (e.g., "thought leadership", "case studies", "announcements")
  "summary": string                // 2-3 sentence summary of the chunk
}

Rules:
1. Extract only what is clearly evident from the posts
2. Normalize skill/technology names (e.g., "JavaScript" not "javascript")
3. Be conservative - better to omit than guess
4. Focus on professional/technical content
5. Ignore purely personal posts unless they reveal professional identity`;

export function buildPostsChunkEvidencePrompt(input: PostsChunkInput): {
  systemPrompt: string;
  userPrompt: string;
} {
  const postsText = input.posts
    .map((post, idx) => {
      const date = post.postedAt
        ? new Date(post.postedAt).toISOString().split('T')[0]
        : 'undated';
      const engagement = post.engagement
        ? `[Likes: ${post.engagement.likes || 0}, Comments: ${
            post.engagement.comments || 0
          }, Shares: ${post.engagement.shares || 0}]`
        : '[No engagement data]';

      return `Post ${idx + 1} (${date}) ${engagement}:
${post.text}
---`;
    })
    .join('\n\n');

  const userPrompt = `Analyze these LinkedIn posts from ${
    input.chunkPeriod || 'unknown period'
  }:

Total posts in chunk: ${input.totalPosts}
Posts included in analysis: ${input.posts.length}

${postsText}

Extract professional evidence as JSON.`;

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
  };
}
