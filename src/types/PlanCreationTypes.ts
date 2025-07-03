interface Location {
  country: string;
  countryCode: string;
  city: string;
}

interface FAQs {
  question: string;
  answer: string;
}

export interface PlanCreationTypes {
  title: string;
  category:
    | 'career-counseling'
    | 'study-visa'
    | 'work-visa'
    | 'financial-support'
    | 'visa-filing'
    | 'visit-visa'
    | 'business-visa'
    | 'document-services'
    | 'accommodation-help'
    | 'travel-booking'
    | 'language-training';
  tags: string[];
  pricing: number;
  location: Location;
  selectedSilosCategories: string;
  silosSubcategory: string;
  images: string[];
  video?: string;
  coverImage?: string;
  description: string;
  faqs: FAQs[];
  successStories: string[];
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  status?: string;
  gigId?: string;
  createdAt?: number;
  updatedAt?: number | null;
  madeByAdmin?: boolean;
  userId?: string;
  youtubeLinkIfMadeByYoutubeLink?: string;
  imageLinkIfMadeByImage?: string;
  contact?: string;
}
