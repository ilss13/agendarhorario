import { PUBLIC_PLAN_OFFERS, type PublicPlanOffer } from '@agendarhorario/contracts';
import { LANDING_COPY, type PlanCopy } from './landing.copy';

export interface LandingPlanCard extends PublicPlanOffer {
  tagline: string;
  highlight: boolean;
  features: string[];
}

export function landingPlanCards(offers: readonly PublicPlanOffer[]): LandingPlanCard[] {
  const copyByCode = new Map(LANDING_COPY.pricing.plans.map((plan) => [plan.code, plan]));
  return [...offers]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((offer) => toCard(offer, copyByCode.get(offer.code)));
}

function toCard(offer: PublicPlanOffer, copy: PlanCopy | undefined): LandingPlanCard {
  return {
    ...offer,
    tagline: copy?.tagline ?? '',
    highlight: copy?.highlight ?? false,
    features: copy?.features ?? [],
  };
}

export const LANDING_PLAN_CARDS = landingPlanCards(PUBLIC_PLAN_OFFERS);
