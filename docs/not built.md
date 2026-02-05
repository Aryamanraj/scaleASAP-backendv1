# Not Built / Blocked Items

This document tracks modules or features that cannot be completed due to missing inputs or upstream data gaps.

## Missing Data: LinkedIn Comments
- **Missing data source**: LinkedIn post comments (full text, author, timestamps).
- **Affected modules**:
  - `linkedin-posts-comments` connector (no handlers implemented).
  - Any future comment-chunker / comment-evidence extractor (if planned).
- **Why blocked**: New LinkedIn scraper does not provide comments data.
- **Unblock requirement**: Add comment scraping to the LinkedIn scraper server and store comments as a Document (e.g., `linkedin_post_comments`) or as PostItem child records.

## Note: Apify-based LinkedIn Connectors
- **Status**: Deprecated in favor of the new LinkedIn scraper server outputs.
- **Action**: Align profile/posts connectors to use the scraper server and store payloads in the new format.
