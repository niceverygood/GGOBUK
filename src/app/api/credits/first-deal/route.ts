import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { FIRST_DEAL_PACKAGE, totalCredits } from '@/lib/credits';

export const runtime = 'nodejs';

interface FirstDealStatus {
  eligible: boolean;
  already_purchased?: boolean;
  signed_up_at?: string;
  expires_at?: string;
  now?: string;
  reason?: string;
}

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ eligible: false }, { status: 401 });

  const admin = await createServerClient({ admin: true });
  const { data, error } = await admin.rpc('first_deal_status', {
    p_user_id: user.id,
  });

  if (error) {
    // RPC not deployed yet → treat as not eligible rather than 500.
    return NextResponse.json({ eligible: false, reason: 'unavailable' });
  }

  const status = (data ?? { eligible: false }) as FirstDealStatus;

  return NextResponse.json({
    eligible: !!status.eligible,
    alreadyPurchased: !!status.already_purchased,
    expiresAt: status.expires_at ?? null,
    now: status.now ?? new Date().toISOString(),
    package: {
      id: FIRST_DEAL_PACKAGE.id,
      label: FIRST_DEAL_PACKAGE.label,
      priceKrw: FIRST_DEAL_PACKAGE.priceKrw,
      credits: FIRST_DEAL_PACKAGE.credits,
      bonusCredits: FIRST_DEAL_PACKAGE.bonusCredits,
      totalCredits: totalCredits(FIRST_DEAL_PACKAGE),
      caption: FIRST_DEAL_PACKAGE.caption,
      perks: FIRST_DEAL_PACKAGE.perks,
    },
  });
}
