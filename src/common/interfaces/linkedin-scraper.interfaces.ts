/**
 * LinkedIn Scraper Server Interfaces
 */

export interface ProfileData {
  // Basic info
  profileUrl: string;
  profileUrn?: string;
  scrapedAt: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  headline?: string;
  publicIdentifier?: string;
  about?: string;
  profileImage?: string;
  location?: string;
  connections?: string;

  // Detailed sections
  experience?: ExperienceItem[];
  education?: EducationItem[];
  skills?: SkillItem[];
  certifications?: CertificationItem[];
  languages?: LanguageItem[];
  projects?: ProjectItem[];
  publications?: PublicationItem[];
  honors?: HonorItem[];
  volunteer?: VolunteerItem[];
  recentPosts?: RecentPost[];
  recentReposts?: RecentPost[];
}

export interface ExperienceItem {
  title?: string;
  company?: string;
  companyUrl?: string;
  employmentType?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  description?: string;
}

export interface EducationItem {
  school?: string;
  schoolUrl?: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  grade?: string;
  activities?: string;
  description?: string;
}

export interface SkillItem {
  name?: string;
  endorsementCount?: number;
}

export interface CertificationItem {
  name?: string;
  issuer?: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface LanguageItem {
  name?: string;
  proficiency?: string;
}

export interface ProjectItem {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
}

export interface PublicationItem {
  name?: string;
  publisher?: string;
  publishDate?: string;
  description?: string;
  url?: string;
}

export interface HonorItem {
  title?: string;
  issuer?: string;
  issueDate?: string;
  description?: string;
}

export interface VolunteerItem {
  role?: string;
  organization?: string;
  cause?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface RecentPost {
  activityUrn?: string;
  postUrl?: string;
  text?: string;
  createdAt?: string;
  numLikes?: number;
  numComments?: number;
  numShares?: number;
  reactionTypeCounts?: Array<{
    reactionType: string;
    count: number;
  }>;
}

export interface ScrapeProfileRequest {
  urls: string[];
  options?: {
    minDelayMs?: number;
    maxDelayMs?: number;
    saveToFile?: boolean;
    outputDir?: string;
  };
}

export interface ScrapeProfileResponse {
  success: boolean;
  results: BatchResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  savedFile?: string;
  message?: string;
  error?: string;
}

export interface BatchResult {
  url: string;
  success: boolean;
  data?: ProfileData;
  error?: string;
  scrapedAt: string;
}
