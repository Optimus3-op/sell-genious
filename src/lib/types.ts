export type UserRole = "seller" | "platform_admin" | "customer";

export type CustomerSegmentSlug =
  | "new"
  | "returning"
  | "high_value"
  | "inactive"
  | "potential_repeat"
  | "abandoned_cart";

export type LeadStage =
  | "new_lead"
  | "contacted"
  | "interested"
  | "negotiation"
  | "converted"
  | "lost";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface SellerContext {
  user: SessionUser;
  businessId: string;
  businessName: string;
  businessSlug: string;
  businessCategory: string;
  businessStatus: "active" | "suspended";
  subscriptionPlan: string;
  onboardingStep: number;
  onboardingCompleted: boolean;
  memberRole: "owner" | "manager" | "staff";
  storeId: string;
  storeSubdomain: string;
  storeName: string;
  storePublished: boolean;
}

export interface StoreSectionConfig {
  id: string;
  type: "hero" | "featured_products" | "categories" | "catalog" | "brand_story" | "newsletter";
  title: string;
  enabled: boolean;
}

export interface AIRecommendationDTO {
  id: string;
  businessId: string;
  category: "product" | "customer" | "sales" | "marketing" | "growth_plan";
  title: string;
  opportunityOrProblem: string;
  supportingData: string;
  whyItMatters: string;
  recommendedAction: string;
  expectedImpactEstimate: string;
  measurementMetric: string;
  status: "active" | "applied" | "dismissed";
  createdAt: string;
}
