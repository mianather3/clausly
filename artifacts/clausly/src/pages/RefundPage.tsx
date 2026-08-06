import { LegalPageLayout } from "@/components/LegalPageLayout";

export default function RefundPage() {
  return (
    <LegalPageLayout title="Refund Policy" lastUpdated="August 6, 2026">
      <h2>1. Overview</h2>
      <p>
        This policy applies to paid Clausly subscription plans (Starter and Pro). It does not
        apply to the Free tier, which is not billed.
      </p>

      <h2>2. First Payment Guarantee</h2>
      <p>
        If you're not satisfied with your first paid subscription charge, you may request a full
        refund within <strong>14 days</strong> of that charge, no questions asked. Email{" "}
        <a href="mailto:support@clausly.net">support@clausly.net</a> from the email address on
        your account, and we'll process your refund to your original payment method.
      </p>

      <h2>3. Renewal Charges</h2>
      <p>
        Subsequent renewal charges (i.e. your second billing cycle onward) are not covered by the
        14-day guarantee, except in cases of a billing error on our part. You can avoid a renewal
        charge at any time by canceling before your next billing date.
      </p>

      <h2>4. Cancellation</h2>
      <p>
        You may cancel your subscription at any time from your account settings. Cancellation
        stops future billing; it does not retroactively refund the current billing period unless
        you're within the 14-day window described above.
      </p>

      <h2>5. Processing Time</h2>
      <p>
        Approved refunds are processed back to your original payment method via Stripe and
        typically appear within 5–10 business days, depending on your bank or card issuer.
      </p>

      <h2>6. Questions</h2>
      <p>
        For anything not covered here, email{" "}
        <a href="mailto:support@clausly.net">support@clausly.net</a> and we'll work it out with
        you directly.
      </p>
    </LegalPageLayout>
  );
}
